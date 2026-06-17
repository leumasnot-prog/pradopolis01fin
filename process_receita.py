import pandas as pd
import json
import re

def clean_currency(x):
    if pd.isna(x) or x == '':
        return 0.0
    if isinstance(x, (int, float)):
        return float(x)
    x_str = str(x).replace('R$', '').strip()
    if x_str == '-' or x_str == '0' or x_str == '':
        return 0.0
    
    is_neg = False
    if x_str.startswith('-'):
        is_neg = True
        x_str = x_str[1:].strip()
        
    x_str = x_str.replace('.', '').replace(',', '.')
    try:
        val = float(x_str)
        return -val if is_neg else val
    except Exception:
        return 0.0

def title_with_acronyms(text):
    if pd.isna(text):
        return ""
    text = str(text).strip()
    text = " ".join(text.split())
    text = text.title()
    
    replacements = {
        "Iptu": "IPTU",
        "Iss": "ISS",
        "Fpm": "FPM",
        "Sus": "SUS",
        "Fundeb": "FUNDEB",
        "Ipva": "IPVA",
        "Icms": "ICMS",
        "Itbi": "ITBI",
        "Irrf": "IRRF",
        "Irpj": "IRPJ",
        "Cip": "CIP",
        "Rpps": "RPPS",
        "Df": "DF",
        "Ipi": "IPI",
        "Cide": "CIDE",
        "Pnae": "PNAE",
        "Pnate": "PNATE",
        "Fnas": "FNAS",
        "Rfb": "RFB",
        "Issqn": "ISSQN",
        "Stn": "STN",
        "Lc": "LC",
        "Pnab": "PNAB"
    }
    for k, v in replacements.items():
        text = re.sub(r'\b' + k + r'\b', v, text)
    return text

