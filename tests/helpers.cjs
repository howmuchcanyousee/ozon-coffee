const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { DatabaseSync } = require("node:sqlite");
function load(file) {
  const filename = path.join(__dirname, "../src/data", file + ".ts");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const m = new Module(filename);
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(compiled, filename);
  return m.exports;
}
const shop = load("shop");
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
async function fixture(fn, before) {
  const root = path.resolve(__dirname, "../../work/test-databases");
  fs.mkdirSync(root, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, "case-"));
  const file = path.join(dir, "shop.sqlite");
  fs.copyFileSync(
    path.join(__dirname, "../assets/database/coffeehouse.sqlite"),
    file,
  );
  const raw = new DatabaseSync(file);
  try {
    if (before) before(raw);
    const db = adapter(raw);
    await shop.initialize(db);
    await fn(db, raw, file);
  } finally {
    raw.close();
    if (!path.resolve(dir).startsWith(root + path.sep))
      throw new Error("Unsafe test cleanup");
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
module.exports = { load, shop, adapter, fixture };
