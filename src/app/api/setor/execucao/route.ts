import { NextResponse } from "next/server";
import { getSetorExecucao, SETORES_VALIDOS } from "@/lib/setorExecucao";

// Execução orçamentária de um setor (por código de FUNÇÃO de governo), comparativo
// 2025 × 2026. O setor é informado via query param `?funcao=NN`. Os CSVs completos são
// lidos e agregados server-side, com cache em memória.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const funcao = params.get("funcao");
    const force = params.get("force") === "1";

    if (!funcao || !SETORES_VALIDOS.includes(funcao.padStart(2, "0"))) {
      return NextResponse.json(
        {
          error: `Parâmetro "funcao" ausente ou inválido. Valores aceitos: ${SETORES_VALIDOS.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const data = getSetorExecucao(funcao, force);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro ao processar execução setorial:", err);
    return NextResponse.json(
      { error: "Falha ao processar os relatórios de execução setorial." },
      { status: 500 },
    );
  }
}
