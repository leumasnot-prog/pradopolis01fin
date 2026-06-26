"use client";

import { useState, useMemo } from "react";
import {
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Inbox,
} from "lucide-react";
import { Card, StatusBadge } from "@/components/ui/primitives";
import { formatBRL, formatPercent } from "@/lib/format";
import orcamentoDataRaw from "@/data/orcamento_data.json";

const orcamentoData = orcamentoDataRaw as {
  fichas: Array<{
    ficha: string;
    categoria: string;
    setor: string;
    funcao: string;
    subfuncao: string;
    catecficha: string;
    especificacao: string;
    dotacao: number;
    empenhado: number;
    liquidado: number;
    pago: number;
    apagar: number;
    saldo: number;
    percentual_consumido: number;
    status: "normal" | "warning" | "critical";
  }>;
};

/** Mapeia código de função (zero-padded 2 dígitos) → label em orcamento_data.json */
export const FUNCAO_COD_TO_LABEL: Record<string, string> = {
  "10": "Saúde",
  "08": "Assistência Social",
  "26": "Transporte",
  "15": "Urbanismo",
  "12": "Educação",
  "04": "Administração",
  "02": "Judiciária",
  "06": "Segurança Pública",
  "13": "Cultura",
  "17": "Saneamento",
  "18": "Gestão Ambiental",
  "22": "Indústria",
  "27": "Desporto e Lazer",
};

interface Props {
  /** Label da funcao como aparece em orcamento_data.json (ex: "Saúde", "Educação"). */
  funcaoLabel: string;
  className?: string;
}

type SortKey = "ficha" | "dotacao" | "empenhado" | "liquidado" | "saldo" | "percentual_consumido";

const ITEMS_PER_PAGE = 10;

export function FichasSetorTable({ funcaoLabel, className }: Props) {
  const fichas = useMemo(
    () => orcamentoData.fichas.filter((f) => f.funcao === funcaoLabel),
    [funcaoLabel],
  );

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "dotacao",
    dir: "desc",
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return fichas.filter(
      (f) =>
        f.ficha.includes(q) ||
        f.especificacao.toLowerCase().includes(q) ||
        f.subfuncao.toLowerCase().includes(q) ||
        f.catecficha.includes(q),
    );
  }, [fichas, search]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      let va = a[sort.key];
      let vb = b[sort.key];
      if (typeof va === "string" && typeof vb === "string") {
        const na = Number(va);
        const nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb)) {
          va = na;
          vb = nb;
        } else {
          return sort.dir === "asc" ? va.localeCompare(vb, "pt-BR") : vb.localeCompare(va, "pt-BR");
        }
      }
      return sort.dir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return items;
  }, [filtered, sort]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE) || 1;
  const paged = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
    setPage(1);
  };

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, f) => {
          acc.dotacao += f.dotacao;
          acc.empenhado += f.empenhado;
          acc.liquidado += f.liquidado;
          acc.saldo += f.saldo;
          return acc;
        },
        { dotacao: 0, empenhado: 0, liquidado: 0, saldo: 0 },
      ),
    [filtered],
  );

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />;
    return sort.dir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-brand" />
    ) : (
      <ChevronDown className="w-3 h-3 text-brand" />
    );
  };

  const th = (label: string, k: SortKey, align: "left" | "right" = "right") => (
    <th
      onClick={() => handleSort(k)}
      className={`py-3 px-4 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em] cursor-pointer hover:bg-surface-2 hover:text-ink transition-colors select-none group ${align === "right" ? "text-right" : "text-left"}`}
    >
      <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {align === "right" && <SortIcon k={k} />}
        <span>{label}</span>
        {align !== "right" && <SortIcon k={k} />}
      </div>
    </th>
  );

  if (fichas.length === 0) return null;

  return (
    <Card className={`p-6 shadow-sm hover:shadow-md transition-all duration-300 ${className ?? ""}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h4 className="font-display text-lg font-bold text-ink tracking-tight">
            Fichas Orçamentárias
          </h4>
          <p className="text-xs font-medium text-ink-2 mt-0.5">
            Dotações e execução por ficha · {" "}
            <span className="font-mono tabular text-brand font-bold">{filtered.length}</span>{" "}
            {filtered.length !== fichas.length && (
              <span>de <span className="font-mono tabular">{fichas.length}</span> </span>
            )}
            fichas
          </p>
        </div>
        <div className="relative w-full sm:w-60">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar ficha, subfunção..."
            className="w-full pl-10 pr-9 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus:border-brand transition-colors shadow-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink"
              aria-label="Limpar busca"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="bg-surface-2 border-b border-line">
              {th("Ficha", "ficha", "left")}
              <th className="py-3 px-4 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em] text-left">
                Especificação / Subfunção
              </th>
              {th("Dotação", "dotacao")}
              {th("Empenhado", "empenhado")}
              {th("Liquidado", "liquidado")}
              {th("Saldo", "saldo")}
              {th("% Exec.", "percentual_consumido")}
              <th className="py-3 px-4 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em] text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {paged.length > 0 ? (
              paged.map((f) => (
                <tr key={f.ficha} className="hover:bg-surface-2/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-md bg-surface-2 text-ink-2 border border-line font-mono tabular text-xs font-semibold">
                      {f.ficha}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-[260px]">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-ink line-clamp-1">{f.especificacao}</span>
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.06em] mt-0.5 line-clamp-1">
                        {f.subfuncao} · {f.catecficha}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm text-ink">
                    {formatBRL(f.dotacao)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm text-ink">
                    {formatBRL(f.empenhado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold text-ink">
                    {formatBRL(f.liquidado)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular text-xs text-ink-2">
                    {formatBRL(f.saldo)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono tabular text-xs font-semibold text-ink">
                        {formatPercent(f.percentual_consumido)}
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-line overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            f.status === "critical"
                              ? "bg-neg"
                              : f.status === "warning"
                                ? "bg-warn"
                                : "bg-brand"
                          }`}
                          style={{ width: `${Math.min(f.percentual_consumido, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge
                      tone={
                        f.status === "critical"
                          ? "critical"
                          : f.status === "warning"
                            ? "attention"
                            : "healthy"
                      }
                    >
                      {f.status === "critical" ? "crítico" : f.status === "warning" ? "atenção" : "normal"}
                    </StatusBadge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <Inbox className="w-7 h-7" />
                    <span className="text-xs font-semibold">Nenhuma ficha encontrada.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-surface-2 border-t-2 border-line-strong font-semibold text-ink">
                <td colSpan={2} className="py-3 px-4 text-[11px] font-bold uppercase text-ink-2 tracking-[0.06em]">
                  Total ({filtered.length})
                </td>
                <td className="py-3 px-4 text-right font-mono tabular text-sm">{formatBRL(totals.dotacao)}</td>
                <td className="py-3 px-4 text-right font-mono tabular text-sm">{formatBRL(totals.empenhado)}</td>
                <td className="py-3 px-4 text-right font-mono tabular text-sm font-semibold">{formatBRL(totals.liquidado)}</td>
                <td className="py-3 px-4 text-right font-mono tabular text-xs text-ink-2">{formatBRL(totals.saldo)}</td>
                <td colSpan={2} className="py-3 px-4 text-right font-mono tabular text-xs text-ink-2">
                  {totals.dotacao > 0 ? formatPercent((totals.empenhado / totals.dotacao) * 100) : "—"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-3">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.06em]">
            Página <span className="font-mono tabular">{page}</span> de{" "}
            <span className="font-mono tabular">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Próxima página"
              className="p-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-ink-2 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
