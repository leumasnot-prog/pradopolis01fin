// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { createPool } from "@vercel/postgres";
import { hashPassword } from "./crypto";

declare global {
  var sqliteDb: any;
  var pgPool: any;
}

const isPg = !!process.env.POSTGRES_URL;

// Helper: Translate query syntax from SQLite to Postgres
function translateQuery(sql: string): { sql: string; isUpsertSettings: boolean; isInsertUserIgnore: boolean; isInsertUser: boolean } {
  const cleanSql = sql.replace(/\s+/g, " ").trim();
  let translated = cleanSql;
  let isUpsertSettings = false;
  let isInsertUserIgnore = false;
  let isInsertUser = false;

  if (/INSERT OR REPLACE INTO settings/i.test(cleanSql)) {
    translated = "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value";
    isUpsertSettings = true;
  } else if (/INSERT OR IGNORE INTO users/i.test(cleanSql)) {
    translated = "INSERT INTO users (name, email, password_hash, approved) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING";
    isInsertUserIgnore = true;
  } else if (/INSERT INTO users/i.test(cleanSql)) {
    translated = cleanSql.replace(/\?/g, (val, index) => `$${index + 1}`);
    if (!/returning/i.test(translated)) {
      translated += " RETURNING id";
    }
    isInsertUser = true;
  } else {
    // General replacement of "?" placeholders to Postgres "$1, $2, $3"
    let paramIndex = 1;
    translated = translated.replace(/\?/g, () => `$${paramIndex++}`);
  }

  return {
    sql: translated,
    isUpsertSettings,
    isInsertUserIgnore,
    isInsertUser
  };
}

class StatementWrapper {
  private sql: string;
  private sqliteStmt: any;

  constructor(sql: string) {
    this.sql = sql;
    if (!isPg && globalThis.sqliteDb) {
      this.sqliteStmt = globalThis.sqliteDb.prepare(sql);
    }
  }

  async all(...args: any[]): Promise<any[]> {
    if (isPg) {
      const translated = translateQuery(this.sql);
      const result = await globalThis.pgPool.query(translated.sql, args);
      return result.rows;
    } else {
      return this.sqliteStmt.all(...args);
    }
  }

  async get(...args: any[]): Promise<any> {
    if (isPg) {
      const translated = translateQuery(this.sql);
      const result = await globalThis.pgPool.query(translated.sql, args);
      return result.rows[0];
    } else {
      return this.sqliteStmt.get(...args);
    }
  }

  async run(...args: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    if (isPg) {
      const translated = translateQuery(this.sql);
      const result = await globalThis.pgPool.query(translated.sql, args);
      
      let lastInsertRowid = 0;
      if (translated.isInsertUser && result.rows && result.rows.length > 0) {
        lastInsertRowid = result.rows[0].id;
      }
      return {
        changes: result.rowCount || 0,
        lastInsertRowid
      };
    } else {
      const result = this.sqliteStmt.run(...args);
      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid)
      };
    }
  }
}

