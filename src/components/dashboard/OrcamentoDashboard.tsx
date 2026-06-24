"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import {
  Search,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  DollarSign,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  PieChart as PieIcon,
  HelpCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  XCircle,
  Inbox,
  Globe,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import orcamentoDataRaw from "@/data/orcamento_data.json";
import { formatBRL, formatPercent, shortenSetor } from "@/lib/format";
import { StatCard, StatusBadge, SectionHeader, FitValue } from "@/components/ui/primitives";

// Type assertions for TypeScript
const orcamentoData = orcamentoDataRaw as {
  resumo_geral: {
    dotacao_total: number;
    empenhado_total: number;
    liquidado_total: number;
    pago_total: number;
    apagar_total: number;
    saldo_total: number;
    percentual_consumido: number;
  };
  categorias: Array<{
    categoria: string;
    dotacao: number;
    empenhado: number;
    liquidado: number;
    pago: number;
    apagar: number;
    saldo: number;
    percentual_consumido: number;
  }>;
  setores: Array<{
    setor: string;
    dotacao: number;
    empenhado: number;
    liquidado: number;
    pago: number;
    apagar: number;
    saldo: number;
    percentual_consumido: number;
  }>;
  fichas: Array<{
    ficha: string;
    categoria: string;
    setor: string;
    funcao: string;
    subfuncao: string;
    catecficha: string;
    especificacao: string;
    dotacao: number;
    empenhado: number;
    liquidado: number;
    pago: number;
    apagar: number;
    saldo: number;
    percentual_consumido: number;
    status: "normal" | "warning" | "critical";
  }>;
};

// Paleta cívica para os gráficos recharts (tons institucionais).
const COLORS = {
  primary: "#1B3A6B",    // brand — dotação / primário
  success: "#1F7A4D",    // pos — empenhado / crédito
  warning: "#9A6700",    // warn — atenção
  danger: "#B3261E",     // neg — déficit / crítico
  axis: "#475467",       // ink-2 — rótulos de eixo
  axisMuted: "#8A94A6",  // muted — ticks secundários
  grid: "#D7DCE3",       // line — grade hairline
  // Categorias de gasto — tons institucionais derivados da paleta.
  pieColors: ["#1B3A6B", "#1F7A4D", "#9A6700", "#475467", "#C2C9D2"]
};

// Estilo de tooltip cívico compartilhado pelos gráficos recharts.
const civicTooltip = {
  borderRadius: "10px",
  border: "1px solid #D7DCE3",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 16px rgba(16,24,38,0.08)",
  color: "#101826",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
} as const;

const TARGET_CATEGORIES = ["3.3.90.30.00", "3.3.90.32.00", "3.3.90.36.00", "3.3.90.39.00"];

