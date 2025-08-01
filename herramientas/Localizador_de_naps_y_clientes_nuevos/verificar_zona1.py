#!/usr/bin/env python3
"""
Script para verificar la estructura del archivo ZONA 1
"""

import pandas as pd

def verificar_zona1():
    try:
        print("🔍 VERIFICANDO ARCHIVO ZONA 1...")
        
        # Cargar archivo
        df = pd.read_excel('excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_1.xlsx')
        
        print(f"📊 Total registros: {len(df)}")
        print(f"📋 Columnas: {list(df.columns)}")
        
        print("\n📄 MUESTRA (primeros 3 registros):")
        for i, row in df.head(3).iterrows():
            print(f"\nRegistro {i+1}:")
            for col in df.columns:
                print(f"  {col}: {row[col]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando ZONA 1: {e}")
        return False

if __name__ == "__main__":
    verificar_zona1()
