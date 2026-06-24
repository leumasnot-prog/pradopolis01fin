"use client";

// Execução do Orçamento do Departamento de Transportes e Trânsito.
// Tela dedicada ao setor: taxa de execução (meta sugerida de 80%), comparativo
// anual 2025 × 2026 por fonte de recurso e por função/subfunção, contratos fixos
// do setor e — o destaque — a análise da MANUTENÇÃO DA FROTA MUNICIPAL: série
// histórica do gasto (serviços + material/peças) e o custo médio por veículo,
// recalculado ao vivo a partir de uma caixa de frota personalizável (padrão 112).

import { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Truck,
  Bus,
  Car,
  Wrench,
  Fuel,
  Gauge,
  DollarSign,
  CircleDollarSign,
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
  FileDown,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import despesasFixasDataRaw from "@/data/despesas_fixas_data.json";
import { formatBRL, formatPercent } from "@/lib/format";
import { StatCard, SectionHeader, Card, StatusBadge, AnimatedNumber } from "@/components/ui/primitives";

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
interface ManutencaoAno {
  ano: number;
  servicos: number;
  material: number;
  total: number;
  combustivel: number;
  parcial: boolean;
}
interface TransporteExecucaoData {
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
  manutencao: {
    porAno: ManutencaoAno[];
    ultimoAnoFechado: number | null;
    dataReferenciaParcial: string | null;
    fracaoAnoParcial: number | null;
    frotaPadrao: number;
  };
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

const SETOR_TRANSPORTE = "DEPARTAMENTO MUNICIPAL DE TRANSPORTES E TRÂNSITO";
const DEFAULT_FROTA = 112;
const FROTA_STORAGE_KEY = "pradopolis:frota-municipal";

const COLORS = {
  brand: "#1B3A6B",
  servicos: "#1B3A6B",
  material: "#0D9488",
  combustivel: "#D97706",
  perVeiculo: "#7C3AED",
  pos: "#1F7A4D",
  neg: "#B3261E",
  warn: "#9A6700",
  grid: "#E2E8F0",
  axis: "#475467",
  axisMuted: "#8A94A6",
};

const TOOLTIP_STYLE = {
  borderRadius: "12px",
  fontSize: "11px",
  border: "1px solid #E2E8F0",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(4px)",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  color: "#101826",
  fontFamily: "var(--font-mono)",
} as const;

type Metric = "empenhado" | "liquidado" | "pago";
type GroupMode = "fonte" | "funcao";

/**
 * Tooltip da série histórica da frota. Ordem fixa pedida pelo gestor:
 * ano → combustível → material/peças → serviços → total do ano → média por veículo.
 */
function FrotaTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const Linha = ({ cor, nome, valor }: { cor: string; nome: string; valor: number }) => (
    <div className="flex items-center justify-between gap-8">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />
        {nome}
      </span>
      <span className="font-mono tabular text-xs text-ink">{formatBRL(valor)}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-line bg-surface/95 backdrop-blur-sm shadow-lg px-3.5 py-3 min-w-[230px]">
      <div className="pb-2 mb-2 border-b border-line">
        <span className="font-display text-sm font-bold text-ink tracking-tight">{label}</span>
        {row.parcial && (
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-warn">· parcial</span>
        )}
      </div>

      <div className="space-y-1.5">
        <Linha cor={COLORS.combustivel} nome="Combustível" valor={row["Combustível"]} />
        <Linha cor={COLORS.material} nome="Material / Peças" valor={row["Material/Peças"]} />
        <Linha cor={COLORS.servicos} nome="Serviços" valor={row["Serviços"]} />
      </div>

      <div className="my-2 border-t border-line" />
      <div className="flex items-center justify-between gap-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">Gasto total no ano</span>
        <span className="font-mono tabular text-sm font-bold text-ink">{formatBRL(row.totalGeral)}</span>
      </div>

      <div className="my-2 border-t border-line" />
      <div className="flex items-center justify-between gap-8">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: COLORS.perVeiculo }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.perVeiculo }} />
          Média por veículo
        </span>
        <span className="font-mono tabular text-sm font-bold" style={{ color: COLORS.perVeiculo }}>
          {formatBRL(row["R$/veículo"])}
        </span>
      </div>
    </div>
  );
}

