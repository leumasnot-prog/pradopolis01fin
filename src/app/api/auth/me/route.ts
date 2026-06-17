import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
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
