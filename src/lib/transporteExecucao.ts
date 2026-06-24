// Leitura e agregação server-side dos relatórios de execução orçamentária do
// Departamento Municipal de Transportes e Trânsito.
//
// Fontes (pasta /data, exportadas do sistema Fiorilli):
//  - ex-orc-transporte2025.csv / ex-orc-transporte2026.csv → empenhos do setor (1 linha = 1 empenho)
//  - relatorio-desp-manutencao-veiculos.csv → série histórica do gasto com manutenção
//    de veículos de TODA a frota municipal (serviços + material), por exercício.
//
// Os CSVs de execução seguem o mesmo layout da Promoção Social/Saúde: resolvemos os
// índices das colunas dinamicamente pelo cabeçalho. As cifras usam padrão pt-BR
// (ponto de milhar, vírgula decimal).

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/** Converte uma cifra pt-BR ("1.234,56", "R$ 254.324,25", "-", "2,3", "1500") em número. */
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

/** Quebra uma linha do CSV de execução (delimitador ';'). */
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

// ── Manutenção da frota municipal ──────────────────────────────────────────
// O relatório relatorio-desp-manutencao-veiculos.csv é uma exportação "humana"
// (separador ',', valores entre aspas) com blocos por exercício. Cada bloco traz
// dois elementos de despesa: serviços (3.3.90.39.19) e material/peças (3.3.90.30.39).

/** Elementos de despesa que compõem o gasto com manutenção da frota. */
const COD_SERVICOS = "3.3.90.39.19"; // MANUTENÇÃO E CONSERVAÇÃO DE VEÍCULOS
const COD_MATERIAL = "3.3.90.30.39"; // MATERIAL PARA MANUTENÇÃO DE VEÍCULOS

/**
 * Gasto anual com COMBUSTÍVEL da frota municipal (todos os setores).
 * Fonte: 2º bloco do relatorio-desp-manutencao-veiculos.csv (totais por posto),
 * cujos cabeçalhos de ano estão trocados — usamos os totais já consolidados.
 * O exercício de 2026 (parcial, liquidado até 24/06/2026) não consta no export
 * e foi informado pela contabilidade. Centralizado aqui para fácil atualização.
 */
const COMBUSTIVEL_POR_ANO: Record<number, number> = {
  2020: 734437.9,
  2021: 741720.55,
  2022: 1591144.72,
  2023: 1768076.72,
  2024: 1260514.13,
  2025: 1459106.75,
  2026: 591177.22, // parcial — até 24/06/2026
};

/** Frota municipal padrão (ajustável pelo gestor na própria tela). */
export const FROTA_PADRAO = 112;

export interface ManutencaoAno {
  ano: number;
  servicos: number; // 3.3.90.39.19
  material: number; // 3.3.90.30.39
  total: number; // manutenção = serviços + material
  combustivel: number; // gasto com combustível no exercício
  parcial: boolean; // exercício ainda em andamento (acumulado até a data de referência)
}

/** Parser CSV simples que respeita campos entre aspas duplas (com vírgula interna). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

interface ManutencaoData {
  porAno: ManutencaoAno[];
  ultimoAnoFechado: number | null; // exercício completo mais recente
  dataReferenciaParcial: string | null; // "24/06/2026"
  fracaoAnoParcial: number | null; // fração do ano decorrida no exercício parcial
}

/** Fração do ano decorrida até uma data "dd/mm/aaaa" (para anualizar o parcial). */
function fracaoAno(dataBR: string): number | null {
  const m = dataBR.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);
  const inicio = Date.UTC(ano, 0, 1);
  const atual = Date.UTC(ano, mes - 1, dia);
  const fimAno = Date.UTC(ano + 1, 0, 1);
  const decorrido = (atual - inicio) / (fimAno - inicio);
  return Math.min(Math.max(decorrido, 0), 1);
}

