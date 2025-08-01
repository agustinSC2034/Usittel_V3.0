#!/usr/bin/env python3
"""
Script para verificar las distancias corregidas en el nuevo archivo
"""

import pandas as pd
from geopy.distance import geodesic

def verificar_distancias_corregidas():
    """Verifica las distancias en el archivo corregido"""
    
    print("🔍 VERIFICANDO DISTANCIAS EN ARCHIVO CORREGIDO")
    print("="*60)
    
    # Cargar el archivo recién generado
    archivo_reciente = "zona2_sin_deptos_20250801_0857.xlsx"
    df = pd.read_excel(archivo_reciente)
    
    # Casos específicos que mencionó el usuario
    casos_test = [
        "ALSINA 1085",
        "ALSINA 1274", 
        "ALSINA 956",
        "ALSINA 1518"
    ]
    
    print(f"📊 Archivo cargado: {len(df)} clientes procesados")
    print(f"🔍 Verificando casos específicos...")
    
    for direccion_buscar in casos_test:
        print(f"\n📍 BUSCANDO: {direccion_buscar}")
        
        # Buscar clientes que contengan esta dirección
        clientes_encontrados = df[df['direccion_cliente'].str.contains(direccion_buscar, na=False, case=False)]
        
        if len(clientes_encontrados) > 0:
            for _, cliente in clientes_encontrados.iterrows():
                print(f"   ✅ Encontrado: {cliente['direccion_cliente']}")
                print(f"   📍 NAP asignada: {cliente['nap_asignada']}")
                print(f"   📏 Distancia reportada: {cliente['distancia_metros']}m")
                
                # Verificar distancia manualmente
                cliente_coords = (cliente['latitud_cliente'], cliente['longitud_cliente'])
                nap_coords = (cliente['latitud_nap'], cliente['longitud_nap'])
                distancia_real = geodesic(cliente_coords, nap_coords).meters
                
                print(f"   🔍 Distancia calculada manualmente: {distancia_real:.1f}m")
                
                diferencia = abs(distancia_real - cliente['distancia_metros'])
                if diferencia < 1:
                    print(f"   ✅ Distancia CORRECTA (diferencia: {diferencia:.1f}m)")
                else:
                    print(f"   ⚠️  Distancia INCORRECTA (diferencia: {diferencia:.1f}m)")
        else:
            print(f"   ❌ No encontrado en resultados")
    
    # Revisar casos sospechosos (distancia < 10m)
    casos_sospechosos = df[df['distancia_metros'] < 10].copy()
    print(f"\n⚠️  ANÁLISIS DE CASOS SOSPECHOSOS (< 10m): {len(casos_sospechosos)}")
    
    if len(casos_sospechosos) > 0:
        print(f"   Mostrando primeros 10 casos:")
        for i, (_, caso) in enumerate(casos_sospechosos.head(10).iterrows()):
            cliente_coords = (caso['latitud_cliente'], caso['longitud_cliente'])
            nap_coords = (caso['latitud_nap'], caso['longitud_nap'])
            distancia_real = geodesic(cliente_coords, nap_coords).meters
            
            print(f"   {i+1:2d}. {caso['direccion_cliente']} → {caso['nap_asignada']}")
            print(f"       Reportado: {caso['distancia_metros']}m | Real: {distancia_real:.1f}m")
            
            if abs(distancia_real - caso['distancia_metros']) < 1:
                print(f"       ✅ CORRECTO")
            else:
                print(f"       ❌ ERROR - Diferencia: {abs(distancia_real - caso['distancia_metros']):.1f}m")
    
    print(f"\n📈 ESTADÍSTICAS GENERALES:")
    print(f"   📊 Total clientes procesados: {len(df)}")
    print(f"   📊 Distancia promedio: {df['distancia_metros'].mean():.1f}m")
    print(f"   📊 Distancia mínima: {df['distancia_metros'].min():.1f}m")
    print(f"   📊 Distancia máxima: {df['distancia_metros'].max():.1f}m")
    print(f"   📊 Casos < 10m: {len(casos_sospechosos)} ({len(casos_sospechosos)/len(df)*100:.1f}%)")

def main():
    verificar_distancias_corregidas()

if __name__ == "__main__":
    main()
