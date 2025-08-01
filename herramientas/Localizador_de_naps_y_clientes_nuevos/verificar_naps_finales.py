#!/usr/bin/env python3
"""
Script para verificar el archivo final de NAPs corregido
"""

import pandas as pd
import sys

def verificar_naps():
    try:
        print("🔍 VERIFICANDO ARCHIVO FINAL DE NAPs...")
        
        # Cargar archivo
        df = pd.read_excel('excels_con_los_datos_de_partida/archivo_final_naps.xlsx')
        
        print(f"📊 Total registros: {len(df)}")
        print(f"📋 Columnas: {list(df.columns)}")
        
        print("\n📄 MUESTRA (primeros 3 registros):")
        for i, row in df.head(3).iterrows():
            print(f"\nRegistro {i+1}:")
            for col in df.columns:
                print(f"  {col}: {row[col]}")
        
        # Verificar coordenadas (intentar diferentes nombres de columnas)
        lat_col = None
        lon_col = None
        
        for col in df.columns:
            if 'latitud' in col.lower():
                lat_col = col
            if 'longitud' in col.lower():
                lon_col = col
        
        if lat_col and lon_col:
            lat_validas = df[lat_col].notna().sum()
            lon_validas = df[lon_col].notna().sum()
            print(f"\n📍 VERIFICACIÓN COORDENADAS:")
            print(f"  - Columna latitud: '{lat_col}'")
            print(f"  - Columna longitud: '{lon_col}'")
            print(f"  - Latitudes válidas: {lat_validas}/{len(df)} ({lat_validas/len(df)*100:.1f}%)")
            print(f"  - Longitudes válidas: {lon_validas}/{len(df)} ({lon_validas/len(df)*100:.1f}%)")
            
            # Verificar rangos de coordenadas
            if lat_validas > 0:
                lat_min, lat_max = df[lat_col].min(), df[lat_col].max()
                lon_min, lon_max = df[lon_col].min(), df[lon_col].max()
                print(f"  - Rango latitudes: {lat_min:.6f} a {lat_max:.6f}")
                print(f"  - Rango longitudes: {lon_min:.6f} a {lon_max:.6f}")
        else:
            print("\n❌ No se encontraron columnas de coordenadas")
            
    except Exception as e:
        print(f"❌ Error verificando NAPs: {e}")
        return False
    
    return True

if __name__ == "__main__":
    verificar_naps()
