#!/usr/bin/env python3
"""
Script para análisis completo de errores de distancia en ZONA 2
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time

def analizar_casos_especificos():
    """Analiza casos específicos mencionados por el usuario"""
    
    geolocator = Nominatim(user_agent="analisis_errores_distancia", timeout=10)
    
    # Casos problemáticos reportados
    casos_problematicos = [
        {
            'cliente': 'ALSINA 1274',
            'nap': 'ALSINA 454TANDIL',
            'distancia_excel': 8.5,
            'descripcion': 'Diferencia de 820 números - imposible 8.5m'
        },
        {
            'cliente': 'ALSINA 956',
            'nap': 'ALSINA 454TANDIL', 
            'distancia_excel': 8.5,
            'descripcion': 'Diferencia de 502 números - imposible 8.5m'
        },
        {
            'cliente': 'ALSINA 997',
            'nap': 'ALSINA 454TANDIL',
            'distancia_excel': 8.5,
            'descripcion': 'Diferencia de 543 números - imposible 8.5m'
        },
        {
            'cliente': 'ALSINA 1518',
            'nap': '4 de abril 1518TANDIL',
            'distancia_excel': 1.9,
            'descripcion': 'ALSINA vs 4 de ABRIL - calles diferentes, revisar si 1.9m es real'
        },
        {
            'cliente': 'ARANA 1072',
            'nap': 'Arana y Roca Tandil',
            'distancia_excel': None,
            'descripcion': 'Mismo nombre de calle pero intersección'
        }
    ]
    
    print("🔍 ANÁLISIS DETALLADO DE CASOS PROBLEMÁTICOS")
    print("="*60)
    
    for i, caso in enumerate(casos_problematicos, 1):
        print(f"\n{i}. {caso['descripcion']}")
        print(f"   Cliente: {caso['cliente']}")
        print(f"   NAP: {caso['nap']}")
        print(f"   Distancia en Excel: {caso['distancia_excel']}m")
        print("   " + "-"*50)
        
        # Geocodificar dirección del cliente
        direccion_cliente = f"{caso['cliente']}, Tandil, Buenos Aires, Argentina"
        print(f"   🌍 Geocodificando cliente: {direccion_cliente}")
        
        try:
            location_cliente = geolocator.geocode(direccion_cliente)
            time.sleep(1.5)
            
            if location_cliente:
                lat_cliente = location_cliente.latitude
                lon_cliente = location_cliente.longitude
                print(f"   ✅ Cliente: {lat_cliente}, {lon_cliente}")
            else:
                print(f"   ❌ No se pudo geocodificar cliente")
                continue
        except Exception as e:
            print(f"   ❌ Error geocodificando cliente: {e}")
            continue
        
        # Geocodificar dirección de la NAP
        # Limpiar dirección de NAP
        direccion_nap_limpia = caso['nap'].replace('TANDIL', '').strip()
        direccion_nap = f"{direccion_nap_limpia}, Tandil, Buenos Aires, Argentina"
        print(f"   🌍 Geocodificando NAP: {direccion_nap}")
        
        try:
            location_nap = geolocator.geocode(direccion_nap)
            time.sleep(1.5)
            
            if location_nap:
                lat_nap = location_nap.latitude
                lon_nap = location_nap.longitude
                print(f"   ✅ NAP: {lat_nap}, {lon_nap}")
            else:
                print(f"   ❌ No se pudo geocodificar NAP")
                continue
        except Exception as e:
            print(f"   ❌ Error geocodificando NAP: {e}")
            continue
        
        # Calcular distancia real
        cliente_pos = (lat_cliente, lon_cliente)
        nap_pos = (lat_nap, lon_nap)
        distancia_real = geodesic(cliente_pos, nap_pos).meters
        
        print(f"   📏 Distancia real calculada: {distancia_real:.1f}m")
        
        if caso['distancia_excel']:
            diferencia = abs(distancia_real - caso['distancia_excel'])
            print(f"   ⚡ Diferencia con Excel: {diferencia:.1f}m")
            
            if diferencia > 50:
                print(f"   🚨 ERROR GRAVE: Diferencia > 50m")
            elif diferencia > 10:
                print(f"   ⚠️  Error moderado: Diferencia > 10m")
            else:
                print(f"   ✅ Distancia aceptable")
        
        print()

def analizar_excel_zona2():
    """Analiza el Excel de ZONA 2 para encontrar patrones de error"""
    
    try:
        import glob
        archivos_zona2 = glob.glob("clientes_ZONA2_*.xlsx")
        
        if not archivos_zona2:
            print("❌ No se encontraron archivos Excel de ZONA 2")
            return
        
        # Usar el más reciente
        archivo_reciente = max(archivos_zona2)
        print(f"\n📂 Analizando Excel: {archivo_reciente}")
        
        df = pd.read_excel(archivo_reciente)
        
        # Analizar casos con NAPs cercanas
        con_naps = df[~df['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])].copy()
        
        print(f"\n📊 ESTADÍSTICAS DEL EXCEL:")
        print(f"   Total clientes: {len(df)}")
        print(f"   Con NAPs: {len(con_naps)}")
        
        if len(con_naps) > 0:
            # Analizar distancias
            distancias_numericas = pd.to_numeric(con_naps['Distancia (metros)'], errors='coerce')
            distancias_validas = distancias_numericas.dropna()
            
            print(f"\n📏 ANÁLISIS DE DISTANCIAS:")
            print(f"   Distancia mínima: {distancias_validas.min():.1f}m")
            print(f"   Distancia máxima: {distancias_validas.max():.1f}m")
            print(f"   Distancia promedio: {distancias_validas.mean():.1f}m")
            print(f"   Distancia mediana: {distancias_validas.median():.1f}m")
            
            # Buscar casos sospechosos
            casos_muy_cerca = distancias_validas[distancias_validas < 5]
            casos_muy_lejos = distancias_validas[distancias_validas > 140]
            
            print(f"\n🚨 CASOS SOSPECHOSOS:")
            print(f"   Distancias < 5m: {len(casos_muy_cerca)} casos")
            print(f"   Distancias > 140m: {len(casos_muy_lejos)} casos")
            
            if len(casos_muy_cerca) > 0:
                print(f"\n   Distancias más pequeñas encontradas:")
                casos_pequenos = con_naps[distancias_numericas < 5]
                for _, caso in casos_pequenos.head(5).iterrows():
                    print(f"     - {caso['Dirección del Cliente']} → {caso['Dirección de la NAP']}: {caso['Distancia (metros)']}m")
            
            # Buscar patrones repetitivos 
            valores_repetidos = distancias_validas.value_counts()
            valores_muy_repetidos = valores_repetidos[valores_repetidos > 5]
            
            if len(valores_muy_repetidos) > 0:
                print(f"\n🔄 VALORES DE DISTANCIA MUY REPETIDOS:")
                for distancia, cantidad in valores_muy_repetidos.head().items():
                    print(f"     {distancia}m aparece {cantidad} veces")
                    
                    # Mostrar algunos casos de la distancia más repetida
                    distancia_mas_repetida = valores_muy_repetidos.index[0]
                    casos_repetidos = con_naps[distancias_numericas == distancia_mas_repetida]
                    print(f"\n   Ejemplos de casos con {distancia_mas_repetida}m:")
                    for _, caso in casos_repetidos.head(3).iterrows():
                        print(f"     - {caso['Dirección del Cliente']} → {caso['NAP Más Cercana']}")
        
    except Exception as e:
        print(f"❌ Error analizando Excel: {e}")

def main():
    print("🔍 ANÁLISIS COMPLETO DE ERRORES DE DISTANCIA")
    print("="*60)
    
    # 1. Analizar casos específicos reportados
    analizar_casos_especificos()
    
    # 2. Analizar patrones en el Excel
    analizar_excel_zona2()
    
    print("\n🎯 CONCLUSIONES Y RECOMENDACIONES:")
    print("="*40)
    print("1. Si hay diferencias > 50m: Error en el algoritmo")
    print("2. Si distancias se repiten mucho: Error de indexación") 
    print("3. Si distancias < 5m son comunes: Error de coordenadas")
    print("4. Si patrones son consistentes: Error sistemático")

if __name__ == "__main__":
    main()
