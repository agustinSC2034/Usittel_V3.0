import pandas as pd

# Leer el archivo original (usa ; como separador)
df = pd.read_csv('cajas_naps.csv', sep=';')

# Renombrar columnas
df = df.rename(columns={
    'ID NAP': 'ID_NAP',
    'DIRECCION': 'DIRECCION',
    'Puertos_Utilizados': 'PUERTOS_OCUPADOS',
    'Puertos_Disponibles': 'PUERTOS_DISPONIBLES',
    'Latitud': 'LATITUD',
    'Longitud': 'LONGITUD'
})

# Calcular PUERTOS_TOTALES
df['PUERTOS_TOTALES'] = df['PUERTOS_OCUPADOS'] + df['PUERTOS_DISPONIBLES']

# Reemplazar comas por puntos en lat/lon y convertir a float
df['LATITUD'] = df['LATITUD'].astype(str).str.replace(',', '.').astype(float)
df['LONGITUD'] = df['LONGITUD'].astype(str).str.replace(',', '.').astype(float)

# Seleccionar columnas finales y guardar
df_final = df[['ID_NAP', 'DIRECCION', 'PUERTOS_TOTALES', 'PUERTOS_OCUPADOS', 'LATITUD', 'LONGITUD']]
df_final.to_csv('cajas_naps_limpio.csv', index=False)

print('¡Listo! Archivo generado: cajas_naps_limpio.csv')