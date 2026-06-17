import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { signSession, COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const emailClean = email.toLowerCase().trim();

    // Find user
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(emailClean) as any;

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Verify password
    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Check if user is approved by accountant
    if (user.approved !== 1) {
      return NextResponse.json(
        { error: "Sua conta está aguardando aprovação pelo administrador da contabilidade." },
        { status: 403 }
      );
    }

    // Sign session
    const token = await signSession({ userId: user.id, name: user.name, email: user.email });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor de login." },
      { status: 500 }
    );
  }
}
