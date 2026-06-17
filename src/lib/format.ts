// Utilitários de formatação compartilhados (pt-BR).
// Centraliza moeda, percentual e abreviações para todos os módulos do dashboard,
// eliminando as várias cópias de `formatBRL` espalhadas pelos componentes.

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50" */
export function formatBRL(value: number): string {
  return brlFormatter.format(value || 0);
}

/**
 * Versão compacta para eixos de gráfico e cartões executivos.
 * 1530000 -> "R$ 1,5 M" | 12000 -> "R$ 12 mil"
 */
export function formatBRLCompact(value: number): string {
  const v = value || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${Math.round(abs / 1_000)} mil`;
  }
  return formatBRL(v);
}

/** Formata percentual: 72.5 -> "72,5%" (1 casa por padrão) */
export function formatPercent(value: number, digits = 1): string {
  return (
    new Intl.NumberFormat("pt-BR", {
      style: "decimal",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value || 0) + "%"
  );
}

/** Abrevia o nome longo de um setor/departamento para caber em gráficos. */
export function shortenSetor(name: string, maxLen = 20): string {
  return name
    .replace("DEPARTAMENTO MUNICIPAL DE ", "DEP. ")
    .replace("DEPARTAMENTO DE ", "DEP. ")
    .replace("SECRETARIA MUNICIPAL DE ", "SEC. ")
    .replace("SECRETARIA DE ", "SEC. ")
    .replace(" E SERVIÇOS URBANOS", "")
    .replace(" E FINANÇAS", "")
    .substring(0, maxLen);
}
