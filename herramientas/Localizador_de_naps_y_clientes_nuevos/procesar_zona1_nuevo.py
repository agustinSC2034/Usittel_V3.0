#!/usr/bin/env python3
"""
Script NUEVO para procesar ZONA 1 con algoritmo limpio desde cero
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import json
import os
from datetime import datetime
import re

class ProcesadorZona1:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_zona1_nuevo", timeout=15)
        self.cache_geocoding = {}
        self.cache_file = "cache_zona1_nuevo.json"
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
        """Normalizar nombre de calle para comparaciones"""
        if not calle:
            return ""
        
        calle = str(calle).upper().strip()
        
        # Diccionario de normalizaciones comunes
        normalizaciones = {
            'AV\\.': 'AVENIDA',
            'AVE\\.': 'AVENIDA',
            'AVDA\\.': 'AVENIDA',
            'AV ': 'AVENIDA ',
            'AVE ': 'AVENIDA ',
            'AVDA ': 'AVENIDA ',
            'GRAL\\.': 'GENERAL',
            'GRAL ': 'GENERAL ',
            'DR\\.': 'DOCTOR',
            'DR ': 'DOCTOR ',
            'SAN ': 'SAN ',
            'SANTA ': 'SANTA ',
            'PJE\\.': 'PASAJE',
            'PJE ': 'PASAJE ',
            'PQUE\\.': 'PARQUE',
            'PQUE ': 'PARQUE ',
            'BV\\.': 'BOULEVARD',
            'BLVD\\.': 'BOULEVARD',
            'BV ': 'BOULEVARD ',
            'BLVD ': 'BOULEVARD '
        }
        
        # Aplicar normalizaciones
        for patron, reemplazo in normalizaciones.items():
            calle = re.sub(patron, reemplazo, calle)
        
        # Remover espacios extra
        calle = ' '.join(calle.split())
        
        return calle

    def extraer_calles_de_direccion(self, direccion):
        """Extraer nombres de calles de una dirección"""
        if not direccion:
            return []
        
        direccion = str(direccion).upper().strip()
        
        # Limpiar número y departamentos
        direccion_limpia = re.sub(r'\d+', '', direccion)  # Remover números
        direccion_limpia = re.sub(r'(DPTO|DTO|DEPTO|DEPARTAMENTO|PH|LOCAL|OFICINA).*', '', direccion_limpia)
        direccion_limpia = re.sub(r'[^\w\s]', ' ', direccion_limpia)  # Remover caracteres especiales
        
        # Separar por "Y" si hay intersección
        if ' Y ' in direccion_limpia:
            calles = [calle.strip() for calle in direccion_limpia.split(' Y ')]
        else:
            calles = [direccion_limpia.strip()]
        
        # Normalizar y filtrar calles válidas
        calles_normalizadas = []
        for calle in calles:
            calle_normalizada = self.normalizar_nombre_calle(calle)
            if len(calle_normalizada) > 2:
                calles_normalizadas.append(calle_normalizada)
        
        return calles_normalizadas
    
    def cliente_compatible_con_nap(self, direccion_cliente, direccion_nap):
        """Verificar si el cliente puede conectarse a la NAP según ubicación de calles"""
        calles_cliente = self.extraer_calles_de_direccion(direccion_cliente)
        calles_nap = self.extraer_calles_de_direccion(direccion_nap)
        
        if not calles_cliente or not calles_nap:
            return False
        
        # Verificar si hay coincidencia en alguna calle
        for calle_cliente in calles_cliente:
            for calle_nap in calles_nap:
                # Coincidencia exacta
                if calle_cliente == calle_nap:
                    return True
                
                # Coincidencia parcial mejorada (una contiene a la otra con al menos 4 caracteres)
                if len(calle_cliente) >= 4 and len(calle_nap) >= 4:
                    if calle_cliente in calle_nap or calle_nap in calle_cliente:
                        return True
                
                # Verificar coincidencia de palabras clave (para manejar abreviaciones)
                palabras_cliente = set(calle_cliente.split())
                palabras_nap = set(calle_nap.split())
                
                # Si comparten al menos una palabra significativa (>3 caracteres)
                palabras_significativas = {p for p in palabras_cliente & palabras_nap if len(p) > 3}
                if palabras_significativas:
                    return True
        
        return False

    def limpiar_direccion(self, direccion):
        """Limpiar y normalizar dirección - MEJORADO para eliminar más sufijos"""
        if pd.isna(direccion):
            return None
        
        direccion = str(direccion).strip()
        
        # Limpiar caracteres problemáticos
        direccion = direccion.replace('TANDIL', '').strip()
        direccion = direccion.replace('Tandil', '').strip()
        
        # Lista completa de sufijos a remover - AMPLIADA
        sufijos_a_remover = [
            # Departamentos
            r'\s*[-–]\s*(DPTO|DTO|DEPTO|DEPARTAMENTO).*',
            r'\s*(DPTO|DTO|DEPTO|DEPARTAMENTO).*',
            
            # Pisos y habitaciones
            r'\s*[-–]\s*(PISO|P\.?).*',
            r'\s*(PISO|P\.?).*',
            
            # Casas y locales
            r'\s*[-–]\s*(CASA|LOCAL|OFICINA|TALLER|LOC\.?).*',
            r'\s*(CASA|LOCAL|OFICINA|TALLER|LOC\.?).*',
            
            # Internos
            r'\s*[-–]\s*(INT\.?|INTERNO|INTERNA).*',
            r'\s*(INT\.?|INTERNO|INTERNA).*',
            
            # PH
            r'\s*[-–]\s*PH.*',
            r'\s*PH.*',
            
            # Planta baja
            r'\s*[-–]\s*(PLANTA\s+BAJA|PB).*',
            r'\s*(PLANTA\s+BAJA|PB).*',
            
            # Números de departamento específicos
            r'\s*[-–]\s*\d+.*',
            
            # Espacios con guiones
            r'\s*[-–]\s*.*'
        ]
        
        # Aplicar todas las limpiezas
        for patron in sufijos_a_remover:
            direccion = re.sub(patron, '', direccion, flags=re.IGNORECASE)
        
        # Normalizar espacios
        direccion = ' '.join(direccion.split())
        
        return direccion if direccion else None
    
    def geocodificar_direccion(self, direccion_original):
        """Geocodificar una dirección con cache"""
        direccion_limpia = self.limpiar_direccion(direccion_original)
        
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
        
        # Cargar clientes ZONA 1
        clientes_file = "excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_1.xlsx"
        try:
            self.df_clientes = pd.read_excel(clientes_file)
            print(f"✅ Clientes ZONA 1: {len(self.df_clientes)} registros")
            print(f"   Columnas: {list(self.df_clientes.columns)}")
        except Exception as e:
            print(f"❌ Error cargando clientes: {e}")
            return False
        
        # Cargar NAPs disponibles (≤30% ocupación) - MISMAS NAPS para ambas zonas
        naps_file = "excels_con_los_datos_de_partida/Cajas_naps_con_menos_del_30_de_ocupacion.xlsx"
        try:
            self.df_naps = pd.read_excel(naps_file)
            print(f"✅ NAPs disponibles: {len(self.df_naps)} registros")
            print(f"   Columnas: {list(self.df_naps.columns)}")
        except Exception as e:
            print(f"❌ Error cargando NAPs: {e}")
            return False
        
        return True
    
    def mostrar_muestra_datos(self):
        """Mostrar muestra de los datos para verificar"""
        print("\n📋 MUESTRA DE DATOS ZONA 1:")
        print("="*50)
        
        print("👥 CLIENTES (primeros 3):")
        for i, row in self.df_clientes.head(3).iterrows():
            direccion = row['DIRECCIÓN'] if 'DIRECCIÓN' in row else 'N/A'
            nombre = row['NOMBRE COMPLETO'] if 'NOMBRE COMPLETO' in row else 'N/A'
            celular = row['CELULAR'] if 'CELULAR' in row else 'N/A'
            email = row['E-MAIL'] if 'E-MAIL' in row else 'N/A'
            print(f"   {i+1}. {nombre}")
            print(f"      📍 {direccion}")
            print(f"      📱 {celular}")
            print(f"      📧 {email}")
        
        print("\n📡 NAPS (primeros 3):")
        for i, row in self.df_naps.head(3).iterrows():
            direccion = row['Dirección'] if 'Dirección' in row else 'N/A'
            nomenclatura = row['Nomenclatura'] if 'Nomenclatura' in row else 'N/A'
            ocupacion = row['% UTILIZACIÓN'] if '% UTILIZACIÓN' in row else 'N/A'
            puertos_ocupados = row['PUERTOS OCUPADOS'] if 'PUERTOS OCUPADOS' in row else 'N/A'
            puertos_libres = row['PUERTOS LIBRES'] if 'PUERTOS LIBRES' in row else 'N/A'
            print(f"   {i+1}. {nomenclatura}")
            print(f"      📍 {direccion}")
            print(f"      📊 {ocupacion*100:.1f}% ocupado")
            print(f"      🔌 Ocupados: {puertos_ocupados}, Libres: {puertos_libres}")
    
    def procesar_clientes(self):
        """Procesar geocodificación de clientes"""
        print(f"\n🏠 PROCESANDO {len(self.df_clientes)} CLIENTES ZONA 1...")
        print("="*50)
        
        resultados = []
        
        for i, cliente in self.df_clientes.iterrows():
            print(f"\n[{i+1}/{len(self.df_clientes)}] Procesando cliente...")
            
            # Obtener datos del cliente (usar columnas correctas)
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
                    'puertos_libres': None,
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
                print(f"    🎯 NAP asignada: {nap_cercana['direccion_nap']} ({nap_cercana['distancia_metros']:.1f}m)")
            else:
                resultado.update({
                    'nap_asignada': 'Sin NAPs cercanas',
                    'direccion_nap': None,
                    'latitud_nap': None,
                    'longitud_nap': None,
                    'distancia_metros': None,
                    'ocupacion_nap_porcentaje': None,
                    'puertos_ocupados': None,
                    'puertos_libres': None,
                    'puertos_totales': None
                })
                print(f"    ✅ Sin NAPs cercanas (< 150m) o en calles compatibles")
            
            resultados.append(resultado)
            
            # Guardar cache cada 10 clientes
            if (i + 1) % 10 == 0:
                self.guardar_cache()
                print(f"    💾 Cache guardado (progreso: {i+1}/{len(self.df_clientes)})")
        
        return resultados
    
    def buscar_nap_cercana(self, lat_cliente, lon_cliente, direccion_cliente):
        """Buscar la NAP más cercana dentro del radio y en la misma calle"""
        naps_cercanas = []
        cliente_pos = (lat_cliente, lon_cliente)
        
        for i, nap in self.df_naps.iterrows():
            # Obtener datos completos de la NAP
            direccion_nap = nap['Dirección'] if 'Dirección' in nap else None
            nomenclatura_nap = nap['Nomenclatura'] if 'Nomenclatura' in nap else "N/A"
            ocupacion_porcentaje = nap['% UTILIZACIÓN'] if '% UTILIZACIÓN' in nap else 0
            puertos_ocupados = nap['PUERTOS OCUPADOS'] if 'PUERTOS OCUPADOS' in nap else 0
            puertos_libres = nap['PUERTOS LIBRES'] if 'PUERTOS LIBRES' in nap else 0
            puertos_totales = nap['TOTAL PUERTOS'] if 'TOTAL PUERTOS' in nap else 0
            
            # Geocodificar NAP
            lat_nap, lon_nap, status_nap = self.geocodificar_direccion(direccion_nap)
            
            if lat_nap is None:
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
                        'ocupacion_nap_porcentaje': ocupacion_porcentaje * 100 if isinstance(ocupacion_porcentaje, (int, float)) else ocupacion_porcentaje,
                        'puertos_ocupados': puertos_ocupados,
                        'puertos_libres': puertos_libres,
                        'puertos_totales': puertos_totales
                    })
                else:
                    print(f"      ⚠️  NAP {nomenclatura_nap} descartada: calles incompatibles ({distancia:.1f}m)")
                    print(f"         Cliente: {direccion_cliente}")
                    print(f"         NAP: {direccion_nap}")
            else:
                # Solo mostrar NAPs muy cercanas que fueron descartadas por distancia
                if distancia <= 200:
                    print(f"      ⚠️  NAP {nomenclatura_nap} descartada: distancia {distancia:.1f}m > 150m")
        
        # Devolver la más cercana
        if naps_cercanas:
            return min(naps_cercanas, key=lambda x: x['distancia_metros'])
        else:
            return None
    
    def guardar_excel(self, resultados):
        """Guardar resultados en Excel"""
        df_resultados = pd.DataFrame(resultados)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"clientes_ZONA1_NUEVO_{timestamp}.xlsx"
        
        try:
            df_resultados.to_excel(filename, index=False)
            print(f"\n💾 EXCEL GUARDADO: {filename}")
            
            # Estadísticas
            total = len(df_resultados)
            con_naps = len(df_resultados[df_resultados['nap_asignada'].notna() & 
                                       ~df_resultados['nap_asignada'].isin(['Error al geocodificar', 'Sin NAPs cercanas'])])
            sin_geocoding = len(df_resultados[df_resultados['nap_asignada'] == 'Error al geocodificar'])
            sin_naps = len(df_resultados[df_resultados['nap_asignada'] == 'Sin NAPs cercanas'])
            
            print(f"\n📊 ESTADÍSTICAS FINALES ZONA 1:")
            print(f"   Total clientes: {total}")
            print(f"   Con NAPs asignadas: {con_naps} ({con_naps/total*100:.1f}%)")
            print(f"   Sin geocodificar: {sin_geocoding} ({sin_geocoding/total*100:.1f}%)")
            print(f"   Sin NAPs cercanas: {sin_naps} ({sin_naps/total*100:.1f}%)")
            
            return filename
            
        except Exception as e:
            print(f"❌ Error guardando Excel: {e}")
            return None
    
    def ejecutar(self):
        """Ejecutar el procesamiento completo"""
        print("🚀 INICIANDO PROCESAMIENTO ZONA 1 - ALGORITMO NUEVO")
        print("="*60)
        
        # 1. Cargar datos
        if not self.cargar_datos():
            return False
        
        # 2. Mostrar muestra
        self.mostrar_muestra_datos()
        
        # 3. Procesar clientes
        resultados = self.procesar_clientes()
        
        # 4. Guardar cache final
        self.guardar_cache()
        
        # 5. Guardar Excel
        archivo_generado = self.guardar_excel(resultados)
        
        if archivo_generado:
            print(f"\n✅ PROCESAMIENTO ZONA 1 COMPLETADO")
            print(f"📁 Archivo generado: {archivo_generado}")
            return True
        else:
            print(f"\n❌ ERROR EN EL PROCESAMIENTO")
            return False

def main():
    procesador = ProcesadorZona1()
    procesador.ejecutar()

if __name__ == "__main__":
    main()
