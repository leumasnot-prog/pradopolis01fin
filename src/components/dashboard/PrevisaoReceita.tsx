"use client";

import { useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChevronRight,
  ChevronDown,
  Landmark,
  Globe,
  Layers,
  BadgeDollarSign,
  Search,
  XCircle,
  Inbox,
} from "lucide-react";

import treemapDataRaw from "@/data/treemap_data.json";
import treetableDataRaw from "@/data/treetable_data.json";
import { formatBRL } from "@/lib/format";
import { Card, SectionHeader, StatCard } from "@/components/ui/primitives";

const treemapData = treemapDataRaw as any[];
const treetableData = treetableDataRaw as any[];

// Estilo de tooltip cívico compartilhado pelos gráficos recharts.
const civicTooltip = {
  borderRadius: "10px",
  border: "1px solid #D7DCE3",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 16px rgba(16,24,38,0.08)",
  color: "#101826",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
} as const;

// Custom Treemap Content to display names and values nicely
const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, value, payload } = props;

  const displayValue = value ?? payload?.value ?? 0;
  const displayName = name ?? payload?.name ?? "";

  // Próprio (Tesouro) = pos institucional; Vinculado = marca.
  const isTesouro = displayName.includes("Próprio") || displayName.includes("Tesouro");
  const bg = isTesouro ? "#1F7A4D" : "#1B3A6B";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: bg,
          stroke: "#ffffff",
          strokeWidth: 2,
          strokeOpacity: 0.9,
        }}
        rx={8}
        ry={8}
      />
      {width > 120 && height > 60 ? (() => {
        const nameFs = width > 250 ? 18 : 14;
        const valueFs = width > 250 ? 16 : 13;
        const avail = width - 32;
        // Condensa o texto (textLength) só quando ele não caberia no tile, para
        // nunca vazar a borda — mostra o rótulo inteiro, sem corte e sem reticências.
        const fit = (text: string, size: number) =>
          text.length * size * 0.58 > avail
            ? { textLength: Math.max(1, avail), lengthAdjust: "spacingAndGlyphs" as const }
            : {};
        return (
          <>
            <text x={x + 16} y={y + 36} fill="#ffffff" fontSize={nameFs} fontWeight={700} {...fit(displayName, nameFs)}>
              {displayName}
            </text>
            <text x={x + 16} y={y + 60} fill="#ffffff" fontSize={valueFs} fontWeight={500} opacity={0.9} {...fit(formatBRL(displayValue), valueFs)}>
              {formatBRL(displayValue)}
            </text>
          </>
        );
      })() : null}
    </g>
  );
};

