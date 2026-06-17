import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, COOKIE_NAME } from "@/lib/session";
import { db } from "@/lib/db";

// MOCK DATASET FOR FALLBACK/SIMULATION MODE
const MOCK_EXPENSES_BASE = [
  {
    NumeroEmpenho: "2026/00104",
    Contrato: "012/2025",
    DataEmpenho: "2026-01-08",
    Fornecedor: "CONSTRUTORA PRADÓPOLIS LTDA",
    CNPJFornecedor: "45.182.930/0001-44",
    Historico: "Prestação de serviços de recapeamento asfáltico de vias urbanas no bairro Jardim Primavera, conforme Contrato nº 012/2025.",
    Setor: "Secretaria de Obras e Serviços Públicos",
    Categoria: "Obras e Instalações",
    Ficha: "142",
    ValorEmpenho: 1250000.00,
    ValorLiquidado: 950000.00,
    ValorPago: 850000.00,
  },
  {
    NumeroEmpenho: "2026/00215",
    Contrato: "005/2026",
    DataEmpenho: "2026-02-14",
    Fornecedor: "AUTO POSTO CENTRAL DE PRADÓPOLIS",
    CNPJFornecedor: "02.839.401/0001-99",
    Historico: "Aquisição de combustíveis (gasolina, etanol e óleo diesel) para abastecimento da frota de ambulâncias e veículos da saúde.",
    Setor: "Secretaria Municipal de Saúde",
    Categoria: "Material de Consumo",
    Ficha: "87",
    ValorEmpenho: 450000.00,
    ValorLiquidado: 410000.00,
    ValorPago: 380000.00,
  },
  {
    NumeroEmpenho: "2026/00340",
    Contrato: "018/2025",
    DataEmpenho: "2026-03-05",
    Fornecedor: "ALIMENTA BRASIL DISTRIBUIDORA EIRELI",
    CNPJFornecedor: "10.492.302/0001-10",
    Historico: "Fornecimento parcelado de gêneros alimentícios perecíveis e não perecíveis para atendimento da merenda escolar da rede municipal.",
    Setor: "Secretaria Municipal de Educação",
    Categoria: "Material de Consumo",
    Ficha: "56",
    ValorEmpenho: 320000.00,
    ValorLiquidado: 320000.00,
    ValorPago: 280000.00,
  },
  {
    NumeroEmpenho: "2026/00452",
    Contrato: "022/2026",
    DataEmpenho: "2026-04-12",
    Fornecedor: "MEDCOM DISTRIBUIDORA DE MEDICAMENTOS",
    CNPJFornecedor: "08.172.639/0001-52",
    Historico: "Aquisição de medicamentos de A a Z para suprimento da farmácia municipal e atendimento de ordens judiciais.",
    Setor: "Secretaria Municipal de Saúde",
    Categoria: "Material de Consumo",
    Ficha: "93",
    ValorEmpenho: 180000.00,
    ValorLiquidado: 150000.00,
    ValorPago: 150000.00,
  },
  {
    NumeroEmpenho: "2026/00512",
    Contrato: "001/2026",
    DataEmpenho: "2026-05-18",
    Fornecedor: "PRADÓPOLIS INFORMATICA & TECNOLOGIA LTDA",
    CNPJFornecedor: "33.910.283/0001-05",
    Historico: "Prestação de serviços contínuos de suporte de TI, manutenção de redes e licença de softwares de gestão de contabilidade.",
    Setor: "Coordenadoria de Contabilidade e Finanças",
    Categoria: "Serviços de Terceiros - Pessoa Jurídica",
    Ficha: "12",
    ValorEmpenho: 95000.00,
    ValorLiquidado: 95000.00,
    ValorPago: 87083.33,
  },
  {
    NumeroEmpenho: "2026/00680",
    Contrato: "N/A",
    DataEmpenho: "2026-06-02",
    Fornecedor: "CPFL PAULISTA - COMPANHIA PIRATININGA",
    CNPJFornecedor: "02.518.293/0001-22",
    Historico: "Pagamento de faturas de energia elétrica dos prédios públicos e iluminação de vias municipais referente ao mês de competência.",
    Setor: "Secretaria de Obras e Serviços Públicos",
    Categoria: "Outras Despesas Correntes",
    Ficha: "15",
    ValorEmpenho: 680000.00,
    ValorLiquidado: 680000.00,
    ValorPago: 680000.00,
  },
  {
    NumeroEmpenho: "2026/00741",
    Contrato: "009/2024",
    DataEmpenho: "2026-06-15",
    Fornecedor: "SANEAR AMBIENTAL PRADÓPOLIS",
    CNPJFornecedor: "12.839.102/0001-88",
    Historico: "Serviços continuados de limpeza urbana, coleta de resíduos sólidos domiciliares, varrição mecânica de vias e destinação final.",
    Setor: "Secretaria de Obras e Serviços Públicos",
    Categoria: "Serviços de Terceiros - Pessoa Jurídica",
    Ficha: "154",
    ValorEmpenho: 890000.00,
    ValorLiquidado: 450000.00,
    ValorPago: 450000.00,
  },
  {
    NumeroEmpenho: "2026/00820",
    Contrato: "031/2025",
    DataEmpenho: "2026-07-20",
    Fornecedor: "TELEFONICA BRASIL S.A. (VIVO)",
    CNPJFornecedor: "02.558.157/0001-62",
    Historico: "Prestação de serviços de telefonia fixa, móvel e internet de banda larga para todas as secretarias e unidades escolares municipais.",
    Setor: "Secretaria de Administração",
    Categoria: "Serviços de Terceiros - Pessoa Jurídica",
    Ficha: "34",
    ValorEmpenho: 45000.00,
    ValorLiquidado: 22000.00,
    ValorPago: 22000.00,
  },
  {
    NumeroEmpenho: "2026/00912",
    Contrato: "003/2026",
    DataEmpenho: "2026-08-11",
    Fornecedor: "SEGURANÇA PATRIMONIAL GUARDIÃO SP",
    CNPJFornecedor: "24.910.283/0001-77",
    Historico: "Prestação de serviços contínuos de monitoramento eletrônico, vigilância armada e portaria para prédios da educação e saúde.",
    Setor: "Secretaria de Administração",
    Categoria: "Serviços de Terceiros - Pessoa Jurídica",
    Ficha: "38",
    ValorEmpenho: 240000.00,
    ValorLiquidado: 120000.00,
    ValorPago: 120000.00,
  },
  {
    NumeroEmpenho: "2026/01043",
    Contrato: "014/2026",
    DataEmpenho: "2026-09-03",
    Fornecedor: "EDITORA EDUCACIONAL SABER MAIS",
    CNPJFornecedor: "05.102.394/0001-09",
    Historico: "Aquisição de apostilas, livros pedagógicos e materiais de apoio didático para distribuição aos alunos do Ensino Fundamental.",
    Setor: "Secretaria Municipal de Educação",
    Categoria: "Material de Consumo",
    Ficha: "61",
    ValorEmpenho: 155000.00,
    ValorLiquidado: 155000.00,
    ValorPago: 155000.00,
  }
];

