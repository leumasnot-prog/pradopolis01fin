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
      return NextResponse.json(
        { error: "Acesso negado. Apenas o administrador da contabilidade pode gerenciar usuários." },
        { status: 403 }
      );
    }

    const stmt = db.prepare("SELECT id, name, email, approved, allowed_screens, created_at FROM users ORDER BY created_at DESC");
    const allUsers = await stmt.all() as any[];

    return NextResponse.json({ success: true, users: allUsers });
  } catch (err: any) {
    console.error("Admin Users GET error:", err);
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

    if (!session || session.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas o administrador da contabilidade pode gerenciar usuários." },
        { status: 403 }
      );
    }

    const { userId, approved, allowed_screens } = await request.json();

    if (userId === undefined) {
      return NextResponse.json(
        { error: "O ID do usuário é obrigatório." },
        { status: 400 }
      );
    }

    // Find user to verify
    const findStmt = db.prepare("SELECT email FROM users WHERE id = ?");
    const targetUser = await findStmt.get(userId) as any;

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Safety: Protect main admin from changing approval status or allowed_screens
    if (targetUser.email === ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Não é permitido alterar as permissões do administrador principal." },
        { status: 400 }
      );
    }

    const approvedVal = approved ? 1 : 0;
    const screensVal = allowed_screens !== undefined && allowed_screens !== null 
      ? String(allowed_screens).trim() 
      : null;

    const updateStmt = db.prepare(
      "UPDATE users SET approved = ?, allowed_screens = ? WHERE id = ?"
    );
    const result = await updateStmt.run(approvedVal, screensVal, userId) as any;

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Erro ao atualizar usuário no banco de dados." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuário atualizado com sucesso!",
    });
  } catch (err: any) {
    console.error("Admin Users POST error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
