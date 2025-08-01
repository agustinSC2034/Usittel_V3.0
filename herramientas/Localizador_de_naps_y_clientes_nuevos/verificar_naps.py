#!/usr/bin/env python3
"""
Script para verificar y geocodificar todas las NAPs disponibles
"""

import pandas as pd
from geopy.geocoders import Nominatim
import time
import json
import os
from datetime import datetime
import re

class VerificadorNAPs:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="usittel_verificar_naps", timeout=15)
        self.cache_geocoding = {}
        self.cache_file = "cache_naps_verificacion.json"
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

    def limpiar_direccion(self, direccion):
        """Limpiar y normalizar dirección para geocodificación"""
        if pd.isna(direccion):
            return None
        
        direccion = str(direccion).strip()
        
        # Si la dirección está en formato de fecha, no procesarla
        if re.match(r'\d{4}-\d{2}-\d{2}', direccion):
            return direccion
        
        # Limpiar solo referencias a Tandil explícitas (no palabras que contengan letras)
        direccion = re.sub(r'\b(TANDIL|Tandil)\b', '', direccion).strip()
        
        # Normalizar abreviaciones ANTES de cualquier limpieza
        normalizaciones = {
            # Calles importantes - expandir abreviaciones
            r'\b(AV|AVENIDA)\s+(MONS|MONSEÑOR)\s+ACTIS\b': 'Avenida Monseñor Actis',
            r'\b1ra\s+Junta\b': 'Primera Junta',
            r'\bGRAL\.?\s+PAZ\b': 'General Paz',  # IMPORTANTE: mantener "General Paz" completo
            r'\bGRAL\.?\s+PINTO\b': 'General Pinto',
            r'\bGRAL\.?\s+RODRIGUEZ\b': 'General Rodriguez',
            r'\bGRAL\.?\s+ROCA\b': 'General Roca',
            r'\bGRAL\b(?!\s+(PAZ|PINTO|RODRIGUEZ|ROCA))': 'General',  # Solo si no es seguido de apellidos importantes
            r'\bGENERAL\s+PAZ\b': 'General Paz',  # Asegurar que General Paz se mantenga
            r'\bAV\.?\s+MARCONI\b': 'Avenida Marconi',
            r'\bAV\.?\s+AVELLANEDA\b': 'Avenida Avellaneda',
            r'\bAV\.?\s+BUZON\b': 'Avenida Buzon',
            r'\bAV\.?\s+(ESPORA|ES)\b': 'Avenida Espora',  # Corregir "Es" a "Espora"
            
            # Meses
            r'\bde\s+May\b': 'de Mayo',  # Corregir "May" a "Mayo"
            
            # Otros
            r'\bSTA\.?\s+ANA\b': 'Santa Ana',
            r'\bSAN\.?\s+LORENZO\b': 'San Lorenzo',
            r'\bSAN\.?\s+FRANCISCO\b': 'San Francisco',
            r'\bSAN\.?\s+MARTIN\b': 'San Martin',
        }
        
        # Aplicar normalizaciones
        for patron, reemplazo in normalizaciones.items():
            direccion = re.sub(patron, reemplazo, direccion, flags=re.IGNORECASE)
        
        # Lista MUY ESPECÍFICA de sufijos a remover (solo al final de direcciones)
        sufijos_especificos = [
            # Solo remover si están claramente al final y son departamentos/locales
            r'\s*[-–]\s*(DPTO|DTO|DEPTO|DEPARTAMENTO)\s*\w*$',
            r'\s+(DPTO|DTO|DEPTO|DEPARTAMENTO)\s*\w*$',
            r'\s*[-–]\s*(CASA|LOCAL|OFICINA|TALLER)\s*\w*$',
            r'\s+(CASA|LOCAL|OFICINA|TALLER)\s*\w*$',
            r'\s*[-–]\s*(INT\.?|INTERNO|INTERNA)\s*\w*$',
            r'\s+(INT\.?|INTERNO|INTERNA)\s*\w*$',
            r'\s*[-–]\s*PH\s*\w*$',
            r'\s+PH\s*\w*$',
            r'\s*[-–]\s*(PISO|P\.)\s*\w*$',
            r'\s+(PISO|P\.)\s*\w*$',
        ]
        
        # Aplicar limpiezas específicas solo al final
        for patron in sufijos_especificos:
            direccion = re.sub(patron, '', direccion, flags=re.IGNORECASE)
        
        # Limpiar espacios múltiples y normalizar
        direccion = ' '.join(direccion.split())
        
        # Verificar que no se haya truncado incorrectamente
        # Si la dirección termina abruptamente, es posible que algo se haya cortado mal
        if direccion and len(direccion) < 5:
            return None  # Dirección demasiado corta, probablemente truncada
        
        return direccion if direccion else None
    
    def geocodificar_direccion(self, direccion_original):
        """Geocodificar una dirección con cache"""
        direccion_limpia = self.limpiar_direccion(direccion_original)
        
        if not direccion_limpia:
            return None, None, "Dirección vacía", None
        
        # Buscar en cache
        if direccion_limpia in self.cache_geocoding:
            resultado = self.cache_geocoding[direccion_limpia]
            if resultado['exito']:
                return resultado['lat'], resultado['lon'], "Cache", resultado['direccion_completa']
            else:
                return None, None, resultado['error'], resultado.get('direccion_completa', None)
        
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
                
                return lat, lon, "Geocodificado", direccion_completa
            else:
                # Guardar fallo en cache
                self.cache_geocoding[direccion_limpia] = {
                    'exito': False,
                    'error': 'No encontrado',
                    'direccion_completa': direccion_completa
                }
                return None, None, "No encontrado", direccion_completa
                
        except Exception as e:
            error_msg = str(e)
            print(f"    ❌ Error: {error_msg}")
            
            # Guardar error en cache
            self.cache_geocoding[direccion_limpia] = {
                'exito': False,
                'error': error_msg,
                'direccion_completa': direccion_completa
            }
            
            return None, None, error_msg, direccion_completa
    
    def cargar_naps(self):
        """Cargar datos de NAPs"""
        print("📂 Cargando NAPs...")
        
        naps_file = "excels_con_los_datos_de_partida/Cajas_naps_con_menos_del_30_de_ocupacion.xlsx"
        try:
            self.df_naps = pd.read_excel(naps_file)
            print(f"✅ NAPs cargadas: {len(self.df_naps)} registros")
            print(f"   Columnas: {list(self.df_naps.columns)}")
            return True
        except Exception as e:
            print(f"❌ Error cargando NAPs: {e}")
            return False
    
    def verificar_todas_las_naps(self):
        """Verificar geocodificación de todas las NAPs"""
        print(f"\n📡 VERIFICANDO GEOCODIFICACIÓN DE {len(self.df_naps)} NAPs...")
        print("="*60)
        
        resultados = []
        exitosas = 0
        fallidas = 0
        
        for i, nap in self.df_naps.iterrows():
            print(f"\n[{i+1}/{len(self.df_naps)}] Verificando NAP...")
            
            # Obtener datos de la NAP
            direccion_original = nap['Dirección'] if 'Dirección' in nap else None
            nomenclatura = nap['Nomenclatura'] if 'Nomenclatura' in nap else "N/A"
            ocupacion_porcentaje = nap['% UTILIZACIÓN'] if '% UTILIZACIÓN' in nap else 0
            puertos_ocupados = nap['PUERTOS OCUPADOS'] if 'PUERTOS OCUPADOS' in nap else 0
            puertos_libres = nap['PUERTOS LIBRES'] if 'PUERTOS LIBRES' in nap else 0
            puertos_totales = nap['TOTAL PUERTOS'] if 'TOTAL PUERTOS' in nap else 0
            
            print(f"  📡 NAP: {nomenclatura}")
            print(f"  📍 Dirección original: {direccion_original}")
            print(f"  📊 Ocupación: {ocupacion_porcentaje*100:.1f}%")
            
            # Geocodificar
            lat, lon, status, direccion_completa = self.geocodificar_direccion(direccion_original)
            
            if lat is not None:
                print(f"    ✅ Geocodificado: {lat:.6f}, {lon:.6f} ({status})")
                exitosas += 1
                geocodificacion_exitosa = "SÍ"
            else:
                print(f"    ❌ Error: {status}")
                fallidas += 1
                geocodificacion_exitosa = "NO"
            
            # Guardar resultado
            resultado = {
                'nomenclatura': nomenclatura,
                'direccion_original': direccion_original,
                'direccion_limpia': self.limpiar_direccion(direccion_original),
                'direccion_completa_geocoding': direccion_completa,
                'geocodificacion_exitosa': geocodificacion_exitosa,
                'latitud': lat,
                'longitud': lon,
                'status_geocoding': status,
                'ocupacion_porcentaje': ocupacion_porcentaje * 100 if isinstance(ocupacion_porcentaje, (int, float)) else ocupacion_porcentaje,
                'puertos_ocupados': puertos_ocupados,
                'puertos_libres': puertos_libres,
                'puertos_totales': puertos_totales
            }
            
            resultados.append(resultado)
            
            # Guardar cache cada 10 NAPs
            if (i + 1) % 10 == 0:
                self.guardar_cache()
                print(f"    💾 Cache guardado (progreso: {i+1}/{len(self.df_naps)})")
                print(f"    📊 Estado actual: {exitosas} exitosas, {fallidas} fallidas")
        
        print(f"\n📊 RESUMEN FINAL:")
        print(f"   Total NAPs: {len(self.df_naps)}")
        print(f"   Geocodificadas exitosamente: {exitosas} ({exitosas/len(self.df_naps)*100:.1f}%)")
        print(f"   Con errores: {fallidas} ({fallidas/len(self.df_naps)*100:.1f}%)")
        
        return resultados
    
    def guardar_excel_naps(self, resultados):
        """Guardar resultados de NAPs en Excel"""
        df_resultados = pd.DataFrame(resultados)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"NAPs_geocodificadas_{timestamp}.xlsx"
        
        try:
            df_resultados.to_excel(filename, index=False)
            print(f"\n💾 EXCEL NAPs GUARDADO: {filename}")
            
            # Estadísticas detalladas
            total = len(df_resultados)
            exitosas = len(df_resultados[df_resultados['geocodificacion_exitosa'] == 'SÍ'])
            fallidas = len(df_resultados[df_resultados['geocodificacion_exitosa'] == 'NO'])
            
            print(f"\n📊 ESTADÍSTICAS DETALLADAS:")
            print(f"   Total NAPs analizadas: {total}")
            print(f"   Geocodificadas correctamente: {exitosas} ({exitosas/total*100:.1f}%)")
            print(f"   Con errores de geocodificación: {fallidas} ({fallidas/total*100:.1f}%)")
            
            if fallidas > 0:
                print(f"\n🚨 NAPs PROBLEMÁTICAS:")
                naps_problema = df_resultados[df_resultados['geocodificacion_exitosa'] == 'NO']
                for _, nap in naps_problema.head(10).iterrows():
                    print(f"   - {nap['nomenclatura']}: {nap['direccion_original']} ({nap['status_geocoding']})")
                if len(naps_problema) > 10:
                    print(f"   ... y {len(naps_problema) - 10} más (ver Excel completo)")
            
            return filename
            
        except Exception as e:
            print(f"❌ Error guardando Excel: {e}")
            return None
    
    def ejecutar(self):
        """Ejecutar la verificación completa"""
        print("🔍 INICIANDO VERIFICACIÓN DE NAPs")
        print("="*50)
        
        # 1. Cargar NAPs
        if not self.cargar_naps():
            return False
        
        # 2. Verificar geocodificación
        resultados = self.verificar_todas_las_naps()
        
        # 3. Guardar cache final
        self.guardar_cache()
        
        # 4. Guardar Excel
        archivo_generado = self.guardar_excel_naps(resultados)
        
        if archivo_generado:
            print(f"\n✅ VERIFICACIÓN NAPs COMPLETADA")
            print(f"📁 Archivo generado: {archivo_generado}")
            print(f"\n💡 SIGUIENTE PASO:")
            print(f"   Revisa el archivo Excel para ver qué NAPs no se pudieron geocodificar")
            print(f"   y podemos corregir las direcciones problemáticas antes de continuar")
            return True
        else:
            print(f"\n❌ ERROR EN LA VERIFICACIÓN")
            return False

def main():
    verificador = VerificadorNAPs()
    verificador.ejecutar()

if __name__ == "__main__":
    main()
