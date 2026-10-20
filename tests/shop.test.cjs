const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../src/data/shop.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const m = new Module(__filename);
m._compile(compiled, __filename);
const shop = m.exports;
function adapter(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, ...args) => {
      const r = raw.prepare(sql).run(...args);
      return { ...r, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstAsync: async (sql, ...args) => raw.prepare(sql).get(...args),
    getAllAsync: async (sql, ...args) => raw.prepare(sql).all(...args),
    withExclusiveTransactionAsync: async (fn) => {
      raw.exec("BEGIN IMMEDIATE");
      try {
        await fn(adapter(raw));
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
async function fixture(fn) {
  const testRoot = path.resolve(__dirname, "../../work/test-databases");
  fs.mkdirSync(testRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(testRoot, "case-"));
  const file = path.join(dir, "shop.sqlite");
  fs.copyFileSync(
    path.join(__dirname, "../assets/database/coffeehouse.sqlite"),
    file,
  );
  const raw = new DatabaseSync(file);
  try {
    const db = adapter(raw);
    await shop.initialize(db);
    await fn(db, raw, file);
  } finally {
    raw.close();
    if (!path.resolve(dir).startsWith(testRoot + path.sep)) throw new Error("Unsafe test cleanup path");
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const input = {
  name: "Тест",
  phone: "",
  comment: "Без сахара",
  payment: 1,
  mode: "С собой",
  token: "unique-order",
};
test("catalog uses all 12 seeded items and 5 categories", () =>
  fixture(async (db) => {
    const items = await shop.products(db);
    assert.equal(items.length, 12);
    assert.equal(new Set(items.map((x) => x.id_category)).size, 5);
  }));
test("basket: increment, decrement, remove and quantity limits", () =>
  fixture(async (db) => {
    await shop.changeQuantity(db, 1, 2);
    assert.equal((await shop.cart(db))[0].quantity, 2);
    await shop.changeQuantity(db, 1, 1);
    assert.equal((await shop.cart(db))[0].quantity, 1);
    await assert.rejects(shop.changeQuantity(db, 1, 100));
    await assert.rejects(shop.changeQuantity(db, 1, -1));
    await assert.rejects(shop.changeQuantity(db, 1, 1.5));
    await shop.changeQuantity(db, 1, 0);
    assert.deepEqual(await shop.cart(db), []);
  }));
test("money uses cents and sums multiple products", () =>
  fixture(async (db) => {
    await shop.changeQuantity(db, 1, 2);
    await shop.changeQuantity(db, 2, 1);
    assert.equal(shop.totalCents(await shop.cart(db)), 53000);
    assert.equal(shop.cents(19.99), 1999);
  }));
test("basket persists in another database connection", () =>
  fixture(async (db, raw, file) => {
    await shop.changeQuantity(db, 2, 3);
    const reopened = new DatabaseSync(file);
    try {
      assert.equal((await shop.cart(adapter(reopened)))[0].quantity, 3);
    } finally {
      reopened.close();
    }
  }));
test("checkout saves items and history, clears basket, is idempotent", () =>
  fixture(async (db) => {
    await shop.changeQuantity(db, 1, 2);
    await shop.changeQuantity(db, 2, 1);
    const id = await shop.checkout(db, input);
    assert.equal((await shop.orders(db))[0].total_sum, 530);
    assert.equal((await shop.orderLines(db, id)).length, 2);
    assert.equal((await shop.cart(db)).length, 0);
    assert.equal(await shop.checkout(db, input), id);
    assert.equal((await shop.orders(db)).length, 1);
  }));
test("empty basket and invalid fields never create orders", () =>
  fixture(async (db) => {
    await assert.rejects(shop.checkout(db, input));
    await shop.changeQuantity(db, 1, 1);
    for (const bad of [
      { name: "" },
      { payment: 4 },
      { mode: "Delivery" },
      { phone: "abc" },
      { comment: "x".repeat(301) },
    ])
      await assert.rejects(shop.checkout(db, { ...input, ...bad }));
    assert.equal((await shop.orders(db)).length, 0);
    assert.equal((await shop.cart(db)).length, 1);
  }));
test("unavailable and unknown items are rejected", () =>
  fixture(async (db, raw) => {
    await assert.rejects(shop.changeQuantity(db, 999, 1));
    await shop.changeQuantity(db, 1, 1);
    raw.exec("UPDATE menu_item SET is_available=0 WHERE id_item=1");
    await assert.rejects(shop.checkout(db, input));
    await assert.rejects(shop.changeQuantity(db, 1, 2));
    assert.equal((await shop.cart(db)).length, 1);
  }));
test("failed item write rolls back client, order and basket deletion", () =>
  fixture(async (db, raw) => {
    await shop.changeQuantity(db, 1, 1);
    const before = raw.prepare("select count(*) n from client").get().n;
    raw.exec(
      "CREATE TRIGGER inject_failure BEFORE INSERT ON mobile_order_line BEGIN SELECT RAISE(ABORT,'test failure'); END",
    );
    await assert.rejects(shop.checkout(db, input), /test failure/);
    assert.equal((await shop.orders(db)).length, 0);
    assert.equal((await shop.cart(db)).length, 1);
    assert.equal(raw.prepare("select count(*) n from client").get().n, before);
  }));
test("order snapshots retain original price and name", () =>
  fixture(async (db, raw) => {
    await shop.changeQuantity(db, 1, 1);
    const id = await shop.checkout(db, input);
    raw.exec("UPDATE menu_item SET name='Изменено',price=999 WHERE id_item=1");
    const lines = await shop.orderLines(db, id);
    assert.equal(lines[0].name, "Эспрессо");
    assert.equal(lines[0].price_cents, 15000);
  }));
