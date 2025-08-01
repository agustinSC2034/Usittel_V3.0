import pandas as pd
import os

# Cambiar al directorio correcto
os.chdir('C:/Users/Kaiosama/Desktop/Usittel_V3.0/herramientas/Localizador_de_naps_y_clientes_nuevos')

try:
    # Usar el archivo más reciente
    df = pd.read_excel('clientes_ZONA2_NUEVO_20250801_1152.xlsx')
    print('📋 COLUMNAS GENERADAS:')
    for i, col in enumerate(df.columns):
        print(f'   {i+1}. {col}')

    print(f'\n📊 ESTADÍSTICAS:')
    print(f'   Total clientes: {len(df)}')
    
    geocodificados = df[df['latitud_cliente'].notna()]
    print(f'   Geocodificados: {len(geocodificados)}')
    
    print(f'\n📊 MUESTRA DE DATOS (primeros 3 clientes geocodificados):')
    for i, row in geocodificados.head(3).iterrows():
        print(f'\n👤 Cliente {i+1}:')
        print(f'   Nombre: {row["nombre_cliente"]}')
        print(f'   Dirección: {row["direccion_cliente"]}')
        print(f'   Celular: {row["celular_cliente"]}')
        print(f'   Email: {row["email_cliente"]}')
        print(f'   Coords: {row["latitud_cliente"]:.6f}, {row["longitud_cliente"]:.6f}')
        print(f'   NAP: {row["nap_asignada"]}')
        
    # Analizar por qué no hay NAPs asignadas
    print(f'\n🔍 ANÁLISIS DEL PROBLEMA:')
    estados_nap = df['nap_asignada'].value_counts()
    print(f'   Estados de NAPs:')
    for estado, cantidad in estados_nap.items():
        print(f'     - {estado}: {cantidad} casos')
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
