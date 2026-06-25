"use client";

import React, { useState, useMemo } from "react";
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
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import {
  Search,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  DollarSign,
  TrendingDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  X,
  UserCheck,
  Coffee,
  Activity,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import despesasFixasDataRaw from "@/data/despesas_fixas_data.json";
import { formatBRL, shortenSetor } from "@/lib/format";
import { StatCard, SectionHeader, Card } from "@/components/ui/primitives";

// Type definitions
interface Contract {
  empenho: string;
  contrato: string;
  fornecedor: string;
  historico: string;
  setor: string;
  categoria: string;
  ficha: string;
  fonte_recurso: string;
  valor_anual: number;
  valor_mensal: number;
  cronograma: number[];
}

const despesasFixasData = despesasFixasDataRaw as {
  resumo_geral: {
    total_despesas_fixas_anual: number;
    total_despesas_fixas_mensal: number;
    folha_anual: number;
    contratos_anual: number;
    auxilio_anual: number;
    ingesp_anual: number;
    num_contratos_ativos: number;
  };
  progressao_mensal: Array<{
    mes_num: number;
    mes_nome: string;
    folha: number;
    contratos: number;
    auxilio: number;
    ingesp: number;
    total: number;
  }>;
  contratos_por_setor: Array<{
    setor: string;
    valor: number;
  }>;
  contratos_por_categoria: Array<{
    categoria: string;
    valor: number;
  }>;
  contratos: Contract[];
};

// Paleta cívica institucional (tokens do design system "Cívico Moderno").
const COLORS = {
  brand: "#1B3A6B",      // marca — azul institucional
  pos: "#1F7A4D",        // crédito / saudável
  neg: "#B3261E",        // débito / déficit
  warn: "#9A6700",       // atenção / limite
  grid: "#D7DCE3",       // hairline da grade
  axis: "#475467",       // texto de eixo (ink-2)
  axisMuted: "#8A94A6",  // texto terciário (muted)
  // Folha (marca), Contratos (pos), Auxílio (warn), INGESP (ink-2)
  pieColors: ["#1B3A6B", "#1F7A4D", "#9A6700", "#475467"]
};

// Estilo compartilhado do tooltip dos gráficos — superfície branca, borda hairline, cifras mono.
const TOOLTIP_STYLE = {
  borderRadius: "10px",
  fontSize: "11px",
  border: "1px solid #D7DCE3",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 2px rgba(16,24,38,0.04)",
  color: "#101826",
  fontFamily: "var(--font-mono)",
} as const;

export function DespesasFixas() {
  const { resumo_geral, progressao_mensal, contratos_por_setor, contratos } = despesasFixasData;

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSetor, setSelectedSetor] = useState("all");
  const [selectedCategoria, setSelectedCategoria] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: "",
    direction: null
  });
  
  const itemsPerPage = 10;

  // Memoized unique dropdown lists
  const sectorList = useMemo(() => {
    const list = contratos.map(c => c.setor).filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [contratos]);

  const categoryList = useMemo(() => {
    const list = contratos.map(c => c.categoria).filter(Boolean);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [contratos]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contratos.filter(c => {
      const matchesSearch = 
        c.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.contrato.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.empenho.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.historico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.fonte_recurso && c.fonte_recurso.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSetor = selectedSetor === "all" || c.setor === selectedSetor;
      const matchesCategoria = selectedCategoria === "all" || c.categoria === selectedCategoria;

      return matchesSearch && matchesSetor && matchesCategoria;
    });
  }, [contratos, searchTerm, selectedSetor, selectedCategoria]);

  // Totals of filtered items
  const filteredTotals = useMemo(() => {
    return filteredContracts.reduce((acc, curr) => {
      acc.valor_mensal += curr.valor_mensal;
      acc.valor_anual += curr.valor_anual;
      return acc;
    }, { valor_mensal: 0, valor_anual: 0 });
  }, [filteredContracts]);

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

  const sortedContracts = useMemo(() => {
    const items = [...filteredContracts];
    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key as keyof typeof a];
        const valB = b[sortConfig.key as keyof typeof b];

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
  }, [filteredContracts, sortConfig]);

  // Reset page on filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSetor, selectedCategoria]);

  // Fecha o modal de detalhes com a tecla Escape (acessibilidade de teclado)
  React.useEffect(() => {
    if (!selectedContract) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedContract(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedContract]);

  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage) || 1;
  const paginatedContracts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedContracts.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedContracts, currentPage]);

  // Helper to render sortable headers
  const renderSortableHeader = (label: string, sortKey: string, align: 'left' | 'right' | 'center' = 'left') => {
    const isSorted = sortConfig.key === sortKey;
    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
    const textAlignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    const ariaSort: "ascending" | "descending" | "none" = isSorted && sortConfig.direction === 'asc'
      ? "ascending"
      : isSorted && sortConfig.direction === 'desc'
        ? "descending"
        : "none";

    const indicator = (
      <span className="text-muted group-hover:text-ink-2 transition-colors shrink-0" aria-hidden="true">
        {!isSorted ? (
          <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
        ) : sortConfig.direction === 'asc' ? (
          <ChevronUp className="w-3 h-3 text-brand" />
        ) : (
          <ChevronDown className="w-3 h-3 text-brand" />
        )}
      </span>
    );

    return (
      <th
        scope="col"
        aria-sort={ariaSort}
        className={`p-0 ${textAlignClass}`}
      >
        <button
          type="button"
          onClick={() => handleSort(sortKey)}
          className={`w-full py-3 px-4 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.08em] cursor-pointer hover:bg-line/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 transition-colors select-none group ${textAlignClass}`}
        >
          <span className={`flex items-center gap-1.5 ${justifyClass}`}>
            {align === 'right' && indicator}
            <span>{label}</span>
            {align !== 'right' && indicator}
          </span>
        </button>
      </th>
    );
  };

  // Donut Chart Data (Fixed Expenses Composition)
  const donutChartData = useMemo(() => {
    return [
      { name: "Folha Salarial", value: resumo_geral.folha_anual },
      { name: "Contratos de Serviços", value: resumo_geral.contratos_anual },
      { name: "Auxílio Alimentação", value: resumo_geral.auxilio_anual },
      { name: "Convênio INGESP", value: resumo_geral.ingesp_anual }
    ];
  }, [resumo_geral]);

  // Department Bar Chart Data (Top 5)
  const deptBarChartData = useMemo(() => {
    return contratos_por_setor.slice(0, 5).map(item => ({
      name: shortenSetor(item.setor, 25),
      "Valor Contratado": item.valor,
      fullName: item.setor
    }));
  }, [contratos_por_setor]);

  // Contract specific chart data helper
  const contractScheduleData = useMemo(() => {
    if (!selectedContract) return [];
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return selectedContract.cronograma.map((val, idx) => ({
      name: months[idx],
      "Valor Parcela": val
    }));
  }, [selectedContract]);

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 pb-16">
      
      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          title="Despesas Fixas e Contratos 2026"
          subtitle="Monitoramento detalhado dos contratos de prestação de serviços municipais, folha de pagamento, auxílios e convênios permanentes"
          badge={
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-md border text-brand bg-brand-50 border-brand/20 uppercase tracking-[0.08em]">
              <span className="font-mono tabular">{resumo_geral.num_contratos_ativos}</span> contratos ativos
            </span>
          }
        />
      </div>

      {/* Bento Grid: Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Total Despesa Fixa Anual"
          value={formatBRL(resumo_geral.total_despesas_fixas_anual)}
          subtitle="Projeção total para o ano de 2026"
          icon={Wallet}
          iconBgClass="bg-neg-50"
          iconColorClass="text-neg"
        />
        <StatCard
          title="Média Mensal Estimada"
          value={formatBRL(resumo_geral.total_despesas_fixas_mensal)}
          subtitle="Custo fixo mensal de manutenção"
          icon={TrendingDown}
          iconBgClass="bg-surface-2"
          iconColorClass="text-ink-2"
        />
        <StatCard
          title="Folha Salarial Anual"
          value={formatBRL(resumo_geral.folha_anual)}
          subtitle="Salários, encargos e provisão 13º"
          icon={UserCheck}
          iconBgClass="bg-brand-50"
          iconColorClass="text-brand"
        />
        <StatCard
          title="Contratos Municipais"
          value={formatBRL(resumo_geral.contratos_anual)}
          subtitle={`Soma de ${resumo_geral.num_contratos_ativos} contratos ativos`}
          icon={FileText}
          iconBgClass="bg-brand-50"
          iconColorClass="text-brand"
        />
        <StatCard
          title="Auxílio & INGESP"
          value={formatBRL(resumo_geral.auxilio_anual + resumo_geral.ingesp_anual)}
          subtitle="Soma de auxílio-alimentação e INGESP"
          icon={Coffee}
          iconBgClass="bg-pos-50"
          iconColorClass="text-pos"
        />
      </div>

      {/* Info Callout about Resource Breakdown */}
      <div className="flex flex-col gap-3 px-5 py-4 rounded-xl border border-brand/20 bg-brand-50/30 mb-8 text-xs text-ink-2 font-medium transition-all duration-300">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand border border-brand/10">
            <Info className="w-4 h-4 shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <span>
              Do total de <strong>R$ 19.114.533,82</strong> em contratos de serviços municipais, 
              cerca de <strong>R$ 17.047.136,02 (89,18%)</strong> são financiados por <strong>Recursos Próprios (Tesouro)</strong> 
              e <strong>R$ 2.067.397,92 (10,82%)</strong> são provenientes de <strong>Recursos Vinculados (Transf. Federal/Estadual)</strong>.
            </span>
            <button 
              onClick={() => setShowBreakdownDetails(!showBreakdownDetails)}
              className="ml-2 inline-flex items-center gap-0.5 text-brand font-bold hover:underline cursor-pointer focus:outline-none"
            >
              {showBreakdownDetails ? "Ver menos" : "Saiba mais"}
            </button>
          </div>
        </div>

        {showBreakdownDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-brand/10 text-ink-2 space-y-3"
          >
            <p className="text-[11px] leading-relaxed text-muted uppercase font-bold tracking-wider">
              Detalhamento de Origem dos Recursos de Contratos
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface p-3.5 rounded-lg border border-line flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    <span className="font-semibold text-ink">Recursos Próprios (Tesouro)</span>
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    Recursos livres provenientes da arrecadação de impostos municipais (como IPTU, ISS) e repasses constitucionais gerais. Custeiam a maior parte dos contratos de prestação de serviços municipais ordinários.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-line flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted">Total Anual</span>
                  <span className="font-mono font-bold text-sm text-brand">R$ 17.047.136,02</span>
                </div>
              </div>

              <div className="bg-surface p-3.5 rounded-lg border border-line flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-pos" />
                    <span className="font-semibold text-ink">Recursos Vinculados</span>
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    Verbas carimbadas provenientes de convênios, fundos setoriais ou transferências obrigatórias da União e do Estado. Destinadas exclusivamente para fins específicos, como transporte de alunos do ensino médio e vigilância sanitária.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-line flex items-baseline justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted">Total Anual</span>
                  <span className="font-mono font-bold text-sm text-pos">R$ 2.067.397,92</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted italic leading-relaxed">
              * Nota: Essa classificação garante que apenas os contratos custeados por Recursos Próprios (R$ 17,04 mi) sejam consolidados como despesas fixas do Tesouro no cálculo do superávit/déficit projetado na aba "Visão Geral", evitando distorções causadas por repasses vinculados temporários.
            </p>
          </motion.div>
        )}
      </div>

      {/* Bento Grid: Charts & Explanations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Donut Chart: Composition of Fixed Expenses */}
        <Card className="lg:col-span-4 p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight">Composição Anual das Despesas Fixas</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Distribuição proporcional dos recursos contratados e fixos</p>
          </div>

          <div className="w-full h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.pieColors[index % COLORS.pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [formatBRL(Number(v)), "Valor Anual"]} contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-ink-2 bg-surface-2 p-3 rounded-lg border border-line">
            {donutChartData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS.pieColors[i % COLORS.pieColors.length] }}
                />
                <span className="truncate">{item.name} (<span className="font-mono tabular">{((item.value / resumo_geral.total_despesas_fixas_anual) * 100).toFixed(1)}%</span>)</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Stacked Area Chart: Monthly Costs Progression */}
        <Card className="lg:col-span-5 p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight">Evolução Mensal do Custo Fixo 2026</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Visualização da sazonalidade (pico de folha salarial em dezembro com o 13º)</p>
          </div>

          <div className="w-full h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={progressao_mensal}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                <XAxis
                  dataKey="mes_nome"
                  tick={{ fill: COLORS.axis, fontSize: 8, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: COLORS.axisMuted, fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [formatBRL(Number(val)), name.toString().toUpperCase()]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "9px", fontWeight: 700, marginTop: "8px" }}
                  {...({
                    payload: [
                      { value: "Folha Salarial", type: "circle", id: "folha", color: COLORS.brand },
                      { value: "Contratos", type: "circle", id: "contratos", color: COLORS.pos },
                      { value: "Auxílio Alim.", type: "circle", id: "auxilio", color: COLORS.warn },
                      { value: "INGESP", type: "circle", id: "ingesp", color: COLORS.axis }
                    ]
                  } as any)}
                />
                <Area type="monotone" dataKey="folha" stackId="1" stroke={COLORS.brand} fill={COLORS.brand} fillOpacity={0.15} name="Folha Salarial" />
                <Area type="monotone" dataKey="contratos" stackId="1" stroke={COLORS.pos} fill={COLORS.pos} fillOpacity={0.15} name="Contratos" />
                <Area type="monotone" dataKey="auxilio" stackId="1" stroke={COLORS.warn} fill={COLORS.warn} fillOpacity={0.15} name="Auxílio Alim." />
                <Area type="monotone" dataKey="ingesp" stackId="1" stroke={COLORS.axis} fill={COLORS.axis} fillOpacity={0.15} name="INGESP" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sidebar Info/Explanation Cards */}
        <Card className="lg:col-span-3 p-5 flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="font-display text-md font-bold text-ink tracking-tight flex items-center gap-1.5">
              <Info className="w-4 h-4 text-brand shrink-0" />
              Especificações e Detalhes
            </h4>
            <p className="text-[10px] font-semibold text-muted mt-0.5 uppercase tracking-[0.08em]">Custos Fixos Parametrizados</p>
          </div>

          <div className="space-y-4 my-3 text-xs flex-grow overflow-y-auto">
            {/* Folha Card */}
            <div className="p-3 rounded-lg bg-brand-50 border border-brand/15">
              <span className="font-bold text-brand-ink block">Folha Salarial</span>
              <span className="text-[10px] font-medium text-ink-2 block mt-0.5">
                Custos reais com folha e encargos. De Janeiro a Abril fixados em <strong className="font-mono tabular">R$ 6.120.055,45</strong> e de Maio a Novembro em <strong className="font-mono tabular">R$ 6.386.277,86</strong> mensais. Em Dezembro, há o pagamento de 13º salário totalizando <strong className="font-mono tabular">R$ 10.028.664,25</strong>.
              </span>
            </div>

            {/* Auxilio Card */}
            <div className="p-3 rounded-lg bg-warn-50 border border-warn/20">
              <span className="font-bold text-warn block">Auxílio Alimentação</span>
              <span className="text-[10px] font-medium text-ink-2 block mt-0.5">
                Pagamentos de ticket alimentação de servidores. De Janeiro a Abril fixados em <strong className="font-mono tabular">R$ 985.149,00</strong> e de Maio a Dezembro com reajuste de 7% (<strong className="font-mono tabular">R$ 1.054.109,43</strong>) mensais.
              </span>
            </div>

            {/* INGESP Card */}
            <div className="p-3 rounded-lg bg-pos-50 border border-pos/20">
              <span className="font-bold text-pos block">Convênio INGESP Innovare</span>
              <span className="text-[10px] font-medium text-ink-2 block mt-0.5">
                Pagamento permanente de convênio e prestação de serviços com valor fixado em <strong className="font-mono tabular">R$ 500.000,00</strong> mensais.
              </span>
            </div>
          </div>
        </Card>

      </div>

      {/* Top 5 departments spending on contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <Card className="lg:col-span-12 p-6">
          <div className="mb-4">
            <h4 className="font-display text-lg font-bold text-ink tracking-tight">Concentração de Despesas de Contratos por Departamento</h4>
            <p className="text-xs font-medium text-ink-2 mt-0.5">Comparativo dos 5 departamentos municipais com maior volume acumulado de contratos de serviços</p>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptBarChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.grid} />
                <XAxis
                  type="number"
                  tick={{ fill: COLORS.axisMuted, fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: COLORS.axis, fontSize: 8, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  width={150}
                />
                <Tooltip
                  formatter={(value: any) => [formatBRL(Number(value)), "Valor Total"]}
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(27,58,107,0.06)" }}
                />
                <Bar dataKey="Valor Contratado" fill={COLORS.brand} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Interactive Contracts Table */}
      <Card className="p-6">

        {/* Filters Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink-2 border border-line">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-ink tracking-tight">Detalhamento dos Contratos</h4>
              <p className="text-xs font-medium text-ink-2">Pesquise fornecedores, objetos de contrato ou filtre por departamento</p>
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
                placeholder="Buscar fornecedor, contrato, empenho..."
                aria-label="Buscar contratos por fornecedor, contrato, empenho ou histórico"
                className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus:border-brand transition-colors"
              />
            </div>

            {/* Setor Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedSetor}
                onChange={(e) => setSelectedSetor(e.target.value)}
                aria-label="Filtrar por setor / secretaria"
                className="w-full sm:w-56 px-3.5 py-2 text-sm font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus:border-brand transition-colors"
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
                aria-label="Filtrar por tipo de despesa / categoria"
                className="w-full sm:w-48 px-3.5 py-2 text-sm font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus:border-brand transition-colors"
              >
                <option value="all">Categoria: Todas</option>
                {categoryList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm !== "" || selectedSetor !== "all" || selectedCategoria !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSetor("all");
                  setSelectedCategoria("all");
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border border-brand/25 bg-brand-50 hover:bg-brand-50/70 text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 shrink-0" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Contracts Table (desktop / tablet) */}
        <div className="hidden md:block overflow-x-auto max-h-[640px] overflow-y-auto rounded-lg border border-line bg-surface mb-4">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-2 border-b border-line">
                {renderSortableHeader("Empenho", "empenho", "left")}
                {renderSortableHeader("Contrato", "contrato", "left")}
                {renderSortableHeader("Fornecedor / Contratado", "fornecedor", "left")}
                {renderSortableHeader("Setor / Secretaria", "setor", "left")}
                {renderSortableHeader("Tipo de Despesa", "categoria", "left")}
                {renderSortableHeader("Fonte de Recurso", "fonte_recurso", "left")}
                {renderSortableHeader("Valor Mensal", "valor_mensal", "right")}
                {renderSortableHeader("Valor Anual", "valor_anual", "right")}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <AnimatePresence mode="popLayout">
                {paginatedContracts.length > 0 ? (
                  paginatedContracts.map((c) => {
                    return (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={`${c.empenho}-${c.fornecedor}`}
                        onClick={() => setSelectedContract(c)}
                        className="hover:bg-surface-2 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono tabular font-semibold text-xs text-ink-2">
                          <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line group-hover:bg-brand-50 group-hover:text-brand group-hover:border-brand/25 transition-colors">
                            {c.empenho}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono tabular text-xs text-ink-2 font-semibold">
                          {c.contrato}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-ink line-clamp-1 group-hover:text-brand transition-colors">{c.fornecedor}</span>
                            <span className="text-[10px] font-semibold text-muted tracking-[0.06em] uppercase mt-0.5 line-clamp-1">{c.historico}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-ink-2 line-clamp-1 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
                            {c.setor}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-semibold text-ink-2 uppercase tracking-[0.06em]">
                            {c.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-medium text-ink-2 line-clamp-1">
                            {c.fonte_recurso || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular font-medium text-sm text-ink">
                          {formatBRL(c.valor_mensal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular font-semibold text-sm text-ink">
                          {formatBRL(c.valor_anual)}
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted font-medium text-sm">
                      Nenhum contrato encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
            {filteredContracts.length > 0 && (
              <tfoot>
                <tr className="bg-surface-2 border-t-2 border-line-strong font-semibold text-ink">
                  <td colSpan={6} className="py-3 px-4 text-[11px] font-bold uppercase text-ink-2 tracking-[0.08em]">
                    Total Filtrado (<span className="font-mono tabular">{filteredContracts.length}</span> Contratos)
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {formatBRL(filteredTotals.valor_mensal)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm">
                    {formatBRL(filteredTotals.valor_anual)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Contracts list (mobile cards) */}
        <div className="md:hidden space-y-3 mb-4">
          {paginatedContracts.length > 0 ? (
            <>
              {paginatedContracts.map((c) => (
                <button
                  type="button"
                  key={`m-${c.empenho}-${c.fornecedor}`}
                  onClick={() => setSelectedContract(c)}
                  className="w-full text-left rounded-lg border border-line bg-surface p-4 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-ink line-clamp-2">{c.fornecedor}</span>
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.06em] mt-0.5 line-clamp-1 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {c.setor}
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line font-mono tabular font-semibold text-[10px] shrink-0">
                      {c.empenho}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 pt-3 border-t border-line">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted block">Mensal</span>
                      <span className="text-sm font-mono tabular font-medium text-ink-2">{formatBRL(c.valor_mensal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted block">Anual</span>
                      <span className="text-sm font-mono tabular font-semibold text-ink">{formatBRL(c.valor_anual)}</span>
                    </div>
                  </div>
                </button>
              ))}
              {/* Total filtrado (mobile) */}
              <div className="rounded-lg border-2 border-line-strong bg-surface-2 p-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-ink-2 tracking-[0.08em]">
                  Total (<span className="font-mono tabular">{filteredContracts.length}</span>)
                </span>
                <div className="text-right">
                  <span className="text-[10px] font-mono tabular font-medium text-muted block">{formatBRL(filteredTotals.valor_mensal)} /mês</span>
                  <span className="text-sm font-mono tabular font-semibold text-ink">{formatBRL(filteredTotals.valor_anual)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted font-medium text-sm rounded-lg border border-dashed border-line bg-surface-2">
              Nenhum contrato encontrado com os filtros selecionados.
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {filteredContracts.length > 0 && (
          <div className="flex items-center justify-between px-2 pt-2">
            <span className="text-xs font-semibold text-ink-2 uppercase tracking-[0.06em]">
              Página <span className="font-mono tabular">{currentPage}</span> de <span className="font-mono tabular">{totalPages}</span> (<span className="font-mono tabular">{filteredContracts.length}</span> contratos)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                aria-label="Próxima página"
                className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}

      </Card>

      {/* Contract Detail Modal/Drawer */}
      <AnimatePresence>
        {selectedContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContract(null)}
              className="absolute inset-0 bg-ink/50"
            />

            {/* Modal Content */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Detalhes do contrato: ${selectedContract.fornecedor}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl rounded-xl bg-surface border border-line-strong shadow-[0_12px_40px_rgba(16,24,38,0.18)] p-6 overflow-hidden max-h-[90vh] flex flex-col justify-between z-10"
            >

              {/* Close Button */}
              <button
                onClick={() => setSelectedContract(null)}
                aria-label="Fechar detalhes do contrato"
                className="absolute top-5 right-5 p-1.5 rounded-md hover:bg-surface-2 text-muted hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors border border-transparent hover:border-line"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Contractor info */}
              <div className="pr-10 mb-6">
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-brand-50 text-brand border border-brand/20 uppercase tracking-[0.08em]">
                  Ficha Orçamentária: <span className="font-mono tabular">{selectedContract.ficha || "n/a"}</span>
                </span>
                <h3 className="font-display text-xl font-bold text-ink tracking-tight mt-2 line-clamp-2">
                  {selectedContract.fornecedor}
                </h3>
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-[0.06em] mt-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-muted shrink-0" />
                  {selectedContract.setor}
                </p>
              </div>

              {/* Description & Metadata grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 overflow-y-auto pr-1">
                
                {/* Historico / Object */}
                <div className="md:col-span-8 space-y-4">
                  <div className="bg-surface-2 rounded-lg border border-line p-4">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] block mb-1">Histórico / Objeto do Empenho</span>
                    <p className="text-xs text-ink-2 font-medium leading-relaxed leading-5">
                      {selectedContract.historico}
                    </p>
                  </div>

                  {/* Monthly Installments Chart */}
                  <div className="bg-surface-2 rounded-lg border border-line p-4">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] block mb-2">Cronograma de Parcelas Planejadas</span>
                    <div className="w-full h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={contractScheduleData}
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: COLORS.axis, fontSize: 8, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: COLORS.axisMuted, fontSize: 8 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                          />
                          <Tooltip
                            formatter={(val: any) => [formatBRL(Number(val)), "Valor da Parcela"]}
                            contentStyle={TOOLTIP_STYLE}
                            cursor={{ fill: "rgba(27,58,107,0.06)" }}
                          />
                          <Bar dataKey="Valor Parcela" fill={COLORS.brand} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Contract Specs */}
                <div className="md:col-span-4 space-y-4">

                  {/* Empenho Code */}
                  <div className="bg-surface-2 rounded-lg border border-line p-4">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] block">Código Empenho</span>
                    <span className="text-sm font-semibold text-ink font-mono tabular mt-1 block">{selectedContract.empenho}</span>
                  </div>

                  {/* Contrato Number */}
                  <div className="bg-surface-2 rounded-lg border border-line p-4">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] block">Número do Contrato</span>
                    <span className="text-sm font-semibold text-ink font-mono tabular mt-1 block">{selectedContract.contrato}</span>
                  </div>

                  {/* Fonte de Recurso */}
                  <div className="bg-surface-2 rounded-lg border border-line p-4">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-[0.08em] block">Fonte de Recurso</span>
                    <span className="text-xs font-semibold text-ink mt-1 block leading-relaxed">{selectedContract.fonte_recurso || "—"}</span>
                  </div>

                  {/* Monthly Value */}
                  <div className="rounded-lg border p-4 bg-neg-50 border-neg/20">
                    <span className="text-[10px] font-bold text-neg uppercase tracking-[0.08em] block">Mensalidade Média</span>
                    <span className="text-md font-mono tabular font-semibold text-neg mt-1 block">{formatBRL(selectedContract.valor_mensal)}</span>
                  </div>

                  {/* Annual Value */}
                  <div className="rounded-lg border p-4 bg-neg-50 border-neg/30">
                    <span className="text-[10px] font-bold text-neg uppercase tracking-[0.08em] block">Valor Total Anual</span>
                    <span className="text-lg font-mono tabular font-bold text-neg mt-1 block">{formatBRL(selectedContract.valor_anual)}</span>
                  </div>

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
