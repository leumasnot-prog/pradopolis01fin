"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExecucaoSaude } from "./ExecucaoSaude";
import { ExecucaoSocial } from "./ExecucaoSocial";
import { ExecucaoTransporte } from "./ExecucaoTransporte";
import { ExecucaoUrban } from "./ExecucaoUrban";
import { ExecucaoSetor } from "./ExecucaoSetor";
import {
  SETORES_ESTRATEGICOS,
  SETORES_DEMAIS,
  SETOR_DEMAIS_BY_SLUG,
} from "./setoresConfig";
import type { LucideIcon } from "lucide-react";

// O setor ativo é o slug de qualquer um dos 13 setores (4 estratégicos + 9 genéricos).
type SectorSlug = string;

// Item achatado para o dropdown — desacopla a renderização do grupo de origem.
interface MenuItem {
  slug: SectorSlug;
  label: string;
  icon: LucideIcon;
}

export function ExecucaoSetorial() {
  const [activeSector, setActiveSector] = useState<SectorSlug>("saude");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lista única de setores — todos no mesmo bloco (sem categorização).
  const allItems: MenuItem[] = useMemo(
    () => [
      ...SETORES_ESTRATEGICOS.map((s) => ({ slug: s.slug, label: s.label, icon: s.icon })),
      ...SETORES_DEMAIS.map((s) => ({ slug: s.slug, label: s.label, icon: s.icon })),
    ],
    [],
  );

  // Setor atualmente selecionado (para o rótulo do gatilho).
  const activeItem: MenuItem = useMemo(
    () => allItems.find((i) => i.slug === activeSector) ?? allItems[0],
    [activeSector, allItems],
  );

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        triggerRef.current &&
        !triggerRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSelect = (slug: SectorSlug) => {
    setActiveSector(slug);
    setOpen(false);
  };

  const ActiveTriggerIcon = activeItem.icon;

  return (
    <div className="w-full min-h-screen bg-bg">
      {/* Barra de Sub-Navegação Setorial Premium */}
      <div className="w-full border-b border-line bg-surface-2/60 backdrop-blur-sm sticky top-[125px] sm:top-[73px] z-30 transition-all duration-300">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-ink tracking-tight">
              Demonstrativos de Execução Setorial
            </h3>
            <p className="text-[11px] font-medium text-ink-2">
              Escolha o setor para visualizar o cumprimento de metas e o comparativo anual
            </p>
          </div>

          {/* Dropdown de Setores (lista única) */}
          <div className="relative w-full sm:w-auto">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="w-full sm:w-72 flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-lg border border-line bg-surface text-ink shadow-sm transition-colors cursor-pointer hover:border-brand/40 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus:border-brand"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <ActiveTriggerIcon className="w-4 h-4" />
                </span>
                <span className="truncate">{activeItem.label}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  ref={panelRef}
                  role="menu"
                  initial={{ opacity: 0, scale: 0.97, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -6 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 mt-2 w-full sm:w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(16,24,38,0.12)] z-50 p-2"
                >
                  <SectorGroup
                    items={allItems}
                    activeSector={activeSector}
                    onSelect={handleSelect}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Conteúdo Dinâmico com Transição de Entrada (remontado por setor via key) */}
      <main className="relative z-10">
        <motion.div
          key={activeSector}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <SectorContent slug={activeSector} />
        </motion.div>
      </main>
    </div>
  );
}

/** Lista de itens dentro do painel do dropdown (rótulo de seção opcional). */
function SectorGroup({
  label,
  items,
  activeSector,
  onSelect,
}: {
  label?: string;
  items: MenuItem[];
  activeSector: SectorSlug;
  onSelect: (slug: SectorSlug) => void;
}) {
  return (
    <div>
      {label && (
        <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          {label}
        </p>
      )}
      <div className="flex flex-col">
        {items.map(({ slug, label: itemLabel, icon: Icon }) => {
          const isActive = activeSector === slug;
          return (
            <button
              key={slug}
              type="button"
              role="menuitem"
              onClick={() => onSelect(slug)}
              className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 ${
                isActive ? "bg-brand text-white shadow-sm" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-white" : "text-brand"}`} />
                <span className="truncate">{itemLabel}</span>
              </span>
              {isActive && <Check className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Resolve o componente a renderizar a partir do slug ativo. */
function SectorContent({ slug }: { slug: SectorSlug }) {
  switch (slug) {
    case "saude":
      return <ExecucaoSaude />;
    case "social":
      return <ExecucaoSocial />;
    case "transporte":
      return <ExecucaoTransporte />;
    case "urban":
      return <ExecucaoUrban />;
    default: {
      const config = SETOR_DEMAIS_BY_SLUG[slug];
      if (config) return <ExecucaoSetor config={config} />;
      // Fallback defensivo: slug desconhecido cai no setor estratégico padrão.
      return <ExecucaoSaude />;
    }
  }
}
