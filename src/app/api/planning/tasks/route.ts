import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { db } from "@/lib/db";

// Retorna todas as etapas de planejamento
export async function GET() {
  try {
    const checkTasks = db.prepare("SELECT * FROM planning_tasks ORDER BY id ASC");
    const tasks = checkTasks.all() as any[];

    // Converte os valores ou formata para o formato esperado pelo front
    const formattedTasks = tasks.map((t) => {
      let parsedDocs = [];
      try {
        parsedDocs = t.documents ? JSON.parse(t.documents) : [];
      } catch (e) {
        console.error("Erro ao fazer parse dos documentos:", e);
      }

      return {
        id: t.id,
        type: t.type,
        periodo: t.periodo,
        etapa: t.etapa,
        atividade: t.atividade,
        responsavel: t.responsavel,
        status: t.status, // 'aguardando' | 'marcado reuniao' | 'concluido'
        data_reuniao: t.data_reuniao || "",
        documents: parsedDocs, // Array de { title: string, url: string }
        concluido: t.status === "concluido", // retrocompatibilidade
      };
    });

    return NextResponse.json({ tasks: formattedTasks });
  } catch (err: any) {
    console.error("Planning GET API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao carregar tarefas." },
      { status: 500 }
    );
  }
}

// Atualiza uma etapa de planejamento
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.email !== "contabilidade@pradopolis.sp.gov.br") {
      return NextResponse.json(
        { error: "Apenas o Administrador Contábil pode fazer alterações no planejamento." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, data_reuniao, documents } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Dados incompletos. ID e Status são necessários." },
        { status: 400 }
      );
    }

    const docsJsonStr = JSON.stringify(documents || []);

    const updateStmt = db.prepare(`
      UPDATE planning_tasks
      SET status = ?, data_reuniao = ?, documents = ?
      WHERE id = ?
    `);

    updateStmt.run(status, data_reuniao || null, docsJsonStr, id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Planning POST API error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor ao atualizar tarefa." },
      { status: 500 }
    );
  }
}
