#!/usr/bin/env python3
"""
Script OPTIMIZADO para procesar los 3382 clientes en lotes manejables
Incluye progress tracking y procesamiento por lotes
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
CACHE_GEOCODING = "cache_geocoding_final.json"
LOTE_SIZE = 50  # Procesar de a 50 clientes para mejor control

class ProcesadorOptimizado:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_final_optimizado", timeout=10)
        self.cache_coords = self.cargar_cache()
        
    def cargar_cache(self):
        """Carga cache de coordenadas"""
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
    
    def limpiar_direccion(self, direccion):
        """Limpia dirección para geocodificación"""
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
        """Geocodifica una dirección"""
        direccion_limpia = self.limpiar_direccion(direccion_original)
        
        if not direccion_limpia:
            return None
        
        # Buscar en cache
        if direccion_limpia in self.cache_coords:
            coords = self.cache_coords[direccion_limpia]
            if coords and coords.get('lat') and coords.get('lon'):
                return coords
        
        # Intentar geocodificar
        formatos = [
            f"{direccion_limpia}, Tandil, Buenos Aires, Argentina",
            f"{direccion_limpia}, Tandil, Argentina", 
            f"{direccion_limpia}, Tandil"
        ]
        
        for formato in formatos:
            try:
                time.sleep(1.1)  # Rate limit
                location = self.geolocator.geocode(formato)
                
                if location:
                    coords = {'lat': location.latitude, 'lon': location.longitude}
                    self.cache_coords[direccion_limpia] = coords
                    return coords
                    
            except Exception as e:
                continue
        
        # Marcar como fallida en cache
        self.cache_coords[direccion_limpia] = None
        return None
    
    def cargar_datos(self):
        """Carga clientes y NAPs"""
        print("📂 Cargando datos...")
        
        # Clientes
        archivo = "base de datos copia.xlsx"
        
        zona1 = pd.read_excel(archivo, sheet_name='ZONA 1')
        zona1_clean = zona1[
            zona1['DIRECCIÓN'].notna() & 
            (zona1['DIRECCIÓN'].str.strip() != '') &
            zona1['ESTADO'].notna()
        ].copy()
        zona1_clean['ZONA'] = 'ZONA 1'
        zona1_clean['NOMBRE_COMPLETO'] = zona1_clean['Unnamed: 1'].fillna('Sin nombre')
        zona1_clean = zona1_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
        
        zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
        zona2_clean = zona2[
            zona2['DIRECCIÓN'].notna() & 
            (zona2['DIRECCIÓN'].str.strip() != '') &
            zona2['ESTADO'].notna()
        ].copy()
        zona2_clean['ZONA'] = 'ZONA 2'
        zona2_clean['NOMBRE_COMPLETO'] = zona2_clean['NOMBRE COMPLETO'].fillna('Sin nombre')
        zona2_clean = zona2_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
        
        clientes = pd.concat([zona1_clean, zona2_clean], ignore_index=True)
        mask_no_contrato = clientes['ESTADO'].str.contains('NO', case=False, na=False)
        clientes_filtrados = clientes[mask_no_contrato].copy().reset_index(drop=True)
        
        # NAPs
        archivo_naps = "../Localizador_de_naps/naps.xlsx"
        naps = pd.read_excel(archivo_naps)
        naps['total_puertos'] = naps['puertos_utilizados'] + naps['puertos_disponibles']
        naps['porcentaje_ocupacion'] = (naps['puertos_utilizados'] / naps['total_puertos']) * 100
        naps['porcentaje_libre'] = 100 - naps['porcentaje_ocupacion']
        naps_disponibles = naps[naps['porcentaje_ocupacion'] <= OCUPACION_MAXIMA].copy()
        
        print(f"✅ Clientes total: {len(clientes_filtrados)}")
        print(f"✅ NAPs disponibles: {len(naps_disponibles)}")
        
        return clientes_filtrados, naps_disponibles
    
    def procesar_lote_geocoding(self, lote, numero_lote, total_lotes):
        """Procesa un lote de clientes para geocodificación"""
        print(f"🌍 Lote {numero_lote}/{total_lotes} - Geocodificando {len(lote)} clientes...")
        
        resultados = []
        
        for idx, (_, cliente) in enumerate(lote.iterrows()):
            coords = self.geocodificar_direccion(cliente['DIRECCIÓN'])
            
            resultado = {
                'indice_original': cliente.name,  # El índice real del DataFrame
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
            
            if (idx + 1) % 10 == 0:
                print(f"   Progreso lote: {idx + 1}/{len(lote)}")
        
        exitosos = sum(1 for r in resultados if r['geocodificado'])
        print(f"   ✅ Lote completado: {exitosos}/{len(resultados)} exitosos")
        
        return resultados
    
    def procesar_todos_los_clientes(self, clientes):
        """Procesa todos los clientes en lotes"""
        print(f"\n🌍 Procesando {len(clientes)} clientes en lotes de {LOTE_SIZE}...")
        
        total_lotes = (len(clientes) + LOTE_SIZE - 1) // LOTE_SIZE
        todos_resultados = []
        
        for i in range(0, len(clientes), LOTE_SIZE):
            lote = clientes.iloc[i:i+LOTE_SIZE]
            numero_lote = (i // LOTE_SIZE) + 1
            
            resultados_lote = self.procesar_lote_geocoding(lote, numero_lote, total_lotes)
            todos_resultados.extend(resultados_lote)
            
            # Guardar cache cada 5 lotes
            if numero_lote % 5 == 0:
                self.guardar_cache()
                print(f"💾 Cache guardado en lote {numero_lote}")
        
        # Guardar cache final
        self.guardar_cache()
        
        df_resultados = pd.DataFrame(todos_resultados)
        
        print(f"\n📊 Geocodificación completada:")
        print(f"📊 Total procesados: {len(df_resultados)}")
        print(f"📊 Exitosos: {df_resultados['geocodificado'].sum()}")
        print(f"📊 Fallidos: {(~df_resultados['geocodificado']).sum()}")
        print(f"📊 % Éxito: {df_resultados['geocodificado'].mean()*100:.1f}%")
        
        return df_resultados
    
    def encontrar_naps_cercanas(self, clientes_coords, naps):
        """Encuentra NAPs cercanas"""
        print(f"\n📏 Buscando NAPs cercanas...")
        
        clientes_geo = clientes_coords[clientes_coords['geocodificado']].copy()
        resultados = []
        
        for idx, cliente in clientes_geo.iterrows():
            cliente_pos = (cliente['lat'], cliente['lon'])
            
            nap_mas_cercana = None
            distancia_minima = float('inf')
            
            for _, nap in naps.iterrows():
                if pd.isna(nap['Latitud']) or pd.isna(nap['Longitud']):
                    continue
                    
                nap_pos = (nap['Latitud'], nap['Longitud'])
                distancia = geodesic(cliente_pos, nap_pos).meters
                
                if distancia <= RADIO_BUSQUEDA and distancia < distancia_minima:
                    distancia_minima = distancia
                    nap_mas_cercana = nap
            
            if nap_mas_cercana is not None:
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
                resultados.append(resultado)
        
        print(f"📊 Clientes con NAPs cercanas: {len(resultados)}")
        return pd.DataFrame(resultados)
    
    def generar_excel_final(self, clientes_originales, clientes_coords, clientes_con_nap):
        """Genera Excel final"""
        print(f"\n📊 Generando Excel final...")
        
        filas_excel = []
        
        for idx, cliente in clientes_originales.iterrows():
            # Buscar info de geocodificación
            coord_info = clientes_coords[clientes_coords['indice_original'] == idx]
            
            if len(coord_info) > 0 and coord_info.iloc[0]['geocodificado']:
                # Buscar NAP cercana
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
                    # Geocodificado pero sin NAPs cercanas
                    coord = coord_info.iloc[0]
                    fila = {
                        'Nombre del Cliente': coord['nombre'],
                        'Dirección del Cliente': coord['direccion_original'],
                        'Celular': coord['celular'],
                        'Zona': coord['zona'],
                        'Estado Original': coord['estado'],
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
        
        df_final = pd.DataFrame(filas_excel)
        
        # Ordenar por prioridad
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
        nombre_archivo = f"clientes_COMPLETOS_final_{timestamp}.xlsx"
        df_final.to_excel(nombre_archivo, index=False)
        
        # Estadísticas
        con_nap = len(df_final[~df_final['NAP Más Cercana'].isin(['Error al geolocalizar', 'Sin NAPs cercanas'])])
        sin_nap = len(df_final[df_final['NAP Más Cercana'] == 'Sin NAPs cercanas'])
        errores = len(df_final[df_final['NAP Más Cercana'] == 'Error al geolocalizar'])
        
        print(f"\n✅ Excel generado: {nombre_archivo}")
        print(f"📊 Total clientes: {len(df_final)}")
        print(f"📊 Con NAPs cercanas: {con_nap}")
        print(f"📊 Sin NAPs cercanas: {sin_nap}")
        print(f"📊 Errores geocodificación: {errores}")
        print(f"📊 Distribución por zona:")
        print(df_final['Zona'].value_counts())
        
        return nombre_archivo, df_final


def main():
    """Función principal optimizada"""
    print("🚀 PROCESADOR OPTIMIZADO - TODOS LOS CLIENTES")
    print("="*60)
    print(f"⚙️ Configuración:")
    print(f"   📏 Radio búsqueda: {RADIO_BUSQUEDA}m")
    print(f"   🔌 Ocupación máxima NAPs: {OCUPACION_MAXIMA}%")
    print(f"   📦 Tamaño lotes: {LOTE_SIZE} clientes")
    print("="*60)
    
    procesador = ProcesadorOptimizado()
    
    # 1. Cargar datos
    clientes, naps = procesador.cargar_datos()
    
    # 2. Confirmar procesamiento
    print(f"\n❓ ¿Procesar {len(clientes)} clientes en {(len(clientes) + LOTE_SIZE - 1) // LOTE_SIZE} lotes?")
    respuesta = input("   Tiempo estimado: ~1-2 horas (s/n): ").lower()
    
    if respuesta != 's':
        print("⏸️ Proceso cancelado")
        return
    
    # 3. Geocodificar todos
    print(f"\n🌍 Iniciando geocodificación...")
    clientes_coords = procesador.procesar_todos_los_clientes(clientes)
    
    # 4. Buscar NAPs
    clientes_con_nap = procesador.encontrar_naps_cercanas(clientes_coords, naps)
    
    # 5. Generar Excel
    archivo, df = procesador.generar_excel_final(clientes, clientes_coords, clientes_con_nap)
    
    print(f"\n🎉 PROCESO COMPLETADO!")
    print(f"📄 Archivo: {archivo}")
    print(f"🎯 Clientes prioritarios: {len(clientes_con_nap)}")


if __name__ == "__main__":
    main()
