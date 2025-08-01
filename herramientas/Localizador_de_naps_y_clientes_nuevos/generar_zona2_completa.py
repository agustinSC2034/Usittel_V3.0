#!/usr/bin/env python3
"""
Script para procesar SOLO la ZONA 2 completa
Una vez verificado que funciona bien, haremos la ZONA 1
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
CACHE_GEOCODING = "cache_geocoding_zona2.json"

class ProcesadorZona2:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_zona2_v1", timeout=10)
        self.cache_coords = self.cargar_cache()
        
    def cargar_cache(self):
        """Carga cache de coordenadas para evitar consultas repetidas"""
        if os.path.exists(CACHE_GEOCODING):
            try:
                with open(CACHE_GEOCODING, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def guardar_cache(self):
        """Guarda cache de coordenadas"""
        with open(CACHE_GEOCODING, 'w', encoding='utf-8') as f:
            json.dump(self.cache_coords, f, indent=2, ensure_ascii=False)
    
    def limpiar_direccion_para_geocoding(self, direccion):
        """
        Limpia dirección SOLO para geocodificación
        Conserva la dirección original para el Excel final
        """
        if not direccion or pd.isna(direccion):
            return None
            
        direccion_str = str(direccion).strip()
        
        # Convertir a minúsculas para el procesamiento
        direccion_lower = direccion_str.lower()
        
        # PROBLEMA PRINCIPAL: Separar número pegado a "TANDIL"
        # Ejemplo: "ALSINA 405TANDIL" → "ALSINA 405"
        direccion_lower = re.sub(r'(\d+)tandil', r'\1', direccion_lower)
        
        # Remover palabras que dificultan la geocodificación
        palabras_remover = [
            r'\bdpto\b', r'\bdto\b', r'\bdepartamento\b', r'\bdepto\b',
            r'\bcasa\b', r'\bpiso\b', r'\bph\b', r'\blocal\b', r'\boficina\b',
            r'\bprimer piso\b', r'\bplanta alta\b', r'\bplanta baja\b',
            r'\bfrente\b', r'\bfondo\b', r'\bcontrafrente\b'
        ]
        
        for palabra in palabras_remover:
            direccion_lower = re.sub(palabra, '', direccion_lower)
        
        # Limpiar espacios múltiples y caracteres extraños
        direccion_lower = re.sub(r'\s+', ' ', direccion_lower).strip()
        direccion_lower = re.sub(r'[^\w\s]', '', direccion_lower).strip()
        
        # Si quedó muy corta, devolver None
        if len(direccion_lower) < 3:
            return None
        
        # Capitalizar correctamente
        direccion_limpia = ' '.join(word.capitalize() for word in direccion_lower.split())
        
        return direccion_limpia
    
    def geocodificar_direccion(self, direccion_original):
        """Geocodifica una dirección usando cache si está disponible"""
        direccion_limpia = self.limpiar_direccion_para_geocoding(direccion_original)
        
        if not direccion_limpia:
            return None
        
        # Buscar en cache
        if direccion_limpia in self.cache_coords:
            coords = self.cache_coords[direccion_limpia]
            if coords and coords.get('lat') and coords.get('lon'):
                return coords
        
        # Intentar geocodificar con diferentes formatos
        formatos_busqueda = [
            f"{direccion_limpia}, Tandil, Buenos Aires, Argentina",
            f"{direccion_limpia}, Tandil, Argentina", 
            f"{direccion_limpia}, Tandil"
        ]
        
        for formato in formatos_busqueda:
            try:
                time.sleep(1.1)  # Rate limit para Nominatim
                location = self.geolocator.geocode(formato)
                
                if location:
                    coords = {'lat': location.latitude, 'lon': location.longitude}
                    self.cache_coords[direccion_limpia] = coords
                    return coords
                    
            except Exception as e:
                print(f"Error geocodificando '{formato}': {e}")
                continue
        
        # Si no se pudo geocodificar, guardar en cache como fallida
        self.cache_coords[direccion_limpia] = None
        return None
    
    def cargar_zona2_completa(self):
        """Carga SOLO los clientes de ZONA 2"""
        archivo = "base de datos copia.xlsx"
        
        print(f"📂 Cargando ZONA 2 desde: {archivo}")
        
        # Leer ZONA 2  
        zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
        print(f"📊 ZONA 2 leída: {len(zona2)} filas")
        print(f"📋 Columnas disponibles: {zona2.columns.tolist()}")
        
        # Limpiar ZONA 2
        zona2_clean = zona2[
            zona2['DIRECCIÓN'].notna() & 
            (zona2['DIRECCIÓN'].str.strip() != '') &
            zona2['ESTADO'].notna()
        ].copy()
        
        zona2_clean['ZONA'] = 'ZONA 2'
        
        # Buscar columna de nombre
        if 'NOMBRE COMPLETO' in zona2.columns:
            zona2_clean['NOMBRE_COMPLETO'] = zona2_clean['NOMBRE COMPLETO'].fillna('Sin nombre')
        elif 'NOMBRE' in zona2.columns:
            zona2_clean['NOMBRE_COMPLETO'] = zona2_clean['NOMBRE'].fillna('Sin nombre')
        else:
            zona2_clean['NOMBRE_COMPLETO'] = 'Sin nombre'
        
        zona2_clean = zona2_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
        
        # Filtrar solo los que NO contrataron (estado con "NO")
        mask_no_contrato = zona2_clean['ESTADO'].str.contains('NO', case=False, na=False)
        clientes_filtrados = zona2_clean[mask_no_contrato].copy()
        
        print(f"📊 ZONA 2 limpia: {len(zona2_clean)} clientes")
        print(f"📊 Clientes ZONA 2 que NO contrataron: {len(clientes_filtrados)}")
        print(f"📊 Estados encontrados:")
        print(clientes_filtrados['ESTADO'].value_counts().head())
        
        return clientes_filtrados
    
    def cargar_naps_disponibles(self):
        """Carga NAPs con ocupación ≤ 30%"""
        archivo_naps = "../Localizador_de_naps/naps.xlsx"
        
        print(f"📂 Cargando NAPs desde: {archivo_naps}")
        
        naps = pd.read_excel(archivo_naps)
        
        # Calcular ocupación
        naps['total_puertos'] = naps['puertos_utilizados'] + naps['puertos_disponibles']
        naps['porcentaje_ocupacion'] = (naps['puertos_utilizados'] / naps['total_puertos']) * 100
        naps['porcentaje_libre'] = 100 - naps['porcentaje_ocupacion']
        
        # Filtrar solo NAPs con baja ocupación
        naps_disponibles = naps[naps['porcentaje_ocupacion'] <= OCUPACION_MAXIMA].copy()
        
        print(f"📊 NAPs totales: {len(naps)}")
        print(f"📊 NAPs con ocupación ≤ {OCUPACION_MAXIMA}%: {len(naps_disponibles)}")
        
        return naps_disponibles
    
    def geocodificar_zona2(self, clientes):
        """Geocodifica TODOS los clientes de ZONA 2"""
        print(f"\n🌍 Iniciando geocodificación de ZONA 2: {len(clientes)} clientes...")
        
        resultados = []
        total = len(clientes)
        
        for idx, (_, cliente) in enumerate(clientes.iterrows()):
            if idx % 50 == 0:
                print(f"🌍 Progreso ZONA 2: {idx}/{total} ({idx/total*100:.1f}%)")
            
            coords = self.geocodificar_direccion(cliente['DIRECCIÓN'])
            
            resultado = {
                'indice_original': idx,
                'nombre': cliente['NOMBRE_COMPLETO'],
                'direccion_original': cliente['DIRECCIÓN'], 
                'celular': cliente['CELULAR'],
                'zona': cliente['ZONA'],
                'estado': cliente['ESTADO'],
                'lat': coords['lat'] if coords else None,
                'lon': coords['lon'] if coords else None,
                'geocodificado': coords is not None
            }
            
            resultados.append(resultado)
        
        # Guardar cache después de procesar todos
        self.guardar_cache()
        
        df_resultados = pd.DataFrame(resultados)
        
        print(f"\n📊 Geocodificación ZONA 2 completada:")
        print(f"📊 Total procesados: {len(df_resultados)}")
        print(f"📊 Exitosos: {df_resultados['geocodificado'].sum()}")
        print(f"📊 Fallidos: {(~df_resultados['geocodificado']).sum()}")
        print(f"📊 % Éxito: {df_resultados['geocodificado'].mean()*100:.1f}%")
        
        return df_resultados
    
    def encontrar_naps_cercanas(self, clientes_coords, naps):
        """Encuentra NAP más cercana para cada cliente geocodificado"""
        print(f"\n📏 Buscando NAPs cercanas para ZONA 2...")
        
        clientes_geocodificados = clientes_coords[clientes_coords['geocodificado']].copy()
        
        resultados_con_nap = []
        
        for idx, cliente in clientes_geocodificados.iterrows():
            cliente_pos = (cliente['lat'], cliente['lon'])
            
            nap_mas_cercana = None
            distancia_minima = float('inf')
            
            # CORREGIDO: Primero buscar la NAP más cercana SIN filtro de distancia
            for _, nap in naps.iterrows():
                if pd.isna(nap['Latitud']) or pd.isna(nap['Longitud']):
                    continue
                    
                nap_pos = (nap['Latitud'], nap['Longitud'])
                distancia = geodesic(cliente_pos, nap_pos).meters
                
                # Encontrar la NAP más cercana independientemente de la distancia
                if distancia < distancia_minima:
                    distancia_minima = distancia
                    nap_mas_cercana = nap
            
            # LUEGO aplicar filtro de radio: solo incluir si está dentro del radio permitido
            if nap_mas_cercana is not None and distancia_minima <= RADIO_BUSQUEDA:
                resultado = {
                    'indice_original': cliente['indice_original'],
                    'nombre': cliente['nombre'],
                    'direccion_original': cliente['direccion_original'],
                    'celular': cliente['celular'],
                    'zona': cliente['zona'],
                    'estado': cliente['estado'],
                    'nap_nombre': nap_mas_cercana['nombre_nap'],
                    'nap_direccion': nap_mas_cercana['direccion'],
                    'distancia_metros': round(distancia_minima, 1),
                    'puertos_disponibles': nap_mas_cercana['puertos_disponibles'],
                    'porcentaje_ocupacion': round(nap_mas_cercana['porcentaje_ocupacion'], 1),
                    'porcentaje_libre': round(nap_mas_cercana['porcentaje_libre'], 1)
                }
                resultados_con_nap.append(resultado)
        
        print(f"📊 Clientes ZONA 2 con NAPs cercanas (≤{RADIO_BUSQUEDA}m): {len(resultados_con_nap)}")
        
        return pd.DataFrame(resultados_con_nap)
    
    def generar_excel_zona2_completo(self, clientes_originales, clientes_coords, clientes_con_nap):
        """Genera Excel final con TODOS los clientes de ZONA 2"""
        print(f"\n📊 Generando Excel ZONA 2 con {len(clientes_originales)} clientes...")
        
        filas_excel = []
        
        for idx, cliente in clientes_originales.iterrows():
            # Buscar si tiene coordenadas
            coord_info = clientes_coords[clientes_coords['indice_original'] == idx]
            
            if len(coord_info) > 0 and coord_info.iloc[0]['geocodificado']:
                # Buscar si tiene NAP cercana
                nap_info = clientes_con_nap[clientes_con_nap['indice_original'] == idx]
                
                if len(nap_info) > 0:
                    # Tiene NAP cercana
                    nap = nap_info.iloc[0]
                    fila = {
                        'Nombre del Cliente': nap['nombre'],
                        'Dirección del Cliente': nap['direccion_original'],
                        'Celular': nap['celular'],
                        'Zona': nap['zona'],
                        'Estado Original': nap['estado'],
                        'NAP Más Cercana': nap['nap_nombre'],
                        'Dirección de la NAP': nap['nap_direccion'],
                        'Distancia (metros)': nap['distancia_metros'],
                        'Puertos Disponibles': nap['puertos_disponibles'],
                        'Porcentaje Ocupación (%)': nap['porcentaje_ocupacion'],
                        'Porcentaje Libre (%)': nap['porcentaje_libre']
                    }
                else:
                    # Se geocodificó pero no hay NAPs cercanas
                    fila = {
                        'Nombre del Cliente': cliente['NOMBRE_COMPLETO'],
                        'Dirección del Cliente': cliente['DIRECCIÓN'],
                        'Celular': cliente['CELULAR'],
                        'Zona': cliente['ZONA'],
                        'Estado Original': cliente['ESTADO'],
                        'NAP Más Cercana': 'Sin NAPs cercanas',
                        'Dirección de la NAP': 'N/A',
                        'Distancia (metros)': 'N/A',
                        'Puertos Disponibles': 'N/A',
                        'Porcentaje Ocupación (%)': 'N/A',
                        'Porcentaje Libre (%)': 'N/A'
                    }
            else:
                # Error de geocodificación
                fila = {
                    'Nombre del Cliente': cliente['NOMBRE_COMPLETO'],
                    'Dirección del Cliente': cliente['DIRECCIÓN'],
                    'Celular': cliente['CELULAR'],
                    'Zona': cliente['ZONA'],
                    'Estado Original': cliente['ESTADO'],
                    'NAP Más Cercana': 'Error al geolocalizar',
                    'Dirección de la NAP': 'N/A',
                    'Distancia (metros)': 'N/A',
                    'Puertos Disponibles': 'N/A',
                    'Porcentaje Ocupación (%)': 'N/A',
                    'Porcentaje Libre (%)': 'N/A'
                }
            
            filas_excel.append(fila)
        
        # Crear DataFrame final
        df_final = pd.DataFrame(filas_excel)
        
        # Ordenar: primero los que tienen NAP, luego sin NAPs, luego errores
        def prioridad(row):
            if row['NAP Más Cercana'] == 'Error al geolocalizar':
                return 3
            elif row['NAP Más Cercana'] == 'Sin NAPs cercanas':
                return 2
            else:
                return 1
        
        df_final['_orden'] = df_final.apply(prioridad, axis=1)
        df_final = df_final.sort_values(['_orden', 'Distancia (metros)']).drop('_orden', axis=1)
        
        # Guardar Excel
        timestamp = datetime.now().strftime('%Y%m%d_%H%M')
        nombre_archivo = f"clientes_ZONA2_completa_{timestamp}.xlsx"
        df_final.to_excel(nombre_archivo, index=False)
        
        # Estadísticas finales
        con_nap = len(df_final[~df_final['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])])
        sin_nap = len(df_final[df_final['NAP Más Cercana'] == 'Sin NAPs cercanas'])
        errores = len(df_final[df_final['NAP Más Cercana'] == 'Error al geolocalizar'])
        
        print(f"\n✅ Excel ZONA 2 generado: {nombre_archivo}")
        print(f"📊 Total clientes ZONA 2: {len(df_final)}")
        print(f"📊 Con NAPs cercanas: {con_nap}")
        print(f"📊 Sin NAPs cercanas: {sin_nap}")
        print(f"📊 Errores de geocodificación: {errores}")
        
        return nombre_archivo, df_final


def main():
    """Función principal - Procesa SOLO ZONA 2"""
    print("🚀 PROCESANDO ZONA 2 COMPLETA")
    print("="*50)
    
    procesador = ProcesadorZona2()
    
    # 1. Cargar clientes de ZONA 2
    print("\n📂 PASO 1: Cargando clientes ZONA 2...")
    clientes = procesador.cargar_zona2_completa()
    
    if clientes.empty:
        print("❌ No se encontraron clientes ZONA 2 para procesar")
        return
    
    # 2. Cargar NAPs disponibles
    print("\n📂 PASO 2: Cargando NAPs...")
    naps = procesador.cargar_naps_disponibles()
    
    if naps.empty:
        print("❌ No se encontraron NAPs disponibles")
        return
    
    # 3. Geocodificar ZONA 2
    print("\n🌍 PASO 3: Geocodificando ZONA 2...")
    respuesta = input(f"¿Procesar {len(clientes)} clientes de ZONA 2? (s/n): ").lower()
    
    if respuesta != 's':
        print("⏸️ Proceso cancelado por el usuario")
        return
    
    clientes_coords = procesador.geocodificar_zona2(clientes)
    
    # 4. Encontrar NAPs cercanas
    print("\n📏 PASO 4: Buscando NAPs cercanas...")
    clientes_con_nap = procesador.encontrar_naps_cercanas(clientes_coords, naps)
    
    # 5. Generar Excel final
    print("\n📊 PASO 5: Generando Excel ZONA 2...")
    archivo_excel, df_final = procesador.generar_excel_zona2_completo(
        clientes, clientes_coords, clientes_con_nap
    )
    
    print(f"\n🎉 ZONA 2 COMPLETADA!")
    print(f"📄 Archivo: {archivo_excel}")
    print(f"🎯 Clientes prioritarios (con NAP): {len(clientes_con_nap)}")
    
    if len(clientes_con_nap) > 0:
        print(f"📊 Distancia promedio: {clientes_con_nap['distancia_metros'].mean():.1f}m")
        print(f"🔌 Puertos libres promedio: {clientes_con_nap['porcentaje_libre'].mean():.1f}%")
    
    print(f"\n✅ Si todo se ve bien, ejecutaremos la ZONA 1 después!")


if __name__ == "__main__":
    main()
