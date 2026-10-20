import type { SQLiteDatabase } from "expo-sqlite";
export type Product = {
  id_item: number;
  id_category: number;
  name: string;
  description: string;
  price: number;
  weight_grams: number;
  category: string;
  is_available: number;
  sold?: number;
};
export type CartLine = Product & { quantity: number };
export type Order = {
  id_order: number;
  order_date: string;
  total_sum: number;
  comment: string;
  status: string;
  payment: string;
  customer: string;
  mode: string;
};
export type OrderLine = { name: string; quantity: number; price_cents: number };
export type Checkout = {
  name: string;
  phone: string;
  comment: string;
  payment: number;
  mode: string;
  token: string;
  owner?: string;
};
export const cents = (price: number) => Math.round(price * 100);
export const totalCents = (lines: CartLine[]) =>
  lines.reduce((sum, line) => sum + cents(line.price) * line.quantity, 0);
export const money = (value: number) =>
  `${(value / 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
export async function initialize(db: SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS mobile_cart (id_item INTEGER PRIMARY KEY REFERENCES menu_item(id_item), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99));
    CREATE TABLE IF NOT EXISTS mobile_order (id_order INTEGER PRIMARY KEY REFERENCES customer_order(id_order), token TEXT NOT NULL UNIQUE, customer TEXT NOT NULL, phone TEXT NOT NULL, mode TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS mobile_order_line (id_order INTEGER NOT NULL REFERENCES mobile_order(id_order), id_item INTEGER NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL, price_cents INTEGER NOT NULL, PRIMARY KEY(id_order,id_item));`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS mobile_account (
    id INTEGER PRIMARY KEY, id_client INTEGER NOT NULL REFERENCES client(id_client),
    name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS mobile_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS mobile_booking (
      id INTEGER PRIMARY KEY, owner TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
      table_no INTEGER NOT NULL, guests INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'active',
      note TEXT NOT NULL, token TEXT NOT NULL UNIQUE);
    CREATE INDEX IF NOT EXISTS booking_overlap ON mobile_booking(table_no,state,starts_at,ends_at);`);
  const cartColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(mobile_cart)",
  );
  if (!cartColumns.some((c) => c.name === "owner")) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(`ALTER TABLE mobile_cart RENAME TO mobile_cart_legacy;
        CREATE TABLE mobile_cart (owner TEXT NOT NULL, id_item INTEGER NOT NULL REFERENCES menu_item(id_item), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(owner,id_item));
        INSERT INTO mobile_cart(owner,id_item,quantity) SELECT 'guest',id_item,quantity FROM mobile_cart_legacy;
        DROP TABLE mobile_cart_legacy;`);
    });
  }
  const orderColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(mobile_order)",
  );
  if (!orderColumns.some((c) => c.name === "owner"))
    await db.execAsync(
      "ALTER TABLE mobile_order ADD COLUMN owner TEXT NOT NULL DEFAULT 'guest'",
    );
}
export const products = (db: SQLiteDatabase) =>
  db.getAllAsync<Product>(
    `SELECT m.*, c.name category, (SELECT COALESCE(SUM(oi.quantity),0) FROM order_item oi JOIN customer_order co USING(id_order) WHERE oi.id_item=m.id_item AND co.id_status<>5) sold FROM menu_item m JOIN menu_category c USING(id_category) ORDER BY m.id_item`,
  );
export const cart = (db: SQLiteDatabase, owner = "guest") =>
  db.getAllAsync<CartLine>(
    `SELECT m.*, c.name category, b.quantity FROM mobile_cart b JOIN menu_item m USING(id_item) JOIN menu_category c USING(id_category) WHERE b.owner=? ORDER BY m.id_item`,
    owner,
  );
export const orders = (db: SQLiteDatabase, owner = "guest") =>
  db.getAllAsync<Order>(
    `SELECT o.*, s.name status, p.name payment, m.customer, m.mode FROM mobile_order m JOIN customer_order o USING(id_order) JOIN order_status s USING(id_status) JOIN payment_method p USING(id_payment_method) WHERE m.owner=? ORDER BY o.id_order DESC`,
    owner,
  );
export const orderLines = (db: SQLiteDatabase, id: number, owner = "guest") =>
  db.getAllAsync<OrderLine>(
    "SELECT l.name, l.quantity, l.price_cents FROM mobile_order_line l JOIN mobile_order m USING(id_order) WHERE l.id_order=? AND m.owner=? ORDER BY l.id_item",
    id,
    owner,
  );
export async function changeQuantity(
  db: SQLiteDatabase,
  id: number,
  quantity: number,
  owner = "guest",
) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99)
    throw new Error("Максимум 99 штук одной позиции.");
  if (quantity === 0)
    await db.runAsync(
      "DELETE FROM mobile_cart WHERE id_item=? AND owner=?",
      id,
      owner,
    );
  else {
    const item = await db.getFirstAsync<{ is_available: number }>(
      "SELECT is_available FROM menu_item WHERE id_item=?",
      id,
    );
    if (!item?.is_available) throw new Error("Эта позиция сейчас недоступна.");
    await db.runAsync(
      "INSERT INTO mobile_cart(owner,id_item,quantity) VALUES(?,?,?) ON CONFLICT(owner,id_item) DO UPDATE SET quantity=excluded.quantity",
      owner,
      id,
      quantity,
    );
  }
}
// Keep the order, its snapshots and basket clearing in a single atomic transaction.
export async function checkout(
  db: SQLiteDatabase,
  input: Checkout,
): Promise<number> {
  if (!input.name.trim() || input.name.trim().length > 80)
    throw new Error("Укажите имя (до 80 символов).");
  const digits = input.phone.replace(/\D/g, "");
  if (
    input.phone.trim() &&
    (!/^\+?[\d\s()-]+$/.test(input.phone.trim()) ||
      digits.length < 10 ||
      digits.length > 15)
  )
    throw new Error("Проверьте номер телефона или оставьте поле пустым.");
  if (
    ![1, 2].includes(input.payment) ||
    !["С собой", "В кофейне"].includes(input.mode)
  )
    throw new Error("Выберите способ получения и оплаты.");
  if (!input.token || input.comment.length > 300)
    throw new Error("Проверьте данные заказа.");
  const owner = input.owner ?? "guest";
  let orderId = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id_order: number }>(
      "SELECT id_order FROM mobile_order WHERE token=? AND owner=?",
      input.token,
      owner,
    );
    if (existing) {
      orderId = existing.id_order;
      return;
    }
    const lines = await cart(tx, owner);
    if (!lines.length)
      throw new Error("Корзина пуста. Добавьте что-нибудь из меню.");
    if (
      lines.some(
        (l) => !l.is_available || !Number.isFinite(l.price) || l.price < 0,
      )
    )
      throw new Error("Одна из позиций недоступна. Обновите корзину.");
    const now = new Date().toISOString();
    const account = owner.startsWith("user:")
      ? await tx.getFirstAsync<{ id_client: number }>(
          "SELECT id_client FROM mobile_account WHERE id=?",
          Number(owner.slice(5)),
        )
      : null;
    if (owner !== "guest" && !account)
      throw new Error("Аккаунт не найден. Войдите заново.");
    const clientId =
      account?.id_client ??
      (
        await tx.runAsync(
          "INSERT INTO client(first_name,phone,bonus_points,registration_date) VALUES(?,?,0,?)",
          input.name.trim(),
          input.phone.trim(),
          now.slice(0, 10),
        )
      ).lastInsertRowId;
    const order = await tx.runAsync(
      "INSERT INTO customer_order(id_client,id_status,id_payment_method,order_date,total_sum,comment) VALUES(?,1,?,?,?,?)",
      clientId,
      input.payment,
      now,
      totalCents(lines) / 100,
      input.comment.trim(),
    );
    orderId = order.lastInsertRowId;
    await tx.runAsync(
      "INSERT INTO mobile_order(id_order,token,customer,phone,mode,owner) VALUES(?,?,?,?,?,?)",
      orderId,
      input.token,
      input.name.trim(),
      input.phone.trim(),
      input.mode,
      owner,
    );
    for (const line of lines) {
      await tx.runAsync(
        "INSERT INTO order_item(id_order,id_item,quantity,price) VALUES(?,?,?,?)",
        orderId,
        line.id_item,
        line.quantity,
        cents(line.price) / 100,
      );
      await tx.runAsync(
        "INSERT INTO mobile_order_line(id_order,id_item,name,quantity,price_cents) VALUES(?,?,?,?,?)",
        orderId,
        line.id_item,
        line.name,
        line.quantity,
        cents(line.price),
      );
    }
    await tx.runAsync("DELETE FROM mobile_cart WHERE owner=?", owner);
  });
  return orderId;
}
