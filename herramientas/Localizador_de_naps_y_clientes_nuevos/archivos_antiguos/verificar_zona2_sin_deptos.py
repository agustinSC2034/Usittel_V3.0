import pandas as pd

try:
    df = pd.read_excel('zona2_sin_deptos_20250801_0857.xlsx')
    print(f'🔍 VERIFICANDO CASOS EN zona2_sin_deptos:')
    print('='*60)
    
    # Primero ver las columnas disponibles
    print(f'📋 Columnas en el archivo:')
    for i, col in enumerate(df.columns):
        print(f'   {i+1}. {col}')
    print()
    
    casos_problema = ['ALSINA 1274', 'ALSINA 956', 'ALSINA 997', 'ALSINA 1518']
    
    for direccion_buscar in casos_problema:
        # Buscar en la columna de direcciones (puede tener nombre diferente)
        if 'direccion_cliente' in df.columns:
            casos = df[df['direccion_cliente'].str.contains(direccion_buscar, na=False)]
        elif 'Direccion' in df.columns:
            casos = df[df['Direccion'].str.contains(direccion_buscar, na=False)]
        elif 'direccion' in df.columns:
            casos = df[df['direccion'].str.contains(direccion_buscar, na=False)]
        else:
            # Buscar en la primera columna que parezca direcciones
            col_direccion = df.columns[0]
            casos = df[df[col_direccion].str.contains(direccion_buscar, na=False)]
        
        if len(casos) > 0:
            print(f'✅ {direccion_buscar}: ENCONTRADO')
            # Mostrar toda la fila para ver qué datos tiene
            caso = casos.iloc[0]
            for col in df.columns:
                valor = caso[col]
                print(f'   {col}: {valor}')
            print('-'*40)
        else:
            print(f'❌ {direccion_buscar}: No encontrado')
        print()
    
    # Estadísticas generales
    print(f'📊 ESTADÍSTICAS zona2_sin_deptos:')
    print(f'   Total filas: {len(df)}')
    print(f'   Total columnas: {len(df.columns)}')
    
    # Buscar columna de distancias
    col_distancia = None
    for col in df.columns:
        if 'distancia' in col.lower() or 'metros' in col.lower():
            col_distancia = col
            break
    
    if col_distancia:
        print(f'   Columna distancia: {col_distancia}')
        print(f'   Distancia promedio: {df[col_distancia].mean():.1f}m')
        print(f'   Distancia mínima: {df[col_distancia].min():.1f}m')
        print(f'   Distancia máxima: {df[col_distancia].max():.1f}m')
        
        # Verificar errores específicos
        casos_8_5 = (df[col_distancia] == 8.5).sum()
        casos_1_9 = (df[col_distancia] == 1.9).sum()
        casos_muy_pequenos = (df[col_distancia] < 5).sum()
        
        print(f'\n🚨 ERRORES EN zona2_sin_deptos:')
        print(f'   Casos con 8.5m: {casos_8_5}')
        print(f'   Casos con 1.9m: {casos_1_9}')
        print(f'   Casos < 5m: {casos_muy_pequenos}')
        
        if casos_8_5 == 0 and casos_1_9 == 0:
            print(f'   ✅ EXCELENTE: Sin errores de 8.5m o 1.9m!')
        else:
            print(f'   🚨 Aún hay errores')
    else:
        print(f'   ⚠️  No se encontró columna de distancias')
        
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