def build_tree():
    df = pd.read_csv('data/orcamento-arrecadacao2026.csv', sep=';', encoding='utf-8-sig', dtype=str)
    df = df.dropna(subset=['CODRE'])
    df = df[df['CODRE'].str.strip() != '']
    
    df['VALOR_CLEAN'] = df[' VALOR '].apply(clean_currency)
    
    # Filter only rows with positive values and ignore deductions (start with 9)
    df_normal = df[df['VALOR_CLEAN'] > 0]
    df_normal = df_normal[~df_normal['CODRE'].astype(str).str.startswith('9')]
    
    # Normalize codes to identify leaf nodes without trailing zeros
    def get_sig(c):
        parts = [str(int(p.strip())) if p.strip().isdigit() else p.strip() for p in str(c).split('.')]
        while parts and parts[-1] == '0':
            parts.pop()
        return parts

    sigs = {r['CODRE']: get_sig(r['CODRE']) for _, r in df_normal.iterrows()}

    leaves = []
    for _, r in df_normal.iterrows():
        c = r['CODRE']
        p = sigs[c]
        is_parent = False
        for other_c, other_p in sigs.items():
            if c == other_c:
                continue
            if len(p) < len(other_p) and other_p[:len(p)] == p:
                is_parent = True
                break
        if not is_parent:
            leaves.append(r)

    leaves_df = pd.DataFrame(leaves)

    # Handle deduction row
    deduc_row = df[df['CODRE'] == '9000.00.0.0.00.00']
    deduc_val = 0.0
    has_deduc = False
    if not deduc_row.empty:
        deduc_val = clean_currency(deduc_row.iloc[0]['VALOR F. TOTAL'])
        has_deduc = True

    # 1. Generate Treemap data
    # Sum by Fonte de Recurso
    tesouro_total = 0.0
    vinculados_total = 0.0

    for _, row in leaves_df.iterrows():
        fonte = str(row['FONTE DE RECURSO']).strip()
        valor = float(row['VALOR_CLEAN'])
        if '01' in fonte:
            tesouro_total += valor
        else:
            vinculados_total += valor

    # Apply deduction to Recurso Próprio (Tesouro) total
    tesouro_total += deduc_val

    treemap_data = [
        {"name": "Recurso Próprio (Tesouro)", "value": round(tesouro_total, 2)},
        {"name": "Recursos Vinculados (União / Estado / Emendas)", "value": round(vinculados_total, 2)}
    ]

    # 2. Generate TreeTable data
    categories_map = {
        '11': 'Impostos, Taxas e Contribuições de Melhoria',
        '12': 'Contribuições',
        '13': 'Receita Patrimonial',
        '16': 'Receita de Serviços',
        '17': 'Transferências Correntes',
        '19': 'Outras Receitas Correntes',
        '22': 'Alienação de Bens',
        '24': 'Transferências de Capital',
        '29': 'Outras Receitas de Capital',
        '90': '(-) Dedução da Receita (Fundeb)'
    }

    def find_macro_name(prefix):
        if prefix in categories_map:
            return categories_map[prefix]
        return f"Outras Receitas ({prefix})"

    groups = {
        "01": {
            "id": "01",
            "name": "Recurso Próprio (Tesouro)",
            "value": 0.0,
            "type": "root",
            "children_map": {}
        },
        "02": {
            "id": "02",
            "name": "Recursos Vinculados (União / Estado / Emendas)",
            "value": 0.0,
            "type": "root",
            "children_map": {}
        }
    }

    for _, row in leaves_df.iterrows():
        codre = str(row['CODRE'])
        nome = str(row['NOME'])
        sigla = str(row['SIGLAS']).strip() if not pd.isna(row['SIGLAS']) else ""
        valor = float(row['VALOR_CLEAN'])
        fonte = str(row['FONTE DE RECURSO']).strip()
        
        group_key = "01" if "01" in fonte else "02"
        groups[group_key]["value"] += valor
        
        macro_prefix = codre[:2]
        
        children_map = groups[group_key]["children_map"]
        if macro_prefix not in children_map:
            children_map[macro_prefix] = {
                "id": macro_prefix,
                "name": find_macro_name(macro_prefix),
                "value": 0.0,
                "type": "node",
                "children": []
            }
            
        children_map[macro_prefix]["value"] += valor
        
        children_map[macro_prefix]["children"].append({
            "id": codre,
            "name": title_with_acronyms(nome),
            "siglas": sigla if sigla else None,
            "value": round(valor, 2),
            "type": "leaf"
        })

    # Add deduction leaf under Recurso Próprio
    if has_deduc:
        group_key = "01"
        groups[group_key]["value"] += deduc_val
        
        macro_prefix = "90"
        children_map = groups[group_key]["children_map"]
        if macro_prefix not in children_map:
            children_map[macro_prefix] = {
                "id": macro_prefix,
                "name": find_macro_name(macro_prefix),
                "value": 0.0,
                "type": "node",
                "children": []
            }
        children_map[macro_prefix]["value"] += deduc_val
        
        children_map[macro_prefix]["children"].append({
            "id": "9000.00.0.0.00.00",
            "name": "(-) Dedução da Receita para Formação do Fundeb",
            "siglas": "DEDUÇÃO FUNDEB",
            "value": round(deduc_val, 2),
            "type": "leaf"
        })

    # Convert groups to list and clean up children_map
    table_data = []
    for gk in ["01", "02"]:
        g = groups[gk]
        g["value"] = round(g["value"], 2)
        macro_list = []
        for pk, node in g["children_map"].items():
            node["value"] = round(node["value"], 2)
            node["name"] = title_with_acronyms(node["name"])
            node["children"].sort(key=lambda x: x["value"], reverse=True)
            macro_list.append(node)
            
        macro_list.sort(key=lambda x: x["value"], reverse=True)
        g["children"] = macro_list
        del g["children_map"]
        table_data.append(g)

    # Write output JSONs
    with open('src/data/treemap_data.json', 'w', encoding='utf-8') as f:
        json.dump(treemap_data, f, ensure_ascii=False, indent=2)
        
    with open('src/data/treetable_data.json', 'w', encoding='utf-8') as f:
        json.dump(table_data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    build_tree()
    print("Processamento concluído com sucesso!")
