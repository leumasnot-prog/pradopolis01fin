"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, 
  CheckCircle2, 
  User, 
  Clock, 
  FileText, 
  Layers,
  Sparkles,
  Info,
  ListChecks, 
  Percent,
  Pencil,
  X,
  Link2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader, StatusBadge, Card } from "@/components/ui/primitives";

interface DocumentItem {
  title: string;
  url: string;
}

interface PlanningTask {
  id: number;
  type: string;
  periodo: string;
  etapa: string;
  atividade: string;
  responsavel: string;
  status: string; // 'aguardando' | 'marcado reuniao' | 'concluido'
  data_reuniao?: string;
  documents: DocumentItem[];
  concluido: boolean;
}

export function Planejamento2027({ user }: { user: { email: string; name: string } | null }) {
  const [activeTab, setActiveTab] = useState<"ldo" | "loa">("ldo");
  const [tasks, setTasks] = useState<PlanningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Controlar o Modal de Edição
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);
  const [formStatus, setFormStatus] = useState("aguardando");
  const [formDataReuniao, setFormDataReuniao] = useState("");
  
  // Lista dinâmica de documentos no formulário
  const [formDocuments, setFormDocuments] = useState<DocumentItem[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // É o Administrador Contábil com permissão de edição?
  const isEditor = user?.email === "contabilidade@pradopolis.sp.gov.br";

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/planning/tasks");
      if (!res.ok) throw new Error("Erro ao buscar tarefas");
      const data = await res.json();
      setTasks(data.tasks || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o cronograma de planejamento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filtrar tarefas por aba ativa
  const currentTasks = useMemo(() => {
    return tasks.filter(t => t.type === activeTab);
  }, [tasks, activeTab]);

  // Cálculos dinâmicos de progresso
  const metrics = useMemo(() => {
    const ldoTasks = tasks.filter(t => t.type === "ldo");
    const loaTasks = tasks.filter(t => t.type === "loa");

    const totalLdo = ldoTasks.length;
    const completedLdo = ldoTasks.filter(t => t.status === "concluido").length;
    const isLdoCompleted = totalLdo > 0 && completedLdo === totalLdo;

    const totalLoa = loaTasks.length;
    const completedLoa = loaTasks.filter(t => t.status === "concluido").length;
    const isLoaCompleted = totalLoa > 0 && completedLoa === totalLoa;

    const overallProgress = totalLdo + totalLoa > 0
      ? Math.round(((completedLdo + completedLoa) / (totalLdo + totalLoa)) * 100)
      : 0;

    return {
      totalLdo,
      completedLdo,
      isLdoCompleted,
      totalLoa,
      completedLoa,
      isLoaCompleted,
      overallProgress
    };
  }, [tasks]);

  const handleEditClick = (task: PlanningTask) => {
    setSelectedTask(task);
    setFormStatus(task.status);
    setFormDataReuniao(task.data_reuniao || "");
    setFormDocuments(task.documents || []);
    setNewDocTitle("");
    setNewDocUrl("");
    setSaveError("");
  };

  // Adicionar um documento à lista local do formulário
  const handleAddDocument = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocUrl.trim()) {
      setSaveError("Preencha o título e o link do documento.");
      return;
    }

    // Formata o link automaticamente caso não possua protocolo http/https ou caminho relativo/âncora
    let formattedUrl = newDocUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl) && !/^\//.test(formattedUrl) && !/^#/.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    setFormDocuments(prev => [...prev, { title: newDocTitle.trim(), url: formattedUrl }]);
    setNewDocTitle("");
    setNewDocUrl("");
    setSaveError("");
  };

  // Remover um documento da lista local do formulário
  const handleRemoveDocument = (indexToRemove: number) => {
    setFormDocuments(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      setSaving(true);
      setSaveError("");

      const res = await fetch("/api/planning/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTask.id,
          status: formStatus,
          data_reuniao: formStatus === "marcado reuniao" ? formDataReuniao : null,
          documents: formDocuments
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao salvar alterações");
      }

      await fetchTasks();
      setSelectedTask(null);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Variantes de cascata
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 350, damping: 28 } 
    }
  } as const;

  if (loading && tasks.length === 0) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-ink-2">
          <RefreshCw className="w-7 h-7 animate-spin text-brand" />
          <span className="text-sm font-semibold">Carregando cronograma orçamentário…</span>
        </div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-8 h-8 text-neg mx-auto" />
          <h2 className="font-display text-xl font-bold text-ink tracking-tight mt-3">Erro ao carregar</h2>
          <p className="text-ink-2 mt-1.5 text-sm">{error}</p>
          <button 
            onClick={fetchTasks}
            className="mt-4 border border-line bg-surface hover:bg-surface-2 text-xs font-semibold py-2 px-4 rounded-md transition-colors cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const tabTitle = activeTab === "ldo" ? "Lei de Diretrizes Orçamentárias - LDO" : "Lei Orçamentária Anual - LOA";
  const tabDesc = activeTab === "ldo" 
    ? "Estabelece as metas e prioridades da administração pública, orientando a elaboração da LOA."
    : "Estima as receitas e fixa as despesas para o exercício financeiro subsequente.";

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
                {metrics.overallProgress}%
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-2 block">Status Geral</span>
                <span className={`text-xs font-bold uppercase tracking-[0.06em] ${metrics.overallProgress === 100 ? "text-pos" : "text-warn"}`}>
                  {metrics.overallProgress === 100 ? "Concluído & Protocolado" : "Em Elaboração"}
                </span>
              </div>
            </div>

            <div className="h-10 w-px bg-line hidden sm:block" />

            {/* LDO Badge */}
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${
                metrics.isLdoCompleted ? "bg-pos-50 text-pos border-pos/20" : "bg-warn-50 text-warn border-warn/20"
              }`}>
                {metrics.isLdoCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-2 block">LDO 2027</span>
                <span className="text-xs font-semibold text-ink">
                  {metrics.isLdoCompleted ? "Entregue em 20 de Agosto" : "Prazo: Até 20 de Agosto"}
                </span>
              </div>
            </div>

            <div className="h-10 w-px bg-line hidden sm:block" />

            {/* LOA Badge */}
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center border ${
                metrics.isLoaCompleted ? "bg-pos-50 text-pos border-pos/20" : "bg-warn-50 text-warn border-warn/20"
              }`}>
                {metrics.isLoaCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-2 block">LOA 2027</span>
                <span className="text-xs font-semibold text-ink">
                  {metrics.isLoaCompleted ? "Entregue em 20 de Setembro" : "Prazo: Até 20 de Setembro"}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progresso geral */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">Progresso consolidado (LDO + LOA)</span>
              <span className="text-xs font-mono tabular font-semibold text-brand">{metrics.overallProgress}%</span>
            </div>
            <div
              className="h-2.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden"
              role="progressbar"
              aria-valuenow={metrics.overallProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso consolidado dos instrumentos de planejamento 2027"
            >
              <motion.div
                className={`h-full rounded-full ${metrics.overallProgress === 100 ? "bg-pos" : "bg-brand"}`}
                initial={{ width: 0 }}
                animate={{ width: `${metrics.overallProgress}%` }}
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8"
              >
              {currentTasks.map((task, idx) => {
                const hasDocs = task.documents && task.documents.length > 0;

                let tone: "healthy" | "attention" | "critical" = "attention";
                let statusLabel = "Aguardando";
                if (task.status === "concluido") {
                  tone = "healthy";
                  statusLabel = "Concluído";
                } else if (task.status === "marcado reuniao") {
                  tone = "healthy";
                  statusLabel = `Reunião: ${task.data_reuniao || "Agendada"}`;
                }

                return (
                  <motion.div
                    key={`${activeTab}-${task.id}`}
                    variants={itemVariants}
                    className="relative group"
                  >
                    {/* Status Indicator Circle */}
                    <span className={`absolute -left-[35px] top-1 h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-surface transition-all duration-300 ${
                      task.status === "concluido"
                        ? "bg-pos-50 text-pos border border-pos/25"
                        : task.status === "marcado reuniao"
                        ? "bg-brand-50 text-brand border border-brand/25"
                        : "bg-surface-2 text-muted border border-line-strong"
                    }`}>
                      {task.status === "concluido" ? "✓" : <Clock className={`w-3 h-3 ${task.status === "marcado reuniao" ? "text-brand" : "text-muted"}`} />}
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
                        <div className="flex items-center gap-2">
                          {isEditor && (
                            <button
                              onClick={() => handleEditClick(task)}
                              className="p-1.5 rounded-md border border-line hover:border-brand/40 text-ink-2 hover:text-brand bg-surface transition-colors cursor-pointer hover:bg-surface-2 shadow-sm"
                              title="Alterar Status / Documentos"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-md border ${
                              task.status === "concluido"
                                ? "text-pos bg-pos-50 border-pos/25"
                                : task.status === "marcado reuniao"
                                ? "text-brand bg-brand-50 border-brand/25"
                                : "text-warn bg-warn-50 border-warn/25"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-ink-2 font-medium leading-relaxed leading-5 mb-4">
                        {task.atividade}
                      </p>

                      {/* Exibir Lista de Documentos Dinâmicos se houver */}
                      {hasDocs && (
                        <div className="mt-4 border-t border-line/60 pt-3.5 mb-4">
                          <span className="text-[10px] font-bold text-ink-2 uppercase tracking-[0.08em] block mb-2.5">
                            Reuniões & Documentos Anexados:
                          </span>
                          <div className="space-y-4">
                            {task.documents.map((doc, dIdx) => (
                              <div key={dIdx} className="flex flex-col gap-1 pl-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-brand shrink-0" />
                                  <span className="text-xs font-bold text-ink uppercase tracking-wide">
                                    {doc.title}
                                  </span>
                                </div>
                                <div className="pl-4 flex items-center gap-1">
                                  <span className="text-[11px] font-semibold text-ink-2">link:</span>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-brand hover:text-brand-ink underline break-all"
                                  >
                                    {doc.url.replace(/^https?:\/\//i, "")}
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                );
              })}
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
              const done = currentTasks.filter(t => t.status === "concluido").length;
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

      {/* MODAL DE EDIÇÃO EXCLUSIVO PARA ADMINISTRADOR CONTÁBIL */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-surface border border-line rounded-xl shadow-xl w-full max-w-lg p-6 relative overflow-hidden my-8"
            >
              {/* Botão de Fechar */}
              <button
                onClick={() => setSelectedTask(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-2 hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5 pr-8">
                <span className="text-[10px] font-bold uppercase text-brand bg-brand-50 border border-brand/20 rounded-md px-2.5 py-0.5 tracking-[0.08em]">
                  Editar Etapa · {selectedTask.type.toUpperCase()}
                </span>
                <h3 className="font-display text-lg font-bold text-ink mt-2 tracking-tight">
                  {selectedTask.etapa}
                </h3>
                <p className="text-[11px] font-medium text-ink-2 mt-1">
                  Altere o status, defina a data da reunião e anexe links de documentos.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Select de Status */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-status" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                    Status da Etapa
                  </label>
                  <select
                    id="modal-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface py-2.5 px-3.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                  >
                    <option value="aguardando">Aguardando</option>
                    <option value="marcado reuniao">Reunião Marcada</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>

                {/* Data da Reunião (Condicionado a Reunião Marcada) */}
                {formStatus === "marcado reuniao" && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label htmlFor="modal-date" className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                      Data da Reunião / Audiência
                    </label>
                    <input
                      id="modal-date"
                      type="text"
                      value={formDataReuniao}
                      onChange={(e) => setFormDataReuniao(e.target.value)}
                      placeholder="Ex: 25 de Junho"
                      required
                      className="w-full rounded-lg border border-line bg-surface py-2.5 px-3.5 text-sm font-medium text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
                    />
                  </div>
                )}

                {/* LISTAGEM DE LINKS ANEXADOS ATUALMENTE */}
                <div className="space-y-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                    Documentos e Links Anexados ({formDocuments.length})
                  </span>
                  
                  <div className="space-y-2 max-h-36 overflow-y-auto border border-line rounded-lg p-2 bg-surface-2/50">
                    {formDocuments.length > 0 ? (
                      formDocuments.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded bg-surface border border-line text-xs">
                          <div className="flex flex-col overflow-hidden pr-2">
                            <span className="font-bold text-ink truncate">{doc.title}</span>
                            <span className="text-[10px] text-muted truncate">{doc.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="p-1 rounded text-muted hover:text-neg hover:bg-neg-50 transition-colors cursor-pointer shrink-0"
                            title="Remover Documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-muted text-center py-4 font-medium">Nenhum documento ou link anexado.</p>
                    )}
                  </div>
                </div>

                {/* FORMULÁRIO DE ADIÇÃO DE NOVO LINK */}
                <div className="border border-line/80 rounded-lg p-3.5 bg-brand-50/20 space-y-3">
                  <span className="block text-[10px] font-bold text-brand uppercase tracking-[0.08em]">
                    + Anexar Novo Documento (Ex: Pauta ou Ata)
                  </span>

                  <div className="space-y-1">
                    <label htmlFor="new-doc-title" className="block text-[9px] font-bold uppercase tracking-[0.06em] text-ink-2">
                      Título do Documento / Nome da Reunião
                    </label>
                    <input
                      id="new-doc-title"
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Ex: REUNIÃO DEPARTAMENTO SAÚDE 02/06"
                      className="w-full rounded bg-surface border border-line py-1.5 px-2.5 text-xs font-semibold text-ink placeholder-muted focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="new-doc-url" className="block text-[9px] font-bold uppercase tracking-[0.06em] text-ink-2">
                      Link / URL do Documento
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-muted">
                        <Link2 className="w-3.5 h-3.5" />
                      </span>
                      <input
                        id="new-doc-url"
                        type="text"
                        value={newDocUrl}
                        onChange={(e) => setNewDocUrl(e.target.value)}
                        placeholder="https://exemplo.com/pauta.pdf"
                        className="w-full pl-8 pr-2 py-1.5 text-xs font-semibold rounded bg-surface border border-line text-ink placeholder-muted focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] bg-brand text-white rounded hover:bg-brand-ink transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar à Lista</span>
                  </button>
                </div>

                {/* Mensagens de erro */}
                {saveError && (
                  <p className="text-xs font-semibold text-neg" role="alert">
                    {saveError}
                  </p>
                )}

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-2 hover:bg-surface-2 rounded-lg border border-transparent transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] bg-brand hover:bg-brand-ink text-white rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
