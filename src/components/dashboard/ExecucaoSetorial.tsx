"use client";

import { useState } from "react";
import { Activity, HeartHandshake } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExecucaoSaude } from "./ExecucaoSaude";
import { ExecucaoSocial } from "./ExecucaoSocial";

type Sector = "saude" | "social";

export function ExecucaoSetorial() {
  const [activeSector, setActiveSector] = useState<Sector>("saude");

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

          {/* Switcher Segmentado com LayoutId Animado */}
          <div className="inline-flex rounded-lg border border-line bg-surface p-1 shadow-sm relative">
            <button
              onClick={() => setActiveSector("saude")}
              className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer focus:outline-none ${
                activeSector === "saude" ? "text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              {activeSector === "saude" && (
                <motion.span
                  layoutId="activeSectorBg"
                  className="absolute inset-0 bg-brand rounded-md shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <Activity className="w-4.5 h-4.5" />
              <span>Saúde Pública</span>
            </button>

            <button
              onClick={() => setActiveSector("social")}
              className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer focus:outline-none ${
                activeSector === "social" ? "text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              {activeSector === "social" && (
                <motion.span
                  layoutId="activeSectorBg"
                  className="absolute inset-0 bg-brand rounded-md shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <HeartHandshake className="w-4.5 h-4.5" />
              <span>Promoção Social</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Dinâmico com Transição Suave */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeSector === "saude" ? (
            <motion.div
              key="saude"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ExecucaoSaude />
            </motion.div>
          ) : (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ExecucaoSocial />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
