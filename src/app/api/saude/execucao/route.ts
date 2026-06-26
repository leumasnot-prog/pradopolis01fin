import { NextResponse } from "next/server";
import { getSaudeExecucao } from "@/lib/saudeExecucao";
import { getDotacaoByFuncao } from "@/lib/dotacaoOrc2026";

// Execução orçamentária da Saúde (comparativo 2025 × 2026 até o mês fechado).
// Os CSVs são lidos e agregados server-side, com cache em memória.
export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const data = getSaudeExecucao(force);
    const dotacao = getDotacaoByFuncao("10", force);
    return NextResponse.json({ ...data, dotacaoAtual: dotacao.dotacaoAtual, dotacaoFolha: dotacao.dotacaoFolha });
  } catch (err) {
    console.error("Erro ao processar execução da Saúde:", err);
    return NextResponse.json(
      { error: "Falha ao processar os relatórios de execução da Saúde." },
      { status: 500 },
    );
  }
}
