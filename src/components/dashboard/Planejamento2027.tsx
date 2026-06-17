"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  CheckCircle2, 
  User, 
  Clock, 
  FileText, 
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader, StatusBadge, Card } from "@/components/ui/primitives";
import { ListChecks, Percent } from "lucide-react";

interface PlanningTask {
  periodo: string;
  etapa: string;
  atividade: string;
  responsavel: string;
  concluido: boolean;
}

const ldoData: PlanningTask[] = [
  {
    periodo: "Maio",
    etapa: "Alinhamento pós-PPA",
    atividade: "Análise da LDO anterior e definição das metas fiscais do exercício",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Junho",
    etapa: "Proposta técnica inicial",
    atividade: "Elaboração da minuta da LDO com base no PPA e nas prioridades da gestão",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Julho",
    etapa: "Revisão e complementação",
    atividade: "Ajustes técnicos e integração com os setores",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Até 10 de Agosto",
    etapa: "Audiência pública",
    atividade: "Realização da audiência pública sobre a LDO",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Até 20 de Agosto",
    etapa: "Entrega à Câmara",
    atividade: "Protocolo do Projeto de Lei do LDO na Câmara Municipal",
    responsavel: "Diretor de Finanças",
    concluido: false
  }
];

const loaData: PlanningTask[] = [
  {
    periodo: "Julho",
    etapa: "Coleta de dados e estimativas",
    atividade: "Levantamento das receitas, despesas, emendas e demandas por unidade orçamentária",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Agosto",
    etapa: "Elaboração da proposta",
    atividade: "Redação técnica da LOA e organização dos anexos e quadros",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Até 10 de Setembro",
    etapa: "Audiência pública",
    atividade: "Realização da audiência pública sobre a proposta orçamentária",
    responsavel: "ALEX MORONTA , SAMUEL PULCINI",
    concluido: false
  },
  {
    periodo: "Até 20 de Setembro",
    etapa: "Entrega à Câmara",
    atividade: "Protocolo do Projeto de Lei da LOA na Câmara Municipal",
    responsavel: "Diretor de Finanças",
    concluido: false
  }
];