// Initialization block
if (isPg) {
  if (!globalThis.pgPool) {
    try {
      globalThis.pgPool = createPool();
      
      // Initialize tables asynchronously
      (async () => {
        const client = await globalThis.pgPool.connect();
        try {
          // 1. Create tables
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              approved INTEGER NOT NULL DEFAULT 0,
              allowed_screens TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);

          await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
              key VARCHAR(255) PRIMARY KEY,
              value TEXT NOT NULL
            )
          `);

          await client.query(`
            CREATE TABLE IF NOT EXISTS planning_tasks (
              id SERIAL PRIMARY KEY,
              type VARCHAR(50) NOT NULL,
              periodo VARCHAR(100) NOT NULL,
              etapa VARCHAR(255) NOT NULL,
              atividade TEXT NOT NULL,
              responsavel VARCHAR(255) NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'aguardando',
              data_reuniao VARCHAR(100),
              documents TEXT
            )
          `);

          // 2. Seed default setting
          const checkSetting = await client.query("SELECT value FROM settings WHERE key = $1", ["fiorilli_api_url"]);
          if (checkSetting.rows.length === 0) {
            await client.query("INSERT INTO settings (key, value) VALUES ($1, $2)", ["fiorilli_api_url", "http://pradopolis.ddns.net:5656/transparencia/"]);
          }

          // 3. Seed default planning tasks
          const checkTasks = await client.query("SELECT count(*) as count FROM planning_tasks");
          if (parseInt(checkTasks.rows[0].count, 10) === 0) {
            const insertTask = `
              INSERT INTO planning_tasks (type, periodo, etapa, atividade, responsavel, status) 
              VALUES ($1, $2, $3, $4, $5, $6)
            `;
            // LDO
            await client.query(insertTask, ["ldo", "Maio", "Alinhamento pós-PPA", "Análise da LDO anterior e definição das metas fiscais do exercício", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["ldo", "Junho", "Proposta técnica inicial", "Elaboração da minuta da LDO com base no PPA e nas prioridades da gestão", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["ldo", "Julho", "Revisão e complementação", "Ajustes técnicos e integração com os setores", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["ldo", "Até 10 de Agosto", "Audiência pública", "Realização da audiência pública sobre a LDO", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["ldo", "Até 20 de Agosto", "Entrega à Câmara", "Protocolo do Projeto de Lei do LDO na Câmara Municipal", "Diretor de Finanças", "aguardando"]);

            // LOA
            await client.query(insertTask, ["loa", "Julho", "Coleta de dados e estimativas", "Levantamento das receitas, despesas, emendas e demandas por unidade orçamentária", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["loa", "Agosto", "Elaboração da proposta", "Redação técnica da LOA e organização dos anexos e quadros", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["loa", "Até 10 de Setembro", "Audiência pública", "Realização da audiência pública sobre a proposta orçamentária", "ALEX MORONTA , SAMUEL PULCINI", "aguardando"]);
            await client.query(insertTask, ["loa", "Até 20 de Setembro", "Entrega à Câmara", "Protocolo do Projeto de Lei da LOA na Câmara Municipal", "Diretor de Finanças", "aguardando"]);

            console.log("Postgres Migration: Seeding initial planning tasks.");
          }

          // 4. Seed default admin
          const checkAdmin = await client.query("SELECT * FROM users WHERE email = $1", ["contabilidade@pradopolis.sp.gov.br"]);
          if (checkAdmin.rows.length === 0) {
            const passwordHash = hashPassword("pradofin123456");
            await client.query(
              "INSERT INTO users (name, email, password_hash, approved) VALUES ($1, $2, $3, 1)",
              ["Contabilidade", "contabilidade@pradopolis.sp.gov.br", passwordHash]
            );
            console.log("Postgres Migration: Seeding default administrator.");
          }
        } finally {
          client.release();
        }
      })().catch(err => {
        console.error("Failed to initialize Postgres schema/seeding:", err);
      });

    } catch (err) {
      console.error("Failed to initialize Postgres pool:", err);
    }
  }
} else {
  // SQLite Fallback Mode
  const dbDir = path.join(process.cwd(), "data");

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "users.db");

  if (!globalThis.sqliteDb) {
    try {
      // @ts-ignore
      globalThis.sqliteDb = new DatabaseSync(dbPath);
      
      // Set pragmas
      try {
        globalThis.sqliteDb.exec("PRAGMA busy_timeout = 5000;");
        globalThis.sqliteDb.exec("PRAGMA journal_mode = WAL;");
      } catch (_) {}

      // Create tables
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

      // Seed settings
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

      // Seed planning tasks
      try {
        const checkTasks = globalThis.sqliteDb.prepare("SELECT count(*) as count FROM planning_tasks");
        const taskCount = checkTasks.get() as { count: number } | undefined;
        if (!taskCount || taskCount.count === 0) {
          const insertTask = globalThis.sqliteDb.prepare(
            "INSERT INTO planning_tasks (type, periodo, etapa, atividade, responsavel, status) VALUES (?, ?, ?, ?, ?, ?)"
          );

          insertTask.run("ldo", "Maio", "Alinhamento pós-PPA", "Análise da LDO anterior e definição das metas fiscais do exercício", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("ldo", "Junho", "Proposta técnica inicial", "Elaboração da minuta da LDO com base no PPA e nas prioridades da gestão", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("ldo", "Julho", "Revisão e complementação", "Ajustes técnicos e integração com os setores", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("ldo", "Até 10 de Agosto", "Audiência pública", "Realização da audiência pública sobre a LDO", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("ldo", "Até 20 de Agosto", "Entrega à Câmara", "Protocolo do Projeto de Lei do LDO na Câmara Municipal", "Diretor de Finanças", "aguardando");

          insertTask.run("loa", "Julho", "Coleta de dados e estimativas", "Levantamento das receitas, despesas, emendas e demandas por unidade orçamentária", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("loa", "Agosto", "Elaboração da proposta", "Redação técnica da LOA e organização dos anexos e quadros", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("loa", "Até 10 de Setembro", "Audiência pública", "Realização da audiência pública sobre a proposta orçamentária", "ALEX MORONTA , SAMUEL PULCINI", "aguardando");
          insertTask.run("loa", "Até 20 de Setembro", "Entrega à Câmara", "Protocolo do Projeto de Lei da LOA na Câmara Municipal", "Diretor de Finanças", "aguardando");

          console.log("Migration: Seeding initial planning tasks for 2027.");
        }
      } catch (e) {
        console.error("Failed to seed default planning tasks:", e);
      }

      // SQLite Migrations
      try {
        globalThis.sqliteDb.exec("ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 0");
      } catch (_) {}

      try {
        globalThis.sqliteDb.exec("ALTER TABLE users ADD COLUMN allowed_screens TEXT");
      } catch (_) {}

      // Clean up old admin user
      try {
        const deleteOldAdmin = globalThis.sqliteDb.prepare("DELETE FROM users WHERE email = ?");
        deleteOldAdmin.run("admin@pradopolis.sp.gov.br");
      } catch (e) {}

      // Seed admin user
      const checkAdmin = globalThis.sqliteDb.prepare("SELECT * FROM users WHERE email = ?");
      if (!checkAdmin.get("contabilidade@pradopolis.sp.gov.br")) {
        const passwordHash = hashPassword("pradofin123456");
        const insert = globalThis.sqliteDb.prepare(
          "INSERT OR IGNORE INTO users (name, email, password_hash, approved) VALUES (?, ?, ?, 1)"
        );
        insert.run("Contabilidade", "contabilidade@pradopolis.sp.gov.br", passwordHash);
      }

    } catch (err) {
      console.error("Failed to initialize SQLite database:", err);
    }
  }
}

// Unified export
export const db = {
  prepare: (sql: string) => new StatementWrapper(sql)
};
