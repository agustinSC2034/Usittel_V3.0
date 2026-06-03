# Mapa de fuente - USITTEL_V3.0

## Estructura general

Este repositorio contiene una web institucional estatica/PHP de USITTEL. La home publica principal vive en `index.html` y existe una variante PHP en `home.php`. Las secciones internas se organizan como carpetas con `index.html` dentro de `pages/`.

- `index.html`: home publica principal del sitio.
- `home.php`: version PHP de la home, preparada para usar includes compartidos.
- `includes/header.php`: header reutilizable para vistas PHP.
- `includes/footer.php`: footer reutilizable para vistas PHP.
- `pages/internet/index.html`: pagina normal de internet por fibra optica.
- `pages/mesh/index.html`: pagina normal de WiFi Mesh.
- `pages/tv/index.html`: pagina normal de USITTEL TV.
- `pages/empresas/index.html`: pagina normal para empresas.
- `pages/contacto/index.html`: pagina normal de contacto.
- `pages/centro_de_ayuda/index.html`: pagina normal de ayuda.
- `assets/css/main.css`: estilos globales existentes del sitio.
- `assets/css/tailwind.output.css`: CSS generado de Tailwind usado por paginas existentes.
- `assets/js/main.js`: interacciones generales de la home, menu mobile y planes.
- `js/coverage-validator.js`: logica existente del mapa y validador de cobertura usada por paginas con consulta embebida.
- `assets/img/`: imagenes, logos y recursos visuales del sitio.
- `assets/icons/usittel-logo.png`: icono/logo usado como favicon y marca.

## Landing Google Ads

Nueva landing creada:

- `internet-fibra-optica-tandil/index.html`

Ruta publica:

- `/internet-fibra-optica-tandil/`

Funcion:

- Pagina responsive y mobile-first para campanas pagas.
- Enfocada en conversion por WhatsApp para consultar cobertura o contratar internet por fibra optica en Tandil.
- No usa la navegacion pesada de la home. Tiene header minimo con logo, texto de atencion local y CTA a WhatsApp.
- Recrea el diseno promocional de referencia con un tratamiento mas minimalista: header blanco, hero fotografico limpio, beneficios en tarjetas, planes en cards, bloque destacado de 1000 megas, pasos de contratacion, consulta de cobertura por WhatsApp, bloque USITTEL TV, preguntas frecuentes en formato lista, CTA final y footer oscuro simplificado.
- Usa un unico `h1`: "Internet por fibra optica en Tandil".
- Incluye SEO basico con `title`, `meta description`, Open Graph y Twitter Card.
- Incluye canonical publico: `https://usittel.com.ar/internet-fibra-optica-tandil/`.
- El primer impacto debe priorizar Tandil, fibra optica, velocidad simetrica y hasta 1000 megas. WiFi Mesh y USITTEL TV quedan como servicios complementarios secundarios.
- La consulta de cobertura de esta landing se resuelve por WhatsApp para mantener la composicion de la pieza promocional. No carga Leaflet ni `js/coverage-validator.js` en esta pagina.
- Carga Font Awesome para iconos de beneficios, pasos, preguntas frecuentes, contacto y botones.

## Archivos nuevos de soporte

- `assets/css/google-ads-landing.css`: estilos especificos de la landing. Reutiliza paleta azul/verde, tipografias Poppins/Inter y assets existentes para recrear la pieza promocional.
- `assets/js/whatsapp-ads-tracking.js`: utilitario central para configurar el link de WhatsApp, aplicar el texto precargado a todos los botones con `data-whatsapp-cta`, normalizar enlaces dinamicos de WhatsApp generados por el validador y registrar clicks de conversion.

## Componentes usados en la landing

La landing esta hecha con HTML semantico y CSS propio:

- `header.landing-header`: header minimo.
- `section.landing-hero`: hero principal.
- `.feature-grid` y `.feature-card`: beneficios principales en tarjetas.
- `.plans-grid` y `.plan-card`: cards de planes 100, 300 y 500 megas.
- `.mega-card`: promocion visual de 1000 megas.
- `.process-steps`: pasos de contratacion.
- `.coverage-card`: tarjeta de consulta de cobertura por WhatsApp.
- `.tv-card`: bloque de USITTEL TV con producto ZTE.
- `.faq-layout`, `.faq-copy` y `.faq-list`: bloque de preguntas frecuentes en dos columnas con `details/summary`.
- `.landing-final`: CTA final.
- `.landing-footer`: footer oscuro con marca, texto institucional, redes, contacto y legales.
- `.sticky-whatsapp`: boton sticky mobile.

## WhatsApp

El numero y el texto precargado se configuran en:

- `assets/js/whatsapp-ads-tracking.js`

Constantes principales:

- `whatsappConfig.phone`
- `whatsappConfig.text`

Todos los CTAs de WhatsApp de `internet-fibra-optica-tandil/index.html` usan el atributo:

- `data-whatsapp-cta`

Todos los CTAs tambien tienen un `href` real de WhatsApp como fallback HTML. Si JavaScript falla, los botones siguen abriendo WhatsApp con el texto precargado.

Cada boton indica su origen con:

- `data-whatsapp-source`

El texto precargado actual para WhatsApp es `Hola!`. Si cambia el numero o el texto precargado, modificar `assets/js/whatsapp-ads-tracking.js` y mantener los `href` fallback del HTML alineados.

El HTML mantiene `href` real como fallback por resiliencia, pero la fuente operativa del numero/texto sigue siendo `assets/js/whatsapp-ads-tracking.js`. Ese JS tambien observa enlaces de WhatsApp agregados dinamicamente por el validador de cobertura.

## Tracking Google Ads / GTM

El punto preparado para tracking esta en:

- `assets/js/whatsapp-ads-tracking.js`

Funcion:

- `trackWhatsappClick(source)`

Actualmente empuja un evento a `window.dataLayer`:

- `whatsapp_google_ads_click`

Esto no mide conversiones reales por si solo. Para medir conversiones reales hay que instalar Google Tag Manager o `gtag` en el sitio y conectar el disparador en esa funcion o desde GTM escuchando el evento `whatsapp_google_ads_click`.

## Texto publico

- No mostrar al usuario final textos internos como "Google Ads", "landing" o "Landing para campanas".
- El texto publico debe hablar de consulta de cobertura, contratacion, canales oficiales y atencion local.
- Si se necesita atribucion de campana, resolverla por parametros, GTM, analytics o texto no invasivo como "publicidad", evitando lenguaje interno visible.

## Advertencias para futuras IAs

- No duplicar estilos de la landing dentro de `index.html` ni en paginas existentes si ya existe `assets/css/google-ads-landing.css`.
- No hardcodear datos comerciales, precios, numero de WhatsApp o textos precargados en varios lugares. Centralizar cambios comerciales.
- Mantener la landing alineada a la home: logo, paleta azul/verde, tono local de Tandil, fibra optica, velocidad simetrica, WiFi Mesh, USITTEL TV y soporte local.
- No cargar scripts pesados de la home en esta landing salvo necesidad real de conversion.
- No reemplazar la web normal: la home sigue en `/` y las paginas institucionales siguen bajo `pages/`.
- Si se crean archivos nuevos en el futuro, actualizar este `mapsrc.md` explicando que hacen y que funcion cumplen.
