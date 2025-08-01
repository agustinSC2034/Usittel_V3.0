#!/usr/bin/env python3
"""
Script para verificar geocodificación limpia de casos específicos
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import re

def limpiar_direccion_para_geocoding(direccion):
    """Limpia dirección SOLO para geocodificación"""
    if not direccion:
        return None
        
    direccion_str = str(direccion).strip()
    direccion_lower = direccion_str.lower()
    
    # Separar número pegado a "TANDIL"
    direccion_lower = re.sub(r'(\d+)tandil', r'\1', direccion_lower)
    
    # Remover palabras problemáticas
    palabras_remover = [
        r'\bdpto\b', r'\bdto\b', r'\bdepartamento\b', r'\bdepto\b',
        r'\bcasa\b', r'\bpiso\b', r'\bph\b', r'\blocal\b', r'\boficina\b'
    ]
    
    for palabra in palabras_remover:
        direccion_lower = re.sub(palabra, '', direccion_lower)
    
    direccion_lower = re.sub(r'\s+', ' ', direccion_lower).strip()
    direccion_lower = re.sub(r'[^\w\s]', '', direccion_lower).strip()
    
    if len(direccion_lower) < 3:
        return None
    
    direccion_limpia = ' '.join(word.capitalize() for word in direccion_lower.split())
    return direccion_limpia

def verificar_geocodificacion_limpia():
    """Verifica geocodificación SIN cache para casos específicos"""
    
    geolocator = Nominatim(user_agent="verificacion_limpia", timeout=10)
    
    casos_test = [
        "ALSINA 1085 - DTO. 2",
        "ALSINA 1274 - DPTO. 3", 
        "ALSINA 956 - DTO. 4",
        "ALSINA 1518"
    ]
    
    print("🔍 VERIFICACIÓN DE GEOCODIFICACIÓN LIMPIA (SIN CACHE)")
    print("="*70)
    
    for direccion_original in casos_test:
        print(f"\n📍 CASO: {direccion_original}")
        
        # Limpiar dirección
        direccion_limpia = limpiar_direccion_para_geocoding(direccion_original)
        print(f"   Dirección limpia: {direccion_limpia}")
        
        # Geocodificar con formato completo
        direccion_completa = f"{direccion_limpia}, Tandil, Buenos Aires, Argentina"
        print(f"   Buscando: {direccion_completa}")
        
        try:
            location = geolocator.geocode(direccion_completa)
            time.sleep(1.5)
            
            if location:
                print(f"   ✅ Encontrado: {location.latitude:.6f}, {location.longitude:.6f}")
                print(f"   📍 Dirección completa: {location.address}")
            else:
                print(f"   ❌ No encontrado")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")

def buscar_nap_especifica():
    """Busca NAP SM-C07-21 específicamente"""
    
    print(f"\n🔍 VERIFICANDO NAP SM-C07-21")
    print("="*40)
    
    try:
        naps = pd.read_excel("../Localizador_de_naps/naps.xlsx")
        nap_sm = naps[naps['nombre_nap'] == 'SM-C07-21']
        
        if len(nap_sm) > 0:
            nap = nap_sm.iloc[0]
            print(f"   📍 NAP encontrada: {nap['nombre_nap']}")
            print(f"   📍 Dirección NAP: {nap['direccion']}")
            print(f"   📍 Coordenadas NAP: {nap['Latitud']:.6f}, {nap['Longitud']:.6f}")
            
            # Geocodificar dirección de la NAP para verificar
            geolocator = Nominatim(user_agent="verificacion_nap", timeout=10)
            direccion_nap_limpia = limpiar_direccion_para_geocoding(nap['direccion'])
            direccion_nap_completa = f"{direccion_nap_limpia}, Tandil, Buenos Aires, Argentina"
            
            print(f"   🌍 Verificando geocodificación: {direccion_nap_completa}")
            location_nap = geolocator.geocode(direccion_nap_completa)
            time.sleep(1.5)
            
            if location_nap:
                print(f"   ✅ Geocodificación: {location_nap.latitude:.6f}, {location_nap.longitude:.6f}")
                
                # Comparar coordenadas
                diff_lat = abs(nap['Latitud'] - location_nap.latitude)
                diff_lon = abs(nap['Longitud'] - location_nap.longitude)
                print(f"   📊 Diferencia lat: {diff_lat:.6f}")
                print(f"   📊 Diferencia lon: {diff_lon:.6f}")
                
                if diff_lat < 0.001 and diff_lon < 0.001:
                    print(f"   ✅ Coordenadas consistentes")
                else:
                    print(f"   ⚠️  Coordenadas tienen diferencias")
            else:
                print(f"   ❌ No se pudo geocodificar dirección de NAP")
        else:
            print(f"   ❌ NAP SM-C07-21 no encontrada en archivo")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

def main():
    print("🔍 VERIFICACIÓN DE GEOCODIFICACIÓN LIMPIA")
    print("="*50)
    
    verificar_geocodificacion_limpia()
    buscar_nap_especifica()
    
    print(f"\n🔧 Si las geocodificaciones son correctas,")
    print(f"   el problema estaba en el cache contaminado.")

if __name__ == "__main__":
    main()
