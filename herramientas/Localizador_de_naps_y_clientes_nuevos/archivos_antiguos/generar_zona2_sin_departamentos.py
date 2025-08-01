#!/usr/bin/env python3
"""
Script final corregido para procesar ZONA 2 - SIN números de departamento en geocodificación
"""

import pandas as pd
import json
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import re
from datetime import datetime

def limpiar_direccion_para_geocoding(direccion):
    """
    Limpia dirección para geocodificación REMOVIENDO números de departamento
    Solo mantiene calle + número principal
    """
    if not direccion:
        return None
        
    direccion_str = str(direccion).strip()
    direccion_lower = direccion_str.lower()
    
    # Separar número pegado a "TANDIL"
    direccion_lower = re.sub(r'(\d+)tandil', r'\1', direccion_lower)
    
    # REMOVER COMPLETAMENTE referencias a departamentos/pisos/unidades
    # Patrones que eliminan todo después de números de departamento
    direccion_lower = re.sub(r'\s*-\s*d?to?\.?\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*dpto\.?\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*departamento\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*depto\.?\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*casa\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*piso\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*ph.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*local\s*\d+.*$', '', direccion_lower)
    direccion_lower = re.sub(r'\s*-\s*oficina\s*\d+.*$', '', direccion_lower)
    
    # Remover palabras problemáticas que queden
    palabras_remover = [
        r'\bdpto\b', r'\bdto\b', r'\bdepartamento\b', r'\bdepto\b',
        r'\bcasa\b', r'\bpiso\b', r'\bph\b', r'\blocal\b', r'\boficina\b'
    ]
    
    for palabra in palabras_remover:
        direccion_lower = re.sub(palabra, '', direccion_lower)
    
    # Limpiar espacios múltiples y caracteres especiales
    direccion_lower = re.sub(r'\s+', ' ', direccion_lower).strip()
    direccion_lower = re.sub(r'[^\w\s]', '', direccion_lower).strip()
    
    if len(direccion_lower) < 3:
        return None
    
    direccion_limpia = ' '.join(word.capitalize() for word in direccion_lower.split())
    return direccion_limpia

