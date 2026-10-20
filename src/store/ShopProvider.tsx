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
type Shop = {
  products: repo.Product[];
  cart: repo.CartLine[];
  orders: repo.Order[];
  busy: boolean;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  quantity: (id: number, value: number) => Promise<void>;
  clear: () => Promise<void>;
  submit: (input: Omit<repo.Checkout, "token">) => Promise<number | undefined>;
};
const Context = createContext<Shop | null>(null);
export function ShopProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [items, setItems] = useState<repo.Product[]>([]);
  const [basket, setBasket] = useState<repo.CartLine[]>([]);
  const [history, setHistory] = useState<repo.Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const token = useRef(randomUUID());
  const refresh = useCallback(async () => {
    const [p, c, o] = await Promise.all([
      repo.products(db),
      repo.cart(db),
      repo.orders(db),
    ]);
    setItems(p);
    setBasket(c);
    setHistory(o);
    setError("");
    setReady(true);
  }, [db]);
  useEffect(() => {
    let active = true;
    Promise.all([repo.products(db), repo.cart(db), repo.orders(db)])
      .then(([p, c, o]) => {
        if (active) {
          setItems(p);
          setBasket(c);
          setHistory(o);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db]);
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
  const value: Shop = {
    products: items,
    cart: basket,
    orders: history,
    busy,
    ready,
    error,
    refresh,
    quantity: async (id, value) => {
      await action(async () => {
        await repo.changeQuantity(db, id, value);
        token.current = randomUUID();
      });
    },
    clear: async () => {
      await action(async () => {
        await db.runAsync("DELETE FROM mobile_cart");
        token.current = randomUUID();
      });
    },
    submit: (input) =>
      action(() => repo.checkout(db, { ...input, token: token.current })),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useShop() {
  const value = useContext(Context);
  if (!value) throw new Error("ShopProvider missing");
  return value;
}
