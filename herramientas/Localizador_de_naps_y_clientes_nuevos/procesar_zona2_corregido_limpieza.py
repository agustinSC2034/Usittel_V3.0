#!/usr/bin/env python3
"""
Script CORREGIDO para procesar ZONA 2 con función de limpieza mejorada
SOLUCIONA: "ALSINA 956 - DTO. 4" → "ALSINA 956"
"""

import pandas as pd
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
import json
import os
import re
from datetime import datetime

class ProcesadorZona2Corregido:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_zona2_corregido", timeout=15)
        self.cache_geocoding = {}
        self.cache_file = "cache_zona2_corregido_limpieza.json"
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
        """🔧 FUNCIÓN CORREGIDA: Limpiar y normalizar dirección - SOLO calle y número"""
        if pd.isna(direccion):
            return None
        
        direccion = str(direccion).strip()
        
        # Limpiar "TANDIL" pegado
        direccion = direccion.replace('TANDIL', '').strip()
        direccion = direccion.replace('Tandil', '').strip()
        
        # 🔧 CORRECCIÓN PRINCIPAL: Patrones mejorados para remover sufijos
        # Cubre casos como: "ALSINA 956 - DTO. 4", "MITRE 123 CASA", "BELGRANO 456 TALLER", etc.
        
        patrones_sufijos = [
            # Con guiones y espacios: "- DTO. 4", "- DPTO 2", etc.
            r'\s*[-–]\s*(DPTO\.?|DTO\.?|DEPTO\.?|DEPARTAMENTO)(\s+\d+)?.*',
            r'\s*[-–]\s*(CASA|TALLER|INT\.?|INTERIOR|PB|PLANTA\s+BAJA)(\s+\d+)?.*',
            r'\s*[-–]\s*(PH|LOCAL|OFICINA|MONOAMBIENTE)(\s+\d+)?.*',
            
            # Sin guiones pero con espacios: " DTO 4", " DPTO. 2", etc.
            r'\s+(DPTO\.?|DTO\.?|DEPTO\.?|DEPARTAMENTO)(\s+\d+)?.*',
            r'\s+(CASA|TALLER|INT\.?|INTERIOR|PB|PLANTA\s+BAJA)(\s+\d+)?.*',
            r'\s+(PH|LOCAL|OFICINA|MONOAMBIENTE)(\s+\d+)?.*',
            
            # Entre paréntesis: "(DTO 4)", "(CASA)", etc.
            r'\s*\([^)]*(?:DPTO\.?|DTO\.?|DEPTO\.?|DEPARTAMENTO|CASA|TALLER|PH|LOCAL|OFICINA)[^)]*\).*',
            
            # Fracciones y números de unidad: "/2", "1/2", "A", "B", etc.
            r'\s*[/]\s*\d+.*',
            r'\s+[A-Z]$',  # Letra al final: "123 A", "456 B"
        ]
        
        # Aplicar todos los patrones de limpieza
        for patron in patrones_sufijos:
            direccion = re.sub(patron, '', direccion, flags=re.IGNORECASE)
        
        # Limpiar espacios extra
        direccion = ' '.join(direccion.split())
        
        # Validar que quedó algo útil
        if len(direccion.strip()) < 3:
            return None
        
        return direccion.strip() if direccion else None
    
    def test_limpieza_direcciones(self):
        """🧪 Función de prueba para validar la limpieza de direcciones"""
        print("\n🧪 PRUEBAS DE LIMPIEZA DE DIRECCIONES")
        print("=" * 50)
        
        casos_prueba = [
            "ALSINA 956 - DTO. 4",
            "MITRE 123 CASA",
            "BELGRANO 456 - TALLER",
            "RIVADAVIA 789 PH",
            "SAN MARTIN 321 - DEPTO 2",
            "AVELLANEDA 654 LOCAL",
            "COLON 987 - DTO 5",
            "PERON 111 OFICINA A",
            "SARMIENTO 222 (DTO 3)",
            "BOLIVAR 333 TANDIL",
            "MAIPU 444TANDIL",
            "MORENO 555 INT. 7",
            "NEWBERY 666 PB",
            "CHACABUCO 777 /2",
            "RODRIGUEZ 888 B"
        ]
        
        print("ANTES → DESPUÉS")
        print("-" * 50)
        
        for direccion in casos_prueba:
            limpia = self.limpiar_direccion(direccion)
            print(f"{direccion:<25} → {limpia}")
        
        print("\n✅ Verifica que 'ALSINA 956 - DTO. 4' → 'ALSINA 956'")
    
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
                # No encontrado
                self.cache_geocoding[direccion_limpia] = {
                    'exito': False,
                    'error': 'No encontrado'
                }
                return None, None, "No encontrado"
                
        except Exception as e:
            error_msg = str(e)
            self.cache_geocoding[direccion_limpia] = {
                'exito': False,
                'error': error_msg
            }
            return None, None, error_msg

    def cargar_clientes_zona2(self):
        """Cargar clientes de ZONA 2"""
        archivo = "excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_2.xlsx"
        
        print(f"\n📂 Cargando ZONA 2 desde: {archivo}")
        
        try:
            df = pd.read_excel(archivo)
            print(f"📊 Filas leídas: {len(df)}")
            print(f"📋 Columnas disponibles: {df.columns.tolist()}")
            
            # Filtrar clientes válidos
            mask_validos = (
                df['DIRECCIÓN'].notna() & 
                (df['DIRECCIÓN'].str.strip() != '') &
                df['ESTADO'].notna() &
                df['ESTADO'].str.contains('NO', case=False, na=False)
            )
            
            clientes = df[mask_validos].copy()
            print(f"📊 Clientes válidos (NO contrataron): {len(clientes)}")
            
            # Agregar columnas necesarias
            clientes['ZONA'] = 'ZONA 2'
            
            if 'NOMBRE COMPLETO' in df.columns:
                clientes['NOMBRE_COMPLETO'] = clientes['NOMBRE COMPLETO'].fillna('Sin nombre')
            elif 'NOMBRE' in df.columns:
                clientes['NOMBRE_COMPLETO'] = clientes['NOMBRE'].fillna('Sin nombre')
            else:
                clientes['NOMBRE_COMPLETO'] = 'Sin nombre'
                
            return clientes[['NOMBRE_COMPLETO', 'DIRECCIÓN', 'ESTADO', 'CELULAR', 'ZONA']].copy()
            
        except Exception as e:
            print(f"❌ Error cargando ZONA 2: {e}")
            return pd.DataFrame()

    def cargar_naps(self):
        """Cargar NAPs desde archivo actualizado"""
        archivo = "excels_con_los_datos_de_partida/archivo_final_naps.xlsx"
        
        print(f"\n📂 Cargando NAPs desde: {archivo}")
        
        try:
            df = pd.read_excel(archivo)
            print(f"📊 NAPs cargadas: {len(df)}")
            
            # Verificar columnas necesarias
            required_cols = ['ID NAP', 'Dirección', 'Latitud', 'Longitud']
            missing_cols = [col for col in required_cols if col not in df.columns]
            
            if missing_cols:
                print(f"❌ Columnas faltantes: {missing_cols}")
                return pd.DataFrame()
            
            # Filtrar NAPs con coordenadas válidas
            mask_validas = (
                df['Latitud'].notna() & 
                df['Longitud'].notna() &
                (df['Latitud'] != 0) &
                (df['Longitud'] != 0)
            )
            
            naps_validas = df[mask_validas].copy()
            print(f"📊 NAPs con coordenadas válidas: {len(naps_validas)}")
            
            return naps_validas
            
        except Exception as e:
            print(f"❌ Error cargando NAPs: {e}")
            return pd.DataFrame()

    def geocodificar_clientes(self, clientes):
        """Geocodificar todos los clientes"""
        print(f"\n🌍 GEOCODIFICANDO {len(clientes)} CLIENTES")
        print("=" * 50)
        
        resultados = []
        
        for idx, (_, cliente) in enumerate(clientes.iterrows()):
            if idx % 20 == 0:
                print(f"\n📍 Progreso: {idx}/{len(clientes)} ({idx/len(clientes)*100:.1f}%)")
            
            lat, lon, status = self.geocodificar_direccion(cliente['DIRECCIÓN'])
            
            resultado = {
                'idx_original': idx,
                'nombre': cliente['NOMBRE_COMPLETO'],
                'direccion_original': cliente['DIRECCIÓN'],
                'direccion_limpia': self.limpiar_direccion(cliente['DIRECCIÓN']),
                'celular': cliente['CELULAR'],
                'zona': cliente['ZONA'],
                'estado': cliente['ESTADO'],
                'lat': lat,
                'lon': lon,
                'geocodificado': lat is not None and lon is not None,
                'status_geo': status
            }
            
            resultados.append(resultado)
        
        # Guardar cache
        self.guardar_cache()
        
        df_resultados = pd.DataFrame(resultados)
        
        print(f"\n📊 RESULTADOS GEOCODIFICACIÓN:")
        print(f"✅ Exitosos: {df_resultados['geocodificado'].sum()}")
        print(f"❌ Fallidos: {(~df_resultados['geocodificado']).sum()}")
        print(f"📊 % Éxito: {df_resultados['geocodificado'].mean()*100:.1f}%")
        
        return df_resultados

    def encontrar_naps_cercanas(self, clientes_coords, naps):
        """Encontrar NAPs cercanas para cada cliente"""
        print(f"\n📏 BUSCANDO NAPS CERCANAS")
        print("=" * 40)
        
        clientes_geocodificados = clientes_coords[clientes_coords['geocodificado']].copy()
        print(f"🎯 Clientes a procesar: {len(clientes_geocodificados)}")
        
        resultados = []
        
        for idx, cliente in clientes_geocodificados.iterrows():
            cliente_coords = (cliente['lat'], cliente['lon'])
            mejor_nap = None
            menor_distancia = float('inf')
            
            for _, nap in naps.iterrows():
                nap_coords = (nap['Latitud'], nap['Longitud'])
                
                try:
                    distancia = geodesic(cliente_coords, nap_coords).meters
                    
                    # Verificar si está dentro del radio
                    if distancia <= 150:
                        # Verificar compatibilidad de calles
                        if self.cliente_compatible_con_nap(cliente['direccion_original'], nap['Dirección']):
                            if distancia < menor_distancia:
                                menor_distancia = distancia
                                mejor_nap = {
                                    'id_nap': nap['ID NAP'],
                                    'nap_codigo': nap['NAP'],
                                    'direccion_nap': nap['Dirección'],
                                    'lat_nap': nap['Latitud'],
                                    'lon_nap': nap['Longitud'],
                                    'distancia': distancia,
                                    'ocupacion': nap.get('Ocupacion_caja', 0),
                                    'puertos_utilizados': nap.get('P_Utilizados', 'N/A'),
                                    'puertos_disponibles': nap.get('P_Disponibles', 'N/A'),
                                    'puertos_totales': nap.get('P_Totales', 'N/A')
                                }
                
                except Exception as e:
                    print(f"⚠️  Error calculando distancia: {e}")
                    continue
            
            if mejor_nap:
                resultado = cliente.copy()
                resultado.update(mejor_nap)
                resultados.append(resultado)
        
        df_resultados = pd.DataFrame(resultados)
        
        print(f"\n📊 RESULTADOS ASIGNACIÓN NAPs:")
        print(f"🎯 Clientes con NAP asignada: {len(df_resultados)}")
        
        if len(df_resultados) > 0 and 'distancia' in df_resultados.columns:
            print(f"📏 Distancia promedio: {df_resultados['distancia'].mean():.1f}m")
            print(f"📏 Distancia máxima: {df_resultados['distancia'].max():.1f}m")
            print(f"📏 Distancia mínima: {df_resultados['distancia'].min():.1f}m")
        elif len(df_resultados) > 0:
            print("⚠️  Datos de distancia no disponibles")
            print(f"📋 Columnas disponibles: {list(df_resultados.columns)}")
        
        return df_resultados

    def generar_excel_final(self, clientes_originales, clientes_coords, clientes_con_nap):
        """Generar Excel final con todos los resultados"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        archivo = f"zona2_procesada_corregida_{timestamp}.xlsx"
        
        print(f"\n📊 GENERANDO EXCEL FINAL: {archivo}")
        
        resultados_finales = []
        
        for idx, cliente_original in clientes_originales.iterrows():
            # Buscar datos de geocodificación
            cliente_geo = clientes_coords[clientes_coords['idx_original'] == idx]
            
            if len(cliente_geo) > 0:
                cliente_geo = cliente_geo.iloc[0]
                
                # Buscar si tiene NAP asignada
                cliente_nap = clientes_con_nap[clientes_con_nap['idx_original'] == idx]
                
                if len(cliente_nap) > 0:
                    # Cliente con NAP
                    cliente_nap = cliente_nap.iloc[0]
                    fila = {
                        'Nombre': cliente_nap['nombre'],
                        'Dirección Original': cliente_nap['direccion_original'],
                        'Dirección Limpia': cliente_nap['direccion_limpia'],
                        'Celular': cliente_nap['celular'],
                        'Zona': cliente_nap['zona'],
                        'Estado': cliente_nap['estado'],
                        'Latitud Cliente': cliente_nap['lat'],
                        'Longitud Cliente': cliente_nap['lon'],
                        'Status Geocodificación': cliente_nap['status_geo'],
                        'NAP Asignada': cliente_nap['nap_codigo'],
                        'ID NAP': cliente_nap['id_nap'],
                        'Dirección NAP': cliente_nap['direccion_nap'],
                        'Distancia (m)': round(cliente_nap['distancia'], 1),
                        'Ocupación NAP (%)': round(cliente_nap['ocupacion'] * 100, 1),
                        'Puertos Utilizados': cliente_nap['puertos_utilizados'],
                        'Puertos Disponibles': cliente_nap['puertos_disponibles'],
                        'Puertos Totales': cliente_nap['puertos_totales'],
                        'Resultado': 'CON NAP CERCANA'
                    }
                else:
                    # Cliente geocodificado pero sin NAP
                    fila = {
                        'Nombre': cliente_geo['nombre'],
                        'Dirección Original': cliente_geo['direccion_original'],
                        'Dirección Limpia': cliente_geo['direccion_limpia'],
                        'Celular': cliente_geo['celular'],
                        'Zona': cliente_geo['zona'],
                        'Estado': cliente_geo['estado'],
                        'Latitud Cliente': cliente_geo['lat'],
                        'Longitud Cliente': cliente_geo['lon'],
                        'Status Geocodificación': cliente_geo['status_geo'],
                        'NAP Asignada': 'SIN NAP CERCANA',
                        'Dirección NAP': 'N/A',
                        'Distancia (m)': 'N/A',
                        'Ocupación NAP (%)': 'N/A',
                        'Puertos Libres NAP': 'N/A',
                        'Resultado': 'SIN NAP EN RADIO'
                    }
            else:
                # Cliente no procesado
                fila = {
                    'Nombre': cliente_original.get('NOMBRE_COMPLETO', 'Sin nombre'),
                    'Dirección Original': cliente_original['DIRECCIÓN'],
                    'Dirección Limpia': 'N/A',
                    'Celular': cliente_original.get('CELULAR', 'N/A'),
                    'Zona': 'ZONA 2',
                    'Estado': cliente_original.get('ESTADO', 'N/A'),
                    'Latitud Cliente': 'N/A',
                    'Longitud Cliente': 'N/A',
                    'Status Geocodificación': 'NO PROCESADO',
                    'NAP Asignada': 'NO PROCESADO',
                    'Dirección NAP': 'N/A',
                    'Distancia (m)': 'N/A',
                    'Ocupación NAP (%)': 'N/A',
                    'Puertos Libres NAP': 'N/A',
                    'Resultado': 'NO PROCESADO'
                }
            
            resultados_finales.append(fila)
        
        # Crear DataFrame y Excel
        df_final = pd.DataFrame(resultados_finales)
        
        with pd.ExcelWriter(archivo, engine='openpyxl') as writer:
            df_final.to_excel(writer, sheet_name='ZONA 2 Procesada', index=False)
        
        print(f"✅ Excel generado: {archivo}")
        print(f"📊 Total filas: {len(df_final)}")
        print(f"🎯 Con NAP: {len(clientes_con_nap)}")
        
        return archivo, df_final


def main():
    """Función principal"""
    print("🚀 PROCESADOR ZONA 2 - LIMPIEZA CORREGIDA")
    print("=" * 55)
    print("🔧 CORRECCIÓN: Limpieza mejorada de direcciones")
    print("   ✅ 'ALSINA 956 - DTO. 4' → 'ALSINA 956'")
    print("   ✅ Patrones mejorados para sufijos")
    print("   ✅ Usa archivo NAPs corregido")
    print()
    
    procesador = ProcesadorZona2Corregido()
    
    # 0. Prueba de limpieza de direcciones
    print("🧪 PASO 0: Prueba de limpieza de direcciones")
    procesador.test_limpieza_direcciones()
    
    confirmar = input("\n¿Las direcciones se están limpiando correctamente? (s/n): ").lower()
    if confirmar != 's':
        print("⏸️ Proceso detenido para revisar la limpieza")
        return
    
    # 1. Cargar clientes ZONA 2
    print("\n📂 PASO 1: Cargando clientes ZONA 2...")
    clientes = procesador.cargar_clientes_zona2()
    
    if clientes.empty:
        print("❌ No se encontraron clientes para procesar")
        return
    
    # 2. Cargar NAPs
    print("\n📂 PASO 2: Cargando NAPs...")
    naps = procesador.cargar_naps()
    
    if naps.empty:
        print("❌ No se encontraron NAPs para procesar")
        return
    
    # 3. Geocodificar clientes
    print(f"\n🌍 PASO 3: ¿Geocodificar {len(clientes)} clientes?")
    confirmar = input("¿Continuar con la geocodificación? (s/n): ").lower()
    
    if confirmar != 's':
        print("⏸️ Proceso cancelado")
        return
    
    clientes_coords = procesador.geocodificar_clientes(clientes)
    
    # 4. Buscar NAPs cercanas
    print("\n📏 PASO 4: Buscando NAPs cercanas...")
    clientes_con_nap = procesador.encontrar_naps_cercanas(clientes_coords, naps)
    
    # 5. Generar Excel final
    print("\n📊 PASO 5: Generando Excel final...")
    archivo_excel, df_final = procesador.generar_excel_final(clientes, clientes_coords, clientes_con_nap)
    
    print(f"\n🎉 ZONA 2 PROCESADA CON LIMPIEZA CORREGIDA!")
    print(f"📄 Archivo: {archivo_excel}")
    print(f"🎯 Clientes con NAP: {len(clientes_con_nap)}")
    print(f"📊 % Éxito asignación: {len(clientes_con_nap)/len(clientes)*100:.1f}%")
    
    if len(clientes_con_nap) > 0:
        print(f"📏 Distancia promedio: {clientes_con_nap['distancia'].mean():.1f}m")


if __name__ == "__main__":
    main()
