import { NextResponse } from "next/server";
import { getSaudeExecucao } from "@/lib/saudeExecucao";

// Execução orçamentária da Saúde (comparativo 2025 × 2026 até o mês fechado).
// Os CSVs são lidos e agregados server-side, com cache em memória.
export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const data = getSaudeExecucao(force);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro ao processar execução da Saúde:", err);
    return NextResponse.json(
      { error: "Falha ao processar os relatórios de execução da Saúde." },
      { status: 500 },
    );
  }
}