export async function GET(request: Request) {
  try {
    // 1. Verificar autenticação
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Extrair parâmetros da query
    const { searchParams } = new URL(request.url);
    const exercicio = searchParams.get("exercicio") || "2026";
    const diaInicio = searchParams.get("diaInicio") || "01";
    const mesInicio = searchParams.get("mesInicio") || "01";
    const diaFinal = searchParams.get("diaFinal") || "31";
    const mesFinal = searchParams.get("mesFinal") || "12";
    const fornecedor = searchParams.get("fornecedor") || "";
    const cnpj = searchParams.get("cnpj") || "";
    const tipo = searchParams.get("tipo") || "DespesasGerais";

    // 3. Obter URL do portal Fiorilli do banco de dados
    const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
    const row = stmt.get("fiorilli_api_url") as { value: string } | undefined;
    const fiorilliApiUrl = row?.value || "http://siteDaEntidade.uf.gov.br/Transparencia/";

    const isPlaceholder = fiorilliApiUrl.includes("siteDaEntidade.uf.gov.br");

    // 4. Fluxo de Integração Real vs. Simulação/Mock
    if (!isPlaceholder) {
      try {
        // Constrói os parâmetros no formato esperado pelo Fiorilli API
        const targetUrl = new URL(fiorilliApiUrl);
        
        let cleanPath = targetUrl.pathname;
        if (!cleanPath.endsWith("/")) {
          cleanPath += "/";
        }

        const lowerPath = cleanPath.toLowerCase();
        if (lowerPath.includes("versaojson")) {
          if (!lowerPath.includes("despesas/")) {
            targetUrl.pathname = cleanPath + "Despesas/";
          }
        } else {
          targetUrl.pathname = cleanPath + "VersaoJson/Despesas/";
        }
        
        targetUrl.searchParams.set("ConectarExercicio", exercicio);
        targetUrl.searchParams.set("Listagem", tipo);
        targetUrl.searchParams.set("DiaInicioPeriodo", diaInicio);
        targetUrl.searchParams.set("MesInicialPeriodo", mesInicio);
        targetUrl.searchParams.set("DiaFinalPeriodo", diaFinal);
        targetUrl.searchParams.set("MesFinalPeriodo", mesFinal);
        targetUrl.searchParams.set("Ano", exercicio);
        targetUrl.searchParams.set("Empresa", "1");
        targetUrl.searchParams.set("MostraDadosConsolidado", "False");
        targetUrl.searchParams.set("MostrarFornecedor", "True");
        targetUrl.searchParams.set("MostrarNomeFavorecido", "True");
        targetUrl.searchParams.set("MostrarCNPJFornecedor", "True");
        targetUrl.searchParams.set("UFParaFiltroCOVID", "");
        targetUrl.searchParams.set("ApenasIDEmpenho", "False");
        targetUrl.searchParams.set("CNPJFornecedor", cnpj || "");

        // Timeout de 15 segundos para dar tempo do servidor municipal responder payloads grandes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(targetUrl.toString(), {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "User-Agent": "PradoFin-Transparency-Portal-Agent"
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const rawData = await response.json();
          
          // Mapeamento dos campos do Fiorilli para a UI
          const fiorilliList = Array.isArray(rawData) ? rawData : (rawData?.Despesas || rawData?.dados || []);
          
          // Helper to parse Portuguese decimal/thousands separators
          const parseFiorilliVal = (val: any): number => {
            if (val === undefined || val === null) return 0;
            if (typeof val === "number") return val;
            const valStr = String(val).trim();
            if (valStr === "" || valStr === "-") return 0;
            const normalized = valStr.replace(/\./g, "").replace(",", ".");
            const num = parseFloat(normalized);
            return isNaN(num) ? 0 : num;
          };

          // Helper to parse DD/MM/YYYY dates
          const parseFiorilliDate = (dateStr: any): string => {
            if (!dateStr || typeof dateStr !== "string") return "";
            const datePart = dateStr.split(" ")[0];
            const parts = datePart.split("/");
            if (parts.length === 3) {
              const [day, month, year] = parts;
              return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
            return String(dateStr);
          };

          const mappedExpenses = fiorilliList.map((item: any, idx: number) => {
            const empNum = item.CODIGO || item.PKEMP || `Emp-${idx}`;
            const numEmpenho = item.PKEMPA ? `${item.PKEMPA}/${String(empNum).padStart(5, "0")}` : String(empNum);
            
            return {
              NumeroEmpenho: numEmpenho,
              Contrato: item.LICIT || item.NUMLICIT || "N/A",
              DataEmpenho: parseFiorilliDate(item.DATAE),
              Fornecedor: item.NOMEFOR || "Não especificado",
              CNPJFornecedor: item.CPFFORMATADO || "N/A",
              Historico: item.PRODU || "Não especificado",
              Setor: item.PROJETO_ATIVIDADE_NOME || item.SUBFUNCAONOME || "Administração Geral",
              Categoria: item.NATUREZA || "Outras Despesas",
              Ficha: item.FICHA || "N/A",
              ValorEmpenho: parseFiorilliVal(item.EMPENHADO),
              ValorLiquidado: parseFiorilliVal(item.LIQUIDADO),
              ValorPago: parseFiorilliVal(item.PAGO),
            };
          });

          // Filtros adicionais no servidor (por segurança caso a API Fiorilli não filtre corretamente)
          const filtered = mappedExpenses.filter((item: any) => {
            const matchesFornecedor = !fornecedor || 
              item.Fornecedor.toLowerCase().includes(fornecedor.toLowerCase()) || 
              item.Historico.toLowerCase().includes(fornecedor.toLowerCase()) ||
              item.NumeroEmpenho.includes(fornecedor);

            const matchesCnpj = !cnpj || item.CNPJFornecedor.replace(/[^\d]/g, "").includes(cnpj.replace(/[^\d]/g, ""));
            return matchesFornecedor && matchesCnpj;
          });

          return NextResponse.json({
            mode: "live",
            fiorilli_url: fiorilliApiUrl,
            results: filtered
          });
        } else {
          console.error(`Fiorilli API returned error status: ${response.status} ${response.statusText}`);
        }
      } catch (fetchErr) {
        console.warn("Fiorilli Live API connection failed. Falling back to Simulation Mode:", fetchErr);
        // Sem return, deixa cair no fallback mock
      }
    }

    // 5. MODO SIMULADO / FALLBACK MOCK
    // Filtro do dataset simulado
    let mockResults = [...MOCK_EXPENSES_BASE];

    // Aplica filtros de pesquisa
    if (fornecedor) {
      mockResults = mockResults.filter(item => 
        item.Fornecedor.toLowerCase().includes(fornecedor.toLowerCase()) || 
        item.Historico.toLowerCase().includes(fornecedor.toLowerCase()) ||
        item.NumeroEmpenho.includes(fornecedor)
      );
    }

    if (cnpj) {
      const cleanSearchCnpj = cnpj.replace(/[^\d]/g, "");
      mockResults = mockResults.filter(item => 
        item.CNPJFornecedor.replace(/[^\d]/g, "").includes(cleanSearchCnpj)
      );
    }

    // Filtrar por data range simples
    const startCompare = `${exercicio}-${mesInicio.padStart(2, "0")}-${diaInicio.padStart(2, "0")}`;
    const endCompare = `${exercicio}-${mesFinal.padStart(2, "0")}-${diaFinal.padStart(2, "0")}`;
    mockResults = mockResults.filter(item => {
      // Ajusta o ano no mock
      const itemDate = item.DataEmpenho.replace(/^\d{4}/, exercicio);
      return itemDate >= startCompare && itemDate <= endCompare;
    });

    // Ajusta o exercício dinamicamente para o mock
    const adjustedResults = mockResults.map(item => ({
      ...item,
      NumeroEmpenho: item.NumeroEmpenho.replace(/^\d{4}/, exercicio),
      DataEmpenho: item.DataEmpenho.replace(/^\d{4}/, exercicio)
    }));

    return NextResponse.json({
      mode: "simulation",
      fiorilli_url: fiorilliApiUrl,
      results: adjustedResults
    });

  } catch (err: any) {
    console.error("Transparencia Despesas route error:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
