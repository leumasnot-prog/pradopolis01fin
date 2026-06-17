import pandas as pd
import os
import json

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
    except:
        return 0.0

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text).strip()
    text = " ".join(text.split())
    return text

def process_despesas_fixas():
    csv_path = 'data/contratos2026.csv'
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found!")
        return

    # Load CSV
    df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig', dtype=str)
    
    # Filter shifted rows anomaly
    if 'FORNECEDOR' in df.columns:
        df = df[df['FORNECEDOR'] != 'ADMINISTRAÇÃO ORGANIZADA, EFICIENTE E TECNOLOGICA']
        
    # Clean numeric fields
    df['VALOR_MES'] = df['VALOR_MES'].apply(clean_val)
    df['VALOR_EMPENHO'] = df['VALOR_EMPENHO'].apply(clean_val)
    df['MES_CRONOGRAMA'] = df['MES_CRONOGRAMA'].apply(clean_val).astype(int)
    
    # Drop duplicates by empenho and month to get unique planned installments
    df_parcelas = df.drop_duplicates(subset=['EMPENHO', 'MES_CRONOGRAMA'])
    
    # Group by EMPENHO to consolidate contracts
    grouped = df_parcelas.groupby('EMPENHO')
    
    contratos_lista = []
    
    # Month name mapper
    months_pt = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }
    
    for empenho, group in grouped:
        fornecedor = clean_text(group['FORNECEDOR'].iloc[0])
        if not fornecedor:  # Skip contracts with no supplier
            continue
            
        historico = clean_text(group['HISTORICO'].iloc[0])
        contrato_num = clean_text(group['CONTRATO'].iloc[0])
        if not contrato_num or contrato_num == 'nan' or contrato_num == '0':
            contrato_num = f"Empenho {empenho}"
            
        setor = clean_text(group['CODLO_NOME'].iloc[0])
        if not setor or setor == 'nan' or setor == '0':
            setor = "OUTROS SETORES"
            
        categoria_desp = clean_text(group['CATEC_NOME'].iloc[0])
        if not categoria_desp or categoria_desp == 'nan':
            categoria_desp = "SERVIÇOS GERAIS"
            
        ficha = clean_text(group['FICHA'].iloc[0])
        
        # Build 12-month payment schedule
        cronograma_mensal = [0.0] * 12
        for _, row in group.iterrows():
            mes = int(row['MES_CRONOGRAMA'])
            if 1 <= mes <= 12:
                cronograma_mensal[mes - 1] += row['VALOR_MES']
                
        # Total annual spending on this contract
        valor_anual = sum(cronograma_mensal)
        
        # Skip contracts that have 0.0 values (inactive or empty)
        if valor_anual <= 0.0:
            continue
            
        valor_mensal = valor_anual / 12.0
        
        contratos_lista.append({
            'empenho': empenho,
            'contrato': contrato_num,
            'fornecedor': fornecedor,
            'historico': historico,
            'setor': setor,
            'categoria': categoria_desp,
            'ficha': ficha,
            'valor_anual': round(valor_anual, 2),
            'valor_mensal': round(valor_mensal, 2),
            'cronograma': [round(v, 2) for v in cronograma_mensal]
        })
        
    # Sort contracts by annual value descending
    contratos_lista.sort(key=lambda x: x['valor_anual'], reverse=True)
    
    # Calculate monthly contract totals (sum of all contracts per month)
    contratos_mensal = [0.0] * 12
    for c in contratos_lista:
        for m in range(12):
            contratos_mensal[m] += c['cronograma'][m]
            
    # Fixed corporate costs definition - Real month-by-month 2026 payroll data
    folha_real_2026 = {
        1: 6120055.45, 2: 6120055.45, 3: 6120055.45, 4: 6120055.45,
        5: 6386277.86, 6: 6386277.86, 7: 6386277.86, 8: 6386277.86,
        9: 6386277.86, 10: 6386277.86, 11: 6386277.86, 12: 10028664.25
    }
    alimentacao_real_2026 = {m: 985149.00 if m <= 4 else round(985149.00 * 1.07, 2) for m in range(1, 13)}
    ingesp_mensal = 500000.00
    
    # Build monthly progression
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
    
    # Aggregate spending by department (CODLO_NOME)
    dept_spending = {}
    for c in contratos_lista:
        s = c['setor']
        dept_spending[s] = dept_spending.get(s, 0.0) + c['valor_anual']
        
    contratos_por_setor = []
    for dept, val in dept_spending.items():
        contratos_por_setor.append({
            'setor': dept,
            'valor': round(val, 2)
        })
    contratos_por_setor.sort(key=lambda x: x['valor'], reverse=True)
    
    # Aggregate spending by category (CATEC_NOME)
    cat_spending = {}
    for c in contratos_lista:
        cat = c['categoria']
        cat_spending[cat] = cat_spending.get(cat, 0.0) + c['valor_anual']
        
    contratos_por_categoria = []
    for cat, val in cat_spending.items():
        contratos_por_categoria.append({
            'categoria': cat,
            'valor': round(val, 2)
        })
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
        
    print(f"Processed despesas fixas and contracts successfully!")
    print(f"Total active contracts: {len(contratos_lista)}")
    print(f"Total annual fixed expenses: R$ {total_despesas_fixas_anual:,.2f}")
    print(f"Contracts annual total: R$ {total_contratos:,.2f}")
    print(f"Output saved to: {out_path}")

if __name__ == '__main__':
    process_despesas_fixas()
