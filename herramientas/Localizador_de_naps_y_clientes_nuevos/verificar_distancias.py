#!/usr/bin/env python3
"""
Script para verificar distancias específicas y validar que el cálculo esté correcto
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time

def verificar_caso_especifico():
    """Verifica el caso específico: ALSINA 1085 vs ALSINA 454"""
    
    geolocator = Nominatim(user_agent="verificacion_distancias", timeout=10)
    
    # Direcciones a verificar
    direccion_cliente = "ALSINA 1085, Tandil, Buenos Aires, Argentina"
    direccion_nap = "ALSINA 454, Tandil, Buenos Aires, Argentina"
    
    print("🔍 VERIFICACIÓN DE DISTANCIAS")
    print("="*50)
    print(f"Cliente: ALSINA 1085 - DTO. 2")
    print(f"NAP: ALSINA 454TANDIL")
    print()
    
    # Geocodificar dirección del cliente
    print("🌍 Geocodificando dirección del cliente...")
    print(f"Buscando: {direccion_cliente}")
    location_cliente = geolocator.geocode(direccion_cliente)
    time.sleep(1.5)
    
    if location_cliente:
        lat_cliente = location_cliente.latitude
        lon_cliente = location_cliente.longitude
        print(f"✅ Cliente encontrado: {lat_cliente}, {lon_cliente}")
        print(f"   Dirección completa: {location_cliente.address}")
    else:
        print("❌ No se pudo geocodificar dirección del cliente")
        return
    
    print()
    
    # Geocodificar dirección de la NAP
    print("🌍 Geocodificando dirección de la NAP...")
    print(f"Buscando: {direccion_nap}")
    location_nap = geolocator.geocode(direccion_nap)
    time.sleep(1.5)
    
    if location_nap:
        lat_nap = location_nap.latitude
        lon_nap = location_nap.longitude
        print(f"✅ NAP encontrada: {lat_nap}, {lon_nap}")
        print(f"   Dirección completa: {location_nap.address}")
    else:
        print("❌ No se pudo geocodificar dirección de la NAP")
        return
    
    print()
    
    # Calcular distancia
    print("📏 Calculando distancia...")
    cliente_pos = (lat_cliente, lon_cliente)
    nap_pos = (lat_nap, lon_nap)
    
    distancia_metros = geodesic(cliente_pos, nap_pos).meters
    distancia_km = geodesic(cliente_pos, nap_pos).kilometers
    
    print(f"📊 RESULTADO:")
    print(f"   Distancia: {distancia_metros:.1f} metros")
    print(f"   Distancia: {distancia_km:.3f} kilómetros")
    
    # Análisis
    print()
    print("🔍 ANÁLISIS:")
    diferencia_numeros = abs(1085 - 454)
    print(f"   Diferencia en numeración: {diferencia_numeros} números")
    
    if distancia_metros < 50:
        print("⚠️  ADVERTENCIA: Distancia muy corta para esa diferencia de numeración")
    elif distancia_metros > 500:
        print("✅ Distancia coherente con la diferencia de numeración")
    else:
        print("🤔 Distancia moderada - revisar si es coherente")
    
    return distancia_metros

def verificar_excel_zona2():
    """Carga el Excel de ZONA 2 y verifica algunos casos"""
    try:
        # Buscar el archivo Excel generado
        import glob
        archivos_zona2 = glob.glob("clientes_ZONA2_completa_*.xlsx")
        
        if not archivos_zona2:
            print("❌ No se encontró el Excel de ZONA 2")
            return
        
        archivo_mas_reciente = max(archivos_zona2)
        print(f"📂 Cargando Excel: {archivo_mas_reciente}")
        
        df = pd.read_excel(archivo_mas_reciente)
        
        # Buscar el caso específico
        caso_especifico = df[df['Nombre del Cliente'].str.contains('MILANESI', case=False, na=False)]
        
        if len(caso_especifico) > 0:
            cliente = caso_especifico.iloc[0]
            print()
            print("📊 CASO ENCONTRADO EN EXCEL:")
            print(f"   Nombre: {cliente['Nombre del Cliente']}")
            print(f"   Dirección: {cliente['Dirección del Cliente']}")
            print(f"   NAP: {cliente['NAP Más Cercana']}")
            print(f"   Distancia en Excel: {cliente['Distancia (metros)']} metros")
            
            return cliente['Distancia (metros)']
        else:
            print("❌ No se encontró el caso específico en el Excel")
            return None
            
    except Exception as e:
        print(f"❌ Error cargando Excel: {e}")
        return None

def main():
    print("🔍 VERIFICACIÓN DE DISTANCIAS - ZONA 2")
    print("="*60)
    
    # 1. Verificar caso específico manualmente
    print("\n1️⃣ VERIFICACIÓN MANUAL:")
    distancia_manual = verificar_caso_especifico()
    
    # 2. Verificar en Excel generado
    print("\n2️⃣ VERIFICACIÓN EN EXCEL:")
    distancia_excel = verificar_excel_zona2()
    
    # 3. Comparar resultados
    print("\n3️⃣ COMPARACIÓN DE RESULTADOS:")
    if distancia_manual and distancia_excel:
        print(f"   Distancia manual: {distancia_manual:.1f} metros")
        print(f"   Distancia en Excel: {distancia_excel} metros")
        
        diferencia = abs(distancia_manual - float(distancia_excel))
        print(f"   Diferencia: {diferencia:.1f} metros")
        
        if diferencia < 1:
            print("✅ Los cálculos coinciden - distancia correcta")
        else:
            print("⚠️  Hay diferencia en los cálculos - revisar")
    
    # 4. Recomendación
    print("\n4️⃣ RECOMENDACIÓN:")
    if distancia_manual and distancia_manual > 300:
        print("✅ La distancia parece correcta para esa diferencia de direcciones")
        print("✅ El algoritmo de geocodificación y cálculo funciona bien")
        print("✅ Se puede proceder con ZONA 1")
    else:
        print("⚠️  Revisar el algoritmo de cálculo de distancias")
        print("⚠️  Posible error en geocodificación o cálculo")

if __name__ == "__main__":
    main()
