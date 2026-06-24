import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "contabilidade@pradopolis.sp.gov.br";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session || session.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const stmt = db.prepare("UPDATE users SET approved = 1 WHERE id = ?");
    const result = await stmt.run(userId) as any;

    if (result.changes === 0) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 44 });
    }

    return NextResponse.json({ success: true, message: "Usuário aprovado com sucesso!" });
  } catch (err: any) {
    console.error("Admin Approve API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