export function OrcamentoDashboard() {
  const { resumo_geral, categorias, setores, fichas } = orcamentoData;
  const prefersReducedMotion = useReducedMotion();

  // Live Data States
  const [liveExpenses, setLiveExpenses] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [apiMode, setApiMode] = useState<"live" | "simulation" | null>(null);

  // Fetch Live Expenses on Mount
  useEffect(() => {
    let active = true;
    const fetchLiveExpenses = async () => {
      setLiveLoading(true);
      setLiveError("");
      try {
        const queryParams = new URLSearchParams({
          exercicio: "2026",
          diaInicio: "01",
          mesInicio: "01",
          diaFinal: "31",
          mesFinal: "12",
          fornecedor: "",
          cnpj: "",
          tipo: "DespesasGerais"
        });
        const res = await fetch(`/api/transparencia/despesas?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error("Falha ao consultar Portal da Transparência");
        }
        const data = await res.json();
        if (active) {
          setLiveExpenses(data.results || []);
          setApiMode(data.mode);
          setLiveLoaded(true);
        }
      } catch (err: any) {
        console.error("Error loading live expenses in budget dashboard:", err);
        if (active) {
          setLiveError("Portal da Transparência indisponível");
          setApiMode("simulation");
        }
      } finally {
        if (active) {
          setLiveLoading(false);
        }
      }
    };

    fetchLiveExpenses();

    return () => {
      active = false;
    };
  }, []);

  // Memoized map for O(1) Ficha lookups
  const liveEmpenhadoMap = useMemo(() => {
    const map: Record<string, number> = {};
    liveExpenses.forEach((exp: any) => {
      const fichaNum = exp.Ficha;
      if (fichaNum && fichaNum !== "N/A") {
        map[fichaNum] = (map[fichaNum] || 0) + exp.ValorEmpenho;
      }
    });
    return map;
  }, [liveExpenses]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSetor, setSelectedSetor] = useState("all");
  const [selectedCategoria, setSelectedCategoria] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: "",
    direction: null
  });
  const itemsPerPage = 10;

  // Memoized unique selectors for dropdowns
  const sectorList = useMemo(() => {
    const list = setores.map(s => s.setor).filter(Boolean);
    return sortedUnique(list);
  }, [setores]);

  const categoryList = useMemo(() => {
    const list = categorias.map(c => c.categoria).filter(Boolean);
    return sortedUnique(list);
  }, [categorias]);

  function sortedUnique(arr: string[]) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  // Filtered Fichas list
  const filteredFichas = useMemo(() => {
    return fichas.filter(f => {
      const matchesSearch = 
        f.ficha.includes(searchTerm) || 
        f.especificacao.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.catecficha.includes(searchTerm);
      
      const matchesSetor = selectedSetor === "all" || f.setor === selectedSetor;
      const matchesCategoria = selectedCategoria === "all" || f.categoria === selectedCategoria;
      const matchesStatus = selectedStatus === "all" || f.status === selectedStatus;

      return matchesSearch && matchesSetor && matchesCategoria && matchesStatus;
    });
  }, [fichas, searchTerm, selectedSetor, selectedCategoria, selectedStatus]);

  // Totals of filtered items
  const filteredTotals = useMemo(() => {
    return filteredFichas.reduce((acc, curr) => {
      acc.dotacao += curr.dotacao;
      acc.empenhado += curr.empenhado;
      acc.saldo += curr.saldo;

      const isTarget = TARGET_CATEGORIES.includes(curr.catecficha);
      if (isTarget) {
        const liveEmp = liveEmpenhadoMap[curr.ficha] || 0;
        acc.empenhadoLive += liveEmp;
        acc.saldoLive += (curr.dotacao - liveEmp);
      } else {
        acc.empenhadoLive += curr.empenhado;
        acc.saldoLive += curr.saldo;
      }
      return acc;
    }, { dotacao: 0, empenhado: 0, saldo: 0, empenhadoLive: 0, saldoLive: 0 });
  }, [filteredFichas, liveEmpenhadoMap]);

  const filteredPercent = useMemo(() => {
    return filteredTotals.dotacao > 0 ? (filteredTotals.empenhado / filteredTotals.dotacao) * 100 : 0;
  }, [filteredTotals]);

  // Sorting logic
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key: direction ? key : "", direction });
  };

  const sortedFichas = useMemo(() => {
    const items = [...filteredFichas];
    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        // Special sorting for live fields
        if (sortConfig.key === 'empenhado_live') {
          const valLiveA = TARGET_CATEGORIES.includes(a.catecficha) ? (liveEmpenhadoMap[a.ficha] || 0) : 0;
          const valLiveB = TARGET_CATEGORIES.includes(b.catecficha) ? (liveEmpenhadoMap[b.ficha] || 0) : 0;
          return sortConfig.direction === 'asc' ? valLiveA - valLiveB : valLiveB - valLiveA;
        }
        if (sortConfig.key === 'saldo_live') {
          const valLiveA = TARGET_CATEGORIES.includes(a.catecficha) ? (a.dotacao - (liveEmpenhadoMap[a.ficha] || 0)) : a.saldo;
          const valLiveB = TARGET_CATEGORIES.includes(b.catecficha) ? (b.dotacao - (liveEmpenhadoMap[b.ficha] || 0)) : b.saldo;
          return sortConfig.direction === 'asc' ? valLiveA - valLiveB : valLiveB - valLiveA;
        }

        let valA = a[sortConfig.key as keyof typeof a];
        let valB = b[sortConfig.key as keyof typeof b];

        // Status order map if sorting by status
        if (sortConfig.key === 'status') {
          const statusOrder = { critical: 3, warning: 2, normal: 1 };
          const orderA = statusOrder[valA as keyof typeof statusOrder] || 0;
          const orderB = statusOrder[valB as keyof typeof statusOrder] || 0;
          return sortConfig.direction === 'asc' ? orderA - orderB : orderB - orderA;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          const numA = Number(valA);
          const numB = Number(valB);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB, "pt-BR") 
            : valB.localeCompare(valA, "pt-BR");
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return items;
  }, [filteredFichas, sortConfig, liveEmpenhadoMap]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSetor, selectedCategoria, selectedStatus]);

  // Pagination details
  const totalPages = Math.ceil(filteredFichas.length / itemsPerPage) || 1;
  const paginatedFichas = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedFichas.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedFichas, currentPage]);

  // Helper to render sortable headers
  const renderSortableHeader = (label: string, sortKey: string, align: 'left' | 'right' | 'center' = 'left') => {
    const isSorted = sortConfig.key === sortKey;
    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
    const textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    
    return (
      <th
        onClick={() => handleSort(sortKey)}
        className={`py-3.5 px-4 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em] cursor-pointer hover:bg-surface-2 hover:text-ink transition-colors select-none group ${textAlignClass}`}
      >
        <div className={`flex items-center gap-1.5 ${justifyClass}`}>
          {align === 'right' && (
            <span className="text-muted group-hover:text-ink-2 transition-colors shrink-0">
              {!isSorted ? (
                <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
              ) : sortConfig.direction === 'asc' ? (
                <ChevronUp className="w-3 h-3 text-brand" />
              ) : (
                <ChevronDown className="w-3 h-3 text-brand" />
              )}
            </span>
          )}
          <span>{label}</span>
          {align !== 'right' && (
            <span className="text-muted group-hover:text-ink-2 transition-colors shrink-0">
              {!isSorted ? (
                <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
              ) : sortConfig.direction === 'asc' ? (
                <ChevronUp className="w-3 h-3 text-brand" />
              ) : (
                <ChevronDown className="w-3 h-3 text-brand" />
              )}
            </span>
          )}
        </div>
      </th>
    );
  };

  // Chart data 1: Donut chart of categories
  const pieChartData = useMemo(() => {
    return categorias.map(c => ({
      name: c.categoria,
      value: c.dotacao
    }));
  }, [categorias]);

  // Chart data 2: Top Sectors Bar Chart (Top 6)
  const barChartData = useMemo(() => {
    return setores.slice(0, 6).map(s => ({
      name: shortenSetor(s.setor),
      "Dotação": s.dotacao,
      "Empenhado": s.empenhado,
      fullName: s.setor
    }));
  }, [setores]);

  // Live totals for KPI cards (computed from ALL fichas, not just filtered)
  const liveTotals = useMemo(() => {
    let empenhadoLive = 0;
    fichas.forEach(f => {
      if (TARGET_CATEGORIES.includes(f.catecficha)) {
        empenhadoLive += liveEmpenhadoMap[f.ficha] || 0;
      } else {
        // Non-target fichas keep their static empenhado value
        empenhadoLive += f.empenhado;
      }
    });
    const saldoLive = resumo_geral.dotacao_total - empenhadoLive;
    const percentLive = resumo_geral.dotacao_total > 0 ? (empenhadoLive / resumo_geral.dotacao_total) * 100 : 0;
    return { empenhadoLive, saldoLive, percentLive };
  }, [fichas, liveEmpenhadoMap, resumo_geral.dotacao_total]);

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-16">

      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          title="Dotação e Execução Orçamentária"
          subtitle="Monitoramento de dotações autorizadas e consumo orçamentário consolidado de prestação de serviços por ficha e setor"
          badge={
            liveLoaded ? (
              <StatusBadge
                tone={
                  liveTotals.percentLive > 85
                    ? "critical"
                    : liveTotals.percentLive > 70
                      ? "attention"
                      : "healthy"
                }
              >
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {formatPercent(liveTotals.percentLive)} LIVE
                </span>
              </StatusBadge>
            ) : (
              <StatusBadge
                tone={
                  resumo_geral.percentual_consumido > 85
                    ? "critical"
                    : resumo_geral.percentual_consumido > 70
                      ? "attention"
                      : "healthy"
                }
              >
                {liveLoading ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Sincronizando...
                  </span>
                ) : (
                  <>{formatPercent(resumo_geral.percentual_consumido)} EMPENHADO</>
                )}
              </StatusBadge>
            )
          }
        />
      </div>

      {/* Bento Grid: Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">

        {/* Dotação — static only */}
        <StatCard
          title="Dotação Atual"
          value={formatBRL(resumo_geral.dotacao_total)}
          subtitle="Orçamento total autorizado"
          icon={Wallet}
          iconBgClass="bg-brand-50"
          iconColorClass="text-brand"
        />

        {/* Empenhado — JSON + Live */}
        <div className="rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warn-50 text-warn">
              <TrendingUp className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-[0.08em]">Empenhado</span>
          </div>
          <div className="space-y-1.5">
            {/* Live value */}
            <div>
              {liveLoading ? (
                <span className="inline-block w-36 h-7 rounded-md bg-line animate-pulse" />
              ) : liveLoaded ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pos animate-pulse shrink-0" />
                  <FitValue max={22} min={13} className="flex-1 font-mono font-semibold tracking-tight tabular text-ink">
                    {formatBRL(liveTotals.empenhadoLive)}
                  </FitValue>
                </div>
              ) : (
                <FitValue max={22} min={13} className="font-mono font-semibold tracking-tight tabular text-ink">
                  {formatBRL(resumo_geral.empenhado_total)}
                </FitValue>
              )}
            </div>
            {/* JSON reference */}
            {liveLoaded && (
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-dashed border-line">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">JSON:</span>
                <span className="font-mono text-xs text-muted tabular">{formatBRL(resumo_geral.empenhado_total)}</span>
              </div>
            )}
            <span className="block text-xs font-medium text-muted">Compromissado / Reservado</span>
          </div>
        </div>

        {/* Liquidado — static only (API não retorna liquidado separado) */}
        <StatCard
          title="Liquidado"
          value={formatBRL(resumo_geral.liquidado_total)}
          subtitle="Serviços prestados e atestados"
          icon={CheckCircle2}
          iconBgClass="bg-pos-50"
          iconColorClass="text-pos"
        />

        {/* Pago — static only */}
        <StatCard
          title="Pago"
          value={formatBRL(resumo_geral.pago_total)}
          subtitle="Desembolso financeiro real"
          icon={DollarSign}
          iconBgClass="bg-brand-50"
          iconColorClass="text-brand"
        />

        {/* Saldo Disponível — JSON + Live */}
        <div className="rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              liveLoaded
                ? (liveTotals.saldoLive < 0 ? "bg-neg-50 text-neg" : "bg-pos-50 text-pos")
                : (resumo_geral.saldo_total < 0 ? "bg-neg-50 text-neg" : "bg-pos-50 text-pos")
            }`}>
              {(liveLoaded ? liveTotals.saldoLive : resumo_geral.saldo_total) < 0
                ? <AlertTriangle className="w-[18px] h-[18px]" />
                : <Wallet className="w-[18px] h-[18px]" />}
            </div>
            <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-[0.08em]">Saldo Disponível</span>
          </div>
          <div className="space-y-1.5">
            {/* Live value */}
            <div>
              {liveLoading ? (
                <span className="inline-block w-36 h-7 rounded-md bg-line animate-pulse" />
              ) : liveLoaded ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pos animate-pulse shrink-0" />
                  <FitValue max={22} min={13} className={`flex-1 font-mono font-semibold tracking-tight tabular ${
                    liveTotals.saldoLive < 0 ? "text-neg" : "text-ink"
                  }`}>
                    {formatBRL(liveTotals.saldoLive)}
                  </FitValue>
                </div>
              ) : (
                <FitValue max={22} min={13} className={`font-mono font-semibold tracking-tight tabular ${
                  resumo_geral.saldo_total < 0 ? "text-neg" : "text-ink"
                }`}>
                  {formatBRL(resumo_geral.saldo_total)}
                </FitValue>
              )}
            </div>
            {/* JSON reference */}
            {liveLoaded && (
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-dashed border-line">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">JSON:</span>
                <span className={`font-mono text-xs tabular ${
                  resumo_geral.saldo_total < 0 ? "text-neg/60" : "text-muted"
                }`}>{formatBRL(resumo_geral.saldo_total)}</span>
              </div>
            )}
            <span className="block text-xs font-medium text-muted">Recurso livre no orçamento</span>
          </div>
        </div>

      </div>

      {/* Bento Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Radial Progress Box (Gauge) */}
        <div className="lg:col-span-4 rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">Execução · 2026</span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Consumo Global do Orçamento</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Percentual do orçamento já empenhado (comprometido)</p>
          </div>

          <div className="flex flex-col items-center justify-center py-6 relative">
            {/* SVG Circle Progress */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="76"
                  className="stroke-line"
                  strokeWidth="16"
                  fill="transparent"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="76"
                  className={
                    resumo_geral.percentual_consumido > 85
                      ? "stroke-neg"
                      : resumo_geral.percentual_consumido > 70
                        ? "stroke-warn"
                        : "stroke-brand"
                  }
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={477.5}
                  initial={{ strokeDashoffset: prefersReducedMotion ? 477.5 - (477.5 * Math.min(resumo_geral.percentual_consumido, 100)) / 100 : 477.5 }}
                  animate={{ strokeDashoffset: 477.5 - (477.5 * Math.min(resumo_geral.percentual_consumido, 100)) / 100 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-mono tabular text-3xl font-bold text-ink tracking-tight">
                  {formatPercent(resumo_geral.percentual_consumido)}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-[0.12em] mt-1 ${
                  resumo_geral.percentual_consumido > 85
                    ? "text-neg"
                    : resumo_geral.percentual_consumido > 70
                      ? "text-warn"
                      : "text-brand"
                }`}>Empenhado</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-2 rounded-lg p-4 border border-line text-center">
            <span className="text-xs font-medium text-ink-2 block">
              Empenhado <strong className="font-mono tabular text-ink">{formatBRL(resumo_geral.empenhado_total)}</strong> de uma dotação de <strong className="font-mono tabular text-ink">{formatBRL(resumo_geral.dotacao_total)}</strong>.
            </span>
            <span className="text-[11px] font-medium text-muted block mt-1">
              Pago: <strong className="font-mono tabular text-brand">{formatBRL(resumo_geral.pago_total)}</strong>
              {" · "}A pagar: <strong className="font-mono tabular text-warn">{formatBRL(resumo_geral.apagar_total)}</strong>
            </span>
          </div>
        </div>

        {/* Pie Chart: Distribution by Category */}
        <div className="lg:col-span-4 rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">Dotação · 2026</span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Divisão por Categoria de Gasto</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Proporção da dotação entre as 5 áreas de despesas</p>
          </div>

          <div className="w-full h-48 flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive={!prefersReducedMotion}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.pieColors[index % COLORS.pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [formatBRL(Number(value)), name]}
                    contentStyle={civicTooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted">
                <Inbox className="w-7 h-7" />
                <span className="text-xs font-semibold">Sem categorias</span>
              </div>
            )}
          </div>

          {/* Simple Legend grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-ink-2 bg-surface-2 p-3 rounded-lg border border-line">
            {categorias.slice(0, 4).map((c, i) => (
              <div key={c.categoria} className="flex items-center gap-1.5 truncate">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS.pieColors[i % COLORS.pieColors.length] }}
                />
                <span className="truncate">{c.categoria} <span className="font-mono tabular">({((c.dotacao / resumo_geral.dotacao_total) * 100).toFixed(0)}%)</span></span>
              </div>
            ))}
            {categorias.length > 4 && (
              <div className="flex items-center gap-1.5 col-span-2 justify-center border-t border-line pt-1.5 mt-0.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS.pieColors[4 % COLORS.pieColors.length] }}
                />
                <span>{categorias[4].categoria} <span className="font-mono tabular">({((categorias[4].dotacao / resumo_geral.dotacao_total) * 100).toFixed(0)}%)</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Sectors */}
        <div className="lg:col-span-4 rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 flex flex-col justify-between min-h-[360px]">
          <div>
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">Setores · 2026</span>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Top Setores com Maior Dotação</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Comparativo entre Dotação Autorizada e Empenhada</p>
          </div>

          <div className="w-full h-64 mt-4">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: COLORS.axis, fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: COLORS.axisMuted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`}
                    width={75}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [formatBRL(Number(value)), name]}
                    labelFormatter={(_label: any, payload: any) =>
                      payload && payload[0] ? payload[0].payload.fullName : ""
                    }
                    contentStyle={civicTooltip}
                    labelStyle={{ color: "#101826", fontWeight: 700, fontSize: 12, fontFamily: "var(--font-sans)", marginBottom: 4 }}
                    cursor={{ fill: "rgba(16,24,38,0.04)" }}
                  />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: "11px", fontWeight: 600, marginTop: "10px", color: "#475467" }}
                  />
                  <Bar dataKey="Dotação" fill={COLORS.primary} radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                  <Bar dataKey="Empenhado" fill={COLORS.success} radius={[3, 3, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-muted">
                <Inbox className="w-7 h-7" />
                <span className="text-xs font-semibold">Sem setores</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Interactive Box: Search, Filters & Table */}
      <div className="rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6">

        {/* Filters Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink-2 border border-line">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-display text-lg font-bold text-ink tracking-tight">Detalhamento das Fichas</h4>
                {liveLoading ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] rounded bg-brand-50 text-brand border border-brand/20 animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Sincronizando Live...
                  </span>
                ) : liveLoaded ? (
                  apiMode === "live" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] rounded-md border text-pos bg-pos-50 border-pos/25">
                      <Globe className="w-2.5 h-2.5" />
                      Fiorilli Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] rounded-md border text-warn bg-warn-50 border-warn/25 animate-pulse">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Fiorilli Off-line
                    </span>
                  )
                ) : liveError ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] rounded-md border text-neg bg-neg-50 border-neg/25">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Erro API
                  </span>
                ) : null}
              </div>
              <p className="text-xs font-medium text-ink-2">Total de <span className="font-mono tabular">{filteredFichas.length}</span> registros filtrados</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar Ficha, CATEC, especificação..."
                aria-label="Buscar fichas"
                className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>

            {/* Setor Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedSetor}
                onChange={(e) => setSelectedSetor(e.target.value)}
                aria-label="Filtrar por setor"
                className="w-full sm:w-56 px-3.5 py-2 text-sm font-semibold rounded-lg border border-line bg-surface text-ink-2 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="all">Setor: Todos</option>
                {sectorList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Categoria Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                aria-label="Filtrar por categoria"
                className="w-full sm:w-48 px-3.5 py-2 text-sm font-semibold rounded-lg border border-line bg-surface text-ink-2 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="all">Categoria: Todas</option>
                {categoryList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filtrar por status"
                className="w-full sm:w-40 px-3.5 py-2 text-sm font-semibold rounded-lg border border-line bg-surface text-ink-2 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all"
              >
                <option value="all">Status: Todos</option>
                <option value="normal">Normal (&le; 70%)</option>
                <option value="warning">Atenção (70% - 85%)</option>
                <option value="critical">Crítico (&gt; 85%)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm !== "" || selectedSetor !== "all" || selectedCategoria !== "all" || selectedStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSetor("all");
                  setSelectedCategoria("all");
                  setSelectedStatus("all");
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-neg/25 bg-neg-50 hover:bg-neg-50/70 text-neg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neg"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Fichas Table */}
        <div className="overflow-x-auto rounded-lg border border-line bg-surface mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 border-b border-line">
                {renderSortableHeader("Ficha", "ficha", "left")}
                {renderSortableHeader("CATEC", "catecficha", "left")}
                {renderSortableHeader("Especificação da Despesa", "especificacao", "left")}
                {renderSortableHeader("Setor / Departamento", "setor", "left")}
                {renderSortableHeader("Dotação", "dotacao", "right")}
                {renderSortableHeader("Empenhado (JSON)", "empenhado", "right")}
                {renderSortableHeader("Empenhado (Live)", "empenhado_live", "right")}
                {renderSortableHeader("Saldo (JSON)", "saldo", "right")}
                {renderSortableHeader("Saldo (Live)", "saldo_live", "right")}
                {renderSortableHeader("Consumo (%)", "percentual_consumido", "center")}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <AnimatePresence mode="popLayout">
                {paginatedFichas.length > 0 ? (
                  paginatedFichas.map((f) => {
                    const isTarget = TARGET_CATEGORIES.includes(f.catecficha);
                    const liveEmpVal = isTarget && liveLoaded ? (liveEmpenhadoMap[f.ficha] || 0) : null;
                    const liveSaldoVal = isTarget && liveLoaded ? (f.dotacao - (liveEmpVal || 0)) : null;

                    return (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={`${f.categoria}-${f.ficha}`}
                        className="hover:bg-surface-2 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono tabular font-semibold text-sm text-ink">
                          <span className="px-2 py-1 rounded bg-surface-2 text-ink-2 border border-line">
                            {f.ficha}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular text-xs text-ink-2 font-medium">
                          {f.catecficha}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-ink line-clamp-1">{f.especificacao}</span>
                            <span className="text-[10px] font-semibold text-muted tracking-[0.06em] uppercase mt-0.5">{f.categoria}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-medium text-ink-2 line-clamp-1 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
                            {f.setor || "GABINETE DO PREFEITO"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular font-medium text-sm text-ink">
                          {formatBRL(f.dotacao)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular font-medium text-xs text-muted">
                          {formatBRL(f.empenhado)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular font-semibold text-sm text-ink">
                          {isTarget ? (
                            liveLoading ? (
                              <span className="inline-block w-16 h-4 rounded bg-line animate-pulse" />
                            ) : liveLoaded ? (
                              <span className="flex items-center justify-end gap-1 text-ink">
                                <span className="w-1.5 h-1.5 rounded-full bg-pos animate-pulse shrink-0" />
                                {formatBRL(liveEmpVal || 0)}
                              </span>
                            ) : (
                              <span className="text-muted font-medium">-</span>
                            )
                          ) : (
                            <span className="text-muted font-medium text-xs">-</span>
                          )}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono tabular font-medium text-xs ${f.saldo < 0 ? 'text-neg/80' : 'text-muted'}`}>
                          {formatBRL(f.saldo)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono tabular font-semibold text-sm ${liveSaldoVal !== null && liveSaldoVal < 0 ? 'text-neg' : 'text-ink'}`}>
                          {isTarget ? (
                            liveLoading ? (
                              <span className="inline-block w-16 h-4 rounded bg-line animate-pulse" />
                            ) : liveLoaded ? (
                              formatBRL(liveSaldoVal || 0)
                            ) : (
                              <span className="text-muted font-medium">-</span>
                            )
                          ) : (
                            <span className="text-muted font-medium text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              const pct = (isTarget && liveLoaded)
                                ? (f.dotacao > 0 ? ((liveEmpVal || 0) / f.dotacao) * 100 : 0)
                                : f.percentual_consumido;

                              const liveStatus = pct > 85 ? "critical" : pct > 70 ? "warning" : "normal";
                              const statusColor =
                                liveStatus === "critical" ? "text-neg bg-neg-50 border-neg/25" :
                                liveStatus === "warning" ? "text-warn bg-warn-50 border-warn/25" :
                                "text-pos bg-pos-50 border-pos/25";

                              const progressColor =
                                liveStatus === "critical" ? "bg-neg" :
                                liveStatus === "warning" ? "bg-warn" :
                                "bg-pos";

                              return (
                                <>
                                  <span className={`font-mono tabular px-2 py-0.5 text-[10px] font-bold rounded-md border ${statusColor} flex items-center gap-1`}>
                                    {isTarget && liveLoaded && <span className="w-1 h-1 rounded-full bg-current animate-pulse shrink-0" />}
                                    {formatPercent(pct)}
                                  </span>

                                  {/* Track bar */}
                                  <div className="w-28 bg-surface-2 border border-line rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${progressColor}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted font-medium text-sm">
                      Nenhuma ficha encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
            {filteredFichas.length > 0 && (
              <tfoot>
                <tr className="bg-surface-2 border-t-2 border-line-strong font-semibold text-ink">
                  <td colSpan={4} className="py-3 px-4 text-[11px] font-semibold uppercase text-ink-2 tracking-[0.06em]">
                    Total Filtrado (<span className="font-mono tabular">{filteredFichas.length}</span> Fichas)
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {formatBRL(filteredTotals.dotacao)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-xs text-muted">
                    {formatBRL(filteredTotals.empenhado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {liveLoading ? (
                      <span className="inline-block w-16 h-4 rounded bg-line animate-pulse" />
                    ) : liveLoaded ? (
                      <span className="flex items-center justify-end gap-1 text-ink font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-pos shrink-0" />
                        {formatBRL(filteredTotals.empenhadoLive)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono tabular text-xs ${filteredTotals.saldo < 0 ? 'text-neg/80' : 'text-muted'}`}>
                    {formatBRL(filteredTotals.saldo)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono tabular text-sm ${filteredTotals.saldoLive < 0 ? 'text-neg' : 'text-ink'}`}>
                    {liveLoading ? (
                      <span className="inline-block w-16 h-4 rounded bg-line animate-pulse" />
                    ) : liveLoaded ? (
                      formatBRL(filteredTotals.saldoLive)
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {(() => {
                      const totalLivePercent = filteredTotals.dotacao > 0
                        ? (filteredTotals.empenhadoLive / filteredTotals.dotacao) * 100
                        : 0;
                      const pctToUse = liveLoaded ? totalLivePercent : filteredPercent;
                      return (
                        <StatusBadge tone={pctToUse > 85 ? "critical" : pctToUse > 70 ? "attention" : "healthy"}>
                          {formatPercent(pctToUse)}
                        </StatusBadge>
                      );
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination controls */}
        {filteredFichas.length > 0 && (
          <div className="flex items-center justify-between px-2 pt-2">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.06em]">
              Página <span className="font-mono tabular">{currentPage}</span> de <span className="font-mono tabular">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                aria-label="Próxima página"
                className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
