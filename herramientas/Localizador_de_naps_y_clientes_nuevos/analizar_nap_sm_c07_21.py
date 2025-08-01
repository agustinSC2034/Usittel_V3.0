#!/usr/bin/env python3
"""
Script para verificar las coordenadas de la NAP SM-C07-21 específicamente
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time

def verificar_nap_especifica():
    """Verifica las coordenadas de la NAP SM-C07-21"""
    
    # Cargar NAPs
    naps = pd.read_excel("../Localizador_de_naps/naps.xlsx")
    
    # Buscar la NAP específica
    nap_especifica = naps[naps['nombre_nap'] == 'SM-C07-21']
    
    if len(nap_especifica) == 0:
        print("❌ No se encontró la NAP SM-C07-21")
        return
    
    nap = nap_especifica.iloc[0]
    
    print("🔍 INFORMACIÓN DE LA NAP SM-C07-21")
    print("="*50)
    print(f"📍 Nombre: {nap['nombre_nap']}")
    print(f"📍 Dirección: {nap['direccion']}")
    print(f"📍 Latitud: {nap['Latitud']}")
    print(f"📍 Longitud: {nap['Longitud']}")
    print(f"📍 Puertos utilizados: {nap['puertos_utilizados']}")
    print(f"📍 Puertos disponibles: {nap['puertos_disponibles']}")
    
    # Calcular ocupación
    total_puertos = nap['puertos_utilizados'] + nap['puertos_disponibles']
    ocupacion = (nap['puertos_utilizados'] / total_puertos) * 100
    print(f"📍 Ocupación: {ocupacion:.1f}%")
    
    # Coordenadas del cliente ya conocidas
    lat_cliente = -37.3171981
    lon_cliente = -59.1310234
    
    lat_nap = nap['Latitud']
    lon_nap = nap['Longitud']
    
    # Calcular distancia real
    cliente_pos = (lat_cliente, lon_cliente)
    nap_pos = (lat_nap, lon_nap)
    
    distancia_real = geodesic(cliente_pos, nap_pos).meters
    
    print()
    print("📏 CÁLCULO DE DISTANCIA REAL:")
    print(f"   Cliente (ALSINA 1085): {lat_cliente}, {lon_cliente}")
    print(f"   NAP SM-C07-21: {lat_nap}, {lon_nap}")
    print(f"   Distancia real: {distancia_real:.1f} metros")
    
    # Verificar si la NAP cumple criterios
    print()
    print("✅ VERIFICACIÓN DE CRITERIOS:")
    print(f"   ¿Ocupación ≤ 30%? {ocupacion <= 30} ({ocupacion:.1f}%)")
    print(f"   ¿Distancia ≤ 150m? {distancia_real <= 150} ({distancia_real:.1f}m)")
    
    if distancia_real <= 150:
        print("✅ Esta NAP SÍ debería aparecer como cercana")
    else:
        print("❌ Esta NAP NO debería aparecer como cercana")
        print("❌ Hay un error en la lógica del algoritmo")

def buscar_nap_mas_cercana_real():
    """Busca cuál es realmente la NAP más cercana a ALSINA 1085"""
    
    # Cargar todas las NAPs
    naps = pd.read_excel("../Localizador_de_naps/naps.xlsx")
    
    # Calcular ocupación
    naps['total_puertos'] = naps['puertos_utilizados'] + naps['puertos_disponibles']
    naps['porcentaje_ocupacion'] = (naps['puertos_utilizados'] / naps['total_puertos']) * 100
    
    # Filtrar NAPs con ocupación ≤ 30%
    naps_disponibles = naps[naps['porcentaje_ocupacion'] <= 30].copy()
    
    print()
    print("🔍 BUSCANDO NAP MÁS CERCANA REAL:")
    print("="*50)
    
    # Coordenadas del cliente
    lat_cliente = -37.3171981
    lon_cliente = -59.1310234
    cliente_pos = (lat_cliente, lon_cliente)
    
    distancias = []
    
    for _, nap in naps_disponibles.iterrows():
        if pd.isna(nap['Latitud']) or pd.isna(nap['Longitud']):
            continue
            
        nap_pos = (nap['Latitud'], nap['Longitud'])
        distancia = geodesic(cliente_pos, nap_pos).meters
        
        distancias.append({
            'nombre': nap['nombre_nap'],
            'direccion': nap['direccion'],
            'distancia': distancia,
            'ocupacion': nap['porcentaje_ocupacion'],
            'puertos_disponibles': nap['puertos_disponibles']
        })
    
    # Ordenar por distancia
    distancias.sort(key=lambda x: x['distancia'])
    
    print("📊 LAS 5 NAPs MÁS CERCANAS:")
    for i, nap in enumerate(distancias[:5]):
        print(f"   {i+1}. {nap['nombre']} - {nap['distancia']:.1f}m - {nap['ocupacion']:.1f}% ocupación")
        print(f"      Dirección: {nap['direccion']}")
        print()

def main():
    print("🔍 ANÁLISIS DETALLADO DE LA NAP SM-C07-21")
    print("="*60)
    
    verificar_nap_especifica()
    buscar_nap_mas_cercana_real()

if __name__ == "__main__":
    main()
