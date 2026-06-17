"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AmbientBackground, Field, PasswordField, Spinner } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro ao entrar.");
      }

      // Successful login
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4 sm:p-6">
      <AmbientBackground />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="grid overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,38,0.04)] md:grid-cols-2">
          {/* Painel institucional (esquerda) */}
          <aside className="relative hidden flex-col justify-between border-r border-line bg-brand p-8 text-white md:flex">
            <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-10" aria-hidden />
            <div className="relative">
              <div className="relative mb-5 h-16 w-16 bg-white p-2 rounded-lg border border-white/20 shadow-sm flex items-center justify-center">
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
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                Prefeitura Municipal de Pradópolis
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
                Secretaria de Finanças
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
                Painel de gestão fiscal de acesso restrito. Destinado exclusivamente
                aos servidores municipais autorizados.
              </p>
            </div>
            <div className="relative mt-8 flex items-center gap-2 border-t border-white/15 pt-5 text-[11px] font-semibold text-white/60">
              <ShieldCheck className="h-3.5 w-3.5" />
              Conexão segura e de uso restrito
            </div>
          </aside>

          {/* Formulário (direita) */}
          <div className="p-7 sm:p-9">
            {/* Cabeçalho — visível também no mobile (sem o painel) */}
            <div className="mb-7">
              <div className="relative mb-4 h-14 w-14 bg-white p-1.5 rounded-lg border border-line flex items-center justify-center md:hidden shadow-sm">
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
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                Acesso ao Painel
              </span>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                Entrar no sistema
              </h1>
              <p className="mt-1.5 text-sm font-medium text-ink-2">
                Use suas credenciais institucionais para continuar.
              </p>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-neg/30 bg-neg-50 p-3.5 text-xs font-semibold text-neg"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field
                label="E-mail Institucional"
                name="email"
                type="email"
                icon={Mail}
                required
                autoComplete="email"
                inputMode="email"
                placeholder="servidor@pradopolis.sp.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <PasswordField
                label="Senha de Acesso"
                name="password"
                icon={Lock}
                required
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner />
                    Verificando...
                  </>
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Rodapé: link de cadastro */}
            <div className="mt-7 border-t border-line pt-5 text-center">
              <p className="text-xs font-semibold text-ink-2">
                Primeira vez?{" "}
                <Link
                  href="/register"
                  className="ml-1 rounded font-bold text-brand hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
