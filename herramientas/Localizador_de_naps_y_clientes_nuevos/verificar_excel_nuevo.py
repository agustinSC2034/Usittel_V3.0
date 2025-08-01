import pandas as pd

try:
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
        
except Exception as e:
    print(f'Error: {e}')
