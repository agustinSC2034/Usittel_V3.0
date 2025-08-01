#!/usr/bin/env python3
"""
Script para generar el Excel final de ZONA 2 con datos ya procesados
"""

import pandas as pd
import json
from datetime import datetime
from geopy.distance import geodesic
import re

def limpiar_direccion(direccion):
    """Limpiar y normalizar dirección"""
    if pd.isna(direccion):
        return None
    
    direccion = str(direccion).strip()
    
    # Lista MUY ESPECÍFICA de sufijos a remover (solo al final)
    sufijos_especificos = [
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
        r'\s*\(\s*(DPTO|DTO|DEPTO)\s*\d*\s*\)$',
        r'\s*/\d+\s*$',
        r'\s+[A-Z]\s*$',
    ]
    
    # Aplicar limpiezas específicas solo al final
    for patron in sufijos_especificos:
        direccion = re.sub(patron, '', direccion, flags=re.IGNORECASE)
    
    # Limpiar espacios múltiples
    direccion = ' '.join(direccion.split())
    
    return direccion if direccion else None

def cliente_compatible_con_nap(direccion_cliente, direccion_nap):
    """Verificar si cliente y NAP están en calles compatibles"""
    try:
        # Limpiar direcciones
        dir_cliente = limpiar_direccion(direccion_cliente).upper()
        dir_nap = limpiar_direccion(direccion_nap).upper()
        
        if not dir_cliente or not dir_nap:
            return False
        
        # Extraer nombre de calle del cliente (sin número)
        import re
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
        print("🚀 GENERANDO EXCEL FINAL ZONA 2")
        print("="*50)
        
        # 1. Cargar clientes originales
        print("📂 Cargando clientes ZONA 2...")
        df_clientes = pd.read_excel('excels_con_los_datos_de_partida/base_de_datos_clientes_no_respondieron_zona_2.xlsx')
        df_clientes = df_clientes[df_clientes['ESTADO'] != 'CONTRATÓ'].copy()
        
        print(f"📊 Clientes válidos: {len(df_clientes)}")
        
        # 2. Cargar NAPs
        print("📂 Cargando NAPs corregidas...")
        df_naps = pd.read_excel('excels_con_los_datos_de_partida/archivo_final_naps.xlsx')
        print(f"📊 NAPs disponibles: {len(df_naps)}")
        
        # 3. Cargar cache de geocodificación
        print("📂 Cargando cache de geocodificación...")
        cache_file = "cache_zona2_corregido_limpieza.json"
        with open(cache_file, 'r', encoding='utf-8') as f:
            cache_geocoding = json.load(f)
        
        print(f"📊 Direcciones en cache: {len(cache_geocoding)}")
        
        # 4. Procesar cada cliente
        print("🔄 Procesando clientes...")
        resultados = []
        
        clientes_geocodificados = 0
        clientes_con_nap = 0
        
        for idx, cliente in df_clientes.iterrows():
            try:
                nombre = cliente['NOMBRE COMPLETO']
                direccion_original = cliente['DIRECCIÓN']
                celular = cliente['CELULAR']
                estado = cliente['ESTADO']
                
                # Limpiar dirección
                direccion_limpia = limpiar_direccion(direccion_original)
                
                # Buscar en cache
                cliente_lat = None
                cliente_lon = None
                status_geo = "NO GEOCODIFICADO"
                
                if direccion_limpia and direccion_limpia in cache_geocoding:
                    cache_data = cache_geocoding[direccion_limpia]
                    if cache_data['exito']:
                        cliente_lat = cache_data['lat']
                        cliente_lon = cache_data['lon']
                        status_geo = "GEOCODIFICADO"
                        clientes_geocodificados += 1
                
                # Buscar NAP cercana si está geocodificado
                nap_asignada = None
                distancia_nap = None
                
                if cliente_lat and cliente_lon:
                    cliente_coords = (cliente_lat, cliente_lon)
                    mejor_distancia = float('inf')
                    
                    for _, nap in df_naps.iterrows():
                        # Verificar ocupación
                        if nap['Ocupacion_caja'] > 0.30:
                            continue
                            
                        nap_coords = (nap['Latitud'], nap['Longitud'])
                        distancia = geodesic(cliente_coords, nap_coords).meters
                        
                        # Verificar distancia y compatibilidad de calles
                        if distancia <= 150:
                            if cliente_compatible_con_nap(direccion_original, nap['Dirección']):
                                if distancia < mejor_distancia:
                                    mejor_distancia = distancia
                                    nap_asignada = nap
                                    distancia_nap = distancia
                
                # Crear fila de resultado
                fila = {
                    'Nombre': nombre,
                    'Dirección Original': direccion_original,
                    'Dirección Limpia': direccion_limpia,
                    'Celular': celular,
                    'Zona': 'ZONA 2',
                    'Estado': estado,
                    'Latitud Cliente': cliente_lat,
                    'Longitud Cliente': cliente_lon,
                    'Status Geocodificación': status_geo,
                }
                
                if nap_asignada is not None:
                    # Cliente con NAP
                    clientes_con_nap += 1
                    fila.update({
                        'NAP Asignada': nap_asignada['NAP'],
                        'ID NAP': nap_asignada['ID NAP'],
                        'Dirección NAP': nap_asignada['Dirección'],
                        'Latitud NAP': nap_asignada['Latitud'],
                        'Longitud NAP': nap_asignada['Longitud'],
                        'Distancia (m)': round(distancia_nap, 1),
                        'Ocupación NAP (%)': round(nap_asignada['Ocupacion_caja'] * 100, 1),
                        'Puertos Utilizados': nap_asignada['P_Utilizados'],
                        'Puertos Disponibles': nap_asignada['P_Disponibles'],
                        'Puertos Totales': nap_asignada['P_Totales'],
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
                        'Resultado': 'SIN NAP CERCANA' if status_geo == "GEOCODIFICADO" else 'NO GEOCODIFICADO'
                    })
                
                resultados.append(fila)
                
            except Exception as e:
                print(f"⚠️  Error procesando cliente {idx}: {e}")
                continue
        
        # 5. Crear DataFrame y guardar Excel
        df_final = pd.DataFrame(resultados)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        archivo = f"zona2_procesada_final_{timestamp}.xlsx"
        
        df_final.to_excel(archivo, index=False)
        
        # 6. Mostrar estadísticas finales
        print(f"\n📊 ESTADÍSTICAS FINALES:")
        print(f"📋 Total clientes procesados: {len(df_final)}")
        print(f"🌍 Clientes geocodificados: {clientes_geocodificados} ({clientes_geocodificados/len(df_final)*100:.1f}%)")
        print(f"🎯 Clientes con NAP asignada: {clientes_con_nap} ({clientes_con_nap/len(df_final)*100:.1f}%)")
        print(f"📁 Archivo generado: {archivo}")
        
        if clientes_con_nap > 0:
            clientes_con_distancia = df_final[df_final['Distancia (m)'].notna()]
            if len(clientes_con_distancia) > 0:
                print(f"📏 Distancia promedio: {clientes_con_distancia['Distancia (m)'].mean():.1f}m")
                print(f"📏 Distancia máxima: {clientes_con_distancia['Distancia (m)'].max():.1f}m")
                print(f"📏 Distancia mínima: {clientes_con_distancia['Distancia (m)'].min():.1f}m")
        
        print(f"\n✅ ZONA 2 PROCESADA EXITOSAMENTE")
        return archivo
        
    except Exception as e:
        print(f"❌ Error procesando ZONA 2: {e}")
        return None

if __name__ == "__main__":
    main()
