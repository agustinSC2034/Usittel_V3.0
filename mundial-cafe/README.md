# Torneos y visitas

App local en React y Vite. Conserva la estética editorial del diseño aprobado: fondo marfil, títulos serif, acentos por comida e ilustraciones de café, pizza, ramen y empanadas. Los textos de la interfaz son descriptivos, sin eslóganes.

## Ejecutar

Desde esta carpeta, con Node 22 o posterior:

```sh
npm install
npm run dev -- --port 5178
npm test
npm run build
```

La app queda en http://127.0.0.1:5178. La compilación genera `dist`. El proyecto es independiente de la web y del despliegue de Usittel.

## Vistas

- **Fixture:** muestra el torneo seleccionado. Sus vistas internas son Cuadro, Participantes y Resultados. Tocá cualquier posición de la primera ronda para elegir un lugar agregado previamente. Si ya ocupa otra posición, el selector indica que se intercambiarán. Las rondas siguientes se completan con los ganadores.
- **Torneos:** permite crear y seleccionar varios torneos independientes. Plantillas de café, pizza, ramen, empanadas y un tipo personalizado. Se pueden editar el título, la ciudad, los dos participantes y los tres criterios de evaluación. Cada tipo tiene su ilustración y su color de acento.
- **Lugares:** registra visitas fuera de los torneos, con lugar, dirección, comida o pedido, fecha, precio total y moneda opcionales, seis puntajes y comentarios. La nota es el promedio de sabor, atención y ambiente de los dos participantes. El precio no modifica la nota. El resumen se construye con los datos ingresados, sin IA. Se puede buscar, filtrar, editar y eliminar visitas.
- **Perfil:** nombres y ciudad predeterminados para torneos y visitas nuevos; exportación e importación de respaldos completos. Los registros existentes mantienen sus participantes.

En móvil hay navegación inferior fija. El fixture se desplaza horizontalmente dentro de su panel.

## Reglas del torneo

Un torneo admite de 2 a 64 espacios. Agregar un lugar lo deja disponible en el selector; al agregarlo desde un casillero se asigna a ese espacio. **Guardar para después** conserva fecha, notas y puntajes incompletos. **Guardar resultado** exige seis notas por lugar y avanza al de mayor promedio. Los empates se resuelven con una elección explícita. Los pases libres solo están habilitados cuando la rama opuesta está vacía.

Cambiar participantes invalida los puntajes y avances dependientes. Cambiar tamaño o criterios pide confirmar el reinicio de resultados. Se conservan los lugares; al cambiar solo criterios se mantienen los cruces iniciales, sus fechas y comentarios. Hay un aviso antes de descartar ediciones de un encuentro al navegar.

## Datos y compatibilidad

El guardado es local a cada navegador y origen (dirección y puerto), sin cuenta ni sincronización. El modelo v2 guarda varios torneos, visitas y perfil en `sobremesa-library-v2`. La app migra el torneo v1 de `mundial-cafe-v1` sin modificar esa copia original. Si los datos no se pueden leer, se bloquean las escrituras para evitar reemplazarlos. Cambios en otra pestaña requieren recargar.

Desde Perfil se puede exportar todo a JSON. Un respaldo v2 validado reemplaza la biblioteca con confirmación; un respaldo v1 se agrega como otro torneo. Exportar una copia antes de eliminar datos permite restaurarlos.

## Componentes y pruebas

`model.js` mantiene las reglas del fixture; `library.js` maneja torneos independientes, migración, validación de respaldos y visitas. Los componentes de fixture, selector de lugares, torneos, visitas y perfil están separados.

`npm test` comprueba migración sin pérdida, aislamiento de torneos, selección/intercambio de participantes, cálculo de visitas, respaldo completo, avance de ganadores, correcciones, empates, borradores y pases libres.

## Ilustraciones

Recursos locales: `public/coffee-medialunas.png`, `public/pizza.png`, `public/ramen.png` y `public/empanadas.png`. Se generaron con Image Gen integrado. Prompt común: standalone decorative food illustration, delicate vintage copperplate pen-and-ink in espresso brown with muted natural color, horizontal composition on ivory #fcfaf6, no text or logo. Sujetos: café con dos medialunas; pizza con una porción separada; bowl de ramen; plato con tres empanadas.
