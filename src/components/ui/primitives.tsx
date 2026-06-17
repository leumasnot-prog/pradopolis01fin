"use client";

// Primitivos de UI compartilhados pelo dashboard.
// Direção "Cívico Moderno": superfícies claras com BORDA REAL (sem glass/blur),
// azul institucional como marca, cifras em monoespaçada tabular (demonstrativo).
// A API pública é estável — telas que importam estes componentes herdam o novo visual.

import { useEffect, useRef, useState, useId } from "react";
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/format";

/** Junta classes condicionais sem dependências externas. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Estilo base de superfície (antes "glass card"). Mantém o nome do export por
 * compatibilidade, mas agora é um painel plano com borda real — sem blur.
 */
export const glassCard =
  "rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)]";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Habilita o micro-hover de elevação. */
  hover?: boolean;
  children: React.ReactNode;
}

/** Cartão/painel padrão. */
export function Card({ hover = false, className, children, ...rest }: CardProps) {
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={cn(glassCard, "transition-colors hover:border-line-strong", className)}
        {...(rest as any)}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <div className={cn(glassCard, className)} {...rest}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
}

/** Cabeçalho de seção/módulo padronizado. */
export function SectionHeader({ title, subtitle, badge, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
      <div>
        <h2 className="font-display text-2xl font-bold text-ink tracking-tight flex flex-wrap items-center gap-3">
          {title}
          {badge}
        </h2>
        {subtitle && <p className="text-ink-2 text-sm font-medium mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass?: string;
  iconColorClass?: string;
  valueColorClass?: string;
  onClick?: () => void;
}

/** Cartão de métrica reutilizável. Cifra em monoespaçada tabular. */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgClass = "bg-brand-50",
  iconColorClass = "text-brand",
  valueColorClass = "text-ink",
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        glassCard,
        "p-5 flex flex-col justify-between gap-4 transition-colors",
        onClick && "cursor-pointer hover:border-brand/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconBgClass, iconColorClass)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-[0.08em]">{title}</span>
      </div>
      <div>
        <h4
          className={cn(
            // clamp para caber cifras de 9 dígitos em colunas estreitas e crescer no desktop
            "font-mono text-[clamp(1.05rem,2vw,1.6rem)] leading-none font-semibold tracking-tight tabular whitespace-nowrap",
            valueColorClass,
          )}
        >
          {value}
        </h4>
        {subtitle && <span className="mt-1.5 block text-xs font-medium text-muted">{subtitle}</span>}
      </div>
    </motion.div>
  );
}

type StatusTone = "healthy" | "attention" | "critical";

const TONE_CLASSES: Record<StatusTone, string> = {
  healthy: "text-pos bg-pos-50 border-pos/25",
  attention: "text-warn bg-warn-50 border-warn/25",
  critical: "text-neg bg-neg-50 border-neg/25",
};

/** Selo de status (saudável / atenção / crítico). */
export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] rounded-md border",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

/** Número animado (moeda ou percentual) — versão única e compartilhada. */
export function AnimatedNumber({
  value,
  type = "currency",
}: {
  value: number;
  type?: "currency" | "percent";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const format = (n: number) => (type === "currency" ? formatBRL(n) : formatPercent(n));

    if (reduceMotion) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }

    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = format(latest);
        }
      },
    });
    return () => controls.stop();
  }, [value, type, motionValue, reduceMotion]);

  return <span ref={ref}>{type === "currency" ? "R$ 0,00" : "0,0%"}</span>;
}

/* ──────────────────────────────────────────────────────────────
   Primitivos da "casca" de entrada e navegação (login/registro/nav).
   ────────────────────────────────────────────────────────────── */

/**
 * Plano de fundo ambiente cívico: leve grade de papel quadriculado +
 * um brilho institucional no topo. Sem animação infinita (restraint).
 */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-blueprint opacity-60" />
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-brand/[0.06] to-transparent" />
    </div>
  );
}

/** Spinner acessível para estados de carregamento de botões/seções. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("h-4 w-4 animate-spin", className)} />;
}

const FIELD_ACCENT = {
  blue: "focus-within:border-brand focus-within:ring-brand/20",
  emerald: "focus-within:border-pos focus-within:ring-pos/20",
} as const;

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Ícone à esquerda (lucide). */
  icon?: React.ComponentType<{ className?: string }>;
  /** Mensagem de erro inline; também marca o campo como inválido. */
  error?: string;
  /** Texto de ajuda exibido abaixo quando não há erro. */
  hint?: string;
  /** Cor de acento do foco. */
  accent?: keyof typeof FIELD_ACCENT;
}

/**
 * Campo de formulário com rótulo associado, ícone, anel de foco acessível
 * e estado de erro inline (aria-invalid + aria-describedby).
 */
export function Field({
  label,
  icon: Icon,
  error,
  hint,
  accent = "blue",
  className,
  ...input
}: FieldProps) {
  const reactId = useId();
  const id = input.name ? `field-${input.name}` : reactId;
  const describedById = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-surface transition-all",
          "focus-within:ring-4",
          error
            ? "border-neg/50 focus-within:border-neg focus-within:ring-neg/15"
            : cn("border-line", FIELD_ACCENT[accent]),
        )}
      >
        {Icon && (
          <span className="pointer-events-none pl-3.5 text-muted">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            "w-full rounded-lg bg-transparent py-2.5 pr-4 text-sm font-medium text-ink placeholder-muted",
            "focus:outline-none",
            Icon ? "pl-2.5" : "pl-3.5",
            className,
          )}
          {...input}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="pl-0.5 text-xs font-semibold text-neg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-0.5 text-xs font-medium text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface PasswordFieldProps extends Omit<FieldProps, "icon" | "type"> {
  /** Ícone à esquerda (lucide); padrão Lock pode ser passado pelo chamador. */
  icon?: React.ComponentType<{ className?: string }>;
}

/** Campo de senha com botão acessível de mostrar/ocultar. */
export function PasswordField({ icon: Icon, accent = "blue", error, hint, label, className, ...input }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const reactId = useId();
  const id = input.name ? `field-${input.name}` : reactId;
  const describedById = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          "relative flex items-center rounded-lg border bg-surface transition-all",
          "focus-within:ring-4",
          error
            ? "border-neg/50 focus-within:border-neg focus-within:ring-neg/15"
            : cn("border-line", FIELD_ACCENT[accent]),
        )}
      >
        {Icon && (
          <span className="pointer-events-none pl-3.5 text-muted">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            "w-full bg-transparent py-2.5 pr-2 text-sm font-medium text-ink placeholder-muted",
            "focus:outline-none",
            Icon ? "pl-2.5" : "pl-3.5",
            className,
          )}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className="mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="pl-0.5 text-xs font-semibold text-neg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-0.5 text-xs font-medium text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
