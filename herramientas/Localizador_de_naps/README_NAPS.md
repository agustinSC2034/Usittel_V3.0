# Herramienta de Búsqueda de NAPs - Usittel

## Descripción
Esta herramienta permite a los vendedores de Usittel encontrar la caja NAP más cercana a la dirección de un cliente, facilitando el proceso de aprovisionamiento y eliminando la "ventana de riesgo" entre la venta y la instalación.

## Características Principales

### ✅ Funcionalidades Implementadas
- **Geolocalización automática** de direcciones de clientes
- **Cálculo de distancias** usando fórmula de Haversine
- **Mapa interactivo** con visualización de NAPs y cliente
- **Códigos de color** para disponibilidad de puertos:
  - 🟢 Verde: Más del 50% de puertos libres
  - 🟠 Naranja: Entre 10% y 50% de puertos libres  
  - 🔴 Rojo: Menos del 10% de puertos libres
- **Información detallada** de la NAP recomendada
- **Interfaz responsive** para desktop y móvil

### 🎯 Beneficios del Negocio
- **Elimina la ventana de riesgo** entre venta e instalación
- **Reduce tiempos de instalación** al tener NAP asignada desde la venta
- **Mejora la experiencia del cliente** al evitar demoras
- **Optimiza recursos técnicos** al tener información previa

## Formato de Datos Requerido

### Estructura del Excel/CSV
Tu archivo de datos debe tener las siguientes columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| ID_NAP | Identificador único de la caja | NAP-001 |
| DIRECCION | Dirección física de la NAP | Garibaldi 1145, Tandil |
| PUERTOS_TOTALES | Número total de puertos | 16 |
| PUERTOS_OCUPADOS | Número de puertos en uso | 1 |
| LATITUD | Coordenada latitud (decimal) | -37.3217 |
| LONGITUD | Coordenada longitud (decimal) | -59.1332 |

### Ejemplo de Datos
```csv
ID_NAP,DIRECCION,PUERTOS_TOTALES,PUERTOS_OCUPADOS,LATITUD,LONGITUD
NAP-001,Garibaldi 1145, Tandil,16,1,-37.3217,-59.1332
NAP-002,Avellaneda 1380, Tandil,16,2,-37.3218,-59.1333
```

## Cómo Obtener las Coordenadas

### Opción 1: Google Maps (Recomendado)
1. Abre Google Maps
2. Busca la dirección exacta de la NAP
3. Haz clic derecho en el punto exacto
4. Selecciona las coordenadas que aparecen
5. Copia y pega en tu Excel

### Opción 2: Herramienta de Geolocalización
Puedes usar herramientas online como:
- https://www.latlong.net/
- https://coordinates-converter.com/

### Opción 3: GPS en Campo
Si tienes acceso físico a las NAPs, puedes usar:
- Aplicación de GPS del teléfono
- GPS profesional
- Google Maps en modo offline

## Proceso de Actualización de Datos

### Frecuencia de Actualización
- **Semanal**: Actualizar puertos ocupados
- **Mensual**: Revisar coordenadas si es necesario
- **Trimestral**: Verificar que todas las NAPs estén incluidas

### Pasos para Actualizar
1. **Exportar datos actuales** desde Phantom
2. **Actualizar puertos ocupados** en el Excel
3. **Verificar coordenadas** de nuevas NAPs
4. **Convertir a formato JSON** (ver script de conversión)
5. **Actualizar el archivo tools.html**

## Script de Conversión Excel a JSON

### Requisitos
- Python 3.7+
- Librería pandas: `pip install pandas openpyxl`

### Uso del Script
```bash
python excel_to_json.py cajas_naps.xlsx
```

El script generará un archivo `nap_data.json` que puedes copiar directamente al código.

## Instalación y Uso

### Requisitos del Servidor
- Servidor web (Apache, Nginx, o servidor local)
- No requiere base de datos
- Funciona completamente en el navegador

### Despliegue
1. Sube el archivo `tools.html` a tu servidor web
2. Asegúrate de que el archivo sea accesible via HTTP/HTTPS
3. Comparte la URL con tu equipo de ventas

### Uso Diario
1. **Abrir la herramienta** en el navegador
2. **Ingresar dirección** del cliente
3. **Hacer clic en "Buscar"**
4. **Revisar el mapa** y la información de la NAP recomendada
5. **Completar el alta** en Phantom con la NAP y puerto seleccionados

## Solución de Problemas

### Error: "No se pudo encontrar la dirección"
- **Causa**: La dirección no está en OpenStreetMap
- **Solución**: Usar una dirección más específica o agregar puntos de referencia

### Error: "No se cargaron las NAPs"
- **Causa**: Problema con el formato de datos
- **Solución**: Verificar que el JSON esté correctamente formateado

### Mapa no se carga
- **Causa**: Problema de conectividad o CORS
- **Solución**: Verificar conexión a internet y permisos del navegador

## Personalización

### Cambiar Colores de Disponibilidad
Edita la función `createNapIcon()` en el código:
```javascript
if (availability > 0.5) color = '#22c55e'; // Verde
else if (availability > 0.1) color = '#f97316'; // Naranja
else color = '#ef4444'; // Rojo
```

### Cambiar Radio de Búsqueda
Modifica el valor en la función `handleSearch()`:
```javascript
if (nap.distance < 1000) { // Cambiar 1000 por el radio deseado en metros
```

### Agregar Información Adicional
Puedes agregar más campos al JSON de datos y mostrarlos en el popup del mapa.

## Contacto y Soporte

Para dudas técnicas o mejoras:
- **Desarrollador**: [Tu información de contacto]
- **Documentación**: Este archivo README
- **Repositorio**: [URL del repositorio si aplica]

---

**Versión**: 1.0  
**Última actualización**: Julio 2025  
**Compatible con**: Chrome, Firefox, Safari, Edge 

# Actualización semanal de NAPs

## ¿Qué hacer cuando recibís un nuevo archivo Excel de NAPs?

### 1. Preparar el archivo Excel
- Asegurate de que las columnas tengan estos nombres exactos:
  - `id` (ID Phantom)
  - `nombre_nap` (nombre visible de la NAP)
  - `direccion`
  - `puertos_utilizados`
  - `puertos_disponibles`
  - `Latitud`
  - `Longitud`

### 2. Reemplazar el archivo actual
- Copiá el nuevo archivo Excel a la carpeta `herramientas/` y llamalo `naps.xlsx` (o actualizá el nombre en el comando si usás otro).

### 3. Ejecutar el script de conversión
Abrí una terminal en la carpeta del proyecto y ejecutá:
```bash
python herramientas/excel_to_json.py herramientas/naps.xlsx
```

### 4. Verificar los cambios
- El script va a generar automáticamente:
  - `nap_data.json` (datos en formato JSON)
  - `nap_data.js` (datos para la web)
- La web de herramientas se actualizará sola con los nuevos datos.

---

¿Dudas? Consultá este archivo o pedí ayuda. 