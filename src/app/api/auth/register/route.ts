import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { signSession, COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

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
    const existing = stmtCheck.get(emailClean) as any;

    if (existing) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado por outro servidor." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Insert user
    const insert = db.prepare(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
    );
    const result = insert.run(name, emailClean, passwordHash) as any;
    const userId = result.lastInsertRowid;

    return NextResponse.json({ 
      success: true, 
      message: "Cadastro realizado com sucesso! Sua conta está aguardando aprovação pelo administrador contábil." 
    });
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor de cadastro." },
      { status: 500 }
    );
  }
}
