"use client";

// Card de fita-funil horizontal — substitui os 3 StatCards de execução setorial.
// Mostra Dotação Atual → Empenhado → Liquidado → Pago em uma linha com barra animada.
// Quando dotacaoFolha > 0, exibe badge informativo de quanto da dotação é folha salarial.

import { motion, useReducedMotion } from "framer-motion";
import { Users } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Card } from "@/components/ui/primitives";

interface BudgetFunnelCardProps {
  dotacaoAtual: number;
  dotacaoFolha?: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  year?: number;
  numEmpenhos?: number;
  className?: string;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min((part / total) * 100, 100);
}

function shortBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  return formatBRL(v);
}

interface MetricColProps {
  dot: string;
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  arrow?: boolean;
  children?: React.ReactNode;
}

function MetricCol({ dot, label, value, sub, subColor = "text-ink-2", arrow = false, children }: MetricColProps) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      {arrow && (
        <span className="mt-1 text-ink-2/40 text-sm font-light select-none shrink-0">→</span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
        </div>
        <p className="font-display text-xl font-bold text-ink tracking-tight leading-none">{value}</p>
        <p className={`text-[11px] font-semibold mt-1 ${subColor}`}>{sub}</p>
        {children}
      </div>
    </div>
  );
}

export function BudgetFunnelCard({
  dotacaoAtual,
  dotacaoFolha = 0,
  empenhado,
  liquidado,
  pago,
  year = 2026,
  numEmpenhos,
  className,
}: BudgetFunnelCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const base = dotacaoAtual > 0 ? dotacaoAtual : empenhado;

  const pctEmp = pct(empenhado, base);
  const pctLiq = pct(liquidado, base);
  const pctPag = pct(pago, base);
  const pctFolha = pct(dotacaoFolha, base);

  // Barra: pago (azul) | liquidado-pago (verde) | empenhado-liquidado (amarelo) | restante (cinza)
  const segPag = pctPag;
  const segLiq = pctLiq - pctPag;
  const segEmp = pctEmp - pctLiq;
  const segRest = 100 - pctEmp;

  const dur = prefersReducedMotion ? 0 : 0.9;

  const hasFolha = dotacaoFolha > 0 && dotacaoAtual > 0;

  return (
    <Card className={`p-5 shadow-sm hover:shadow-md transition-all duration-300 ${className ?? ""}`}>
      {/* Cabeçalho */}
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Execução Orçamentária · {year}
        </span>
      </div>

      {/* Métricas em linha */}
      <div className="flex flex-wrap gap-x-6 gap-y-4 mb-5">
        <MetricCol
          dot="bg-ink/70"
          label="Dotação Atual"
          value={shortBRL(dotacaoAtual)}
          sub="100% da base"
        >
          {hasFolha && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md bg-surface-2 border border-line text-[10px] font-semibold text-ink-2">
              <Users className="w-2.5 h-2.5 shrink-0" />
              {shortBRL(dotacaoFolha)} folha
              <span className="text-muted font-medium">
                ({pctFolha.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%)
              </span>
            </span>
          )}
        </MetricCol>
        <MetricCol
          dot="bg-[#C97B00]"
          label="Empenhado"
          value={shortBRL(empenhado)}
          sub={base > 0 ? `${pctEmp.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          subColor="text-[#C97B00] font-bold"
          arrow
        />
        <MetricCol
          dot="bg-pos"
          label="Liquidado"
          value={shortBRL(liquidado)}
          sub={base > 0 ? `${pctLiq.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          subColor="text-pos font-bold"
          arrow
        />
        <MetricCol
          dot="bg-brand"
          label="Pago"
          value={shortBRL(pago)}
          sub={base > 0 ? `${pctPag.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—"}
          subColor="text-brand font-bold"
          arrow
        />
        {numEmpenhos != null && (
          <div className="ml-auto self-center hidden sm:block">
            <span className="text-[10px] font-semibold text-muted">
              <span className="font-mono tabular text-ink font-bold">
                {numEmpenhos.toLocaleString("pt-BR")}
              </span>{" "}
              empenhos
            </span>
          </div>
        )}
      </div>

      {/* Barra de progresso animada */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-surface-2 border border-line/60">
        {/* Pago */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-brand rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${segPag}%` }}
          transition={{ duration: dur, ease: "easeOut", delay: 0 }}
        />
        {/* Liquidado - Pago */}
        <motion.div
          className="absolute inset-y-0 bg-pos"
          initial={{ left: "0%", width: "0%" }}
          animate={{ left: `${segPag}%`, width: `${Math.max(segLiq, 0)}%` }}
          transition={{ duration: dur, ease: "easeOut", delay: prefersReducedMotion ? 0 : 0.05 }}
        />
        {/* Empenhado - Liquidado */}
        <motion.div
          className="absolute inset-y-0 bg-[#C97B00]"
          initial={{ left: "0%", width: "0%" }}
          animate={{ left: `${segPag + Math.max(segLiq, 0)}%`, width: `${Math.max(segEmp, 0)}%` }}
          transition={{ duration: dur, ease: "easeOut", delay: prefersReducedMotion ? 0 : 0.1 }}
        />
        {/* Saldo não empenhado */}
        <motion.div
          className="absolute inset-y-0 right-0 bg-line rounded-r-full"
          initial={{ width: "100%" }}
          animate={{ width: `${Math.max(segRest, 0)}%` }}
          transition={{ duration: dur, ease: "easeOut", delay: 0 }}
        />
      </div>

      {/* Legenda da barra — inclui marcador de folha se disponível */}
      <div className="flex justify-between mt-1.5 relative">
        <span className="text-[10px] font-semibold text-muted">R$ 0</span>
        {hasFolha && (
          <div
            className="absolute top-[-14px] flex flex-col items-center"
            style={{ left: `${pctFolha}%`, transform: "translateX(-50%)" }}
          >
            <span className="w-px h-2.5 bg-ink-2/30" />
            <span className="text-[9px] font-semibold text-ink-2/60 whitespace-nowrap">folha</span>
          </div>
        )}
        <span className="text-[10px] font-semibold text-muted">
          Dotação {shortBRL(dotacaoAtual)}
        </span>
      </div>
    </Card>
  );
}
