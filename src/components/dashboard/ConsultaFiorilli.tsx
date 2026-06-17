"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  TrendingDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  X,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  XCircle,
  Hash,
  Activity,
  Globe,
  Settings as SettingsIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBRL } from "@/lib/format";
import { StatCard, SectionHeader, Card, Spinner } from "@/components/ui/primitives";

interface Expense {
  NumeroEmpenho: string;
  Contrato: string;
  DataEmpenho: string;
  Fornecedor: string;
  CNPJFornecedor: string;
  Historico: string;
  Setor: string;
  Categoria: string;
  Ficha: string;
  ValorEmpenho: number;
  ValorLiquidado: number;
  ValorPago: number;
}

export function ConsultaFiorilli() {
  // Filters State
  const [exercicio, setExercicio] = useState("2026");
  const [diaInicio, setDiaInicio] = useState("01");
  const [mesInicio, setMesInicio] = useState("01");
  const [diaFinal, setDiaFinal] = useState("31");
  const [mesFinal, setMesFinal] = useState("12");
  const [fornecedorInput, setFornecedorInput] = useState("");
  const [cnpjInput, setCnpjInput] = useState("");
  const [tipoListagem, setTipoListagem] = useState("DespesasGerais");

  // Query state (for active search)
  const [activeFilters, setActiveFilters] = useState({
    exercicio: "2026",
    diaInicio: "01",
    mesInicio: "01",
    diaFinal: "31",
    mesFinal: "12",
    fornecedor: "",
    cnpj: "",
    tipo: "DespesasGerais"
  });

  // Table Data & Status
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState<"live" | "simulation" | null>(null);
  const [fiorilliUrl, setFiorilliUrl] = useState("");
  const [error, setError] = useState("");

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "",
    direction: null
  });

  const itemsPerPage = 10;

  // Trigger search on component mount & filter updates
  const fetchExpenses = async () => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams({
        exercicio: activeFilters.exercicio,
        diaInicio: activeFilters.diaInicio,
        mesInicio: activeFilters.mesInicio,
        diaFinal: activeFilters.diaFinal,
        mesFinal: activeFilters.mesFinal,
        fornecedor: activeFilters.fornecedor,
        cnpj: activeFilters.cnpj,
        tipo: activeFilters.tipo
      });

      const res = await fetch(`/api/transparencia/despesas?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error("Falha na resposta do servidor.");
      }
      const data = await res.json();
      setExpenses(data.results || []);
      setApiMode(data.mode);
      setFiorilliUrl(data.fiorilli_url || "");
    } catch (err: any) {
      console.error("Error fetching transparency data:", err);
      setError("Erro ao se conectar ao servidor da transparência ou processar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [activeFilters]);

  // Execute Search action
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveFilters({
      exercicio,
      diaInicio,
      mesInicio,
      diaFinal,
      mesFinal,
      fornecedor: fornecedorInput,
      cnpj: cnpjInput,
      tipo: tipoListagem
    });
  };

  // Reset Filters
  const handleResetFilters = () => {
    setExercicio("2026");
    setDiaInicio("01");
    setMesInicio("01");
    setDiaFinal("31");
    setMesFinal("12");
    setFornecedorInput("");
    setCnpjInput("");
    setTipoListagem("DespesasGerais");
    setCurrentPage(1);
    setActiveFilters({
      exercicio: "2026",
      diaInicio: "01",
      mesInicio: "01",
      diaFinal: "31",
      mesFinal: "12",
      fornecedor: "",
      cnpj: "",
      tipo: "DespesasGerais"
    });
  };

  // Aggregated totals
  const aggregates = useMemo(() => {
    return expenses.reduce(
      (acc, curr) => {
        acc.empenhado += curr.ValorEmpenho;
        acc.liquidado += curr.ValorLiquidado;
        acc.pago += curr.ValorPago;
        return acc;
      },
      { empenhado: 0, liquidado: 0, pago: 0 }
    );
  }, [expenses]);

  // Sorting
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      } else {
        direction = "asc";
      }
    }
    setSortConfig({ key: direction ? key : "", direction });
  };

  const sortedExpenses = useMemo(() => {
    const items = [...expenses];
    if (sortConfig.key && sortConfig.direction) {
      items.sort((a, b) => {
        const valA = a[sortConfig.key as keyof typeof a];
        const valB = b[sortConfig.key as keyof typeof b];

        if (typeof valA === "string" && typeof valB === "string") {
          return sortConfig.direction === "asc"
            ? valA.localeCompare(valB, "pt-BR")
            : valB.localeCompare(valA, "pt-BR");
        } else if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return items;
  }, [expenses, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(expenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedExpenses.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedExpenses, currentPage]);

  // Close modal on Escape
  useEffect(() => {
    if (!selectedExpense) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedExpense(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedExpense]);

  // Helper for sortable columns
  const renderSortableHeader = (label: string, sortKey: string, align: "left" | "right" | "center" = "left") => {
    const isSorted = sortConfig.key === sortKey;
    const justifyClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
    const textAlignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

    const indicator = (
      <span className="text-muted group-hover:text-ink-2 transition-colors shrink-0">
        {!isSorted ? (
          <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
        ) : sortConfig.direction === "asc" ? (
          <ChevronUp className="w-3 h-3 text-brand" />
        ) : (
          <ChevronDown className="w-3 h-3 text-brand" />
        )}
      </span>
    );

    return (
      <th scope="col" className={`p-0 ${textAlignClass}`}>
        <button
          type="button"
          onClick={() => handleSort(sortKey)}
          className={`w-full py-3 px-4 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.08em] cursor-pointer hover:bg-line/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 transition-colors select-none group ${textAlignClass}`}
        >
          <span className={`flex items-center gap-1.5 ${justifyClass}`}>
            {align === "right" && indicator}
            <span>{label}</span>
            {align !== "right" && indicator}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 pb-16">
      
      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          title="Consulta Portal Transparência (Fiorilli API)"
          subtitle="Consumo em tempo real de dados de despesas municipais direto da API de Dados Abertos do Município"
          badge={
            apiMode === "live" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-md border text-pos bg-pos-50 border-pos/25">
                <Globe className="w-3.5 h-3.5" />
                API Conectada (Live)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-md border text-warn bg-warn-50 border-warn/25">
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                Modo Simulação / Off-line
              </span>
            )
          }
        />
      </div>

      {/* Connection Info Notice (only if in simulation/mock mode) */}
      {apiMode === "simulation" && (
        <div className="mb-6 p-4 rounded-lg border bg-warn-50 border-warn/20 text-ink-2 text-xs flex gap-3 items-start">
          <Info className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-warn block">Informação sobre a Conexão Real</span>
            <p className="font-medium leading-relaxed">
              O portal está executando no **Modo de Simulação** com dados mockados dinâmicos porque a URL da Fiorilli no banco está definida como o placeholder padrão ou a conexão falhou. 
              Para conectar-se ao portal de transparência da sua prefeitura em produção, configure a URL da Fiorilli no painel de **Configurações**.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Empenhado"
          value={formatBRL(aggregates.empenhado)}
          subtitle="Soma de valores reservados (empenhados)"
          icon={Wallet}
          iconBgClass="bg-brand-50"
          iconColorClass="text-brand"
        />
        <StatCard
          title="Total Liquidado"
          value={formatBRL(aggregates.liquidado)}
          subtitle="Soma de serviços/materiais entregues"
          icon={Activity}
          iconBgClass="bg-warn-50"
          iconColorClass="text-warn"
        />
        <StatCard
          title="Total Pago"
          value={formatBRL(aggregates.pago)}
          subtitle="Soma de pagamentos efetuados"
          icon={CheckCircle2}
          iconBgClass="bg-pos-50"
          iconColorClass="text-pos"
        />
        <StatCard
          title="Registros Localizados"
          value={expenses.length}
          subtitle="Total retornado pela API"
          icon={FileText}
          iconBgClass="bg-surface-2"
          iconColorClass="text-ink-2"
        />
      </div>

      {/* Filter and Search Form */}
      <Card className="p-6 mb-8">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4 border-b border-line pb-3">
            <Filter className="w-5 h-5 text-brand" />
            <h3 className="font-display text-base font-bold text-ink tracking-tight">Filtros de Consulta em Tempo Real</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Exercicio / Ano */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="exercicioSelect" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                Exercício (Ano)
              </label>
              <select
                id="exercicioSelect"
                value={exercicio}
                onChange={(e) => setExercicio(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 transition-colors"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            {/* Listagem Tipo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tipoSelect" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                Filtro Fiorilli (Mapeamento)
              </label>
              <select
                id="tipoSelect"
                value={tipoListagem}
                onChange={(e) => setTipoListagem(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 transition-colors"
              >
                <option value="DespesasGerais">Despesas Gerais</option>
                <option value="DespesasPorFornecedor">Por Fornecedor</option>
                <option value="DespesasPorOrgao">Por Órgão</option>
                <option value="DespesasPorUnidade">Por Unidade</option>
              </select>
            </div>

            {/* Data Inicial */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                Período Inicial
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Dia Inicial"
                  value={diaInicio}
                  onChange={(e) => setDiaInicio(e.target.value)}
                  className="w-1/2 px-2 py-2.5 text-xs font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none"
                >
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  aria-label="Mês Inicial"
                  value={mesInicio}
                  onChange={(e) => setMesInicio(e.target.value)}
                  className="w-1/2 px-2 py-2.5 text-xs font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Final */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                Período Final
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Dia Final"
                  value={diaFinal}
                  onChange={(e) => setDiaFinal(e.target.value)}
                  className="w-1/2 px-2 py-2.5 text-xs font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none"
                >
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  aria-label="Mês Final"
                  value={mesFinal}
                  onChange={(e) => setMesFinal(e.target.value)}
                  className="w-1/2 px-2 py-2.5 text-xs font-semibold rounded-lg border border-line bg-surface text-ink focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fornecedor input */}
            <div className="flex flex-col gap-1.5 xl:col-span-2">
              <label htmlFor="fornecedorInput" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                Filtro Fornecedor / Objeto
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="fornecedorInput"
                  type="text"
                  value={fornecedorInput}
                  onChange={(e) => setFornecedorInput(e.target.value)}
                  placeholder="Fornecedor, histórico, empenho..."
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 transition-colors"
                />
              </div>
            </div>

            {/* CNPJ Input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cnpjInput" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                Filtro CNPJ Credor
              </label>
              <input
                id="cnpjInput"
                type="text"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 transition-colors font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2.5 sm:col-span-2 md:col-span-4 xl:col-span-5 justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-line text-ink-2 bg-surface hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Limpar Filtros
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-5 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                <span>Buscar Real-Time</span>
              </button>
            </div>

          </div>
        </form>
      </Card>

      {/* Main Results Table Card */}
      <Card className="p-6">
        
        {/* Table Title and Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-brand border border-line">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-lg font-bold text-ink tracking-tight">Despesas do Período</h4>
              <p className="text-xs font-medium text-ink-2">Clique sobre o empenho na listagem para detalhamento integral do fluxo financeiro.</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-muted bg-surface-2 border border-line px-2.5 py-1 rounded-md font-mono tabular">
            {expenses.length} encontrados
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-neg-50 border border-neg/20 text-neg text-xs font-semibold flex items-center gap-2.5 mb-6">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <Spinner className="h-8 w-8 text-brand" />
            <span className="text-ink-2 text-xs font-semibold">Consultando API do Portal Fiorilli...</span>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto max-h-[640px] overflow-y-auto rounded-lg border border-line bg-surface mb-4">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-2 border-b border-line">
                    {renderSortableHeader("Empenho", "NumeroEmpenho", "left")}
                    {renderSortableHeader("Contrato", "Contrato", "left")}
                    {renderSortableHeader("Fornecedor / Credor", "Fornecedor", "left")}
                    {renderSortableHeader("Data", "DataEmpenho", "left")}
                    {renderSortableHeader("Valor Empenhado", "ValorEmpenho", "right")}
                    {renderSortableHeader("Valor Pago", "ValorPago", "right")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <AnimatePresence mode="popLayout">
                    {paginatedExpenses.length > 0 ? (
                      paginatedExpenses.map((expense) => {
                        return (
                          <motion.tr
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={expense.NumeroEmpenho}
                            onClick={() => setSelectedExpense(expense)}
                            className="hover:bg-surface-2 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4 font-mono tabular font-semibold text-xs text-ink-2">
                              <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line group-hover:bg-brand-50 group-hover:text-brand group-hover:border-brand/25 transition-colors">
                                {expense.NumeroEmpenho}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular text-xs text-ink-2 font-semibold">
                              {expense.Contrato}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-ink line-clamp-1 group-hover:text-brand transition-colors">{expense.Fornecedor}</span>
                                <span className="text-[10px] font-semibold text-muted tracking-[0.06em] uppercase mt-0.5 line-clamp-1">{expense.Historico}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs font-semibold text-ink-2 font-mono tabular flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted" />
                                {new Date(expense.DataEmpenho + "T00:00:00").toLocaleDateString("pt-BR")}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular font-semibold text-sm text-ink">
                              {formatBRL(expense.ValorEmpenho)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular font-semibold text-sm text-pos">
                              {formatBRL(expense.ValorPago)}
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-muted font-medium text-sm">
                          Nenhum registro de despesa localizado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 mb-4">
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((expense) => (
                  <button
                    type="button"
                    key={`m-${expense.NumeroEmpenho}`}
                    onClick={() => setSelectedExpense(expense)}
                    className="w-full text-left rounded-lg border border-line bg-surface p-4 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-ink line-clamp-2">{expense.Fornecedor}</span>
                        <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.06em] mt-1 line-clamp-1 flex items-center gap-1.5 font-mono">
                          {expense.CNPJFornecedor}
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line font-mono tabular font-semibold text-[10px] shrink-0">
                        {expense.NumeroEmpenho.split("/").pop()}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3 pt-3 border-t border-line">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted block">Data</span>
                        <span className="text-xs font-mono tabular font-medium text-ink-2">
                          {new Date(expense.DataEmpenho + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted block">Empenhado</span>
                        <span className="text-sm font-mono tabular font-semibold text-ink">{formatBRL(expense.ValorEmpenho)}</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-16 text-center text-muted font-medium text-sm rounded-lg border border-dashed border-line bg-surface-2">
                  Nenhum registro de despesa localizado com os filtros selecionados.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {expenses.length > 0 && (
              <div className="flex items-center justify-between px-2 pt-2 border-t border-line">
                <span className="text-xs font-semibold text-ink-2 uppercase tracking-[0.06em]">
                  Página <span className="font-mono tabular">{currentPage}</span> de <span className="font-mono tabular">{totalPages}</span> (<span className="font-mono tabular">{expenses.length}</span> registros)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    aria-label="Página anterior"
                    className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 cursor-pointer"
                  >
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    aria-label="Próxima página"
                    className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 cursor-pointer"
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </Card>

      {/* Expense Detail Modal / Drawer */}
      <AnimatePresence>
        {selectedExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpense(null)}
              className="absolute inset-0 bg-ink/50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ type: "spring", duration: 0.35 }}
              role="dialog"
              aria-modal="true"
              aria-label={`Detalhamento do empenho ${selectedExpense.NumeroEmpenho}`}
              className="relative w-full max-w-2xl rounded-xl bg-surface border border-line shadow-[0_12px_40px_rgba(16,24,38,0.14)] p-6 overflow-hidden max-h-[90vh] flex flex-col z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedExpense(null)}
                aria-label="Fechar"
                className="absolute top-5 right-5 p-1.5 rounded-md hover:bg-surface-2 text-muted hover:text-ink transition-colors border border-transparent hover:border-line cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-brand-50 text-brand border border-brand/20 uppercase tracking-[0.08em] font-mono">
                  Empenho nº {selectedExpense.NumeroEmpenho}
                </span>
                <h3 className="font-display text-xl font-bold text-ink tracking-tight mt-2">
                  Detalhamento de Fluxo da Despesa
                </h3>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
                
                {/* Basic data cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-surface-2 border border-line rounded-lg">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] block">Data do Empenho</span>
                    <span className="text-xs font-semibold text-ink flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-4 h-4 text-brand shrink-0" />
                      <span className="font-mono tabular">
                        {new Date(selectedExpense.DataEmpenho + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                  </div>
                  <div className="p-3 bg-surface-2 border border-line rounded-lg">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] block">Número do Contrato</span>
                    <span className="text-xs font-semibold text-ink flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-4 h-4 text-brand shrink-0" />
                      <span className="font-mono tabular">{selectedExpense.Contrato}</span>
                    </span>
                  </div>
                </div>

                {/* Fornecedor info */}
                <div className="p-4 border border-line rounded-lg bg-surface">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-[0.1em] block mb-2">Credor / Fornecedor</span>
                  <span className="text-sm font-bold text-ink block">{selectedExpense.Fornecedor}</span>
                  <span className="text-[10px] font-semibold text-ink-2 font-mono mt-1 block">
                    CNPJ/CPF: {selectedExpense.CNPJFornecedor}
                  </span>
                </div>

                {/* Structuring fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-surface-2 border border-line rounded-lg">
                    <span className="text-[9px] font-semibold text-muted uppercase tracking-[0.08em] block">Setor / Secretaria</span>
                    <span className="text-xs font-semibold text-ink block mt-1 line-clamp-2">{selectedExpense.Setor}</span>
                  </div>
                  <div className="p-3 bg-surface-2 border border-line rounded-lg">
                    <span className="text-[9px] font-semibold text-muted uppercase tracking-[0.08em] block">Categoria Econômica</span>
                    <span className="text-xs font-semibold text-ink block mt-1 line-clamp-2">{selectedExpense.Categoria}</span>
                  </div>
                  <div className="p-3 bg-surface-2 border border-line rounded-lg">
                    <span className="text-[9px] font-semibold text-muted uppercase tracking-[0.08em] block">Ficha Orçamentária</span>
                    <span className="text-xs font-mono font-bold text-ink block mt-1">{selectedExpense.Ficha}</span>
                  </div>
                </div>

                {/* Histórico / Objeto */}
                <div className="p-4 border border-line rounded-lg bg-surface-2">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] block mb-2">Histórico Detalhado (Objeto)</span>
                  <p className="text-xs font-medium text-ink leading-relaxed">
                    {selectedExpense.Historico}
                  </p>
                </div>

                {/* Finance breakdown ledger */}
                <div>
                  <span className="text-[10px] font-bold text-brand uppercase tracking-[0.1em] block mb-3">Estágios da Despesa</span>
                  <div className="border border-line rounded-lg overflow-hidden bg-surface">
                    <dl className="divide-y divide-line text-xs">
                      <div className="p-3 flex justify-between items-center hover:bg-surface-2">
                        <dt className="flex items-center gap-2 font-semibold text-ink-2">
                          <span className="h-2 w-2 rounded-full bg-brand" />
                          1. Valor Empenhado (Reservado)
                        </dt>
                        <dd className="font-mono font-bold text-ink tabular">{formatBRL(selectedExpense.ValorEmpenho)}</dd>
                      </div>
                      <div className="p-3 flex justify-between items-center hover:bg-surface-2">
                        <dt className="flex items-center gap-2 font-semibold text-ink-2">
                          <span className="h-2 w-2 rounded-full bg-warn" />
                          2. Valor Liquidado (Entregue)
                        </dt>
                        <dd className="font-mono font-bold text-ink-2 tabular">{formatBRL(selectedExpense.ValorLiquidado)}</dd>
                      </div>
                      <div className="p-3 flex justify-between items-center hover:bg-surface-2">
                        <dt className="flex items-center gap-2 font-semibold text-ink-2">
                          <span className="h-2 w-2 rounded-full bg-pos" />
                          3. Valor Pago (Quitado)
                        </dt>
                        <dd className="font-mono font-bold text-pos tabular">{formatBRL(selectedExpense.ValorPago)}</dd>
                      </div>
                      
                      {/* Double line separator */}
                      <div className="rule-double" />
                      
                      {/* Restos a pagar calculation */}
                      <div className="p-3 bg-surface-2 flex justify-between items-center">
                        <dt className="flex items-center gap-2 font-bold text-ink">
                          Saldo a Liquidar / Pagar
                        </dt>
                        <dd className="font-mono font-bold text-neg tabular">
                          {formatBRL(selectedExpense.ValorEmpenho - selectedExpense.ValorPago)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-line flex justify-end">
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="px-5 py-2 bg-brand hover:bg-brand-ink text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Fechar Detalhes
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
