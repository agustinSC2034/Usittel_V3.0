#!/usr/bin/env python3
import pandas as pd

try:
    df = pd.read_excel('clientes_ZONA2_CORREGIDO_20250801_0011.xlsx')
    print(f'📊 Total filas en Excel corregido: {len(df)}')
    
    # Buscar casos específicos
    casos_alsina_1274 = df[df['Dirección del Cliente'].str.contains('1274', na=False)]
    casos_alsina_956 = df[df['Dirección del Cliente'].str.contains('956', na=False)]
    casos_alsina_997 = df[df['Dirección del Cliente'].str.contains('997', na=False)]
    casos_alsina_1518 = df[df['Dirección del Cliente'].str.contains('1518', na=False)]
    
    print('\n🔍 CASOS ESPECÍFICOS EN EXCEL CORREGIDO:')
    print('='*60)
    
    if len(casos_alsina_1274) > 0:
        caso = casos_alsina_1274.iloc[0]
        print(f'ALSINA 1274: {caso["NAP Más Cercana"]} → {caso["Distancia (metros)"]}m')
    
    if len(casos_alsina_956) > 0:
        caso = casos_alsina_956.iloc[0]
        print(f'ALSINA 956: {caso["NAP Más Cercana"]} → {caso["Distancia (metros)"]}m')
    
    if len(casos_alsina_997) > 0:
        caso = casos_alsina_997.iloc[0]
        print(f'ALSINA 997: {caso["NAP Más Cercana"]} → {caso["Distancia (metros)"]}m')
        
    if len(casos_alsina_1518) > 0:
        caso = casos_alsina_1518.iloc[0]
        print(f'ALSINA 1518: {caso["NAP Más Cercana"]} → {caso["Distancia (metros)"]}m')
    
    # Verificar si aún hay casos con 8.5m
    casos_8_5 = df[df['Distancia (metros)'] == 8.5]
    print(f'\n⚠️  Casos con 8.5m en Excel corregido: {len(casos_8_5)}')
    
    casos_1_9 = df[df['Distancia (metros)'] == 1.9]
    print(f'⚠️  Casos con 1.9m en Excel corregido: {len(casos_1_9)}')
    
except Exception as e:
    print(f'Error: {e}')
