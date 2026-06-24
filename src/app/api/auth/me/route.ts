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

    // Query user state dynamically from the database
    const stmt = db.prepare("SELECT name, email, approved, allowed_screens FROM users WHERE id = ?");
    const dbUser = await stmt.get(session.userId) as any;

    if (!dbUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
    }

    if (dbUser.approved !== 1) {
      return NextResponse.json({ error: "Sua conta ainda não foi aprovada ou foi desativada pelo administrador." }, { status: 403 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        name: dbUser.name,
        email: dbUser.email,
        allowed_screens: dbUser.allowed_screens,
      },
    });
  } catch (err: any) {
    console.error("Me API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
