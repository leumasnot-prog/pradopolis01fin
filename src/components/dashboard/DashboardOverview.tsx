"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Receipt, Wallet, AlertCircle, Calculator, X, Landmark, PieChart as PieIcon, TrendingDown, ArrowRight } from "lucide-react";
import dbDataRaw from "@/data/dashboard_data.json";
import { formatBRL } from "@/lib/format";
import { getFiscalStatus, type FiscalLevel } from "@/lib/fiscal";
import { AnimatedNumber, SectionHeader, cn, FitValue } from "@/components/ui/primitives";

// Type assertions for imported JSON to ensure TypeScript is happy
const dbData = dbDataRaw as any;

// Paleta cívica para os gráficos recharts (sem "candy", sem gradientes).
const chartColors = {
  brand: "#1B3A6B", // realizado / primário
  pos: "#1F7A4D", // receita / crédito
  neg: "#B3261E", // despesa / déficit
  warn: "#9A6700", // atenção / limite
  // Composição da receita — tons institucionais derivados da paleta.
  pieColors: ["#1B3A6B", "#1F7A4D", "#9A6700", "#475467", "#C2C9D2"],
};

// Mapeia o nível fiscal para utilitários de cor do design system.
const LEVEL_TEXT: Record<FiscalLevel, string> = {
  healthy: "text-pos",
  attention: "text-warn",
  critical: "text-neg",
};
const LEVEL_ALERT: Record<FiscalLevel, string> = {
  healthy: "text-pos bg-pos-50 border-pos/25",
  attention: "text-warn bg-warn-50 border-warn/25",
  critical: "text-neg bg-neg-50 border-neg/25",
};
const LEVEL_DOT: Record<FiscalLevel, string> = {
  healthy: "bg-pos",
  attention: "bg-warn",
  critical: "bg-neg",
};

