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
- `js/coverage-validator.js`: logica existente relacionada con validacion de cobertura.
- `assets/img/`: imagenes, logos y recursos visuales del sitio.
- `assets/icons/usittel-logo.png`: icono/logo usado como favicon y marca.

## Landing Google Ads

Nueva landing creada:

- `internet-fibra-optica-tandil/index.html`

Ruta publica:

- `/internet-fibra-optica-tandil/`

Funcion:

- Landing responsive y mobile-first para campanas de Google Ads.
- Enfocada en conversion por WhatsApp para consultar cobertura o contratar internet por fibra optica en Tandil.
- No usa la navegacion pesada de la home. Tiene header minimo con logo, texto de atencion local y CTA a WhatsApp.
- Mantiene secciones solicitadas: hero, beneficios, planes destacados, como contratar, cobertura en Tandil, confianza/atencion local, preguntas frecuentes y CTA final.
- Usa un unico `h1`: "Internet por fibra optica en Tandil".
- Incluye SEO basico con `title`, `meta description`, Open Graph y Twitter Card.

## Archivos nuevos de soporte

- `assets/css/google-ads-landing.css`: estilos especificos de la landing de Google Ads. Reutiliza paleta azul/verde, tipografias Poppins/Inter y assets existentes, sin cargar componentes pesados de la home.
- `assets/js/whatsapp-ads-tracking.js`: utilitario central para configurar el link de WhatsApp, aplicar el texto precargado a todos los botones con `data-whatsapp-cta` y registrar clicks de conversion.

## Componentes usados en la landing

La landing esta hecha con HTML semantico y CSS propio:

- `header.landing-header`: header minimo.
- `section.landing-hero`: hero principal.
- `.benefit-card`: beneficios.
- `.plan-card`: planes destacados.
- `.step-card`: pasos de contratacion.
- `.coverage-card` y `.coverage-visual`: bloque de cobertura.
- `.trust-card`: confianza y atencion local.
- `.faq-item`: preguntas frecuentes.
- `.landing-final`: CTA final.
- `.sticky-whatsapp`: boton sticky mobile.

## WhatsApp

El numero y el texto precargado se configuran en:

- `assets/js/whatsapp-ads-tracking.js`

Constantes principales:

- `whatsappConfig.phone`
- `whatsappConfig.text`

Todos los CTAs de WhatsApp de `internet-fibra-optica-tandil/index.html` usan el atributo:

- `data-whatsapp-cta`

Cada boton indica su origen con:

- `data-whatsapp-source`

No duplicar el link completo de WhatsApp en el HTML. Si cambia el numero o el texto precargado, modificar solo `assets/js/whatsapp-ads-tracking.js`.

## Tracking Google Ads / GTM

El punto preparado para tracking esta en:

- `assets/js/whatsapp-ads-tracking.js`

Funcion:

- `trackWhatsappClick(source)`

Actualmente empuja un evento a `window.dataLayer`:

- `whatsapp_google_ads_click`

Cuando se instale Google Tag Manager o Google Ads conversion tracking, conectar el disparador en esa funcion o desde GTM escuchando el evento `whatsapp_google_ads_click`.

## Advertencias para futuras IAs

- No duplicar estilos de la landing dentro de `index.html` ni en paginas existentes si ya existe `assets/css/google-ads-landing.css`.
- No hardcodear datos comerciales, precios, numero de WhatsApp o textos precargados en varios lugares. Centralizar cambios comerciales.
- Mantener la landing alineada a la home: logo, paleta azul/verde, tono local de Tandil, fibra optica, velocidad simetrica, WiFi Mesh, USITTEL TV y soporte local.
- No cargar scripts pesados de la home en esta landing salvo necesidad real de conversion.
- No reemplazar la web normal: la home sigue en `/` y las paginas institucionales siguen bajo `pages/`.
- Si se crean archivos nuevos en el futuro, actualizar este `mapsrc.md` explicando que hacen y que funcion cumplen.
