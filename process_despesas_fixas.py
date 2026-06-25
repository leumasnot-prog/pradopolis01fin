import pandas as pd
import os
import json
from collections import defaultdict

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline de Despesas Fixas e Contratos 2026.
#
# Fonte: data/contratos2026novo.csv  — "Listagem de Cronogramas de Liquidação
# (Desembolso)" exportada do sistema Fiorilli. Cada linha = (empenho, mês) do
# cronograma de desembolso, com VALOR_MES (parcela mensal) e VALOR_EMPENHO
# (valor total empenhado, cabeçalho "Valor empenhado" do relatório).
#
# INTERPRETAÇÃO CORRETA (validada contra o PDF do relatório, 2026-06-25):
#  • A chave única de um empenho é PKEMP (o número EMPENHO se repete entre
#    reforços/anulações; ex.: EMPENHO 21 = PKEMP 972 [R$4.500] + PKEMP 6265
#    [reforço R$2.500]).
#  • O valor anual correto de cada empenho é VALOR_EMPENHO (constante por PKEMP),
#    NÃO a soma das parcelas — o export DUPLICA cronogramas revisados (lista a
#    série original E a revisada). Ex.: empenho 24 tem as séries 13.250 e
#    16.666,67; a correta é 16.666,67 (soma 200.000 = VALOR_EMPENHO). Somar as
#    parcelas brutas inflava o valor (bug do "valor incorreto").
#  • O cronograma mensal é reconciliado à série cujo somatório bate o
#    VALOR_EMPENHO do PKEMP.
#  • Linhas malformadas (deslocamento de colunas) têm FORNECEDOR =
#    'ADMINISTRAÇÃO ORGANIZADA, EFICIENTE E TECNOLOGICA' (na verdade um
#    PROGRAMA_NOME) e são descartadas.
# ─────────────────────────────────────────────────────────────────────────────

CSV_PATH = 'data/contratos2026novo.csv'
SHIFTED_ROW_FORNECEDOR = 'ADMINISTRAÇÃO ORGANIZADA, EFICIENTE E TECNOLOGICA'


def clean_val(v):
    if pd.isna(v):
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    v_str = str(v).replace('R$', '').replace(' ', '')
    if v_str == '-' or v_str == '0' or v_str == '':
        return 0.0

    is_neg = False
    if v_str.startswith('-'):
        is_neg = True
        v_str = v_str[1:]
    elif v_str.startswith('(') and v_str.endswith(')'):
        is_neg = True
        v_str = v_str[1:-1]

    v_str = v_str.replace('.', '').replace(',', '.')
    try:
        val = float(v_str)
        return -val if is_neg else val
    except Exception:
        return 0.0


def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text).strip()
    text = " ".join(text.split())
    return text


def reconcile_cronograma(pk_rows, valor_empenho):
    """Reconstrói o cronograma de 12 meses de UM PKEMP de modo que a soma bata o
    VALOR_EMPENHO. Trata a duplicação de séries (original × revisada) escolhendo
    a série (máx ou mín por mês) cujo total = VALOR_EMPENHO; se nenhuma fecha,
    normaliza proporcionalmente; cronograma fora de 1..12 (ex.: mês 0) é
    distribuído uniformemente."""
    by_month = defaultdict(list)
    for r in pk_rows:
        m = int(clean_val(r['MES_CRONOGRAMA']))
        if 1 <= m <= 12:
            by_month[m].append(clean_val(r['VALOR_MES']))

    if not by_month:
        return [valor_empenho / 12.0] * 12

    max_ser = [max(by_month[m]) if m in by_month else 0.0 for m in range(1, 13)]
    min_ser = [min(by_month[m]) if m in by_month else 0.0 for m in range(1, 13)]

    if abs(sum(max_ser) - valor_empenho) < 0.10:
        return max_ser
    if abs(sum(min_ser) - valor_empenho) < 0.10:
        return min_ser

    s = sum(max_ser)
    if abs(s) > 0.001:
        return [x * valor_empenho / s for x in max_ser]
    return [valor_empenho / 12.0] * 12


