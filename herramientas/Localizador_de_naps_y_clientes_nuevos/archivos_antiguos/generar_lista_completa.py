#!/usr/bin/env python3
"""
Versión optimizada del script para procesar todos los clientes
con mejor geocodificación y funciones adicionales.
"""

import pandas as pd
import numpy as np
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import folium
from folium import plugins
import time
import json
import os
import re
from datetime import datetime

# Configuración
RADIO_BUSQUEDA = 150  # metros
OCUPACION_MAXIMA = 30  # porcentaje máximo de ocupación de NAPs
CACHE_GEOCODING = "cache_geocoding.json"

class AnalizadorClientesOptimizado:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_analyzer_v2", timeout=10)
        self.cache_coords = self.cargar_cache()
        
    def cargar_cache(self):
        """Carga cache de coordenadas"""
        if os.path.exists(CACHE_GEOCODING):
            with open(CACHE_GEOCODING, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def guardar_cache(self):
        """Guarda cache de coordenadas"""
        with open(CACHE_GEOCODING, 'w', encoding='utf-8') as f:
            json.dump(self.cache_coords, f, indent=2, ensure_ascii=False)
    
    def limpiar_direccion(self, direccion):
        """Limpia y normaliza direcciones para mejor geocodificación"""
        if not direccion or pd.isna(direccion):
            return None
            
        direccion = str(direccion).strip()
        
        # Reemplazos comunes
        reemplazos = {
            'Gral.': 'General',
            'Gral ': 'General ',
            'Av.': 'Avenida',
            'Av ': 'Avenida ',
            'Dto': 'Departamento',
            'dto': 'Departamento',
            'D°': 'Departamento',
            'Depto': 'Departamento',
            'dpto': 'Departamento',
            'DTO': 'Departamento',
            ' / ': ' esquina ',
            'Maipu': 'Maipú'
        }
        
        for buscar, reemplazar in reemplazos.items():
            direccion = direccion.replace(buscar, reemplazar)
        
        # Limpiar caracteres especiales al final
        direccion = re.sub(r'[^\w\s]$', '', direccion)
        
        return direccion
    
    def geocodificar_direccion_mejorada(self, direccion):
        """Geocodificación mejorada con múltiples intentos"""
        direccion_original = direccion
        direccion_limpia = self.limpiar_direccion(direccion)
        
        if not direccion_limpia:
            return None, None
        
        # Buscar en cache
        if direccion_limpia in self.cache_coords:
            coords = self.cache_coords[direccion_limpia]
            return coords['lat'], coords['lon']
        
        # Múltiples intentos de geocodificación
        intentos = [
            f"{direccion_limpia}, Tandil, Buenos Aires, Argentina",
            f"{direccion_limpia}, Tandil, Argentina",
            f"{direccion_limpia}, Tandil",
            # Intentar sin número de departamento si no funciona
            re.sub(r'\s*[Dd]epartamento.*$', '', direccion_limpia) + ", Tandil, Argentina"
        ]
        
        for intento in intentos:
            try:
                location = self.geolocator.geocode(intento)
                if location:
                    lat, lon = location.latitude, location.longitude
                    # Verificar que esté cerca de Tandil
                    if -37.5 < lat < -37.1 and -59.4 < lon < -58.9:
                        self.cache_coords[direccion_limpia] = {'lat': lat, 'lon': lon}
                        time.sleep(1)  # Respetar límites de API
                        return lat, lon
                time.sleep(0.5)
            except Exception as e:
                continue
        
        print(f"⚠️  No se pudo geocodificar: {direccion_original}")
        return None, None
    
    def cargar_datos_clientes(self):
        """Carga y procesa datos de clientes de ambas zonas"""
        archivo = "base de datos copia.xlsx"
        
        # Cargar ZONA 1 y ZONA 2
        zona1 = pd.read_excel(archivo, sheet_name='ZONA 1')
        zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
        
        # Limpiar y unificar datos adaptándose a las columnas reales
        # Para ZONA 1
        zona1_clean = zona1[zona1['DIRECCIÓN'].notna() & (zona1['DIRECCIÓN'] != '')].copy()
        zona1_clean['ZONA'] = 'ZONA 1'
        zona1_clean['NOMBRE_COMPLETO'] = zona1_clean.get('Unnamed: 1', 'Sin nombre')
        zona1_clean = zona1_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
        
        # Para ZONA 2
        zona2_clean = zona2[zona2['DIRECCIÓN'].notna() & (zona2['DIRECCIÓN'] != '')].copy()
        zona2_clean['ZONA'] = 'ZONA 2'
        zona2_clean['NOMBRE_COMPLETO'] = zona2_clean.get('NOMBRE COMPLETO', 'Sin nombre')
        zona2_clean = zona2_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
        
        # Unir ambas zonas
        clientes = pd.concat([zona1_clean, zona2_clean], ignore_index=True)
        
        # Filtrar solo los que NO CONTRATARON o NO RESPONDIERON
        mask = clientes['ESTADO'].str.contains('NO', case=False, na=False)
        clientes_filtrados = clientes[mask].copy()
        
        print(f"📊 Clientes totales: {len(clientes)}")
        print(f"📊 Clientes que no contrataron: {len(clientes_filtrados)}")
        
        return clientes_filtrados
    
    def cargar_datos_naps(self):
        """Carga datos de NAPs"""
        archivo_naps = "../Localizador_de_naps/naps.xlsx"
        
        naps = pd.read_excel(archivo_naps)
        
        # Calcular porcentaje de ocupación
        naps['total_puertos'] = naps['puertos_utilizados'] + naps['puertos_disponibles']
        naps['porcentaje_ocupacion'] = (naps['puertos_utilizados'] / naps['total_puertos']) * 100
        naps['porcentaje_libre'] = 100 - naps['porcentaje_ocupacion']
        
        # Filtrar NAPs con baja ocupación
        naps_disponibles = naps[naps['porcentaje_ocupacion'] <= OCUPACION_MAXIMA].copy()
        
        print(f"📊 NAPs totales: {len(naps)}")
        print(f"📊 NAPs con ocupación <= {OCUPACION_MAXIMA}%: {len(naps_disponibles)}")
        
        return naps_disponibles
    
    def procesar_clientes_lotes(self, clientes, tamaño_lote=200):
        """Procesa clientes en lotes para mejor gestión de memoria y progreso"""
        print(f"🌍 Geocodificando {len(clientes)} direcciones en lotes de {tamaño_lote}...")
        
        clientes_procesados = []
        total_lotes = (len(clientes) + tamaño_lote - 1) // tamaño_lote
        
        for i in range(0, len(clientes), tamaño_lote):
            lote = clientes.iloc[i:i + tamaño_lote].copy()
            lote_num = (i // tamaño_lote) + 1
            
            print(f"Procesando lote {lote_num}/{total_lotes} ({len(lote)} clientes)...")
            
            coords = []
            for idx, (_, cliente) in enumerate(lote.iterrows()):
                if idx % 20 == 0:
                    print(f"  {idx}/{len(lote)}...")
                
                lat, lon = self.geocodificar_direccion_mejorada(cliente['DIRECCIÓN'])
                coords.append({'lat': lat, 'lon': lon})
            
            lote['lat'] = [c['lat'] for c in coords]
            lote['lon'] = [c['lon'] for c in coords]
            
            # Filtrar solo los geocodificados exitosamente
            lote_valido = lote.dropna(subset=['lat', 'lon'])
            clientes_procesados.append(lote_valido)
            
            # Guardar cache cada lote
            self.guardar_cache()
            
            print(f"  ✅ Lote {lote_num}: {len(lote_valido)}/{len(lote)} geocodificados")
        
        resultado = pd.concat(clientes_procesados, ignore_index=True) if clientes_procesados else pd.DataFrame()
        print(f"📊 Total geocodificados: {len(resultado)}/{len(clientes)}")
        
        return resultado
    
    def encontrar_naps_cercanas(self, clientes, naps):
        """Encuentra la NAP más cercana para cada cliente"""
        print("📏 Calculando distancias a NAPs...")
        
        resultados = []
        
        for idx, (_, cliente) in enumerate(clientes.iterrows()):
            if idx % 100 == 0:
                print(f"Procesando {idx}/{len(clientes)}...")
            
            cliente_coords = (cliente['lat'], cliente['lon'])
            
            distancias = []
            for _, nap in naps.iterrows():
                nap_coords = (nap['Latitud'], nap['Longitud'])
                distancia = geodesic(cliente_coords, nap_coords).meters
                
                if distancia <= RADIO_BUSQUEDA:
                    distancias.append({
                        'nap_id': nap['id'],
                        'nap_nombre': nap['nombre_nap'],
                        'nap_direccion': nap['direccion'],
                        'distancia_metros': round(distancia, 2),
                        'porcentaje_ocupacion': round(nap['porcentaje_ocupacion'], 1),
                        'porcentaje_libre': round(nap['porcentaje_libre'], 1),
                        'puertos_disponibles': nap['puertos_disponibles'],
                        'nap_lat': nap['Latitud'],
                        'nap_lon': nap['Longitud']
                    })
            
            # Ordenar por distancia y tomar la más cercana
            if distancias:
                distancias.sort(key=lambda x: x['distancia_metros'])
                nap_cercana = distancias[0]
                
                resultado = {
                    'NOMBRE_CLIENTE': cliente['NOMBRE_COMPLETO'],
                    'DIRECCION_CLIENTE': cliente['DIRECCIÓN'],
                    'CELULAR_CLIENTE': cliente['CELULAR'],
                    'ZONA': cliente['ZONA'],
                    'ESTADO_ORIGINAL': cliente['ESTADO'],
                    'LAT_CLIENTE': cliente['lat'],
                    'LON_CLIENTE': cliente['lon'],
                    **nap_cercana
                }
                
                resultados.append(resultado)
        
        print(f"📊 Clientes con NAPs cercanas: {len(resultados)}")
        return pd.DataFrame(resultados)
    
    def generar_excel_final(self, resultados):
        """Genera el Excel final con los resultados"""
        if resultados.empty:
            print("❌ No hay resultados para generar Excel")
            return None, None
        
        # Ordenar por distancia
        resultados_ordenados = resultados.sort_values('distancia_metros')
        
        # Renombrar columnas para el Excel final
        columnas_finales = {
            'NOMBRE_CLIENTE': 'Nombre del Cliente',
            'DIRECCION_CLIENTE': 'Dirección del Cliente',
            'CELULAR_CLIENTE': 'Celular',
            'ZONA': 'Zona',
            'nap_nombre': 'NAP Más Cercana',
            'nap_direccion': 'Dirección de la NAP',
            'distancia_metros': 'Distancia (metros)',
            'porcentaje_libre': 'Porcentaje Puertos Libres (%)',
            'puertos_disponibles': 'Puertos Disponibles',
            'porcentaje_ocupacion': 'Porcentaje Ocupación (%)'
        }
        
        excel_final = resultados_ordenados[list(columnas_finales.keys())].copy()
        excel_final = excel_final.rename(columns=columnas_finales)
        
        # Agregar estadísticas
        excel_final['Prioridad'] = range(1, len(excel_final) + 1)
        
        # Guardar Excel con múltiples hojas
        nombre_archivo = f"clientes_prioritarios_completo_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        
        with pd.ExcelWriter(nombre_archivo, engine='openpyxl') as writer:
            # Hoja principal
            excel_final.to_excel(writer, sheet_name='Clientes Prioritarios', index=False)
            
            # Estadísticas por zona
            stats_zona = resultados_ordenados.groupby('ZONA').agg({
                'distancia_metros': ['count', 'mean', 'min', 'max'],
                'porcentaje_libre': 'mean'
            }).round(2)
            stats_zona.to_excel(writer, sheet_name='Estadísticas por Zona')
            
            # NAPs más demandadas
            naps_demanda = resultados_ordenados['nap_nombre'].value_counts().head(20)
            naps_demanda.to_excel(writer, sheet_name='NAPs Más Demandadas')
        
        print(f"✅ Excel generado: {nombre_archivo}")
        print(f"📊 Total de clientes prioritarios: {len(excel_final)}")
        
        return nombre_archivo, excel_final
    
    def generar_mapa_avanzado(self, resultados):
        """Genera mapa interactivo avanzado"""
        if resultados.empty:
            print("❌ No hay resultados para generar mapa")
            return None
        
        # Centro del mapa (Tandil)
        centro_lat = resultados['LAT_CLIENTE'].mean()
        centro_lon = resultados['LON_CLIENTE'].mean()
        
        mapa = folium.Map(
            location=[centro_lat, centro_lon],
            zoom_start=13,
            tiles='OpenStreetMap'
        )
        
        # Crear grupos de marcadores por zona
        grupo_zona1 = folium.FeatureGroup(name='Zona 1')
        grupo_zona2 = folium.FeatureGroup(name='Zona 2')
        grupo_naps = folium.FeatureGroup(name='NAPs Disponibles')
        
        # Agregar clientes por zona
        for _, cliente in resultados.iterrows():
            popup_cliente = f"""
            <div style="width: 300px;">
            <h4>{cliente['NOMBRE_CLIENTE']}</h4>
            <p><b>📍 Dirección:</b> {cliente['DIRECCION_CLIENTE']}</p>
            <p><b>📞 Celular:</b> {cliente['CELULAR_CLIENTE']}</p>
            <p><b>🏷️ Zona:</b> {cliente['ZONA']}</p>
            <hr>
            <h5>NAP Más Cercana:</h5>
            <p><b>Nombre:</b> {cliente['nap_nombre']}</p>
            <p><b>📏 Distancia:</b> {cliente['distancia_metros']} metros</p>
            <p><b>🔌 Puertos libres:</b> {cliente['porcentaje_libre']}%</p>
            <p><b>✅ Puertos disponibles:</b> {cliente['puertos_disponibles']}</p>
            </div>
            """
            
            color = 'red' if cliente['ZONA'] == 'ZONA 1' else 'orange'
            grupo = grupo_zona1 if cliente['ZONA'] == 'ZONA 1' else grupo_zona2
            
            folium.CircleMarker(
                location=[cliente['LAT_CLIENTE'], cliente['LON_CLIENTE']],
                radius=8,
                popup=folium.Popup(popup_cliente, max_width=350),
                color=color,
                fillColor=color,
                fillOpacity=0.7,
                tooltip=f"{cliente['NOMBRE_CLIENTE']} - {cliente['distancia_metros']}m"
            ).add_to(grupo)
        
        # Agregar NAPs únicas
        naps_unicas = resultados.drop_duplicates('nap_id')
        for _, nap in naps_unicas.iterrows():
            popup_nap = f"""
            <div style="width: 250px;">
            <h4>NAP: {nap['nap_nombre']}</h4>
            <p><b>📍 Dirección:</b> {nap['nap_direccion']}</p>
            <p><b>🔌 Ocupación:</b> {nap['porcentaje_ocupacion']}%</p>
            <p><b>✅ Puertos disponibles:</b> {nap['puertos_disponibles']}</p>
            <p><b>👥 Clientes potenciales cercanos:</b> {len(resultados[resultados['nap_id'] == nap['nap_id']])}</p>
            </div>
            """
            
            folium.CircleMarker(
                location=[nap['nap_lat'], nap['nap_lon']],
                radius=12,
                popup=folium.Popup(popup_nap, max_width=300),
                color='green',
                fillColor='lightgreen',
                fillOpacity=0.8,
                tooltip=f"NAP: {nap['nap_nombre']}"
            ).add_to(grupo_naps)
        
        # Agregar grupos al mapa
        grupo_zona1.add_to(mapa)
        grupo_zona2.add_to(mapa)
        grupo_naps.add_to(mapa)
        
        # Agregar control de capas
        folium.LayerControl().add_to(mapa)
        
        # Agregar mapa de calor opcional
        heat_data = [[row['LAT_CLIENTE'], row['LON_CLIENTE']] for _, row in resultados.iterrows()]
        plugins.HeatMap(heat_data, name='Mapa de Calor', overlay=True, control=True).add_to(mapa)
        
        # Guardar mapa
        nombre_mapa = f"mapa_completo_clientes_{datetime.now().strftime('%Y%m%d_%H%M')}.html"
        mapa.save(nombre_mapa)
        
        print(f"✅ Mapa generado: {nombre_mapa}")
        return nombre_mapa

def main():
    """Función principal para procesamiento completo"""
    print("🚀 Iniciando análisis completo de clientes prioritarios...")
    
    analizador = AnalizadorClientesOptimizado()
    
    # 1. Cargar datos
    print("\n📂 Cargando datos...")
    clientes = analizador.cargar_datos_clientes()
    naps = analizador.cargar_datos_naps()
    
    if clientes.empty or naps.empty:
        print("❌ No hay datos suficientes para el análisis")
        return
    
    # 2. Procesar todos los clientes (o una muestra más grande)
    print("\n🌍 Procesando clientes...")
    respuesta = input("¿Procesar TODOS los clientes? (s/n, default=500 primeros): ").lower()
    
    if respuesta == 's':
        clientes_coords = analizador.procesar_clientes_lotes(clientes)
    else:
        clientes_muestra = clientes.head(500)
        clientes_coords = analizador.procesar_clientes_lotes(clientes_muestra)
    
    if clientes_coords.empty:
        print("❌ No se pudieron geocodificar direcciones")
        return
    
    # 3. Encontrar NAPs cercanas
    print("\n📏 Buscando NAPs cercanas...")
    resultados = analizador.encontrar_naps_cercanas(clientes_coords, naps)
    
    if resultados.empty:
        print("❌ No se encontraron clientes cerca de NAPs disponibles")
        return
    
    # 4. Generar Excel final
    print("\n📊 Generando Excel final...")
    archivo_excel, excel_data = analizador.generar_excel_final(resultados)
    
    # 5. Generar mapa
    print("\n🗺️  Generando mapa interactivo...")
    archivo_mapa = analizador.generar_mapa_avanzado(resultados)
    
    print(f"\n✅ Proceso completado!")
    print(f"📄 Excel: {archivo_excel}")
    print(f"🗺️  Mapa: {archivo_mapa}")
    print(f"🎯 Clientes prioritarios encontrados: {len(resultados)}")
    print(f"📊 Promedio distancia: {resultados['distancia_metros'].mean():.1f} metros")
    print(f"🔌 Promedio puertos libres: {resultados['porcentaje_libre'].mean():.1f}%")

if __name__ == "__main__":
    main()
