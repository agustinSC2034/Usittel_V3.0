#!/usr/bin/env python3
"""
Análisis detallado de archivos originales
"""

import pandas as pd

def analizar_archivos_originales():
    print('🔍 ANÁLISIS DETALLADO DE ARCHIVOS ORIGINALES')
    print('='*60)

    # 1. Base de datos clientes
    print('\n1️⃣ BASE DE DATOS CLIENTES:')
    df_clientes = pd.read_excel('base de datos copia.xlsx')
    print(f'   Total filas: {len(df_clientes)}')
    print('   Columnas reales:')
    for i, col in enumerate(df_clientes.columns):
        print(f'     {i+1}. {col}')

    # Buscar columna de direcciones
    col_direccion = None
    for col in df_clientes.columns:
        if 'DIRECC' in col.upper() or 'DIREC' in col.upper():
            col_direccion = col
            break

    if col_direccion:
        print(f'\n   📍 Columna direcciones: {col_direccion}')
        direcciones_validas = df_clientes[col_direccion].dropna()
        print(f'   📊 Direcciones válidas: {len(direcciones_validas)}')
        print('   👀 Ejemplos:')
        for i, dir in enumerate(direcciones_validas.head(5)):
            print(f'     {i+1}. {dir}')

    # Buscar columna de zonas
    col_zona = None
    for col in df_clientes.columns:
        if 'ZONA' in col.upper():
            col_zona = col
            break

    if col_zona:
        print(f'\n   🗺️  Columna zonas: {col_zona}')
        zonas = df_clientes[col_zona].value_counts()
        for zona, cantidad in zonas.items():
            print(f'     {zona}: {cantidad} clientes')
    else:
        print('\n   ⚠️  No se encontró columna de zonas explícita')
        print('   📋 Primeras 10 filas completas:')
        for i, row in df_clientes.head(10).iterrows():
            print(f'     Fila {i+1}: {dict(row)}')

    print('\n2️⃣ BASE DE DATOS NAPs:')
    df_naps = pd.read_excel('Posibles clientes cerca de Naps libres.xlsx')
    print(f'   Total filas: {len(df_naps)}')
    print('   Columnas reales:')
    for i, col in enumerate(df_naps.columns):
        print(f'     {i+1}. {col}')

    # Buscar columna de ocupación
    col_ocupacion = None
    for col in df_naps.columns:
        if 'UTILIZAC' in col.upper() or 'OCUPAC' in col.upper() or '%' in col:
            col_ocupacion = col
            break

    if col_ocupacion:
        print(f'\n   📈 Columna ocupación: {col_ocupacion}')
        naps_disponibles = df_naps[df_naps[col_ocupacion] <= 30]
        print(f'   🟢 NAPs disponibles (≤30%): {len(naps_disponibles)}')
        print(f'   🔴 NAPs ocupadas (>30%): {len(df_naps) - len(naps_disponibles)}')
        print(f'   📊 Ocupación promedio: {df_naps[col_ocupacion].mean():.1f}%')
        
        print('   👀 Ejemplos de NAPs disponibles:')
        for i, row in naps_disponibles.head(5).iterrows():
            direccion = row.get('Dirección', row.get('DIRECCION', 'N/A'))
            ocupacion = row[col_ocupacion]
            print(f'     {i+1}. {direccion} - {ocupacion}%')

if __name__ == "__main__":
    analizar_archivos_originales()
