import type { SQLiteDatabase } from "expo-sqlite";
export type Booking = {
  id: number;
  owner: string;
  starts_at: string;
  ends_at: string;
  table_no: number;
  guests: number;
  state: string;
  note: string;
};
export type BookingInput = {
  startsAt: string;
  table: number;
  guests: number;
  note: string;
  token: string;
};
export const capacity: Record<number, number> = {
  1: 2,
  2: 2,
  3: 4,
  4: 4,
  5: 6,
  6: 6,
};
export const bookings = (db: SQLiteDatabase, owner: string) =>
  db.getAllAsync<Booking>(
    "SELECT * FROM mobile_booking WHERE owner=? ORDER BY starts_at DESC",
    owner,
  );
export async function createBooking(
  db: SQLiteDatabase,
  owner: string,
  input: BookingInput,
) {
  if (
    !/^user:\d+$/.test(owner) ||
    !(await db.getFirstAsync(
      "SELECT id FROM mobile_account WHERE id=?",
      Number(owner.slice(5)),
    ))
  )
    throw new Error("Войдите в аккаунт для бронирования.");
  const start = new Date(input.startsAt);
  const time = start.getTime();
  const end = new Date(time + 2 * 3600000);
  if (
    !Number.isFinite(time) ||
    time < Date.now() + 15 * 60000 ||
    time > Date.now() + 90 * 86400000
  )
    throw new Error(
      "Выберите время минимум через 15 минут и не более чем через 90 дней.",
    );
  if (
    start.getHours() < 8 ||
    start.getHours() > 20 ||
    ![0, 30].includes(start.getMinutes()) ||
    (start.getHours() === 20 && start.getMinutes() > 0)
  )
    throw new Error("Бронирование доступно с 08:00 до 20:00, на два часа.");
  if (
    !capacity[input.table] ||
    !Number.isInteger(input.guests) ||
    input.guests < 1 ||
    input.guests > capacity[input.table]
  )
    throw new Error("Проверьте столик и количество гостей.");
  if (input.note.length > 200 || !input.token)
    throw new Error("Проверьте пожелания к бронированию.");
  let id = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id: number }>(
      "SELECT id FROM mobile_booking WHERE token=? AND owner=?",
      input.token,
      owner,
    );
    if (existing) {
      id = existing.id;
      return;
    }
    const conflict = await tx.getFirstAsync(
      "SELECT id FROM mobile_booking WHERE table_no=? AND state='active' AND starts_at<? AND ends_at>?",
      input.table,
      end.toISOString(),
      start.toISOString(),
    );
    if (conflict)
      throw new Error(
        "Этот столик уже занят в выбранное время. Выберите другой столик или время.",
      );
    const result = await tx.runAsync(
      "INSERT INTO mobile_booking(owner,starts_at,ends_at,table_no,guests,note,token) VALUES(?,?,?,?,?,?,?)",
      owner,
      start.toISOString(),
      end.toISOString(),
      input.table,
      input.guests,
      input.note.trim(),
      input.token,
    );
    id = result.lastInsertRowId;
  });
  return id;
}
export async function cancelBooking(
  db: SQLiteDatabase,
  owner: string,
  id: number,
) {
  const result = await db.runAsync(
    "UPDATE mobile_booking SET state='cancelled' WHERE id=? AND owner=? AND state='active' AND starts_at>?",
    id,
    owner,
    new Date().toISOString(),
  );
  if (!result.changes) throw new Error("Эту бронь уже нельзя отменить.");
}
