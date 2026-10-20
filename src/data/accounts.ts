import type { SQLiteDatabase } from "expo-sqlite";
export type Account = {
  id: number;
  id_client: number;
  name: string;
  email: string;
};
export type Registration = { name: string; email: string; password: string };
export type Hasher = (password: string, salt: string) => Promise<string>;
export const ownerFor = (user: Account | null) =>
  user ? `user:${user.id}` : "guest";
export const currentUser = (db: SQLiteDatabase) =>
  db.getFirstAsync<Account>(
    `SELECT a.id,a.id_client,a.name,a.email FROM mobile_account a JOIN mobile_settings s ON s.key='session' AND s.value=CAST(a.id AS TEXT)`,
  );
function cleanEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 150)
    throw new Error("Введите корректный email.");
  return value;
}
async function attachSession(tx: SQLiteDatabase, id: number) {
  const owner = `user:${id}`;
  const overflow = await tx.getFirstAsync(
    `SELECT 1 FROM mobile_cart g JOIN mobile_cart u USING(id_item) WHERE g.owner='guest' AND u.owner=? AND g.quantity+u.quantity>99`,
    owner,
  );
  if (overflow)
    throw new Error(
      "В гостевой корзине слишком много одинаковых товаров. Уменьшите количество перед входом.",
    );
  await tx.runAsync(
    `INSERT INTO mobile_cart(owner,id_item,quantity) SELECT ?,id_item,quantity FROM mobile_cart WHERE owner='guest' ON CONFLICT(owner,id_item) DO UPDATE SET quantity=mobile_cart.quantity+excluded.quantity`,
    owner,
  );
  await tx.runAsync("DELETE FROM mobile_cart WHERE owner='guest'");
  await tx.runAsync(
    "INSERT INTO mobile_settings(key,value) VALUES('session',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    String(id),
  );
}
export async function register(
  db: SQLiteDatabase,
  input: Registration,
  hash: Hasher,
  salt: string,
) {
  const name = input.name.trim();
  const email = cleanEmail(input.email);
  if (name.length < 2 || name.length > 80)
    throw new Error("Имя должно содержать от 2 до 80 символов.");
  if (input.password.length < 6 || input.password.length > 128)
    throw new Error("Пароль должен содержать от 6 до 128 символов.");
  if (
    await db.getFirstAsync("SELECT id FROM mobile_account WHERE email=?", email)
  )
    throw new Error("Этот email уже зарегистрирован. Войдите в аккаунт.");
  const digest = await hash(input.password, salt);
  let id = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const now = new Date().toISOString();
    const client = await tx.runAsync(
      "INSERT INTO client(first_name,email,bonus_points,registration_date) VALUES(?,?,0,?)",
      name,
      email,
      now.slice(0, 10),
    );
    const user = await tx.runAsync(
      "INSERT INTO mobile_account(id_client,name,email,password_hash,salt,created_at) VALUES(?,?,?,?,?,?)",
      client.lastInsertRowId,
      name,
      email,
      digest,
      salt,
      now,
    );
    id = user.lastInsertRowId;
    await attachSession(tx, id);
  });
  return id;
}
export async function login(
  db: SQLiteDatabase,
  email: string,
  password: string,
  hash: Hasher,
) {
  const row = await db.getFirstAsync<
    Account & { password_hash: string; salt: string }
  >("SELECT * FROM mobile_account WHERE email=?", cleanEmail(email));
  if (!row || password.length > 128)
    throw new Error("Неверный email или пароль.");
  const digest = await hash(password, row.salt);
  let mismatch = digest.length ^ row.password_hash.length;
  for (let i = 0; i < digest.length; i++)
    mismatch |= digest.charCodeAt(i) ^ row.password_hash.charCodeAt(i);
  if (mismatch !== 0) throw new Error("Неверный email или пароль.");
  await db.withExclusiveTransactionAsync((tx) => attachSession(tx, row.id));
  return row.id;
}
export async function logout(db: SQLiteDatabase) {
  await db.runAsync("DELETE FROM mobile_settings WHERE key='session'");
}