def cargar_cache(archivo_cache):
    """Carga cache de geocodificación"""
    try:
        with open(archivo_cache, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def guardar_cache(cache, archivo_cache):
    """Guarda cache de geocodificación"""
    with open(archivo_cache, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def geocodificar_direccion(direccion, geolocator, cache, archivo_cache):
    """Geocodifica una dirección usando cache"""
    
    direccion_limpia = limpiar_direccion_para_geocoding(direccion)
    if not direccion_limpia:
        return None, None
    
    # Usar la dirección limpia como clave de cache
    cache_key = direccion_limpia.lower()
    
    if cache_key in cache:
        coords = cache[cache_key]
        if coords is not None:
            return coords['lat'], coords['lon']
        else:
            return None, None
    
    # Geocodificar con formato completo
    direccion_completa = f"{direccion_limpia}, Tandil, Buenos Aires, Argentina"
    
    try:
        location = geolocator.geocode(direccion_completa)
        time.sleep(1.1)  # Rate limiting
        
        if location:
            cache[cache_key] = {
                'lat': location.latitude,
                'lon': location.longitude,
                'direccion_original': direccion,
                'direccion_limpia': direccion_limpia,
                'direccion_completa': direccion_completa,
                'address_found': location.address
            }
            guardar_cache(cache, archivo_cache)
            return location.latitude, location.longitude
        else:
            cache[cache_key] = None
            guardar_cache(cache, archivo_cache)
            return None, None
            
    except Exception as e:
        print(f"Error geocodificando {direccion_completa}: {e}")
        return None, None

def encontrar_nap_mas_cercana_individual(cliente_lat, cliente_lon, naps_disponibles):
    """
    Encuentra la NAP más cercana para un cliente específico
    """
    nap_mas_cercana = None
    distancia_minima = float('inf')
    
    for _, nap in naps_disponibles.iterrows():
        try:
            nap_lat = float(nap['Latitud'])
            nap_lon = float(nap['Longitud'])
            
            distancia = geodesic((cliente_lat, cliente_lon), (nap_lat, nap_lon)).meters
            
            if distancia <= 150 and distancia < distancia_minima:
                distancia_minima = distancia
                nap_mas_cercana = {
                    'nombre_nap': nap['nombre_nap'],
                    'direccion_nap': nap['direccion'],
                    'latitud_nap': nap_lat,
                    'longitud_nap': nap_lon,
                    'distancia_metros': round(distancia, 1),
                    'ocupacion_actual': nap['ocupacion_actual'],
                    'ocupacion_porcentaje': nap['ocupacion_porcentaje']
                }
        except (ValueError, TypeError):
            continue
    
    return nap_mas_cercana

def procesar_clientes_zona2():
    """Procesa todos los clientes de ZONA 2 individualmente"""
    
    print("🚀 PROCESANDO ZONA 2 - VERSIÓN CORREGIDA SIN DEPARTAMENTOS")
    print("="*70)
    
    # Configuración
    archivo_cache = "cache_geocoding_zona2_sin_deptos.json"
    geolocator = Nominatim(user_agent="usittel_zona2_sin_deptos", timeout=10)
    cache = cargar_cache(archivo_cache)
    
    # Cargar datos
    print("📊 Cargando datos...")
    # Usar el archivo ya procesado de ZONA 2
    zona2_clientes = pd.read_excel("clientes_ZONA2_FINAL_CORREGIDO_20250801_0136.xlsx")
    # Renombrar columnas para compatibilidad
    zona2_clientes = zona2_clientes.rename(columns={
        'Dirección del Cliente': 'DIRECCION INSTALACION',
        'Nombre del Cliente': 'NUMERO_CLIENTE',
        'Zona': 'ZONA'
    })
    naps = pd.read_excel("../Localizador_de_naps/naps.xlsx")
    
    # Calcular porcentaje de ocupación de NAPs
    naps['puertos_totales'] = naps['puertos_utilizados'] + naps['puertos_disponibles']
    naps['ocupacion_porcentaje'] = (naps['puertos_utilizados'] / naps['puertos_totales'] * 100).round(1)
    naps['ocupacion_actual'] = naps['puertos_utilizados']
    
    print(f"   ✅ {len(zona2_clientes)} clientes en ZONA 2")
    
    # Filtrar NAPs disponibles (≤30% ocupación)
    naps_disponibles = naps[naps['ocupacion_porcentaje'] <= 30].copy()
    print(f"   ✅ {len(naps_disponibles)} NAPs disponibles (≤30% ocupación)")
    
    # Procesar cada cliente individualmente
    resultados = []
    clientes_con_nap = 0
    clientes_sin_nap = 0
    casos_sospechosos = []
    
    print(f"\n🔄 Procesando {len(zona2_clientes)} clientes...")
    
    for idx, (_, cliente) in enumerate(zona2_clientes.iterrows()):
        if idx % 50 == 0:
            print(f"   Procesado: {idx}/{len(zona2_clientes)} clientes...")
        
        direccion_cliente = cliente['DIRECCION INSTALACION']
        
        # Geocodificar cliente
        cliente_lat, cliente_lon = geocodificar_direccion(
            direccion_cliente, geolocator, cache, archivo_cache
        )
        
        if cliente_lat is None or cliente_lon is None:
            clientes_sin_nap += 1
            continue
        
        # Buscar NAP más cercana
        nap_cercana = encontrar_nap_mas_cercana_individual(
            cliente_lat, cliente_lon, naps_disponibles
        )
        
        if nap_cercana:
            clientes_con_nap += 1
            
            # Detectar casos sospechosos (distancias muy pequeñas)
            if nap_cercana['distancia_metros'] < 10:
                casos_sospechosos.append({
                    'direccion_cliente': direccion_cliente,
                    'nap': nap_cercana['nombre_nap'],
                    'distancia': nap_cercana['distancia_metros']
                })
            
            resultado = {
                'direccion_cliente': direccion_cliente,
                'latitud_cliente': cliente_lat,
                'longitud_cliente': cliente_lon,
                'nap_asignada': nap_cercana['nombre_nap'],
                'direccion_nap': nap_cercana['direccion_nap'],
                'latitud_nap': nap_cercana['latitud_nap'],
                'longitud_nap': nap_cercana['longitud_nap'],
                'distancia_metros': nap_cercana['distancia_metros'],
                'ocupacion_nap': nap_cercana['ocupacion_porcentaje']
            }
            
            # Agregar datos del cliente
            for col in ['NUMERO_CLIENTE', 'TIPO_CLIENTE', 'ZONA']:
                if col in cliente.index:
                    resultado[col.lower()] = cliente[col]
            
            resultados.append(resultado)
        else:
            clientes_sin_nap += 1
    
    # Crear DataFrame y guardar Excel
    if resultados:
        df_resultados = pd.DataFrame(resultados)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        archivo_excel = f"zona2_sin_deptos_{timestamp}.xlsx"
        df_resultados.to_excel(archivo_excel, index=False)
        
        print(f"\n📊 RESULTADOS FINALES:")
        print(f"   ✅ Clientes con NAP asignada: {clientes_con_nap}")
        print(f"   ❌ Clientes sin NAP disponible: {clientes_sin_nap}")
        print(f"   📄 Archivo generado: {archivo_excel}")
        
        # Reportar casos sospechosos
        if casos_sospechosos:
            print(f"\n⚠️  CASOS SOSPECHOSOS (distancia < 10m): {len(casos_sospechosos)}")
            for caso in casos_sospechosos[:5]:  # Mostrar solo primeros 5
                print(f"   🔍 {caso['direccion_cliente']} → {caso['nap']} ({caso['distancia']}m)")
            if len(casos_sospechosos) > 5:
                print(f"   ... y {len(casos_sospechosos)-5} casos más")
        else:
            print(f"\n✅ No se detectaron casos sospechosos")
    else:
        print(f"\n❌ No se pudo procesar ningún cliente")

def main():
    procesar_clientes_zona2()

if __name__ == "__main__":
    main()
