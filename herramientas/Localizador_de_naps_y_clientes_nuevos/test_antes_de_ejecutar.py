#!/usr/bin/env python3
"""
Script de PRUEBA para verificar funcionamiento antes de procesar todos los clientes
"""

import pandas as pd
import numpy as np
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import json
import os
import re
from datetime import datetime

# Configuración
RADIO_BUSQUEDA = 150  # metros
OCUPACION_MAXIMA = 30  # porcentaje máximo de ocupación de NAPs

def test_carga_datos():
    """Prueba la carga de datos"""
    print("🧪 PROBANDO CARGA DE DATOS...")
    
    # Probar carga de clientes
    archivo = "base de datos copia.xlsx"
    
    # ZONA 1
    zona1 = pd.read_excel(archivo, sheet_name='ZONA 1')
    zona1_clean = zona1[
        zona1['DIRECCIÓN'].notna() & 
        (zona1['DIRECCIÓN'].str.strip() != '') &
        zona1['ESTADO'].notna()
    ].copy()
    zona1_clean['ZONA'] = 'ZONA 1'
    zona1_clean['NOMBRE_COMPLETO'] = zona1_clean['Unnamed: 1'].fillna('Sin nombre')
    zona1_clean = zona1_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
    
    # ZONA 2  
    zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
    zona2_clean = zona2[
        zona2['DIRECCIÓN'].notna() & 
        (zona2['DIRECCIÓN'].str.strip() != '') &
        zona2['ESTADO'].notna()
    ].copy()
    zona2_clean['ZONA'] = 'ZONA 2'
    zona2_clean['NOMBRE_COMPLETO'] = zona2_clean['NOMBRE COMPLETO'].fillna('Sin nombre')
    zona2_clean = zona2_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
    
    # Unir
    clientes_todos = pd.concat([zona1_clean, zona2_clean], ignore_index=True)
    
    # Filtrar NO contrataron
    mask_no_contrato = clientes_todos['ESTADO'].str.contains('NO', case=False, na=False)
    clientes_filtrados = clientes_todos[mask_no_contrato].copy()
    
    print(f"✅ ZONA 1 limpia: {len(zona1_clean)}")
    print(f"✅ ZONA 2 limpia: {len(zona2_clean)}")
    print(f"✅ Total unidos: {len(clientes_todos)}")
    print(f"✅ Filtrados (NO contrataron): {len(clientes_filtrados)}")
    print(f"✅ Distribución por zona:")
    print(clientes_filtrados['ZONA'].value_counts())
    
    # Mostrar ejemplos de direcciones por zona
    print(f"\n📍 Ejemplos ZONA 1:")
    print(clientes_filtrados[clientes_filtrados['ZONA'] == 'ZONA 1']['DIRECCIÓN'].head().tolist())
    
    print(f"\n📍 Ejemplos ZONA 2:")
    print(clientes_filtrados[clientes_filtrados['ZONA'] == 'ZONA 2']['DIRECCIÓN'].head().tolist())
    
    # Probar carga de NAPs
    archivo_naps = "../Localizador_de_naps/naps.xlsx"
    naps = pd.read_excel(archivo_naps)
    naps['total_puertos'] = naps['puertos_utilizados'] + naps['puertos_disponibles']
    naps['porcentaje_ocupacion'] = (naps['puertos_utilizados'] / naps['total_puertos']) * 100
    naps_disponibles = naps[naps['porcentaje_ocupacion'] <= OCUPACION_MAXIMA].copy()
    
    print(f"\n✅ NAPs totales: {len(naps)}")
    print(f"✅ NAPs disponibles (≤{OCUPACION_MAXIMA}%): {len(naps_disponibles)}")
    
    return clientes_filtrados, naps_disponibles

def test_limpieza_direcciones():
    """Prueba la limpieza de direcciones"""
    print("\n🧪 PROBANDO LIMPIEZA DE DIRECCIONES...")
    
    def limpiar_direccion_para_geocoding(direccion):
        if not direccion or pd.isna(direccion):
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
    
    # Ejemplos de prueba
    direcciones_test = [
        "ALSINA 405TANDIL",
        "Mitre 123 dpto 4",
        "San Martin 456 casa",
        "9 de Julio 789 piso 2",
        "Belgrano 321 ph",
        "Saavedra 654 local 3"
    ]
    
    print("Ejemplos de limpieza:")
    for dir_original in direcciones_test:
        dir_limpia = limpiar_direccion_para_geocoding(dir_original)
        print(f"  ORIGINAL: '{dir_original}'")
        print(f"  LIMPIA:   '{dir_limpia}'")
        print(f"  GEOCODING: '{dir_limpia}, Tandil, Buenos Aires, Argentina'")
        print()

def test_geocoding_muestra():
    """Prueba geocodificación con una muestra pequeña"""
    print("\n🧪 PROBANDO GEOCODIFICACIÓN (5 direcciones)...")
    
    geolocator = Nominatim(user_agent="usittel_test", timeout=10)
    
    direcciones_test = [
        "Alsina 405",
        "Mitre 123", 
        "San Martin 456",
        "9 De Julio 789",
        "Belgrano 321"
    ]
    
    for direccion in direcciones_test:
        try:
            formato = f"{direccion}, Tandil, Buenos Aires, Argentina"
            print(f"🌍 Geocodificando: {formato}")
            
            location = geolocator.geocode(formato)
            
            if location:
                print(f"  ✅ Éxito: {location.latitude}, {location.longitude}")
            else:
                print(f"  ❌ No encontrada")
                
            time.sleep(1.1)  # Rate limit
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
def main():
    """Función principal de pruebas"""
    print("🧪 INICIANDO PRUEBAS ANTES DEL PROCESAMIENTO COMPLETO")
    print("="*60)
    
    # 1. Probar carga de datos
    clientes, naps = test_carga_datos()
    
    # 2. Probar limpieza de direcciones
    test_limpieza_direcciones()
    
    # 3. Probar geocodificación
    respuesta = input("\n¿Probar geocodificación? (s/n): ").lower()
    if respuesta == 's':
        test_geocoding_muestra()
    
    print(f"\n✅ PRUEBAS COMPLETADAS")
    print(f"📊 Clientes a procesar: {len(clientes)}")
    print(f"📊 NAPs disponibles: {len(naps)}")
    print(f"\n🚀 Todo listo para ejecutar el script completo!")

if __name__ == "__main__":
    main()