function parseManutencao(file: string): ManutencaoData {
  const full = path.join(DATA_DIR, file);
  const text = fs.readFileSync(full, "utf-8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/);

  const porAno = new Map<number, ManutencaoAno>();
  let anoAtual: number | null = null;
  let dataReferenciaParcial: string | null = null;
  let anoParcial: number | null = null;

  const getAno = (ano: number): ManutencaoAno => {
    let row = porAno.get(ano);
    if (!row) {
      row = { ano, servicos: 0, material: 0, total: 0, combustivel: 0, parcial: false };
      porAno.set(ano, row);
    }
    return row;
  };

  for (const raw of lines) {
    if (raw.trim() === "") continue;
    const f = parseCsvLine(raw).map((c) => c.trim());

    // Detecta o exercício corrente ("Ano Referencia" seguido do ano em coluna própria).
    const yearCell = f.find((c) => /^(20\d{2})$/.test(c));
    if (yearCell && f.some((c) => c === "")) {
      // linha do tipo ",2026,,": só o ano preenchido
      const onlyYear = f.filter((c) => c !== "");
      if (onlyYear.length === 1 && /^(20\d{2})$/.test(onlyYear[0])) {
        anoAtual = parseInt(onlyYear[0], 10);
        continue;
      }
    }

    // Detecta a data de referência do exercício parcial ("... até dia 24/06/2026").
    const refMatch = raw.match(/at[ée]\s+dia\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (refMatch) {
      dataReferenciaParcial = refMatch[1];
      const mAno = refMatch[1].match(/\d{2}\/\d{2}\/(\d{4})/);
      if (mAno) anoParcial = parseInt(mAno[1], 10);
    }

    if (anoAtual == null) continue;

    // Linhas de dados: [_, código, descrição, valor]. Só contabilizamos os dois
    // elementos de manutenção — o restante do arquivo (combustível por posto) é ignorado.
    const codigo = f[1] || "";
    if (codigo === COD_SERVICOS || codigo === COD_MATERIAL) {
      const valor = parseBRL(f[3] ?? f[f.length - 1]);
      const row = getAno(anoAtual);
      if (codigo === COD_SERVICOS) row.servicos += valor;
      else row.material += valor;
      row.total = row.servicos + row.material;
    }
  }

  // Anexa o gasto com combustível a cada exercício (inclui anos que só existam
  // na série de combustível, por robustez).
  Object.keys(COMBUSTIVEL_POR_ANO).forEach((k) => {
    const ano = parseInt(k, 10);
    getAno(ano).combustivel = COMBUSTIVEL_POR_ANO[ano];
  });

  const anos = [...porAno.values()].sort((a, b) => a.ano - b.ano);

  // Marca o exercício parcial e descobre o último exercício fechado.
  if (anoParcial != null && porAno.has(anoParcial)) {
    porAno.get(anoParcial)!.parcial = true;
  }
  const fechados = anos.filter((a) => !a.parcial);
  const ultimoAnoFechado = fechados.length ? fechados[fechados.length - 1].ano : null;

  return {
    porAno: anos,
    ultimoAnoFechado,
    dataReferenciaParcial,
    fracaoAnoParcial: dataReferenciaParcial ? fracaoAno(dataReferenciaParcial) : null,
  };
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

export interface TransporteExecucaoData {
  geradoEm: string;
  resumo: {
    a2025: MetricSet & { numEmpenhos: number };
    a2026: MetricSet & { numEmpenhos: number };
  };
  limite: {
    baseReceita2026: number; // total empenhado 2026
    minimo2026: number; // meta sugerida de execução (80% do empenhado)
    percentualMinimo: number; // 80
    aplicadoLiquidado2026: number; // liquidado
    percentualAplicado2026: number; // taxa de execução: liquidado / empenhado
    atingiu: boolean; // taxa >= 80%
    folgaValor: number; // empenhado - liquidado (quanto falta liquidar)
  };
  porFonte: ComparativoFonte[];
  porFuncao: ComparativoFuncao[];
  manutencao: ManutencaoData & { frotaPadrao: number };
}

function variacao(base: number, atual: number): number | null {
  if (base === 0) return null;
  return ((atual - base) / Math.abs(base)) * 100;
}

let cache: TransporteExecucaoData | null = null;

export function getTransporteExecucao(force = false): TransporteExecucaoData {
  if (cache && !force) return cache;

  const a2025 = aggregateYear("ex-orc-transporte2025.csv");
  const a2026 = aggregateYear("ex-orc-transporte2026.csv");

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

  const empenhadoTotal = a2026.total.empenhado;
  const aplicadoTotal = a2026.total.liquidado;
  const percAplicado = empenhadoTotal > 0 ? (aplicadoTotal / empenhadoTotal) * 100 : 0;

  const manutencaoBase = parseManutencao("relatorio-desp-manutencao-veiculos.csv");

  cache = {
    geradoEm: new Date().toISOString(),
    resumo: {
      a2025: { ...a2025.total, numEmpenhos: a2025.numEmpenhos },
      a2026: { ...a2026.total, numEmpenhos: a2026.numEmpenhos },
    },
    limite: {
      baseReceita2026: empenhadoTotal,
      minimo2026: empenhadoTotal * 0.8, // meta sugerida de 80% de execução
      percentualMinimo: 80,
      aplicadoLiquidado2026: aplicadoTotal,
      percentualAplicado2026: percAplicado,
      atingiu: percAplicado >= 80,
      folgaValor: empenhadoTotal - aplicadoTotal, // quanto falta liquidar do empenhado
    },
    porFonte,
    porFuncao,
    manutencao: { ...manutencaoBase, frotaPadrao: FROTA_PADRAO },
  };
  return cache;
}
