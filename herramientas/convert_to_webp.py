import os
from PIL import Image

# Carpeta raíz de las imágenes
ROOT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')

# Extensiones de imagen a convertir
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png')

def convert_image_to_webp(image_path):
    webp_path = os.path.splitext(image_path)[0] + '.webp'
    try:
        with Image.open(image_path) as img:
            img.save(webp_path, 'webp', quality=90)
        print(f"Convertido: {image_path} -> {webp_path}")
    except Exception as e:
        print(f"Error al convertir {image_path}: {e}")

def convert_all_images(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith(IMAGE_EXTENSIONS):
                image_path = os.path.join(dirpath, filename)
                convert_image_to_webp(image_path)

if __name__ == "__main__":
    print(f"Convirtiendo imágenes en: {ROOT_DIR}")
    convert_all_images(ROOT_DIR)
    print("\n¡Conversión finalizada!") 