export function Planejamento2027() {
  const [activeTab, setActiveTab] = useState<"ldo" | "loa">("ldo");

  const currentTasks = activeTab === "ldo" ? ldoData : loaData;
  const tabTitle = activeTab === "ldo" ? "Lei de Diretrizes Orçamentárias - LDO" : "Lei Orçamentária Anual - LOA";
  const tabDesc = activeTab === "ldo" 
    ? "Estabelece as metas e prioridades da administração pública, orientando a elaboração da LOA."
    : "Estima as receitas e fixa as despesas para o exercício financeiro subsequente.";

  // Dynamic progress calculations
  const totalLdo = ldoData.length;
  const completedLdo = ldoData.filter(t => t.concluido).length;
  const isLdoCompleted = completedLdo === totalLdo;

  const totalLoa = loaData.length;
  const completedLoa = loaData.filter(t => t.concluido).length;
  const isLoaCompleted = completedLoa === totalLoa;

  const overallProgress = Math.round(
    ((completedLdo + completedLoa) / (totalLdo + totalLoa)) * 100
  );

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 pb-40">
      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          title="Planejamento Orçamentário 2027"
          subtitle="Acompanhamento das peças de planejamento elaboradas em 2026 para o orçamento de 2027"
          badge={
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-md border text-brand bg-brand-50 border-brand/20 uppercase tracking-[0.08em]">
              Exercício 2027
            </span>
          }
        />
      </div>

      {/* Overview Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status Card */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-[0.08em] mb-2">
              <Sparkles className="w-4.5 h-4.5" />
              Status de Elaboração
            </div>
            <h3 className="font-display text-2xl font-bold text-ink tracking-tight">Instrumentos de Planejamento 2027</h3>
            <p className="text-ink-2 text-xs font-medium mt-1">
              Acompanhe o cronograma de formulação, realização de audiências públicas e protocolo legislativo.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-brand-50 text-brand flex items-center justify-center font-mono tabular font-semibold text-lg border border-brand/15">
                {overallProgress}%
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-2 block">Status Geral</span>
                <span className={`text-xs font-bold uppercase tracking-[0.06em] ${overallProgress === 100 ? "text-pos" : "text-warn"}`}>
                  {overallProgress === 100 ? "Concluído & Protocolado" : "Em Elaboração"}
                </span>
              </div>
            </div>

            <div className="h-10 w-px bg-line hidden sm:block" />

            {/* LDO Badge */}
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${
                isLdoCompleted ? "bg-pos-50 text-pos border-pos/20" : "bg-warn-50 text-warn border-warn/20"
              }`}>
                {isLdoCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-2 block">LDO 2027</span>
                <span className="text-xs font-semibold text-ink">
                  {isLdoCompleted ? "Entregue em 20 de Agosto" : "Prazo: Até 20 de Agosto"}
                </span>
              </div>
            </div>

            <div className="h-10 w-px bg-line hidden sm:block" />

            {/* LOA Badge */}
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${
                isLoaCompleted ? "bg-pos-50 text-pos border-pos/20" : "bg-warn-50 text-warn border-warn/20"
              }`}>
                {isLoaCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-2 block">LOA 2027</span>
                <span className="text-xs font-semibold text-ink">
                  {isLoaCompleted ? "Entregue em 20 de Setembro" : "Prazo: Até 20 de Setembro"}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progresso geral */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">Progresso consolidado (LDO + LOA)</span>
              <span className="text-xs font-mono tabular font-semibold text-brand">{overallProgress}%</span>
            </div>
            <div
              className="h-2.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden"
              role="progressbar"
              aria-valuenow={overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso consolidado dos instrumentos de planejamento 2027"
            >
              <motion.div
                className={`h-full rounded-full ${overallProgress === 100 ? "bg-pos" : "bg-brand"}`}
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </Card>

        {/* PPA Status Info Box */}
        <Card className="p-6 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-2 text-warn font-bold text-xs uppercase tracking-[0.08em] mb-2">
              <Info className="w-4.5 h-4.5" />
              Plano Plurianual - PPA 2026-2029
            </div>
            <h4 className="font-display text-lg font-bold text-ink tracking-tight">PPA Consolidado</h4>
            <p className="text-ink-2 text-xs font-medium mt-1 leading-relaxed">
              O PPA 2026-2029 já foi planejado, aprovado e está vigente, definindo as diretrizes estratégicas de médio prazo do município.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-ink-2 tracking-[0.08em]">Vigência Ativa</span>
            <span className="text-xs font-mono tabular font-semibold bg-warn-50 text-warn border border-warn/20 rounded-md px-3 py-1">2026 - 2029</span>
          </div>
        </Card>
      </div>

      {/* Tabs Navigator */}
      <div role="tablist" aria-label="Instrumentos de planejamento" className="flex items-center gap-2 mb-6 bg-surface-2 p-1.5 rounded-lg w-fit border border-line">
        <button
          role="tab"
          aria-selected={activeTab === "ldo"}
          onClick={() => setActiveTab("ldo")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            activeTab === "ldo"
              ? "bg-brand text-white"
              : "text-ink-2 hover:bg-line/50"
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          LDO 2027
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "loa"}
          onClick={() => setActiveTab("loa")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            activeTab === "loa"
              ? "bg-brand text-white"
              : "text-ink-2 hover:bg-line/50"
          }`}
        >
          <Layers className="w-4.5 h-4.5" />
          LOA 2027
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline View */}
        <Card className="lg:col-span-8 p-6 sm:p-8">
          <div className="mb-8">
            <h3 className="font-display text-xl font-bold text-ink tracking-tight">{tabTitle}</h3>
            <p className="text-ink-2 text-xs font-medium mt-1 leading-relaxed">
              {tabDesc}
            </p>
          </div>

          <div className="relative border-l-2 border-line pl-6 ml-4 space-y-8 py-2">
            {/* Um único filho por aba dentro do AnimatePresence (mode="wait" exige
                um único nó); o stagger fica nos itens internos. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
              {currentTasks.map((task, idx) => (
                <motion.div
                  key={`${activeTab}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="relative group"
                >
                  {/* Status Indicator Circle */}
                  <span className={`absolute -left-[35px] top-1 h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-surface transition-all duration-300 ${
                    task.concluido
                      ? "bg-pos-50 text-pos border border-pos/25"
                      : "bg-surface-2 text-muted border border-line-strong"
                  }`}>
                    {task.concluido ? "✓" : <Clock className="w-3 h-3 text-muted" />}
                  </span>

                  <div className="bg-surface hover:bg-surface-2 border border-line hover:border-brand/30 rounded-lg p-5 transition-colors duration-300">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-brand bg-brand-50 border border-brand/20 rounded-md px-2.5 py-0.5 tracking-[0.08em]">
                          {task.periodo}
                        </span>
                        <h4 className="font-display text-sm font-bold text-ink mt-2 tracking-tight group-hover:text-brand transition-colors">
                          {task.etapa}
                        </h4>
                      </div>
                      <StatusBadge tone={task.concluido ? "healthy" : "attention"} className="shrink-0">
                        {task.concluido ? "Concluído" : "Aguardando"}
                      </StatusBadge>
                    </div>

                    <p className="text-xs text-ink-2 font-medium leading-relaxed leading-5 mb-4">
                      {task.atividade}
                    </p>

                    <div className="flex items-center gap-2 pt-3 border-t border-line">
                      <div className="h-6 w-6 rounded-full bg-surface-2 text-ink-2 flex items-center justify-center shrink-0 border border-line">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[10px] font-semibold text-ink-2">
                        Responsável: <strong className="text-ink uppercase tracking-[0.06em]">{task.responsavel}</strong>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>

        {/* Sidebar Info/Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Summary stats */}
          <Card className="p-6">
            <h4 className="text-xs font-bold text-ink-2 uppercase tracking-[0.08em] mb-4">
              Métricas do Processo — {activeTab.toUpperCase()} 2027
            </h4>

            {(() => {
              const total = currentTasks.length;
              const done = currentTasks.filter(t => t.concluido).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-line">
                    <span className="text-xs font-semibold text-ink-2 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-muted" /> Etapas Totais
                    </span>
                    <span className="text-sm font-mono tabular font-semibold text-ink">{total}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-pos-50 border border-pos/20">
                    <span className="text-xs font-semibold text-ink-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-pos" /> Concluídas
                    </span>
                    <span className="text-sm font-mono tabular font-semibold text-pos">{done}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-brand-50 border border-brand/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-ink-2 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-brand" /> Percentual Executado
                      </span>
                      <span className="text-sm font-mono tabular font-semibold text-brand">{pct}%</span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full bg-surface border border-brand/15 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Percentual executado do ${activeTab.toUpperCase()} 2027`}
                    >
                      <motion.div
                        key={activeTab}
                        className="h-full rounded-full bg-brand"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Legislative flow explanation card */}
          <Card className="p-6">
            <h4 className="text-xs font-bold text-ink-2 uppercase tracking-[0.08em] mb-3">Fluxo Legislativo</h4>
            <p className="text-ink-2 text-xs font-medium leading-relaxed leading-5 mb-4">
              Após o protocolo na Câmara Municipal por parte do Executivo, o projeto de lei tramita pelas comissões legislativas (Finanças e Orçamento, Constituição e Justiça), passa por emendas parlamentares e votações em plenário antes de retornar para sanção do Prefeito.
            </p>
            <div className="p-3 bg-brand-50 border border-brand/15 rounded-lg flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div className="text-[10px] text-ink-2 font-medium leading-normal">
                <strong className="text-ink">Prazo de Devolução:</strong> A Câmara Municipal deve deliberar e devolver a LDO aprovada até o encerramento do primeiro período da sessão legislativa (Julho) e a LOA aprovada até o encerramento da sessão legislativa anual (Dezembro).
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
