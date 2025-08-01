#!/usr/bin/env python3
"""
VERSIÓN FINAL CORREGIDA - Script para procesar ZONA 2 
CON CÁLCULOS DE DISTANCIA COMPLETAMENTE REESCRITOS
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
CACHE_GEOCODING = "cache_geocoding_zona2_final.json"

class ProcesadorZona2Final:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_zona2_final_v1", timeout=10)
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
        """Limpia dirección SOLO para geocodificación"""
        if not direccion or pd.isna(direccion):
            return None
            
        direccion_str = str(direccion).strip()
        direccion_lower = direccion_str.lower()
        
        # Separar número pegado a "TANDIL"
        direccion_lower = re.sub(r'(\d+)tandil', r'\1', direccion_lower)
        
        # Remover palabras problemáticas
        palabras_remover = [
            r'\bdpto\b', r'\bdto\b', r'\bdepartamento\b', r'\bdepto\b',
            r'\bcasa\b', r'\bpiso\b', r'\bph\b', r'\blocal\b', r'\boficina\b',
            r'\bprimer piso\b', r'\bplanta alta\b', r'\bplanta baja\b',
            r'\bfrente\b', r'\bfondo\b', r'\bcontrafrente\b'
        ]
        
        for palabra in palabras_remover:
            direccion_lower = re.sub(palabra, '', direccion_lower)
        
        direccion_lower = re.sub(r'\s+', ' ', direccion_lower).strip()
        direccion_lower = re.sub(r'[^\w\s]', '', direccion_lower).strip()
        
        if len(direccion_lower) < 3:
            return None
        
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
        
        # Intentar geocodificar
        formatos_busqueda = [
            f"{direccion_limpia}, Tandil, Buenos Aires, Argentina",
            f"{direccion_limpia}, Tandil, Argentina", 
            f"{direccion_limpia}, Tandil"
        ]
        
        for formato in formatos_busqueda:
            try:
                time.sleep(1.1)  # Rate limit
                location = self.geolocator.geocode(formato)
                
                if location:
                    coords = {'lat': location.latitude, 'lon': location.longitude}
                    self.cache_coords[direccion_limpia] = coords
                    return coords
                    
            except Exception as e:
                print(f"Error geocodificando '{formato}': {e}")
                continue
        
        # Marcar como fallida en cache
        self.cache_coords[direccion_limpia] = None
        return None
    
    def cargar_zona2_completa(self):
        """Carga SOLO los clientes de ZONA 2"""
        archivo = "base de datos copia.xlsx"
        
        print(f"📂 Cargando ZONA 2 desde: {archivo}")
        
        zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
        print(f"📊 ZONA 2 leída: {len(zona2)} filas")
        
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
        
        # Filtrar solo los que NO contrataron
        mask_no_contrato = zona2_clean['ESTADO'].str.contains('NO', case=False, na=False)
        clientes_filtrados = zona2_clean[mask_no_contrato].copy()
        
        print(f"📊 Clientes ZONA 2 que NO contrataron: {len(clientes_filtrados)}")
        
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
    
    def encontrar_nap_mas_cercana_individual(self, cliente_lat, cliente_lon, naps):
        """
        NUEVA FUNCIÓN: Encuentra la NAP más cercana para UN cliente específico
        Evita cualquier confusión con índices o referencias
        """
        cliente_pos = (cliente_lat, cliente_lon)
        
        nap_mas_cercana = None
        distancia_minima = float('inf')
        
        # Iterar por TODAS las NAPs disponibles
        for idx, nap in naps.iterrows():
            # Verificar que la NAP tenga coordenadas válidas
            if pd.isna(nap['Latitud']) or pd.isna(nap['Longitud']):
                continue
                
            nap_pos = (nap['Latitud'], nap['Longitud'])
            
            # Calcular distancia DIRECTAMENTE para este cliente-NAP
            distancia = geodesic(cliente_pos, nap_pos).meters
            
            # Si es la más cercana hasta ahora, guardarla
            if distancia < distancia_minima:
                distancia_minima = distancia
                nap_mas_cercana = nap.copy()  # COPIAR para evitar referencias
        
        # Retornar resultado solo si está dentro del radio
        if nap_mas_cercana is not None and distancia_minima <= RADIO_BUSQUEDA:
            return {
                'nap': nap_mas_cercana,
                'distancia': distancia_minima
            }
        else:
            return None
    
    def procesar_clientes_zona2(self, clientes, naps):
        """NUEVA FUNCIÓN: Procesa cada cliente individualmente"""
        print(f"\n🔍 Procesando {len(clientes)} clientes de ZONA 2...")
        
        resultados_finales = []
        
        for idx, (_, cliente) in enumerate(clientes.iterrows()):
            if idx % 50 == 0:
                print(f"🔍 Progreso: {idx}/{len(clientes)} ({idx/len(clientes)*100:.1f}%)")
            
            # PASO 1: Geocodificar cliente
            coords = self.geocodificar_direccion(cliente['DIRECCIÓN'])
            
            if coords:
                cliente_lat = coords['lat']
                cliente_lon = coords['lon']
                
                # PASO 2: Encontrar NAP más cercana INDIVIDUALMENTE
                resultado_nap = self.encontrar_nap_mas_cercana_individual(
                    cliente_lat, cliente_lon, naps
                )
                
                if resultado_nap:
                    # Cliente con NAP cercana
                    nap_info = resultado_nap['nap']
                    distancia = resultado_nap['distancia']
                    
                    fila = {
                        'Nombre del Cliente': cliente['NOMBRE_COMPLETO'],
                        'Dirección del Cliente': cliente['DIRECCIÓN'],
                        'Celular': cliente['CELULAR'],
                        'Zona': cliente['ZONA'],
                        'Estado Original': cliente['ESTADO'],
                        'NAP Más Cercana': nap_info['nombre_nap'],
                        'Dirección de la NAP': nap_info['direccion'],
                        'Distancia (metros)': round(distancia, 1),
                        'Puertos Disponibles': nap_info['puertos_disponibles'],
                        'Porcentaje Ocupación (%)': round(nap_info['porcentaje_ocupacion'], 1),
                        'Porcentaje Libre (%)': round(nap_info['porcentaje_libre'], 1)
                    }
                    
                    # DEBUG: Mostrar casos específicos para verificar
                    if any(palabra in cliente['NOMBRE_COMPLETO'].upper() for palabra in ['MILANESI', 'ALSINA 1274', 'ALSINA 956', 'ALSINA 1518']):
                        print(f"🔍 DEBUG - {cliente['NOMBRE_COMPLETO']}")
                        print(f"    Dirección: {cliente['DIRECCIÓN']}")
                        print(f"    Coordenadas: {cliente_lat:.6f}, {cliente_lon:.6f}")
                        print(f"    NAP: {nap_info['nombre_nap']}")
                        print(f"    NAP coords: {nap_info['Latitud']:.6f}, {nap_info['Longitud']:.6f}")
                        print(f"    Distancia: {distancia:.1f}m")
                    
                else:
                    # Cliente geocodificado pero sin NAPs cercanas
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
            
            resultados_finales.append(fila)
        
        # Guardar cache
        self.guardar_cache()
        
        return pd.DataFrame(resultados_finales)
    
    def generar_excel_final(self, df_resultados):
        """Genera Excel final ordenado"""
        print(f"\n📊 Generando Excel final con {len(df_resultados)} clientes...")
        
        # Ordenar: primero con NAP, luego sin NAPs, luego errores
        def prioridad(row):
            if row['NAP Más Cercana'] == 'Error al geolocalizar':
                return 3
            elif row['NAP Más Cercana'] == 'Sin NAPs cercanas':
                return 2
            else:
                return 1
        
        df_resultados['_orden'] = df_resultados.apply(prioridad, axis=1)
        df_ordenado = df_resultados.sort_values(['_orden', 'Distancia (metros)']).drop('_orden', axis=1)
        
        # Guardar Excel
        timestamp = datetime.now().strftime('%Y%m%d_%H%M')
        nombre_archivo = f"clientes_ZONA2_FINAL_CORREGIDO_{timestamp}.xlsx"
        df_ordenado.to_excel(nombre_archivo, index=False)
        
        # Estadísticas finales
        con_nap = len(df_ordenado[~df_ordenado['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])])
        sin_nap = len(df_ordenado[df_ordenado['NAP Más Cercana'] == 'Sin NAPs cercanas'])
        errores = len(df_ordenado[df_ordenado['NAP Más Cercana'] == 'Error al geolocalizar'])
        
        print(f"\n✅ Excel FINAL generado: {nombre_archivo}")
        print(f"📊 Total clientes: {len(df_ordenado)}")
        print(f"📊 Con NAPs cercanas: {con_nap}")
        print(f"📊 Sin NAPs cercanas: {sin_nap}")
        print(f"📊 Errores de geocodificación: {errores}")
        
        # Verificar distancias sospechosas
        df_con_nap = df_ordenado[~df_ordenado['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])]
        if len(df_con_nap) > 0:
            distancia_promedio = df_con_nap['Distancia (metros)'].mean()
            distancia_min = df_con_nap['Distancia (metros)'].min()
            distancia_max = df_con_nap['Distancia (metros)'].max()
            
            print(f"📊 Distancia promedio: {distancia_promedio:.1f}m")
            print(f"📊 Distancia mínima: {distancia_min}m")
            print(f"📊 Distancia máxima: {distancia_max}m")
            
            # Casos sospechosos
            casos_sospechosos = df_con_nap[df_con_nap['Distancia (metros)'] < 10]
            if len(casos_sospechosos) > 0:
                print(f"🚨 CASOS SOSPECHOSOS (< 10m): {len(casos_sospechosos)}")
            else:
                print(f"✅ No hay casos sospechosos con distancias < 10m")
        
        return nombre_archivo, df_ordenado


def main():
    """Función principal - VERSIÓN FINAL CORREGIDA"""
    print("🚀 PROCESANDO ZONA 2 - VERSIÓN FINAL CORREGIDA")
    print("="*60)
    print("🔧 Correcciones aplicadas:")
    print("   ✅ Algoritmo completamente reescrito")
    print("   ✅ Cálculo individual por cliente")
    print("   ✅ Sin reutilización de variables")
    print("   ✅ Debug habilitado para casos específicos")
    print()
    
    procesador = ProcesadorZona2Final()
    
    # 1. Cargar clientes de ZONA 2
    print("📂 PASO 1: Cargando clientes ZONA 2...")
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
    
    # 3. Procesar TODOS los clientes
    print("\n🔍 PASO 3: Procesando clientes...")
    respuesta = input(f"¿Procesar {len(clientes)} clientes de ZONA 2 con algoritmo FINAL? (s/n): ").lower()
    
    if respuesta != 's':
        print("⏸️ Proceso cancelado por el usuario")
        return
    
    df_resultados = procesador.procesar_clientes_zona2(clientes, naps)
    
    # 4. Generar Excel final
    print("\n📊 PASO 4: Generando Excel final...")
    archivo_excel, df_final = procesador.generar_excel_final(df_resultados)
    
    print(f"\n🎉 ZONA 2 FINAL COMPLETADA!")
    print(f"📄 Archivo: {archivo_excel}")
    
    print(f"\n🔍 Verificar especialmente los casos:")
    print(f"   - MILANESI MAURO FABRICIO")
    print(f"   - ALSINA 1274, 956, 1518")
    print(f"✅ Si están correctos, aplicaremos la misma lógica a ZONA 1")


if __name__ == "__main__":
    main()
