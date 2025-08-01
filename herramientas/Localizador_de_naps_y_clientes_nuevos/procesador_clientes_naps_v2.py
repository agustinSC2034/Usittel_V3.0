#!/usr/bin/env python3
"""
PROCESADOR DE CLIENTES Y NAPs - ALGORITMO NUEVO V2.0
====================================================

Este script procesa clientes de una zona específica y les asigna NAPs cercanas.
- Usa los archivos base organizados en excels_con_los_datos_de_partida/
- Algoritmo completamente nuevo sin errores previos
- Cache limpio para geocodificación
- Verificaciones de calidad estrictas

Autor: GitHub Copilot
Fecha: 1 de agosto de 2025
"""

import pandas as pd
import numpy as np
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import json
import os
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProcesadorClientesNAPs:
    """Clase para procesar clientes y asignar NAPs cercanas"""
    
    def __init__(self, zona=1, radio_maximo=150):
        """
        Inicializar procesador
        
        Args:
            zona (int): Zona a procesar (1 o 2)
            radio_maximo (float): Radio máximo en metros para buscar NAPs
        """
        self.zona = zona
        self.radio_maximo = radio_maximo
        self.geolocator = Nominatim(user_agent=f"procesador_clientes_naps_v2_zona{zona}", timeout=15)
        
        # Cache limpio para esta ejecución
        self.cache_file = f"cache_geocoding_zona{zona}_v2.json"
        self.cache = self.cargar_cache()
        
        # Datos
        self.df_clientes = None
        self.df_naps = None
        
        # Estadísticas
        self.stats = {
            'total_clientes': 0,
            'geocodificados_ok': 0,
            'geocodificados_error': 0,
            'con_nap_asignada': 0,
            'sin_nap_cercana': 0,
            'distancias_sospechosas': 0
        }
        
    def cargar_cache(self):
        """Cargar cache de geocodificación o crear uno nuevo"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache = json.load(f)
                logger.info(f"Cache cargado: {len(cache)} direcciones en cache")
                return cache
            except Exception as e:
                logger.warning(f"Error cargando cache: {e}. Creando cache nuevo.")
                return {}
        else:
            logger.info("Creando cache nuevo")
            return {}
    
    def guardar_cache(self):
        """Guardar cache de geocodificación"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
            logger.info(f"Cache guardado: {len(self.cache)} direcciones")
        except Exception as e:
            logger.error(f"Error guardando cache: {e}")
    
    def cargar_datos(self):
        """Cargar datos de clientes y NAPs desde los archivos base"""
        try:
            # Cargar clientes de la zona especificada
            archivo_clientes = f"excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_{self.zona}.xlsx"
            self.df_clientes = pd.read_excel(archivo_clientes)
            
            # Limpiar columnas de clientes
            if 'DIRECCIÓN' in self.df_clientes.columns:
                col_direccion = 'DIRECCIÓN'
            elif 'Dirección' in self.df_clientes.columns:
                col_direccion = 'Dirección'
            elif 'direccion' in self.df_clientes.columns:
                col_direccion = 'direccion'
            else:
                raise ValueError("No se encontró columna de dirección en clientes")
            
            # Filtrar clientes con dirección válida
            self.df_clientes = self.df_clientes[self.df_clientes[col_direccion].notna()].copy()
            self.df_clientes['direccion_limpia'] = self.df_clientes[col_direccion].astype(str).str.strip()
            self.df_clientes = self.df_clientes[self.df_clientes['direccion_limpia'] != ''].copy()
            
            logger.info(f"Clientes ZONA {self.zona} cargados: {len(self.df_clientes)}")
            
            # Cargar NAPs disponibles (≤30% ocupación)
            archivo_naps = "excels_con_los_datos_de_partida/Cajas_naps_con_menos_del_30_de_ocupacion.xlsx"
            self.df_naps = pd.read_excel(archivo_naps)
            
            # Limpiar columnas de NAPs
            if 'Dirección' in self.df_naps.columns:
                col_direccion_nap = 'Dirección'
            elif 'direccion' in self.df_naps.columns:
                col_direccion_nap = 'direccion'
            else:
                raise ValueError("No se encontró columna de dirección en NAPs")
            
            # Filtrar NAPs con dirección válida
            self.df_naps = self.df_naps[self.df_naps[col_direccion_nap].notna()].copy()
            self.df_naps['direccion_limpia'] = self.df_naps[col_direccion_nap].astype(str).str.strip()
            self.df_naps = self.df_naps[self.df_naps['direccion_limpia'] != ''].copy()
            
            logger.info(f"NAPs disponibles cargadas: {len(self.df_naps)}")
            
            self.stats['total_clientes'] = len(self.df_clientes)
            
        except Exception as e:
            logger.error(f"Error cargando datos: {e}")
            raise
    
    def limpiar_direccion(self, direccion):
        """Limpiar y normalizar dirección para geocodificación"""
        if pd.isna(direccion) or direccion == '':
            return None
        
        direccion = str(direccion).strip()
        
        # Remover prefijos comunes
        prefijos_remover = ['USI', 'ENC.', 'ZonaDIC', 'B03/25-Z2', 'nan']
        for prefijo in prefijos_remover:
            if direccion.startswith(prefijo):
                direccion = direccion.replace(prefijo, '').strip()
        
        # Remover caracteres extraños
        direccion = direccion.replace('|', '').strip()
        
        # Si queda vacío después de limpiar
        if not direccion or direccion == 'nan':
            return None
            
        return direccion
    
    def geocodificar_direccion(self, direccion_original):
        """Geocodificar una dirección con cache y reintentos"""
        direccion_limpia = self.limpiar_direccion(direccion_original)
        
        if not direccion_limpia:
            return None, None, "Dirección vacía después de limpiar"
        
        # Buscar en cache
        cache_key = direccion_limpia.lower()
        if cache_key in self.cache:
            resultado = self.cache[cache_key]
            if resultado['status'] == 'ok':
                return resultado['lat'], resultado['lon'], None
            else:
                return None, None, resultado['error']
        
        # Geocodificar con Nominatim
        direccion_completa = f"{direccion_limpia}, Tandil, Buenos Aires, Argentina"
        
        try:
            logger.debug(f"Geocodificando: {direccion_completa}")
            location = self.geolocator.geocode(direccion_completa)
            time.sleep(1.2)  # Rate limiting
            
            if location:
                lat, lon = location.latitude, location.longitude
                
                # Verificar que esté en Tandil (coordenadas aproximadas)
                if not (-37.4 <= lat <= -37.2 and -59.2 <= lon <= -59.0):
                    error = f"Coordenadas fuera de Tandil: {lat}, {lon}"
                    self.cache[cache_key] = {'status': 'error', 'error': error}
                    return None, None, error
                
                # Guardar en cache
                self.cache[cache_key] = {'status': 'ok', 'lat': lat, 'lon': lon}
                return lat, lon, None
            else:
                error = "No encontrada por Nominatim"
                self.cache[cache_key] = {'status': 'error', 'error': error}
                return None, None, error
                
        except Exception as e:
            error = f"Error de geocodificación: {str(e)}"
            self.cache[cache_key] = {'status': 'error', 'error': error}
            return None, None, error
    
    def buscar_nap_mas_cercana(self, lat_cliente, lon_cliente):
        """Buscar la NAP más cercana dentro del radio máximo"""
        mejor_nap = None
        mejor_distancia = float('inf')
        
        cliente_pos = (lat_cliente, lon_cliente)
        
        for idx, nap in self.df_naps.iterrows():
            # Verificar que la NAP tenga coordenadas
            if pd.isna(nap.get('latitud_nap')) or pd.isna(nap.get('longitud_nap')):
                continue
            
            nap_pos = (nap['latitud_nap'], nap['longitud_nap'])
            
            try:
                distancia = geodesic(cliente_pos, nap_pos).meters
                
                # Verificar que esté dentro del radio máximo
                if distancia <= self.radio_maximo and distancia < mejor_distancia:
                    mejor_distancia = distancia
                    mejor_nap = nap.copy()
                    
            except Exception as e:
                logger.warning(f"Error calculando distancia para NAP {nap.get('ID NAP', 'N/A')}: {e}")
                continue
        
        if mejor_nap is not None:
            return mejor_nap, mejor_distancia
        else:
            return None, None
    
    def verificar_distancia_razonable(self, direccion_cliente, direccion_nap, distancia):
        """Verificar si una distancia es razonable dados las direcciones"""
        if distancia < 5:
            # Distancias muy pequeñas son sospechosas a menos que sean exactamente iguales
            if direccion_cliente.lower().strip() != direccion_nap.lower().strip():
                logger.warning(f"Distancia sospechosa: {direccion_cliente} → {direccion_nap}: {distancia:.1f}m")
                return False
        
        return True
    
    def procesar_clientes(self):
        """Procesar todos los clientes y asignar NAPs"""
        logger.info(f"Iniciando procesamiento de ZONA {self.zona}")
        
        # Primero geocodificar todas las NAPs
        logger.info("Geocodificando NAPs...")
        naps_geocodificadas = 0
        
        for idx, nap in self.df_naps.iterrows():
            direccion_nap = nap['direccion_limpia']
            lat, lon, error = self.geocodificar_direccion(direccion_nap)
            
            if lat is not None and lon is not None:
                self.df_naps.at[idx, 'latitud_nap'] = lat
                self.df_naps.at[idx, 'longitud_nap'] = lon
                naps_geocodificadas += 1
            else:
                logger.warning(f"No se pudo geocodificar NAP: {direccion_nap} - {error}")
                self.df_naps.at[idx, 'latitud_nap'] = np.nan
                self.df_naps.at[idx, 'longitud_nap'] = np.nan
        
        logger.info(f"NAPs geocodificadas: {naps_geocodificadas}/{len(self.df_naps)}")
        
        # Procesar clientes
        logger.info("Geocodificando clientes y asignando NAPs...")
        resultados = []
        
        for idx, cliente in self.df_clientes.iterrows():
            if idx % 100 == 0:
                logger.info(f"Procesando cliente {idx+1}/{len(self.df_clientes)}")
            
            direccion_cliente = cliente['direccion_limpia']
            
            # Geocodificar cliente
            lat_cliente, lon_cliente, error = self.geocodificar_direccion(direccion_cliente)
            
            resultado = {
                'direccion_cliente': direccion_cliente,
                'latitud_cliente': lat_cliente,
                'longitud_cliente': lon_cliente,
                'zona': f"ZONA {self.zona}"
            }
            
            if 'NOMBRE COMPLETO' in cliente:
                resultado['nombre_cliente'] = cliente['NOMBRE COMPLETO']
            elif 'Unnamed: 1' in cliente:
                resultado['nombre_cliente'] = cliente['Unnamed: 1']
            else:
                resultado['nombre_cliente'] = 'N/A'
            
            if lat_cliente is None or lon_cliente is None:
                # Error de geocodificación
                resultado.update({
                    'nap_asignada': 'Error al geolocalizar',
                    'direccion_nap': error or 'Error desconocido',
                    'latitud_nap': np.nan,
                    'longitud_nap': np.nan,
                    'distancia_metros': np.nan,
                    'ocupacion_nap': np.nan
                })
                self.stats['geocodificados_error'] += 1
            else:
                # Buscar NAP más cercana
                nap_cercana, distancia = self.buscar_nap_mas_cercana(lat_cliente, lon_cliente)
                
                if nap_cercana is not None:
                    # Verificar distancia razonable
                    distancia_razonable = self.verificar_distancia_razonable(
                        direccion_cliente, nap_cercana['direccion_limpia'], distancia
                    )
                    
                    if not distancia_razonable:
                        self.stats['distancias_sospechosas'] += 1
                    
                    resultado.update({
                        'nap_asignada': nap_cercana.get('Nomenclatura', 'N/A'),
                        'direccion_nap': nap_cercana['direccion_limpia'],
                        'latitud_nap': nap_cercana['latitud_nap'],
                        'longitud_nap': nap_cercana['longitud_nap'],
                        'distancia_metros': round(distancia, 1),
                        'ocupacion_nap': nap_cercana.get('% UTILIZACIÓN', 0)
                    })
                    self.stats['con_nap_asignada'] += 1
                else:
                    resultado.update({
                        'nap_asignada': 'Sin NAPs cercanas',
                        'direccion_nap': f'No hay NAPs en {self.radio_maximo}m',
                        'latitud_nap': np.nan,
                        'longitud_nap': np.nan,
                        'distancia_metros': np.nan,
                        'ocupacion_nap': np.nan
                    })
                    self.stats['sin_nap_cercana'] += 1
                
                self.stats['geocodificados_ok'] += 1
            
            resultados.append(resultado)
        
        # Guardar cache
        self.guardar_cache()
        
        return pd.DataFrame(resultados)
    
    def generar_reporte_estadisticas(self):
        """Generar reporte de estadísticas del procesamiento"""
        total = self.stats['total_clientes']
        
        print(f"\n📊 ESTADÍSTICAS DE PROCESAMIENTO - ZONA {self.zona}")
        print("="*60)
        print(f"Total clientes procesados: {total}")
        print(f"Geocodificados exitosamente: {self.stats['geocodificados_ok']} ({self.stats['geocodificados_ok']/total*100:.1f}%)")
        print(f"Errores de geocodificación: {self.stats['geocodificados_error']} ({self.stats['geocodificados_error']/total*100:.1f}%)")
        print(f"Con NAP asignada: {self.stats['con_nap_asignada']} ({self.stats['con_nap_asignada']/total*100:.1f}%)")
        print(f"Sin NAP cercana (<{self.radio_maximo}m): {self.stats['sin_nap_cercana']} ({self.stats['sin_nap_cercana']/total*100:.1f}%)")
        print(f"Distancias sospechosas detectadas: {self.stats['distancias_sospechosas']}")
    
    def guardar_excel(self, df_resultados):
        """Guardar resultados en Excel"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        archivo_salida = f"clientes_ZONA{self.zona}_PROCESADOS_{timestamp}.xlsx"
        
        try:
            df_resultados.to_excel(archivo_salida, index=False)
            logger.info(f"Resultados guardados en: {archivo_salida}")
            return archivo_salida
        except Exception as e:
            logger.error(f"Error guardando Excel: {e}")
            return None

def main():
    """Función principal"""
    print("🚀 PROCESADOR DE CLIENTES Y NAPs V2.0")
    print("="*50)
    
    # Solicitar zona a procesar
    while True:
        try:
            zona = int(input("¿Qué zona quieres procesar? (1 o 2): "))
            if zona in [1, 2]:
                break
            else:
                print("❌ Zona debe ser 1 o 2")
        except ValueError:
            print("❌ Ingresa un número válido")
    
    # Crear procesador
    procesador = ProcesadorClientesNAPs(zona=zona)
    
    try:
        # Cargar datos
        procesador.cargar_datos()
        
        # Procesar clientes
        df_resultados = procesador.procesar_clientes()
        
        # Generar estadísticas
        procesador.generar_reporte_estadisticas()
        
        # Guardar resultados
        archivo_salida = procesador.guardar_excel(df_resultados)
        
        if archivo_salida:
            print(f"\n✅ PROCESAMIENTO COMPLETADO")
            print(f"📁 Archivo generado: {archivo_salida}")
        else:
            print(f"\n❌ ERROR al guardar archivo")
            
    except Exception as e:
        logger.error(f"Error en procesamiento principal: {e}")
        print(f"\n❌ ERROR: {e}")

if __name__ == "__main__":
    main()
