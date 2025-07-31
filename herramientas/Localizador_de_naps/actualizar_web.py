#!/usr/bin/env python3
"""
Script para automatizar la actualización de la herramienta web de NAPs.
Convierte el CSV a JSON y actualiza los archivos necesarios.
Uso: python actualizar_web.py archivo.csv
"""

import pandas as pd
import json
import sys
import os
from typing import List, Dict, Any

def csv_to_json(csv_file: str) -> List[Dict[str, Any]]:
    """
    Convierte un archivo CSV de NAPs al formato JSON requerido.
    
    Args:
        csv_file: Ruta al archivo CSV
        
    Returns:
        Lista de diccionarios con los datos de las NAPs
    """
    try:
        # Leer el archivo CSV
        df = pd.read_csv(csv_file, sep=';', encoding='utf-8')
        
        # Verificar columnas requeridas
        required_columns = ['ID NAP', 'DIRECCION', 'Puertos_Utilizados', 'Puertos_Disponibles']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"❌ Error: Faltan las siguientes columnas: {missing_columns}")
            print("Las columnas requeridas son:")
            for col in required_columns:
                print(f"  - {col}")
            return []
        
        # Verificar si existen columnas de coordenadas
        has_coordinates = 'Latitud' in df.columns and 'Longitud' in df.columns
        
        if not has_coordinates:
            print("⚠️  Advertencia: No se encontraron columnas Latitud y Longitud.")
            print("Se generarán coordenadas de ejemplo. Deberás actualizarlas manualmente.")
        
        # Convertir a lista de diccionarios
        naps = []
        for idx, (index, row) in enumerate(df.iterrows()):
            # Calcular puertos totales
            puertos_utilizados = int(row['Puertos_Utilizados'])
            puertos_disponibles = int(row['Puertos_Disponibles'])
            puertos_totales = puertos_utilizados + puertos_disponibles
            
            nap = {
                'id': str(row['ID NAP']),
                'direccion': str(row['DIRECCION']),
                'puertosTotales': puertos_totales,
                'puertosOcupados': puertos_utilizados
            }
            
            # Agregar coordenadas si existen, sino usar coordenadas de ejemplo
            if has_coordinates:
                # Convertir comas a puntos para coordenadas decimales
                lat_str = str(row['Latitud']).replace(',', '.')
                lon_str = str(row['Longitud']).replace(',', '.')
                try:
                    nap['lat'] = float(lat_str)
                    nap['lon'] = float(lon_str)
                except ValueError:
                    print(f"⚠️  Coordenadas inválidas para {nap['id']}, usando coordenadas de ejemplo")
                    # Coordenadas de ejemplo (centro de Tandil + offset)
                    base_lat = -37.3217
                    base_lon = -59.1332
                    offset = idx * 0.0001  # Pequeño offset para cada NAP
                    nap['lat'] = base_lat + offset
                    nap['lon'] = base_lon + offset
            else:
                # Coordenadas de ejemplo (centro de Tandil + offset)
                base_lat = -37.3217
                base_lon = -59.1332
                offset = idx * 0.0001  # Pequeño offset para cada NAP
                nap['lat'] = base_lat + offset
                nap['lon'] = base_lon + offset
            
            naps.append(nap)
        
        return naps
        
    except Exception as e:
        print(f"❌ Error al procesar el archivo: {e}")
        return []

def generate_javascript_code(naps: List[Dict[str, Any]]) -> str:
    """
    Genera el código JavaScript para insertar en tools.html
    
    Args:
        naps: Lista de diccionarios con los datos de las NAPs
        
    Returns:
        String con el código JavaScript
    """
    js_code = "const napData = [\n"
    
    for nap in naps:
        js_code += f"    {{ id: \"{nap['id']}\", direccion: \"{nap['direccion']}\", "
        js_code += f"puertosTotales: {nap['puertosTotales']}, puertosOcupados: {nap['puertosOcupados']}, "
        js_code += f"lat: {nap['lat']}, lon: {nap['lon']} }},\n"
    
    js_code = js_code.rstrip(',\n') + "\n];"
    
    return js_code

def save_json_file(naps: List[Dict[str, Any]], output_file: str = "nap_data.json"):
    """
    Guarda los datos en formato JSON
    
    Args:
        naps: Lista de diccionarios con los datos de las NAPs
        output_file: Nombre del archivo de salida
    """
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(naps, f, indent=2, ensure_ascii=False)
        print(f"✅ Archivo JSON guardado como: {output_file}")
    except Exception as e:
        print(f"❌ Error al guardar el archivo JSON: {e}")

def main():
    """Función principal"""
    if len(sys.argv) != 2:
        print("Uso: python actualizar_web.py archivo.csv")
        print("\nEjemplo:")
        print("  python actualizar_web.py cajas_naps.csv")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    
    # Verificar que el archivo existe
    if not os.path.exists(csv_file):
        print(f"❌ Error: El archivo '{csv_file}' no existe.")
        sys.exit(1)
    
    print(f"📁 Procesando archivo: {csv_file}")
    
    # Convertir CSV a JSON
    naps = csv_to_json(csv_file)
    
    if not naps:
        print("❌ No se pudieron procesar los datos.")
        sys.exit(1)
    
    print(f"✅ Se procesaron {len(naps)} NAPs correctamente.")
    
    # Guardar archivo JSON
    save_json_file(naps)
    
    # Generar código JavaScript
    js_code = generate_javascript_code(naps)
    
    # Guardar código JavaScript en archivo separado
    with open("nap_data.js", 'w', encoding='utf-8') as f:
        f.write(js_code)
    
    print("✅ Código JavaScript guardado como: nap_data.js")
    
    # Mostrar instrucciones
    print("\n🎉 ¡Actualización completada!")
    print("La herramienta web ahora cargará automáticamente los datos desde nap_data.js")
    print("No necesitas hacer más cambios en tools.html")
    
    # Mostrar estadísticas
    total_ports = sum(nap['puertosTotales'] for nap in naps)
    occupied_ports = sum(nap['puertosOcupados'] for nap in naps)
    available_ports = total_ports - occupied_ports
    
    print(f"\n📊 Estadísticas:")
    print(f"  - Total de NAPs: {len(naps)}")
    print(f"  - Puertos totales: {total_ports}")
    print(f"  - Puertos ocupados: {occupied_ports}")
    print(f"  - Puertos disponibles: {available_ports}")
    print(f"  - Porcentaje de ocupación: {(occupied_ports/total_ports*100):.1f}%")
    
    print(f"\n🚀 Para futuras actualizaciones, simplemente ejecuta:")
    print(f"   python actualizar_web.py {csv_file}")

if __name__ == "__main__":
    main() 