export function DashboardOverview({ onNavigate, user }: { onNavigate?: (tab: string) => void; user?: { email: string; allowed_screens?: string | null } | null }) {
  const activeYear = "2026";
  const prefersReducedMotion = useReducedMotion();
  const [receitaAjuste, setReceitaAjuste] = useState(0); // em percentual (0 a 15)
  const [despesaAjuste, setDespesaAjuste] = useState(0); // em percentual (0 a 15)
  const [showInadimplenciaModal, setShowInadimplenciaModal] = useState(false);
  const [viewMode, setViewMode] = useState<"anual" | "real">("anual");

  const yearData = dbData.data[activeYear];
  const orcamentoConsolidado = dbData.data.orcamento_consolidado;

  const receitaBase = yearData?.resumo.receita_total || 0;
  const despesaBase = yearData?.resumo.despesa_total || 0;

  // Inadimplencia preview calc (apenas para 2026)
  const inadiTotal = activeYear === "2026"
    ? (orcamentoConsolidado?.inadimplencia.reduce((sum: number, item: any) => sum + item.valor_inadimplente, 0) || 0)
    : 0;

  const valorAjusteReceita = receitaBase * (receitaAjuste / 100);
  const valorAjusteDespesa = despesaBase * (despesaAjuste / 100);

  const receitaAjustada = receitaBase + valorAjusteReceita;
  const despesaAjustada = despesaBase - valorAjusteDespesa;

  // Saldo deduz a perda projetada por inadimplência em 2026
  const saldoAjustado = receitaAjustada - despesaAjustada - inadiTotal;

  // Comprometimento medido em relação à receita líquida real
  const receitaLiquidaDisponivel = receitaAjustada - inadiTotal;
  const indiceVal = receitaLiquidaDisponivel > 0
    ? (despesaAjustada / receitaLiquidaDisponivel) * 100
    : 0;

  const lastClosedMonth = 5; // Maio

  // YTD (Jan-Mai) calculations
  const ytdReceita = yearData?.mensal
    .filter((d: any) => d.mes_num <= lastClosedMonth)
    .reduce((sum: number, d: any) => sum + d.receita, 0) || 0;

  const ytdDespesa = yearData?.mensal
    .filter((d: any) => d.mes_num <= lastClosedMonth)
    .reduce((sum: number, d: any) => sum + d.despesa, 0) || 0;

  const ytdPerda = inadiTotal * (lastClosedMonth / 12);
  const ytdSaldo = ytdReceita - ytdDespesa - ytdPerda;
  const currentSaldo = viewMode === "real" ? ytdSaldo : saldoAjustado;

  // Monthly Chart Data Prep
  const monthlyData = yearData?.mensal.map((d: any) => ({
    name: d.mes_nome.substring(0, 3),
    Arrecadacao: d.receita * (1 + receitaAjuste / 100),
    GastoFixo: d.despesa * (1 - despesaAjuste / 100),
    isEstimativa: activeYear === "2026" && d.mes_num >= 6,
  })) || [];

  // Composicao Chart Data Prep (Tesouro)
  const composicaoData = yearData?.receitas_por_categoria.map((d: any) => ({
    name: d.categoria,
    value: d.valor * (1 + receitaAjuste / 100),
  })) || [];

  // Lógica de classificação fiscal centralizada em src/lib/fiscal.ts
  const { level, statusText, explanationText } = getFiscalStatus({
    activeYear,
    indiceVal,
    inadiTotal,
    receitaLiquidaDisponivel,
    despesaAjustada,
    saldoAjustado,
  });

  // Eixo do medidor linear de limiar: 0% → 120% (o índice pode passar de 100).
  const METER_MAX = 120;
  const markerPos = Math.min(Math.max(indiceVal / METER_MAX, 0), 1) * 100;
  // Larguras das zonas em relação ao eixo de 0–120%.
  const zoneIdeal = (70 / METER_MAX) * 100;
  const zoneLimite = ((85 - 70) / METER_MAX) * 100;
  const zoneRisco = ((METER_MAX - 85) / METER_MAX) * 100;
  const meterValueColor = LEVEL_TEXT[level];

  // Cifras do demonstrativo (depende do modo de visualização).
  const ledgerReceita = viewMode === "real" ? ytdReceita : receitaAjustada;
  const ledgerDespesa = viewMode === "real" ? ytdDespesa : despesaAjustada;
  const ledgerPerda = viewMode === "real" ? ytdPerda : inadiTotal;

  if (!yearData) return null;

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-16">

      {/* Top Header / Year Selector (2025 removido) */}
      <div className="mb-8">
        <SectionHeader
          title="Recursos Próprios (Tesouro)"
          subtitle="Visão geral da saúde fiscal e execução orçamentária do Tesouro em 2026"
          badge={
            dbData.last_updated ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] bg-surface-2 text-ink-2 px-2.5 py-1 rounded-md border border-line">
                Atualizado: {dbData.last_updated}
              </span>
            ) : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 2xl:gap-8">

        {/* Coluna Esquerda: Saúde Fiscal (HERÓI) + Gráfico Evolução */}
        <div className="col-span-1 md:col-span-7 xl:col-span-8 flex flex-col gap-6">

          {/* ───────────────────────────────────────────────────────────
              HERÓI — Saúde Fiscal do Tesouro.
              Elemento de assinatura: figura grande, medidor linear de
              limiar e déficit em destaque com régua dupla "documento".
              ─────────────────────────────────────────────────────────── */}
          <section
            aria-label="Saúde fiscal do Tesouro"
            className={cn(
              "rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] overflow-hidden",
            )}
          >
            {/* Cabeçalho do demonstrativo */}
            <div className="flex flex-wrap items-start justify-between gap-3 px-6 sm:px-8 pt-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                  Tesouro · Exercício 2026
                </span>
                <h3 className="font-display text-xl font-bold text-ink tracking-tight mt-1">
                  Saúde Fiscal do Tesouro
                </h3>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-md border",
                  LEVEL_ALERT[level],
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", LEVEL_DOT[level])} aria-hidden />
                {statusText}
              </span>
            </div>

            <div className="px-6 sm:px-8 pb-8 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6">

              {/* Figura grande do índice + medidor linear */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                    Índice de Comprometimento
                  </span>
                  <div className={cn("font-display font-bold tracking-tight leading-none mt-1.5 text-6xl tabular", meterValueColor)}>
                    <AnimatedNumber value={indiceVal} type="percent" />
                  </div>
                  <p className="text-xs font-medium text-ink-2 mt-2">
                    Despesa fixa sobre a receita própria líquida (após perdas)
                  </p>
                </div>

                {/* Medidor linear de limiar — zonas rotuladas + marcador */}
                <ThresholdMeter
                  markerPos={markerPos}
                  indiceVal={indiceVal}
                  zoneIdeal={zoneIdeal}
                  zoneLimite={zoneLimite}
                  zoneRisco={zoneRisco}
                  level={level}
                  reduce={!!prefersReducedMotion}
                />
              </div>

              {/* Texto explicativo + déficit em destaque (régua dupla) */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-5">
                <div className={cn("rounded-lg border p-4", LEVEL_ALERT[level])}>
                  <p className="text-xs font-medium leading-relaxed text-ink">
                    {explanationText}
                  </p>
                </div>

                {/* Déficit em destaque, moldura de documento oficial */}
                <div className="rule-double pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                    {currentSaldo < 0 ? "Déficit projetado" : "Superávit projetado"}
                    {activeYear === "2026" && (viewMode === "real" ? " · Jan–Mai" : " · Anual")}
                  </span>
                  <FitValue
                    max={26}
                    min={14}
                    className={cn(
                      "font-mono font-bold tracking-tight mt-1.5 tabular",
                      currentSaldo < 0 ? "text-neg" : "text-pos",
                    )}
                  >
                    {currentSaldo < 0 ? "−" : "+"} {formatBRL(Math.abs(currentSaldo))}
                  </FitValue>
                  {activeYear === "2026" && (
                    <p className="text-[11px] font-medium text-ink-2 mt-2 leading-relaxed">
                      Acumulado real (Jan–Mai):{" "}
                      <span className="font-mono tabular text-neg font-semibold">
                        −{formatBRL(Math.abs(ytdReceita - ytdDespesa))}
                      </span>{" "}
                      ({formatBRL(Math.abs(ytdSaldo))} com perda projetada)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Bar Chart — Evolução Mensal */}
          <div className="rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                  Tesouro · Fluxo de caixa 2026
                </span>
                <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Evolução Mensal</h4>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface-2 px-3.5 py-2 rounded-lg border border-line">
                <LegendDot className="bg-pos" label="Arrecadação" />
                <LegendDot className="bg-pos/40 border border-dashed border-pos" label="Estimada" />
                <LegendDot className="bg-neg" label="Gasto fixo" />
                <LegendDot className="bg-neg/40 border border-dashed border-neg" label="Projetada" />
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7DCE3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#475467", fontSize: 12 }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#8A94A6", fontSize: 12 }}
                    tickFormatter={(val) => val === 0 ? "R$ 0" : "R$ " + (val / 1000000).toFixed(1).replace(".0", "") + "M"}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(16,24,38,0.04)" }}
                    contentStyle={civicTooltip}
                    labelStyle={{ color: "#101826", fontWeight: 700, fontSize: 12, marginBottom: 4 }}
                    itemStyle={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                    formatter={(value: any, name: any, item: any) => {
                      const isEstimativa = item.payload?.isEstimativa;
                      const label = name === "Arrecadacao" ? "Receita (Tesouro)" : "Gasto Fixo";
                      const suffix = isEstimativa ? " (Projeção)" : " (Real)";
                      return [formatBRL(Number(value)) + suffix, label];
                    }}
                  />
                  <Bar dataKey="Arrecadacao" radius={[3, 3, 0, 0]} barSize={20} isAnimationActive={!prefersReducedMotion}>
                    {monthlyData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-arrec-${index}`}
                        fill={chartColors.pos}
                        opacity={entry.isEstimativa ? 0.45 : 1}
                        stroke={entry.isEstimativa ? chartColors.pos : "none"}
                        strokeWidth={entry.isEstimativa ? 1 : 0}
                        strokeDasharray={entry.isEstimativa ? "3 3" : "0"}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="GastoFixo" radius={[3, 3, 0, 0]} barSize={20} isAnimationActive={!prefersReducedMotion}>
                    {monthlyData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-gasto-${index}`}
                        fill={chartColors.neg}
                        opacity={entry.isEstimativa ? 0.45 : 1}
                        stroke={entry.isEstimativa ? chartColors.neg : "none"}
                        strokeWidth={entry.isEstimativa ? 1 : 0}
                        strokeDasharray={entry.isEstimativa ? "3 3" : "0"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Ledger + Simulador + Composição */}
        <div className="col-span-1 md:col-span-5 xl:col-span-4 flex flex-col gap-6">

          {/* ───────────────────────────────────────────────────────────
              Demonstrativo estilo "razão" — Cálculo do Déficit/Saldo.
              Linhas Receita(+), Despesa(−), Perda(−), régua, = Déficit.
              ─────────────────────────────────────────────────────────── */}
          <div className="bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                  Tesouro · 2026
                </span>
                <h4 className="font-display text-base font-bold text-ink tracking-tight mt-0.5">
                  Cálculo do Déficit/Saldo
                </h4>
              </div>
              <div className="flex bg-surface-2 p-0.5 rounded-md border border-line text-[10px] font-bold uppercase tracking-[0.06em]">
                <button
                  onClick={() => setViewMode("anual")}
                  aria-pressed={viewMode === "anual"}
                  className={cn(
                    "px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    viewMode === "anual" ? "bg-surface text-ink border border-line" : "text-muted hover:text-ink-2",
                  )}
                >
                  Anual
                </button>
                <button
                  onClick={() => setViewMode("real")}
                  aria-pressed={viewMode === "real"}
                  className={cn(
                    "px-2.5 py-1 rounded-[5px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    viewMode === "real" ? "bg-surface text-ink border border-line" : "text-muted hover:text-ink-2",
                  )}
                >
                  Jan–Mai
                </button>
              </div>
            </div>

            {/* Razão: rótulo à esquerda, cifra com sinal à direita */}
            <dl className="text-sm">
              <LedgerRow
                icon={TrendingUp}
                tone="pos"
                label="Receita do Tesouro"
                hint="Orçamento líquido"
                sign="+"
                value={<AnimatedNumber value={ledgerReceita} />}
              />
              <LedgerRow
                icon={Receipt}
                tone="neg"
                label="Despesa do Tesouro"
                hint="Custeio e pessoal"
                sign="−"
                value={<AnimatedNumber value={ledgerDespesa} />}
              />
              <LedgerRow
                icon={AlertCircle}
                tone="warn"
                label="Perda (Inadimplência)"
                hint={viewMode === "real" ? "Proporcional Jan–Mai" : "Projetada"}
                sign="−"
                value={activeYear === "2026" ? <AnimatedNumber value={ledgerPerda} /> : "N/A"}
                action={
                  activeYear === "2026" ? (
                    <button
                      onClick={() => setShowInadimplenciaModal(true)}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] rounded bg-warn-50 hover:bg-warn-50/70 text-warn border border-warn/25 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn"
                    >
                      Saiba mais
                    </button>
                  ) : undefined
                }
              />

              {/* Régua de soma */}
              <div className="rule-double my-2" aria-hidden />

              {/* Resultado: Déficit / Saldo — destaque, empilhado para caber a cifra cheia */}
              <div className="py-2">
                <dt className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                      currentSaldo < 0 ? "bg-neg-50 text-neg" : "bg-pos-50 text-pos",
                    )}
                  >
                    <Wallet className="w-4 h-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-[0.06em] text-ink">
                      {currentSaldo < 0 ? "Déficit do Tesouro" : "Saldo do Tesouro"}
                    </span>
                    <span className="block text-[10px] font-medium text-muted mt-0.5">
                      {activeYear === "2026"
                        ? `${currentSaldo < 0 ? "Déficit" : "Superávit"} ${viewMode === "real" ? "real acumulado" : "real projetado"}`
                        : "Saldo para investimentos"}
                    </span>
                  </span>
                </dt>
                <dd
                  className={cn(
                    "mt-1.5 pl-[42px] font-mono tabular text-xl font-bold whitespace-nowrap",
                    currentSaldo < 0 ? "text-neg" : "text-pos",
                  )}
                >
                  {currentSaldo < 0 ? "−" : "+"} {formatBRL(Math.abs(currentSaldo))}
                </dd>
              </div>
            </dl>
          </div>

          {/* Painel do Simulador de Ajuste */}
          <div className="rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand">
                  <Calculator className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                    Cenário
                  </span>
                  <h4 className="font-display text-base font-bold text-ink tracking-tight">
                    Simulador de Equilíbrio
                  </h4>
                </div>
              </div>
              <p className="text-xs font-medium text-ink-2 mt-2">
                Simule ajustes de arrecadação e despesa.
              </p>

              <div className="space-y-5 mt-6">
                {/* Slider 1: Receita */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink-2">Aumento de Receita</span>
                    <span className="font-mono tabular text-pos">+{receitaAjuste.toString().replace(".", ",")}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={receitaAjuste}
                    onChange={(e) => setReceitaAjuste(parseFloat(e.target.value))}
                    aria-label="Aumento de receita em percentual"
                    className="w-full h-1.5 bg-surface-2 rounded-md appearance-none cursor-pointer accent-pos focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pos"
                  />
                  <div className="flex justify-between text-[10px] font-medium text-muted">
                    <span>0%</span>
                    <span className="font-mono tabular">{formatBRL(valorAjusteReceita)} adicionais</span>
                    <span>15%</span>
                  </div>
                </div>

                {/* Slider 2: Despesa */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink-2">Redução de Despesa</span>
                    <span className="font-mono tabular text-neg">−{despesaAjuste.toString().replace(".", ",")}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={despesaAjuste}
                    onChange={(e) => setDespesaAjuste(parseFloat(e.target.value))}
                    aria-label="Redução de despesa em percentual"
                    className="w-full h-1.5 bg-surface-2 rounded-md appearance-none cursor-pointer accent-neg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neg"
                  />
                  <div className="flex justify-between text-[10px] font-medium text-muted">
                    <span>0%</span>
                    <span className="font-mono tabular">{formatBRL(valorAjusteDespesa)} economizados</span>
                    <span>15%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Feedback */}
            <div className="mt-6 border-t border-line pt-4">
              {saldoAjustado >= 0 ? (
                <div className="p-3 bg-pos-50 border border-pos/25 rounded-lg flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-pos flex items-center justify-center text-white shrink-0 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-pos">
                      Equilíbrio Alcançado
                    </h5>
                    <p className="text-[11px] text-ink-2 font-medium leading-relaxed mt-0.5">
                      O déficit foi zerado. Projeção de superávit de{" "}
                      <strong className="font-mono tabular text-pos">{formatBRL(saldoAjustado)}</strong> e índice de{" "}
                      <strong className="font-mono tabular">{indiceVal.toFixed(1).replace(".", ",")}%</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-warn-50 border border-warn/25 rounded-lg flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-warn flex items-center justify-center text-white shrink-0 font-bold text-xs">
                    !
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-warn">
                      Ainda há déficit
                    </h5>
                    <p className="text-[11px] text-ink-2 font-medium leading-relaxed mt-0.5">
                      Ajuste os controles para cobrir o déficit restante de{" "}
                      <strong className="font-mono tabular text-neg">{formatBRL(Math.abs(saldoAjustado))}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeYear === "2026" && (
                <div className="mt-4 p-3 bg-surface-2 border border-line rounded-lg text-[11px] text-ink-2 font-medium leading-relaxed">
                  O saldo projetado de 2026 já deduz <strong className="font-mono tabular">{formatBRL(inadiTotal)}</strong> correspondentes às perdas por inadimplência e à reforma do IRRF (23%).
                </div>
              )}

              {(receitaAjuste > 0 || despesaAjuste > 0) && (
                <button
                  onClick={() => {
                    setReceitaAjuste(0);
                    setDespesaAjuste(0);
                  }}
                  className="mt-3 w-full py-2 px-3 rounded-lg border border-line text-[11px] font-semibold text-ink-2 hover:text-ink hover:border-line-strong hover:bg-surface-2 transition-colors text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Resetar simulação
                </button>
              )}
            </div>
          </div>

          {/* Side Component (Doughnut + Breakdown) */}
          <div className="rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 sm:p-8 flex flex-col">
            <div className="mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted block">
                Tesouro · 2026
              </span>
              <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Composição da Receita</h4>
            </div>
            <div className="h-[200px] w-full mb-8 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={composicaoData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive={!prefersReducedMotion}
                  >
                    {composicaoData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors.pieColors[index % chartColors.pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={civicTooltip}
                    itemStyle={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                    formatter={(value: any, name: any) => [formatBRL(Number(value)), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda da composição da receita */}
            <div className="grid grid-cols-1 gap-2 mb-8">
              {composicaoData.map((entry: any, index: number) => {
                const total = composicaoData.reduce((s: number, d: any) => s + d.value, 0);
                const pct = total > 0 ? (entry.value / total) * 100 : 0;
                return (
                  <div key={index} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: chartColors.pieColors[index % chartColors.pieColors.length] }}
                      />
                      <span className="font-medium text-ink-2 truncate">{entry.name}</span>
                    </span>
                    <span className="font-mono tabular font-semibold text-ink shrink-0">{pct.toFixed(1).replace(".", ",")}%</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto">
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-4">
                Principais Despesas Fixas
              </h5>
              <div className="flex flex-col gap-4">
                {yearData.despesas_por_categoria.map((cat: any, index: number) => {
                  const adjustedVal = cat.valor * (1 - despesaAjuste / 100);
                  const percentage = despesaAjustada > 0 ? (adjustedVal / despesaAjustada) * 100 : 0;
                  return (
                    <div key={index} className="group">
                      {/* Linha 1: ícone + categoria */}
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-neg-50 text-neg shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <h5 className="text-sm font-semibold text-ink truncate">{cat.categoria}</h5>
                      </div>
                      {/* Linha 2: participação à esquerda, valor à direita */}
                      <div className="mt-1 flex items-baseline justify-between gap-2 pl-[42px]">
                        <span className="text-[11px] font-medium text-muted font-mono tabular">
                          {percentage.toFixed(1).replace(".", ",")}% do total
                        </span>
                        <span className="font-mono tabular text-sm font-semibold text-ink whitespace-nowrap">
                          {formatBRL(adjustedVal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação rápida para os demais módulos — orienta o usuário a partir da visão geral */}
      {onNavigate && (() => {
        const allowedShortcuts = [
          {
            tab: "receita",
            title: "Arrecadação",
            desc: "Estrutura completa da previsão de receita por fonte de recurso.",
            icon: Landmark,
            iconBg: "bg-pos-50",
            iconColor: "text-pos",
          },
          {
            tab: "despesas",
            title: "Despesas Fixas",
            desc: "Detalhamento dos gastos recorrentes e contratos do Tesouro.",
            icon: TrendingDown,
            iconBg: "bg-neg-50",
            iconColor: "text-neg",
          },
          {
            tab: "orcamento",
            title: "Orçamento",
            desc: "Dotação autorizada e execução orçamentária por ficha e setor.",
            icon: PieIcon,
            iconBg: "bg-brand-50",
            iconColor: "text-brand",
          },
        ].filter(item => {
          if (!user) return true;
          if (user.email === "contabilidade@pradopolis.sp.gov.br") return true;
          if (!user.allowed_screens) return true;
          const allowedList = user.allowed_screens.split(",").map(s => s.trim());
          return allowedList.includes(item.tab);
        });

        if (allowedShortcuts.length === 0) return null;

        return (
          <div className="mt-8">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-4">Explore os detalhes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {allowedShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.tab}
                    onClick={() => onNavigate(item.tab)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="group text-left rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 flex flex-col gap-3 cursor-pointer transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", item.iconBg, item.iconColor)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-display text-base font-bold text-ink tracking-tight">{item.title}</h4>
                      <p className="text-xs font-medium text-ink-2 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Inadimplencia Detail Modal */}
      <AnimatePresence>
        {showInadimplenciaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInadimplenciaModal(false)}
              className="absolute inset-0 bg-ink/50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={{ type: "spring", duration: prefersReducedMotion ? 0 : 0.4 }}
              role="dialog"
              aria-modal="true"
              aria-label="Inadimplência projetada 2026"
              className="relative w-full max-w-2xl rounded-xl bg-surface border border-line shadow-[0_12px_40px_rgba(16,24,38,0.14)] p-6 overflow-hidden max-h-[90vh] flex flex-col z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowInadimplenciaModal(false)}
                aria-label="Fechar"
                className="absolute top-5 right-5 p-1.5 rounded-md hover:bg-surface-2 text-muted hover:text-ink transition-colors border border-transparent hover:border-line cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-warn-50 text-warn border border-warn/25 uppercase tracking-[0.08em]">
                  Detalhamento de Perdas
                </span>
                <h3 className="font-display text-xl font-bold text-ink tracking-tight mt-2">
                  Inadimplência Projetada (2026)
                </h3>
                <p className="text-xs font-medium text-ink-2 mt-1">
                  Detalhamento das perdas previstas por tipo de receita para o ano de 2026.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line bg-surface mb-6 max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-2 border-b border-line text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em]">
                      <th className="py-3 px-4">Receita / Imposto</th>
                      <th className="py-3 px-4 text-right">Valor Orçado</th>
                      <th className="py-3 px-4 text-right">Inadimplência</th>
                      <th className="py-3 px-4 text-right">Perda Estimada</th>
                      <th className="py-3 px-4 text-right">Receita Líquida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink-2 text-xs font-medium">
                    {orcamentoConsolidado?.inadimplencia.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-surface-2 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-ink">{item.imposto}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular">{formatBRL(item.receita_bruta)}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular font-semibold text-neg">
                          {item.percentual_inadimplencia.toFixed(1).replace(".", ",")}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular font-semibold text-neg">{formatBRL(item.valor_inadimplente)}</td>
                        <td className="py-3.5 px-4 text-right font-mono tabular font-semibold text-pos">{formatBRL(item.receita_liquida)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-2 border-t-2 border-line-strong font-semibold text-ink text-xs">
                      <td className="py-3 px-4">Total de Perdas</td>
                      <td className="py-3 px-4 text-right font-mono tabular">
                        {formatBRL(orcamentoConsolidado?.inadimplencia.reduce((sum: number, item: any) => sum + item.receita_bruta, 0) || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular text-neg">
                        {((inadiTotal / (orcamentoConsolidado?.inadimplencia.reduce((sum: number, item: any) => sum + item.receita_bruta, 0) || 1)) * 100).toFixed(1).replace(".", ",")}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular text-neg font-bold">{formatBRL(inadiTotal)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular text-pos font-bold">
                        {formatBRL((orcamentoConsolidado?.inadimplencia.reduce((sum: number, item: any) => sum + item.receita_liquida, 0) || 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-4 rounded-lg bg-warn-50 border border-warn/25 text-xs text-ink font-medium leading-relaxed">
                A inadimplência projetada estima a perda de receita com base em dados históricos e na perda de arrecadação esperada. Para o IRRF, é considerada uma perda estimada fixa de 23% de retenção na fonte sobre a folha bruta.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Subcomponentes locais
   ────────────────────────────────────────────────────────────── */

// Estilo de tooltip cívico compartilhado pelos gráficos recharts.
const civicTooltip = {
  borderRadius: "10px",
  border: "1px solid #D7DCE3",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 16px rgba(16,24,38,0.08)",
  color: "#101826",
  fontSize: "12px",
} as const;

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("block h-2.5 w-2.5 rounded-full", className)} />
      <span className="text-[11px] font-medium text-ink-2">{label}</span>
    </span>
  );
}

const ROW_TONE = {
  pos: { bg: "bg-pos-50", text: "text-pos" },
  neg: { bg: "bg-neg-50", text: "text-neg" },
  warn: { bg: "bg-warn-50", text: "text-warn" },
} as const;

function LedgerRow({
  icon: Icon,
  tone,
  label,
  hint,
  sign,
  value,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof ROW_TONE;
  label: string;
  hint: string;
  sign: "+" | "−";
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  const t = ROW_TONE[tone];
  return (
    <div className="py-2.5">
      {/* Linha 1: ícone + rótulo (+ ação opcional) */}
      <dt className="flex items-center gap-2.5">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", t.bg, t.text)}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="text-xs font-semibold text-ink">{label}</span>
        {action}
      </dt>
      {/* Linha 2: nota à esquerda, cifra com sinal alinhada à direita —
          empilhar evita colisão quando a coluna é estreita. */}
      <dd className="mt-1 flex items-baseline justify-between gap-2 pl-[42px]">
        <span className="text-[10px] font-medium text-muted">{hint}</span>
        <span className={cn("font-mono tabular text-sm font-semibold whitespace-nowrap", t.text)}>
          {sign} {value}
        </span>
      </dd>
    </div>
  );
}

/**
 * Medidor linear de limiar — o elemento de assinatura.
 * Barra horizontal com zonas rotuladas (Ideal / Limite / Risco) e um
 * marcador na posição do índice atual. Respeita prefers-reduced-motion.
 */
function ThresholdMeter({
  markerPos,
  indiceVal,
  zoneIdeal,
  zoneLimite,
  zoneRisco,
  level,
  reduce,
}: {
  markerPos: number;
  indiceVal: number;
  zoneIdeal: number;
  zoneLimite: number;
  zoneRisco: number;
  level: FiscalLevel;
  reduce: boolean;
}) {
  const markerColor =
    level === "critical" ? "var(--neg)" : level === "attention" ? "var(--warn)" : "var(--pos)";

  return (
    <div
      role="img"
      aria-label={`Índice de comprometimento ${indiceVal.toFixed(1).replace(".", ",")}%. Zonas: Ideal abaixo de 70%, Limite entre 70% e 85%, Risco acima de 85%.`}
    >
      {/* Barra com as três zonas */}
      <div className="relative h-4 w-full rounded-md overflow-hidden border border-line bg-surface-2">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-pos/30" style={{ width: `${zoneIdeal}%` }} />
          <div className="h-full bg-warn/35" style={{ width: `${zoneLimite}%` }} />
          <div className="h-full bg-neg/30" style={{ width: `${zoneRisco}%` }} />
        </div>

        {/* Linhas de limiar (70% e 85%) */}
        <span className="absolute top-0 bottom-0 w-px bg-line-strong" style={{ left: `${zoneIdeal}%` }} aria-hidden />
        <span className="absolute top-0 bottom-0 w-px bg-line-strong" style={{ left: `${zoneIdeal + zoneLimite}%` }} aria-hidden />

        {/* Marcador do valor atual */}
        <motion.span
          className="absolute top-[-3px] bottom-[-3px] w-[3px] rounded-full"
          style={{ backgroundColor: markerColor, left: `${markerPos}%`, marginLeft: -1.5 }}
          initial={{ left: reduce ? `${markerPos}%` : "0%" }}
          animate={{ left: `${markerPos}%` }}
          transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
          aria-hidden
        />
      </div>

      {/* Rótulos das zonas */}
      <div className="mt-2 flex w-full text-[10px] font-semibold tabular">
        <span className="text-pos" style={{ width: `${zoneIdeal}%` }}>Ideal &lt;70%</span>
        <span className="text-warn text-center" style={{ width: `${zoneLimite}%` }}>70–85%</span>
        <span className="text-neg text-right" style={{ width: `${zoneRisco}%` }}>Risco &gt;85%</span>
      </div>
      {/* Escala do eixo */}
      <div className="mt-1 flex w-full justify-between text-[10px] font-medium text-muted font-mono tabular">
        <span>0%</span>
        <span>120%</span>
      </div>
    </div>
  );
}
