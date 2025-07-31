#!/usr/bin/env python3
"""
Script corregido para generar lista priorizada de clientes potenciales.
Soluciona problemas de:
- Solo procesaba 100 clientes (muestra)
- Solo aparecían clientes de ZONA 1
- Direcciones mal formateadas para geocodificación
- Filtrado de texto "dpto", "casa", etc.
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
CACHE_GEOCODING = "cache_geocoding_corregido.json"

class AnalizadorClientesCorregido:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_analyzer_v2")
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
    
    def limpiar_direccion(self, direccion):
        """Limpia la dirección SOLO para geocodificación - conserva original para Excel"""
        if not direccion or pd.isna(direccion):
            return None
            
        direccion_str = str(direccion).strip()
        
        # Convertir a minúsculas para análisis
        direccion_lower = direccion_str.lower()
        
        # CORREGIR: Separar número pegado a "TANDIL"
        # Ejemplo: "ALSINA 405TANDIL" → "ALSINA 405"
        import re
        direccion_lower = re.sub(r'(\d+)tandil', r'\1', direccion_lower)
        
        # Remover palabras innecesarias para geocodificación
        palabras_remover = [
            'dpto', 'dto', 'departamento', 'depto',
            'casa', 'piso', 'ph', 'local', 'oficina',
            'primer piso', 'planta alta', 'planta baja',
            'frente', 'fondo', 'contrafrente'
        ]
        
        # Buscar y remover estas palabras (con espacios o comillas)
        for palabra in palabras_remover:
            # Patrones comunes: "palabra", 'palabra', palabra, (palabra)
            patrones = [
                f'"{palabra}"', f"'{palabra}'", f'({palabra})', 
                f' {palabra} ', f' {palabra}$', f'^{palabra} ',
                f' "{palabra}"', f" '{palabra}'", f' ({palabra})'
            ]
            
            for patron in patrones:
                direccion_lower = direccion_lower.replace(patron, ' ')
        
        # Limpiar espacios múltiples
        direccion_limpia = re.sub(r'\s+', ' ', direccion_lower).strip()
        
        # Si la dirección quedó muy corta, usar la original
        if len(direccion_limpia) < 5:
            return direccion_str
        
        # Capitalizar primera letra de cada palabra
        direccion_limpia = ' '.join(word.capitalize() for word in direccion_limpia.split())
        
        return direccion_limpia
    
    def geocodificar_direccion(self, direccion):
        """Obtiene coordenadas de una dirección, usando cache si está disponible"""
        direccion_limpia = self.limpiar_direccion(direccion)
        
        if not direccion_limpia:
            return None, None
        
        # Buscar en cache
        if direccion_limpia in self.cache_coords:
            coords = self.cache_coords[direccion_limpia]
            return coords['lat'], coords['lon']
        
        try:
            # Agregar "Tandil, Buenos Aires, Argentina" para mejor precisión
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
        """Carga y procesa datos de clientes de ambas zonas - TODOS los clientes"""
        archivo = "base de datos copia.xlsx"
        
        try:
            # Leer nombres de hojas primero
            excel_file = pd.ExcelFile(archivo)
            print(f"📋 Hojas disponibles: {excel_file.sheet_names}")
            
            # Cargar ZONA 1 y ZONA 2
            zona1 = pd.read_excel(archivo, sheet_name='ZONA 1')
            zona2 = pd.read_excel(archivo, sheet_name='ZONA 2')
            
            print(f"📊 Filas en ZONA 1: {len(zona1)}")
            print(f"📊 Filas en ZONA 2: {len(zona2)}")
            print("📋 Columnas ZONA 1:", zona1.columns.tolist())
            print("📋 Columnas ZONA 2:", zona2.columns.tolist())
            
            # Procesar ZONA 1
            zona1_clean = zona1[zona1['DIRECCIÓN'].notna() & (zona1['DIRECCIÓN'] != '')].copy()
            zona1_clean['ZONA'] = 'ZONA 1'
            
            # Buscar columna de nombre en ZONA 1
            if 'Unnamed: 1' in zona1.columns:
                zona1_clean['NOMBRE_COMPLETO'] = zona1['Unnamed: 1']
            elif 'NOMBRE' in zona1.columns:
                zona1_clean['NOMBRE_COMPLETO'] = zona1['NOMBRE']
            else:
                zona1_clean['NOMBRE_COMPLETO'] = 'Sin nombre ZONA 1'
            
            # Seleccionar columnas para ZONA 1
            zona1_final = zona1_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
            
            # Procesar ZONA 2
            zona2_clean = zona2[zona2['DIRECCIÓN'].notna() & (zona2['DIRECCIÓN'] != '')].copy()
            zona2_clean['ZONA'] = 'ZONA 2'
            
            # Buscar columna de nombre en ZONA 2
            if 'NOMBRE COMPLETO' in zona2.columns:
                zona2_clean['NOMBRE_COMPLETO'] = zona2['NOMBRE COMPLETO']
            elif 'NOMBRE' in zona2.columns:
                zona2_clean['NOMBRE_COMPLETO'] = zona2['NOMBRE']
            else:
                zona2_clean['NOMBRE_COMPLETO'] = 'Sin nombre ZONA 2'
            
            # Seleccionar columnas para ZONA 2
            zona2_final = zona2_clean[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
            
            # Unir ambas zonas
            clientes = pd.concat([zona1_final, zona2_final], ignore_index=True)
            
            print(f"📊 Total clientes unidos: {len(clientes)}")
            print(f"📊 ZONA 1: {len(zona1_final)}")
            print(f"📊 ZONA 2: {len(zona2_final)}")
            
            # Filtrar solo los que NO CONTRATARON o NO RESPONDIERON
            mask = clientes['ESTADO'].str.contains('NO', case=False, na=False)
            clientes_filtrados = clientes[mask].copy()
            
            print(f"📊 Clientes que no contrataron: {len(clientes_filtrados)}")
            print(f"📊 De ZONA 1: {len(clientes_filtrados[clientes_filtrados['ZONA'] == 'ZONA 1'])}")
            print(f"📊 De ZONA 2: {len(clientes_filtrados[clientes_filtrados['ZONA'] == 'ZONA 2'])}")
            
            return clientes_filtrados
            
        except Exception as e:
            print(f"❌ Error cargando datos de clientes: {e}")
            return pd.DataFrame()
    
    def cargar_datos_naps(self):
        """Carga datos de NAPs"""
        archivo_naps = "../Localizador_de_naps/naps.xlsx"
        
        try:
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
            
        except Exception as e:
            print(f"❌ Error cargando datos de NAPs: {e}")
            return pd.DataFrame()
    
    def geocodificar_clientes(self, clientes):
        """Geocodifica direcciones de clientes - TODOS, no solo 100"""
        print(f"🌍 Geocodificando {len(clientes)} direcciones de clientes...")
        
        coords = []
        total = len(clientes)
        
        for idx, row in clientes.iterrows():
            if idx % 100 == 0:
                print(f"Procesando {idx}/{total}...")
            
            direccion = row['DIRECCIÓN']
            lat, lon = self.geocodificar_direccion(direccion)
            coords.append({'lat': lat, 'lon': lon})
        
        clientes_coords = clientes.copy()
        clientes_coords['lat'] = [c['lat'] for c in coords]
        clientes_coords['lon'] = [c['lon'] for c in coords]
        
        # Filtrar solo los que se pudieron geocodificar
        clientes_validos = clientes_coords.dropna(subset=['lat', 'lon'])
        
        print(f"📊 Clientes geocodificados: {len(clientes_validos)}/{len(clientes)}")
        print(f"📊 De ZONA 1: {len(clientes_validos[clientes_validos['ZONA'] == 'ZONA 1'])}")
        print(f"📊 De ZONA 2: {len(clientes_validos[clientes_validos['ZONA'] == 'ZONA 2'])}")
        
        self.guardar_cache()
        return clientes_validos
    
    def encontrar_naps_cercanas(self, clientes, naps):
        """Encuentra la NAP más cercana para cada cliente"""
        print("📏 Calculando distancias a NAPs...")
        
        resultados = []
        
        for idx, cliente in clientes.iterrows():
            if idx % 100 == 0:
                print(f"Procesando distancias {idx}/{len(clientes)}...")
                
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
    
    def generar_excel_final_completo(self, clientes_todos, resultados_geocodificados):
        """Genera Excel final con TODOS los clientes - incluye errores de geocodificación"""
        print(f"📊 Generando Excel COMPLETO con {len(clientes_todos)} clientes...")
        
        # Crear DataFrame base con todos los clientes
        excel_completo = []
        
        for idx, cliente in clientes_todos.iterrows():
            # Buscar si este cliente tiene resultados de geocodificación
            resultado_geo = resultados_geocodificados[
                (resultados_geocodificados['NOMBRE_CLIENTE'] == cliente['NOMBRE_COMPLETO']) &
                (resultados_geocodificados['DIRECCION_CLIENTE'] == cliente['DIRECCIÓN']) &
                (resultados_geocodificados['ZONA'] == cliente['ZONA'])
            ]
            
            if not resultado_geo.empty:
                # Cliente geocodificado con NAP cercana
                row = resultado_geo.iloc[0]
                registro = {
                    'Nombre del Cliente': row['NOMBRE_CLIENTE'],
                    'Dirección del Cliente': row['DIRECCION_CLIENTE'],  # Dirección ORIGINAL
                    'Celular': row['CELULAR_CLIENTE'],
                    'Zona': row['ZONA'],
                    'Estado Original': row['ESTADO_ORIGINAL'],
                    'NAP Más Cercana': row['nap_nombre'],
                    'Dirección de la NAP': row['nap_direccion'],
                    'Distancia (metros)': row['distancia_metros'],
                    'Puertos Disponibles': row['puertos_disponibles'],
                    'Porcentaje Ocupación (%)': row['porcentaje_ocupacion']
                }
            else:
                # Cliente que NO se pudo geocodificar o sin NAPs cercanas
                registro = {
                    'Nombre del Cliente': cliente['NOMBRE_COMPLETO'],
                    'Dirección del Cliente': cliente['DIRECCIÓN'],  # Dirección ORIGINAL
                    'Celular': cliente['CELULAR'],
                    'Zona': cliente['ZONA'],
                    'Estado Original': cliente['ESTADO'],
                    'NAP Más Cercana': 'Error al geolocalizar',
                    'Dirección de la NAP': 'N/A',
                    'Distancia (metros)': 'N/A',
                    'Puertos Disponibles': 'N/A',
                    'Porcentaje Ocupación (%)': 'N/A'
                }
            
            excel_completo.append(registro)
        
        # Crear DataFrame final
        df_final = pd.DataFrame(excel_completo)
        
        # Ordenar: primero los que tienen NAP, luego los errores
        df_final['orden'] = df_final['NAP Más Cercana'].apply(lambda x: 0 if x != 'Error al geolocalizar' else 1)
        df_final = df_final.sort_values(['orden', 'Distancia (metros)']).drop('orden', axis=1)
        
        # Guardar Excel
        nombre_archivo = f"clientes_prioritarios_COMPLETO_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        df_final.to_excel(nombre_archivo, index=False)
        
        # Estadísticas finales
        total_clientes = len(df_final)
        con_nap = len(df_final[df_final['NAP Más Cercana'] != 'Error al geolocalizar'])
        errores_geo = len(df_final[df_final['NAP Más Cercana'] == 'Error al geolocalizar'])
        
        print(f"✅ Excel COMPLETO generado: {nombre_archivo}")
        print(f"📊 Total clientes en Excel: {total_clientes}")
        print(f"📊 Con NAPs cercanas: {con_nap}")
        print(f"📊 Errores de geocodificación: {errores_geo}")
        
        # Estadísticas por zona
        stats_zona = df_final['Zona'].value_counts()
        print(f"📊 Distribución por zona:")
        for zona, count in stats_zona.items():
            print(f"   {zona}: {count} clientes")
        
        # Estadísticas de éxito/error por zona
        stats_zona_nap = df_final.groupby(['Zona', 'NAP Más Cercana'])['Zona'].count().unstack(fill_value=0)
        if 'Error al geolocalizar' in stats_zona_nap.columns:
            print(f"📊 Errores por zona:")
            for zona in stats_zona_nap.index:
                errores = stats_zona_nap.loc[zona, 'Error al geolocalizar']
                total_zona = stats_zona[zona]
                exitos = total_zona - errores
                print(f"   {zona}: {exitos} exitosos, {errores} errores")
        
        return nombre_archivo, df_final

def main():
    """Función principal corregida - procesa TODOS los clientes"""
    print("🚀 Iniciando análisis COMPLETO de clientes prioritarios...")
    print("✅ Procesará TODOS los ~3300 clientes")
    print("✅ Incluirá ambas zonas")
    print("✅ Limpiará direcciones SOLO para geocodificar")
    print("✅ Excel final con direcciones ORIGINALES")
    print("✅ Incluye clientes con errores de geocodificación")
    
    analizador = AnalizadorClientesCorregido()
    
    # 1. Cargar datos
    print("\n📂 Cargando datos...")
    clientes_todos = analizador.cargar_datos_clientes()
    naps = analizador.cargar_datos_naps()
    
    if clientes_todos.empty or naps.empty:
        print("❌ No hay datos suficientes para el análisis")
        return
    
    # 2. Geocodificar TODOS los clientes
    print("\n🌍 Geocodificando direcciones...")
    clientes_coords = analizador.geocodificar_clientes(clientes_todos)
    
    print(f"📊 Clientes originales: {len(clientes_todos)}")
    print(f"📊 Clientes geocodificados: {len(clientes_coords)}")
    print(f"📊 Errores de geocodificación: {len(clientes_todos) - len(clientes_coords)}")
    
    # 3. Encontrar NAPs cercanas (solo para los geocodificados)
    resultados = pd.DataFrame()
    if not clientes_coords.empty:
        print("\n📏 Buscando NAPs cercanas...")
        resultados = analizador.encontrar_naps_cercanas(clientes_coords, naps)
        print(f"📊 Clientes con NAPs cercanas: {len(resultados)}")
    
    # 4. Generar Excel final COMPLETO (todos los clientes)
    print("\n📊 Generando Excel COMPLETO...")
    archivo_excel, excel_data = analizador.generar_excel_final_completo(clientes_todos, resultados)
    
    print(f"\n✅ Proceso completado!")
    print(f"📄 Excel COMPLETO: {archivo_excel}")
    print(f"🎯 Total clientes en Excel: {len(excel_data)}")
    print(f"📍 Con NAPs cercanas: {len(resultados)}")
    print(f"⚠️  Con errores de geocodificación: {len(excel_data[excel_data['NAP Más Cercana'] == 'Error al geolocalizar'])}")

if __name__ == "__main__":
    main()
