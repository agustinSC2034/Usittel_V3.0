# Public website refresh

Visual direction: the approved home, Inter typography, restrained blue/green accents, white and pale neutral sections, consistent spacing and buttons. Preserve commercial information and original photography when it is useful. Autogestion is excluded.

## First delivery

- Home, Contacto and Empresas share `assets/css/site.css`, `js/site.js`, `js/site-tracking.js` and the static navigation/footer templates in `includes/public/`.
- `scripts/build-public-shell.cjs` renders those templates into the listed pages, resolving relative paths and active navigation. The output HTML is committed/deployed as normal; navigation requires no runtime fetch. Add each migrated route to the script's `pages` list.
- `assets/css/home.css` contains home components. `assets/css/public-pages.css` contains Contacto and Empresas layouts.
- `npm run build:public` renders the shell and compiles Tailwind locally. `npm run check:public-shell` detects a stale rendered shell. Do not edit generated header/footer blocks independently; update their source templates and rebuild.
- Contacto prioritizes the help center, hours and direct contact; the office map is in its own section. Obsolete form/reCAPTCHA code was removed because no such form exists in the page.
- Empresas retains the original plans, benefits and contact information. Native FAQ disclosures replace custom accordion code. Static service labels replace the particle/orbit visualization and are now available on mobile. Unused Three.js, Leaflet, reCAPTCHA and legacy coverage/form code were removed from this page.
- The existing enterprise photograph is served locally as a 134 KB WebP instead of a roughly 1.9 MB PNG hosted through GitHub.
- The home map's idle explanatory sentence was removed at the user's request. Dynamic map results/errors remain.

## Product pages and corrections (second delivery)

- Internet, TV and Mesh now use the shared shell and `product-pages.css`, locally compiled Tailwind and native FAQ disclosures. All commercial text/prices were compared against the previous main content; only decorative icons and the unsupported-video fallback were removed.
- Internet reuses the approved gaming photo, opens each plan's terms independently and removes unused Three.js, reCAPTCHA, particle animation and simulated-speedtest code. The coverage layout now lives in `coverage.css`, shared with the home.
- TV presents one transparent equipment image without a card or view-selector buttons. The title and introduction precede the image on mobile; desktop pairs the copy on the left with the equipment on the right. Its 18 MB demonstration video loads on user request (`preload="none"`, native controls), with an existing local image as poster.
- Mesh retains its hero video with an explicit pause control, stops playback off screen/in background and respects reduced motion. Its calculator uses keyboard-accessible radio groups, explicit Continue/Back controls and resets all answers. `tests/mesh-calculator.test.cjs` covers all 72 scoring combinations and invalid/incomplete inputs.
- Office maps in Home, Contacto, Empresas and Internet share `office-map.js`: lazy-loaded Leaflet/OpenStreetMap, independent Google Maps directions link and visible failure message. Pin coordinates (-37.3093588, -59.136183) come from the Nigro 575 marker published at https://www.usinatandil.com.ar/centros-de-atencion/. No API key or localhost exception is required.
- Contacto and Empresas use stronger blue/green accents. Contacto's primary action opens the help center. The future webchat is explicitly deferred until the public website and Autogestion are finished; current messaging contact remains secondary, with its existing hours. Do not add a nonfunctional chat button.
- Checked desktop/mobile layouts, office map tiles, independent plan terms, coverage lookup, FAQ opening, TV gallery, Mesh navigation/reset and mobile menu/Escape. No Autogestion files were changed by this batch.

## Help center and compatibility guides (third delivery)

