const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash, pbkdf2Sync } = require("node:crypto");
const { load, shop, fixture, adapter } = require("./helpers.cjs");
const { DatabaseSync } = require("node:sqlite");
const accounts = load("accounts");
const booking = load("bookings");
const metrics = load("statistics");
const password = load("password");
const fastHash = async (p, s) =>
  createHash("sha256")
    .update(s + ":" + p)
    .digest("hex");
const alice = {
  name: "Alice",
  email: "alice@example.test",
  password: "secret123",
};
const bob = { name: "Bob", email: "bob@example.test", password: "other123" };
const checkout = {
  name: "Alice",
  phone: "",
  comment: "",
  payment: 1,
  mode: "С собой",
  token: "checkout-user",
};
function slot() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
const baseBooking = () => ({
  startsAt: slot(),
  table: 1,
  guests: 2,
  note: "Окно",
  token: "booking-1",
});
test("PBKDF2 matches Node native implementation, salt changes digest", async () => {
  const digest = await password.derivePassword(
    "пароль123",
    "random-salt-value",
  );
  assert.equal(
    digest,
    pbkdf2Sync("пароль123", "random-salt-value", 600000, 32, "sha256").toString(
      "hex",
    ),
  );
  assert.notEqual(digest, "пароль123");
});
test("register validates, normalizes email, hashes password and restores session", () =>
  fixture(async (db, raw, file) => {
    await accounts.register(
      db,
      { ...alice, email: " Alice@Example.Test " },
      fastHash,
      "random-salt",
    );
    const user = await accounts.currentUser(db);
    assert.equal(user.name, "Alice");
    assert.equal(user.email, alice.email);
    const row = raw.prepare("SELECT * FROM mobile_account").get();
    assert.notEqual(row.password_hash, alice.password);
    assert.equal(row.salt, "random-salt");
    const opened = new DatabaseSync(file);
    try {
      assert.equal((await accounts.currentUser(adapter(opened))).id, user.id);
    } finally {
      opened.close();
    }
    await accounts.logout(db);
    assert.equal(await accounts.currentUser(db), undefined);
    await assert.rejects(accounts.login(db, alice.email, "wrong", fastHash));
    await accounts.login(db, "ALICE@EXAMPLE.TEST", alice.password, fastHash);
    assert.equal((await accounts.currentUser(db)).id, user.id);
    await assert.rejects(
      accounts.register(db, alice, fastHash, "another-salt"),
    );
  }));
test("invalid account never creates client records", () =>
  fixture(async (db, raw) => {
    const before = raw.prepare("SELECT COUNT(*) n FROM client").get().n;
    for (const bad of [{ name: " " }, { email: "bad" }, { password: "123" }])
      await assert.rejects(
        accounts.register(db, { ...alice, ...bad }, fastHash, "salt"),
      );
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM client").get().n, before);
  }));
test("cart and order isolation between guest and two accounts; login merges guest cart", () =>
  fixture(async (db) => {
    await shop.changeQuantity(db, 1, 2);
    const aid = await accounts.register(db, alice, fastHash, "alice-salt");
    const a = `user:${aid}`;
    assert.equal((await shop.cart(db, a))[0].quantity, 2);
    assert.equal((await shop.cart(db)).length, 0);
    const id = await shop.checkout(db, { ...checkout, owner: a });
    await shop.changeQuantity(db, 2, 3, a);
    await accounts.logout(db);
    assert.equal((await shop.orders(db)).length, 0);
    const bid = await accounts.register(db, bob, fastHash, "bob-salt");
    const b = `user:${bid}`;
    assert.equal((await shop.orders(db, b)).length, 0);
    assert.equal((await shop.cart(db, b)).length, 0);
    assert.deepEqual(await shop.orderLines(db, id, b), []);
    assert.equal((await shop.orderLines(db, id, a)).length, 1);
    await accounts.logout(db);
    await accounts.login(db, alice.email, alice.password, fastHash);
    assert.equal((await shop.cart(db, a))[0].quantity, 3);
    assert.equal((await shop.orders(db, a)).length, 1);
  }));
