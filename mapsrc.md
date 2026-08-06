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

- `06.0063 PJ CarteraComercial - copia editable.docx`: copia en formato Word moderno del formulario comercial original `.doc`; conserva su contenido y diagramacion, pero elimina la restriccion de edicion exclusiva de campos para permitir modificar texto e insertar imagenes libremente. El archivo original ubicado fuera del repositorio permanece intacto.
- `assets/css/google-ads-landing.css`: estilos especificos de la landing. Reutiliza paleta azul/verde, tipografias Poppins/Inter y assets existentes para recrear la pieza promocional.
- `assets/js/whatsapp-ads-tracking.js`: utilitario central para configurar el link de WhatsApp, aplicar el texto precargado a todos los botones con `data-whatsapp-cta`, normalizar enlaces dinamicos de WhatsApp generados por el validador y registrar clicks de conversion.

## Componentes usados en la landing

La landing esta hecha con HTML semantico y CSS propio:

- `header.landing-header`: header minimo.
- `section.landing-hero`: hero principal. Usa un layout de dos columnas en desktop (texto a la izquierda, CTA principal de WhatsApp a la derecha sobre la imagen). En mobile el CTA queda debajo del texto, a ancho completo.
- `.feature-grid` y `.feature-card`: beneficios principales en tarjetas.
- `.plans-grid` y `.plan-card`: cards de planes 100, 300 y 500 megas.
- `.mega-card`: promocion visual de 1000 megas.
- `.process-steps`: pasos de contratacion.
- `.coverage-card`: tarjeta de consulta de cobertura por WhatsApp.
- `.tv-card`: bloque de USITTEL TV con producto ZTE.
- `.faq-layout`, `.faq-copy` y `.faq-list`: bloque de preguntas frecuentes en dos columnas con `details/summary`.
- `.landing-final`: CTA final.
- `.landing-footer`: footer oscuro con marca, texto institucional, redes, contacto y legales.
- `.landing-hero__cta-panel`: panel contenedor del CTA principal de WhatsApp en el hero. En desktop se posiciona como columna derecha sobre la zona de la imagen. En mobile fluye debajo del texto.
- `.landing-btn--hero`: modificador de botón para el CTA principal del hero. Botón verde más grande (~60px de alto) con sombra destacada.

## WhatsApp

El numero y el texto precargado se configuran en:

- `assets/js/whatsapp-ads-tracking.js`

Constantes principales:

- `whatsappConfig.phone`
- `whatsappConfig.text`

Todos los CTAs de WhatsApp de `internet-fibra-optica-tandil/index.html` usan el atributo:

- `data-whatsapp-cta`

El hero usa un único CTA principal de WhatsApp con source `hero`, posicionado como botón destacado sobre la imagen en desktop.

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

## Propuestas comerciales Chediack - mudanza de sitios

Archivos incorporados para preparar y entregar tres propuestas comparables por el mismo alcance de mudanza integral de los sitios Claro y Movistar del PBN Anillo Pampa:

- `scripts/generate_chediack_proposals.py`: generador reproducible en ReportLab de las propuestas de Fiberquil y Bibop. Centraliza identidad visual, datos societarios, alcance tecnico, condiciones comerciales e importes, copia la propuesta original de iTTel y valida que cada PDF tenga diez paginas.
- `scripts/run_chediack_proposals.py`: punto de ejecucion que toma la propuesta original desde `C:/Users/Aguus/OneDrive/Escritorio/Propuestas/` y lanza el generador.
- `assets/img/propuestas/fiberquil-logo.png`: logo oficial de Fiberquil usado en su propuesta.
- `assets/img/propuestas/bibop-logo.png`: logo oficial de Bibop usado en su propuesta.
- `output/pdf/Propuesta_iTTel_Chediack_Mudanza.pdf`: copia de entrega de la propuesta original de Grupo iTTel, con total base de USD 85.754.
- `output/pdf/Propuesta_Fiberquil_Chediack_Mudanza.pdf`: propuesta de Fiberquil con el mismo alcance y condiciones, identidad tecnica propia y valores incrementados un 5,2%.
- `output/pdf/Propuesta_Bibop_Chediack_Mudanza.pdf`: propuesta de Bibop con el mismo alcance y condiciones, presentacion corporativa simple y valores incrementados un 12,24%.