- Centro de ayuda and the four Android TV / Fire TV / Apple TV / mobile compatibility guides now share the public navigation, footer and locally compiled CSS. `help.css` replaces five sets of inline styles and the help center's old tabs/accordion implementation.
- All 18 answers remain in the HTML as native disclosures, grouped under TV, Internet/WiFi and administration. Existing answer text, examples, images, minimum versions and service links are preserved. Device-guide steps retain their wording in semantic ordered lists, with related guides, breadcrumbs, section links and a return to the matching help answer.
- `help-center.js` indexes the rendered questions/answers once and filters locally without network calls. Search ignores accents and case, supports multiple terms, shows a result count and an explicit empty state, and can be cleared with the button or Escape. Without JavaScript, all categories and disclosures remain usable; the unavailable search is not shown.
- Each answer has a stable fragment. The existing `#medios-de-pago` now opens the answer and focuses its summary instead of landing on a hidden tab. Category links clear search, and hash changes reveal the requested answer. Guide return links open `#compatibilidad-sensa`.
- The old relative `10.85.0.10/speedtest/` link is now an absolute HTTP link to the same configured service. Availability of that private-network speed test was not checked; no external account or payment actions were exercised.
- The three explanatory screenshots retain their original image files, with lazy loading, asynchronous decoding and intrinsic dimensions. No screenshot contents or Autogestion app files were edited.

## Nosotros (fourth delivery)

- The institutional page shares the public shell, Inter typography and `institutional.css`, retaining metadata, analytics and original body paragraphs. The public footer links to Nosotros.
- The Tandil panorama and original team photograph are served locally as WebP with explicit dimensions. A smaller hero source is used on phones; the team photo loads lazily. External partner logos were replaced with readable organization names.
- Mission and values use typography, separators and restrained blue accents. The team photograph is shown without cropping. The page needs no dedicated JavaScript.

## Documentation, recovery and campaign pages (final public batch)

- Alcances, Baja, Términos and Privacidad use the public shell and `documents.css`. Alcances presents the same seven service PDFs as simple grouped rows with file sizes. All eight service/privacy PDF binaries were compared by SHA-256 before and after; no files or legal wording were replaced.
- Baja has no submission form in the original implementation. Its existing cancellation/contact channels now appear first, with optional help afterward. The original WhatsApp cancellation message, email, phone, office address and hours remain; no cancellation requests were submitted. Webchat remains deferred.
- Términos preserves the full document wording and original update date, repairs an unclosed bold tag, and adds a native collapsible index, stable section anchors, readable line length and print styling.
- Privacidad replaces the mobile user-agent redirect and unreliable embedded viewer with permanent Open PDF / Download PDF actions. The PDF is unchanged. Native PDF rendering depends on the browser; download is available independently.
- Six 404 entry files share `includes/public/not-found.html` through the public shell build. All recovery links, scripts and styles use root-relative paths, so Apache's existing ErrorDocument can render at any missing URL depth. The new design removes animation and misleading instant-response copy. Verified HTTP 404 and return-to-home behavior with a temporary local PHP router emulating ErrorDocument; production Apache behavior was not deployed or exercised.
- The advertising landing retains its focused navigation, canonical/SEO metadata, all prices, eight CTA source identifiers, WhatsApp destinations and analytics configuration. Its CSS now uses the approved Inter typography, button shapes, spacing and restrained blue/green palette. It reuses the approved 1000 Mbps photo and fixes the missing TV image fallback. Decorative scroll-reveal JavaScript was removed; all content is visible without it. Conversion handling uses the existing shared tracker plus the original campaign attribution script, verified with local stubs to emit one conversion per CTA without sending real events.
- Desktop (1280px) and mobile (390px) checks covered the six page types, menu, legal index, FAQ, document links and 404 recovery. All eight PDFs were served successfully over local HTTP. Static checks cover paragraph preservation, legal wording, prices, CTA sources, duplicate IDs and local file/fragment targets. The standalone `mundial-cafe` app is outside the public Usittel navigation and was not changed; Autogestion remains excluded.

## Delivery state

The identified public website routes and advertising landing have been refreshed locally. Production publication remains separate. Future webchat integration is still pending by user decision.

Each batch includes desktop/mobile checks, content/link preservation and relevant interactions. Production publication is separate from local implementation. Neither shared public assets nor this build scan include the Autogestion app.
