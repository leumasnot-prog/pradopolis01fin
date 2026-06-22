"use client";

// Execução do Orçamento da Saúde.
// Tela dedicada ao setor da Saúde: cumprimento do piso constitucional de 15%,
// comparativo anual de execução (2025 × 2026, até o mês fechado) por fonte de
// recurso e por função/subfunção, e os contratos/despesas fixas do
// Departamento Municipal de Saúde (incluindo o convênio INGESP Innovare).

import { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  XCircle,
  Inbox,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import despesasFixasDataRaw from "@/data/despesas_fixas_data.json";
import { formatBRL, formatPercent } from "@/lib/format";
import { StatCard, SectionHeader, Card, StatusBadge } from "@/components/ui/primitives";

// ── Tipos do payload da API ────────────────────────────────────────────────
interface MetricSet {
  empenhado: number;
  liquidado: number;
  pago: number;
}
interface ComparativoFonte {
  fonte: string;
  grupo: string;
  a2025: MetricSet;
  a2026: MetricSet;
  varLiquidado: number | null;
}
interface ComparativoFuncao {
  funcao: string;
  subfuncao: string;
  a2025: MetricSet;
  a2026: MetricSet;
  varLiquidado: number | null;
}
interface SaudeExecucaoData {
  resumo: {
    a2025: MetricSet & { numEmpenhos: number };
    a2026: MetricSet & { numEmpenhos: number };
  };
  limite: {
    baseReceita2026: number;
    minimo2026: number;
    percentualMinimo: number;
    aplicadoLiquidado2026: number;
    percentualAplicado2026: number;
    atingiu: boolean;
    folgaValor: number;
  };
  porFonte: ComparativoFonte[];
  porFuncao: ComparativoFuncao[];
}

interface Contrato {
  empenho: string;
  contrato: string;
  fornecedor: string;
  historico: string;
  setor: string;
  categoria: string;
  ficha: string;
  valor_anual: number;
  valor_mensal: number;
  cronograma: number[];
}

const despesasFixasData = despesasFixasDataRaw as { contratos: Contrato[] };

const SETOR_SAUDE = "DEPARTAMENTO MUNICIPAL DE SAÚDE";

// Convênio permanente — informado manualmente (não consta no relatório de empenhos).
const CONTRATO_INGESP: Contrato = {
  empenho: "—",
  contrato: "Convênio INGESP",
  fornecedor: "INGESP INNOVARE",
  historico:
    "Pagamento permanente de convênio e prestação de serviços com valor fixado em R$ 500.000,00 mensais.",
  setor: SETOR_SAUDE,
  categoria: "CONVÊNIO / PRESTAÇÃO DE SERVIÇOS",
  ficha: "—",
  valor_mensal: 500000,
  valor_anual: 6000000,
  cronograma: Array(12).fill(500000),
};

const COLORS = {
  brand: "#1B3A6B",
  pos: "#1F7A4D",
  neg: "#B3261E",
  warn: "#9A6700",
  grid: "#D7DCE3",
  axis: "#475467",
  axisMuted: "#8A94A6",
};

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  fontSize: "11px",
  border: "1px solid #D7DCE3",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 2px rgba(16,24,38,0.04)",
  color: "#101826",
  fontFamily: "var(--font-mono)",
} as const;

type Metric = "empenhado" | "liquidado" | "pago";
type GroupMode = "fonte" | "funcao";

