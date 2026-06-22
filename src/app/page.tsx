"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TopNav } from "@/components/ui/TopNav";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { PrevisaoReceita } from "@/components/dashboard/PrevisaoReceita";
import { OrcamentoDashboard } from "@/components/dashboard/OrcamentoDashboard";
import { ExecucaoSaude } from "@/components/dashboard/ExecucaoSaude";
import { DespesasFixas } from "@/components/dashboard/DespesasFixas";
import { ConsultaFiorilli } from "@/components/dashboard/ConsultaFiorilli";
import { DocumentosViewer } from "@/components/dashboard/DocumentosViewer";
import { Configuracoes } from "@/components/dashboard/Configuracoes";
import { Planejamento2027 } from "@/components/dashboard/Planejamento2027";
import { AmbientBackground } from "@/components/ui/primitives";
import { LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <main className="min-h-screen bg-bg text-ink relative overflow-x-hidden">

      {/* Plano de fundo cívico: papel quadriculado + brilho institucional */}
      <AmbientBackground />

      {/* Cabeçalho fixo: identidade + navegação + usuário */}
      <header className="sticky top-0 z-40 w-full border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6">
          {/* Linha 1: marca + usuário */}
          <div className="flex justify-between items-center gap-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 bg-white p-1 rounded-lg border border-line flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] shrink-0">
                <div className="relative w-full h-full">
                  <Image
                    src="/logo.png"
                    alt="Brasão de Pradópolis"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <div>
                <h1 className="font-display text-base font-bold text-ink tracking-tight leading-none">Pradópolis</h1>
                <span className="text-[10px] text-muted font-semibold uppercase tracking-[0.12em]">Secretaria de Finanças</span>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-2 border border-line bg-surface-2 py-1.5 px-3 rounded-md text-xs font-medium text-ink-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-pos" />
                  <span className="text-muted">Sessão de</span>
                  <span className="font-semibold text-ink">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 border border-line text-ink-2 hover:border-neg/50 hover:text-neg hover:bg-neg-50 text-xs font-semibold py-2 px-3 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>

          {/* Linha 2: navegação principal com rótulos */}
          {user && (
            <div className="pb-px">
              <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo do painel */}
      <div className="relative z-10">
        {activeTab === "home" && <DashboardOverview onNavigate={setActiveTab} />}
        {activeTab === "receita" && <PrevisaoReceita />}
        {activeTab === "despesas" && <DespesasFixas />}
        {activeTab === "fiorilli" && <ConsultaFiorilli />}
        {activeTab === "orcamento" && <OrcamentoDashboard />}
        {activeTab === "saude" && <ExecucaoSaude />}
        {activeTab === "planejamento" && <Planejamento2027 />}
        {activeTab === "documentos" && <DocumentosViewer onBack={() => setActiveTab("home")} />}
        {activeTab === "settings" && <Configuracoes user={user} />}
        {activeTab !== "home" && activeTab !== "receita" && activeTab !== "despesas" && activeTab !== "fiorilli" && activeTab !== "orcamento" && activeTab !== "saude" && activeTab !== "planejamento" && activeTab !== "documentos" && activeTab !== "settings" && (
          <div className="w-full h-[70vh] flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Módulo em construção</h2>
              <p className="text-ink-2 mt-1.5 text-sm">A tela “{activeTab}” entra no ar em breve. Use a navegação acima para voltar ao painel.</p>
            </div>
          </div>
        )}
      </div>

    </main>
  );
}