test("cart merge never loses quantities above the maximum", () =>
  fixture(async (db) => {
    const id = await accounts.register(db, alice, fastHash, "salt");
    await shop.changeQuantity(db, 1, 99, `user:${id}`);
    await accounts.logout(db);
    await shop.changeQuantity(db, 1, 2);
    await assert.rejects(
      accounts.login(db, alice.email, alice.password, fastHash),
      /слишком много/,
    );
    assert.equal((await shop.cart(db))[0].quantity, 2);
    assert.equal((await shop.cart(db, `user:${id}`))[0].quantity, 99);
    assert.equal(await accounts.currentUser(db), undefined);
  }));
test("legacy migration preserves guest cart and orders; migration is repeatable", () =>
  fixture(
    async (db, raw) => {
      assert.equal((await shop.cart(db))[0].quantity, 2);
      assert.equal((await shop.orders(db))[0].id_order, 1);
      await shop.initialize(db);
      assert.equal((await shop.cart(db))[0].quantity, 2);
      assert.equal((await shop.orders(db))[0].id_order, 1);
    },
    (raw) => {
      raw.exec(
        "CREATE TABLE mobile_cart(id_item INTEGER PRIMARY KEY,quantity INTEGER NOT NULL); INSERT INTO mobile_cart VALUES(1,2); CREATE TABLE mobile_order(id_order INTEGER PRIMARY KEY,token TEXT UNIQUE,customer TEXT,phone TEXT,mode TEXT); INSERT INTO mobile_order VALUES(1,'old','Guest','','С собой');",
      );
    },
  ));
test("booking validates capacity, blocks overlap, cancellation releases table, enforces ownership", () =>
  fixture(async (db) => {
    const aid = await accounts.register(db, alice, fastHash, "salt-a");
    const a = `user:${aid}`;
    const input = baseBooking();
    await assert.rejects(booking.createBooking(db, "guest", input));
    await assert.rejects(booking.createBooking(db, a, { ...input, guests: 3 }));
    await assert.rejects(
      booking.createBooking(db, a, {
        ...input,
        startsAt: new Date(0).toISOString(),
      }),
    );
    const id = await booking.createBooking(db, a, input);
    assert.equal(await booking.createBooking(db, a, input), id);
    await accounts.logout(db);
    const bid = await accounts.register(db, bob, fastHash, "salt-b");
    const b = `user:${bid}`;
    assert.equal((await booking.bookings(db, b)).length, 0);
    await assert.rejects(
      booking.createBooking(db, b, { ...input, token: "bob" }),
      /занят/,
    );
    await assert.rejects(booking.cancelBooking(db, b, id));
    await booking.cancelBooking(db, a, id);
    const next = await booking.createBooking(db, b, { ...input, token: "bob" });
    assert.ok(next > id);
    assert.equal((await booking.bookings(db, a))[0].state, "cancelled");
    assert.equal((await booking.bookings(db, b))[0].state, "active");
  }));
test("statistics reflects actual new orders, excludes cancellations", () =>
  fixture(async (db, raw) => {
    const before = await metrics.statistics(db);
    await shop.changeQuantity(db, 1, 2);
    const id = await shop.checkout(db, checkout);
    const after = await metrics.statistics(db);
    assert.equal(after.total, before.total + 30000);
    assert.equal(after.count, before.count + 1);
    assert.equal(
      after.categories.find((x) => x.label === "Кофе").value,
      before.categories.find((x) => x.label === "Кофе").value + 2,
    );
    raw
      .prepare("UPDATE customer_order SET id_status=5 WHERE id_order=?")
      .run(id);
    const cancelled = await metrics.statistics(db);
    assert.equal(cancelled.total, before.total);
    assert.equal(cancelled.count, before.count);
  }));

test("booking rejects partial overlap and permits adjacent time slots", () =>
  fixture(async (db) => {
    const id = await accounts.register(db, alice, fastHash, "salt");
    const owner = `user:${id}`;
    const input = baseBooking();
    await booking.createBooking(db, owner, input);
    const partial = new Date(input.startsAt);
    partial.setHours(partial.getHours() + 1);
    await assert.rejects(
      booking.createBooking(db, owner, {
        ...input,
        startsAt: partial.toISOString(),
        token: "partial",
      }),
      /занят/,
    );
    const adjacent = new Date(input.startsAt);
    adjacent.setHours(adjacent.getHours() + 2);
    const next = await booking.createBooking(db, owner, {
      ...input,
      startsAt: adjacent.toISOString(),
      token: "adjacent",
    });
    assert.ok(next > 0);
    assert.equal((await booking.bookings(db, owner)).length, 2);
  }));
