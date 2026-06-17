import pandas as pd
import glob
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
    
    # Replacement dictionary for corrupted characters
    replacements = {
        "ASSISTNCIA": "ASSISTÊNCIA",
        "PROMOO": "PROMOÇÃO",
        "SADE": "SAÚDE",
        "EDUCAO": "EDUCAÇÃO",
        "ADMINISTRAO": "ADMINISTRAÇÃO",
        "TECNOLOGIA DA INFORMAO": "TECNOLOGIA DA INFORMAÇÃO",
        "JURDICOS": "JURÍDICOS",
        "JURDICA": "JURÍDICA",
        "FSICA": "FÍSICA",
        "SERVIOS": "SERVIÇOS",
        "SERVIO": "SERVIÇO",
        "TERCEIROS": "TERCEIROS",
        "TCNICO": "TÉCNICO",
        "Judiciria": "Judiciária",
        "Ao": "Ação",
        "Ao": "Ação",
        "MANUTENO": "MANUTENÇÃO",
        "AQUISIO": "AQUISIÇÃO",
        "CONSTRUO": "CONSTRUÇÃO",
        "DIFUSO": "DIFUSÃO",
        "VIGILNCIA": "VIGILÂNCIA",
        "SANITRIA": "SANITÁRIA",
        "EPIDEMIOLGICA": "EPIDEMIOLÓGICA",
        "ALIMENTAO": "ALIMENTAÇÃO",
        "PROTEO": "PROTEÇÃO",
        "PROTEO": "PROTEÇÃO",
        "BSICA": "BÁSICA",
        "PBLICA": "PÚBLICA",
        "FORMAO": "FORMAÇÃO",
        "CRIANA": "CRECHE/CRIANÇA",
        "ADOLESCENTE": "ADOLESCENTE",
        "ATENO": "ATENÇÃO",
        "GRATIFICAES": "GRATIFICAÇÕES",
        "INDENIZAES": "INDENIZAÇÕES",
        "RESTITUIES": "RESTITUIÇÕES",
        "CONTRIBUIES": "CONTRIBUIÇÕES",
        "APLICAES": "APLICAÇÕES",
        "LOCAO": "LOCAÇÃO",
        "COMUNICAO": "COMUNICAÇÃO",
        "COLETA": "COLETA",
        "DESTINAO": "DESTINAÇÃO",
        "CONTRATAO": "CONTRATAÇÃO",
        "CRIANA": "CRIANÇA",
        "MUNICIPAL": "MUNICIPAL"
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
        
    text = " ".join(text.split())
    
    # Specific known fixes for common department/category names
    text = text.replace("ASSISTENCIA E PROMOCAO", "ASSISTÊNCIA E PROMOÇÃO")
    text = text.replace("SAUDE", "SAÚDE")
    text = text.replace("EDUCAO", "EDUCAÇÃO")
    text = text.replace("ADMINISTRAO GERAL", "ADMINISTRAÇÃO GERAL")
    text = text.replace("TECNOLOGIA DA INFORMAO", "TECNOLOGIA DA INFORMAÇÃO")
    text = text.replace("ASSUNTOS JURDICOS", "ASSUNTOS JURÍDICOS")
    text = text.replace("PESSOA JURDICA", "PESSOA JURÍDICA")
    text = text.replace("PESSOA FSICA", "PESSOA FÍSICA")
    
    return text

def process_orcamento():
    files = glob.glob('data/orcamento-*.csv')
    # Filter out revenue (arrecadacao) and other non-target csv files
    files = [f for f in files if 'arrecadacao' not in f and 'consolidado' not in f]
    
    print(f"Found {len(files)} files to process:")
    for f in files:
        print(f" - {f}")
        
    category_map = {
        'orcamento-distribuicao2026.csv': 'Distribuição de Recursos',
        'orcamento-equipamentos2026.csv': 'Equipamentos',
        'orcamento-materialconsumo2026.csv': 'Material de Consumo',
        'orcamento-servicospf2026.csv': 'Serviços PF',
        'orcamento-servicospj2026.csv': 'Serviços PJ'
    }
    
    all_fichas = []
    
    for f in files:
        filename = os.path.basename(f)
        cat_name = category_map.get(filename, 'Outros')
        
        # Load file
        df = pd.read_csv(f, sep=';', encoding='utf-8-sig', dtype=str)
        
        # Check standard columns
        required_cols = ['FICHA', 'DOTACATUAL', 'EMPATUAL', 'LIQATUAL', 'PAGOATUAL', 'APAGAR', 'SALDO']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            print(f"Warning: {filename} is missing columns {missing_cols}. Skipping.")
            continue
            
        # Clean numeric columns
        for c in required_cols[1:]:
            df[c] = df[c].apply(clean_val)
            
        df['FICHA'] = df['FICHA'].str.strip()
        df = df[df['FICHA'].notna() & (df['FICHA'] != '')]
        
        # Group by FICHA
        # We also want to keep the metadata columns. We'll aggregate them by first non-null
        metadata_cols = ['UNIDADENOME', 'FUNCAONOME', 'SUBFUNCAONOME', 'CATECFICHA', 'CATECFICHANOME']
        
        # Make sure they exist in dataframe, fill with empty string if missing
        for col in metadata_cols:
            if col not in df.columns:
                df[col] = ""
                
        # Grouping and aggregating
        grouped = df.groupby('FICHA').agg({
            'DOTACATUAL': 'sum',
            'EMPATUAL': 'sum',
            'LIQATUAL': 'sum',
            'PAGOATUAL': 'sum',
            'APAGAR': 'sum',
            'SALDO': 'sum',
            'UNIDADENOME': 'first',
            'FUNCAONOME': 'first',
            'SUBFUNCAONOME': 'first',
            'CATECFICHA': 'first',
            'CATECFICHANOME': 'first'
        }).reset_index()
        
        for idx, row in grouped.iterrows():
            ficha = row['FICHA']
            dot = float(row['DOTACATUAL'])
            emp = float(row['EMPATUAL'])
            liq = float(row['LIQATUAL'])
            pag = float(row['PAGOATUAL'])
            apg = float(row['APAGAR'])
            sal = float(row['SALDO'])
            
            # If dotação is 0, execution percentage can be calculated based on empenhado
            pct = round((emp / dot * 100), 2) if dot > 0 else (100.0 if emp > 0 else 0.0)
            
            status = 'normal'
            if pct > 85:
                status = 'critical'
            elif pct > 70:
                status = 'warning'
                
            all_fichas.append({
                'ficha': ficha,
                'categoria': cat_name,
                'setor': clean_text(row['UNIDADENOME']),
                'funcao': clean_text(row['FUNCAONOME']),
                'subfuncao': clean_text(row['SUBFUNCAONOME']),
                'catecficha': str(row['CATECFICHA']).strip(),
                'especificacao': clean_text(row['CATECFICHANOME']),
                'dotacao': round(dot, 2),
                'empenhado': round(emp, 2),
                'liquidado': round(liq, 2),
                'pago': round(pag, 2),
                'apagar': round(apg, 2),
                'saldo': round(sal, 2),
                'percentual_consumido': pct,
                'status': status
            })
            
    # Calculate global totals
    total_dot = sum(f['dotacao'] for f in all_fichas)
    total_emp = sum(f['empenhado'] for f in all_fichas)
    total_liq = sum(f['liquidado'] for f in all_fichas)
    total_pag = sum(f['pago'] for f in all_fichas)
    total_apg = sum(f['apagar'] for f in all_fichas)
    total_sal = sum(f['saldo'] for f in all_fichas)
    
    global_pct = round((total_emp / total_dot * 100), 2) if total_dot > 0 else 0.0
    
    resumo_geral = {
        'dotacao_total': round(total_dot, 2),
        'empenhado_total': round(total_emp, 2),
        'liquidado_total': round(total_liq, 2),
        'pago_total': round(total_pag, 2),
        'apagar_total': round(total_apg, 2),
        'saldo_total': round(total_sal, 2),
        'percentual_consumido': global_pct
    }
    
    # Aggregate by Category
    cat_summary = {}
    for f in all_fichas:
        c = f['categoria']
        if c not in cat_summary:
            cat_summary[c] = {'dotacao': 0.0, 'empenhado': 0.0, 'liquidado': 0.0, 'pago': 0.0, 'apagar': 0.0, 'saldo': 0.0}
        cat_summary[c]['dotacao'] += f['dotacao']
        cat_summary[c]['empenhado'] += f['empenhado']
        cat_summary[c]['liquidado'] += f['liquidado']
        cat_summary[c]['pago'] += f['pago']
        cat_summary[c]['apagar'] += f['apagar']
        cat_summary[c]['saldo'] += f['saldo']
        
    categorias = []
    for c, vals in cat_summary.items():
        dot = vals['dotacao']
        emp = vals['empenhado']
        pct = round((emp / dot * 100), 2) if dot > 0 else (100.0 if emp > 0 else 0.0)
        categorias.append({
            'categoria': c,
            'dotacao': round(dot, 2),
            'empenhado': round(emp, 2),
            'liquidado': round(vals['liquidado'], 2),
            'pago': round(vals['pago'], 2),
            'apagar': round(vals['apagar'], 2),
            'saldo': round(vals['saldo'], 2),
            'percentual_consumido': pct
        })
        
    # Sort categories by budget size descending
    categorias.sort(key=lambda x: x['dotacao'], reverse=True)
    
    # Aggregate by Sector (UNIDADENOME)
    sector_summary = {}
    for f in all_fichas:
        s = f['setor'] if f['setor'] != "" else "OUTROS SETORES"
        if s not in sector_summary:
            sector_summary[s] = {'dotacao': 0.0, 'empenhado': 0.0, 'liquidado': 0.0, 'pago': 0.0, 'apagar': 0.0, 'saldo': 0.0}
        sector_summary[s]['dotacao'] += f['dotacao']
        sector_summary[s]['empenhado'] += f['empenhado']
        sector_summary[s]['liquidado'] += f['liquidado']
        sector_summary[s]['pago'] += f['pago']
        sector_summary[s]['apagar'] += f['apagar']
        sector_summary[s]['saldo'] += f['saldo']
        
    setores = []
    for s, vals in sector_summary.items():
        dot = vals['dotacao']
        emp = vals['empenhado']
        pct = round((emp / dot * 100), 2) if dot > 0 else (100.0 if emp > 0 else 0.0)
        setores.append({
            'setor': s,
            'dotacao': round(dot, 2),
            'empenhado': round(emp, 2),
            'liquidado': round(vals['liquidado'], 2),
            'pago': round(vals['pago'], 2),
            'apagar': round(vals['apagar'], 2),
            'saldo': round(vals['saldo'], 2),
            'percentual_consumido': pct
        })
        
    # Sort sectors by budget size descending
    setores.sort(key=lambda x: x['dotacao'], reverse=True)
    
    # Sort all fichas by Ficha number numerically
    def get_ficha_num(x):
        try:
            return int(x['ficha'])
        except:
            return 999999
            
    all_fichas.sort(key=get_ficha_num)
    
    # Save output
    output_data = {
        'resumo_geral': resumo_geral,
        'categorias': categorias,
        'setores': setores,
        'fichas': all_fichas
    }
    
    os.makedirs('src/data', exist_ok=True)
    out_path = 'src/data/orcamento_data.json'
    with open(out_path, 'w', encoding='utf-8') as outfile:
        json.dump(output_data, outfile, ensure_ascii=False, indent=2)
        
    print(f"Consolidated data saved successfully! Total Fichas: {len(all_fichas)}")
    print(f"Output path: {out_path}")
    print(f"Total budget Dotação: {resumo_geral['dotacao_total']}")
    print(f"Total committed Empenhado: {resumo_geral['empenhado_total']}")
    print(f"Global consumed %: {resumo_geral['percentual_consumido']}%")

if __name__ == '__main__':
    process_orcamento()
