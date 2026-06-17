import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Logout API error:", err);
    return NextResponse.json(
      { error: "Erro ao efetuar logout." },
      { status: 500 }
    );
  }
}
