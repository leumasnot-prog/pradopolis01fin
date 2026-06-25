// Leitura e agregação server-side dos relatórios COMPLETOS de execução orçamentária,
// agrupados por FUNÇÃO de governo. Alimenta as telas setoriais.
//
// Fontes (pasta /data, exportadas do sistema Fiorilli):
//  - ex-orc2025.csv / ex-orc2026.csv  → TODOS os empenhos do exercício (1 linha = 1 empenho)
//
// Generalização de `urbanExecucao.ts`: enquanto aquele lê um CSV pré-filtrado do setor,
// aqui lemos os arquivos completos UMA única vez por ano (cacheando o Map por função) e,
// sob demanda, montamos o comparativo 2025 × 2026 de um setor específico (por código de
// função). As cifras usam padrão pt-BR (ponto de milhar, vírgula decimal).

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/** Converte uma cifra pt-BR ("1.234,56", "-", "2,3", "1500") em número. */
function parseBRL(raw: string | undefined): number {
  if (raw == null) return 0;
  let v = String(raw).replace("R$", "").replace(/\s/g, "").trim();
  if (v === "" || v === "-" || v === "0") return 0;

  let neg = false;
  if (v.startsWith("-")) {
    neg = true;
    v = v.slice(1);
  } else if (v.startsWith("(") && v.endsWith(")")) {
    neg = true;
    v = v.slice(1, -1);
  }
  // remove separador de milhar (ponto) e troca vírgula decimal por ponto
  v = v.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  if (isNaN(n)) return 0;
  return neg ? -n : n;
}

/** Quebra uma linha do CSV (delimitador ';'). */
function splitLine(line: string): string[] {
  return line.split(";");
}

function readCsvLines(file: string): string[] {
  const full = path.join(DATA_DIR, file);
  const text = fs.readFileSync(full, "utf-8").replace(/^﻿/, "");
  return text.split(/\r?\n/).filter((l) => l.trim() !== "");
}

export interface MetricSet {
  empenhado: number;
  liquidado: number;
  pago: number;
}

export interface FonteRow extends MetricSet {
  fonte: string;
  grupo: string;
}

export interface FuncaoRow extends MetricSet {
  funcao: string;
  subfuncao: string;
}

/** Agregação de UMA função de governo dentro de um exercício. */
interface FuncaoAgg {
  total: MetricSet;
  numEmpenhos: number;
  porFonte: Map<string, FonteRow>;
  porFuncao: Map<string, FuncaoRow>;
  funcaoNome: string;
}

function emptyMetric(): MetricSet {
  return { empenhado: 0, liquidado: 0, pago: 0 };
}

/** Códigos de função dos setores cobertos pelas telas setoriais. */
export const SETORES_VALIDOS: string[] = [
  "02",
  "04",
  "06",
  "12",
  "13",
  "17",
  "18",
  "22",
  "27",
];

/**
 * Lê o CSV completo de um exercício UMA única vez e devolve a agregação de TODAS as
 * funções, indexada pelo código (zero-padded). Evita reler o arquivo (~8 MB) por setor.
 */
