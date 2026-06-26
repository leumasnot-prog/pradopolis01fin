// Leitura e agregação server-side dos relatórios de dotação orçamentária 2026.
// Fontes:
//   data/relatorio-dot-orc2026.csv       → orçamento total
//   data/relatorio-dot-orc2026folha.csv  → apenas Pessoal e Encargos (folha salarial)
// Usado para complementar as telas setoriais com Dotação Atual e % de folha.

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function parseBRL(raw: string | undefined): number {
  if (raw == null) return 0;
  let v = String(raw).replace(/\s/g, "").trim();
  if (v === "" || v === "-" || v === "0") return 0;
  let neg = false;
  if (v.startsWith("-")) { neg = true; v = v.slice(1); }
  v = v.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  if (isNaN(n)) return 0;
  return neg ? -n : n;
}

export interface DotacaoFuncao {
  dotacaoAtual: number;
  dotacaoFolha: number;
  empenhado: number;
  liquidado: number;
  pago: number;
}

// Caches em memória (módulo-level).
let cacheTotal: Map<string, DotacaoFuncao> | null = null;
let cacheFolha: Map<string, number> | null = null;

function loadTotals(): Map<string, DotacaoFuncao> {
  const text = fs.readFileSync(path.join(DATA_DIR, "relatorio-dot-orc2026.csv"), "utf-8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split(";");
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h.trim()] = i));

  const col = {
    funcao: idx["FUNCAO"],
    dotacAtual: idx["DOTACATUAL"],
    empAtual: idx["EMPATUAL"],
    liqAtual: idx["LIQATUAL"],
    pagAtual: idx["PAGOATUAL"],
  };

  const map = new Map<string, DotacaoFuncao>();
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(";");
    const cod = (f[col.funcao] || "").trim().padStart(2, "0");
    if (!cod || cod === "00") continue;
    const entry = map.get(cod) ?? { dotacaoAtual: 0, dotacaoFolha: 0, empenhado: 0, liquidado: 0, pago: 0 };
    entry.dotacaoAtual += parseBRL(f[col.dotacAtual]);
    entry.empenhado += parseBRL(f[col.empAtual]);
    entry.liquidado += parseBRL(f[col.liqAtual]);
    entry.pago += parseBRL(f[col.pagAtual]);
    map.set(cod, entry);
  }
  return map;
}

function loadFolha(): Map<string, number> {
  const full = path.join(DATA_DIR, "relatorio-dot-orc2026folha.csv");
  if (!fs.existsSync(full)) return new Map();

  const text = fs.readFileSync(full, "utf-8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split(";");
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h.trim()] = i));

  const colFuncao = idx["FUNCAO"];
  const colDotac = idx["DOTACATUAL"];

  const map = new Map<string, number>();
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(";");
    const cod = (f[colFuncao] || "").trim().padStart(2, "0");
    if (!cod || cod === "00") continue;
    map.set(cod, (map.get(cod) ?? 0) + parseBRL(f[colDotac]));
  }
  return map;
}

/** Retorna os totais de dotação + folha para um código de função (zero-padded). */
export function getDotacaoByFuncao(funcaoCod: string, force = false): DotacaoFuncao {
  if (!cacheTotal || force) cacheTotal = loadTotals();
  if (!cacheFolha || force) cacheFolha = loadFolha();

  const cod = String(funcaoCod).trim().padStart(2, "0");
  const base = cacheTotal.get(cod) ?? { dotacaoAtual: 0, dotacaoFolha: 0, empenhado: 0, liquidado: 0, pago: 0 };
  return { ...base, dotacaoFolha: cacheFolha.get(cod) ?? 0 };
}

// ── Detalhamento POR FICHA ───────────────────────────────────────────────────
// Mesmo CSV (export ao vivo do Fiorilli), agregado a nível de ficha em vez de
// função. Substitui o snapshot estático orcamento_data.json na tabela setorial:
// cada ficha pode aparecer em várias linhas (fontes/desdobros), por isso somamos.

export interface FichaRow {
  ficha: string;
  especificacao: string; // CATECFICHANOME (ex.: "MATERIAL DE CONSUMO")
  subfuncao: string; // SUBFUNCAONOME
  catecficha: string; // código CATECFICHA (ex.: "3.3.90.30.00")
  dotacao: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  apagar: number;
  saldo: number;
  percentual: number; // empenhado / dotação * 100
  status: "normal" | "warning" | "critical";
}

let cacheFichas: Map<string, FichaRow[]> | null = null;

function loadFichas(): Map<string, FichaRow[]> {
  const text = fs.readFileSync(path.join(DATA_DIR, "relatorio-dot-orc2026.csv"), "utf-8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split(";");
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h.trim()] = i));

  const col = {
    funcao: idx["FUNCAO"],
    ficha: idx["FICHA"],
    subfuncaoNome: idx["SUBFUNCAONOME"],
    catecficha: idx["CATECFICHA"],
    catecfichaNome: idx["CATECFICHANOME"],
    dotacAtual: idx["DOTACATUAL"],
    empAtual: idx["EMPATUAL"],
    liqAtual: idx["LIQATUAL"],
    pagAtual: idx["PAGOATUAL"],
    saldo: idx["SALDO"],
    apagar: idx["APAGAR"],
  };

  const byFuncao = new Map<string, Map<string, FichaRow>>();

  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(";");
    const cod = (f[col.funcao] || "").trim().padStart(2, "0");
    if (!cod || cod === "00") continue;
    const ficha = (f[col.ficha] || "").trim();
    if (!ficha) continue;

    let fichaMap = byFuncao.get(cod);
    if (!fichaMap) {
      fichaMap = new Map();
      byFuncao.set(cod, fichaMap);
    }

    let row = fichaMap.get(ficha);
    if (!row) {
      row = {
        ficha,
        especificacao: (f[col.catecfichaNome] || "").trim() || "—",
        subfuncao: (f[col.subfuncaoNome] || "").trim() || "—",
        catecficha: (f[col.catecficha] || "").trim() || "—",
        dotacao: 0,
        empenhado: 0,
        liquidado: 0,
        pago: 0,
        apagar: 0,
        saldo: 0,
        percentual: 0,
        status: "normal",
      };
      fichaMap.set(ficha, row);
    }

    row.dotacao += parseBRL(f[col.dotacAtual]);
    row.empenhado += parseBRL(f[col.empAtual]);
    row.liquidado += parseBRL(f[col.liqAtual]);
    row.pago += parseBRL(f[col.pagAtual]);
    row.apagar += parseBRL(f[col.apagar]);
    row.saldo += parseBRL(f[col.saldo]);
  }

  const out = new Map<string, FichaRow[]>();
  byFuncao.forEach((fichaMap, cod) => {
    const rows = Array.from(fichaMap.values());
    for (const r of rows) {
      r.percentual = r.dotacao > 0 ? (r.empenhado / r.dotacao) * 100 : 0;
      r.status = r.percentual >= 85 ? "critical" : r.percentual >= 70 ? "warning" : "normal";
    }
    rows.sort((a, b) => b.dotacao - a.dotacao);
    out.set(cod, rows);
  });
  return out;
}

/** Fichas orçamentárias de uma função (código zero-padded), com execução ao vivo. */
export function getFichasByFuncao(funcaoCod: string, force = false): FichaRow[] {
  if (!cacheFichas || force) cacheFichas = loadFichas();
  const cod = String(funcaoCod).trim().padStart(2, "0");
  return cacheFichas.get(cod) ?? [];
}
