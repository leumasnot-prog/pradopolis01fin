import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "contabilidade@pradopolis.sp.gov.br";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session || session.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Acesso negado. Apenas o administrador da contabilidade pode visualizar cadastros pendentes." }, { status: 403 });
    }

    const stmt = db.prepare("SELECT id, name, email, created_at FROM users WHERE approved = 0 ORDER BY created_at DESC");
    const pendingUsers = await stmt.all() as any[];

    return NextResponse.json({ success: true, users: pendingUsers });
  } catch (err: any) {
    console.error("Admin Pending API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