function aggregateYearAllFuncoes(file: string): Map<string, FuncaoAgg> {
  const lines = readCsvLines(file);
  const header = splitLine(lines[0]);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h.trim()] = i));

  const col = {
    fonGrupo: idx["FONGRUPO"],
    fonGrupoNome: idx["FONGRUPONOME"],
    fonCodigoNome: idx["FONCODIGONOME"],
    funcaoNome: idx["FUNCAONOME"],
    subfuncaoNome: idx["SUBFUNCAONOME"],
    funcao: idx["FUNCAO"],
    vadem: idx["VADEM"],
    reforco: idx["REFORCO"],
    vademAnulado: idx["VADEMANULADO"],
    valiq: idx["VALIQ"],
    vapag: idx["VAPAG"],
  };

  const byFuncao = new Map<string, FuncaoAgg>();

  for (let i = 1; i < lines.length; i++) {
    const f = splitLine(lines[i]);
    if (f.length < header.length - 5) continue; // linha truncada/inválida

    const funcaoCod = (f[col.funcao] || "").trim().padStart(2, "0");
    if (funcaoCod === "" || funcaoCod === "00") continue;

    const empenhado =
      parseBRL(f[col.vadem]) + parseBRL(f[col.reforco]) - parseBRL(f[col.vademAnulado]);
    const liquidado = parseBRL(f[col.valiq]);
    const pago = parseBRL(f[col.vapag]);

    let agg = byFuncao.get(funcaoCod);
    if (!agg) {
      agg = {
        total: emptyMetric(),
        numEmpenhos: 0,
        porFonte: new Map(),
        porFuncao: new Map(),
        funcaoNome: "",
      };
      byFuncao.set(funcaoCod, agg);
    }

    const funcaoNome = (f[col.funcaoNome] || "").trim() || "Não informado";
    if (!agg.funcaoNome && funcaoNome !== "Não informado") agg.funcaoNome = funcaoNome;

    agg.total.empenhado += empenhado;
    agg.total.liquidado += liquidado;
    agg.total.pago += pago;
    agg.numEmpenhos++;

    // Agrupamento por Fonte de Recurso (idêntico ao urbanExecucao)
    const rawFonGrupo = (f[col.fonGrupo] || "").trim();
    let label = "";
    let sub = "";

    if (rawFonGrupo === "01") {
      label = "01 - TESOURO";
      sub = "TESOURO";
    } else if (rawFonGrupo === "02") {
      label = "02 - TRANSF. ESTADUAL";
      sub = "TRANSFERÊNCIAS ESTADUAIS";
    } else if (rawFonGrupo === "05") {
      label = "05 - TRANSF. FEDERAL";
      sub = "TRANSFERÊNCIAS FEDERAIS";
    } else if (rawFonGrupo === "08") {
      label = "08 - EMENDAS PARLAMENTARES";
      sub = "EMENDAS PARLAMENTARES";
    } else {
      const gNome = (f[col.fonGrupoNome] || "").trim() || "Outros";
      label = rawFonGrupo ? `${rawFonGrupo} - ${gNome}` : gNome;
      sub = gNome;
    }

    let fr = agg.porFonte.get(label);
    if (!fr) {
      fr = { fonte: label, grupo: sub, ...emptyMetric() };
      agg.porFonte.set(label, fr);
    }
    fr.empenhado += empenhado;
    fr.liquidado += liquidado;
    fr.pago += pago;

    // Agrupamento por Função / Subfunção. Como o payload é de uma única função, na prática
    // lista as SUBfunções dela — mantemos a chave `funcaoNome|||subfuncaoNome` do urban.
    const subfuncaoNome = (f[col.subfuncaoNome] || "").trim() || "—";
    const key = `${funcaoNome}|||${subfuncaoNome}`;
    let qr = agg.porFuncao.get(key);
    if (!qr) {
      qr = { funcao: funcaoNome, subfuncao: subfuncaoNome, ...emptyMetric() };
      agg.porFuncao.set(key, qr);
    }
    qr.empenhado += empenhado;
    qr.liquidado += liquidado;
    qr.pago += pago;
  }

  return byFuncao;
}

// ── Estruturas de saída (comparativo 2025 × 2026) ──────────────────────────

export interface ComparativoFonte {
  fonte: string;
  grupo: string;
  a2025: MetricSet;
  a2026: MetricSet;
  varLiquidado: number | null; // variação % do liquidado (null se base 2025 = 0)
}

export interface ComparativoFuncao {
  funcao: string;
  subfuncao: string;
  a2025: MetricSet;
  a2026: MetricSet;
  varLiquidado: number | null;
}

export interface SetorExecucaoData {
  geradoEm: string;
  funcao: string; // ex.: "12"
  funcaoNome: string; // ex.: "Educação"
  resumo: {
    a2025: MetricSet & { numEmpenhos: number };
    a2026: MetricSet & { numEmpenhos: number };
  };
  limite: {
    baseReceita2026: number; // empenhado total 2026
    minimo2026: number; // baseReceita2026 * 0.8
    percentualMinimo: number; // 80
    aplicadoLiquidado2026: number; // liquidado 2026
    percentualAplicado2026: number; // liquidado2026 / empenhado2026 * 100 (0 se empenhado=0)
    atingiu: boolean; // perc >= 80
    folgaValor: number; // empenhado2026 - liquidado2026
  };
  porFonte: ComparativoFonte[];
  porFuncao: ComparativoFuncao[];
}

function variacao(base: number, atual: number): number | null {
  if (base === 0) return null;
  return ((atual - base) / Math.abs(base)) * 100;
}

// Caches em memória (módulo-level), espelhando o padrão do urbanExecucao.
let cache2025: Map<string, FuncaoAgg> | null = null;
let cache2026: Map<string, FuncaoAgg> | null = null;
const cacheSetor = new Map<string, SetorExecucaoData>();

