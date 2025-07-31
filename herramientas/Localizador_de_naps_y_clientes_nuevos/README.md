# Analizador de Clientes Prioritarios para Usittel

Este conjunto de herramientas permite generar una lista priorizada de clientes potenciales basada en la proximidad geográfica a NAPs (cajas de fibra óptica) con baja ocupación.

## Archivos Generados

### Scripts Principales

1. **`analizar_datos.py`** - Analiza la estructura de los archivos Excel existentes
2. **`generar_lista_prioritaria.py`** - Versión básica para probar con 100 clientes
3. **`generar_lista_completa.py`** - Versión optimizada para procesar todos los clientes

### Archivos de Salida

- **Excel de resultados**: `clientes_prioritarios_[fecha].xlsx`
  - Contiene la lista priorizada de clientes
  - Incluye distancia a NAP más cercana
  - Porcentaje de puertos libres de cada NAP
  - Información completa del cliente y zona

- **Mapa interactivo**: `mapa_clientes_prioritarios_[fecha].html`
  - Visualización de clientes y NAPs en mapa
  - Marcadores diferenciados por zona
  - Información detallada en popups
  - Capas activables/desactivables

- **Cache de geocodificación**: `cache_geocoding.json`
  - Almacena coordenadas ya consultadas
  - Evita consultas repetidas a la API
  - Acelera ejecuciones posteriores

## Configuración

### Parámetros Principales (modificables en el script)

```python
RADIO_BUSQUEDA = 150      # metros - distancia máxima para considerar NAP cercana
OCUPACION_MAXIMA = 30     # porcentaje - ocupación máxima de NAPs a considerar
```

### Criterios de Filtrado

1. **Clientes objetivo**: Estado contiene "NO" (no contrataron o no respondieron)
2. **NAPs disponibles**: Ocupación ≤ 30%
3. **Proximidad**: Distancia ≤ 150 metros

## Uso

### Ejecución Básica (100 clientes de prueba)
```bash
python generar_lista_prioritaria.py
```

### Ejecución Completa (todos los clientes)
```bash
python generar_lista_completa.py
```

### Análisis de Datos
```bash
python analizar_datos.py
```

## Estructura de Datos

### Base de Datos de Clientes
- **Archivo**: `base de datos copia.xlsx`
- **Hojas**: ZONA 1, ZONA 2
- **Columnas requeridas**: 
  - DIRECCIÓN
  - ESTADO 
  - CELULAR
  - NOMBRE COMPLETO (ZONA 2) / Unnamed: 1 (ZONA 1)

### Base de NAPs
- **Archivo**: `../Localizador_de_naps/naps.xlsx`
- **Columnas requeridas**:
  - id, nombre_nap, direccion
  - puertos_utilizados, puertos_disponibles
  - Latitud, Longitud

## Resultados Esperados

### Excel Final Contiene:
- Nombre del Cliente
- Dirección del Cliente  
- Celular
- Zona (ZONA 1 o ZONA 2)
- NAP Más Cercana
- Dirección de la NAP
- Distancia en metros
- Porcentaje de Puertos Libres
- Puertos Disponibles
- Porcentaje de Ocupación

### Mapa Interactivo Incluye:
- Marcadores rojos/naranjas para clientes por zona
- Marcadores verdes para NAPs disponibles
- Líneas de conexión cliente-NAP
- Información detallada en popups
- Mapa de calor de concentración de clientes
- Control de capas para mostrar/ocultar elementos

## Geocodificación

El sistema utiliza la API gratuita de Nominatim (OpenStreetMap) para convertir direcciones a coordenadas:

- **Límite**: ~1 consulta por segundo
- **Precisión**: Optimizada para Tandil, Argentina
- **Cache**: Almacena resultados para evitar consultas repetidas
- **Limpieza**: Normaliza direcciones antes de geocodificar

### Mejoras de Direcciones Automáticas:
- Gral. → General
- Av. → Avenida  
- Dto/dpto → Departamento
- Maipu → Maipú
- / → esquina

## Dependencias

```bash
pip install pandas openpyxl geopy folium requests numpy
```

## Solución de Problemas

### Error de Geocodificación
- Verifica conexión a internet
- Algunas direcciones pueden no encontrarse automáticamente
- El cache preserva direcciones ya procesadas

### Archivos No Encontrados
- Verifica que `base de datos copia.xlsx` esté en el directorio actual
- Verifica que `../Localizador_de_naps/naps.xlsx` exista

### Sin Resultados
- Ajusta `RADIO_BUSQUEDA` (aumentar metros)
- Ajusta `OCUPACION_MAXIMA` (aumentar porcentaje)
- Verifica que haya NAPs con coordenadas válidas

## Uso Comercial

Esta herramienta está diseñada para optimizar las rutas de Victoria (vendedora de campo) priorizando:

1. **Clientes con alta probabilidad de conversión** (no respondieron inicialmente)
2. **Ubicaciones con conectividad inmediata** (NAPs con puertos libres cercanos)
3. **Eficiencia geográfica** (distancias cortas para maximizar visitas por día)

El resultado es una lista ordenada por distancia donde los primeros clientes representan las mejores oportunidades de venta.
