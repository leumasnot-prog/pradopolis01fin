import { NextResponse } from "next/server";
import { getUrbanExecucao } from "@/lib/urbanExecucao";

// Execução orçamentária de Serviços Urbanos (comparativo 2025 × 2026 até o mês fechado).
// Os CSVs são lidos e agregados server-side, com cache em memória.
export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const data = getUrbanExecucao(force);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro ao processar execução de Serviços Urbanos:", err);
    return NextResponse.json(
      { error: "Falha ao processar os relatórios de execução de Serviços Urbanos." },
      { status: 500 },
    );
  }
}
