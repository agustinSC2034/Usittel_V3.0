#!/usr/bin/env python3
"""
Script para revisar los archivos base organizados
"""

import pandas as pd
import os

def revisar_archivos_base():
    """Revisa los archivos base en la carpeta excels_con_los_datos_de_partida"""
    
    carpeta = "excels_con_los_datos_de_partida"
    
    print('📊 REVISIÓN DE ARCHIVOS ORIGINALES')
    print('='*60)
    
    # 1. Revisar clientes ZONA 1
    try:
        archivo_zona1 = os.path.join(carpeta, 'base_de_datos_clientes_no_respondieron_zona_1.xlsx')
        df_zona1 = pd.read_excel(archivo_zona1)
        print(f'\n🟦 ZONA 1:')
        print(f'   Archivo: {archivo_zona1}')
        print(f'   Clientes: {len(df_zona1)}')
        print(f'   Columnas ({len(df_zona1.columns)}): {list(df_zona1.columns)}')
        
        if len(df_zona1) > 0:
            print(f'   📋 Muestra de primeros 3 registros:')
            for i in range(min(3, len(df_zona1))):
                print(f'     {i+1}. {df_zona1.iloc[i, 0]} | {df_zona1.iloc[i, 1] if len(df_zona1.columns) > 1 else "N/A"}')
                
    except Exception as e:
        print(f'❌ Error con ZONA 1: {e}')
        df_zona1 = pd.DataFrame()

    # 2. Revisar clientes ZONA 2  
    try:
        archivo_zona2 = os.path.join(carpeta, 'base_de_datos_clientes_no_respondieron_zona_2.xlsx')
        df_zona2 = pd.read_excel(archivo_zona2)
        print(f'\n🟩 ZONA 2:')
        print(f'   Archivo: {archivo_zona2}')
        print(f'   Clientes: {len(df_zona2)}')
        print(f'   Columnas ({len(df_zona2.columns)}): {list(df_zona2.columns)}')
        
        if len(df_zona2) > 0:
            print(f'   📋 Muestra de primeros 3 registros:')
            for i in range(min(3, len(df_zona2))):
                print(f'     {i+1}. {df_zona2.iloc[i, 0]} | {df_zona2.iloc[i, 1] if len(df_zona2.columns) > 1 else "N/A"}')
                
    except Exception as e:
        print(f'❌ Error con ZONA 2: {e}')
        df_zona2 = pd.DataFrame()

    # 3. Revisar NAPs disponibles
    try:
        archivo_naps = os.path.join(carpeta, 'Cajas_naps_con_menos_del_30_de_ocupacion.xlsx')
        df_naps = pd.read_excel(archivo_naps)
        print(f'\n🟡 NAPs (≤30% ocupación):')
        print(f'   Archivo: {archivo_naps}')
        print(f'   Total NAPs: {len(df_naps)}')
        print(f'   Columnas ({len(df_naps.columns)}): {list(df_naps.columns)}')
        
        if len(df_naps) > 0:
            print(f'   📋 Muestra de primeros 3 registros:')
            for i in range(min(3, len(df_naps))):
                print(f'     {i+1}. {df_naps.iloc[i, 0]} | {df_naps.iloc[i, 1] if len(df_naps.columns) > 1 else "N/A"}')
        
        # Buscar columna de ocupación
        ocupacion_col = None
        for col in df_naps.columns:
            if any(keyword in col.lower() for keyword in ['ocupacion', 'porcentaje', '%', 'ocupada']):
                ocupacion_col = col
                break
        
        if ocupacion_col:
            print(f'\n   📈 Estadísticas de ocupación ({ocupacion_col}):')
            ocupacion_vals = pd.to_numeric(df_naps[ocupacion_col], errors='coerce').dropna()
            print(f'     Mín: {ocupacion_vals.min():.1f}%')
            print(f'     Máx: {ocupacion_vals.max():.1f}%')
            print(f'     Promedio: {ocupacion_vals.mean():.1f}%')
            
            # Verificar que todas sean ≤30%
            naps_over_30 = (ocupacion_vals > 30).sum()
            print(f'     NAPs > 30%: {naps_over_30} (debería ser 0)')
            
            if naps_over_30 > 0:
                print(f'   ⚠️  ADVERTENCIA: Hay {naps_over_30} NAPs con >30% ocupación')
        else:
            print(f'   ⚠️  No se encontró columna de ocupación')
            
    except Exception as e:
        print(f'❌ Error con NAPs: {e}')
        df_naps = pd.DataFrame()

    # Resumen final
    print(f'\n🎯 RESUMEN:')
    print(f'   ZONA 1: {len(df_zona1)} clientes')
    print(f'   ZONA 2: {len(df_zona2)} clientes')
    print(f'   TOTAL CLIENTES: {len(df_zona1) + len(df_zona2)} clientes')
    print(f'   NAPs DISPONIBLES: {len(df_naps)} NAPs')
    
    print(f'\n✅ Archivos base revisados correctamente')
    return df_zona1, df_zona2, df_naps

if __name__ == "__main__":
    revisar_archivos_base()
