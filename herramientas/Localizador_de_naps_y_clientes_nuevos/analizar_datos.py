#!/usr/bin/env python3
"""
Script para analizar la estructura de los archivos Excel existentes
"""

import pandas as pd
import os

def analizar_base_datos():
    """Analiza la estructura del archivo de base de datos"""
    archivo = "base de datos copia.xlsx"
    
    if not os.path.exists(archivo):
        print(f"❌ No se encontró el archivo: {archivo}")
        return
    
    print(f"📊 Analizando: {archivo}")
    
    # Leer nombres de las hojas
    excel_file = pd.ExcelFile(archivo)
    hojas = excel_file.sheet_names
    print(f"Hojas encontradas: {hojas}")
    
    # Analizar cada hoja
    for hoja in hojas:
        df = pd.read_excel(archivo, sheet_name=hoja)
        print(f"\n--- {hoja} ---")
        print(f"Filas: {len(df)}")
        print(f"Columnas: {df.columns.tolist()}")
        print("Primeras 3 filas:")
        print(df.head(3))
        
        # Buscar columna de estado
        if 'estado' in df.columns or 'Estado' in df.columns:
            estado_col = 'estado' if 'estado' in df.columns else 'Estado'
            print(f"\nValores únicos en {estado_col}:")
            print(df[estado_col].value_counts())

def analizar_naps():
    """Analiza el archivo de NAPs"""
    # Buscar archivo de NAPs
    naps_files = [
        "naps.xlsx",
        "../Localizador_de_naps/naps.xlsx",
        "Posibles clientes cerca de Naps libres.xlsx"
    ]
    
    for archivo in naps_files:
        if os.path.exists(archivo):
            print(f"\n📊 Analizando NAPs: {archivo}")
            
            try:
                df = pd.read_excel(archivo)
                print(f"Filas: {len(df)}")
                print(f"Columnas: {df.columns.tolist()}")
                print("Primeras 3 filas:")
                print(df.head(3))
                
                # Buscar columnas de ocupación
                ocupacion_cols = [col for col in df.columns if 'ocupacion' in col.lower() or 'puertos' in col.lower()]
                if ocupacion_cols:
                    print(f"Columnas de ocupación encontradas: {ocupacion_cols}")
                
                return archivo
            except Exception as e:
                print(f"Error al leer {archivo}: {e}")
    
    print("❌ No se encontró archivo de NAPs válido")
    return None

if __name__ == "__main__":
    print("🔍 Analizando estructura de datos...\n")
    
    analizar_base_datos()
    
    archivo_naps = analizar_naps()
    
    print("\n✅ Análisis completado.")
