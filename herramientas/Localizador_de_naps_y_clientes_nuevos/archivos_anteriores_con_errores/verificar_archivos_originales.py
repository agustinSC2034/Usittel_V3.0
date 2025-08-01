#!/usr/bin/env python3
"""
Script para verificar archivos originales y su contenido
"""

import pandas as pd
import os

def verificar_archivos_originales():
    """Verifica el contenido de los archivos originales importantes"""
    
    print("📋 VERIFICACIÓN DE ARCHIVOS ORIGINALES")
    print("="*60)
    
    # 1. Base de datos de clientes
    archivo_clientes = "base de datos copia.xlsx"
    if os.path.exists(archivo_clientes):
        print(f"\n✅ {archivo_clientes}")
        try:
            df_clientes = pd.read_excel(archivo_clientes)
            print(f"   📊 Total clientes: {len(df_clientes)}")
            print(f"   📋 Columnas: {', '.join(df_clientes.columns.tolist())}")
            
            # Verificar zonas
            if 'ZONA' in df_clientes.columns:
                zonas = df_clientes['ZONA'].value_counts()
                print(f"   🗺️  Distribución por zonas:")
                for zona, cantidad in zonas.items():
                    print(f"      {zona}: {cantidad} clientes")
            
            # Mostrar primeras filas
            print(f"   👀 Primeras 3 filas:")
            for i, row in df_clientes.head(3).iterrows():
                print(f"      {i+1}. {row.get('DIRECCION', 'N/A')} - {row.get('ZONA', 'N/A')}")
                
        except Exception as e:
            print(f"   ❌ Error leyendo archivo: {e}")
    else:
        print(f"\n❌ {archivo_clientes} - NO ENCONTRADO")
    
    # 2. Base de datos de NAPs
    archivo_naps = "Posibles clientes cerca de Naps libres.xlsx"
    if os.path.exists(archivo_naps):
        print(f"\n✅ {archivo_naps}")
        try:
            df_naps = pd.read_excel(archivo_naps)
            print(f"   📊 Total NAPs: {len(df_naps)}")
            print(f"   📋 Columnas: {', '.join(df_naps.columns.tolist())}")
            
            # Verificar ocupación
            if 'OCUPACION' in df_naps.columns:
                ocupacion_col = 'OCUPACION'
            elif 'Ocupacion' in df_naps.columns:
                ocupacion_col = 'Ocupacion'
            elif 'ocupacion' in df_naps.columns:
                ocupacion_col = 'ocupacion'
            else:
                ocupacion_col = None
                
            if ocupacion_col:
                naps_disponibles = df_naps[df_naps[ocupacion_col] <= 30]
                print(f"   🟢 NAPs disponibles (≤30%): {len(naps_disponibles)}")
                print(f"   🔴 NAPs ocupadas (>30%): {len(df_naps) - len(naps_disponibles)}")
                
                # Estadísticas de ocupación
                print(f"   📈 Ocupación promedio: {df_naps[ocupacion_col].mean():.1f}%")
                print(f"   📈 Ocupación mínima: {df_naps[ocupacion_col].min():.1f}%")
                print(f"   📈 Ocupación máxima: {df_naps[ocupacion_col].max():.1f}%")
            else:
                print(f"   ⚠️  No se encontró columna de ocupación")
            
            # Mostrar primeras NAPs disponibles
            if ocupacion_col:
                naps_libres = df_naps[df_naps[ocupacion_col] <= 30].head(3)
                print(f"   👀 Primeras 3 NAPs disponibles:")
                for i, row in naps_libres.iterrows():
                    direccion = row.get('DIRECCION', row.get('Direccion', 'N/A'))
                    ocupacion = row.get(ocupacion_col, 'N/A')
                    print(f"      {i+1}. {direccion} - {ocupacion}%")
                
        except Exception as e:
            print(f"   ❌ Error leyendo archivo: {e}")
    else:
        print(f"\n❌ {archivo_naps} - NO ENCONTRADO")
    
    # 3. Cache de geocodificación
    archivo_cache = "cache_geocoding.json"
    if os.path.exists(archivo_cache):
        print(f"\n✅ {archivo_cache}")
        try:
            import json
            with open(archivo_cache, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            print(f"   📊 Entradas en cache: {len(cache_data)}")
            
            # Mostrar algunas entradas
            print(f"   👀 Primeras 3 entradas del cache:")
            for i, (direccion, coords) in enumerate(list(cache_data.items())[:3]):
                print(f"      {i+1}. {direccion} → {coords}")
                
        except Exception as e:
            print(f"   ❌ Error leyendo cache: {e}")
    else:
        print(f"\n❌ {archivo_cache} - NO ENCONTRADO")
    
    print(f"\n📁 Archivos archivados en: archivos_antiguos/")
    if os.path.exists("archivos_antiguos"):
        archivos_archivados = os.listdir("archivos_antiguos")
        print(f"   📦 Total archivos archivados: {len(archivos_archivados)}")

if __name__ == "__main__":
    verificar_archivos_originales()
