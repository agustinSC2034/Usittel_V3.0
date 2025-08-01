#!/usr/bin/env python3
"""
Script FINAL para procesar ZONA 2 usando NAPs corregidas manualmente
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import json
import os
from datetime import datetime
import re

class ProcesadorZona2Final:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_zona2_final", timeout=15)
        self.cache_geocoding = {}
        self.cache_file = "cache_zona2_final.json"
        self.cargar_cache()
        
    def cargar_cache(self):
        """Cargar cache de geocodificación si existe"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    self.cache_geocoding = json.load(f)
                print(f"✅ Cache cargado: {len(self.cache_geocoding)} direcciones")
            else:
                print("📝 Creando nuevo cache de geocodificación")
        except Exception as e:
            print(f"⚠️  Error cargando cache: {e}")
            self.cache_geocoding = {}
    
    def guardar_cache(self):
        """Guardar cache de geocodificación"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache_geocoding, f, ensure_ascii=False, indent=2)
            print(f"💾 Cache guardado: {len(self.cache_geocoding)} direcciones")
        except Exception as e:
            print(f"❌ Error guardando cache: {e}")
    
    def normalizar_nombre_calle(self, calle):
        """Normalizar nombre de calle para comparaciones mejoradas"""
        if not calle:
            return ""
        
        calle = str(calle).upper().strip()
        
        # Diccionario de normalizaciones comunes
        normalizaciones = {
            r'\bAV\.?\s*': 'AVENIDA ',
            r'\bAVDA\.?\s*': 'AVENIDA ',
            r'\bAVE\.?\s*': 'AVENIDA ',
            r'\bGRAL\.?\s*': 'GENERAL ',
            r'\bDR\.?\s*': 'DOCTOR ',
            r'\bSTA\.?\s*': 'SANTA ',
            r'\bPJE\.?\s*': 'PASAJE ',
            r'\bPQUE\.?\s*': 'PARQUE ',
            r'\bBV\.?\s*': 'BOULEVARD ',
            r'\bBLVD\.?\s*': 'BOULEVARD ',
            r'\b1RA\.?\s*': 'PRIMERA ',
            r'\bDE\s+MAYO\b': 'DE MAYO',
            r'\bDE\s+ABRIL\b': 'DE ABRIL',
            r'\bDE\s+JULIO\b': 'DE JULIO',
            r'\bDE\s+SEPTIEMBRE\b': 'DE SEPTIEMBRE',
        }
        
        # Aplicar normalizaciones
        for patron, reemplazo in normalizaciones.items():
            calle = re.sub(patron, reemplazo, calle)
        
        # Remover espacios extra y limpiar
        calle = ' '.join(calle.split())
        
        return calle

    def extraer_calles_de_direccion(self, direccion):
        """Extraer nombres de calles de una dirección"""
        if not direccion:
            return []
        
        direccion = str(direccion).upper().strip()
        
        # Limpiar número y departamentos
        direccion_limpia = re.sub(r'\b\d+\b', '', direccion)  # Remover números
        direccion_limpia = re.sub(r'(DPTO|DTO|DEPTO|DEPARTAMENTO|PH|LOCAL|OFICINA|TALLER|CASA|INT\.?|INTERNO|INTERNA|PISO|PLANTA|TANDIL).*', '', direccion_limpia, flags=re.IGNORECASE)
        direccion_limpia = re.sub(r'[^\w\sáéíóúñü]', ' ', direccion_limpia)  # Remover caracteres especiales pero preservar acentos
        
        # Separar por "Y" si hay intersección
        if ' Y ' in direccion_limpia:
            calles = [calle.strip() for calle in direccion_limpia.split(' Y ')]
        else:
            calles = [direccion_limpia.strip()]
        
        # Normalizar y filtrar calles válidas
        calles_normalizadas = []
        for calle in calles:
            calle_normalizada = self.normalizar_nombre_calle(calle)
            if len(calle_normalizada) > 3:  # Al menos 4 caracteres
                calles_normalizadas.append(calle_normalizada)
        
        return calles_normalizadas
    
    def cliente_compatible_con_nap(self, direccion_cliente, direccion_nap):
        """Verificar si el cliente puede conectarse a la NAP según ubicación de calles"""
        calles_cliente = self.extraer_calles_de_direccion(direccion_cliente)
        calles_nap = self.extraer_calles_de_direccion(direccion_nap)
        
        if not calles_cliente or not calles_nap:
            return False
        
        # Debug: mostrar calles extraídas
        print(f"      🔍 Cliente: {calles_cliente}")
        print(f"      🔍 NAP: {calles_nap}")
        
        # Verificar si hay coincidencia en alguna calle
        for calle_cliente in calles_cliente:
            for calle_nap in calles_nap:
                # Coincidencia exacta
                if calle_cliente == calle_nap:
                    print(f"      ✅ Coincidencia exacta: '{calle_cliente}'")
                    return True
                
                # Coincidencia parcial mejorada (una contiene a la otra con al menos 5 caracteres)
                if len(calle_cliente) >= 5 and len(calle_nap) >= 5:
                    if calle_cliente in calle_nap or calle_nap in calle_cliente:
                        print(f"      ✅ Coincidencia parcial: '{calle_cliente}' ⟷ '{calle_nap}'")
                        return True
                
                # Verificar coincidencia de palabras clave significativas
                palabras_cliente = set(calle_cliente.split())
                palabras_nap = set(calle_nap.split())
                
                # Palabras significativas (>4 caracteres y no números)
                palabras_significativas = {
                    p for p in palabras_cliente & palabras_nap 
                    if len(p) > 4 and not p.isdigit()
                }
                
                if palabras_significativas:
                    print(f"      ✅ Coincidencia por palabras: {palabras_significativas}")
                    return True
        
        print(f"      ❌ Sin coincidencia de calles")
        return False

    def limpiar_direccion_cliente(self, direccion):
        """Limpiar dirección de cliente para geocodificación"""
        if pd.isna(direccion):
            return None
        
        direccion = str(direccion).strip()
        
        # Limpiar referencias explícitas a Tandil
        direccion = re.sub(r'\b(TANDIL|Tandil)\b', '', direccion).strip()
        
        # Normalizar abreviaciones comunes ANTES de limpiar
        normalizaciones = {
            r'\bAV\.?\s+': 'Avenida ',
            r'\bAVDA\.?\s+': 'Avenida ',
            r'\bGRAL\.?\s+': 'General ',
            r'\bDR\.?\s+': 'Doctor ',
            r'\bSTA\.?\s+': 'Santa ',
            r'\b1RA\.?\s+JUNTA\b': 'Primera Junta',
            r'\bSAN\.?\s+': 'San ',
        }
        
        for patron, reemplazo in normalizaciones.items():
            direccion = re.sub(patron, reemplazo, direccion, flags=re.IGNORECASE)
        
        # Remover departamentos, PH, etc - SOLO al final
        sufijos_especificos = [
            r'\s*[-–]\s*(DPTO|DTO|DEPTO|DEPARTAMENTO)\s*\w*$',
            r'\s+(DPTO|DTO|DEPTO|DEPARTAMENTO)\s*\w*$',
            r'\s*[-–]\s*(CASA|LOCAL|OFICINA|TALLER)\s*\w*$',
            r'\s+(CASA|LOCAL|OFICINA|TALLER)\s*\w*$',
            r'\s*[-–]\s*(INT\.?|INTERNO|INTERNA)\s*\w*$',
            r'\s+(INT\.?|INTERNO|INTERNA)\s*\w*$',
            r'\s*[-–]\s*PH\s*\w*$',
            r'\s+PH\s*\w*$',
        ]
        
        for patron in sufijos_especificos:
            direccion = re.sub(patron, '', direccion, flags=re.IGNORECASE)
        
        # Normalizar espacios
        direccion = ' '.join(direccion.split())
        
        return direccion if direccion else None
    
    def geocodificar_direccion(self, direccion_original):
        """Geocodificar una dirección con cache"""
        direccion_limpia = self.limpiar_direccion_cliente(direccion_original)
        
        if not direccion_limpia:
            return None, None, "Dirección vacía"
        
        # Buscar en cache
        if direccion_limpia in self.cache_geocoding:
            resultado = self.cache_geocoding[direccion_limpia]
            if resultado['exito']:
                return resultado['lat'], resultado['lon'], "Cache"
            else:
                return None, None, resultado['error']
        
        # Geocodificar
        direccion_completa = f"{direccion_limpia}, Tandil, Buenos Aires, Argentina"
        
        try:
            print(f"  🌍 Geocodificando: {direccion_completa}")
            location = self.geolocator.geocode(direccion_completa)
            time.sleep(1.2)  # Rate limiting
            
            if location:
                lat, lon = location.latitude, location.longitude
                
                # Guardar en cache
                self.cache_geocoding[direccion_limpia] = {
                    'exito': True,
                    'lat': lat,
                    'lon': lon,
                    'direccion_completa': direccion_completa
                }
                
                return lat, lon, "Geocodificado"
            else:
                # Guardar fallo en cache
                self.cache_geocoding[direccion_limpia] = {
                    'exito': False,
                    'error': 'No encontrado'
                }
                return None, None, "No encontrado"
                
        except Exception as e:
            error_msg = str(e)
            print(f"    ❌ Error: {error_msg}")
            
            # Guardar error en cache
            self.cache_geocoding[direccion_limpia] = {
                'exito': False,
                'error': error_msg
            }
            
            return None, None, error_msg
    
    def cargar_datos(self):
        """Cargar datos de clientes y NAPs"""
        print("📂 Cargando datos de partida...")
        
        # Cargar clientes ZONA 2
        clientes_file = "excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_2.xlsx"
        try:
            self.df_clientes = pd.read_excel(clientes_file)
            print(f"✅ Clientes ZONA 2: {len(self.df_clientes)} registros")
            print(f"   Columnas: {list(self.df_clientes.columns)}")
        except Exception as e:
            print(f"❌ Error cargando clientes: {e}")
            return False
        
        # Cargar NAPs CORREGIDAS (archivo_final_naps.xlsx)
        naps_file = "excels_con_los_datos_de_partida/archivo_final_naps.xlsx"
        try:
            self.df_naps = pd.read_excel(naps_file)
            print(f"✅ NAPs corregidas: {len(self.df_naps)} registros")
            print(f"   Columnas: {list(self.df_naps.columns)}")
            
            # Verificar que todas las NAPs tienen coordenadas
            coordenadas_validas = self.df_naps['Latitud'].notna().sum()
            print(f"   📍 NAPs geocodificadas: {coordenadas_validas}/{len(self.df_naps)} ({coordenadas_validas/len(self.df_naps)*100:.1f}%)")
            
        except Exception as e:
            print(f"❌ Error cargando NAPs: {e}")
            return False
        
        return True
    
    def procesar_clientes(self):
        """Procesar geocodificación de clientes y asignación de NAPs"""
        print(f"\n🏠 PROCESANDO {len(self.df_clientes)} CLIENTES...")
        print("="*50)
        
        resultados = []
        
        for i, cliente in self.df_clientes.iterrows():
            print(f"\n[{i+1}/{len(self.df_clientes)}] Procesando cliente...")
            
            # Obtener datos del cliente
            direccion_cliente = cliente['DIRECCIÓN'] if 'DIRECCIÓN' in cliente else None
            nombre_cliente = cliente['NOMBRE COMPLETO'] if 'NOMBRE COMPLETO' in cliente else "Sin nombre"
            celular_cliente = cliente['CELULAR'] if 'CELULAR' in cliente else "Sin celular"
            email_cliente = cliente['E-MAIL'] if 'E-MAIL' in cliente else "Sin email"
            
            print(f"  📍 Dirección: {direccion_cliente}")
            print(f"  👤 Nombre: {nombre_cliente}")
            print(f"  📱 Celular: {celular_cliente}")
            print(f"  📧 Email: {email_cliente}")
            
            # Geocodificar cliente
            lat_cliente, lon_cliente, status_cliente = self.geocodificar_direccion(direccion_cliente)
            
            if lat_cliente is None:
                print(f"    ❌ Error geocodificando: {status_cliente}")
                resultados.append({
                    'direccion_cliente': direccion_cliente,
                    'nombre_cliente': nombre_cliente,
                    'celular_cliente': celular_cliente,
                    'email_cliente': email_cliente,
                    'latitud_cliente': None,
                    'longitud_cliente': None,
                    'status_geocoding': status_cliente,
                    'nap_asignada': 'Error al geocodificar',
                    'direccion_nap': None,
                    'latitud_nap': None,
                    'longitud_nap': None,
                    'distancia_metros': None,
                    'ocupacion_nap_porcentaje': None,
                    'puertos_ocupados': None,
                    'puertos_disponibles': None,
                    'puertos_totales': None
                })
                continue
            
            print(f"    ✅ Cliente geocodificado: {lat_cliente:.6f}, {lon_cliente:.6f}")
            
            # Buscar NAP más cercana
            nap_cercana = self.buscar_nap_cercana(lat_cliente, lon_cliente, direccion_cliente)
            
            resultado = {
                'direccion_cliente': direccion_cliente,
                'nombre_cliente': nombre_cliente,
                'celular_cliente': celular_cliente,
                'email_cliente': email_cliente,
                'latitud_cliente': lat_cliente,
                'longitud_cliente': lon_cliente,
                'status_geocoding': status_cliente,
            }
            
            if nap_cercana:
                resultado.update(nap_cercana)
                print(f"    🎯 NAP asignada: {nap_cercana['nap_asignada']} ({nap_cercana['distancia_metros']:.1f}m)")
            else:
                resultado.update({
                    'nap_asignada': 'Sin NAPs cercanas',
                    'direccion_nap': None,
                    'latitud_nap': None,
                    'longitud_nap': None,
                    'distancia_metros': None,
                    'ocupacion_nap_porcentaje': None,
                    'puertos_ocupados': None,
                    'puertos_disponibles': None,
                    'puertos_totales': None
                })
                print(f"    ⚠️  Sin NAPs cercanas (< 150m) o en calles compatibles")
            
            resultados.append(resultado)
            
            # Guardar cache cada 10 clientes
            if (i + 1) % 10 == 0:
                self.guardar_cache()
                print(f"    💾 Cache guardado (progreso: {i+1}/{len(self.df_clientes)})")
        
        return resultados
    
    def buscar_nap_cercana(self, lat_cliente, lon_cliente, direccion_cliente):
        """Buscar la NAP más cercana usando coordenadas corregidas"""
        naps_cercanas = []
        cliente_pos = (lat_cliente, lon_cliente)
        
        for i, nap in self.df_naps.iterrows():
            # Usar las coordenadas corregidas directamente
            lat_nap = nap['Latitud']
            lon_nap = nap['Longitud']
            direccion_nap = nap['Dirección']
            nomenclatura_nap = nap['NAP']
            ocupacion_porcentaje = nap['Ocupacion_caja'] * 100  # Convertir a porcentaje
            puertos_ocupados = nap['P_Utilizados']
            puertos_disponibles = nap['P_Disponibles']
            puertos_totales = nap['P_Totales']
            
            # Verificar que tiene coordenadas válidas
            if pd.isna(lat_nap) or pd.isna(lon_nap):
                continue
            
            # Calcular distancia
            nap_pos = (lat_nap, lon_nap)
            distancia = geodesic(cliente_pos, nap_pos).meters
            
            # Filtrar por radio (≤ 150m)
            if distancia <= 150:
                # Verificar compatibilidad de calles
                if self.cliente_compatible_con_nap(direccion_cliente, direccion_nap):
                    naps_cercanas.append({
                        'nap_asignada': nomenclatura_nap,
                        'direccion_nap': direccion_nap,
                        'latitud_nap': lat_nap,
                        'longitud_nap': lon_nap,
                        'distancia_metros': distancia,
                        'ocupacion_nap_porcentaje': ocupacion_porcentaje,
                        'puertos_ocupados': puertos_ocupados,
                        'puertos_disponibles': puertos_disponibles,
                        'puertos_totales': puertos_totales
                    })
                else:
                    print(f"      ⚠️  NAP {nomenclatura_nap} descartada: calles incompatibles ({distancia:.1f}m)")
            else:
                # Solo mostrar NAPs muy cercanas que fueron descartadas por distancia
                if distancia <= 200:
                    print(f"      ⚠️  NAP {nomenclatura_nap} descartada: distancia {distancia:.1f}m > 150m")
        
        # Devolver la más cercana con mayor disponibilidad
        if naps_cercanas:
            # Ordenar por distancia primero, luego por mayor disponibilidad
            naps_ordenadas = sorted(naps_cercanas, key=lambda x: (x['distancia_metros'], -x['puertos_disponibles']))
            return naps_ordenadas[0]
        else:
            return None
    
    def guardar_excel(self, resultados):
        """Guardar resultados en Excel"""
        df_resultados = pd.DataFrame(resultados)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"clientes_ZONA2_FINAL_{timestamp}.xlsx"
        
        try:
            df_resultados.to_excel(filename, index=False)
            print(f"\n💾 EXCEL GUARDADO: {filename}")
            
            # Estadísticas detalladas
            total = len(df_resultados)
            con_naps = len(df_resultados[df_resultados['nap_asignada'].notna() & 
                                       ~df_resultados['nap_asignada'].isin(['Error al geocodificar', 'Sin NAPs cercanas'])])
            sin_geocoding = len(df_resultados[df_resultados['nap_asignada'] == 'Error al geocodificar'])
            sin_naps = len(df_resultados[df_resultados['nap_asignada'] == 'Sin NAPs cercanas'])
            
            print(f"\n📊 ESTADÍSTICAS FINALES:")
            print(f"   Total clientes: {total}")
            print(f"   Con NAPs asignadas: {con_naps} ({con_naps/total*100:.1f}%)")
            print(f"   Sin geocodificar: {sin_geocoding} ({sin_geocoding/total*100:.1f}%)")
            print(f"   Sin NAPs cercanas: {sin_naps} ({sin_naps/total*100:.1f}%)")
            
            # Estadísticas de NAPs asignadas
            if con_naps > 0:
                naps_asignadas = df_resultados[df_resultados['nap_asignada'].notna() & 
                                             ~df_resultados['nap_asignada'].isin(['Error al geocodificar', 'Sin NAPs cercanas'])]
                distancia_promedio = naps_asignadas['distancia_metros'].mean()
                distancia_max = naps_asignadas['distancia_metros'].max()
                ocupacion_promedio = naps_asignadas['ocupacion_nap_porcentaje'].mean()
                
                print(f"\n📏 ESTADÍSTICAS DE DISTANCIAS:")
                print(f"   Distancia promedio: {distancia_promedio:.1f}m")
                print(f"   Distancia máxima: {distancia_max:.1f}m")
                print(f"   Ocupación promedio NAPs: {ocupacion_promedio:.1f}%")
            
            return filename
            
        except Exception as e:
            print(f"❌ Error guardando Excel: {e}")
            return None
    
    def ejecutar(self):
        """Ejecutar el procesamiento completo"""
        print("🚀 INICIANDO PROCESAMIENTO ZONA 2 - VERSION FINAL")
        print("="*60)
        
        # 1. Cargar datos
        if not self.cargar_datos():
            return False
        
        # 2. Procesar clientes
        resultados = self.procesar_clientes()
        
        # 3. Guardar cache final
        self.guardar_cache()
        
        # 4. Guardar Excel
        archivo_generado = self.guardar_excel(resultados)
        
        if archivo_generado:
            print(f"\n✅ PROCESAMIENTO COMPLETADO")
            print(f"📁 Archivo generado: {archivo_generado}")
            return True
        else:
            print(f"\n❌ ERROR EN EL PROCESAMIENTO")
            return False

def main():
    procesador = ProcesadorZona2Final()
    procesador.ejecutar()

if __name__ == "__main__":
    main()
