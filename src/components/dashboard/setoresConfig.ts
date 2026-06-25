// Configuração central dos setores do dashboard de Execução Setorial.
//
// Há dois grupos:
//  • SETORES_ESTRATEGICOS — os 4 setores que possuem componentes bespoke próprios
//    (ExecucaoSaude/Social/Transporte/Urban). Aqui guardamos só os metadados de
//    NAVEGAÇÃO (slug, label, ícone) — o render desses continua sendo dedicado.
//  • SETORES_DEMAIS — os 9 setores genéricos renderizados pelo MESMO componente
//    parametrizado <ExecucaoSetor config={cfg} />. Cada um é descrito por um SetorConfig.
//
// As strings de `setorContratoNome` são IDÊNTICAS às chaves distintas de `c.setor`
// em src/data/despesas_fixas_data.json (inclusive truncamentos do exportador, ex.:
// "...OBRAS, SANEAM"). Setores sem contrato fixo associado deixam o campo ausente,
// e o bloco de contratos é então omitido na tela.

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  HeartHandshake,
  Bus,
  Building2,
  GraduationCap,
  Briefcase,
  Scale,
  ShieldAlert,
  Palette,
  Droplets,
  Leaf,
  Factory,
  Trophy,
} from "lucide-react";

/** Descreve um setor genérico renderizado pelo componente parametrizado ExecucaoSetor. */
export interface SetorConfig {
  /** Código da função de governo (zero-padded de 2 dígitos), ex.: "12". */
  funcao: string;
  /** Identificador estável para navegação/URL, ex.: "educacao". */
  slug: string;
  /** Rótulo curto exibido na navegação e nos títulos, ex.: "Educação". */
  label: string;
  /** Frase descritiva (tom executivo) usada no SectionHeader da tela. */
  subtitle: string;
  /** Ícone lucide do setor (cabeçalho e tabela). */
  icon: LucideIcon;
  /** Id ÚNICO para o <linearGradient> do gauge — evita colisão de id de SVG. */
  gaugeGradientId: string;
  /**
   * Nome EXATO do setor em despesas_fixas_data.json. Se ausente, a tela não
   * renderiza o bloco "Contratos e Despesas Fixas".
   */
  setorContratoNome?: string;
}

/** Metadados de navegação dos 4 setores estratégicos (render bespoke). */
export interface SetorEstrategico {
  /** Slug/id usado em activeSector. */
  slug: "saude" | "social" | "transporte" | "urban";
  label: string;
  icon: LucideIcon;
}

export const SETORES_ESTRATEGICOS: SetorEstrategico[] = [
  { slug: "saude", label: "Saúde Pública", icon: Activity },
  { slug: "social", label: "Promoção Social", icon: HeartHandshake },
  { slug: "transporte", label: "Transportes e Trânsito", icon: Bus },
  { slug: "urban", label: "Serviços Urbanos", icon: Building2 },
];

/**
 * Os 9 setores genéricos, em ordem: Educação primeiro (maior orçamento), depois
 * por código de função crescente.
 */
export const SETORES_DEMAIS: SetorConfig[] = [
  {
    funcao: "12",
    slug: "educacao",
    label: "Educação",
    subtitle:
      "Manutenção e Desenvolvimento do Ensino — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: GraduationCap,
    gaugeGradientId: "gauge-educacao",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE EDUCAÇÃO",
  },
  {
    funcao: "04",
    slug: "administracao",
    label: "Administração",
    subtitle:
      "Gestão administrativa e atividades-meio — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Briefcase,
    gaugeGradientId: "gauge-administracao",
    setorContratoNome: "DEPARTAMENTO DE ADMINISTRAÇÃO GERAL",
  },
  {
    funcao: "02",
    slug: "judiciaria",
    label: "Judiciária",
    subtitle:
      "Assessoria jurídica e representação do município — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Scale,
    gaugeGradientId: "gauge-judiciaria",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE ASSUNTOS JURÍDICOS",
  },
  {
    funcao: "06",
    slug: "seguranca",
    label: "Segurança Pública",
    subtitle:
      "Defesa social e ordem pública municipal — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: ShieldAlert,
    gaugeGradientId: "gauge-seguranca",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE SEGURANÇA PÚBLICA",
  },
  {
    funcao: "13",
    slug: "cultura",
    label: "Cultura",
    subtitle:
      "Fomento à cultura, ao patrimônio e ao turismo — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Palette,
    gaugeGradientId: "gauge-cultura",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE CULTURA E TURISMO",
  },
  {
    funcao: "17",
    slug: "saneamento",
    label: "Saneamento",
    subtitle:
      "Infraestrutura de saneamento básico — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Droplets,
    gaugeGradientId: "gauge-saneamento",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE SANEAMENTO",
  },
  {
    funcao: "18",
    slug: "ambiental",
    label: "Gestão Ambiental",
    subtitle:
      "Preservação ambiental e desenvolvimento sustentável — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Leaf,
    gaugeGradientId: "gauge-ambiental",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE AGRICULTURA E MEIO AMBIENTE",
  },
  {
    funcao: "22",
    slug: "industria",
    label: "Indústria",
    subtitle:
      "Fomento à atividade industrial e produtiva — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Factory,
    gaugeGradientId: "gauge-industria",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE INDÚSTRIA",
  },
  {
    funcao: "27",
    slug: "desporto",
    label: "Desporto e Lazer",
    subtitle:
      "Promoção do esporte, do lazer e da atividade física — comparativo anual da execução (2025 × 2026, mesmo período acumulado)",
    icon: Trophy,
    gaugeGradientId: "gauge-desporto",
    setorContratoNome: "DEPARTAMENTO MUNICIPAL DE ESPORTES E LAZER",
  },
];

/** Lookup auxiliar por slug entre os setores genéricos. */
export const SETOR_DEMAIS_BY_SLUG: Record<string, SetorConfig> = Object.fromEntries(
  SETORES_DEMAIS.map((s) => [s.slug, s]),
);
