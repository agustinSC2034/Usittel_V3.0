#!/usr/bin/env python3
"""
Script para convertir archivo Excel de NAPs al formato JSON requerido por la herramienta web.
Uso: python excel_to_json.py archivo.xlsx
"""

import pandas as pd
import json
import sys
import os
from typing import List, Dict, Any

def excel_to_json(excel_file: str) -> List[Dict[str, Any]]:
    """
    Convierte un archivo Excel de NAPs al formato JSON requerido.
    
    Args:
        excel_file: Ruta al archivo Excel
        
    Returns:
        Lista de diccionarios con los datos de las NAPs
    """
    try:
        # Leer el archivo Excel
        df = pd.read_excel(excel_file)
        
        # Verificar columnas requeridas
        required_columns = ['ID_NAP', 'DIRECCION', 'PUERTOS_TOTALES', 'PUERTOS_OCUPADOS']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"❌ Error: Faltan las siguientes columnas: {missing_columns}")
            print("Las columnas requeridas son:")
            for col in required_columns:
                print(f"  - {col}")
            return []
        
        # Verificar si existen columnas de coordenadas
        has_coordinates = 'LATITUD' in df.columns and 'LONGITUD' in df.columns
        
        if not has_coordinates:
            print("⚠️  Advertencia: No se encontraron columnas LATITUD y LONGITUD.")
            print("Se generarán coordenadas de ejemplo. Deberás actualizarlas manualmente.")
        
        # Convertir a lista de diccionarios
        naps = []
        for idx, (index, row) in enumerate(df.iterrows()):
            nap = {
                'id': str(row['ID_NAP']),
                'direccion': str(row['DIRECCION']),
                'puertosTotales': int(row['PUERTOS_TOTALES']),
                'puertosOcupados': int(row['PUERTOS_OCUPADOS'])
            }
            
            # Agregar coordenadas si existen, sino usar coordenadas de ejemplo
            if has_coordinates:
                nap['lat'] = float(row['LATITUD'])
                nap['lon'] = float(row['LONGITUD'])
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
        print("Uso: python excel_to_json.py archivo.xlsx")
        print("\nEjemplo:")
        print("  python excel_to_json.py cajas_naps.xlsx")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    
    # Verificar que el archivo existe
    if not os.path.exists(excel_file):
        print(f"❌ Error: El archivo '{excel_file}' no existe.")
        sys.exit(1)
    
    print(f"📁 Procesando archivo: {excel_file}")
    
    # Convertir Excel a JSON
    naps = excel_to_json(excel_file)
    
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
    print("\n📋 Instrucciones para actualizar tools.html:")
    print("1. Abre el archivo tools.html")
    print("2. Busca la línea que dice 'const napData = ['")
    print("3. Reemplaza todo el array con el contenido de nap_data.js")
    print("4. Guarda el archivo")
    
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

if __name__ == "__main__":
    main() 