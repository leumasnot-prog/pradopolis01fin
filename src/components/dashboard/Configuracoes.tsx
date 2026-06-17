"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader, Card, Spinner } from "@/components/ui/primitives";
import {
  Settings,
  User, 
  Mail, 
  Shield, 
  Users, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  Building,
  Info,
  Calendar,
  Key,
  UserPlus
} from "lucide-react";

interface PendingUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface UserProfile {
  name: string;
  email: string;
}

export function Configuracoes({ user }: { user: UserProfile | null }) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form states for creating a new user
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserApproved, setNewUserApproved] = useState(true);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  const isAdmin = user?.email === "contabilidade@pradopolis.sp.gov.br";

  useEffect(() => {
    if (isAdmin) {
      fetchPendingUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Auto-dispensa a notificação após alguns segundos (mantém o botão de ação livre de ruído visual)
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/auth/admin/pending");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar usuários pendentes.");
      }
      setPendingUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao buscar cadastros.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    setNotification(null);
    try {
      const res = await fetch("/api/auth/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao aprovar usuário.");
      }
      
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotification({ message: "Servidor aprovado com sucesso!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm("Tem certeza que deseja recusar e excluir este cadastro?")) {
      return;
    }
    setActionLoading(userId);
    setNotification(null);
    try {
      const res = await fetch("/api/auth/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao recusar usuário.");
      }

      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotification({ message: "Cadastro recusado e excluído do sistema.", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setNotification({ message: "Preencha todos os campos obrigatórios.", type: "error" });
      return;
    }
    if (newUserPassword.length < 6) {
      setNotification({ message: "A senha deve ter no mínimo 6 caracteres.", type: "error" });
      return;
    }
    
    setCreateUserLoading(true);
    setNotification(null);
    try {
      const res = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          approved: newUserApproved,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar servidor.");
      }

      setNotification({ message: data.message || "Servidor cadastrado com sucesso!", type: "success" });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      if (!newUserApproved) {
        fetchPendingUsers();
      }
    } catch (err: any) {
      setNotification({ message: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setCreateUserLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 py-12 text-center">
        <Spinner className="h-10 w-10 text-brand mx-auto" />
        <p className="text-ink-2 mt-4 font-medium text-sm">Carregando dados da sessão...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 pb-32">
      
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-8">
        <div className="h-12 w-12 bg-brand rounded-lg flex items-center justify-center text-white shrink-0">
          <Settings className="w-6 h-6" aria-hidden="true" />
        </div>
        <SectionHeader
          title="Painel de Configurações"
          subtitle="Gerenciamento de perfil institucional e aprovações de acesso"
          className="flex-1"
        />
      </div>

      {/* Região de notificação (anunciada por leitores de tela) */}
      <div aria-live="polite" role="status" className="empty:hidden">
        <AnimatePresence>
          {notification && (
            <motion.div
              key={notification.message}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-lg border flex items-center gap-3 text-sm font-semibold ${
                notification.type === "success"
                  ? "bg-pos-50 border-pos/20 text-pos"
                  : "bg-neg-50 border-neg/20 text-neg"
              }`}
            >
              {notification.type === "success" ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-ink-2" />
              Seu Perfil
            </h3>

            {/* Profile Detail List */}
            <div className="space-y-4">
              <div className="bg-surface-2 border border-line rounded-lg p-4 flex items-start gap-3">
                <div className="h-9 w-9 bg-surface rounded-lg flex items-center justify-center text-ink-2 border border-line shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] block">Nome do Servidor</span>
                  <span className="text-sm font-semibold text-ink">{user.name}</span>
                </div>
              </div>

              <div className="bg-surface-2 border border-line rounded-lg p-4 flex items-start gap-3">
                <div className="h-9 w-9 bg-surface rounded-lg flex items-center justify-center text-ink-2 border border-line shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.08em] block">E-mail Institucional</span>
                  <span className="text-sm font-semibold text-ink break-all font-mono tabular">{user.email}</span>
                </div>
              </div>

              <div className="bg-brand-50 border border-brand/15 rounded-lg p-4 flex items-start gap-3">
                <div className="h-9 w-9 bg-surface rounded-lg flex items-center justify-center text-brand border border-brand/20 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-brand uppercase tracking-[0.08em] block">Nível de Acesso</span>
                  <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    {isAdmin ? "Administrador Contábil" : "Servidor Municipal"}
                    <span className={`inline-block h-2 w-2 rounded-full ${isAdmin ? "bg-brand" : "bg-pos"}`} aria-hidden />
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-ink-2" />
              Institucional
            </h3>
            <p className="text-ink-2 text-xs leading-relaxed font-medium">
              Este dashboard financeiro é uma plataforma restrita de Pradópolis/SP. Caso precise atualizar seus dados cadastrais ou solicitar permissões adicionais de secretaria, entre em contato diretamente com a Coordenadoria de Contabilidade e Finanças do município.
            </p>
            <div className="mt-4 pt-4 border-t border-line flex items-center gap-2 text-[10px] text-muted font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>Versão <span className="font-mono tabular">2.1.0</span> • Pradópolis/SP</span>
            </div>
          </Card>
        </div>

        {/* Right Side: Admin Permissions/Users Table */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin ? (
            <>
              {/* Cadastros de Servidores Aguardando Aprovação */}
              <Card className="p-6 min-h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-line pb-4">
                  <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand" />
                    Cadastros de Servidores Aguardando Aprovação
                  </h3>
                  <span className="bg-brand-50 text-brand border border-brand/20 text-xs font-semibold px-2.5 py-1 rounded-md">
                    <span className="font-mono tabular">{pendingUsers.length}</span> {pendingUsers.length === 1 ? "pendente" : "pendentes"}
                  </span>
                </div>

                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <Spinner className="h-8 w-8 text-brand" />
                    <span className="text-ink-2 text-xs font-semibold mt-3">Carregando solicitações...</span>
                  </div>
                ) : error ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <AlertCircle className="w-10 h-10 text-neg mb-3" />
                    <h4 className="text-sm font-bold text-ink">Falha ao buscar usuários</h4>
                    <p className="text-ink-2 text-xs font-medium max-w-md mt-1">{error}</p>
                    <button
                      onClick={fetchPendingUsers}
                      className="mt-4 px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-surface-2 border border-dashed border-line rounded-lg">
                    <Clock className="w-12 h-12 text-muted mb-3" />
                    <h4 className="text-sm font-bold text-ink">Nenhum cadastro pendente</h4>
                    <p className="text-ink-2 text-xs font-medium max-w-sm mt-1 px-4">
                      Todas as solicitações de registro de servidores municipais foram processadas e liberadas.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-line bg-surface-2">
                          <th className="px-3 py-3 text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">Servidor / E-mail</th>
                          <th className="px-3 py-3 text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em] hidden sm:table-cell">Data de Registro</th>
                          <th className="px-3 py-3 text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em] text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <AnimatePresence>
                          {pendingUsers.map((pUser) => (
                            <motion.tr
                              key={pUser.id}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, x: -50 }}
                              transition={{ duration: 0.2 }}
                              className="group hover:bg-surface-2 transition-colors"
                            >
                              <td className="py-4 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 bg-surface-2 border border-line rounded-lg flex items-center justify-center text-ink-2 shrink-0 font-semibold text-xs uppercase">
                                    {pUser.name.substring(0, 2)}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold text-ink block truncate">{pUser.name}</span>
                                    <span className="text-[10px] font-medium text-muted block truncate font-mono tabular">{pUser.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-3 hidden sm:table-cell">
                                <div className="flex items-center gap-1.5 text-ink-2 text-xs font-semibold">
                                  <Calendar className="w-3.5 h-3.5 text-muted" />
                                  <span className="font-mono tabular">
                                    {new Date(pUser.created_at).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApprove(pUser.id)}
                                    disabled={actionLoading !== null}
                                    aria-label={`Aprovar cadastro de ${pUser.name}`}
                                    className="h-8 px-3 rounded-lg bg-pos hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pos/40 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1 transition-opacity cursor-pointer"
                                  >
                                    {actionLoading === pUser.id ? (
                                      <Spinner className="h-3.5 w-3.5" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden xs:inline">Aprovar</span>
                                  </button>
                                  <button
                                    onClick={() => handleReject(pUser.id)}
                                    disabled={actionLoading !== null}
                                    aria-label={`Recusar cadastro de ${pUser.name}`}
                                    className="h-8 px-3 rounded-lg bg-neg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neg/40 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1 transition-opacity cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span className="hidden xs:inline">Rejeitar</span>
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Cadastrar Novo Servidor */}
              <Card className="p-6">
                <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-6 flex items-center gap-2 border-b border-line pb-4">
                  <UserPlus className="w-5 h-5 text-brand" />
                  Cadastrar Novo Servidor
                </h3>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="newUserName" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        id="newUserName"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        required
                        className="bg-surface border border-line focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 outline-none rounded-md px-4 py-2.5 text-xs font-medium text-ink placeholder-muted transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="newUserEmail" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                        E-mail Institucional
                      </label>
                      <input
                        type="email"
                        id="newUserEmail"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="Ex: servidor@pradopolis.sp.gov.br"
                        required
                        className="bg-surface border border-line focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 outline-none rounded-md px-4 py-2.5 text-xs font-medium text-ink placeholder-muted transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="newUserPassword" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                        Senha de Acesso (mín. 6 caracteres)
                      </label>
                      <input
                        type="password"
                        id="newUserPassword"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="bg-surface border border-line focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 outline-none rounded-md px-4 py-2.5 text-xs font-medium text-ink placeholder-muted transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4 md:pt-0 md:pl-4">
                      <input
                        type="checkbox"
                        id="newUserApproved"
                        checked={newUserApproved}
                        onChange={(e) => setNewUserApproved(e.target.checked)}
                        className="h-4 w-4 accent-brand focus-visible:ring-2 focus-visible:ring-brand/30 border-line rounded cursor-pointer"
                      />
                      <label htmlFor="newUserApproved" className="text-xs font-semibold text-ink-2 cursor-pointer select-none">
                        Aprovar acesso imediatamente
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={createUserLoading}
                      className="px-5 py-2.5 bg-brand hover:bg-brand-ink text-white font-bold text-xs rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
                    >
                      {createUserLoading ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Cadastrar Servidor</span>
                    </button>
                  </div>
                </form>
              </Card>
            </>
          ) : (
            <Card className="p-6 min-h-[400px]">
              <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand" />
                Segurança e Permissões
              </h3>

              <div className="space-y-6">
                <div className="p-4 bg-pos-50 border border-pos/20 rounded-lg flex gap-3">
                  <Check className="w-5 h-5 text-pos shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-pos uppercase tracking-[0.06em]">Acesso Homologado</h4>
                    <p className="text-xs text-ink-2 font-medium leading-relaxed mt-1">
                      Sua conta de servidor municipal está homologada e possui permissão de leitura sobre todas as receitas, despesas fixas, projeções orçamentárias e contratos vigentes do município de Pradópolis.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-surface-2 border border-line rounded-lg flex gap-3">
                  <Key className="w-5 h-5 text-ink-2 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-ink-2 uppercase tracking-[0.06em]">Ações Administrativas Restritas</h4>
                    <p className="text-xs text-ink-2 font-medium leading-relaxed mt-1">
                      Esta conta não possui nível de administrador. O gerenciamento de usuários cadastrados e controle de políticas de acesso são permitidos apenas para o e-mail de liderança da contabilidade municipal (<code className="bg-surface px-1 py-0.5 rounded border border-line font-mono tabular text-ink">contabilidade@pradopolis.sp.gov.br</code>).
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

      </div>

    </div>
  );
}
