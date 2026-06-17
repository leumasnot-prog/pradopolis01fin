"use client"

// Dock de navegação alternativo.
// Direção "Cívico Moderno": superfície plana com borda real (sem glass/blur),
// azul institucional na aba ativa, raios contidos. Mantém o aumento por
// proximidade do mouse — desativado sob prefers-reduced-motion — e a navegação
// por teclado. Contrato de export preservado: DockTabs({ activeTab, onTabChange }).

import { useState, useRef } from "react"
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion"
import { Home, PieChart, TrendingDown, Landmark, FileText, Settings, Calendar } from 'lucide-react'

interface DockItem {
  id: string
  name: string
  icon: React.ReactNode
  isActive?: boolean
}

// Adaptado para os módulos do dashboard de Pradópolis
const dockItems: DockItem[] = [
  { id: "home", name: "Visão Geral", icon: <Home /> },
  { id: "receita", name: "Arrecadação", icon: <Landmark /> },
  { id: "despesas", name: "Despesas Fixas", icon: <TrendingDown /> },
  { id: "orcamento", name: "Orçamento", icon: <PieChart /> },
  { id: "planejamento", name: "Planejamento 2027", icon: <Calendar /> },
  { id: "documentos", name: "Documentos", icon: <FileText /> },
  { id: "settings", name: "Configurações", icon: <Settings /> },
]

function DockIcon({
  item,
  mouseX,
  onClick,
  onKeyDown,
}: {
  item: DockItem
  mouseX: any
  onClick?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  // Com reduced-motion o aumento por proximidade é desativado (tamanho fixo).
  const widthSync = useTransform(distance, [-150, 0, 150], reduceMotion ? [56, 56, 56] : [50, 80, 50])
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 })

  const heightSync = useTransform(distance, [-150, 0, 150], reduceMotion ? [56, 56, 56] : [50, 80, 50])
  const height = useSpring(heightSync, { mass: 0.1, stiffness: 150, damping: 12 })

  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width, height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onMouseDown={() => setIsClicked(true)}
      onMouseUp={() => setIsClicked(false)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={item.name}
      aria-current={item.isActive ? "page" : undefined}
      title={item.name}
      className="group relative flex aspect-square cursor-pointer items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className={
          "relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border transition-colors " +
          (item.isActive
            ? "bg-brand text-white border-brand-ink"
            : "bg-surface-2 text-ink-2 border-line group-hover:border-line-strong group-hover:text-ink")
        }
        animate={{
          y: isClicked ? 2 : isHovered ? -8 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 17,
        }}
      >
        <motion.div
          className="text-xl"
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 17,
          }}
        >
          {item.icon}
        </motion.div>
      </motion.div>

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? -20 : 10,
          scale: isHovered ? 1 : 0.8,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        className="pointer-events-none absolute -top-11 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-sm"
      >
        {item.name}
      </motion.div>

      {/* Indicador de aba ativa */}
      <motion.div
        className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand"
        animate={{
          scale: item.isActive ? 1.5 : 1,
          opacity: item.isActive ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      />
    </motion.button>
  )
}

export function DockTabs({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  const mouseX = useMotionValue(Infinity)
  const reduceMotion = useReducedMotion()

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const dir = e.key === "ArrowRight" ? 1 : -1
    const next = (index + dir + dockItems.length) % dockItems.length
    onTabChange(dockItems[next].id)
  }

  return (
    <div className="flex w-full items-center justify-center">
      <motion.div
        role="tablist"
        aria-label="Navegação do painel"
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="mx-auto flex h-24 items-end gap-4 rounded-xl border border-line bg-surface px-6 pb-4 shadow-[0_1px_2px_rgba(16,24,38,0.04)]"
        initial={reduceMotion ? false : { y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1,
        }}
      >
        {dockItems.map((item, index) => (
          <DockIcon
            key={item.id}
            item={{ ...item, isActive: activeTab === item.id }}
            mouseX={mouseX}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
        ))}
      </motion.div>
    </div>
  )
}