// Recursive Component for the Tree Table
const TreeNode = ({
  node,
  level = 0,
  forceOpen = false,
}: {
  node: any;
  level?: number;
  /** Quando há busca ativa, mantém os ramos correspondentes abertos. */
  forceOpen?: boolean;
}) => {
  // Level 0 (Roots) are open by default. Levels 1+ are closed by default.
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const expanded = forceOpen || isExpanded;

  const hasChildren = node.children && node.children.length > 0;
  const paddingLeft = level * 1.5 + 1.25; // rem

  const isLevel0 = level === 0;
  const isLevel1 = level === 1;

  // Determine source to apply consistent color styling
  // We can check if it's the root node itself, or bubble down from its parent ID/structure
  const isTesouro = node.id === "01" || node.id.startsWith("11") || node.id.startsWith("12") || node.id.startsWith("13") || node.id.startsWith("16") || node.id.startsWith("19") || node.id.startsWith("22") || node.id.startsWith("29") || (node.id.startsWith("17") && !["1713", "1714", "1716", "1719.6", "1721.53", "1722.51", "1724", "1751"].some(p => node.id.startsWith(p)));

  // Custom design based on level
  const rowStyle = isLevel0
    ? isTesouro
      ? "bg-pos-50 border-l-4 border-l-pos hover:bg-pos-50/70 text-ink"
      : "bg-brand-50 border-l-4 border-l-brand hover:bg-brand-50/70 text-ink"
    : isLevel1
      ? "bg-surface-2 hover:bg-surface-2/70 text-ink-2"
      : "hover:bg-surface-2 text-ink-2";

  return (
    <>
      <tr
        className={`border-b border-line transition-colors ${rowStyle}`}
        onClick={() => hasChildren && !forceOpen && setIsExpanded(!isExpanded)}
        style={{ cursor: hasChildren && !forceOpen ? "pointer" : "default" }}
      >
        <td className="py-4 px-6 flex items-center gap-2" style={{ paddingLeft: `${paddingLeft}rem` }}>
          {hasChildren ? (
            expanded ? (
              <ChevronDown className={`w-4.5 h-4.5 ${isLevel0 ? "text-ink-2" : "text-muted"}`} />
            ) : (
              <ChevronRight className={`w-4.5 h-4.5 ${isLevel0 ? "text-ink-2" : "text-muted"}`} />
            )
          ) : (
            <span className="w-4.5 h-4.5 inline-block"></span>
          )}

          <div className="flex items-center gap-2.5 flex-wrap">
            {isLevel0 && (
              isTesouro ? (
                <Landmark className="w-4.5 h-4.5 text-pos shrink-0" />
              ) : (
                <Globe className="w-4.5 h-4.5 text-brand shrink-0" />
              )
            )}

            <span className={`text-sm ${
              isLevel0 ? 'text-base font-bold text-ink' :
              isLevel1 ? 'font-semibold text-ink' :
              'text-ink-2 font-medium'
            }`}>
              {!isLevel0 && <span className="text-muted font-mono tabular text-xs mr-2">{node.id}</span>}
              {node.name}
            </span>

            {node.siglas && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-[0.06em] border ${
                isTesouro
                  ? "bg-pos-50 text-pos border-pos/25"
                  : "bg-brand-50 text-brand border-brand/25"
              }`}>
                {node.siglas}
              </span>
            )}
          </div>
        </td>
        <td className="py-4 px-6 text-right">
          <span className={`font-mono tabular text-sm ${
            isLevel0 ? 'text-ink text-base font-bold' :
            isLevel1 ? 'text-ink font-semibold' :
            'text-ink-2 font-medium'
          }`}>
            {formatBRL(node.value)}
          </span>
        </td>
      </tr>

      {expanded && hasChildren && (
        <>
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} level={level + 1} forceOpen={forceOpen} />
          ))}
        </>
      )}
    </>
  );
};

/** Filtra recursivamente a árvore mantendo ramos que contêm o termo buscado. */
function filterTree(nodes: any[], term: string): any[] {
  if (!term) return nodes;
  const lower = term.toLowerCase();
  const matchNode = (node: any): any | null => {
    const selfMatch =
      (node.name && node.name.toLowerCase().includes(lower)) ||
      (node.id && String(node.id).toLowerCase().includes(lower)) ||
      (node.siglas && String(node.siglas).toLowerCase().includes(lower));
    const children = node.children
      ? node.children.map(matchNode).filter(Boolean)
      : [];
    if (selfMatch || children.length > 0) {
      return { ...node, children: children.length > 0 ? children : node.children };
    }
    return null;
  };
  return nodes.map(matchNode).filter(Boolean);
}

export function PrevisaoReceita() {
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate dynamic stats from treetableData
  const totalRevenue = treetableData.reduce((acc, curr) => acc + curr.value, 0);
  const tesouroNode = treetableData.find((n) => n.id === "01");
  const vinculadosNode = treetableData.find((n) => n.id === "02");

  const tesouroVal = tesouroNode?.value ?? 0;
  const vinculadosVal = vinculadosNode?.value ?? 0;

  const tesouroPercent = totalRevenue > 0 ? (tesouroVal / totalRevenue) * 100 : 0;
  const vinculadosPercent = totalRevenue > 0 ? (vinculadosVal / totalRevenue) * 100 : 0;

  // O React Compiler memoiza automaticamente; filterTree é puro sobre o termo.
  const filteredTree = filterTree(treetableData, searchTerm.trim());
  const hasRevenue = treetableData.length > 0 && totalRevenue > 0;
  const hasResults = filteredTree.length > 0;

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 pb-16">

      {/* Header */}
      <div className="mb-8">
        <SectionHeader
          title="Previsão da Receita"
          subtitle="Estrutura e detalhamento dos recursos financeiros previstos para o município em 2026"
        />
      </div>

      {/* Estado vazio global: dados de receita indisponíveis */}
      {!hasRevenue ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink tracking-tight">Sem dados de receita</h3>
          <p className="text-sm font-medium text-ink-2 max-w-md">
            Não há previsão de receita disponível para o exercício selecionado. Verifique a fonte de dados.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary Cards — primitivos compartilhados (StatCard) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Previsão Total"
              value={formatBRL(totalRevenue)}
              subtitle="Orçamento Municipal 2026"
              icon={BadgeDollarSign}
              iconBgClass="bg-brand-50"
              iconColorClass="text-brand"
            />
            <StatCard
              title="Recursos Próprios (Tesouro)"
              value={formatBRL(tesouroVal)}
              subtitle={`${tesouroPercent.toFixed(1).replace(".", ",")}% do orçamento`}
              icon={Landmark}
              iconBgClass="bg-pos-50"
              iconColorClass="text-pos"
              valueColorClass="text-pos"
            />
            <StatCard
              title="Recursos Vinculados"
              value={formatBRL(vinculadosVal)}
              subtitle={`${vinculadosPercent.toFixed(1).replace(".", ",")}% do orçamento`}
              icon={Globe}
              iconBgClass="bg-brand-50"
              iconColorClass="text-brand"
              valueColorClass="text-brand"
            />
          </div>

          {/* Barra de proporção Próprio x Vinculado — leitura instantânea da composição */}
          <Card className="p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em]">
                Composição da Previsão · 2026
              </span>
              <div className="flex items-center gap-4 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-pos">
                  <span className="h-2.5 w-2.5 rounded-full bg-pos" />
                  Próprio <span className="font-mono tabular">{tesouroPercent.toFixed(1).replace(".", ",")}%</span>
                </span>
                <span className="flex items-center gap-1.5 text-brand">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  Vinculado <span className="font-mono tabular">{vinculadosPercent.toFixed(1).replace(".", ",")}%</span>
                </span>
              </div>
            </div>
            <div
              className="flex h-3.5 w-full overflow-hidden rounded-md bg-surface-2 border border-line"
              role="img"
              aria-label={`Recursos próprios ${tesouroPercent.toFixed(0)} por cento, recursos vinculados ${vinculadosPercent.toFixed(0)} por cento`}
            >
              <div
                className="h-full bg-pos transition-all duration-700"
                style={{ width: `${tesouroPercent}%` }}
              />
              <div
                className="h-full bg-brand transition-all duration-700"
                style={{ width: `${vinculadosPercent}%` }}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 2xl:gap-8 animate-fadeIn">

            {/* Treemap Card */}
            <div className="col-span-1 xl:col-span-12 rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
                <div>
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.14em] block">Orçamento · 2026</span>
                  <h4 className="font-display text-lg font-bold text-ink tracking-tight mt-1">Divisão por Fonte de Recurso</h4>
                  <span className="text-sm font-medium text-ink-2">Proporção entre Recursos Próprios e Recursos Vinculados</span>
                </div>
                <div className="flex items-center gap-4 bg-surface-2 px-3.5 py-2 rounded-lg border border-line">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-pos-50 text-pos">
                      <Landmark className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-ink-2">Próprio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-50 text-brand">
                      <Globe className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium text-ink-2">Vinculado</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-[320px]">
                {treemapData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                      fill="#1B3A6B"
                      content={<CustomizedContent />}
                      isAnimationActive={false}
                    >
                      <Tooltip
                        formatter={(value: any) => formatBRL(Number(value))}
                        contentStyle={civicTooltip}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center text-muted gap-2">
                    <Inbox className="w-8 h-8" />
                    <span className="text-sm font-semibold">Sem dados para exibir no mapa.</span>
                  </div>
                )}
              </div>
            </div>

            {/* TreeTable Card */}
            <div className="col-span-1 xl:col-span-12 rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(16,24,38,0.04)] p-6 sm:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-2 text-ink-2 border border-line">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-bold text-ink tracking-tight">Detalhamento por Fonte de Recurso</h4>
                    <span className="text-sm font-medium text-ink-2">Expanda os grupos e macro categorias para ver os valores das contas contábeis</span>
                  </div>
                </div>

                {/* Busca na árvore de receitas */}
                <div className="relative w-full md:w-72">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar conta, código ou sigla..."
                    aria-label="Buscar na árvore de receitas"
                    className="w-full pl-10 pr-9 py-2 text-sm font-medium rounded-lg border border-line bg-surface text-ink placeholder-muted focus:outline-none focus:ring-4 focus:ring-pos/20 focus:border-pos transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      aria-label="Limpar busca"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-2 border-b border-line">
                      <th className="py-4 px-6 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em]">Código e Especificação</th>
                      <th className="py-4 px-6 text-[11px] font-semibold text-ink-2 uppercase tracking-[0.06em] text-right w-64">Previsão (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasResults ? (
                      filteredTree.map((rootNode) => (
                        <TreeNode key={rootNode.id} node={rootNode} forceOpen={!!searchTerm.trim()} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted">
                            <Search className="w-7 h-7" />
                            <span className="text-sm font-semibold text-ink-2">
                              Nenhuma conta encontrada para &ldquo;{searchTerm}&rdquo;.
                            </span>
                            <button
                              onClick={() => setSearchTerm("")}
                              className="mt-1 text-xs font-bold text-pos hover:text-pos/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pos rounded"
                            >
                              Limpar busca
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