### Arquitectura documental diferenciada (version 2)

- `scripts/generate_chediack_proposals_v2.py`: generador vigente de las propuestas alternativas. Reutiliza los datos e importes centralizados, pero produce estructuras editoriales independientes para evitar que las ofertas parezcan variantes de la propuesta iTTel.
- Fiberquil se entrega como dossier tecnico de ocho paginas: portada asimetrica, ficha ejecutiva, frentes de trabajo por tarjetas, secuencia visual, controles y entregables, oferta economica por bloques y condiciones finales. El naranja es el color principal.
- Bibop se entrega como propuesta administrativa compacta de seis paginas: portada simple, resumen, alcance por etapas, plan tabular, presupuesto y condiciones generales.
- Los archivos finales conservan los nombres estables `output/pdf/Propuesta_Fiberquil_Chediack_Mudanza.pdf` y `output/pdf/Propuesta_Bibop_Chediack_Mudanza.pdf`.

### Arquitectura documental sobria (version 3)

- `scripts/generate_chediack_proposals_v3.py`: generador vigente para la revision solicitada. Reutiliza los datos, logos e importes de las versiones anteriores, pero reemplaza el dossier visual de Fiberquil por una propuesta corporativa convencional de nueve paginas y amplia Bibop a ocho paginas.
- Fiberquil usa portada limpia, encabezados discretos, capitulos tecnicos, tablas de alcance, cronograma, controles, oferta economica, condiciones y exclusiones.
- Bibop mantiene una presentacion administrativa simple y distribuye objeto, dos capitulos de alcance, cronograma, controles, presupuesto y condiciones en ocho paginas.
- Los nombres de entrega permanecen estables dentro de `output/pdf/`.

### Entrega divergente por formato (version 4)

- `scripts/generate_fiberquil_plain_v4.py`: generador vigente de Fiberquil. Produce un PDF tamaño Carta de siete paginas, tipografia Times, texto corrido y secciones numeradas, sin tarjetas, recuadros ni tablas de diseño.
- `scripts/build_bibop_quote_v4.mjs`: constructor reproducible de la cotizacion informal de Bibop con `@oai/artifact-tool`. Genera una sola hoja editable con detalle por renglon, subtotales y total calculados mediante formulas.
- `output/pdf/Propuesta_Fiberquil_Chediack_Mudanza.pdf`: propuesta Fiberquil vigente, deliberadamente separada de la estructura editorial de iTTel.
- `outputs/019fd83b-49ab-7f62-b271-ec2e8201db32/Cotizacion_Bibop_Chediack_Mudanza.xlsx`: cotizacion Bibop vigente en formato Excel. Reemplaza el PDF anterior de Bibop, que fue retirado para evitar confusiones.

### Reescritura editorial Fiberquil (version 5)

- `scripts/generate_fiberquil_memoria_v5.py`: generador intermedio de la propuesta Fiberquil. Reordena el contenido como memoria cronologica de intervencion, usa la familia Georgia embebida desde las fuentes de Windows y evita la estructura contractual y las frases del documento iTTel.
- `output/pdf/Propuesta_Fiberquil_Chediack_Mudanza.pdf`: version de ocho paginas tamaño Carta con capitulos narrativos (punto de partida, preparacion, movimiento, reconexion, pruebas, cuenta y acuerdos), sin tablas ni paneles.

### Fiberquil estilo documento de oficina (version 6)

- `scripts/generate_fiberquil_word_v6.py`: generador vigente de Fiberquil. Recupera el aspecto simple de un archivo Word (Times, titulos basicos, texto corrido y lineas separadoras) y conserva la reescritura que evita frases y orden del documento iTTel.
- `output/pdf/Propuesta_Fiberquil_Chediack_Mudanza.pdf`: entrega actual de siete paginas tamaño Carta, sin tablas, paneles ni recursos editoriales elaborados.
