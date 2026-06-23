"use client";

// Navegação principal do dashboard.
// Direção "Cívico Moderno": faixa de abas plana e nativa do cabeçalho, com
// borda inferior de 2px na aba ativa (sem pílula flutuante de glass), rótulos
// sempre visíveis em md+, rolagem horizontal sem barra no mobile e navegação
// por teclado (padrão tablist acessível).

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Home,
  PieChart,
  TrendingDown,
  Landmark,
  FileText,
  Settings,
  Calendar,
  Search,
  DollarSign,
} from "lucide-react";
import { cn } from "@/components/ui/primitives";

export interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Cor de destaque do estado ativo. */
  activeClass: string;
}

export const navItems: NavItem[] = [
  { id: "home", name: "Visão Geral", icon: Home, activeClass: "text-brand" },
  { id: "receita", name: "Arrecadação", icon: Landmark, activeClass: "text-brand" },
  { id: "despesas", name: "Despesas Fixas", icon: TrendingDown, activeClass: "text-brand" },
  { id: "fiorilli", name: "Consulta Fiorilli", icon: Search, activeClass: "text-brand" },
  { id: "orcamento", name: "Orçamento", icon: PieChart, activeClass: "text-brand" },
  { id: "execucao-setorial", name: "Execução Setorial", icon: DollarSign, activeClass: "text-brand" },
  { id: "planejamento", name: "Planejamento 2027", icon: Calendar, activeClass: "text-brand" },
  { id: "documentos", name: "Documentos", icon: FileText, activeClass: "text-brand" },
  { id: "settings", name: "Configurações", icon: Settings, activeClass: "text-brand" },
];

export function TopNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // Garante que a aba ativa fique visível na rolagem horizontal (mobile).
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [activeTab, reduceMotion]);

  // Navegação por setas entre as abas (padrão de tablist acessível).
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (index + dir + navItems.length) % navItems.length;
    onTabChange(navItems[next].id);
  };

  return (
    <nav
      ref={scrollRef}
      aria-label="Navegação principal"
      className="scrollbar-none scroll-fade-x -mb-px flex items-stretch gap-1 overflow-x-auto"
    >
      {navItems.map((item, index) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.name}
            title={item.name}
            className={cn(
              "group relative flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-2.5 pt-2 text-sm font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">{item.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
