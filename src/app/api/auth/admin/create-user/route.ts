import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";

const ADMIN_EMAIL = "contabilidade@pradopolis.sp.gov.br";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session || session.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas o administrador da contabilidade pode cadastrar novos servidores." },
        { status: 403 }
      );
    }

    const { name, email, password, approved } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const emailClean = email.toLowerCase().trim();

    // Check if user exists
    const stmtCheck = db.prepare("SELECT * FROM users WHERE email = ?");
    const existing = await stmtCheck.get(emailClean) as any;

    if (existing) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado por outro servidor." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Insert user with approved status (default to 1)
    const approvedVal = approved === false ? 0 : 1;
    const insert = db.prepare(
      "INSERT INTO users (name, email, password_hash, approved) VALUES (?, ?, ?, ?)"
    );
    const result = await insert.run(name, emailClean, passwordHash, approvedVal) as any;

    return NextResponse.json({ 
      success: true, 
      message: `Servidor "${name}" cadastrado com sucesso!` 
    });
  } catch (err: any) {
    console.error("Admin Create User API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
