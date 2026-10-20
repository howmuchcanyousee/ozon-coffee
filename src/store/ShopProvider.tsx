import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import * as repo from "../data/shop";
import * as accounts from "../data/accounts";
import * as reservations from "../data/bookings";
import { derivePassword } from "../data/password";
type Snapshot = {
  products: repo.Product[];
  cart: repo.CartLine[];
  orders: repo.Order[];
  user: accounts.Account | null;
  bookings: reservations.Booking[];
};
type Shop = Snapshot & {
  owner: string;
  busy: boolean;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  quantity: (id: number, value: number) => Promise<void>;
  clear: () => Promise<void>;
  submit: (
    input: Omit<repo.Checkout, "token" | "owner">,
  ) => Promise<number | undefined>;
  register: (input: accounts.Registration) => Promise<number | undefined>;
  login: (email: string, password: string) => Promise<number | undefined>;
  logout: () => Promise<void>;
  book: (input: reservations.BookingInput) => Promise<number | undefined>;
  cancelBooking: (id: number) => Promise<void>;
};
const empty: Snapshot = {
  products: [],
  cart: [],
  orders: [],
  user: null,
  bookings: [],
};
const Context = createContext<Shop | null>(null);
export function ShopProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const token = useRef(randomUUID());
  const read = useCallback(async () => {
    const user = (await accounts.currentUser(db)) ?? null;
    const owner = accounts.ownerFor(user);
    const [products, cart, orders, bookings] = await Promise.all([
      repo.products(db),
      repo.cart(db, owner),
      repo.orders(db, owner),
      reservations.bookings(db, owner),
    ]);
    return { products, cart, orders, user, bookings };
  }, [db]);
  const refresh = useCallback(async () => {
    setSnapshot(await read());
    setReady(true);
    setError("");
  }, [read]);
  useEffect(() => {
    let active = true;
    read()
      .then((data) => {
        if (active) {
          setSnapshot(data);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError("Не удалось загрузить данные. Попробуйте ещё раз.");
      });
    return () => {
      active = false;
    };
  }, [read]);
  async function action<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const result = await task();
      await refresh();
      return result;
    } catch (e) {
      Alert.alert(
        "Не получилось",
        e instanceof Error ? e.message : "Попробуйте ещё раз.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const owner = accounts.ownerFor(snapshot.user);
  const value: Shop = {
    ...snapshot,
    owner,
    busy,
    ready,
    error,
    refresh,
    quantity: async (id, value) => {
      await action(async () => {
        await repo.changeQuantity(db, id, value, owner);
        token.current = randomUUID();
      });
    },
    clear: async () => {
      await action(async () => {
        await db.runAsync("DELETE FROM mobile_cart WHERE owner=?", owner);
        token.current = randomUUID();
      });
    },
    submit: (input) =>
      action(() =>
        repo.checkout(db, { ...input, owner, token: token.current }),
      ),
    register: (input) =>
      action(async () => {
        const id = await accounts.register(
          db,
          input,
          derivePassword,
          randomUUID(),
        );
        token.current = randomUUID();
        return id;
      }),
    login: (email, password) =>
      action(async () => {
        const id = await accounts.login(db, email, password, derivePassword);
        token.current = randomUUID();
        return id;
      }),
    logout: async () => {
      await action(async () => {
        await accounts.logout(db);
        token.current = randomUUID();
      });
    },
    book: (input) =>
      action(() =>
        reservations.createBooking(db, owner, {
          ...input,
          token: input.token,
        }),
      ),
    cancelBooking: async (id) => {
      await action(() => reservations.cancelBooking(db, owner, id));
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useShop() {
  const value = useContext(Context);
  if (!value) throw new Error("ShopProvider missing");
  return value;
}
