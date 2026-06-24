import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const isPostgres = !!process.env.POSTGRES_URL;
    const hasStorageUrlEnv = !!process.env.STORAGE_URL;
    
    let dbStatus = "unknown";
    let usersCount = 0;
    let usersList: any[] = [];
    let dbError = null;

    try {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
      const res = await stmt.get() as any;
      usersCount = Number(res ? (res.count || res.rows?.[0]?.count || 0) : 0);

      const listStmt = db.prepare("SELECT id, name, email, approved, allowed_screens FROM users");
      usersList = await listStmt.all() as any[];
      dbStatus = "connected_ok";
    } catch (dbErr: any) {
      dbStatus = "error";
      dbError = dbErr.message;
    }

    return NextResponse.json({
      environment: {
        isPostgres,
        hasPostgresUrlEnv: !!process.env.POSTGRES_URL,
        hasStorageUrlEnv,
        nodeEnv: process.env.NODE_ENV
      },
      database: {
        status: dbStatus,
        error: dbError,
        usersCount,
        users: usersList
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
