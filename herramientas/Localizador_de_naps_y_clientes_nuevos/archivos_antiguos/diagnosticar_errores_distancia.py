#!/usr/bin/env python3
"""
Script para diagnosticar el error específico en los cálculos de distancia
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time

def analizar_casos_problematicos():
    """Analiza casos específicos mencionados por el usuario"""
    
    geolocator = Nominatim(user_agent="diagnostico_errores", timeout=10)
    
    casos_problematicos = [
        {
            'cliente': 'ALSINA 1274',
            'nap_reportada': 'SM-C07-21 (ALSINA 454)',
            'distancia_excel': 8.5
        },
        {
            'cliente': 'ALSINA 956', 
            'nap_reportada': 'SM-C07-21 (ALSINA 454)',
            'distancia_excel': 8.5
        },
        {
            'cliente': 'ALSINA 1518',
            'nap_reportada': 'C04-R016-01 (4 de abril 1518)',
            'distancia_excel': 1.9
        },
        {
            'cliente': 'ARANA 1072',
            'nap_reportada': 'C06-R023-04 (Arana y Roca)',
            'distancia_excel': 'Sin dato'
        }
    ]
    
    print("🔍 DIAGNÓSTICO DE CASOS PROBLEMÁTICOS")
    print("="*60)
    
    for i, caso in enumerate(casos_problematicos):
        print(f"\n{i+1}️⃣ CASO: {caso['cliente']}")
        print(f"   NAP reportada: {caso['nap_reportada']}")
        print(f"   Distancia en Excel: {caso['distancia_excel']}m")
        
        # Geocodificar cliente
        direccion_cliente = f"{caso['cliente']}, Tandil, Buenos Aires, Argentina"
        print(f"   Geocodificando: {direccion_cliente}")
        
        try:
            location_cliente = geolocator.geocode(direccion_cliente)
            time.sleep(1.2)
            
            if location_cliente:
                lat_cliente = location_cliente.latitude
                lon_cliente = location_cliente.longitude
                print(f"   ✅ Cliente: {lat_cliente}, {lon_cliente}")
                
                # Geocodificar NAP según el caso
                if 'ALSINA 454' in caso['nap_reportada']:
                    direccion_nap = "ALSINA 454, Tandil, Buenos Aires, Argentina"
                elif '4 de abril 1518' in caso['nap_reportada']:
                    direccion_nap = "4 de abril 1518, Tandil, Buenos Aires, Argentina"
                elif 'Arana y Roca' in caso['nap_reportada']:
                    direccion_nap = "Arana y Roca, Tandil, Buenos Aires, Argentina"
                
                print(f"   Geocodificando NAP: {direccion_nap}")
                location_nap = geolocator.geocode(direccion_nap)
                time.sleep(1.2)
                
                if location_nap:
                    lat_nap = location_nap.latitude
                    lon_nap = location_nap.longitude
                    print(f"   ✅ NAP: {lat_nap}, {lon_nap}")
                    
                    # Calcular distancia real
                    cliente_pos = (lat_cliente, lon_cliente)
                    nap_pos = (lat_nap, lon_nap)
                    distancia_real = geodesic(cliente_pos, nap_pos).meters
                    
                    print(f"   📏 Distancia REAL: {distancia_real:.1f}m")
                    print(f"   📏 Distancia Excel: {caso['distancia_excel']}m")
                    
                    if isinstance(caso['distancia_excel'], (int, float)):
                        diferencia = abs(distancia_real - caso['distancia_excel'])
                        print(f"   ⚠️  ERROR: {diferencia:.1f}m de diferencia")
                        
                        if diferencia > 50:
                            print(f"   🚨 ERROR CRÍTICO: Distancia completamente incorrecta")
                    
                    # Verificar si está dentro del radio de 150m
                    if distancia_real <= 150:
                        print(f"   ✅ Está dentro del radio de 150m")
                    else:
                        print(f"   ❌ FUERA del radio: {distancia_real:.1f}m > 150m")
                        print(f"   🚨 Esta NAP NO debería aparecer como cercana")
                    
                else:
                    print(f"   ❌ No se pudo geocodificar la NAP")
            else:
                print(f"   ❌ No se pudo geocodificar el cliente")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")

def analizar_patron_error():
    """Analiza el patrón de errores en el Excel generado"""
    print(f"\n🔍 ANÁLISIS DEL PATRÓN DE ERROR")
    print("="*50)
    
    try:
        # Buscar el Excel corregido más reciente
        import glob
        archivos = glob.glob("clientes_ZONA2_CORREGIDO_*.xlsx")
        
        if not archivos:
            print("❌ No se encontró el Excel corregido")
            return
        
        archivo = max(archivos)
        print(f"📂 Analizando: {archivo}")
        
        df = pd.read_excel(archivo)
        
        # Contar NAPs más frecuentes
        naps_frecuentes = df[df['NAP Más Cercana'] != 'Error al geolocalizar']['NAP Más Cercana'].value_counts()
        
        print(f"\n📊 NAPs más asignadas:")
        for nap, count in naps_frecuentes.head(10).items():
            print(f"   {nap}: {count} clientes")
        
        # Buscar casos con distancias sospechosas
        df_con_nap = df[~df['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])]
        
        # Distancias muy pequeñas (sospechosas)
        distancias_pequenas = df_con_nap[df_con_nap['Distancia (metros)'] < 10]
        print(f"\n🚨 Casos con distancias < 10m (SOSPECHOSOS): {len(distancias_pequenas)}")
        
        if len(distancias_pequenas) > 0:
            print("   Ejemplos:")
            for _, caso in distancias_pequenas.head(5).iterrows():
                print(f"   - {caso['Dirección del Cliente']} → {caso['NAP Más Cercana']} ({caso['Distancia (metros)']}m)")
        
        # Casos donde la misma NAP aparece con la misma distancia (copia-pega)
        duplicados = df_con_nap.groupby(['NAP Más Cercana', 'Distancia (metros)']).size()
        duplicados_sospechosos = duplicados[duplicados > 5]  # Más de 5 veces la misma distancia
        
        print(f"\n🚨 NAPs con misma distancia repetida (SOSPECHOSO): {len(duplicados_sospechosos)}")
        for (nap, distancia), count in duplicados_sospechosos.head(5).items():
            print(f"   - {nap}: {count} clientes con exactamente {distancia}m")
        
    except Exception as e:
        print(f"❌ Error analizando Excel: {e}")

def main():
    print("🚨 DIAGNÓSTICO COMPLETO DE ERRORES DE DISTANCIA")
    print("="*70)
    
    # Analizar casos específicos mencionados
    analizar_casos_problematicos()
    
    # Analizar patrones en el Excel
    analizar_patron_error()
    
    print(f"\n🔧 PRÓXIMOS PASOS:")
    print(f"   1. Identificar el bug específico en el algoritmo")
    print(f"   2. Corregir la lógica de cálculo de distancias")
    print(f"   3. Re-procesar ZONA 2 con algoritmo corregido")
    print(f"   4. Verificar casos específicos antes de continuar")

if __name__ == "__main__":
    main()
