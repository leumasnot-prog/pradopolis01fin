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
  UserPlus,
  Globe,
  ChevronDown,
  ChevronUp,
  Search,
  Home,
  TrendingDown,
  PieChart,
  DollarSign,
  FileText,
  Landmark
} from "lucide-react";

interface SystemUser {
  id: number;
  name: string;
  email: string;
  approved: number;
  allowed_screens: string | null;
  created_at: string;
}

interface UserProfile {
  name: string;
  email: string;
}

const AVAILABLE_SCREENS = [
  { id: "home", name: "Visão Geral", icon: Home },
  { id: "receita", name: "Arrecadação", icon: Landmark },
  { id: "despesas", name: "Despesas Fixas", icon: TrendingDown },
  { id: "fiorilli", name: "Consulta Fiorilli", icon: Search },
  { id: "orcamento", name: "Orçamento", icon: PieChart },
  { id: "execucao-setorial", name: "Execução Setorial", icon: DollarSign },
  { id: "planejamento", name: "Planejamento 2027", icon: Calendar },
  { id: "documentos", name: "Documentos", icon: FileText },
  { id: "settings", name: "Configurações", icon: Settings },
];

export function Configuracoes({ user }: { user: UserProfile | null }) {
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Search & Expansion States
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  // Form states for creating a new user
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserApproved, setNewUserApproved] = useState(true);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Fiorilli API states
  const [fiorilliUrl, setFiorilliUrl] = useState("");
  const [fiorilliLoading, setFiorilliLoading] = useState(true);
  const [fiorilliSaveLoading, setFiorilliSaveLoading] = useState(false);

  const isAdmin = user?.email === "contabilidade@pradopolis.sp.gov.br";

  useEffect(() => {
    fetchFiorilliUrl();
    if (isAdmin) {
      fetchSystemUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchFiorilliUrl = async () => {
    try {
      setFiorilliLoading(true);
      const res = await fetch("/api/settings/fiorilli");
      if (res.ok) {
        const data = await res.json();
        setFiorilliUrl(data.fiorilli_api_url || "");
      }
    } catch (err) {
      console.error("Error fetching fiorilli setting:", err);
    } finally {
      setFiorilliLoading(false);
    }
  };

  const handleUpdateFiorilliUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setFiorilliSaveLoading(true);
    setNotification(null);
    try {
      const res = await fetch("/api/settings/fiorilli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiorilli_api_url: fiorilliUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar URL.");
      }
      setNotification({ message: "URL do Portal Fiorilli salva com sucesso!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setFiorilliSaveLoading(false);
    }
  };

  // Auto-dispensa a notificação após alguns segundos
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const fetchSystemUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/auth/admin/users");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar servidores.");
      }
      setSystemUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao buscar cadastros.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleScreen = (userId: number, screenId: string) => {
    setSystemUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.email === "contabilidade@pradopolis.sp.gov.br") return u; // Admin locks

        const currentScreens = u.allowed_screens
          ? u.allowed_screens.split(",").map((s) => s.trim())
          : AVAILABLE_SCREENS.map((s) => s.id);

        let newScreens;
        if (currentScreens.includes(screenId)) {
          newScreens = currentScreens.filter((s) => s !== screenId);
        } else {
          newScreens = [...currentScreens, screenId];
        }

        return {
          ...u,
          allowed_screens: newScreens.join(","),
        };
      })
    );
  };

  const handleToggleApprovalState = (userId: number) => {
    setSystemUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.email === "contabilidade@pradopolis.sp.gov.br") return u;
        return {
          ...u,
          approved: u.approved === 1 ? 0 : 1,
        };
      })
    );
  };

  const handleSaveUser = async (userId: number) => {
    const userToSave = systemUsers.find((u) => u.id === userId);
    if (!userToSave) return;

    setActionLoading(userId);
    setNotification(null);
    try {
      const res = await fetch("/api/auth/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          approved: userToSave.approved === 1,
          allowed_screens: userToSave.allowed_screens,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar permissões.");
      }
      setNotification({ message: `Configurações de ${userToSave.name} salvas com sucesso!`, type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${userName}?`)) {
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
        throw new Error(data.error || "Erro ao excluir usuário.");
      }

      setSystemUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotification({ message: "Cadastro de servidor excluído com sucesso.", type: "success" });
      if (expandedUserId === userId) {
        setExpandedUserId(null);
      }
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
      
      // Refresh list to include new user
      fetchSystemUsers();
    } catch (err: any) {
      setNotification({ message: err.message || "Erro de conexão.", type: "error" });
    } finally {
      setCreateUserLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 py-12 text-center">
        <Spinner className="h-10 w-10 text-brand mx-auto animate-spin" />
        <p className="text-ink-2 mt-4 font-medium text-sm">Carregando dados da sessão...</p>
      </div>
    );
  }

  // Filtered users list based on search bar
  const filteredUsers = systemUsers.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (userId: number) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const isScreenAllowed = (allowedScreens: string | null, screenId: string, email: string) => {
    if (email === "contabilidade@pradopolis.sp.gov.br") return true;
    if (!allowedScreens) return true; // Default to all if not set
    return allowedScreens.split(",").map((s) => s.trim()).includes(screenId);
  };

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

      {/* Região de notificação */}
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

          <Card className="p-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-ink-2" />
              API Portal Fiorilli
            </h3>
            {fiorilliLoading ? (
              <div className="py-4 text-center">
                <Spinner className="h-5 w-5 text-brand mx-auto animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleUpdateFiorilliUrl} className="space-y-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fiorilliUrlInput" className="text-[10px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                    URL Base Fiorilli JSON
                  </label>
                  <input
                    id="fiorilliUrlInput"
                    type="text"
                    value={fiorilliUrl}
                    onChange={(e) => setFiorilliUrl(e.target.value)}
                    disabled={!isAdmin || fiorilliSaveLoading}
                    placeholder="http://siteDaEntidade.uf.gov.br/Transparencia/"
                    className="bg-surface border border-line focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 outline-none rounded-md px-3 py-2 text-xs font-mono text-ink placeholder-muted disabled:opacity-60 transition-colors"
                  />
                  {!isAdmin && (
                    <span className="text-[9px] font-semibold text-muted leading-tight">
                      Apenas administradores podem atualizar a URL da API.
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="submit"
                    disabled={fiorilliSaveLoading}
                    className="w-full py-2 bg-brand hover:bg-brand-ink text-white font-bold text-xs rounded-md focus-visible:outline-none disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {fiorilliSaveLoading ? <Spinner className="h-3.5 w-3.5" /> : null}
                    Salvar API URL
                  </button>
                )}
              </form>
            )}
          </Card>
        </div>

        {/* Right Side: Admin Permissions/Users Table */}
        <div className="lg:col-span-2 space-y-6">
          {isAdmin ? (
            <>
              {/* Gerenciamento de Usuários */}
              <Card className="p-6 min-h-[400px] flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-line pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink uppercase tracking-[0.06em] flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand" />
                      Gerenciamento de Servidores e Permissões
                    </h3>
                    <p className="text-ink-2 text-xs font-medium mt-1">
                      Visualize todos os cadastros, controle aprovações e configure permissões de telas para cada servidor.
                    </p>
                  </div>
                  <span className="bg-brand-50 text-brand border border-brand/20 text-xs font-semibold px-2.5 py-1 rounded-md shrink-0">
                    <span className="font-mono tabular">{systemUsers.length}</span> {systemUsers.length === 1 ? "usuário" : "usuários"}
                  </span>
                </div>

                {/* Filtro de Busca */}
                <div className="relative mb-6">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar servidor por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-line rounded-lg bg-surface text-ink text-xs font-medium focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 outline-none transition-colors"
                  />
                </div>

                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <Spinner className="h-8 w-8 text-brand animate-spin" />
                    <span className="text-ink-2 text-xs font-semibold mt-3">Carregando cadastros...</span>
                  </div>
                ) : error ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <AlertCircle className="w-10 h-10 text-neg mb-3" />
                    <h4 className="text-sm font-bold text-ink">Falha ao buscar usuários</h4>
                    <p className="text-ink-2 text-xs font-medium max-w-md mt-1">{error}</p>
                    <button
                      onClick={fetchSystemUsers}
                      className="mt-4 px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors cursor-pointer"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-surface-2 border border-dashed border-line rounded-lg">
                    <Clock className="w-12 h-12 text-muted mb-3" />
                    <h4 className="text-sm font-bold text-ink">Nenhum servidor encontrado</h4>
                    <p className="text-ink-2 text-xs font-medium max-w-sm mt-1 px-4">
                      {searchTerm ? "Tente buscar usando outro termo." : "Não há cadastros no sistema."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredUsers.map((pUser) => {
                      const isExpanded = expandedUserId === pUser.id;
                      const isUserAdmin = pUser.email === "contabilidade@pradopolis.sp.gov.br";
                      
                      // Process which screens are allowed
                      const userScreens = pUser.allowed_screens
                        ? pUser.allowed_screens.split(",").map((s) => s.trim())
                        : AVAILABLE_SCREENS.map((s) => s.id);

                      return (
                        <div
                          key={pUser.id}
                          className={`border rounded-lg transition-all overflow-hidden bg-surface ${
                            isExpanded ? "border-brand/40 shadow-sm" : "border-line hover:border-line-strong"
                          }`}
                        >
                          {/* Row Header */}
                          <div
                            onClick={() => toggleExpand(pUser.id)}
                            className="flex flex-wrap items-center justify-between gap-4 p-4 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`h-9 w-9 border rounded-lg flex items-center justify-center shrink-0 font-semibold text-xs uppercase ${
                                isUserAdmin ? "bg-brand-50 text-brand border-brand/20" : "bg-surface-2 text-ink-2 border-line"
                              }`}>
                                {pUser.name.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-ink block truncate">{pUser.name}</span>
                                  {isUserAdmin && (
                                    <span className="bg-brand-50 text-brand border border-brand/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                      Admin
                                    </span>
                                  )}
                                  {pUser.approved === 1 ? (
                                    <span className="bg-pos-50 text-pos border border-pos/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                      Aprovado
                                    </span>
                                  ) : (
                                    <span className="bg-warn-50 text-warn border border-warn/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> Pendente
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-medium text-muted block truncate font-mono tabular mt-0.5">{pUser.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="hidden sm:inline text-[10px] font-semibold text-muted uppercase tracking-[0.06em]">
                                {new Date(pUser.created_at).toLocaleDateString("pt-BR")}
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-2" /> : <ChevronDown className="w-4 h-4 text-ink-2" />}
                            </div>
                          </div>

                          {/* Expandable permission panel */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-line bg-surface-2 overflow-hidden"
                              >
                                <div className="p-4 sm:p-5 space-y-4">
                                  
                                  {/* Grid controls */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {/* Column 1: Approval Status */}
                                    <div className="space-y-2">
                                      <span className="text-[10px] font-bold text-ink-2 uppercase tracking-[0.08em] block">
                                        Status de Homologação
                                      </span>
                                      <div className="flex bg-surface rounded-lg p-0.5 border border-line w-full">
                                        <button
                                          type="button"
                                          disabled={isUserAdmin || actionLoading === pUser.id}
                                          onClick={() => handleToggleApprovalState(pUser.id)}
                                          className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                                            pUser.approved === 1
                                              ? "bg-pos text-white shadow-sm"
                                              : "text-muted hover:text-ink-2"
                                          } disabled:opacity-50`}
                                        >
                                          Aprovado
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isUserAdmin || actionLoading === pUser.id}
                                          onClick={() => handleToggleApprovalState(pUser.id)}
                                          className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all text-center cursor-pointer ${
                                            pUser.approved !== 1
                                              ? "bg-warn text-white shadow-sm"
                                              : "text-muted hover:text-ink-2"
                                          } disabled:opacity-50`}
                                        >
                                          Pendente
                                        </button>
                                      </div>
                                      {isUserAdmin && (
                                        <span className="text-[9px] font-semibold text-muted block leading-tight mt-1">
                                          O acesso do administrador principal é sempre aprovado.
                                        </span>
                                      )}
                                    </div>

                                    {/* Column 2 & 3: Allowed Screens Selection */}
                                    <div className="md:col-span-2 space-y-2">
                                      <span className="text-[10px] font-bold text-ink-2 uppercase tracking-[0.08em] block">
                                        Módulos Autorizados
                                      </span>

                                      <div className="flex flex-wrap gap-1.5">
                                        {AVAILABLE_SCREENS.map((screen) => {
                                          const ScreenIcon = screen.icon;
                                          const isAllowed = isScreenAllowed(pUser.allowed_screens, screen.id, pUser.email);
                                          return (
                                            <button
                                              key={screen.id}
                                              type="button"
                                              disabled={isUserAdmin || actionLoading === pUser.id}
                                              onClick={() => handleToggleScreen(pUser.id, screen.id)}
                                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                                                isAllowed
                                                  ? "bg-brand-50 border-brand/35 text-brand shadow-[0_1px_1px_rgba(0,0,0,0.02)]"
                                                  : "bg-surface border-line text-ink-2 hover:border-line-strong hover:text-ink"
                                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                                            >
                                              <ScreenIcon className="w-3.5 h-3.5" />
                                              <span>{screen.name}</span>
                                              {isAllowed && <Check className="w-3 h-3 text-brand" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions Footer */}
                                  <div className="pt-3 border-t border-line flex flex-wrap justify-between items-center gap-3">
                                    <div>
                                      {isUserAdmin ? (
                                        <span className="text-[10px] text-muted font-semibold flex items-center gap-1.5">
                                          <Shield className="w-3.5 h-3.5 text-brand" /> Administrador de Sistema
                                        </span>
                                      ) : null}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {!isUserAdmin && (
                                        <button
                                          type="button"
                                          disabled={actionLoading !== null}
                                          onClick={() => handleDeleteUser(pUser.id, pUser.name)}
                                          className="h-8 px-3 rounded-lg border border-line hover:border-neg/50 hover:bg-neg-50 hover:text-neg text-ink-2 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Excluir</span>
                                        </button>
                                      )}
                                      
                                      {!isUserAdmin && (
                                        <button
                                          type="button"
                                          disabled={actionLoading !== null}
                                          onClick={() => handleSaveUser(pUser.id)}
                                          className="h-8 px-3 rounded-lg bg-brand hover:bg-brand-ink text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                        >
                                          {actionLoading === pUser.id ? (
                                            <Spinner className="h-3.5 w-3.5" />
                                          ) : (
                                            <Check className="w-3.5 h-3.5" />
                                          )}
                                          <span>Salvar Permissões</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      );
                    })}
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
                        <Spinner className="h-4 w-4 animate-spin" />
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