export function ExecucaoTransporte() {
  const prefersReducedMotion = useReducedMotion();

  const [data, setData] = useState<TransporteExecucaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/transporte/execucao")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar dados");
        return r.json();
      })
      .then((d: TransporteExecucaoData) => {
        if (active) {
          setData(d);
          setError("");
        }
      })
      .catch(() => active && setError("Não foi possível processar os relatórios de execução dos Transportes."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // ── Frota municipal (caixa personalizável, persistida no navegador) ──
  const [frota, setFrota] = useState<number>(DEFAULT_FROTA);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FROTA_STORAGE_KEY);
      if (saved) {
        const n = parseInt(saved, 10);
        if (Number.isFinite(n) && n > 0) setFrota(n);
      }
    } catch {
      /* localStorage indisponível — mantém o padrão */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(FROTA_STORAGE_KEY, String(frota));
    } catch {
      /* ignore */
    }
  }, [frota]);

  const frotaValida = frota > 0 ? frota : DEFAULT_FROTA;

  // ── Estado da tabela comparativa ──
  const [groupMode, setGroupMode] = useState<GroupMode>("fonte");
  const [search, setSearch] = useState("");

  // ── Estado da tabela de contratos ──
  const [contractSearch, setContractSearch] = useState("");
  const [contractPage, setContractPage] = useState(1);
  const contractsPerPage = 8;

  // Contratos do Departamento Municipal de Transportes e Trânsito
  const transporteContracts = useMemo(() => {
    return despesasFixasData.contratos
      .filter((c) => c.setor === SETOR_TRANSPORTE)
      .sort((a, b) => b.valor_anual - a.valor_anual);
  }, []);

  const filteredContracts = useMemo(() => {
    const q = contractSearch.toLowerCase();
    return transporteContracts.filter(
      (c) =>
        c.fornecedor.toLowerCase().includes(q) ||
        c.historico.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        c.empenho.toLowerCase().includes(q),
    );
  }, [transporteContracts, contractSearch]);

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

  // ── Manutenção da frota: derivações (recalculadas ao vivo com a frota) ──
  const manutencao = data?.manutencao;

  const ultimoFechado = useMemo(() => {
    if (!manutencao) return null;
    if (manutencao.ultimoAnoFechado != null) {
      return manutencao.porAno.find((a) => a.ano === manutencao.ultimoAnoFechado) ?? null;
    }
    return manutencao.porAno.filter((a) => !a.parcial).slice(-1)[0] ?? null;
  }, [manutencao]);

  const anoParcial = useMemo(() => {
    if (!manutencao) return null;
    return manutencao.porAno.find((a) => a.parcial) ?? null;
  }, [manutencao]);

  const manutencaoChartData = useMemo(() => {
    if (!manutencao) return [];
    return manutencao.porAno.map((a) => {
      const totalGeral = a.total + a.combustivel;
      return {
        ano: String(a.ano),
        Serviços: a.servicos,
        "Material/Peças": a.material,
        Combustível: a.combustivel,
        total: a.total,
        totalGeral,
        "R$/veículo": totalGeral / frotaValida,
        parcial: a.parcial,
      };
    });
  }, [manutencao, frotaValida]);

  const composicaoData = useMemo(() => {
    if (!ultimoFechado) return [];
    return [
      { name: "Serviços", value: ultimoFechado.servicos, color: COLORS.servicos },
      { name: "Material / Peças", value: ultimoFechado.material, color: COLORS.material },
      { name: "Combustível", value: ultimoFechado.combustivel, color: COLORS.combustivel },
    ];
  }, [ultimoFechado]);

  // Custo operacional por veículo (manutenção + combustível, último exercício fechado)
  const manutencaoUltimoFechado = ultimoFechado ? ultimoFechado.total : 0;
  const combustivelUltimoFechado = ultimoFechado ? ultimoFechado.combustivel : 0;
  const totalOperacionalAno = manutencaoUltimoFechado + combustivelUltimoFechado;
  const custoVeiculoAno = totalOperacionalAno / frotaValida;
  const custoVeiculoMes = custoVeiculoAno / 12;

  // Projeção anualizada do exercício parcial (ex.: 2026 até a data de referência)
  const totalParcialYTD = anoParcial ? anoParcial.total + anoParcial.combustivel : 0;
  const projecaoParcial =
    anoParcial && manutencao?.fracaoAnoParcial
      ? totalParcialYTD / manutencao.fracaoAnoParcial
      : null;
  const custoVeiculoParcialYTD = totalParcialYTD / frotaValida;
  const custoVeiculoProjetado = projecaoParcial ? projecaoParcial / frotaValida : null;

  // ── Variantes de animação ──
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  } as const;
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 28 } },
  } as const;

  // ── Loading / erro ──
  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-ink-2">
          <RefreshCw className="w-7 h-7 animate-spin text-brand" />
          <span className="text-sm font-semibold">Processando relatórios de execução dos Transportes…</span>
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

  const ringFraction = limite.baseReceita2026 > 0 ? Math.min(limite.aplicadoLiquidado2026 / limite.baseReceita2026, 1) : 0;
  const RING_LEN = 477.5;

  const pagedContracts = filteredContracts; // paginação aplicada por classe (print mostra tudo)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-16 space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <SectionHeader
          title="Execução do Orçamento — Transportes e Trânsito"
          subtitle="Acompanhamento orçamentário do setor, comparativo anual da execução (2025 × 2026) e o custo de manutenção da frota municipal"
          badge={
            <StatusBadge tone={limite.atingiu ? "healthy" : "attention"}>
              <span className="flex items-center gap-1">
                {limite.atingiu ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {formatPercent(limite.percentualAplicado2026)} {limite.atingiu ? "· META ATINGIDA" : "· ABAIXO DA META"}
              </span>
            </StatusBadge>
          }
        />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-line hover:border-brand/40 text-ink-2 hover:text-brand bg-surface py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm shrink-0 self-start md:self-center print:hidden hover:bg-surface-2"
        >
          <FileDown className="w-4 h-4" />
          <span>Exportar PDF</span>
        </button>
      </motion.div>

      {/* KPIs com contadores animados */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          title="Empenhado · 2026"
          value={<AnimatedNumber value={resumo.a2026.empenhado} />}
          subtitle={`${resumo.a2026.numEmpenhos.toLocaleString("pt-BR")} empenhos alocados`}
          icon={TrendingUp}
          iconBgClass="bg-warn-50/80 border border-warn-200/50 shadow-sm"
          iconColorClass="text-warn font-semibold"
        />
        <StatCard
          title="Liquidado · 2026"
          value={<AnimatedNumber value={resumo.a2026.liquidado} />}
          subtitle="Serviços prestados e atestados"
          icon={CheckCircle2}
          iconBgClass="bg-pos-50/80 border border-pos-200/50 shadow-sm"
          iconColorClass="text-pos"
        />
        <StatCard
          title="Pago · 2026"
          value={<AnimatedNumber value={resumo.a2026.pago} />}
          subtitle="Desembolso financeiro real"
          icon={DollarSign}
          iconBgClass="bg-brand-50/80 border border-brand-200/50 shadow-sm"
          iconColorClass="text-brand"
        />
        <StatCard
          title="Taxa de Execução"
          value={<AnimatedNumber value={limite.percentualAplicado2026} type="percent" />}
          subtitle={`Meta sugerida do setor: ${formatPercent(limite.percentualMinimo)}`}
          icon={ShieldCheck}
          iconBgClass={limite.atingiu ? "bg-pos-50/80 border border-pos-200/50 shadow-sm" : "bg-warn-50/80 border border-warn-200/50 shadow-sm"}
          iconColorClass={limite.atingiu ? "text-pos" : "text-warn"}
          valueColorClass={limite.atingiu ? "text-pos" : "text-warn"}
        />
        <StatCard
          title="Variação Liquidado"
          value={
            variacaoLiquidadoGeral == null ? (
              "—"
            ) : (
              <span className={variacaoLiquidadoGeral >= 0 ? "text-pos" : "text-neg"}>
                {variacaoLiquidadoGeral >= 0 ? "+" : ""}
                <AnimatedNumber value={variacaoLiquidadoGeral} type="percent" />
              </span>
            )
          }
          subtitle="2026 vs 2025 (mesmo período)"
          icon={variacaoLiquidadoGeral != null && variacaoLiquidadoGeral < 0 ? TrendingDown : TrendingUp}
          iconBgClass="bg-surface-2 border border-line shadow-sm"
          iconColorClass="text-ink-2"
        />
      </motion.div>

      {/* Charts grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:grid-cols-12 print:gap-4">
        {/* Gauge: Eficiência de Execução */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[390px] shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 print:col-span-4 print:break-inside-avoid">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-brand/5 to-transparent rounded-full blur-xl pointer-events-none" />

          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
              Eficiência de Execução · 2026
            </span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Liquidação Orçamentária</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">
              Percentual do orçamento empenhado que já foi liquidado e atestado
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-4 relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="gaugeGradientTransporte" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={limite.atingiu ? "#34D399" : "#FBBF24"} />
                    <stop offset="100%" stopColor={limite.atingiu ? "#059669" : "#D97706"} />
                  </linearGradient>
                </defs>
                <circle cx="88" cy="88" r="76" className="stroke-line" strokeWidth="13" fill="transparent" />
                <motion.circle
                  cx="88"
                  cy="88"
                  r="76"
                  stroke="url(#gaugeGradientTransporte)"
                  strokeWidth="13"
                  fill="transparent"
                  strokeDasharray={RING_LEN}
                  initial={{ strokeDashoffset: prefersReducedMotion ? RING_LEN - RING_LEN * ringFraction : RING_LEN }}
                  animate={{ strokeDashoffset: RING_LEN - RING_LEN * ringFraction }}
                  transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-mono tabular text-3xl font-bold text-ink tracking-tight">
                  <AnimatedNumber value={limite.percentualAplicado2026} type="percent" />
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.12em] mt-1.5 ${
                    limite.atingiu ? "text-pos" : "text-warn"
                  }`}
                >
                  {limite.atingiu ? "Meta atingida" : "Abaixo da meta"}
                </span>
                <span className="text-[10px] font-semibold text-muted mt-0.5">sugerido 80%</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-2 rounded-lg p-4 border border-line text-center space-y-1 mt-2">
            <span className="text-xs font-medium text-ink-2 block">
              Liquidado{" "}
              <strong className="font-mono tabular text-ink">{formatBRL(limite.aplicadoLiquidado2026)}</strong> de uma base
              empenhada de <strong className="font-mono tabular text-ink">{formatBRL(limite.baseReceita2026)}</strong>.
            </span>
            <span className="text-[11px] font-medium text-muted block">
              Meta de 80%: <strong className="font-mono tabular text-brand">{formatBRL(limite.minimo2026)}</strong>
              {" · "}
              {limite.folgaValor >= 0 ? "Faltam liquidar " : "Meta superada por "}
              <strong className={`font-mono tabular ${limite.folgaValor >= 0 ? "text-warn" : "text-pos"}`}>
                {formatBRL(Math.abs(limite.folgaValor))}
              </strong>
            </span>
          </div>
        </Card>

        {/* Comparativo 2025 x 2026 */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[390px] shadow-sm hover:shadow-md transition-all duration-300 print:col-span-4 print:break-inside-avoid">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
              Comparativo · até o mês fechado
            </span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Execução 2025 × 2026</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Empenhado, liquidado e pago no mesmo período</p>
          </div>

          <div className="w-full h-64 mt-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoBarData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} barGap={4}>
                <defs>
                  <linearGradient id="gradient2025T" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A8B3C4" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#D7DCE3" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="gradient2026T" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B3A6B" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#102A43" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                <XAxis dataKey="name" tick={{ fill: COLORS.axis, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: COLORS.axisMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)} mil`}
                  width={70}
                />
                <Tooltip formatter={(v: any, n: any) => [formatBRL(Number(v)), n]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(27,58,107,0.04)" }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600, marginTop: 8 }} />
                <Bar dataKey="2025" fill="url(#gradient2025T)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                <Bar dataKey="2026" fill="url(#gradient2026T)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top subfunções */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[390px] shadow-sm hover:shadow-md transition-all duration-300 print:col-span-4 print:break-inside-avoid">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">Liquidado · 2026</span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Principais Subfunções</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Maiores volumes liquidados por subfunção</p>
          </div>

          <div className="w-full h-64 mt-4">
            {topSubfuncoes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSubfuncoes} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradientLiqTransporte" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                  <XAxis
                    type="number"
                    tick={{ fill: COLORS.axisMuted, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)} mil`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fill: COLORS.axis, fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip formatter={(v: any) => [formatBRL(Number(v)), "Liquidado"]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(31,122,77,0.04)" }} />
                  <Bar dataKey="Liquidado" fill="url(#gradientLiqTransporte)" radius={[0, 4, 4, 0]} barSize={14} />
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
      </motion.div>

      {/* ───────────────────────── MANUTENÇÃO DA FROTA MUNICIPAL ───────────────────────── */}
      {manutencao && manutencao.porAno.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Cabeçalho da seção + caixa de frota personalizável */}
          <Card className="p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-gradient-to-br from-warn/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn-50/80 text-warn border border-warn-200/50 shadow-sm shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-ink tracking-tight">Custo Operacional da Frota Municipal</h3>
                  <p className="text-xs font-medium text-ink-2 mt-0.5 max-w-xl">
                    Gasto consolidado de <strong>toda a frota municipal</strong> (todos os setores) com{" "}
                    <strong>manutenção</strong> (serviços + peças) e <strong>combustível</strong>.
                  </p>
                </div>
              </div>

              {/* Caixa personalizável de tamanho da frota */}
              <div className="flex flex-col gap-2 shrink-0 print:hidden">
                <span className="text-[10px] font-bold text-muted uppercase tracking-[0.12em] flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Frota municipal (veículos)
                </span>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-xl border border-line bg-surface shadow-inner overflow-hidden">
                    <button
                      onClick={() => setFrota((n) => Math.max(1, n - 1))}
                      className="flex h-11 w-11 items-center justify-center text-ink-2 hover:text-brand hover:bg-surface-2 transition-colors cursor-pointer"
                      aria-label="Diminuir frota"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={frota}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setFrota(Number.isFinite(n) ? Math.max(0, n) : 0);
                      }}
                      className="w-20 h-11 text-center font-mono tabular text-xl font-bold text-brand bg-transparent border-x border-line focus:outline-none focus:bg-brand-50/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="Quantidade de veículos da frota"
                    />
                    <button
                      onClick={() => setFrota((n) => n + 1)}
                      className="flex h-11 w-11 items-center justify-center text-ink-2 hover:text-brand hover:bg-surface-2 transition-colors cursor-pointer"
                      aria-label="Aumentar frota"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {frota !== DEFAULT_FROTA && (
                    <button
                      onClick={() => setFrota(DEFAULT_FROTA)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-muted hover:text-brand transition-colors cursor-pointer"
                      aria-label="Restaurar padrão"
                      title={`Restaurar padrão (${DEFAULT_FROTA})`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      padrão {DEFAULT_FROTA}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Banner-resumo do custo operacional por veículo */}
            {ultimoFechado && (
              <div className="mt-5 rounded-xl border border-brand/15 bg-gradient-to-r from-brand-50/60 to-transparent p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <Car className="w-5 h-5 text-brand shrink-0" />
                <p className="text-sm font-medium text-ink-2 leading-relaxed">
                  Somando <strong>manutenção e combustível</strong>, cada um dos{" "}
                  <strong className="font-mono tabular text-brand">{frotaValida}</strong> veículos custou em média{" "}
                  <strong className="font-mono tabular text-ink">{formatBRL(custoVeiculoAno)}</strong> em{" "}
                  <strong>{ultimoFechado.ano}</strong> — equivalente a{" "}
                  <strong className="font-mono tabular text-ink">{formatBRL(custoVeiculoMes)}</strong> por veículo ao mês.
                </p>
              </div>
            )}
          </Card>

          {/* KPIs de custo da frota (recalculados ao vivo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
            <StatCard
              title={`Manutenção · ${ultimoFechado?.ano ?? "—"}`}
              value={<AnimatedNumber value={manutencaoUltimoFechado} />}
              subtitle="Serviços + peças (último ano fechado)"
              icon={Wrench}
              iconBgClass="bg-warn-50/80 border border-warn-200/50 shadow-sm"
              iconColorClass="text-warn"
            />
            <StatCard
              title={`Combustível · ${ultimoFechado?.ano ?? "—"}`}
              value={<AnimatedNumber value={combustivelUltimoFechado} />}
              subtitle="Abastecimento da frota (último ano fechado)"
              icon={Fuel}
              iconBgClass="bg-warn-50/80 border border-warn-200/50 shadow-sm"
              iconColorClass="text-warn"
            />
            <StatCard
              title="Custo total / veículo · ano"
              value={<AnimatedNumber value={custoVeiculoAno} />}
              subtitle={`Manutenção + combustível · ${frotaValida} veículos`}
              icon={Car}
              iconBgClass="bg-brand-50/80 border border-brand-200/50 shadow-sm"
              iconColorClass="text-brand"
              valueColorClass="text-brand"
            />
            <StatCard
              title="Custo total / veículo · mês"
              value={<AnimatedNumber value={custoVeiculoMes} />}
              subtitle="Custo anual dividido por 12"
              icon={CircleDollarSign}
              iconBgClass="bg-pos-50/80 border border-pos-200/50 shadow-sm"
              iconColorClass="text-pos"
            />
            {anoParcial ? (
              <StatCard
                title={`Projeção / veículo · ${anoParcial.ano}`}
                value={custoVeiculoProjetado != null ? <AnimatedNumber value={custoVeiculoProjetado} /> : "—"}
                subtitle={
                  manutencao.dataReferenciaParcial
                    ? `Anualizado · ${formatBRL(custoVeiculoParcialYTD)} até ${manutencao.dataReferenciaParcial}`
                    : "Estimativa anualizada"
                }
                icon={Gauge}
                iconBgClass="bg-surface-2 border border-line shadow-sm"
                iconColorClass="text-ink-2"
              />
            ) : (
              <StatCard
                title="Frota considerada"
                value={`${frotaValida} veículos`}
                subtitle="Ajuste a caixa acima para recalcular"
                icon={Bus}
                iconBgClass="bg-surface-2 border border-line shadow-sm"
                iconColorClass="text-ink-2"
              />
            )}
          </div>

          {/* Gráficos de manutenção */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Evolução anual: barras empilhadas + linha R$/veículo */}
            <Card className="lg:col-span-8 p-6 shadow-sm hover:shadow-md transition-all duration-300 print:break-inside-avoid">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
                    Série histórica
                  </span>
                  <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">
                    Custo da Frota × Custo por Veículo
                  </h4>
                  <p className="text-xs font-medium text-ink-2 mt-0.5">
                    Barras: manutenção + combustível. Linha: custo total por veículo (frota de {frotaValida})
                  </p>
                </div>
              </div>

              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={manutencaoChartData} margin={{ top: 10, right: 12, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradServicos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.servicos} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={COLORS.servicos} stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="gradMaterial" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.material} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={COLORS.material} stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="gradCombustivel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.combustivel} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={COLORS.combustivel} stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="ano" tick={{ fill: COLORS.axis, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: COLORS.axisMuted, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`
                          : `R$ ${(v / 1000).toFixed(0)}k`
                      }
                      width={62}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: COLORS.perVeiculo, fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`}
                      width={58}
                    />
                    <Tooltip content={<FrotaTooltip />} cursor={{ fill: "rgba(27,58,107,0.04)" }} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600, marginTop: 8 }} />
                    <Bar yAxisId="left" dataKey="Serviços" stackId="m" fill="url(#gradServicos)" radius={[0, 0, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                    <Bar yAxisId="left" dataKey="Material/Peças" stackId="m" fill="url(#gradMaterial)" radius={[0, 0, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                    <Bar yAxisId="left" dataKey="Combustível" stackId="m" fill="url(#gradCombustivel)" radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="R$/veículo"
                      stroke={COLORS.perVeiculo}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: COLORS.perVeiculo, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={!prefersReducedMotion}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {anoParcial && (
                <p className="text-[10px] font-medium text-muted mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-warn" />
                  {anoParcial.ano} é exercício parcial
                  {manutencao.dataReferenciaParcial ? ` (até ${manutencao.dataReferenciaParcial})` : ""} — não comparável a anos fechados.
                  {custoVeiculoProjetado != null && (
                    <span>
                      {" "}No ritmo atual, projeção de{" "}
                      <strong className="text-ink-2 font-mono tabular">{formatBRL(custoVeiculoProjetado)}</strong>/veículo no ano.
                    </span>
                  )}
                </p>
              )}
            </Card>

            {/* Composição do último ano fechado (donut) */}
            <Card className="lg:col-span-4 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col print:break-inside-avoid">
              <div>
                <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">
                  Composição · {ultimoFechado?.ano ?? "—"}
                </span>
                <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Manutenção × Combustível</h4>
                <p className="text-xs font-medium text-ink-2 mt-0.5">Onde o dinheiro da frota é gasto</p>
              </div>

              <div className="w-full h-52 mt-2 relative">
                {composicaoData.length > 0 && ultimoFechado ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={composicaoData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="none"
                          isAnimationActive={!prefersReducedMotion}
                        >
                          {composicaoData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any, n: any) => [formatBRL(Number(v)), n]} contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.1em]">Total</span>
                      <span className="font-mono tabular text-sm font-bold text-ink">{formatBRL(totalOperacionalAno)}</span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted">
                    <Inbox className="w-7 h-7" />
                    <span className="text-xs font-semibold">Sem dados</span>
                  </div>
                )}
              </div>

              <div className="mt-auto space-y-2 pt-3">
                {composicaoData.map((c) => {
                  const pct = totalOperacionalAno > 0 ? (c.value / totalOperacionalAno) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-ink-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-mono tabular font-semibold text-ink">
                        {formatBRL(c.value)} <span className="text-muted font-medium">· {formatPercent(pct)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Tabela comparativa alternável */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink-2 border border-line shadow-inner">
                <Bus className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="font-display text-lg font-bold text-ink tracking-tight">Comparativo de Execução — 2025 × 2026</h4>
                <p className="text-xs font-medium text-ink-2">
                  Agrupado por {groupMode === "fonte" ? "fonte de recurso" : "função / subfunção"} ·{" "}
                  <span className="font-mono tabular text-brand font-bold">{comparativoRows.length}</span> linhas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-line bg-surface p-1 shadow-inner">
                {(["fonte", "funcao"] as GroupMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGroupMode(mode)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      groupMode === mode ? "bg-brand text-white shadow-sm" : "text-ink-2 hover:text-ink"
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
                  className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus:border-brand transition-colors shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
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
                    <tr key={r.key} className="hover:bg-surface-2/70 transition-colors">
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
                      <td className="py-3 px-4 text-right font-mono tabular text-sm text-ink">{formatBRL(r.a2026.empenhado)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                        {formatBRL(r.a2025.liquidado)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold text-ink">
                        {formatBRL(r.a2026.liquidado)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                        {formatBRL(r.a2025.pago)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular text-sm text-ink">{formatBRL(r.a2026.pago)}</td>
                      <td className="py-3 px-4 text-right border-l border-line/60">
                        {r.varLiquidado == null ? (
                          <span className="text-[10px] font-semibold text-muted bg-surface-2 border border-line px-1.5 py-0.5 rounded-md">novo</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-0.5 font-mono tabular text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                              r.varLiquidado >= 0 ? "text-pos bg-pos-50/50" : "text-neg bg-neg-50/50"
                            }`}
                          >
                            {r.varLiquidado >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
                    <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold">
                      {formatBRL(comparativoTotals.a2026.empenhado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                      {formatBRL(comparativoTotals.a2025.liquidado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold">
                      {formatBRL(comparativoTotals.a2026.liquidado)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted border-l border-line/60">
                      {formatBRL(comparativoTotals.a2025.pago)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold">
                      {formatBRL(comparativoTotals.a2026.pago)}
                    </td>
                    <td className="py-3 px-4 border-l border-line/60" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Contratos e despesas fixas dos Transportes */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink-2 border border-line shadow-inner">
                <FileText className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="font-display text-lg font-bold text-ink tracking-tight">
                  Contratos e Despesas Fixas — Transportes e Trânsito
                </h4>
                <p className="text-xs font-medium text-ink-2">
                  Departamento Municipal de Transportes e Trânsito ·{" "}
                  <span className="font-mono tabular text-brand font-bold">{filteredContracts.length}</span> registros
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
                className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus:border-brand transition-colors shadow-sm"
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

          <div className="overflow-x-auto rounded-lg border border-line bg-surface mb-4 shadow-sm">
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
                {pagedContracts.map((c, index) => {
                  const isPaged = index >= (contractPage - 1) * contractsPerPage && index < contractPage * contractsPerPage;
                  return (
                    <tr
                      key={`${c.empenho}-${c.fornecedor}-${index}`}
                      className={`hover:bg-surface-2/70 transition-colors ${isPaged ? "" : "hidden print-show-all-rows"}`}
                    >
                      <td className="py-3 px-4 font-mono tabular font-semibold text-xs text-ink-2">
                        <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line">{c.empenho}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-ink line-clamp-1">{c.fornecedor}</span>
                          <span className="text-[10px] font-medium text-muted mt-0.5 line-clamp-1">{c.historico}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em]">{c.categoria}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular font-medium text-sm text-ink">{formatBRL(c.valor_mensal)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular font-semibold text-sm text-ink">{formatBRL(c.valor_anual)}</td>
                    </tr>
                  );
                })}
                {filteredContracts.length === 0 && (
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
            <div className="flex items-center justify-between px-2 pt-2 print:hidden">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.06em]">
                Página <span className="font-mono tabular">{contractPage}</span> de{" "}
                <span className="font-mono tabular">{contractTotalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={contractPage === 1}
                  onClick={() => setContractPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                  className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 cursor-pointer"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <button
                  disabled={contractPage === contractTotalPages}
                  onClick={() => setContractPage((p) => Math.min(contractTotalPages, p + 1))}
                  aria-label="Próxima página"
                  className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 cursor-pointer"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
