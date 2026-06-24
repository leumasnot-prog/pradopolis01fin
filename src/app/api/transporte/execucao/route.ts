import { NextResponse } from "next/server";
import { getTransporteExecucao } from "@/lib/transporteExecucao";

// Execução orçamentária do Departamento de Transportes e Trânsito (comparativo
// 2025 × 2026 até o mês fechado) + série histórica de manutenção da frota.
// Os CSVs são lidos e agregados server-side, com cache em memória.
export async function GET(request: Request) {
  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const data = getTransporteExecucao(force);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro ao processar execução dos Transportes:", err);
    return NextResponse.json(
      { error: "Falha ao processar os relatórios de execução dos Transportes." },
      { status: 500 },
    );
  }
}
