#!/usr/bin/env python3
"""
Script de configuración y validación del entorno
"""

import os
import sys
import pandas as pd

def verificar_archivos():
    """Verifica que existan los archivos necesarios"""
    archivos_requeridos = [
        ("base de datos copia.xlsx", "Base de datos de clientes"),
        ("../Localizador_de_naps/naps.xlsx", "Base de datos de NAPs")
    ]
    
    print("🔍 Verificando archivos necesarios...")
    
    archivos_ok = True
    for archivo, descripcion in archivos_requeridos:
        if os.path.exists(archivo):
            print(f"✅ {descripcion}: {archivo}")
        else:
            print(f"❌ {descripcion}: {archivo} - NO ENCONTRADO")
            archivos_ok = False
    
    return archivos_ok

def verificar_estructura_datos():
    """Verifica la estructura de los datos"""
    print("\n📊 Verificando estructura de datos...")
    
    try:
        # Verificar base de clientes
        excel_file = pd.ExcelFile("base de datos copia.xlsx")
        hojas = excel_file.sheet_names
        print(f"Hojas encontradas en base de datos: {hojas}")
        
        hojas_requeridas = ['ZONA 1', 'ZONA 2']
        for hoja in hojas_requeridas:
            if hoja in hojas:
                df = pd.read_excel("base de datos copia.xlsx", sheet_name=hoja)
                print(f"✅ {hoja}: {len(df)} registros")
                
                # Verificar columnas clave
                columnas_requeridas = ['DIRECCIÓN', 'ESTADO']
                for col in columnas_requeridas:
                    if col in df.columns:
                        no_vacios = df[col].notna().sum()
                        print(f"   - {col}: {no_vacios} registros con datos")
                    else:
                        print(f"   ⚠️ Columna {col} no encontrada")
            else:
                print(f"❌ Hoja {hoja} no encontrada")
        
        # Verificar NAPs
        if os.path.exists("../Localizador_de_naps/naps.xlsx"):
            naps = pd.read_excel("../Localizador_de_naps/naps.xlsx")
            print(f"✅ NAPs: {len(naps)} registros")
            
            columnas_nap = ['id', 'nombre_nap', 'direccion', 'puertos_utilizados', 'puertos_disponibles', 'Latitud', 'Longitud']
            for col in columnas_nap:
                if col in naps.columns:
                    no_vacios = naps[col].notna().sum()
                    print(f"   - {col}: {no_vacios} registros con datos")
                else:
                    print(f"   ⚠️ Columna {col} no encontrada en NAPs")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verificando datos: {e}")
        return False

def instalar_dependencias():
    """Verifica e instala dependencias necesarias"""
    print("\n📦 Verificando dependencias...")
    
    dependencias = [
        'pandas',
        'openpyxl', 
        'geopy',
        'folium',
        'requests',
        'numpy'
    ]
    
    dependencias_faltantes = []
    
    for dep in dependencias:
        try:
            __import__(dep)
            print(f"✅ {dep}")
        except ImportError:
            print(f"❌ {dep} - NO INSTALADO")
            dependencias_faltantes.append(dep)
    
    if dependencias_faltantes:
        print(f"\n⚠️ Dependencias faltantes: {', '.join(dependencias_faltantes)}")
        respuesta = input("¿Instalar dependencias faltantes? (s/n): ")
        
        if respuesta.lower() == 's':
            import subprocess
            for dep in dependencias_faltantes:
                print(f"Instalando {dep}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
            print("✅ Dependencias instaladas")
            return True
        else:
            print("❌ No se pueden ejecutar los scripts sin las dependencias")
            return False
    
    return True

def configuracion_inicial():
    """Configuración inicial del sistema"""
    print("⚙️ Configuración del sistema de análisis de clientes prioritarios")
    print("=" * 60)
    
    # Verificar archivos
    if not verificar_archivos():
        print("\n❌ Faltan archivos necesarios. Por favor, revisa la documentación.")
        return False
    
    # Verificar dependencias
    if not instalar_dependencias():
        print("\n❌ Faltan dependencias necesarias.")
        return False
    
    # Verificar estructura de datos
    if not verificar_estructura_datos():
        print("\n❌ Problemas con la estructura de datos.")
        return False
    
    print("\n" + "=" * 60)
    print("✅ Sistema configurado correctamente!")
    print("\nPróximos pasos:")
    print("1. Ejecutar: python generar_lista_prioritaria.py (versión de prueba)")
    print("2. Ejecutar: python generar_lista_completa.py (versión completa)")
    print("3. Revisar README.md para más información")
    
    return True

if __name__ == "__main__":
    configuracion_inicial()
