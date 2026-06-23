// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

declare global {
  var sqliteDb: any;
}

const dbDir = process.env.VERCEL 
  ? "/tmp" 
  : path.join(process.cwd(), "data");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "users.db");

if (!globalThis.sqliteDb) {
  try {
    // @ts-ignore
    globalThis.sqliteDb = new DatabaseSync(dbPath);
    
    // Set pragmas for concurrency stability
    try {
      globalThis.sqliteDb.exec("PRAGMA busy_timeout = 5000;");
      globalThis.sqliteDb.exec("PRAGMA journal_mode = WAL;");
    } catch (_) {}

    // Create tables if not exist
    globalThis.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      )
    `);

    globalThis.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Seed default settings if not exists
    try {
      const checkSetting = globalThis.sqliteDb.prepare("SELECT value FROM settings WHERE key = ?");
      const urlSetting = checkSetting.get("fiorilli_api_url") as { value: string } | undefined;
      if (!urlSetting || urlSetting.value === "http://siteDaEntidade.uf.gov.br/Transparencia/") {
        const insertSetting = globalThis.sqliteDb.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        insertSetting.run("fiorilli_api_url", "http://pradopolis.ddns.net:5656/transparencia/");
      }
    } catch (e) {
      console.error("Failed to seed default settings:", e);
    }

    // Drop table is no longer needed since schema has migrated to the modern JSON-based documents field
    // try {
    //   globalThis.sqliteDb.exec("DROP TABLE IF EXISTS planning_tasks");
    // } catch (_) {}

    // Create planning_tasks table if not exists
    globalThis.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS planning_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        periodo TEXT NOT NULL,
        etapa TEXT NOT NULL,
        atividade TEXT NOT NULL,
        responsavel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'aguardando',
        data_reuniao TEXT,
        documents TEXT
      )
    `);

    // Seed default planning tasks
    try {
      const checkTasks = globalThis.sqliteDb.prepare("SELECT count(*) as count FROM planning_tasks");
      const taskCount = checkTasks.get() as { count: number } | undefined;
      if (!taskCount || taskCount.count === 0) {
        const insertTask = globalThis.sqliteDb.prepare(
          "INSERT INTO planning_tasks (type, periodo, etapa, atividade, responsavel, status) VALUES (?, ?, ?, ?, ?, ?)"
        );

        // LDO
        insertTask.run("ldo", "Maio", "Alinhamento pós-PPA", "Análise da LDO anterior e definição das metas fiscais do exercício", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("ldo", "Junho", "Proposta técnica inicial", "Elaboração da minuta da LDO com base no PPA e nas prioridades da gestão", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("ldo", "Julho", "Revisão e complementação", "Ajustes técnicos e integração com os setores", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("ldo", "Até 10 de Agosto", "Audiência pública", "Realização da audiência pública sobre a LDO", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("ldo", "Até 20 de Agosto", "Entrega à Câmara", "Protocolo do Projeto de Lei do LDO na Câmara Municipal", "Diretor de Finanças", "aguardando");

        // LOA
        insertTask.run("loa", "Julho", "Coleta de dados e estimativas", "Levantamento das receitas, despesas, emendas e demandas por unidade orçamentária", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("loa", "Agosto", "Elaboração da proposta", "Redação técnica da LOA e organização dos anexos e quadros", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("loa", "Até 10 de Setembro", "Audiência pública", "Realização da audiência pública sobre a proposta orçamentária", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
        insertTask.run("loa", "Até 20 de Setembro", "Entrega à Câmara", "Protocolo do Projeto de Lei da LOA na Câmara Municipal", "Diretor de Finanças", "aguardando");

        console.log("Migration: Seeding initial planning tasks for 2027.");
      }
    } catch (e) {
      console.error("Failed to seed default planning tasks:", e);
    }


    // Migration to add 'approved' column in case the database existed before
    try {
      globalThis.sqliteDb.exec("ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 0");
      console.log("Migration: 'approved' column added to users table.");
    } catch (_) {
      // Column already exists, ignore
    }

    // Clean up old admin user
    try {
      const deleteOldAdmin = globalThis.sqliteDb.prepare("DELETE FROM users WHERE email = ?");
      deleteOldAdmin.run("admin@pradopolis.sp.gov.br");
    } catch (e) {
      // Ignore
    }

    // Seeding new default administrator
    const cryptoModule = require("node:crypto");
    const salt = cryptoModule.randomBytes(16).toString("hex");
    const hash = cryptoModule.scryptSync("pradofin123456", salt, 64).toString("hex");
    const passwordHash = `${salt}:${hash}`;
    
    const insert = globalThis.sqliteDb.prepare(
      "INSERT OR IGNORE INTO users (name, email, password_hash, approved) VALUES (?, ?, ?, 1)"
    );
    insert.run("Contabilidade", "contabilidade@pradopolis.sp.gov.br", passwordHash);
  } catch (err) {
    console.error("Failed to initialize SQLite database:", err);
  }
}

export const db = globalThis.sqliteDb;
