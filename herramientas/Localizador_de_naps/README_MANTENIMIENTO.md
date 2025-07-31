# Herramienta de NAPs - Guía de Mantenimiento

## 📋 Descripción
Esta herramienta web permite a los vendedores de Usittel identificar la caja NAP más cercana y con puertos disponibles para nuevos clientes, eliminando la "ventana de riesgo" entre la venta y la instalación.

## 🚀 Actualización de Datos

### Método Automatizado (Recomendado)
Para actualizar los datos de las NAPs, simplemente ejecuta:

```bash
python actualizar_web.py cajas_naps.csv
```

Este comando:
1. ✅ Lee el archivo CSV con los datos actualizados
2. ✅ Convierte los datos al formato requerido
3. ✅ Genera el archivo `nap_data.js` automáticamente
4. ✅ La web cargará los nuevos datos automáticamente

### Requisitos del CSV
El archivo CSV debe tener las siguientes columnas:
- `ID NAP`: Identificador único de la caja NAP
- `DIRECCION`: Dirección de la caja NAP
- `Puertos_Utilizados`: Número de puertos ocupados
- `Puertos_Disponibles`: Número de puertos libres
- `Latitud`: Coordenada de latitud (opcional, se generan automáticamente si no existen)
- `Longitud`: Coordenada de longitud (opcional, se generan automáticamente si no existen)

### Ejemplo de CSV
```csv
ID NAP;DIRECCION;Puertos_Utilizados;Puertos_Disponibles;Latitud;Longitud
LABO-TANDIL;Santamarina 450 , TANDIL;7;1;-37,3257523;-59,1300813
SM-C05-40;Roser 1578, TANDIL;4;4;-37,3291518;-59,1173412
```

## 🔧 Estructura de Archivos

```
herramientas/
├── tools.html              # Herramienta web principal
├── nap_data.js             # Datos de NAPs (generado automáticamente)
├── nap_data.json           # Datos en formato JSON (generado automáticamente)
├── cajas_naps.csv          # Archivo CSV con datos actualizados
├── actualizar_web.py       # Script de actualización automática
└── README_MANTENIMIENTO.md # Este archivo
```

## 📊 Estadísticas de la Herramienta

### Funcionalidades
- 🗺️ **Mapa Interactivo**: Visualización de todas las NAPs con colores según disponibilidad
- 🔍 **Búsqueda por Dirección**: Encuentra la NAP más cercana a cualquier dirección en Tandil
- 📍 **Geolocalización**: Convierte direcciones a coordenadas automáticamente
- 🎯 **Recomendación Inteligente**: Sugiere la NAP óptima basada en distancia y disponibilidad
- 📱 **Responsive**: Funciona en dispositivos móviles y de escritorio

### Colores de las NAPs
- 🟢 **Verde**: Más del 50% de puertos libres
- 🟠 **Naranja**: Entre 10% y 50% de puertos libres
- 🔴 **Rojo**: Menos del 10% de puertos libres

## 🛠️ Solución de Problemas

### Error: "No se pudo cargar el array napData"
- Verifica que el archivo `nap_data.js` existe en la misma carpeta que `tools.html`
- Ejecuta `python actualizar_web.py cajas_naps.csv` para regenerar el archivo

### Error: "Faltan columnas requeridas"
- Verifica que el CSV tenga las columnas correctas: `ID NAP`, `DIRECCION`, `Puertos_Utilizados`, `Puertos_Disponibles`
- Asegúrate de que el separador sea punto y coma (`;`)

### Error de geolocalización
- La herramienta usa la API gratuita de Nominatim (OpenStreetMap)
- Si hay muchos errores, puede ser por límites de la API
- Las coordenadas pre-cargadas en el CSV evitan este problema

## 🔄 Flujo de Trabajo Recomendado

1. **Actualizar CSV**: Modifica `cajas_naps.csv` con los datos más recientes
2. **Ejecutar Script**: `python actualizar_web.py cajas_naps.csv`
3. **Verificar**: Abre `tools.html` en el navegador y prueba una búsqueda
4. **Desplegar**: Sube los archivos actualizados al servidor web

## 📈 Beneficios del Sistema

### Para Vendedores
- ✅ Elimina la "ventana de riesgo" entre venta e instalación
- ✅ Respuesta inmediata sobre disponibilidad
- ✅ Información visual clara y fácil de entender
- ✅ Funciona en cualquier dispositivo

### Para la Empresa
- ✅ Reduce cancelaciones por falta de disponibilidad
- ✅ Mejora la satisfacción del cliente
- ✅ Optimiza el uso de recursos técnicos
- ✅ Datos centralizados y actualizados

## 🎯 Próximas Mejoras Sugeridas

1. **Sincronización Automática**: Conectar con base de datos en tiempo real
2. **Historial de Búsquedas**: Guardar búsquedas frecuentes
3. **Notificaciones**: Alertas cuando NAPs se llenan
4. **Reportes**: Estadísticas de uso y ocupación
5. **API REST**: Permitir integración con otros sistemas

## 📞 Soporte

Para problemas técnicos o sugerencias de mejora, contacta al equipo de desarrollo.

---

**Última actualización**: [Fecha]
**Versión**: 3.0
**Desarrollado para**: Usittel - Tandil 