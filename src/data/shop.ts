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
}
export const products = (db: SQLiteDatabase) =>
  db.getAllAsync<Product>(
    `SELECT m.*, c.name category FROM menu_item m JOIN menu_category c USING(id_category) ORDER BY m.id_item`,
  );
export const cart = (db: SQLiteDatabase) =>
  db.getAllAsync<CartLine>(
    `SELECT m.*, c.name category, b.quantity FROM mobile_cart b JOIN menu_item m USING(id_item) JOIN menu_category c USING(id_category) ORDER BY m.id_item`,
  );
export const orders = (db: SQLiteDatabase) =>
  db.getAllAsync<Order>(
    `SELECT o.*, s.name status, p.name payment, m.customer, m.mode FROM mobile_order m JOIN customer_order o USING(id_order) JOIN order_status s USING(id_status) JOIN payment_method p USING(id_payment_method) ORDER BY o.id_order DESC`,
  );
export const orderLines = (db: SQLiteDatabase, id: number) =>
  db.getAllAsync<OrderLine>(
    "SELECT name, quantity, price_cents FROM mobile_order_line WHERE id_order=? ORDER BY id_item",
    id,
  );
export async function changeQuantity(
  db: SQLiteDatabase,
  id: number,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99)
    throw new Error("Максимум 99 штук одной позиции.");
  if (quantity === 0)
    await db.runAsync("DELETE FROM mobile_cart WHERE id_item=?", id);
  else {
    const item = await db.getFirstAsync<{ is_available: number }>(
      "SELECT is_available FROM menu_item WHERE id_item=?",
      id,
    );
    if (!item?.is_available) throw new Error("Эта позиция сейчас недоступна.");
    await db.runAsync(
      "INSERT INTO mobile_cart(id_item,quantity) VALUES(?,?) ON CONFLICT(id_item) DO UPDATE SET quantity=excluded.quantity",
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
  if (input.phone.trim() && (!/^\+?[\d\s()-]+$/.test(input.phone.trim()) || digits.length < 10 || digits.length > 15))
    throw new Error("Проверьте номер телефона или оставьте поле пустым.");
  if (
    ![1, 2].includes(input.payment) ||
    !["С собой", "В кофейне"].includes(input.mode)
  )
    throw new Error("Выберите способ получения и оплаты.");
  if (!input.token || input.comment.length > 300)
    throw new Error("Проверьте данные заказа.");
  let orderId = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id_order: number }>(
      "SELECT id_order FROM mobile_order WHERE token=?",
      input.token,
    );
    if (existing) {
      orderId = existing.id_order;
      return;
    }
    const lines = await cart(tx);
    if (!lines.length)
      throw new Error("Корзина пуста. Добавьте что-нибудь из меню.");
    if (
      lines.some(
        (l) => !l.is_available || !Number.isFinite(l.price) || l.price < 0,
      )
    )
      throw new Error("Одна из позиций недоступна. Обновите корзину.");
    const now = new Date().toISOString();
    const client = await tx.runAsync(
      "INSERT INTO client(first_name,phone,bonus_points,registration_date) VALUES(?,?,0,?)",
      input.name.trim(),
      input.phone.trim(),
      now.slice(0, 10),
    );
    const order = await tx.runAsync(
      "INSERT INTO customer_order(id_client,id_status,id_payment_method,order_date,total_sum,comment) VALUES(?,1,?,?,?,?)",
      client.lastInsertRowId,
      input.payment,
      now,
      totalCents(lines) / 100,
      input.comment.trim(),
    );
    orderId = order.lastInsertRowId;
    await tx.runAsync(
      "INSERT INTO mobile_order(id_order,token,customer,phone,mode) VALUES(?,?,?,?,?)",
      orderId,
      input.token,
      input.name.trim(),
      input.phone.trim(),
      input.mode,
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
    await tx.runAsync("DELETE FROM mobile_cart");
  });
  return orderId;
}
