// Regras de negócio de saúde fiscal, extraídas do JSX da Visão Geral.
// Mantém a lógica de classificação (saudável / atenção / crítico) e os textos
// explicativos em um único lugar, facilitando teste e manutenção.

import { formatBRL } from "./format";

export type FiscalLevel = "healthy" | "attention" | "critical";

export interface FiscalStatusInput {
  activeYear: string;
  /** Índice de comprometimento da receita líquida (%) */
  indiceVal: number;
  /** Perda total projetada por inadimplência + reforma IRRF */
  inadiTotal: number;
  /** Receita líquida disponível após deduzir perdas */
  receitaLiquidaDisponivel: number;
  /** Despesa fixa já ajustada pelo simulador */
  despesaAjustada: number;
  /** Saldo (déficit/superávit) projetado */
  saldoAjustado: number;
}

export interface FiscalStatus {
  level: FiscalLevel;
  statusText: string;
  explanationText: string;
  /** Classe de fundo do dot de status (ex.: bg-neg) */
  statusColorClass: string;
  /** Classes do badge de alerta */
  alertBgClass: string;
}

/** Deriva apenas o nível (usado para bordas e cores do medidor). */
export function getFiscalLevel(indiceVal: number): FiscalLevel {
  if (indiceVal > 85) return "critical";
  if (indiceVal >= 70) return "attention";
  return "healthy";
}

const STYLES: Record<FiscalLevel, { statusColorClass: string; alertBgClass: string }> = {
  healthy: {
    statusColorClass: "bg-pos",
    alertBgClass: "bg-pos-50 text-pos border border-pos/25",
  },
  attention: {
    statusColorClass: "bg-warn",
    alertBgClass: "bg-warn-50 text-warn border border-warn/25",
  },
  critical: {
    statusColorClass: "bg-neg",
    alertBgClass: "bg-neg-50 text-neg border border-neg/25",
  },
};

function pct(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/**
 * Calcula o status fiscal completo (nível, textos e classes de cor).
 * Reproduz fielmente a lógica que estava embutida no DashboardOverview.
 */
export function getFiscalStatus(input: FiscalStatusInput): FiscalStatus {
  const {
    activeYear,
    indiceVal,
    inadiTotal,
    receitaLiquidaDisponivel,
    despesaAjustada,
    saldoAjustado,
  } = input;

  let level: FiscalLevel = "healthy";
  let statusText = "Saúde Fiscal Excelente";
  let explanationText = "";

  if (activeYear === "2026") {
    if (indiceVal > 100) {
      level = "critical";
      statusText = "Déficit Crítico no Tesouro";
      explanationText = `Atenção: O cálculo do saldo do Tesouro desconta a perda por inadimplência e reforma do IRRF (23%), totalizando ${formatBRL(
        inadiTotal,
      )} em perdas. A receita líquida real de ${formatBRL(
        receitaLiquidaDisponivel,
      )} não cobre as despesas fixas de ${formatBRL(
        despesaAjustada,
      )}, resultando em um comprometimento de ${pct(
        indiceVal,
      )}% e gerando um déficit real de ${formatBRL(Math.abs(saldoAjustado))}.`;
    } else if (indiceVal >= 85) {
      level = "critical";
      statusText = "Alerta de Alto Comprometimento";
      explanationText = `Alerta: Subtraindo as perdas estimadas de ${formatBRL(
        inadiTotal,
      )}, a receita líquida real é de ${formatBRL(
        receitaLiquidaDisponivel,
      )}. As despesas fixas consomem ${pct(
        indiceVal,
      )}% desse total, deixando o Tesouro sob forte pressão e com déficit de ${formatBRL(
        Math.abs(saldoAjustado),
      )}.`;
    } else if (indiceVal >= 70) {
      level = "attention";
      statusText = "Equilíbrio em Atenção";
      explanationText = `Atenção: Após deduzir as perdas por inadimplência e reforma do IRRF (${formatBRL(
        inadiTotal,
      )}), as despesas fixas consomem ${pct(
        indiceVal,
      )}% da receita líquida disponível (${formatBRL(receitaLiquidaDisponivel)}). ${
        saldoAjustado < 0
          ? `Déficit residual de ${formatBRL(Math.abs(saldoAjustado))}`
          : `Superávit residual de ${formatBRL(saldoAjustado)}`
      }.`;
    } else {
      level = "healthy";
      statusText = "Saúde Fiscal Equilibrada";
      explanationText = `Equilíbrio atingido: Mesmo deduzindo as perdas por inadimplência e reforma do IRRF (${formatBRL(
        inadiTotal,
      )}), as despesas fixas estão controladas em ${pct(
        indiceVal,
      )}% da receita líquida disponível (${formatBRL(
        receitaLiquidaDisponivel,
      )}). Superávit de ${formatBRL(saldoAjustado)}.`;
    }
  } else {
    explanationText = `Fonte de recurso 01-TESOURO. Excelente equilíbrio: de cada R$ 100 arrecadados, apenas R$ ${indiceVal.toFixed(
      0,
    )} cobrem despesas fixas. Sobram R$ ${(100 - indiceVal).toFixed(
      0,
    )} livres para investimentos.`;
    if (indiceVal >= 70 && indiceVal <= 85) {
      level = "attention";
      statusText = "Atenção Orçamentária";
      explanationText = `Margem de segurança apertada. A máquina pública consome R$ ${indiceVal.toFixed(
        0,
      )} de cada R$ 100 arrecadados. A gestão municipal deve conter novos gastos recorrentes.`;
    } else if (indiceVal > 85) {
      level = "critical";
      statusText = "Alerta Crítico";
      explanationText = `Mais de R$ ${indiceVal.toFixed(
        0,
      )} de cada R$ 100 estão engessados em despesas obrigatórias. Risco severo de descumprimento de obrigações e impossibilidade de novos investimentos.`;
    }
  }

  return {
    level,
    statusText,
    explanationText,
    ...STYLES[level],
  };
}