def process_despesas_fixas():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found!")
        return

    df = pd.read_csv(CSV_PATH, sep=';', encoding='utf-8-sig', dtype=str)

    # Descarta as linhas malformadas (deslocamento de colunas)
    if 'FORNECEDOR' in df.columns:
        df = df[df['FORNECEDOR'].fillna('').str.strip() != SHIFTED_ROW_FORNECEDOR]

    records = df.to_dict('records')

    # Agrupa por EMPENHO (número exibido), e dentro dele por PKEMP (chave única)
    by_empenho = defaultdict(list)
    for r in records:
        emp = clean_text(r.get('EMPENHO'))
        if emp:
            by_empenho[emp].append(r)

    months_pt = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }

    contratos_lista = []

    for empenho, group in by_empenho.items():
        # Subagrupa por PKEMP
        by_pk = defaultdict(list)
        for r in group:
            by_pk[clean_text(r.get('PKEMP'))].append(r)

        valor_anual = 0.0
        cronograma_mensal = [0.0] * 12
        for pk, pk_rows in by_pk.items():
            ve = clean_val(pk_rows[0].get('VALOR_EMPENHO'))
            if abs(ve) < 0.005:
                continue  # PKEMP sem valor empenhado
            ser = reconcile_cronograma(pk_rows, ve)
            valor_anual += ve
            for i in range(12):
                cronograma_mensal[i] += ser[i]

        # Descarta empenhos com valor líquido nulo/negativo (anulados, vazios)
        if valor_anual <= 0.0:
            continue

        # Metadados a partir do PKEMP de maior valor empenhado (fornecedor é único
        # por empenho — verificado)
        primary = max(
            group, key=lambda r: clean_val(r.get('VALOR_EMPENHO'))
        )
        fornecedor = clean_text(primary.get('FORNECEDOR'))
        if not fornecedor:
            continue

        historico = clean_text(primary.get('HISTORICO'))
        contrato_num = clean_text(primary.get('CONTRATO'))
        if not contrato_num or contrato_num == 'nan' or contrato_num == '0':
            contrato_num = f"Empenho {empenho}"

        setor = clean_text(primary.get('CODLO_NOME'))
        funcional_code = clean_text(primary.get('FUNCIONAL'))
        if funcional_code.startswith('06'):
            setor = "DEPARTAMENTO MUNICIPAL DE SEGURANÇA PÚBLICA"
        elif not setor or setor == 'nan' or setor == '0':
            setor = "OUTROS SETORES"

        categoria_desp = clean_text(primary.get('CATEC_NOME'))
        if not categoria_desp or categoria_desp == 'nan':
            categoria_desp = "SERVIÇOS GERAIS"

        ficha = clean_text(primary.get('FICHA'))

        fon_grupo = clean_text(primary.get('FONGRUPO'))
        fon_grupo_nome = clean_text(primary.get('FONGRUPO_NOME'))
        vin_codigo_nome = clean_text(primary.get('VINCODIGONOME'))

        fon_grupo_clean = ""
        if fon_grupo == '01':
            fon_grupo_clean = "01 - TESOURO"
        elif fon_grupo == '02':
            fon_grupo_clean = "02 - TRANSF. ESTADUAL"
        elif fon_grupo == '05':
            fon_grupo_clean = "05 - TRANSF. FEDERAL"
        elif fon_grupo == '08':
            fon_grupo_clean = "08 - EMENDAS PARLAMENTARES"
        elif fon_grupo == '000' or fon_grupo == '00':
            fon_grupo_clean = "00 - TESOURO"
        elif fon_grupo_nome:
            fon_grupo_clean = f"{fon_grupo} - {fon_grupo_nome}" if fon_grupo else fon_grupo_nome
        else:
            fon_grupo_clean = "00 - TESOURO"

        if vin_codigo_nome and vin_codigo_nome.strip() != '' and vin_codigo_nome.lower() != 'nan' and vin_codigo_nome.lower() != 'não informado':
            fonte_recurso = f"{fon_grupo_clean} ({vin_codigo_nome})"
        else:
            fonte_recurso = fon_grupo_clean

        valor_mensal = valor_anual / 12.0

        contratos_lista.append({
            'empenho': empenho,
            'contrato': contrato_num,
            'fornecedor': fornecedor,
            'historico': historico,
            'setor': setor,
            'categoria': categoria_desp,
            'ficha': ficha,
            'fonte_recurso': fonte_recurso,
            'valor_anual': round(valor_anual, 2),
            'valor_mensal': round(valor_mensal, 2),
            'cronograma': [round(v, 2) for v in cronograma_mensal]
        })

    contratos_lista.sort(key=lambda x: x['valor_anual'], reverse=True)

    contratos_mensal = [0.0] * 12
    for c in contratos_lista:
        for m in range(12):
            contratos_mensal[m] += c['cronograma'][m]

    # Custos corporativos fixos — folha real 2026 mês a mês (inalterado)
    folha_real_2026 = {
        1: 6120055.45, 2: 6120055.45, 3: 6120055.45, 4: 6120055.45,
        5: 6386277.86, 6: 6386277.86, 7: 6386277.86, 8: 6386277.86,
        9: 6386277.86, 10: 6386277.86, 11: 6386277.86, 12: 10028664.25
    }
    alimentacao_real_2026 = {m: 985149.00 if m <= 4 else round(985149.00 * 1.07, 2) for m in range(1, 13)}
    ingesp_mensal = 500000.00

    progressao_mensal = []
    total_folha = 0.0
    total_auxilio = 0.0
    total_ingesp = 0.0
    total_contratos = 0.0

    for m in range(1, 13):
        folha_m = folha_real_2026.get(m, 0.0)
        auxilio_m = alimentacao_real_2026.get(m, 0.0)
        ingesp_m = ingesp_mensal
        contrato_m = contratos_mensal[m - 1]

        total_folha += folha_m
        total_auxilio += auxilio_m
        total_ingesp += ingesp_m
        total_contratos += contrato_m

        progressao_mensal.append({
            'mes_num': m,
            'mes_nome': months_pt[m],
            'folha': round(folha_m, 2),
            'contratos': round(contrato_m, 2),
            'auxilio': round(auxilio_m, 2),
            'ingesp': round(ingesp_m, 2),
            'total': round(folha_m + contrato_m + auxilio_m + ingesp_m, 2)
        })

    total_despesas_fixas_anual = total_folha + total_contratos + total_auxilio + total_ingesp
    total_despesas_fixas_mensal = total_despesas_fixas_anual / 12.0

    resumo_geral = {
        'total_despesas_fixas_anual': round(total_despesas_fixas_anual, 2),
        'total_despesas_fixas_mensal': round(total_despesas_fixas_mensal, 2),
        'folha_anual': round(total_folha, 2),
        'contratos_anual': round(total_contratos, 2),
        'auxilio_anual': round(total_auxilio, 2),
        'ingesp_anual': round(total_ingesp, 2),
        'num_contratos_ativos': len(contratos_lista)
    }

    dept_spending = {}
    for c in contratos_lista:
        s = c['setor']
        dept_spending[s] = dept_spending.get(s, 0.0) + c['valor_anual']

    contratos_por_setor = []
    for dept, val in dept_spending.items():
        contratos_por_setor.append({'setor': dept, 'valor': round(val, 2)})
    contratos_por_setor.sort(key=lambda x: x['valor'], reverse=True)

    cat_spending = {}
    for c in contratos_lista:
        cat = c['categoria']
        cat_spending[cat] = cat_spending.get(cat, 0.0) + c['valor_anual']

    contratos_por_categoria = []
    for cat, val in cat_spending.items():
        contratos_por_categoria.append({'categoria': cat, 'valor': round(val, 2)})
    contratos_por_categoria.sort(key=lambda x: x['valor'], reverse=True)

    output_data = {
        'resumo_geral': resumo_geral,
        'progressao_mensal': progressao_mensal,
        'contratos_por_setor': contratos_por_setor,
        'contratos_por_categoria': contratos_por_categoria,
        'contratos': contratos_lista
    }

    out_dir = 'src/data'
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'despesas_fixas_data.json')

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("Processed despesas fixas and contracts successfully!")
    print(f"Source CSV: {CSV_PATH}")
    print(f"Total active contracts: {len(contratos_lista)}")
    print(f"Total annual fixed expenses: R$ {total_despesas_fixas_anual:,.2f}")
    print(f"Contracts annual total: R$ {total_contratos:,.2f}")
    print(f"Output saved to: {out_path}")


if __name__ == '__main__':
    process_despesas_fixas()
