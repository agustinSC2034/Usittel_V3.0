# TAREAS PENDIENTES - Análisis de Clientes Prioritarios Usittel

## Objetivo Principal
Generar un Excel final con TODOS los ~3300 clientes (Zona 1 + Zona 2) que incluya información sobre NAPs cercanas, distancias y disponibilidad técnica.

## Problemas Identificados que DEBEN Corregirse

### 1. ❌ Solo procesaba 415 clientes (debe ser ~3300)
- El script debe procesar TODOS los clientes de ambas zonas
- Verificar que se lean correctamente ambas hojas del Excel

### 2. ❌ Solo aparecían clientes de ZONA 1
- Asegurar que se procesen correctamente ambas zonas
- Incluir columna "ZONA" en el resultado final

### 3. ❌ Direcciones mal formateadas para geocodificación
- Problema ejemplo: "ALSINA 405TANDIL" (número pegado a Tandil)
- Debe ser: "ALSINA 405, Tandil, Buenos Aires, Argentina"

### 4. ❌ Filtrado de texto en direcciones
- Limpiar palabras como "dpto", "casa", "piso", etc. antes de geocodificar
- Usar solo calle y número para geocodificación

### 5. ❌ Excel final incompleto
- TODOS los 3300 clientes deben aparecer en el Excel final
- Si se pudo geolocalizar: mostrar NAP más cercana (ocupación ≤30%), distancia
- Si NO se pudo geolocalizar: poner "Error al geolocalizar" en columna NAP

## Estructura del Excel Final (OBLIGATORIA)

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Nombre del Cliente | Nombre completo | Juan Pérez |
| Dirección del Cliente | Dirección original | Alsina 405 dpto 3 |
| Celular | Teléfono de contacto | 2494123456 |
| Zona | ZONA 1 o ZONA 2 | ZONA 1 |
| Estado Original | Estado del flyer | NO CONTRATÓ: NO RESPONDIÓ AL FLYER |
| NAP Más Cercana | Nombre de la NAP o error | NAP_CENTRO_01 o "Error al geolocalizar" |
| Dirección de la NAP | Dirección de la NAP | Mitre y 9 de Julio |
| Distancia (metros) | Distancia en metros | 87.5 |
| Puertos Disponibles | Puertos libres en la NAP | 12 |
| Porcentaje Ocupación (%) | % de ocupación de la NAP | 25.5 |

## Configuración Técnica

### Parámetros
- **Radio de búsqueda**: 150 metros
- **Ocupación máxima NAP**: 30%
- **Filtro clientes**: Estado que contenga "NO" (no contrataron/no respondieron)

### Archivos de Entrada
- `base de datos copia.xlsx` (hojas: ZONA 1, ZONA 2)
- `../Localizador_de_naps/naps.xlsx`

### Geocodificación
- Usar Nominatim (OpenStreetMap) 
- Cache en archivo JSON para no repetir consultas
- Formato: "CALLE NUMERO, Tandil, Buenos Aires, Argentina"
- Limpiar texto: dpto, casa, piso, ph, local, oficina, etc.

## Correcciones Específicas Requeridas

### 1. Función limpiar_direccion()
```python
def limpiar_direccion(self, direccion):
    # Remover "TANDIL" pegado al número
    # Ejemplo: "ALSINA 405TANDIL" → "ALSINA 405"
    # Luego agregar formato correcto: "ALSINA 405, Tandil, Buenos Aires, Argentina"
```

### 2. Procesamiento de TODOS los clientes
```python
# NO usar .head() o muestras
# Procesar los ~3300 clientes completos
clientes_filtrados = clientes[mask].copy()  # Sin límites
```

### 3. Excel final con TODOS los clientes
```python
def generar_excel_final(self, clientes_todos, resultados_geocodificados):
    """
    - clientes_todos: los 3300 clientes originales
    - resultados_geocodificados: solo los que se pudieron procesar
    
    Para cada cliente:
    - Si está en resultados_geocodificados: mostrar NAP, distancia, etc.
    - Si NO está: poner "Error al geolocalizar" en columnas de NAP
    """
```

## Validaciones Obligatorias

1. **Total clientes en Excel final**: ~3300 (verificar que coincida)
2. **Distribución por zonas**: Mostrar estadísticas de ZONA 1 vs ZONA 2
3. **Clientes geocodificados vs errores**: Contar éxitos y fallos
4. **NAPs encontradas**: Cuántos clientes tienen NAPs cercanas

## Archivos de Código a Revisar

- `generar_lista_final_corregida.py` (principal)
- Revisar código en `../Localizador_de_naps/` para reutilizar funciones

## Resultado Esperado

1. **Excel final**: `clientes_prioritarios_TODOS_{fecha}.xlsx` con 3300 filas
2. **Estadísticas en consola**:
   ```
   📊 Total clientes procesados: 3300
   📊 ZONA 1: XXXX clientes
   📊 ZONA 2: XXXX clientes
   📊 Geocodificados exitosamente: XXXX
   📊 Errores de geocodificación: XXXX
   📊 Con NAPs cercanas (≤150m, ≤30% ocupación): XXXX
   ```

## Notas Importantes

- El mapa se puede dejar para más adelante
- **Prioridad 1**: Excel completo y correcto con todos los clientes
- Mantener cache de geocodificación para no repetir trabajo
- Usar rate limiting para APIs de geocodificación
- Validar que las direcciones se formateen correctamente antes de geocodificar

---

**Estado**: ⏸️ PAUSADO - Pendiente continuación en otra PC  
**Última actualización**: 31 de julio de 2025  
**Archivos principales**: 
- `generar_lista_final_corregida.py`
- `base de datos copia.xlsx` (reemplazado por versión más prolija)
- `../Localizador_de_naps/naps.xlsx`