export function ExecucaoSaude() {
  const prefersReducedMotion = useReducedMotion();

  const [data, setData] = useState<SaudeExecucaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/saude/execucao")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar dados");
        return r.json();
      })
      .then((d: SaudeExecucaoData) => {
        if (active) {
          setData(d);
          setError("");
        }
      })
      .catch(() => active && setError("Não foi possível processar os relatórios de execução da Saúde."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // ── Estado da tabela comparativa ──
  const [groupMode, setGroupMode] = useState<GroupMode>("fonte");
  const [search, setSearch] = useState("");

  // ── Estado da tabela de contratos ──
  const [contractSearch, setContractSearch] = useState("");
  const [contractPage, setContractPage] = useState(1);
  const contractsPerPage = 8;

  // Contratos do Departamento Municipal de Saúde + INGESP
  const healthContracts = useMemo(() => {
    const base = despesasFixasData.contratos.filter((c) => c.setor === SETOR_SAUDE);
    return [CONTRATO_INGESP, ...base].sort((a, b) => b.valor_anual - a.valor_anual);
  }, []);

  const filteredContracts = useMemo(() => {
    const q = contractSearch.toLowerCase();
    return healthContracts.filter(
      (c) =>
        c.fornecedor.toLowerCase().includes(q) ||
        c.historico.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        c.empenho.toLowerCase().includes(q),
    );
  }, [healthContracts, contractSearch]);

  const contractTotals = useMemo(
    () =>
      filteredContracts.reduce(
        (acc, c) => {
          acc.mensal += c.valor_mensal;
          acc.anual += c.valor_anual;
          return acc;
        },
        { mensal: 0, anual: 0 },
      ),
    [filteredContracts],
  );

  useEffect(() => setContractPage(1), [contractSearch]);
  const contractTotalPages = Math.ceil(filteredContracts.length / contractsPerPage) || 1;
  const pagedContracts = filteredContracts.slice(
    (contractPage - 1) * contractsPerPage,
    contractPage * contractsPerPage,
  );

  // ── Linhas da tabela comparativa ──
  const comparativoRows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    if (groupMode === "fonte") {
      return data.porFonte
        .filter((r) => r.fonte.toLowerCase().includes(q) || r.grupo.toLowerCase().includes(q))
        .map((r) => ({
          key: r.fonte,
          label: r.fonte,
          sub: r.grupo,
          a2025: r.a2025,
          a2026: r.a2026,
          varLiquidado: r.varLiquidado,
        }));
    }
    return data.porFuncao
      .filter((r) => r.funcao.toLowerCase().includes(q) || r.subfuncao.toLowerCase().includes(q))
      .map((r) => ({
        key: `${r.funcao}-${r.subfuncao}`,
        label: r.subfuncao,
        sub: r.funcao,
        a2025: r.a2025,
        a2026: r.a2026,
        varLiquidado: r.varLiquidado,
      }));
  }, [data, groupMode, search]);

  const comparativoTotals = useMemo(() => {
    return comparativoRows.reduce(
      (acc, r) => {
        (["empenhado", "liquidado", "pago"] as Metric[]).forEach((m) => {
          acc.a2025[m] += r.a2025[m];
          acc.a2026[m] += r.a2026[m];
        });
        return acc;
      },
      { a2025: { empenhado: 0, liquidado: 0, pago: 0 }, a2026: { empenhado: 0, liquidado: 0, pago: 0 } },
    );
  }, [comparativoRows]);

  // ── Dados dos gráficos ──
  const comparativoBarData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Empenhado", "2025": data.resumo.a2025.empenhado, "2026": data.resumo.a2026.empenhado },
      { name: "Liquidado", "2025": data.resumo.a2025.liquidado, "2026": data.resumo.a2026.liquidado },
      { name: "Pago", "2025": data.resumo.a2025.pago, "2026": data.resumo.a2026.pago },
    ];
  }, [data]);

  const topSubfuncoes = useMemo(() => {
    if (!data) return [];
    return data.porFuncao
      .slice()
      .sort((a, b) => b.a2026.liquidado - a.a2026.liquidado)
      .slice(0, 6)
      .map((r) => ({ name: r.subfuncao, Liquidado: r.a2026.liquidado }));
  }, [data]);

  // ── Loading / erro ──
  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-ink-2">
          <RefreshCw className="w-7 h-7 animate-spin text-brand" />
          <span className="text-sm font-semibold">Processando relatórios de execução da Saúde…</span>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-8 h-8 text-neg mx-auto" />
          <h2 className="font-display text-xl font-bold text-ink tracking-tight mt-3">Erro ao carregar</h2>
          <p className="text-ink-2 mt-1.5 text-sm">{error || "Dados indisponíveis."}</p>
        </div>
      </div>
    );
  }

  const { resumo, limite } = data;
  const variacaoLiquidadoGeral =
    resumo.a2025.liquidado > 0
      ? ((resumo.a2026.liquidado - resumo.a2025.liquidado) / resumo.a2025.liquidado) * 100
      : null;

  // Anel do gauge: cheio quando o aplicado atinge o piso de 15%.
  const ringFraction = limite.minimo2026 > 0 ? Math.min(limite.aplicadoLiquidado2026 / limite.minimo2026, 1) : 0;
  const RING_LEN = 477.5;

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-16">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          title="Execução do Orçamento — Saúde"
          subtitle="Cumprimento do piso constitucional de 15%, comparativo anual da execução (até o mês fechado) e contratos fixos do Departamento Municipal de Saúde"
          badge={
            <StatusBadge tone={limite.atingiu ? "healthy" : "critical"}>
              <span className="flex items-center gap-1">
                {limite.atingiu ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {formatPercent(limite.percentualAplicado2026)} {limite.atingiu ? "· LIMITE ATINGIDO" : "· ABAIXO DO PISO"}
              </span>
            </StatusBadge>
          }
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Empenhado · 2026"
          value={formatBRL(resumo.a2026.empenhado)}
          subtitle={`${resumo.a2026.numEmpenhos.toLocaleString("pt-BR")} empenhos (até mai/05)`}
          icon={TrendingUp}
          iconBgClass="bg-warn-50"
          iconColorClass="text-warn"
        />
        <StatCard
          title="Liquidado · 2026"
          value={formatBRL(resumo.a2026.liquidado)}
          subtitle="Serviços prestados e atestados"
          icon={CheckCircle2}
          iconBgClass="bg-pos-50"
          iconColorClass="text-pos"
        />
        <StatCard
          title="Pago · 2026"
          value={formatBRL(resumo.a2026.pago)}
          subtitle="Desembolso financeiro real"
          icon={DollarSign}
          iconBgClass="bg-brand-50"
          iconColorClass="text-brand"
        />
        <StatCard
          title="Aplicação em Saúde"
          value={formatPercent(limite.percentualAplicado2026)}
          subtitle={`Mínimo constitucional: ${formatPercent(limite.percentualMinimo)}`}
          icon={ShieldCheck}
          iconBgClass={limite.atingiu ? "bg-pos-50" : "bg-neg-50"}
          iconColorClass={limite.atingiu ? "text-pos" : "text-neg"}
          valueColorClass={limite.atingiu ? "text-pos" : "text-neg"}
        />
        <StatCard
          title="Variação Liquidado"
          value={
            variacaoLiquidadoGeral == null
              ? "—"
              : `${variacaoLiquidadoGeral >= 0 ? "+" : ""}${formatPercent(variacaoLiquidadoGeral)}`
          }
          subtitle="2026 vs 2025 (mesmo período)"
          icon={variacaoLiquidadoGeral != null && variacaoLiquidadoGeral < 0 ? TrendingDown : TrendingUp}
          iconBgClass="bg-surface-2"
          iconColorClass="text-ink-2"
          valueColorClass={
            variacaoLiquidadoGeral != null && variacaoLiquidadoGeral < 0 ? "text-neg" : "text-pos"
          }
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Gauge: piso constitucional */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
              Piso Constitucional · 2026
            </span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">
              Aplicação em Saúde (EC 29 / LC 141)
            </h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">
              Liquidado da função Saúde sobre a receita de impostos e transferências
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-4 relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="88" cy="88" r="76" className="stroke-line" strokeWidth="15" fill="transparent" />
                <motion.circle
                  cx="88"
                  cy="88"
                  r="76"
                  className={limite.atingiu ? "stroke-pos" : "stroke-neg"}
                  strokeWidth="15"
                  fill="transparent"
                  strokeDasharray={RING_LEN}
                  initial={{ strokeDashoffset: prefersReducedMotion ? RING_LEN - RING_LEN * ringFraction : RING_LEN }}
                  animate={{ strokeDashoffset: RING_LEN - RING_LEN * ringFraction }}
                  transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-mono tabular text-3xl font-bold text-ink tracking-tight">
                  {formatPercent(limite.percentualAplicado2026)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.12em] mt-1 ${
                    limite.atingiu ? "text-pos" : "text-neg"
                  }`}
                >
                  {limite.atingiu ? "Limite atingido" : "Abaixo do piso"}
                </span>
                <span className="text-[10px] font-semibold text-muted mt-0.5">mínimo 15%</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-2 rounded-lg p-4 border border-line text-center space-y-1">
            <span className="text-xs font-medium text-ink-2 block">
              Aplicado{" "}
              <strong className="font-mono tabular text-ink">{formatBRL(limite.aplicadoLiquidado2026)}</strong> de uma
              base de <strong className="font-mono tabular text-ink">{formatBRL(limite.baseReceita2026)}</strong>.
            </span>
            <span className="text-[11px] font-medium text-muted block">
              Piso de 15%: <strong className="font-mono tabular text-warn">{formatBRL(limite.minimo2026)}</strong>
              {" · "}
              {limite.folgaValor >= 0 ? "Acima do piso em " : "Faltam "}
              <strong className={`font-mono tabular ${limite.folgaValor >= 0 ? "text-pos" : "text-neg"}`}>
                {formatBRL(Math.abs(limite.folgaValor))}
              </strong>
            </span>
          </div>
        </Card>

        {/* Comparativo 2025 x 2026 */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
              Comparativo · até o mês fechado
            </span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Execução 2025 × 2026</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Empenhado, liquidado e pago no mesmo período</p>
          </div>
          <div className="w-full h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoBarData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: COLORS.axis, fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: COLORS.axisMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(1)}M`}
                  width={70}
                />
                <Tooltip
                  formatter={(v: any, n: any) => [formatBRL(Number(v)), n]}
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(27,58,107,0.06)" }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", fontWeight: 600, marginTop: 8 }} />
                <Bar dataKey="2025" fill={COLORS.axisMuted} radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                <Bar dataKey="2026" fill={COLORS.brand} radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top subfunções */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
              Liquidado · 2026
            </span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Principais Subfunções</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Maiores volumes liquidados por subfunção</p>
          </div>
          <div className="w-full h-64 mt-4">
            {topSubfuncoes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSubfuncoes} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                  <XAxis
                    type="number"
                    tick={{ fill: COLORS.axisMuted, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(1)}M`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: COLORS.axis, fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v: any) => [formatBRL(Number(v)), "Liquidado"]}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(27,58,107,0.06)" }}
                  />
                  <Bar dataKey="Liquidado" fill={COLORS.pos} radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted">
                <Inbox className="w-7 h-7" />
                <span className="text-xs font-semibold">Sem dados</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tabela comparativa alternável */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink-2 border border-line">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-ink tracking-tight">
                Comparativo de Execução — 2025 × 2026
              </h4>
              <p className="text-xs font-medium text-ink-2">
                Agrupado por {groupMode === "fonte" ? "fonte de recurso" : "função / subfunção"} ·{" "}
                <span className="font-mono tabular">{comparativoRows.length}</span> linhas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle de agrupamento */}
            <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
              {(["fonte", "funcao"] as GroupMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setGroupMode(mode)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    groupMode === mode ? "bg-brand text-white" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {mode === "fonte" ? "Por Fonte de Recurso" : "Por Função / Subfunção"}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={groupMode === "fonte" ? "Buscar fonte..." : "Buscar função/subfunção..."}
                className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus:border-brand transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-surface-2 border-b border-line text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">
                <th rowSpan={2} className="py-2.5 px-4 align-bottom">
                  {groupMode === "fonte" ? "Fonte de Recurso" : "Função / Subfunção"}
                </th>
                <th colSpan={2} className="py-2 px-4 text-center border-l border-line">Empenhado</th>
                <th colSpan={2} className="py-2 px-4 text-center border-l border-line">Liquidado</th>
                <th colSpan={2} className="py-2 px-4 text-center border-l border-line">Pago</th>
                <th rowSpan={2} className="py-2.5 px-4 text-right align-bottom border-l border-line">Δ Liq.</th>
              </tr>
              <tr className="bg-surface-2 border-b border-line text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                <th className="py-1.5 px-4 text-right border-l border-line">2025</th>
                <th className="py-1.5 px-4 text-right">2026</th>
                <th className="py-1.5 px-4 text-right border-l border-line">2025</th>
                <th className="py-1.5 px-4 text-right">2026</th>
                <th className="py-1.5 px-4 text-right border-l border-line">2025</th>
                <th className="py-1.5 px-4 text-right">2026</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {comparativoRows.length > 0 ? (
                comparativoRows.map((r) => (
                  <tr key={r.key} className="hover:bg-surface-2 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-ink line-clamp-1">{r.label}</span>
                        <span className="text-[10px] font-semibold text-muted tracking-[0.06em] uppercase mt-0.5 line-clamp-1">
                          {r.sub}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                      {formatBRL(r.a2025.empenhado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-sm text-ink">
                      {formatBRL(r.a2026.empenhado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                      {formatBRL(r.a2025.liquidado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold text-ink">
                      {formatBRL(r.a2026.liquidado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                      {formatBRL(r.a2025.pago)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-sm text-ink">
                      {formatBRL(r.a2026.pago)}
                    </td>
                    <td className="py-3 px-4 text-right border-l border-line/60">
                      {r.varLiquidado == null ? (
                        <span className="text-[10px] font-semibold text-muted">novo</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono tabular text-xs font-semibold ${
                            r.varLiquidado >= 0 ? "text-pos" : "text-neg"
                          }`}
                        >
                          {r.varLiquidado >= 0 ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          {formatPercent(Math.abs(r.varLiquidado))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted font-medium text-sm">
                    Nenhuma linha encontrada.
                  </td>
                </tr>
              )}
            </tbody>
            {comparativoRows.length > 0 && (
              <tfoot>
                <tr className="bg-surface-2 border-t-2 border-line-strong font-semibold text-ink">
                  <td className="py-3 px-4 text-[11px] font-bold uppercase text-ink-2 tracking-[0.06em]">Total</td>
                  <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                    {formatBRL(comparativoTotals.a2025.empenhado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {formatBRL(comparativoTotals.a2026.empenhado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                    {formatBRL(comparativoTotals.a2025.liquidado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {formatBRL(comparativoTotals.a2026.liquidado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                    {formatBRL(comparativoTotals.a2025.pago)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {formatBRL(comparativoTotals.a2026.pago)}
                  </td>
                  <td className="py-3 px-4 border-l border-line/60" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Contratos e despesas fixas da Saúde */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink-2 border border-line">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-ink tracking-tight">
                Contratos e Despesas Fixas — Saúde
              </h4>
              <p className="text-xs font-medium text-ink-2">
                Departamento Municipal de Saúde · inclui o convênio INGESP Innovare ·{" "}
                <span className="font-mono tabular">{filteredContracts.length}</span> registros
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
              placeholder="Buscar fornecedor, objeto..."
              className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus:border-brand transition-colors"
            />
            {contractSearch && (
              <button
                onClick={() => setContractSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink"
                aria-label="Limpar busca"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-line bg-surface mb-4">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-2 border-b border-line text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                <th className="py-3 px-4">Empenho</th>
                <th className="py-3 px-4">Fornecedor / Objeto</th>
                <th className="py-3 px-4">Tipo de Despesa</th>
                <th className="py-3 px-4 text-right">Valor Mensal</th>
                <th className="py-3 px-4 text-right">Valor Anual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pagedContracts.map((c) => {
                const isIngesp = c.fornecedor === CONTRATO_INGESP.fornecedor;
                return (
                  <tr
                    key={`${c.empenho}-${c.fornecedor}`}
                    className={`hover:bg-surface-2 transition-colors ${isIngesp ? "bg-pos-50/40" : ""}`}
                  >
                    <td className="py-3 px-4 font-mono tabular font-semibold text-xs text-ink-2">
                      <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line">
                        {c.empenho}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-ink line-clamp-1 flex items-center gap-1.5">
                          {isIngesp && <ShieldCheck className="w-3.5 h-3.5 text-pos shrink-0" />}
                          {c.fornecedor}
                        </span>
                        <span className="text-[10px] font-medium text-muted mt-0.5 line-clamp-1">{c.historico}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
                        {c.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular font-medium text-sm text-ink">
                      {formatBRL(c.valor_mensal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular font-semibold text-sm text-ink">
                      {formatBRL(c.valor_anual)}
                    </td>
                  </tr>
                );
              })}
              {pagedContracts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted font-medium text-sm">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredContracts.length > 0 && (
              <tfoot>
                <tr className="bg-surface-2 border-t-2 border-line-strong font-semibold text-ink">
                  <td colSpan={3} className="py-3 px-4 text-[11px] font-bold uppercase text-ink-2 tracking-[0.08em]">
                    Total ({filteredContracts.length})
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">{formatBRL(contractTotals.mensal)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">{formatBRL(contractTotals.anual)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {filteredContracts.length > contractsPerPage && (
          <div className="flex items-center justify-between px-2 pt-2">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.06em]">
              Página <span className="font-mono tabular">{contractPage}</span> de{" "}
              <span className="font-mono tabular">{contractTotalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={contractPage === 1}
                onClick={() => setContractPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <button
                disabled={contractPage === contractTotalPages}
                onClick={() => setContractPage((p) => Math.min(contractTotalPages, p + 1))}
                aria-label="Próxima página"
                className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
