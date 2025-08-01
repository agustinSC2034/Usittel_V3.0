#!/usr/bin/env python3
"""
Script para procesar ZONA 1 con algoritmo mejorado
"""

import pandas as pd
import json
from datetime import datetime
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import time
import re

class ProcesadorZona1:
    def __init__(self):
        self.cache_file = "cache_zona1_final.json"
        self.cache_geocoding = {}
        self.geolocator = Nominatim(user_agent="usittel_zona1_v1.0")
        self.cargar_cache()
    
    def cargar_cache(self):
        """Cargar cache de geocodificación existente"""
        try:
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                self.cache_geocoding = json.load(f)
            print(f"✅ Cache cargado: {len(self.cache_geocoding)} direcciones")
        except FileNotFoundError:
            print("📝 Creando nuevo cache de geocodificación")
            self.cache_geocoding = {}
    
    def guardar_cache(self):
        """Guardar cache de geocodificación"""
        with open(self.cache_file, 'w', encoding='utf-8') as f:
            json.dump(self.cache_geocoding, f, ensure_ascii=False, indent=2)
    
    def limpiar_direccion(self, direccion):
        """Limpiar y normalizar dirección de forma SUPER AGRESIVA"""
        if pd.isna(direccion):
            return None
        
        direccion = str(direccion).strip().upper()
        
        # PASO 1: Remover TODO después del primer guión o palabra clave
        direccion = re.sub(r'\s*[-–]\s*DTO\.?\s*.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*DEPTO\.?\s*.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*PISO\s*.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*LOC\.?\s*.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*P\.?A\.?.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*P\.?B\.?.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*FTE\.?.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*FDO\.?.*$', '', direccion)
        direccion = re.sub(r'\s*[-–]\s*\d+.*$', '', direccion)
        
        # PASO 2: Remover información entre paréntesis
        direccion = re.sub(r'\s*\([^)]*\)', '', direccion)
        
        # PASO 3: Remover prefijos problemáticos
        direccion = re.sub(r'^BO\.?\s+', '', direccion)
        direccion = re.sub(r'^BARRIO\s+', '', direccion)
        
        # PASO 4: Remover códigos internos ANYWHERE
        direccion = re.sub(r'\s+INT\s+\d+', '', direccion)
        direccion = re.sub(r'\s+MON\.?\s*\w*', '', direccion)
        direccion = re.sub(r'\s+B\s+FONAVI', '', direccion)
        direccion = re.sub(r'\s+PISO\s+\w+', '', direccion)
        
        # PASO 5: Normalizar espacios
        direccion = re.sub(r'\s+', ' ', direccion)
        direccion = direccion.strip()
        
        # PASO 6: Extraer solo calle y número
        match = re.match(r'^(.+?)\s+(\d+)', direccion)
        if match:
            calle = match.group(1).strip()
            numero = match.group(2)
            calle = ' '.join(word.capitalize() for word in calle.split())
            return f"{calle} {numero}"
        
        # Si no hay número, capitalizar y devolver
        if direccion:
            direccion = ' '.join(word.capitalize() for word in direccion.split())
            return direccion
            
        return None

    def geocodificar_direccion(self, direccion):
        """Geocodificar una dirección usando cache"""
        if not direccion:
            return None, None, "DIRECCIÓN VACÍA"
        
        direccion_limpia = self.limpiar_direccion(direccion)
        if not direccion_limpia:
            return None, None, "DIRECCIÓN INVÁLIDA"
        
        # Buscar en cache
        if direccion_limpia in self.cache_geocoding:
            cache_data = self.cache_geocoding[direccion_limpia]
            if cache_data['exito']:
                return cache_data['lat'], cache_data['lon'], "CACHE"
            else:
                return None, None, "CACHE_FALLO"
        
        # Geocodificar nueva dirección
        try:
            direccion_completa = f"{direccion_limpia}, Tandil, Buenos Aires, Argentina"
            print(f"  🌍 Geocodificando: {direccion_completa}")
            
            location = self.geolocator.geocode(direccion_completa, timeout=10)
            time.sleep(1.2)  # Rate limiting
            
            if location:
                lat, lon = location.latitude, location.longitude
                
                # Verificar que esté en Tandil (latitud y longitud aproximadas)
                if -37.5 <= lat <= -37.2 and -59.3 <= lon <= -59.0:
                    self.cache_geocoding[direccion_limpia] = {
                        'exito': True,
                        'lat': lat,
                        'lon': lon,
                        'timestamp': datetime.now().isoformat()
                    }
                    return lat, lon, "NUEVO"
                else:
                    self.cache_geocoding[direccion_limpia] = {
                        'exito': False,
                        'error': 'Fuera de Tandil',
                        'timestamp': datetime.now().isoformat()
                    }
                    return None, None, "FUERA_TANDIL"
            else:
                self.cache_geocoding[direccion_limpia] = {
                    'exito': False,
                    'error': 'No encontrada',
                    'timestamp': datetime.now().isoformat()
                }
                return None, None, "NO_ENCONTRADA"
                
        except Exception as e:
            self.cache_geocoding[direccion_limpia] = {
                'exito': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            return None, None, f"ERROR: {e}"
    
    def cliente_compatible_con_nap(self, direccion_cliente, direccion_nap):
        """Verificar si cliente y NAP están en calles compatibles"""
        try:
            # Limpiar direcciones
            dir_cliente = self.limpiar_direccion(direccion_cliente).upper()
            dir_nap = self.limpiar_direccion(direccion_nap).upper()
            
            if not dir_cliente or not dir_nap:
                return False
            
            # Extraer nombre de calle del cliente (sin número)
            match_cliente = re.match(r'^([A-Z\s\.]+)', dir_cliente.strip())
            if not match_cliente:
                return False
            
            calle_cliente = match_cliente.group(1).strip()
            
            # Verificar si la calle del cliente está mencionada en la dirección de la NAP
            return calle_cliente in dir_nap
            
        except Exception as e:
            print(f"⚠️  Error verificando compatibilidad: {e}")
            return False

def main():
    try:
        print("🚀 PROCESADOR ZONA 1 - ALGORITMO MEJORADO")
        print("="*55)
        print("🔧 CARACTERÍSTICAS:")
        print("   ✅ Limpieza AGRESIVA de direcciones")
        print("   ✅ Usa archivo NAPs corregido con 375 NAPs")
        print("   ✅ TODAS las NAPs disponibles (sin filtro ocupación)")
        print("   ✅ Distancia máxima ≤ 150m")
        print("   ✅ Compatibilidad de calles verificada")
        
        procesador = ProcesadorZona1()
        
        # PASO 0: Prueba de limpieza de direcciones
        print("\n🧪 PASO 0: Prueba de limpieza de direcciones")
        direcciones_prueba = [
            "MAIPU 1350 - DTO. 14",
            "MITRE 1454 - DTO. 2", 
            "25 DE MAYO 1357 - DTO. 3",
            "SAAVEDRA 532 PISO 1 - 6",
            "AVELLANEDA 1244 PISO 1 -",
            "PAZ 423 - LOC. 2",
            "PINTO 1048 PISO P.A.",
            "25 DE MAYO 1357 - FTE.",
            "BELGRANO 1370 - PA DTO. 3",
            "PAZ 879 PISO P.A.",
            "MONTIEL 837 - FDO.",
            "SAAVEDRA 643 - P.A. - 5",
            "SARMIENTO 1153 PISO P.B. - 7",
            "11 DE SEPTIEMBRE 651 - DTO. 16",
            "MONTIEL 374 - 052",
            "25 DE MAYO 942 - 10",
            "MAIPU 1120 MON. F PISO 2 - DTO. 14",
            "AVELLANEDA 1025 - DTO. 8 (COMPLEJO)",
            "BO. ATSA INT 7 1326 - 15",
            "BUZON 250 B FONAVI"
        ]
        
        print("🧪 PRUEBAS DE LIMPIEZA DE DIRECCIONES")
        print("="*50)
        print("ANTES → DESPUÉS")
        print("-"*50)
        
        for dir_original in direcciones_prueba:
            dir_limpia = procesador.limpiar_direccion(dir_original)
            print(f"{dir_original:<35} → {dir_limpia}")
        
        confirmacion = input("\n¿Las direcciones se están limpiando correctamente? (s/n): ")
        if confirmacion.lower() != 's':
            print("❌ Proceso cancelado. Revisa la función de limpieza.")
            return
        
        # 1. Cargar clientes ZONA 1
        print("\n📂 PASO 1: Cargando clientes ZONA 1...")
        df_clientes = pd.read_excel('excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_1.xlsx')
        
        # Filtrar solo clientes que NO contrataron
        df_clientes = df_clientes[df_clientes['ESTADO'] != 'CONTRATÓ'].copy()
        
        print(f"📊 Clientes válidos (NO contrataron): {len(df_clientes)}")
        print(f"📋 Columnas: {list(df_clientes.columns)}")
        
        # 2. Cargar NAPs corregidas
        print("\n📂 PASO 2: Cargando NAPs corregidas...")
        df_naps = pd.read_excel('excels_con_los_datos_de_partida/archivo_final_naps.xlsx')
        print(f"📊 NAPs disponibles: {len(df_naps)}")
        
        # Usar TODAS las NAPs (sin filtro de ocupación)
        naps_disponibles = df_naps.copy()
        print(f"📊 NAPs a utilizar: {len(naps_disponibles)} (TODAS - sin filtro de ocupación)")
        
        # 3. Geocodificar clientes
        print(f"\n🌍 PASO 3: Geocodificando {len(df_clientes)} clientes...")
        
        confirmacion = input("¿Continuar con la geocodificación? (s/n): ")
        if confirmacion.lower() != 's':
            print("❌ Proceso cancelado por el usuario")
            return
        
        print(f"\n🌍 GEOCODIFICANDO {len(df_clientes)} CLIENTES")
        print("="*50)
        
        clientes_geocodificados = []
        exitosos = 0
        fallidos = 0
        
        for idx, cliente in df_clientes.iterrows():
            if idx % 20 == 0:
                print(f"📍 Progreso: {idx}/{len(df_clientes)} ({idx/len(df_clientes)*100:.1f}%)")
            
            try:
                nombre = cliente['Unnamed: 1']  # Columna de nombre en ZONA 1
                direccion_original = cliente['DIRECCIÓN']
                celular = cliente['CELULAR']
                estado = cliente['ESTADO']
                
                # Geocodificar
                lat, lon, status = procesador.geocodificar_direccion(direccion_original)
                
                if lat and lon:
                    exitosos += 1
                    clientes_geocodificados.append({
                        'idx_original': idx,
                        'nombre': nombre,
                        'direccion_original': direccion_original,
                        'direccion_limpia': procesador.limpiar_direccion(direccion_original),
                        'celular': celular,
                        'zona': 'ZONA 1',
                        'estado': estado,
                        'lat': lat,
                        'lon': lon,
                        'geocodificado': True,
                        'status_geo': status
                    })
                else:
                    fallidos += 1
                    clientes_geocodificados.append({
                        'idx_original': idx,
                        'nombre': nombre,
                        'direccion_original': direccion_original,
                        'direccion_limpia': procesador.limpiar_direccion(direccion_original),
                        'celular': celular,
                        'zona': 'ZONA 1',
                        'estado': estado,
                        'lat': None,
                        'lon': None,
                        'geocodificado': False,
                        'status_geo': status
                    })
                
                # Guardar cache cada 10 clientes
                if idx % 10 == 0:
                    procesador.guardar_cache()
                    
            except Exception as e:
                print(f"⚠️  Error procesando cliente {idx}: {e}")
                fallidos += 1
                continue
        
        # Guardar cache final
        procesador.guardar_cache()
        
        print(f"\n📊 RESULTADOS GEOCODIFICACIÓN:")
        print(f"✅ Exitosos: {exitosos}")
        print(f"❌ Fallidos: {fallidos}")
        print(f"📊 % Éxito: {exitosos/(exitosos+fallidos)*100:.1f}%")
        
        # 4. Buscar NAPs cercanas
        print(f"\n📏 PASO 4: Buscando NAPs cercanas...")
        
        clientes_validos = [c for c in clientes_geocodificados if c['geocodificado']]
        print(f"🎯 Clientes geocodificados a procesar: {len(clientes_validos)}")
        
        resultados_con_nap = []
        
        for cliente in clientes_validos:
            cliente_coords = (cliente['lat'], cliente['lon'])
            mejor_nap = None
            menor_distancia = float('inf')
            
            for _, nap in naps_disponibles.iterrows():
                try:
                    nap_coords = (nap['Latitud'], nap['Longitud'])
                    distancia = geodesic(cliente_coords, nap_coords).meters
                    
                    # Verificar distancia y compatibilidad
                    if distancia <= 150:
                        if procesador.cliente_compatible_con_nap(cliente['direccion_original'], nap['Dirección']):
                            if distancia < menor_distancia:
                                menor_distancia = distancia
                                mejor_nap = {
                                    'nap_codigo': nap['NAP'],
                                    'id_nap': nap['ID NAP'],
                                    'direccion_nap': nap['Dirección'],
                                    'lat_nap': nap['Latitud'],
                                    'lon_nap': nap['Longitud'],
                                    'distancia': distancia,
                                    'ocupacion': nap['Ocupacion_caja'],
                                    'puertos_utilizados': nap['P_Utilizados'],
                                    'puertos_disponibles': nap['P_Disponibles'],
                                    'puertos_totales': nap['P_Totales']
                                }
                
                except Exception as e:
                    continue
            
            if mejor_nap:
                resultado = cliente.copy()
                resultado.update(mejor_nap)
                resultados_con_nap.append(resultado)
        
        print(f"🎯 Clientes con NAP asignada: {len(resultados_con_nap)}")
        
        # 5. Generar Excel final
        print(f"\n📊 PASO 5: Generando Excel final...")
        
        resultados_finales = []
        
        for cliente in clientes_geocodificados:
            # Buscar si tiene NAP asignada
            cliente_con_nap = [r for r in resultados_con_nap if r['idx_original'] == cliente['idx_original']]
            
            fila = {
                'Nombre': cliente['nombre'],
                'Dirección Original': cliente['direccion_original'],
                'Dirección Limpia': cliente['direccion_limpia'],
                'Celular': cliente['celular'],
                'Zona': cliente['zona'],
                'Estado': cliente['estado'],
                'Latitud Cliente': cliente['lat'],
                'Longitud Cliente': cliente['lon'],
                'Status Geocodificación': cliente['status_geo'],
            }
            
            if cliente_con_nap:
                # Cliente con NAP
                nap_data = cliente_con_nap[0]
                fila.update({
                    'NAP Asignada': nap_data['nap_codigo'],
                    'ID NAP': nap_data['id_nap'],
                    'Dirección NAP': nap_data['direccion_nap'],
                    'Latitud NAP': nap_data['lat_nap'],
                    'Longitud NAP': nap_data['lon_nap'],
                    'Distancia (m)': round(nap_data['distancia'], 1),
                    'Ocupación NAP (%)': round(nap_data['ocupacion'] * 100, 1),
                    'Puertos Utilizados': nap_data['puertos_utilizados'],
                    'Puertos Disponibles': nap_data['puertos_disponibles'],
                    'Puertos Totales': nap_data['puertos_totales'],
                    'Resultado': 'CON NAP CERCANA'
                })
            else:
                # Cliente sin NAP
                fila.update({
                    'NAP Asignada': 'SIN NAP',
                    'ID NAP': None,
                    'Dirección NAP': None,
                    'Latitud NAP': None,
                    'Longitud NAP': None,
                    'Distancia (m)': None,
                    'Ocupación NAP (%)': None,
                    'Puertos Utilizados': None,
                    'Puertos Disponibles': None,
                    'Puertos Totales': None,
                    'Resultado': 'SIN NAP CERCANA' if cliente['geocodificado'] else 'NO GEOCODIFICADO'
                })
            
            resultados_finales.append(fila)
        
        # Crear DataFrame y guardar
        df_final = pd.DataFrame(resultados_finales)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        archivo = f"zona1_procesada_final_{timestamp}.xlsx"
        
        df_final.to_excel(archivo, index=False)
        
        # Estadísticas finales
        print(f"\n📊 ESTADÍSTICAS FINALES ZONA 1:")
        print(f"📋 Total clientes procesados: {len(df_final)}")
        print(f"🌍 Clientes geocodificados: {exitosos} ({exitosos/len(df_final)*100:.1f}%)")
        print(f"🎯 Clientes con NAP asignada: {len(resultados_con_nap)} ({len(resultados_con_nap)/len(df_final)*100:.1f}%)")
        print(f"📁 Archivo generado: {archivo}")
        
        if len(resultados_con_nap) > 0:
            clientes_con_distancia = df_final[df_final['Distancia (m)'].notna()]
            if len(clientes_con_distancia) > 0:
                print(f"📏 Distancia promedio: {clientes_con_distancia['Distancia (m)'].mean():.1f}m")
                print(f"📏 Distancia máxima: {clientes_con_distancia['Distancia (m)'].max():.1f}m")
                print(f"📏 Distancia mínima: {clientes_con_distancia['Distancia (m)'].min():.1f}m")
        
        print(f"\n✅ ZONA 1 PROCESADA EXITOSAMENTE")
        return archivo
        
    except Exception as e:
        print(f"❌ Error procesando ZONA 1: {e}")
        return None

if __name__ == "__main__":
    main()
