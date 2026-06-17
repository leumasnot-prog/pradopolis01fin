"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Download, 
  BookOpen, 
  AlertCircle, 
  TrendingDown, 
  FileCheck, 
  User, 
  Calendar, 
  Scale, 
  BarChart as BarIcon, 
  ShieldAlert,
  ArrowLeft
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { formatBRL, formatBRLCompact } from "@/lib/format";
import { SectionHeader, Card } from "@/components/ui/primitives";

// Paleta cívica para gráficos e séries (tokens "Cívico Moderno").
const CIVIC = {
  brand: "#1B3A6B",
  pos: "#1F7A4D",
  neg: "#B3261E",
  warn: "#9A6700",
  grid: "#D7DCE3",
  axis: "#475467",
  axisMuted: "#8A94A6",
} as const;

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  fontSize: "11px",
  border: "1px solid #D7DCE3",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 2px rgba(16,24,38,0.04)",
  color: "#101826",
  fontFamily: "var(--font-mono)",
} as const;

export function DocumentosViewer({ onBack }: { onBack?: () => void }) {
  const [selectedDoc, setSelectedDoc] = useState("receitas");

  // Loss details from dashboard_data / estudo-receitas2026.pdf
  const lossBreakdown = [
    {
      name: "IRRF (Perda Reforma)",
      bruto: 4314075.12,
      perda: 992237.28,
      liquido: 3321837.84,
      rate: 23.0,
      color: CIVIC.neg,
      description: "Queda estrutural nos repasses e retenção de IRRF provocada pela alteração das faixas de isenção federais sobre a folha salarial.",
      finding: "A reforma do Imposto de Renda causou uma retração consolidada de 21,26% no primeiro quadrimestre de 2026 em relação ao mesmo período de 2025. Estimado impacto de 23% de perda sobre o potencial bruto no orçamento de recursos próprios."
    },
    {
      name: "ISS (Serviços)",
      bruto: 7789541.84,
      perda: 1314874.66,
      liquido: 6474667.18,
      rate: 16.9,
      color: CIVIC.warn,
      description: "Inadimplência de prestadores locais e prestação de serviços terceirizados municipais.",
      finding: "Histórico estável com média de inadimplência de 15,64% entre 2020 e 2024. A Nota Fiscal Eletrônica e a grande concentração da Usina São Martinho auxiliam na contenção de perdas maiores."
    },
    {
      name: "IPTU (Patrimônio)",
      bruto: 4796492.34,
      perda: 1261477.49,
      liquido: 3535014.85,
      rate: 26.3,
      color: CIVIC.brand,
      description: "Não pagamento de proprietários urbanos no exercício corrente.",
      finding: "Inadimplência crônica de 23,2% em média (R$ 846.654,48 anuais não pagos). O pico histórico ocorreu em 2021 (pandemia) e segue em patamar elevado de 26,3%, demandando refis ativos."
    },
    {
      name: "Água e Esgoto (Tarifa)",
      bruto: 2862012.04,
      perda: 1173424.94,
      liquido: 1688587.10,
      rate: 41.0,
      color: CIVIC.pos,
      description: "Taxa de inadimplência de consumidores e falta de pagamento na tarifa de água e esgotamento sanitário.",
      finding: "Alerta Crítico: a arrecadação efetiva é de apenas 57,4%, gerando uma inadimplência acumulada de 41,0% no período. Isso inviabiliza investimentos de expansão e manutenção da autarquia."
    }
  ];

  // Water & Sewage default rate history from Page 34 of the PDF
  const waterHistory = [
    { ano: "2020", lancado: 2426542.72, pago: 1348944.24, inadimplente: 1064191.66, rate: 43.87 },
    { ano: "2021", lancado: 2504765.74, pago: 1513970.81, inadimplente: 987364.82, rate: 39.41 },
    { ano: "2022", lancado: 2413057.46, pago: 1402425.72, inadimplente: 1009652.45, rate: 41.84 },
    { ano: "2023", lancado: 2380842.24, pago: 1423172.11, inadimplente: 954611.48, rate: 40.09 },
    { ano: "2024", lancado: 2646091.01, pago: 1459330.19, inadimplente: 1167372.87, rate: 44.11 }
  ];

  // IPTU default rate history from Page 12/16 of the PDF
  const iptuHistory = [
    { ano: "2020", lancado: 2889270.87, pago: 2089270.87, inadimplente: 689270.87, rate: 23.60 },
    { ano: "2021", lancado: 3896345.08, pago: 2649032.58, inadimplente: 1247312.50, rate: 32.01 },
    { ano: "2022", lancado: 3440241.46, pago: 2664012.30, inadimplente: 664012.30, rate: 19.30 },
    { ano: "2023", lancado: 3646127.59, pago: 2780123.59, inadimplente: 712012.59, rate: 19.53 },
    { ano: "2024", lancado: 4368257.47, pago: 3318257.47, inadimplente: 987654.88, rate: 22.61 }
  ];

  const totalPerda = lossBreakdown.reduce((sum, item) => sum + item.perda, 0);

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 pb-40">
      
      {/* Voltar / Header */}
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar para a visão geral"
            className="flex h-10 shrink-0 items-center gap-1.5 px-3 justify-center rounded-lg bg-surface border border-line hover:bg-surface-2 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors cursor-pointer text-ink-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        )}
        <SectionHeader
          title="Documentos e Estudos Orçamentários"
          subtitle="Acompanhe estudos técnicos, análise de perdas fiscais e previsões orçamentárias"
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 2xl:gap-8">
        
        {/* Sidebar: Document List */}
        <div className="col-span-1 xl:col-span-4 flex flex-col gap-6">
          <Card className="p-6">
            <h4 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-4">
              Estudos Disponíveis
            </h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelectedDoc("receitas")}
                aria-pressed={selectedDoc === "receitas"}
                className={`w-full text-left p-4 rounded-lg border transition-colors flex items-start gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  selectedDoc === "receitas"
                    ? "bg-brand-50 border-brand/30 text-ink font-semibold"
                    : "bg-surface border-line hover:bg-surface-2 text-ink-2"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedDoc === "receitas" ? "bg-brand text-white" : "bg-surface-2 text-ink-2 border border-line"
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold leading-tight">Análise de Previsão de Receitas</h5>
                  <p className="text-[10px] text-muted font-medium mt-1">
                    Estudo de inadimplência, renúncias fiscais e projeção 2026.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-semibold uppercase tracking-[0.06em] text-muted">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> <span className="font-mono tabular">2026</span></span>
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> <span className="font-mono tabular">8,55 MB</span></span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                title="O estudo orçamentário de Despesas está em consolidação pela Secretaria de Planejamento."
                className="w-full text-left p-4 rounded-lg border bg-surface-2 border-line text-muted flex items-start gap-3 cursor-not-allowed opacity-70"
              >
                <div className="p-2 rounded-lg bg-surface text-muted border border-line shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold leading-tight">Estudo de Evolução do Custo Fixo</h5>
                  <p className="text-[10px] mt-1">Impactos salariais e contratos de terceirização.</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-line text-ink-2 text-[8px] font-bold tracking-[0.1em] uppercase">
                    Em Breve
                  </span>
                </div>
              </button>
            </div>

            {/* Document Info Card */}
            <div className="mt-6 p-4 rounded-lg bg-surface-2 border border-line flex flex-col gap-3">
              <h5 className="text-xs font-bold text-ink-2 uppercase tracking-[0.08em]">Ficha Técnica do PDF</h5>
              <div className="space-y-2 text-xs font-medium text-ink-2">
                <div className="flex justify-between">
                  <span className="text-muted">Documento:</span>
                  <span className="font-semibold text-ink font-mono tabular">estudo-receitas2026.pdf</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Autores:</span>
                  <span className="text-ink">Samuel Pulcini & Alex Moronta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Páginas:</span>
                  <span className="text-ink"><span className="font-mono tabular">78</span> páginas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Métodos:</span>
                  <span className="text-ink text-right">Regressão Linear & Médias Ponderadas</span>
                </div>
              </div>
              <a
                href="/estudo-receitas2026.pdf"
                download="estudo-receitas2026.pdf"
                className="mt-2 w-full py-2.5 px-4 rounded-lg bg-brand text-white hover:bg-brand-ink text-xs font-bold transition-colors text-center flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Download className="w-4 h-4" /> Baixar PDF Original
              </a>
            </div>
          </Card>
        </div>

        {/* Content Panel: Detailed Analysis */}
        <div className="col-span-1 xl:col-span-8 flex flex-col gap-6">
          
          {/* Main Info Card */}
          <Card className="p-8 flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-warn-50 text-warn text-[10px] font-bold border border-warn/20 uppercase tracking-[0.08em]">
                  <ShieldAlert className="w-3.5 h-3.5" /> Estudo Técnico de Arrecadação
                </span>
                <h3 className="font-display text-xl font-bold text-ink tracking-tight mt-2">
                  Diagnóstico de Inadimplência e Frustração de Receitas 2026
                </h3>
                <p className="text-ink-2 text-xs mt-1">Análise detalhada das perdas projetadas de <span className="font-mono tabular text-neg">{formatBRL(totalPerda)}</span> sobre os recursos próprios.</p>
              </div>
              <a
                href="/estudo-receitas2026.pdf"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir o PDF do estudo de receitas em nova aba"
                className="py-2 px-3 rounded-lg border border-line text-xs font-semibold text-ink-2 hover:text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4" /> Ler PDF
              </a>
            </div>

            {/* Total Loss Display */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-lg bg-neg-50 border border-neg/20 items-center">
              <div className="md:col-span-4 space-y-1">
                <span className="text-[10px] font-bold text-neg uppercase tracking-[0.08em] block">Perda Total Projetada</span>
                <h3 className="font-mono tabular text-3xl font-bold text-neg tracking-tight">
                  {formatBRL(totalPerda)}
                </h3>
                <span className="text-[10px] font-medium text-ink-2 block">Recursos Não Arrecadados no Exercício</span>
              </div>
              <div className="md:col-span-8">
                <p className="text-xs font-medium text-ink-2 leading-relaxed">
                  O estudo técnico indica que Pradópolis enfrenta um risco fiscal severo decorrente da frustração de receitas próprias. De cada R$ 100 previstos brutamente em impostos e tarifas, cerca de <strong className="font-mono tabular text-neg">R$ 21,30</strong> são perdidos por inadimplência corrente ou alterações na legislação tributária, reduzindo a capacidade municipal para novos investimentos públicos.
                </p>
              </div>
            </div>

            {/* Recharts Breakdown */}
            <div>
              <h4 className="text-sm font-bold text-ink uppercase tracking-[0.06em] mb-4">
                Distribuição das Perdas de Receita por Rubrica
              </h4>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lossBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CIVIC.grid} />
                    <XAxis type="number" tickFormatter={(val) => `R$ ${(val/1000000).toFixed(1)}M`} tick={{ fill: CIVIC.axisMuted, fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tickLine={false} tick={{ fill: CIVIC.axis, fontSize: 11, fontWeight: "bold" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: "rgba(27,58,107,0.06)" }}
                      formatter={(val) => [formatBRL(Number(val)), "Valor Perda"]}
                    />
                    <Bar dataKey="perda" radius={[0, 4, 4, 0]} barSize={16}>
                      {lossBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Cards: Deep Dive per Tax */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lossBreakdown.map((item, idx) => (
              <Card
                key={idx}
                className="p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-display text-sm font-bold text-ink tracking-tight">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular font-semibold bg-surface-2 border border-line" style={{ color: item.color }}>
                      {item.rate}% Inadimplência
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-muted mt-1">{item.description}</p>

                  <div className="grid grid-cols-3 gap-2 my-4 border-y border-line py-3 text-center">
                    <div>
                      <span className="text-[9px] text-muted font-semibold uppercase tracking-[0.06em] block">Previsão Bruta</span>
                      <span className="text-xs font-mono tabular font-semibold text-ink" title={formatBRL(item.bruto)}>{formatBRLCompact(item.bruto)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.06em] block" style={{ color: item.color }}>Perda Estimada</span>
                      <span className="text-xs font-mono tabular font-semibold" style={{ color: item.color }} title={formatBRL(item.perda)}>-{formatBRLCompact(item.perda)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted font-semibold uppercase tracking-[0.06em] block">Receita Líquida</span>
                      <span className="text-xs font-mono tabular font-semibold text-ink" title={formatBRL(item.liquido)}>{formatBRLCompact(item.liquido)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface-2 rounded-lg border border-line mt-2">
                  <p className="text-[10px] font-medium text-ink-2 leading-relaxed">
                    <strong className="text-ink">Estudo Técnico:</strong> {item.finding}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Deep Dive Section: Water & Sewage Detail (Page 34) */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pos-50 text-pos border border-pos/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-ink tracking-tight">Estudo Crítico: Tarifa de Água e Esgoto (Pág. 34)</h4>
                <p className="text-[11px] text-ink-2 font-medium">Inadimplência alarmante compromete a sustentabilidade do saneamento</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* History Table */}
              <div className="lg:col-span-7 overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-surface-2">
                    <tr className="text-[9px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                      <th className="px-3 py-2 text-left">Ano</th>
                      <th className="px-3 py-2 text-right">Lançado (R$)</th>
                      <th className="px-3 py-2 text-right">Pago (R$)</th>
                      <th className="px-3 py-2 text-right">Inadimplido (R$)</th>
                      <th className="px-3 py-2 text-right">% Inad.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[10px] font-medium text-ink-2">
                    {waterHistory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-2 transition-colors">
                        <td className="px-3 py-2 text-left font-mono tabular font-semibold text-ink">{row.ano}</td>
                        <td className="px-3 py-2 text-right font-mono tabular">{formatBRL(row.lancado).replace("R$", "")}</td>
                        <td className="px-3 py-2 text-right font-mono tabular text-pos">{formatBRL(row.pago).replace("R$", "")}</td>
                        <td className="px-3 py-2 text-right font-mono tabular text-neg">{formatBRL(row.inadimplente).replace("R$", "")}</td>
                        <td className="px-3 py-2 text-right font-mono tabular font-semibold text-neg">{row.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Text Context */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-pos-50 border border-pos/20 rounded-lg">
                  <h5 className="text-xs font-bold text-pos">Conclusão do Estudo Municipal</h5>
                  <p className="text-[10px] text-ink-2 leading-relaxed mt-1 font-medium">
                    "A média histórica de arrecadação efetiva é de apenas <strong className="font-mono tabular text-ink">57,4%</strong>. Isso significa que cerca de <strong className="font-mono tabular text-ink">42,6%</strong> dos valores faturados tornam-se dívida ativa. Recomenda-se a reestruturação dos processos de corte e cobrança, bem como campanhas ativas para restabelecer a sustentabilidade operacional."
                  </p>
                </div>
                <div className="p-4 bg-warn-50 border border-warn/20 rounded-lg">
                  <h5 className="text-xs font-bold text-warn">Metodologia Projeção 2026</h5>
                  <p className="text-[10px] text-ink-2 leading-relaxed mt-1 font-medium">
                    A projeção adota uma postura conservadora, fixando crescimento estável de 4% ao ano para a tarifa bruta lançada, mas projetando a perda em 41% para fins de realista liquidez orçamentária do Tesouro.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Deep Dive Section: IPTU Detail (Page 11-12) */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand border border-brand/20">
                <BarIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold text-ink tracking-tight">Análise Histórica: Arrecadação de IPTU (Pág. 11-12)</h4>
                <p className="text-[11px] text-ink-2 font-medium">Projeção conservadora baseada em crescimento nominal por inflação e novos loteamentos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Context */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-brand-50 border border-brand/20 rounded-lg">
                  <h5 className="text-xs font-bold text-brand">Crescimento da Arrecadação</h5>
                  <p className="text-[10px] text-ink-2 leading-relaxed mt-1 font-medium">
                    O IPTU municipal cresceu aproximadamente <strong className="font-mono tabular text-ink">51%</strong> entre 2020 e 2024, saltando de R$ 2,88M para R$ 4,36M. No entanto, a inadimplência média anual persistiu em <strong className="font-mono tabular text-ink">23,2%</strong> (média de R$ 846.654,48 não recolhidos por ano).
                  </p>
                </div>
                <div className="p-4 bg-surface-2 border border-line rounded-lg">
                  <h5 className="text-xs font-bold text-ink">Diretrizes para Projeção 2026</h5>
                  <p className="text-[10px] text-ink-2 leading-relaxed mt-1 font-medium">
                    A receita de 2026 é projetada com base no IPCA de 3,5% somado a 2,08% de crescimento real proveniente da expansão imobiliária e consolidação de novos loteamentos na cidade.
                  </p>
                </div>
              </div>

              {/* History Table */}
              <div className="lg:col-span-7 overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-surface-2">
                    <tr className="text-[9px] font-semibold text-ink-2 uppercase tracking-[0.08em]">
                      <th className="px-3 py-2 text-left">Ano</th>
                      <th className="px-3 py-2 text-right">Lançado (R$)</th>
                      <th className="px-3 py-2 text-right">Pago (R$)</th>
                      <th className="px-3 py-2 text-right">Inadimplido (R$)</th>
                      <th className="px-3 py-2 text-right">% Inad.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[10px] font-medium text-ink-2">
                    {iptuHistory.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-2 transition-colors">
                        <td className="px-3 py-2 text-left font-mono tabular font-semibold text-ink">{row.ano}</td>
                        <td className="px-3 py-2 text-right font-mono tabular">{formatBRL(row.lancado).replace("R$", "")}</td>
                        <td className="px-3 py-2 text-right font-mono tabular text-brand">{formatBRL(row.pago).replace("R$", "")}</td>
                        <td className="px-3 py-2 text-right font-mono tabular text-neg">{formatBRL(row.inadimplente).replace("R$", "")}</td>
                        <td className="px-3 py-2 text-right font-mono tabular font-semibold text-neg">{row.rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
