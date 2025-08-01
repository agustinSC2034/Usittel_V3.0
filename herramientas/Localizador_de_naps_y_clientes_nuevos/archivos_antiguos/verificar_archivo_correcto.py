#!/usr/bin/env python3
"""
Verificación final del archivo CORRECTO de ZONA 2
"""

import pandas as pd

def verificar_archivo_correcto():
    # Verificar múltiples archivos para encontrar el mejor
    archivos_a_verificar = [
        "clientes_ZONA2_FINAL_CORREGIDO_20250801_0136.xlsx",
        "zona2_sin_deptos_20250801_0857.xlsx",
        "clientes_ZONA2_CORREGIDO_20250801_0011.xlsx"
    ]
    
    print("🎯 VERIFICANDO MÚLTIPLES ARCHIVOS DE ZONA 2")
    print("="*60)
    
    for archivo_correcto in archivos_a_verificar:
        print(f"\n📁 VERIFICANDO: {archivo_correcto}")
        print("-" * 50)
    
        try:
            df = pd.read_excel(archivo_correcto)
            print(f"✅ Archivo cargado exitosamente")
            print(f"📊 Total clientes: {len(df)}")
            
            # Verificar casos específicos mencionados por el usuario
            casos_problema = [
                "ALSINA 1274",
                "ALSINA 956", 
                "ALSINA 997",
                "ALSINA 1518"
            ]
            
            print(f"\n🔍 VERIFICANDO CASOS ESPECÍFICOS:")
            print("-" * 30)
            
            errores_encontrados = 0
            
            for direccion_buscar in casos_problema:
                casos = df[df['Dirección del Cliente'].str.contains(direccion_buscar, na=False)]
                
                if len(casos) > 0:
                    caso = casos.iloc[0]
                    nap = caso['NAP Más Cercana']
                    distancia = caso['Distancia (metros)']
                    
                    print(f"✅ {direccion_buscar}: {distancia}m")
                    
                    # Verificar si sigue teniendo errores
                    if distancia == 8.5:
                        print(f"   🚨 ERROR: Sigue con 8.5m")
                        errores_encontrados += 1
                    elif distancia == 1.9:
                        print(f"   🚨 ERROR: Sigue con 1.9m")
                        errores_encontrados += 1
                    elif isinstance(distancia, str) and ("Sin NAPs" in distancia or "Error" in distancia):
                        print(f"   ℹ️  Sin NAP: {distancia}")
                    else:
                        print(f"   ✅ Distancia corregida")
                else:
                    print(f"❌ {direccion_buscar}: No encontrado")
            
            # Estadísticas generales
            con_naps = df[~df['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])]
            
            if len(con_naps) > 0:
                # Convertir distancias a numéricas
                distancias = pd.to_numeric(con_naps['Distancia (metros)'], errors='coerce')
                distancias_validas = distancias.dropna()
                
                print(f"\n📊 ESTADÍSTICAS:")
                print(f"   Clientes con NAPs: {len(con_naps)}")
                print(f"   Distancia promedio: {distancias_validas.mean():.1f}m")
                
                # Verificar si aún hay casos problemáticos
                casos_8_5 = (distancias == 8.5).sum()
                casos_1_9 = (distancias == 1.9).sum()
                casos_muy_pequenos = (distancias < 5).sum()
                
                print(f"\n🚨 ERRORES RESTANTES:")
                print(f"   Casos con 8.5m: {casos_8_5}")
                print(f"   Casos con 1.9m: {casos_1_9}")
                print(f"   Casos < 5m: {casos_muy_pequenos}")
                
                # Evaluación del archivo
                total_errores = casos_8_5 + casos_1_9
                print(f"\n🏆 EVALUACIÓN DE ESTE ARCHIVO:")
                if total_errores == 0:
                    print(f"   ✅ EXCELENTE: Sin errores de 8.5m o 1.9m")
                elif total_errores <= 5:
                    print(f"   � ACEPTABLE: Solo {total_errores} errores menores")
                else:
                    print(f"   🚨 PROBLEMÁTICO: {total_errores} errores graves")
            
        except FileNotFoundError:
            print(f"❌ Archivo no encontrado: {archivo_correcto}")
        except Exception as e:
            print(f"❌ Error leyendo archivo: {e}")
            
        print("=" * 60)
    
    print(f"\n🎯 RESUMEN FINAL:")
    print("="*40)
    print("Revisa los resultados arriba para elegir el mejor archivo")

if __name__ == "__main__":
    verificar_archivo_correcto()
