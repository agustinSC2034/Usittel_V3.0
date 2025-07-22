#!/usr/bin/env python3
"""
Script para convertir todas las imágenes de las carpetas hero a formato WebP
"""
import os
from PIL import Image
import sys

def convert_to_webp(folder_path):
    """Convierte todas las imágenes de una carpeta a WebP"""
    if not os.path.exists(folder_path):
        print(f"Error: La carpeta {folder_path} no existe")
        return False
    
    converted_count = 0
    error_count = 0
    
    print(f"Procesando carpeta: {folder_path}")
    
    # Extensiones de imagen soportadas
    supported_formats = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')
    
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(supported_formats):
            try:
                # Ruta completa del archivo original
                original_path = os.path.join(folder_path, filename)
                
                # Crear nueva ruta con extensión .webp
                name_without_ext = os.path.splitext(filename)[0]
                webp_path = os.path.join(folder_path, f"{name_without_ext}.webp")
                
                # Abrir y convertir la imagen
                with Image.open(original_path) as img:
                    # Convertir a RGB si es necesario (para imágenes con transparencia)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        # Para imágenes con transparencia, mantener el canal alpha
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        img.save(webp_path, 'WEBP', quality=85, method=6)
                    else:
                        img.save(webp_path, 'WEBP', quality=85, method=6)
                
                print(f"✓ Convertido: {filename} -> {name_without_ext}.webp")
                converted_count += 1
                
            except Exception as e:
                print(f"✗ Error al convertir {filename}: {str(e)}")
                error_count += 1
    
    print(f"\nResultados para {folder_path}:")
    print(f"  - Archivos convertidos: {converted_count}")
    print(f"  - Errores: {error_count}")
    
    return error_count == 0

def main():
    # Rutas de las carpetas hero
    base_path = os.path.dirname(os.path.abspath(__file__))
    web_folder = os.path.join(base_path, "assets", "img", "hero", "web")
    mobile_folder = os.path.join(base_path, "assets", "img", "hero", "mobile")
    
    print("=== Convertidor de imágenes a WebP ===\n")
    
    # Convertir carpeta web
    success_web = convert_to_webp(web_folder)
    
    print()
    
    # Convertir carpeta mobile
    success_mobile = convert_to_webp(mobile_folder)
    
    print("\n=== Conversión completada ===")
    
    if success_web and success_mobile:
        print("✓ Todas las imágenes se convirtieron exitosamente")
        return 0
    else:
        print("✗ Hubo algunos errores durante la conversión")
        return 1

if __name__ == "__main__":
    sys.exit(main())
