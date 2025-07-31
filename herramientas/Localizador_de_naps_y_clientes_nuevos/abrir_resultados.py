#!/usr/bin/env python3
"""
Script para abrir los archivos generados del análisis
"""

import os
import subprocess
import sys

def abrir_archivos():
    """Abre los archivos generados en sus aplicaciones predeterminadas"""
    
    print("🚀 Abriendo archivos del análisis de clientes prioritarios...")
    
    # Buscar archivos más recientes
    archivos_excel = [f for f in os.listdir('.') if f.startswith('clientes_prioritarios') and f.endswith('.xlsx')]
    archivos_mapa = [f for f in os.listdir('.') if f.startswith('mapa_') and f.endswith('.html')]
    
    if archivos_excel:
        excel_reciente = max(archivos_excel, key=os.path.getctime)
        print(f"📊 Abriendo Excel: {excel_reciente}")
        try:
            if sys.platform.startswith('win'):
                os.startfile(excel_reciente)
            elif sys.platform.startswith('darwin'):
                subprocess.call(['open', excel_reciente])
            else:
                subprocess.call(['xdg-open', excel_reciente])
        except Exception as e:
            print(f"❌ Error abriendo Excel: {e}")
    
    if archivos_mapa:
        mapa_reciente = max(archivos_mapa, key=os.path.getctime)
        print(f"🗺️  Abriendo mapa: {mapa_reciente}")
        try:
            if sys.platform.startswith('win'):
                os.startfile(mapa_reciente)
            elif sys.platform.startswith('darwin'):
                subprocess.call(['open', mapa_reciente])
            else:
                subprocess.call(['xdg-open', mapa_reciente])
        except Exception as e:
            print(f"❌ Error abriendo mapa: {e}")
    
    print("✅ Archivos abiertos exitosamente")

if __name__ == "__main__":
    abrir_archivos()
