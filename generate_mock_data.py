import os
import pandas as pd

# Create data directory if not exists
os.makedirs('data', exist_ok=True)

# Generate Receitas (Revenue)
receitas_data = []
categories_rec = [
    "Impostos Municipais (IPTU/ISS/ITBI)",
    "Transferências Estaduais (ICMS/IPVA)",
    "Transferências Federais (FPM/SUS/FNDE)",
    "Outras Receitas Correntes"
]

# Baseline monthly values for 2025
base_rec_2025 = {
    "Impostos Municipais (IPTU/ISS/ITBI)": 1400000,
    "Transferências Estaduais (ICMS/IPVA)": 3200000,
    "Transferências Federais (FPM/SUS/FNDE)": 4000000,
    "Outras Receitas Correntes": 600000
}

# Generate 12 months for 2025 and 2026
for year in [2025, 2026]:
    # 2026 has a ~6% growth overall but with some seasonal variances
    growth = 1.06 if year == 2026 else 1.0
    for month in range(1, 13):
        # Seasonal multipliers
        # Jan/Feb: Higher state transfers (IPVA)
        # Mar/Apr: Higher municipal taxes (IPTU collection)
        # Nov/Dec: Slightly higher federal transfers
        multipliers = {cat: 1.0 for cat in categories_rec}
        
        if month in [1, 2]:
            multipliers["Transferências Estaduais (ICMS/IPVA)"] = 1.45
            multipliers["Outras Receitas Correntes"] = 0.90
        elif month in [3, 4]:
            multipliers["Impostos Municipais (IPTU/ISS/ITBI)"] = 1.80
        elif month in [11, 12]:
            multipliers["Transferências Federais (FPM/SUS/FNDE)"] = 1.20
            
        for cat in categories_rec:
            val = base_rec_2025[cat] * multipliers[cat] * growth
            # Add minor random noise (deterministic for reproducibility)
            noise_factor = 0.97 + ((month * 7 + len(cat)) % 7) * 0.01 # 0.97 to 1.03
            val = round(val * noise_factor, 2)
            receitas_data.append([year, month, cat, val])

df_receitas = pd.DataFrame(receitas_data, columns=["ano", "mes", "categoria", "valor"])
df_receitas.to_csv("data/receitas.csv", index=False, encoding="utf-8")

# Generate Despesas Fixas (Fixed Expenses)
despesas_data = []
categories_desp = [
    "Folha de Pagamento",
    "Auxílio Alimentação",
    "Contratos de Energia/Água/Telecom",
    "Repasses ao Legislativo (Duodécimo)",
    "Outros Serviços e Manutenção"
]

# Baseline monthly values for 2025
base_desp_2025 = {
    "Folha de Pagamento": 4800000,
    "Auxílio Alimentação": 600000,
    "Contratos de Energia/Água/Telecom": 750000,
    "Repasses ao Legislativo (Duodécimo)": 280000,
    "Outros Serviços e Manutenção": 550000
}

for year in [2025, 2026]:
    # 2026 has a ~8% increase in fixed expenses due to inflation and salary adjustments
    growth = 1.08 if year == 2026 else 1.0
    for month in range(1, 13):
        # December has 13th salary (decimo terceiro), doubling payroll and food voucher increases
        # June also might have partial 13th salary or vacation pay adjustments
        multipliers = {cat: 1.0 for cat in categories_desp}
        
        if month == 12:
            multipliers["Folha de Pagamento"] = 1.90  # 13th salary payout
            multipliers["Auxílio Alimentação"] = 1.05
        elif month == 6:
            multipliers["Folha de Pagamento"] = 1.25  # Mid-year vacation pay / bonus
            
        # Summer months (Jan, Dec) have higher energy consumption (AC usage)
        if month in [12, 1, 2]:
            multipliers["Contratos de Energia/Água/Telecom"] = 1.25
        elif month in [6, 7, 8]:
            multipliers["Contratos de Energia/Água/Telecom"] = 0.85

        for cat in categories_desp:
            val = base_desp_2025[cat] * multipliers[cat] * growth
            # Add minor deterministic noise
            noise_factor = 0.98 + ((month * 5 + len(cat)) % 5) * 0.01  # 0.98 to 1.02
            val = round(val * noise_factor, 2)
            despesas_data.append([year, month, cat, val])

df_despesas = pd.DataFrame(despesas_data, columns=["ano", "mes", "categoria", "valor"])
df_despesas.to_csv("data/despesas.csv", index=False, encoding="utf-8")

print("CSV files generated successfully inside data/ directory!")
