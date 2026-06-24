import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
    const row = await stmt.get("fiorilli_api_url") as { value: string } | undefined;
    
    return NextResponse.json({
      fiorilli_api_url: row?.value || "http://siteDaEntidade.uf.gov.br/Transparencia/"
    });
  } catch (err: any) {
    console.error("Settings GET API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas administrador pode atualizar configurações
    if (session.email !== "contabilidade@pradopolis.sp.gov.br") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 }
      );
    }

    const { fiorilli_api_url } = await request.json();

    if (!fiorilli_api_url || typeof fiorilli_api_url !== "string") {
      return NextResponse.json(
        { error: "A URL do portal Fiorilli é obrigatória." },
        { status: 400 }
      );
    }

    // Validação básica de URL
    if (!fiorilli_api_url.startsWith("http://") && !fiorilli_api_url.startsWith("https://")) {
      return NextResponse.json(
        { error: "A URL deve iniciar com http:// ou https://" },
        { status: 400 }
      );
    }

    // Normaliza para terminar com barra
    const normalizedUrl = fiorilli_api_url.endsWith("/") ? fiorilli_api_url : `${fiorilli_api_url}/`;

    const stmt = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    );
    await stmt.run("fiorilli_api_url", normalizedUrl);

    return NextResponse.json({
      message: "Configuração atualizada com sucesso!",
      fiorilli_api_url: normalizedUrl
    });
  } catch (err: any) {
    console.error("Settings POST API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
