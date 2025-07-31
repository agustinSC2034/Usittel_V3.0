import pandas as pd
import json

# Lee el CSV limpio
df = pd.read_csv('cajas_naps_limpio.csv')

# Prepara la lista de diccionarios
naps = []
for _, row in df.iterrows():
    nap = {
        'id': str(row['ID_NAP']),
        'direccion': str(row['DIRECCION']),
        'puertosTotales': int(row['PUERTOS_TOTALES']),
        'puertosOcupados': int(row['PUERTOS_OCUPADOS']),
        'lat': float(row['LATITUD']),
        'lon': float(row['LONGITUD'])
    }
    naps.append(nap)

# Guarda como JSON (opcional)
with open('nap_data.json', 'w', encoding='utf-8') as f:
    json.dump(naps, f, indent=2, ensure_ascii=False)

# Genera el array JS listo para pegar en tools.html
js_code = "const napData = [\n"
for nap in naps:
    js_code += f"    {{ id: \"{nap['id']}\", direccion: \"{nap['direccion']}\", puertosTotales: {nap['puertosTotales']}, puertosOcupados: {nap['puertosOcupados']}, lat: {nap['lat']}, lon: {nap['lon']} }},\n"
js_code = js_code.rstrip(',\n') + "\n];"

with open('nap_data.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

print("¡Listo! Archivos nap_data.json y nap_data.js generados.")