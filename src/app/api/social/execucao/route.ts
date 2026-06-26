import { NextResponse } from "next/server";
import { getSocialExecucao } from "@/lib/socialExecucao";
import { getDotacaoByFuncao } from "@/lib/dotacaoOrc2026";

// Execução orçamentária da Promoção Social (comparativo 2025 × 2026 até o mês fechado).
// Os CSVs são lidos e agregados server-side, com cache em memória.
export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const data = getSocialExecucao(force);
    const dotacao = getDotacaoByFuncao("08", force);
    return NextResponse.json({ ...data, dotacaoAtual: dotacao.dotacaoAtual, dotacaoFolha: dotacao.dotacaoFolha });
  } catch (err) {
    console.error("Erro ao processar execução da Promoção Social:", err);
    return NextResponse.json(
      { error: "Falha ao processar os relatórios de execução da Promoção Social." },
      { status: 500 },
    );
  }
}
