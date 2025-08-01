#!/usr/bin/env python3
"""
Script para examinar la estructura de los datos de partida
"""

import pandas as pd

def examinar_archivo(archivo, nombre):
    """Examinar un archivo Excel en detalle"""
    print(f"\n📂 EXAMINANDO: {nombre}")
    print("="*60)
    
    try:
        df = pd.read_excel(archivo)
        
        print(f"📊 Dimensiones: {df.shape[0]} filas × {df.shape[1]} columnas")
        print(f"\n📋 COLUMNAS DISPONIBLES:")
        for i, col in enumerate(df.columns):
            print(f"   {i+1:2d}. {col}")
        
        print(f"\n📋 PRIMERAS 5 FILAS:")
        print(df.head().to_string())
        
        print(f"\n📋 ÚLTIMAS 5 FILAS:")
        print(df.tail().to_string())
        
        # Buscar columnas que parezcan direcciones
        print(f"\n🔍 BUSCANDO DIRECCIONES REALES:")
        for col in df.columns:
            col_lower = col.lower()
            if 'direccion' in col_lower or 'domicilio' in col_lower or 'calle' in col_lower:
                print(f"   ✅ Columna potencial: {col}")
                # Mostrar algunos valores únicos
                valores_unicos = df[col].dropna().unique()[:10]
                print(f"      Valores ejemplo: {list(valores_unicos)}")
        
        # Buscar valores que parezcan direcciones reales
        print(f"\n🏠 BUSCANDO PATRONES DE DIRECCIONES:")
        for col in df.columns:
            valores = df[col].dropna().astype(str)
            # Buscar valores que contengan números y letras (típico de direcciones)
            direcciones_posibles = valores[valores.str.contains(r'\d+.*[A-Za-z]|[A-Za-z].*\d+', regex=True, na=False)]
            if len(direcciones_posibles) > 0:
                print(f"   📍 En columna '{col}': {len(direcciones_posibles)} valores que parecen direcciones")
                print(f"      Ejemplos: {list(direcciones_posibles.head(5))}")
        
        return df
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("🔍 ANÁLISIS DE DATOS DE PARTIDA")
    print("="*60)
    
    # Examinar archivo de clientes ZONA 2
    df_clientes = examinar_archivo(
        "excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_2.xlsx",
        "CLIENTES ZONA 2"
    )
    
    # Examinar archivo de NAPs
    df_naps = examinar_archivo(
        "excels_con_los_datos_de_partida/Cajas_naps_con_menos_del_30_de_ocupacion.xlsx",
        "NAPS DISPONIBLES"
    )
    
    print(f"\n🎯 CONCLUSIONES:")
    print("="*40)
    
    if df_clientes is not None:
        print(f"✅ Clientes ZONA 2 cargados: {len(df_clientes)} registros")
    else:
        print(f"❌ Error cargando clientes ZONA 2")
    
    if df_naps is not None:
        print(f"✅ NAPs disponibles: {len(df_naps)} registros")
    else:
        print(f"❌ Error cargando NAPs")

if __name__ == "__main__":
    main()
