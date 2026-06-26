import { NextResponse } from "next/server";
import { getFichasByFuncao } from "@/lib/dotacaoOrc2026";

// Fichas orçamentárias de um setor (por código de função), com dotação e
// execução (empenhado/liquidado/pago/saldo) lidas ao vivo do export Fiorilli
// `relatorio-dot-orc2026.csv` — em vez do snapshot estático orcamento_data.json.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const funcao = searchParams.get("funcao") || "";
    const force = searchParams.get("force") === "1";

    if (!funcao) {
      return NextResponse.json({ error: "Parâmetro 'funcao' é obrigatório." }, { status: 400 });
    }

    const fichas = getFichasByFuncao(funcao, force);
    return NextResponse.json({
      funcao: String(funcao).padStart(2, "0"),
      geradoEm: new Date().toISOString(),
      fichas,
    });
  } catch (err) {
    console.error("Erro ao processar fichas do setor:", err);
    return NextResponse.json(
      { error: "Falha ao processar as fichas orçamentárias." },
      { status: 500 },
    );
  }
}
