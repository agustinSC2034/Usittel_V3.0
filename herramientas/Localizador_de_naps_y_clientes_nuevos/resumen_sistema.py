#!/usr/bin/env python3
"""
Resumen del sistema de análisis de clientes prioritarios para Usittel
"""

import os
import pandas as pd
from datetime import datetime

def mostrar_resumen():
    """Muestra un resumen de los archivos generados y estadísticas"""
    
    print("🎯 SISTEMA DE ANÁLISIS DE CLIENTES PRIORITARIOS - USITTEL")
    print("=" * 70)
    print(f"Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print()
    
    # Buscar el archivo Excel más reciente
    archivos_excel = [f for f in os.listdir('.') if f.startswith('clientes_prioritarios') and f.endswith('.xlsx')]
    
    if not archivos_excel:
        print("❌ No se encontraron archivos de resultados.")
        return
    
    archivo_mas_reciente = max(archivos_excel, key=os.path.getctime)
    
    print(f"📄 ARCHIVO PRINCIPAL: {archivo_mas_reciente}")
    print("-" * 70)
    
    try:
        # Leer el Excel principal
        df = pd.read_excel(archivo_mas_reciente, sheet_name='Clientes Prioritarios')
        
        print(f"🎯 CLIENTES PRIORITARIOS ENCONTRADOS: {len(df)}")
        print()
        
        # Estadísticas generales
        print("📊 ESTADÍSTICAS GENERALES:")
        print(f"   • Distancia promedio a NAP: {df['Distancia (metros)'].mean():.1f} metros")
        print(f"   • Distancia mínima: {df['Distancia (metros)'].min():.1f} metros")
        print(f"   • Distancia máxima: {df['Distancia (metros)'].max():.1f} metros")
        print(f"   • Promedio puertos libres: {df['Porcentaje Puertos Libres (%)'].mean():.1f}%")
        print()
        
        # Estadísticas por zona
        print("🗺️  DISTRIBUCIÓN POR ZONA:")
        for zona in df['Zona'].unique():
            zona_data = df[df['Zona'] == zona]
            print(f"   • {zona}: {len(zona_data)} clientes")
            print(f"     - Distancia promedio: {zona_data['Distancia (metros)'].mean():.1f}m")
        print()
        
        # Top 10 clientes más cercanos
        print("🥇 TOP 10 CLIENTES MÁS CERCANOS:")
        top_10 = df.head(10)
        for i, (_, cliente) in enumerate(top_10.iterrows(), 1):
            print(f"   {i:2d}. {cliente['Nombre del Cliente'][:30]:<30} - {cliente['Distancia (metros)']:>6.1f}m - {cliente['Zona']}")
        print()
        
        # NAPs más demandadas
        print("🏢 NAPs MÁS DEMANDADAS:")
        naps_demanda = df['NAP Más Cercana'].value_counts().head(10)
        for nap, cantidad in naps_demanda.items():
            print(f"   • {nap[:40]:<40} - {cantidad} clientes")
        print()
        
        # Buscar archivo de mapa correspondiente
        archivos_mapa = [f for f in os.listdir('.') if f.startswith('mapa_') and f.endswith('.html')]
        if archivos_mapa:
            mapa_mas_reciente = max(archivos_mapa, key=os.path.getctime)
            print(f"🗺️  MAPA INTERACTIVO: {mapa_mas_reciente}")
            print("   El mapa incluye:")
            print("   • Marcadores de clientes prioritarios por zona")
            print("   • Ubicaciones de NAPs con baja ocupación")
            print("   • Líneas de conexión cliente-NAP más cercana")
            print("   • Mapa de calor de concentración de clientes")
            print("   • Información detallada en popups")
        print()
        
        # Archivos del sistema
        print("📁 ARCHIVOS DEL SISTEMA:")
        archivos_sistema = [
            ('configurar_sistema.py', 'Script de configuración inicial'),
            ('generar_lista_prioritaria.py', 'Generador básico (100 clientes)'),
            ('generar_lista_completa.py', 'Generador completo (todos los clientes)'),
            ('analizar_datos.py', 'Analizador de estructura de datos'),
            ('README.md', 'Documentación completa'),
            ('cache_geocoding.json', 'Cache de coordenadas geocodificadas')
        ]
        
        for archivo, descripcion in archivos_sistema:
            estado = "✅" if os.path.exists(archivo) else "❌"
            print(f"   {estado} {archivo:<30} - {descripcion}")
        print()
        
        # Recomendaciones de uso
        print("💡 RECOMENDACIONES PARA VICTORIA (VENDEDORA):")
        print("   1. Comenzar por los primeros 20 clientes de la lista")
        print("   2. Usar el mapa para planificar rutas eficientes")
        print("   3. Priorizar clientes en la misma zona geográfica")
        print("   4. Mencionar la disponibilidad inmediata de conexión")
        print("   5. Destacar que están cerca de infraestructura nueva")
        print()
        
        # Información técnica
        print("⚙️  CONFIGURACIÓN ACTUAL:")
        print("   • Radio de búsqueda: 150 metros")
        print("   • Ocupación máxima de NAPs: 30%")
        print("   • Criterio de cliente: Estado contiene 'NO' (no contrató/respondió)")
        print("   • Geocodificación: API Nominatim (OpenStreetMap)")
        print()
        
        print("🔄 PARA ACTUALIZAR LOS DATOS:")
        print("   1. Actualizar 'base de datos copia.xlsx' con nuevos clientes")
        print("   2. Actualizar '../Localizador_de_naps/naps.xlsx' con estado de NAPs")
        print("   3. Ejecutar: python generar_lista_completa.py")
        print()
        
        print("=" * 70)
        print("✅ SISTEMA LISTO PARA USO COMERCIAL")
        
    except Exception as e:
        print(f"❌ Error leyendo archivo: {e}")

if __name__ == "__main__":
    mostrar_resumen()
