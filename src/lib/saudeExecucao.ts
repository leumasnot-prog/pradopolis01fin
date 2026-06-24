// Leitura e agregação server-side dos relatórios de execução orçamentária da Saúde.
//
// Fontes (pasta /data, exportadas do sistema Fiorilli):
//  - ex-orc-saude2025.csv / ex-orc-saude2026.csv  → empenhos da Saúde até o mês fechado (mai/05)
//  - percentual-despesa-saude.csv                 → base de receita de impostos e piso de 15%
//
// Os CSVs de execução são exportações por empenho (1 linha = 1 empenho), com dezenas de
// colunas. Resolvemos os índices dinamicamente pelo cabeçalho para robustez. As cifras
// usam padrão pt-BR (ponto de milhar, vírgula decimal).

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

interface YearAgg {
  total: MetricSet;
  porFonte: Map<string, FonteRow>;
  porFuncao: Map<string, FuncaoRow>;
  liquidadoFuncaoSaude: number; // VALIQ onde FUNCAO === '10'
  numEmpenhos: number;
}

function emptyMetric(): MetricSet {
  return { empenhado: 0, liquidado: 0, pago: 0 };
}

function aggregateYear(file: string): YearAgg {
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

  const agg: YearAgg = {
    total: emptyMetric(),
    porFonte: new Map(),
    porFuncao: new Map(),
    liquidadoFuncaoSaude: 0,
    numEmpenhos: 0,
  };

  for (let i = 1; i < lines.length; i++) {
    const f = splitLine(lines[i]);
    if (f.length < header.length - 5) continue; // linha truncada/inválida

    const empenhado =
      parseBRL(f[col.vadem]) + parseBRL(f[col.reforco]) - parseBRL(f[col.vademAnulado]);
    const liquidado = parseBRL(f[col.valiq]);
    const pago = parseBRL(f[col.vapag]);

    agg.total.empenhado += empenhado;
    agg.total.liquidado += liquidado;
    agg.total.pago += pago;
    agg.numEmpenhos++;

    const funcaoCod = (f[col.funcao] || "").trim();
    if (funcaoCod === "10") agg.liquidadoFuncaoSaude += liquidado;

    // Agrupamento por Fonte de Recurso
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

    // Agrupamento por Função / Subfunção
    const funcaoNome = (f[col.funcaoNome] || "").trim() || "Não informado";
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

  return agg;
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

export interface SaudeExecucaoData {
  geradoEm: string;
  resumo: {
    a2025: MetricSet & { numEmpenhos: number };
    a2026: MetricSet & { numEmpenhos: number };
  };
  limite: {
    baseReceita2026: number;
    minimo2026: number; // piso de 15%
    percentualMinimo: number; // 15
    aplicadoLiquidado2026: number; // liquidado da função Saúde
    percentualAplicado2026: number;
    atingiu: boolean;
    folgaValor: number; // quanto acima (ou abaixo) do piso
  };
  porFonte: ComparativoFonte[];
  porFuncao: ComparativoFuncao[];
}

function variacao(base: number, atual: number): number | null {
  if (base === 0) return null;
  return ((atual - base) / Math.abs(base)) * 100;
}

function parsePercentual(): { base2026: number; minimo2026: number } {
  // Linha total: CODIGO === '3'  → ATUAL (base) e PERCATUAL (piso 15%)
  const lines = readCsvLines("percentual-despesa-saude.csv");
  const header = splitLine(lines[0]);
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h.trim()] = i));
  const cCodigo = idx["CODIGO"];
  const cAtual = idx["ATUAL"];
  const cPercAtual = idx["PERCATUAL"];

  let base2026 = 0;
  let minimo2026 = 0;
  for (let i = 1; i < lines.length; i++) {
    const f = splitLine(lines[i]);
    if ((f[cCodigo] || "").trim() === "3") {
      base2026 = parseBRL(f[cAtual]);
      minimo2026 = parseBRL(f[cPercAtual]);
      break;
    }
  }
  return { base2026, minimo2026 };
}

let cache: SaudeExecucaoData | null = null;

export function getSaudeExecucao(force = false): SaudeExecucaoData {
  if (cache && !force) return cache;

  const a2025 = aggregateYear("ex-orc-saude2025.csv");
  const a2026 = aggregateYear("ex-orc-saude2026.csv");
  const { base2026, minimo2026 } = parsePercentual();

  // merge por fonte
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

  // merge por função/subfunção
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

  const aplicado = a2026.liquidadoFuncaoSaude;
  const percAplicado = base2026 > 0 ? (aplicado / base2026) * 100 : 0;

  cache = {
    geradoEm: new Date().toISOString(),
    resumo: {
      a2025: { ...a2025.total, numEmpenhos: a2025.numEmpenhos },
      a2026: { ...a2026.total, numEmpenhos: a2026.numEmpenhos },
    },
    limite: {
      baseReceita2026: base2026,
      minimo2026,
      percentualMinimo: 15,
      aplicadoLiquidado2026: aplicado,
      percentualAplicado2026: percAplicado,
      atingiu: percAplicado >= 15,
      folgaValor: aplicado - minimo2026,
    },
    porFonte,
    porFuncao,
  };
  return cache;
}