function getYear(year: 2025 | 2026, force: boolean): Map<string, FuncaoAgg> {
  if (year === 2025) {
    if (!cache2025 || force) cache2025 = aggregateYearAllFuncoes("ex-orc2025.csv");
    return cache2025;
  }
  if (!cache2026 || force) cache2026 = aggregateYearAllFuncoes("ex-orc2026.csv");
  return cache2026;
}

function emptyFuncaoAgg(): FuncaoAgg {
  return {
    total: emptyMetric(),
    numEmpenhos: 0,
    porFonte: new Map(),
    porFuncao: new Map(),
    funcaoNome: "",
  };
}

export function getSetorExecucao(funcaoCod: string, force = false): SetorExecucaoData {
  const cod = String(funcaoCod).trim().padStart(2, "0");

  if (!force) {
    const hit = cacheSetor.get(cod);
    if (hit) return hit;
  }

  const all2025 = getYear(2025, force);
  const all2026 = getYear(2026, force);

  const a2025 = all2025.get(cod) ?? emptyFuncaoAgg();
  const a2026 = all2026.get(cod) ?? emptyFuncaoAgg();

  // nome da função: prefere 2026, senão 2025
  const funcaoNome = a2026.funcaoNome || a2025.funcaoNome || "Não informado";

  // merge por fonte (ordenado por liquidado 2026 desc)
  const fonteKeys = new Set<string>([...a2025.porFonte.keys(), ...a2026.porFonte.keys()]);
  const porFonte: ComparativoFonte[] = [];
  fonteKeys.forEach((k) => {
    const r25 = a2025.porFonte.get(k);
    const r26 = a2026.porFonte.get(k);
    const m25 = r25 ?? emptyMetric();
    const m26 = r26 ?? emptyMetric();
    porFonte.push({
      fonte: k,
      grupo: (r26?.grupo || r25?.grupo || "—") as string,
      a2025: { empenhado: m25.empenhado, liquidado: m25.liquidado, pago: m25.pago },
      a2026: { empenhado: m26.empenhado, liquidado: m26.liquidado, pago: m26.pago },
      varLiquidado: variacao(m25.liquidado, m26.liquidado),
    });
  });
  porFonte.sort((a, b) => b.a2026.liquidado - a.a2026.liquidado);

  // merge por função/subfunção (ordenado por liquidado 2026 desc)
  const funcaoKeys = new Set<string>([...a2025.porFuncao.keys(), ...a2026.porFuncao.keys()]);
  const porFuncao: ComparativoFuncao[] = [];
  funcaoKeys.forEach((k) => {
    const r25 = a2025.porFuncao.get(k);
    const r26 = a2026.porFuncao.get(k);
    const m25 = r25 ?? emptyMetric();
    const m26 = r26 ?? emptyMetric();
    const [funcao, subfuncao] = k.split("|||");
    porFuncao.push({
      funcao,
      subfuncao,
      a2025: { empenhado: m25.empenhado, liquidado: m25.liquidado, pago: m25.pago },
      a2026: { empenhado: m26.empenhado, liquidado: m26.liquidado, pago: m26.pago },
      varLiquidado: variacao(m25.liquidado, m26.liquidado),
    });
  });
  porFuncao.sort((a, b) => b.a2026.liquidado - a.a2026.liquidado);

  const empenhadoTotal = a2026.total.empenhado;
  const aplicadoTotal = a2026.total.liquidado;
  const percAplicado = empenhadoTotal > 0 ? (aplicadoTotal / empenhadoTotal) * 100 : 0;

  const data: SetorExecucaoData = {
    geradoEm: new Date().toISOString(),
    funcao: cod,
    funcaoNome,
    resumo: {
      a2025: { ...a2025.total, numEmpenhos: a2025.numEmpenhos },
      a2026: { ...a2026.total, numEmpenhos: a2026.numEmpenhos },
    },
    limite: {
      baseReceita2026: empenhadoTotal,
      minimo2026: empenhadoTotal * 0.8,
      percentualMinimo: 80,
      aplicadoLiquidado2026: aplicadoTotal,
      percentualAplicado2026: percAplicado,
      atingiu: percAplicado >= 80,
      folgaValor: empenhadoTotal - aplicadoTotal,
    },
    porFonte,
    porFuncao,
  };

  cacheSetor.set(cod, data);
  return data;
}
