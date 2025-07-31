#!/usr/bin/env python3
"""
Script principal para generar lista priorizada de clientes potenciales
basado en proximidad geográfica a NAPs con baja ocupación.
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
from datetime import datetime

# Configuración
RADIO_BUSQUEDA = 150  # metros
OCUPACION_MAXIMA = 30  # porcentaje máximo de ocupación de NAPs
CACHE_GEOCODING = "cache_geocoding.json"

class AnalizadorClientes:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_analyzer")
        self.cache_coords = self.cargar_cache()
        
    def cargar_cache(self):
        """Carga cache de coordenadas para evitar consultas repetidas"""
        if os.path.exists(CACHE_GEOCODING):
            with open(CACHE_GEOCODING, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def guardar_cache(self):
        """Guarda cache de coordenadas"""
        with open(CACHE_GEOCODING, 'w', encoding='utf-8') as f:
            json.dump(self.cache_coords, f, indent=2, ensure_ascii=False)
    
    def geocodificar_direccion(self, direccion):
        """Obtiene coordenadas de una dirección, usando cache si está disponible"""
        if not direccion or pd.isna(direccion):
            return None, None
            
        direccion_limpia = str(direccion).strip()
        
        # Buscar en cache
        if direccion_limpia in self.cache_coords:
            coords = self.cache_coords[direccion_limpia]
            return coords['lat'], coords['lon']
        
        try:
            # Agregar "Tandil, Argentina" para mejor precisión
            direccion_completa = f"{direccion_limpia}, Tandil, Buenos Aires, Argentina"
            location = self.geolocator.geocode(direccion_completa)
            
            if location:
                lat, lon = location.latitude, location.longitude
                # Guardar en cache
                self.cache_coords[direccion_limpia] = {'lat': lat, 'lon': lon}
                time.sleep(1)  # Respetar límites de API
                return lat, lon
            else:
                print(f"⚠️  No se pudo geocodificar: {direccion_limpia}")
                return None, None
                
        except Exception as e:
            print(f"❌ Error geocodificando {direccion_limpia}: {e}")
            return None, None
    
    def cargar_datos_clientes(self):
        """Carga y procesa datos de clientes de ambas zonas"""
        archivo = "base de datos copia.xlsx"
        
        # Cargar ZONA 1 y ZONA 2
        zona1 = pd.read_excel(archivo, sheet_name='ZONA 1')
        zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
        
        print("Columnas ZONA 1:", zona1.columns.tolist())
        print("Columnas ZONA 2:", zona2.columns.tolist())
        
        # Limpiar y unificar datos adaptándose a las columnas reales
        # Para ZONA 1 - usar columnas disponibles
        zona1_clean = zona1[zona1['DIRECCIÓN'].notna() & (zona1['DIRECCIÓN'] != '')].copy()
        zona1_clean['ZONA'] = 'ZONA 1'
        
        # Seleccionar columnas disponibles para ZONA 1
        cols_zona1 = ['DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']
        if 'Unnamed: 1' in zona1.columns:
            cols_zona1.insert(0, 'Unnamed: 1')  # Usar como nombre si está disponible
            zona1_clean = zona1_clean.rename(columns={'Unnamed: 1': 'NOMBRE_COMPLETO'})
            cols_zona1[0] = 'NOMBRE_COMPLETO'
        else:
            zona1_clean['NOMBRE_COMPLETO'] = 'Sin nombre'
            cols_zona1.insert(0, 'NOMBRE_COMPLETO')
        
        zona1_clean = zona1_clean[cols_zona1].copy()
        
        # Para ZONA 2
        zona2_clean = zona2[zona2['DIRECCIÓN'].notna() & (zona2['DIRECCIÓN'] != '')].copy()
        zona2_clean['ZONA'] = 'ZONA 2'
        
        # Seleccionar columnas disponibles para ZONA 2
        cols_zona2 = ['DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']
        if 'NOMBRE COMPLETO' in zona2.columns:
            cols_zona2.insert(0, 'NOMBRE COMPLETO')
            zona2_clean = zona2_clean.rename(columns={'NOMBRE COMPLETO': 'NOMBRE_COMPLETO'})
            cols_zona2[0] = 'NOMBRE_COMPLETO'
        else:
            zona2_clean['NOMBRE_COMPLETO'] = 'Sin nombre'
            cols_zona2.insert(0, 'NOMBRE_COMPLETO')
        
        zona2_clean = zona2_clean[cols_zona2].copy()
        
        # Unir ambas zonas
        clientes = pd.concat([zona1_clean, zona2_clean], ignore_index=True)
        
        # Filtrar solo los que NO CONTRATARON o NO RESPONDIERON
        # Filtro más flexible para capturar variaciones
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
    
    def geocodificar_clientes(self, clientes):
        """Geocodifica direcciones de clientes"""
        print("🌍 Geocodificando direcciones de clientes...")
        
        coords = []
        for idx, direccion in enumerate(clientes['DIRECCIÓN']):
            if idx % 50 == 0:
                print(f"Procesando {idx}/{len(clientes)}...")
            
            lat, lon = self.geocodificar_direccion(direccion)
            coords.append({'lat': lat, 'lon': lon})
        
        clientes_coords = clientes.copy()
        clientes_coords['lat'] = [c['lat'] for c in coords]
        clientes_coords['lon'] = [c['lon'] for c in coords]
        
        # Filtrar solo los que se pudieron geocodificar
        clientes_validos = clientes_coords.dropna(subset=['lat', 'lon'])
        
        print(f"📊 Clientes geocodificados: {len(clientes_validos)}/{len(clientes)}")
        
        self.guardar_cache()
        return clientes_validos
    
    def encontrar_naps_cercanas(self, clientes, naps):
        """Encuentra la NAP más cercana para cada cliente"""
        print("📏 Calculando distancias a NAPs...")
        
        resultados = []
        
        for idx, cliente in clientes.iterrows():
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
            return
        
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
        
        # Guardar Excel
        nombre_archivo = f"clientes_prioritarios_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        excel_final.to_excel(nombre_archivo, index=False)
        
        print(f"✅ Excel generado: {nombre_archivo}")
        print(f"📊 Total de clientes prioritarios: {len(excel_final)}")
        
        return nombre_archivo, excel_final
    
    def generar_mapa(self, resultados):
        """Genera mapa interactivo con clientes y NAPs"""
        if resultados.empty:
            print("❌ No hay resultados para generar mapa")
            return
        
        # Centro del mapa (Tandil)
        centro_lat = -37.3217
        centro_lon = -59.1332
        
        mapa = folium.Map(
            location=[centro_lat, centro_lon],
            zoom_start=13,
            tiles='OpenStreetMap'
        )
        
        # Agregar clientes
        for _, cliente in resultados.iterrows():
            popup_cliente = f"""
            <b>{cliente['NOMBRE_CLIENTE']}</b><br>
            📍 {cliente['DIRECCION_CLIENTE']}<br>
            📞 {cliente['CELULAR_CLIENTE']}<br>
            🏷️ {cliente['ZONA']}<br>
            <hr>
            <b>NAP Más Cercana:</b> {cliente['nap_nombre']}<br>
            📏 Distancia: {cliente['distancia_metros']} metros<br>
            🔌 Puertos libres: {cliente['porcentaje_libre']}%
            """
            
            folium.CircleMarker(
                location=[cliente['LAT_CLIENTE'], cliente['LON_CLIENTE']],
                radius=8,
                popup=folium.Popup(popup_cliente, max_width=300),
                color='red',
                fillColor='red',
                fillOpacity=0.7,
                tooltip=f"{cliente['NOMBRE_CLIENTE']} - {cliente['distancia_metros']}m"
            ).add_to(mapa)
        
        # Agregar NAPs únicas
        naps_unicas = resultados.drop_duplicates('nap_id')
        for _, nap in naps_unicas.iterrows():
            popup_nap = f"""
            <b>NAP: {nap['nap_nombre']}</b><br>
            📍 {nap['nap_direccion']}<br>
            🔌 Ocupación: {nap['porcentaje_ocupacion']}%<br>
            ✅ Disponibles: {nap['puertos_disponibles']} puertos
            """
            
            folium.CircleMarker(
                location=[nap['nap_lat'], nap['nap_lon']],
                radius=12,
                popup=folium.Popup(popup_nap, max_width=250),
                color='green',
                fillColor='lightgreen',
                fillOpacity=0.8,
                tooltip=f"NAP: {nap['nap_nombre']}"
            ).add_to(mapa)
        
        # Agregar líneas de conexión
        for _, cliente in resultados.iterrows():
            folium.PolyLine(
                locations=[
                    [cliente['LAT_CLIENTE'], cliente['LON_CLIENTE']],
                    [cliente['nap_lat'], cliente['nap_lon']]
                ],
                color='blue',
                weight=2,
                opacity=0.6
            ).add_to(mapa)
        
        # Agregar leyenda
        leyenda_html = """
        <div style="position: fixed; 
                    bottom: 50px; left: 50px; width: 200px; height: 90px; 
                    background-color: white; border:2px solid grey; z-index:9999; 
                    font-size:14px; padding: 10px">
        <p><span style="color:red;">●</span> Clientes Potenciales</p>
        <p><span style="color:green;">●</span> NAPs Disponibles</p>
        <p><span style="color:blue;">—</span> Conexiones</p>
        </div>
        """
        mapa.get_root().html.add_child(folium.Element(leyenda_html))
        
        # Guardar mapa
        nombre_mapa = f"mapa_clientes_prioritarios_{datetime.now().strftime('%Y%m%d_%H%M')}.html"
        mapa.save(nombre_mapa)
        
        print(f"✅ Mapa generado: {nombre_mapa}")
        return nombre_mapa

def main():
    """Función principal"""
    print("🚀 Iniciando análisis de clientes prioritarios...")
    
    analizador = AnalizadorClientes()
    
    # 1. Cargar datos
    print("\n📂 Cargando datos...")
    clientes = analizador.cargar_datos_clientes()
    naps = analizador.cargar_datos_naps()
    
    if clientes.empty or naps.empty:
        print("❌ No hay datos suficientes para el análisis")
        return
    
    # 2. Geocodificar clientes (tomar una muestra para prueba)
    print("\n🌍 Geocodificando direcciones...")
    # Para prueba inicial, tomar solo 100 clientes
    clientes_muestra = clientes.head(100)
    clientes_coords = analizador.geocodificar_clientes(clientes_muestra)
    
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
    archivo_mapa = analizador.generar_mapa(resultados)
    
    print(f"\n✅ Proceso completado!")
    print(f"📄 Excel: {archivo_excel}")
    print(f"🗺️  Mapa: {archivo_mapa}")
    print(f"🎯 Clientes prioritarios encontrados: {len(resultados)}")

if __name__ == "__main__":
    main()
