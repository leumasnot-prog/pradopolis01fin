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
