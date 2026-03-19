<?php
$pageTitle = 'Usittel - Internet por Fibra Óptica en Tandil';
$base = '';
include __DIR__ . '/includes/header.php';
?>
  <main>
    <!-- =========== HERO SECTION =========== -->
    <section id="hero-container" class="relative flex items-center justify-center text-white text-center px-4 sm:px-6"
      style="background-size: cover; min-height: calc(100vh - 0px)">
      <!-- Ajuste: Menos opacidad para ver más la imagen de fondo -->
      <div class="absolute inset-0 bg-black" style="opacity:0.32"></div>
      <div class="hero-content relative z-10 max-w-4xl mx-auto">
        <picture>
          <source srcset="assets/img/logos/USITTEL_BLACK-removebg-preview.webp" type="image/webp"><img
            src="assets/img/logos/USITTEL_BLACK-removebg-preview.png" alt="Usittel Logo"
            class="h-16 md:h-20 mx-auto mb-5" />
        </picture>
        <h1 class="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
          La fibra óptica más rápida de Tandil.
        </h1>
        <p class="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-10">
          Velocidad y confiabilidad para streaming, gaming y trabajo sin
          interrupciones.
        </p>
        <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
          <a href="#plans"
            class="nav-button-green cta-button px-6 sm:px-8 py-3 text-white w-full sm:w-auto text-center"><b>Nuestros
              planes</b></a>
          <a href="#coverage"
            class="nav-button2 cta-button px-6 sm:px-8 py-3 text-white w-full sm:w-auto text-center"><b>Verificar
              Cobertura</b></a>
        </div>
      </div>
    </section>
    <script>
      // HERO: Carrusel para web, fondo fijo aleatorio para mobile
      document.addEventListener("DOMContentLoaded", function () {
        const heroImagesDesktop = [
          "assets/img/hero/web/hero_final_1.webp",
          "assets/img/hero/web/hero_final_2.webp",
          "assets/img/hero/web/hero_final_4.webp",
          "assets/img/hero/web/hero_final_5.webp",
          "assets/img/hero/web/hero_final_6.webp",
          "assets/img/hero/web/hero_final_8.webp",
          "assets/img/hero/web/hero_final_10.webp",
        ];
        const heroImagesMobile = [
          "assets/img/hero/mobile/hero_mobile.webp",
          "assets/img/hero/mobile/hero_mobile.webp",
          "assets/img/hero/mobile/hero_final_7.webp",
          "assets/img/hero/mobile/hero_mobile_final_4.webp",
        ];

        function isMobile() {
          return window.innerWidth <= 900;
        }

        const heroContainer = document.getElementById("hero-container");
        let carouselInterval;
        let currentSlide = 0;

        function initHero() {
          if (!heroContainer) return;

          // Limpiar todo lo anterior
          const existingBgs = document.getElementById('hero-carousel-container');
          if (existingBgs) existingBgs.remove();
          const existingControls = document.querySelectorAll('.hero-carousel-control');
          existingControls.forEach(el => el.remove());
          clearInterval(carouselInterval);
          heroContainer.style.backgroundImage = 'none';

          if (isMobile()) {
            // Lógica original para mobile
            const lastImgKey = "lastHeroImgMobile";
            const lastImg = sessionStorage.getItem(lastImgKey);
            const availableImages = heroImagesMobile.filter((img) => img !== lastImg);
            const pool = availableImages.length > 0 ? availableImages : heroImagesMobile;
            const randomImg = pool[Math.floor(Math.random() * pool.length)];
            heroContainer.style.backgroundImage = `url('${randomImg}')`;
            sessionStorage.setItem(lastImgKey, randomImg);

            heroContainer.classList.remove('group');
          } else {
            // Lógica de carrusel para desktop
            const startIdx = Math.floor(Math.random() * heroImagesDesktop.length);
            currentSlide = startIdx;

            const carouselContainer = document.createElement('div');
            carouselContainer.id = 'hero-carousel-container';
            carouselContainer.className = 'absolute inset-0 z-0 overflow-hidden rounded-[inherit]';

            // Contenedor de fondos
            heroImagesDesktop.forEach((img, index) => {
              const bgDiv = document.createElement('div');
              bgDiv.className = `hero-carousel-bg absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`;
              bgDiv.style.backgroundImage = `url('${img}')`;
              carouselContainer.appendChild(bgDiv);
            });

            // Contenedor de controles (indicadores) se saca del carouselContainer 
            // para evitar que queden detras de las capas de oscurecimiento
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'hero-carousel-control absolute bottom-12 left-0 right-0 flex justify-center gap-3 z-30 pointer-events-auto';
            heroImagesDesktop.forEach((_, index) => {
              const dot = document.createElement('div');
              dot.className = `carousel-dot w-3 h-3 rounded-full cursor-pointer transition-colors duration-300 ${index === currentSlide ? 'bg-white' : 'bg-white/50 hover:bg-white/80'} shadow-md`;
              dot.addEventListener('click', (e) => {
                e.stopPropagation();
                goToSlide(index);
              });
              controlsContainer.appendChild(dot);
            });

            // Flechas
            const createArrow = (isPrev) => {
              const arrow = document.createElement('button');
              arrow.className = `hero-carousel-control absolute top-1/2 -translate-y-1/2 ${isPrev ? 'left-4 sm:left-10' : 'right-4 sm:right-10'} w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center z-30 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg border-none pointer-events-auto`;
              arrow.innerHTML = `<i class="fas fa-chevron-${isPrev ? 'left' : 'right'} text-xl"></i>`;
              arrow.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar problemas de click con capas subyacentes
                if (isPrev) goToSlide(currentSlide === 0 ? heroImagesDesktop.length - 1 : currentSlide - 1);
                else goToSlide((currentSlide + 1) % heroImagesDesktop.length);
              });
              return arrow;
            };

            heroContainer.classList.add('group');

            // Insertar carrusel al principio del contenedor hero
            heroContainer.insertBefore(carouselContainer, heroContainer.firstChild);

            // Los controles y flechas van al final del heroContainer para asegurar que están por encima de todos los elementos oscuros
            heroContainer.appendChild(controlsContainer);
            heroContainer.appendChild(createArrow(true));
            heroContainer.appendChild(createArrow(false));

            // Iniciar intervalo más rápido
            carouselInterval = setInterval(() => {
              goToSlide((currentSlide + 1) % heroImagesDesktop.length);
            }, 4500); // 4.5 segundos
          }
        }

        function goToSlide(index) {
          if (isMobile()) return;
          const container = document.getElementById('hero-carousel-container');
          if (!container) return;

          const bgs = container.querySelectorAll('.hero-carousel-bg');

          // Buscar en document ya que los controles ya no están dentro de container
          const dots = document.querySelectorAll('.carousel-dot');

          if (bgs[currentSlide]) bgs[currentSlide].classList.replace('opacity-100', 'opacity-0');
          if (dots[currentSlide]) dots[currentSlide].classList.replace('bg-white', 'bg-white/50');

          currentSlide = index;

          if (bgs[currentSlide]) bgs[currentSlide].classList.replace('opacity-0', 'opacity-100');
          if (dots[currentSlide]) dots[currentSlide].classList.replace('bg-white/50', 'bg-white');

          // Reiniciar intervalo
          clearInterval(carouselInterval);
          carouselInterval = setInterval(() => {
            goToSlide((currentSlide + 1) % heroImagesDesktop.length);
          }, 4500);
        }

        let wasMobile = isMobile();

        // Ajustar altura del hero para ocupar el 100vh menos la altura del nav
        function setHeroHeight() {
          const nav = document.querySelector(".navbar-section");
          if (nav && heroContainer) {
            const navHeight = nav.offsetHeight;
            heroContainer.style.minHeight = `calc(100vh - ${navHeight}px)`;
          }
        }

        initHero();
        setHeroHeight();

        window.addEventListener("resize", function () {
          const isNowMobile = isMobile();
          if (isNowMobile !== wasMobile) {
            wasMobile = isNowMobile;
            initHero();
          }
          setHeroHeight();
        });
      });
    </script>

    <!-- =========== Services Section =========== -->
    <section class="py-16 md:py-24 bg-white" id="tv-section">
      <div class="container mx-auto px-6 max-w-7xl">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900">
            Una conexión pensada para vos
          </h2>
          <p class="text-lg text-gray-600 mt-2">
            Todo lo que necesitás para tu hogar en un solo lugar.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-gray-50 px-12 py-10 rounded-xl text-center hover-glow-card">
            <div class="text-blue-600 mb-4">
              <i class="fas fa-tv fa-3x"></i>
            </div>
            <h3 class="text-2xl font-bold mb-3">USITTEL TV</h3>
            <p class="text-gray-600">
              Accedé a más de 100 canales en vivo, series y películas
              on-demand. Llevá tu tele a donde vayas con la app en tus
              dispositivos.
            </p>
          </div>

          <div class="bg-gray-50 px-12 py-10 rounded-xl text-center hover-glow-card">
            <div class="text-blue-600 mb-4">
              <i class="fas fa-rocket fa-3x"></i>
            </div>
            <h3 class="text-2xl font-bold mb-3">Internet Fibra Óptica</h3>
            <p class="text-gray-600">
              Navegá a la velocidad de la luz con planes simétricos para
              trabajar, estudiar y disfrutar del mejor entretenimiento.
            </p>
          </div>

          <div class="bg-gray-50 px-12 py-10 rounded-xl text-center hover-glow-card">
            <div class="text-blue-600 mb-4">
              <i class="fas fa-wifi fa-3x"></i>
            </div>
            <h3 class="text-2xl font-bold mb-3">WiFi Mesh</h3>
            <p class="text-gray-600">
              Eliminá las zonas sin señal. Con nuestra tecnología WiFi Mesh,
              garantizamos cobertura total en cada rincón de tu casa.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="plans" class="py-12 md:py-20 bg-gray-100 text-[0.9rem] md:text-[0.95rem]">
      <div class="container mx-auto px-4 md:px-5" style="max-width: 1200px">
        <div class="text-center mb-10 md:mb-10">
          <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
            Nuestros Planes
          </h2>
          <p class="text-base md:text-lg text-gray-600 mt-2">
            Elegí la velocidad perfecta para vos. Simple, transparente y sin
            sorpresas.
          </p>
        </div>
        <div class="flex justify-center mb-8 md:mb-10">
          <div class="plan-toggle scale-90">
            <button id="internet-only-btn" class="active">
              Solo Internet
            </button>
            <button id="internet-tv-btn">Combos</button>
            <button id="tv-only-btn">Solo TV</button>
          </div>
        </div>

        <!-- Contenedor para la vista por defecto (Internet y Combos) -->
        <div id="default-plans-view">

          <div id="premium-giga-container" class="max-w-6xl mx-auto mb-12 px-4 md:px-0">
            <style>
              @keyframes slideFadePromo {

                0%,
                25% {
                  opacity: 1;
                  transform: scale(1.05) translateY(2%);
                }

                33%,
                92% {
                  opacity: 0;
                  transform: scale(1.1) translateY(2%);
                }

                100% {
                  opacity: 1;
                  transform: scale(1.05) translateY(2%);
                }
              }

              .promo-slideshow {
                -webkit-mask-image: linear-gradient(to right, transparent 0%, black 30%, black 80%, transparent 100%), linear-gradient(to bottom, transparent 15%, black 40%, black 85%, transparent 100%);
                -webkit-mask-composite: source-in;
                mask-image: linear-gradient(to right, transparent 0%, black 30%, black 80%, transparent 100%), linear-gradient(to bottom, transparent 15%, black 40%, black 85%, transparent 100%);
                mask-composite: intersect;
              }

              .promo-slideshow img {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center 20%;
              }

              .promo-slideshow img:nth-child(1) {
                animation: slideFadePromo 9s infinite 0s;
              }

              .promo-slideshow img:nth-child(2) {
                animation: slideFadePromo 9s infinite 3s;
                opacity: 0;
              }

              .promo-slideshow img:nth-child(3) {
                animation: slideFadePromo 9s infinite 6s;
                opacity: 0;
              }
            </style>
            <div
              class="bg-gradient-to-br from-gray-900 via-slate-800 to-black rounded-2xl p-1 shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <div
                class="absolute top-0 right-0 bg-green-500 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-bl-xl z-20 shadow-lg flex items-center gap-2">
                NUEVA VELOCIDAD
              </div>

              <div
                class="bg-gray-900/50 rounded-xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 relative z-10 h-full backdrop-blur-sm">
                <div class="flex-1 w-full text-left relative z-20">
                  <div
                    class="inline-block px-3 py-1 mb-3 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold tracking-wider">
                    TECNOLOGÍA WI-FI 6
                  </div>
                  <h3 class="text-4xl md:text-6xl font-extrabold mb-2 text-white tracking-tight drop-shadow-md">1000
                    MEGAS</h3>
                  <p class="text-gray-300 text-base md:text-lg mb-4 drop-shadow-md">Jugá, creá y disfrutá sin
                    interrupciones. La máxima experiencia de conectividad en Tandil.</p>

                  <div class="my-6">
                    <span class="text-5xl md:text-6xl font-extrabold text-white drop-shadow-md">$49.999</span>
                    <span class="text-gray-400 text-xl font-medium drop-shadow-md"> /mes</span>
                    <p class="text-sm text-gray-300 mt-1 drop-shadow-md">Precio de lista final y único disponible.</p>
                    <p class="text-sm text-green-400 font-semibold mt-2 drop-shadow-md">&#128274; Precio fijo por 9
                      meses.</p>
                  </div>

                  <ul class="space-y-3 mb-8 relative z-20">
                    <li class="flex items-start"><i
                        class="fas fa-check-circle text-green-400 mr-3 mt-1 shrink-0 drop-shadow-md"></i><span
                        class="text-gray-100 drop-shadow-md"><strong>Wi-Fi 6 (802.11ax):</strong> Mayor alcance y
                        capacidad para múltiples dispositivos sin lag.</span></li>
                    <li class="flex items-start"><i
                        class="fas fa-check-circle text-green-400 mr-3 mt-1 shrink-0 drop-shadow-md"></i><span
                        class="text-gray-100 drop-shadow-md">Latencia ultra baja, ideal para <strong>Gaming competitivo
                          y Streaming 4K/8K</strong>.</span></li>
                    <li class="flex items-start"><i
                        class="fas fa-check-circle text-green-400 mr-3 mt-1 shrink-0 drop-shadow-md"></i><span
                        class="text-gray-100 drop-shadow-md"><strong>Soporte prioritario:</strong> Atención por WhatsApp
                        y técnica exclusiva.</span></li>
                  </ul>

                  <a href="https://wa.me/5492494060345" target="_blank" rel="noopener"
                    class="w-full md:w-auto text-center inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(48,161,114,0.4)] hover:shadow-[0_0_20px_rgba(48,161,114,0.6)] relative z-20">
                    <i class="fab fa-whatsapp text-xl"></i> Solicitar Plan 1000 Megas
                  </a>
                </div>

                <div
                  class="hidden md:flex absolute right-0 top-0 bottom-0 w-3/5 overflow-hidden z-0 pointer-events-none opacity-80">
                  <div class="promo-slideshow absolute inset-0">
                    <img src="assets/img/imagen1000_nuevo.JPG" alt="1000 Megas" />
                    <img src="assets/img/nueva_imagen1000_2.JPG" alt="1000 Megas" />
                    <img src="assets/img/Nueva_imagen1000_3.JPG" alt="1000 Megas" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="plan-cards-container"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 max-w-6xl mx-auto"></div>

        </div>
        <!-- Contenedor para la vista especial "Solo TV" -->
        <div id="solo-tv-view" class="hidden max-w-7xl mx-auto">
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
            <!-- Columna Izquierda: Plan TV -->
            <div id="solo-tv-card-container" class="lg:col-span-3">
              <!-- La tarjeta del plan de TV se inyectará aquí -->
            </div>
            <!-- Columna Derecha: Packs Premium -->
            <div class="lg:col-span-2">
              <h3 class="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-left">
                Agregá Packs Premium
              </h3>
              <div class="space-y-4">
                <!-- Card Pack Fútbol -->
                <div class="bg-white rounded-xl p-4 flex items-center gap-6 hover-glow-card">
                  <img src="assets/img/LPF.png" alt="Logo Liga Profesional de Fútbol"
                    class="h-20 w-20 rounded-lg object-contain flex-shrink-0" />
                  <div class="text-left">
                    <h4 class="font-bold text-gray-900">Pack Fútbol</h4>
                    <p class="text-sm text-gray-600">
                      Viví todos los partidos de la liga argentina.
                    </p>
                    <p class="text-lg font-bold text-black-600 mt-1">
                      $21.999<span class="text-sm font-normal text-gray-500">/mes</span>
                    </p>
                  </div>
                </div>
                <!-- Card HBO Max -->
                <div class="bg-white rounded-xl p-4 flex items-center gap-6 hover-glow-card">
                  <picture>
                    <source srcset="assets/img/logos/max-logo-black.webp" type="image/webp"><img
                      src="assets/img/logos/max-logo-black.png" alt="Logo HBO"
                      class="h-20 w-20 rounded-lg object-contain flex-shrink-0" />
                  </picture>
                  <div class="text-left">
                    <h4 class="font-bold text-gray-900">Pack HBO</h4>
                    <p class="text-sm text-gray-600">
                      Canales premium y acceso a la app MAX.
                    </p>
                    <p class="text-lg font-bold text-black-600 mt-1">
                      $8.999<span class="text-sm font-normal text-gray-500">/mes</span>
                    </p>
                  </div>
                </div>
                <!-- Card Universal+ -->
                <div class="bg-white rounded-xl p-4 flex items-center gap-6 hover-glow-card">
                  <picture>
                    <source srcset="assets/img/logos/Universal-Logo-removebg-preview.webp" type="image/webp"><img
                      src="assets/img/logos/Universal-Logo-removebg-preview.png" alt="Logo Universal+"
                      class="h-20 w-20 rounded-lg object-contain flex-shrink-0" />
                  </picture>
                  <div class="text-left">
                    <h4 class="font-bold text-gray-900">Universal+</h4>
                    <p class="text-sm text-gray-600">
                      Canales premium y acceso a la app de streaming.
                    </p>
                    <p class="text-lg font-bold text-black-600 mt-1">
                      $7.999<span class="text-sm font-normal text-gray-500">/mes</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Leyenda Aclaratoria -->
          <div class="text-center mt-12 pt-8 border-t border-gray-200">
            <p class="text-sm text-gray-500 max-w-2xl mx-auto">
              <i class="fas fa-info-circle mr-1 text-blue-500"></i>Importante:
              La contratación de los packs premium requiere contar con un
              abono básico de Televisión activo. No pueden ser adquiridos de
              forma individual.
            </p>
          </div>
        </div>

        <!-- Contenedor para los botones de más información -->
        <div id="plan-info-button-container" class="text-center mt-10"></div>
      </div>
    </section>

    <!-- =========== WiFi Mesh Section (ORDEN 3) =========== -->
    <section class="py-12 md:py-20 bg-white text-[0.9rem] md:text-[0.95rem]" id="mesh">
      <div class="container mx-auto px-4 md:px-5" style="max-width: 1100px">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <!-- 1. Título + descripción (mobile: primero | desktop: col-1 fila-1) -->
          <div>
            <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
              ¿Problemas de cobertura WiFi en tu casa?
            </h2>
            <p class="text-base md:text-lg text-gray-600 mt-3">
              Con la tecnología de <span class="font-bold">USITTEL MESH</span>,
              podés disfrutar de una conexión estable y rápida en cada rincón de tu hogar,
              eliminando las zonas sin señal y mejorando la experiencia de navegación.
            </p>
          </div>
          <!-- 2. Carrusel (mobile: segundo | desktop: col-2, abarca 2 filas) -->
          <div class="w-full max-w-sm md:max-w-md mx-auto lg:row-span-2">
            <div class="mesh-carousel-container rounded-large">
              <div class="mesh-slide active">
                <picture>
                  <source srcset="assets/img/mesh/mesh1.webp" type="image/webp"><img src="assets/img/mesh/mesh1.png"
                    class="rounded-xl w-full" alt="Equipo WiFi Mesh 1" />
                </picture>
              </div>
              <div class="mesh-slide">
                <picture>
                  <source srcset="assets/img/mesh/mesh2.webp" type="image/webp"><img src="assets/img/mesh/mesh2.png"
                    class="rounded-xl w-full" alt="Equipo WiFi Mesh 2" />
                </picture>
              </div>
              <div class="mesh-slide">
                <picture>
                  <source srcset="assets/img/mesh/mesh3.webp" type="image/webp"><img src="assets/img/mesh/mesh3.png"
                    class="rounded-xl w-full" alt="Equipo WiFi Mesh 3" />
                </picture>
              </div>
              <div class="mesh-slide">
                <picture>
                  <source srcset="assets/img/mesh/mesh4.webp" type="image/webp"><img src="assets/img/mesh/mesh4.png"
                    class="rounded-xl w-full" alt="Equipo WiFi Mesh 4" />
                </picture>
              </div>
            </div>
            <div class="mesh-dots-container" id="mesh-dots-container"></div>
          </div>
          <!-- 3. Card de precio (mobile: tercero | desktop: col-1 fila-2) -->
          <div
            class="bg-gray-50 p-5 rounded-lg hover-glow-card transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:shadow-lg"
            style="
                border-color: #30a172;
                box-shadow: 0 10px 25px -5px rgba(48, 161, 114, 0.15),
                  0 8px 10px -6px rgba(48, 161, 114, 0.15);
              ">
            <h3 class="text-xl md:text-2xl font-bold">Plan USITTEL MESH</h3>
            <p class="text-3xl md:text-4xl font-extrabold text-gray-900 my-3">
              $6.999
              <span class="text-base md:text-lg font-normal text-gray-500">/mes por equipo</span>
            </p>
            <ul class="space-y-2 text-gray-600 mb-5">
              <li class="flex items-center">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>Innovación: tecnología MESH de última
                generación.
              </li>
              <li class="flex items-center">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>Flexibilidad: se adapta a tu hogar (hasta 4
                equipos).
              </li>
              <li class="flex items-center">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>Conexión confiable: ideal para casas con muchos
                dispositivos.
              </li>
            </ul>
            <a href="https://wa.me/5492494060345" target="_blank" rel="noopener"
              class="w-full text-center mt-auto bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 cta-button flex items-center justify-center gap-2">
              <i class="fab fa-whatsapp"></i> Consultar
            </a>
          </div>
        </div>
        <!-- Enlace agregado debajo de la sección Mesh -->
        <div class="text-center mt-10">
          <a href="pages/mesh/"
            class="inline-block text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors text-sm md:text-base">Descubrí
            cómo la tecnología Mesh se integra con nuestra red de
            Fibra Óptica <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <script>
        // Carrousel automático para Mesh
        document.addEventListener("DOMContentLoaded", function () {
          const meshSlides = document.querySelectorAll(".mesh-slide");
          const meshDotsContainer = document.getElementById(
            "mesh-dots-container"
          );
          let currentMeshSlide = 0;
          let meshInterval;

          function createMeshDots() {
            if (!meshDotsContainer) return;
            meshDotsContainer.innerHTML = "";
            meshSlides.forEach((_, i) => {
              const dot = document.createElement("button");
              dot.classList.add("mesh-dot");
              if (i === 0) dot.classList.add("active");
              dot.addEventListener("click", () => {
                showMeshSlide(i);
                resetMeshInterval();
              });
              meshDotsContainer.appendChild(dot);
            });
          }

          function showMeshSlide(n) {
            if (!meshSlides.length) return;
            meshSlides[currentMeshSlide].classList.remove("active");
            meshDotsContainer.children[currentMeshSlide].classList.remove(
              "active"
            );
            currentMeshSlide = (n + meshSlides.length) % meshSlides.length;
            meshSlides[currentMeshSlide].classList.add("active");
            meshDotsContainer.children[currentMeshSlide].classList.add(
              "active"
            );
          }

          function nextMeshSlide() {
            showMeshSlide(currentMeshSlide + 1);
          }

          function resetMeshInterval() {
            clearInterval(meshInterval);
            meshInterval = setInterval(nextMeshSlide, 1500);
          }

          if (meshSlides.length > 1) {
            createMeshDots();
            meshInterval = setInterval(nextMeshSlide, 1500);
          }
        });
      </script>
    </section>

    <!-- =========== Network & Coverage Section (ORDEN 4 - REDISEÑADA CON LAYOUT LADO A LADO) =========== -->
    <section id="network" class="py-16 md:py-24 bg-gray-100">
      <div class="container mx-auto px-6">
        <!-- Parte de "Zona de Cobertura" integrada armoniosamente (REDISEÑADA) -->
        <div id="coverage" class="text-center">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Zona de cobertura actual
          </h2>
          <p class="text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
            Explorá nuestro mapa interactivo y verificá si nuestra red de fibra óptica ya está disponible en tu
            domicilio.
          </p>

          <!-- Contenedor responsive con mapa y validador lado a lado -->
          <div class="coverage-container">
            <!-- Contenedor del mapa -->
            <div class="coverage-map-container">
              <div id="coverage-map"></div>
            </div>

            <!-- Contenedor del validador -->
            <div class="coverage-validator">
              <h3 class="text-xl font-semibold text-gray-800 mb-4">¿Llegamos a tu casa?</h3>
              <p class="text-gray-600 mb-6">
                Ingresa tu dirección y su numero (No hace falta ingresar Tandil, Buenos Aires.) Ejemplo: San Martin 550
              </p>
              <div class="space-y-4">
                <input type="text" id="address-input" placeholder="Ingresá tu dirección, ej: San Martín 550"
                  class="w-full px-4 py-3 rounded-lg text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" />
                <button id="coverage-button"
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg cta-button transition-all duration-200">
                  Consultar
                </button>
              </div>
              <div id="coverage-result" class="mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========== FAQ Section (ORDEN 6 - CORREGIDA) =========== -->
    <section class="py-16 md:py-24 bg-white">
      <div class="container mx-auto px-6">
        <div class="bg-white p-8 lg:p-12 rounded-xl shadow-lg max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900">
              Preguntas Frecuentes
            </h2>
          </div>
          <div id="faq-accordion" class="space-y-6">
            <!-- Pregunta 1 -->
            <div
              class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <button class="faq-question w-full flex items-start gap-4 text-left">
                <div
                  class="hidden md:flex flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full items-center justify-center text-white shadow-md">
                  <i class="fas fa-tachometer-alt text-lg"></i>
                </div>
                <div class="flex-1 pr-4">
                  <h3 class="text-lg font-semibold text-gray-800 mb-2">¿Qué significa que la velocidad sea "simétrica"?
                  </h3>
                </div>
                <span class="faq-icon text-gray-500 font-bold text-2xl transform flex-shrink-0">+</span>
              </button>
              <div class="faq-answer">
                <div class="ml-0 md:ml-16 mt-4 space-y-3">
                  <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div class="flex items-start gap-3">
                      <div
                        class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <i class="fas fa-arrows-up-down text-blue-600 text-xs"></i>
                      </div>
                      <p class="text-gray-700 leading-relaxed">
                        Significa que tenés la misma velocidad de <strong class="text-blue-600">subida</strong> que de
                        <strong class="text-blue-600">bajada</strong>.
                      </p>
                    </div>
                  </div>

                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <i class="fas fa-star text-blue-500"></i>
                      Beneficios de la velocidad simétrica:
                    </h4>
                    <div class="grid md:grid-cols-2 gap-3">
                      <div class="flex items-center gap-2 text-sm text-gray-700">
                        <i class="fas fa-video text-blue-500"></i>
                        <span>Videollamadas en HD</span>
                      </div>
                      <div class="flex items-center gap-2 text-sm text-gray-700">
                        <i class="fas fa-gamepad text-blue-500"></i>
                        <span>Gaming online fluido</span>
                      </div>
                      <div class="flex items-center gap-2 text-sm text-gray-700">
                        <i class="fas fa-cloud-upload text-green-500"></i>
                        <span>Subir archivos rápido</span>
                      </div>
                      <div class="flex items-center gap-2 text-sm text-gray-700">
                        <i class="fas fa-share-alt text-blue-500"></i>
                        <span>Redes sociales fluidas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Pregunta 2 -->
            <div
              class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <button class="faq-question w-full flex items-start gap-4 text-left">
                <div
                  class="hidden md:flex flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full items-center justify-center text-white shadow-md">
                  <i class="fas fa-tools text-lg"></i>
                </div>
                <div class="flex-1 pr-4">
                  <h3 class="text-lg font-semibold text-gray-800 mb-2">¿Cómo es el proceso de instalación?</h3>
                </div>
                <span class="faq-icon text-gray-500 font-bold text-2xl transform flex-shrink-0">+</span>
              </button>
              <div class="faq-answer">
                <div class="ml-0 md:ml-16 mt-4 space-y-4">
                  <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <p class="text-gray-700 leading-relaxed mb-4">
                      Una vez que contratás el servicio y confirmamos la disponibilidad en tu domicilio, un técnico
                      especializado coordinará una visita para realizar la instalación.
                    </p>
                  </div>

                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <i class="fas fa-list-ol text-blue-600"></i>
                      Pasos del proceso:
                    </h4>
                    <div class="space-y-3">
                      <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <div
                          class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          1</div>
                        <span class="text-gray-700">Instalación del cable de fibra óptica</span>
                      </div>
                      <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <div
                          class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          2</div>
                        <span class="text-gray-700">Configuración del módem ONT</span>
                      </div>
                      <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <div
                          class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          <i class="fas fa-check text-xs"></i>
                        </div>
                        <span class="text-gray-700">Pruebas de funcionamiento y entrega</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Pregunta 3 -->
            <div
              class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <button class="faq-question w-full flex items-start gap-4 text-left">
                <div
                  class="hidden md:flex flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full items-center justify-center text-white shadow-md">
                  <i class="fas fa-wifi text-lg"></i>
                </div>
                <div class="flex-1 pr-4">
                  <h3 class="text-lg font-semibold text-gray-800 mb-2">¿Puedo usar mi propio router?</h3>
                </div>
                <span class="faq-icon text-gray-500 font-bold text-2xl transform flex-shrink-0">+</span>
              </button>
              <div class="faq-answer">
                <div class="ml-0 md:ml-16 mt-4 space-y-4">
                  <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div class="flex items-start gap-3">
                      <div
                        class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                        <i class="fas fa-check text-green-600 text-xs"></i>
                      </div>
                      <p class="text-gray-700 leading-relaxed">
                        <strong class="text-green-600">Sí, podés conectar tu propio router</strong> a nuestro módem
                        (ONT) sin ningún problema. Es completamente compatible.
                      </p>
                    </div>
                  </div>

                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <i class="fas fa-star text-blue-500"></i>
                      Sin embargo, nuestra recomendación:
                    </h4>
                    <div class="space-y-3">
                      <div class="flex items-start gap-3">
                        <div
                          class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                          <i class="fas fa-shield-alt text-blue-600 text-xs"></i>
                        </div>
                        <p class="text-gray-700 text-sm">
                          Para <strong>garantizar la mejor experiencia y cobertura</strong> en tu hogar, recomendamos
                          usar nuestros equipos certificados
                        </p>
                      </div>
                      <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <div class="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <i class="fas fa-network-wired text-white text-xs"></i>
                        </div>
                        <div>
                          <span class="font-medium text-gray-800">Solución WiFi Mesh</span>
                          <p class="text-xs text-gray-600">Cobertura completa y uniforme en toda tu casa</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Pregunta 4 -->
            <div
              class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <button class="faq-question w-full flex items-start gap-4 text-left">
                <div
                  class="hidden md:flex flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full items-center justify-center text-white shadow-md">
                  <i class="fas fa-headset text-lg"></i>
                </div>
                <div class="flex-1 pr-4">
                  <h3 class="text-lg font-semibold text-gray-800 mb-2">¿Qué hago si tengo problemas con el servicio?
                  </h3>
                </div>
                <span class="faq-icon text-gray-500 font-bold text-2xl transform flex-shrink-0">+</span>
              </button>
              <div class="faq-answer">
                <div class="ml-0 md:ml-16 mt-4 space-y-4">
                  <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <p class="text-gray-700 leading-relaxed mb-4">
                      Podés comunicarte con nuestro <strong class="text-blue-600">centro de atención al cliente</strong>
                      por múltiples canales. Nuestro <strong class="text-blue-600">equipo de soporte técnico
                        local</strong> te ayudará a resolver cualquier inconveniente rápidamente.
                    </p>
                  </div>

                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <i class="fas fa-phone-alt text-blue-600"></i>
                      Canales de atención disponibles:
                    </h4>
                    <div class="grid md:grid-cols-2 gap-3">
                      <a href="tel:08001994545"
                        class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                        <div
                          class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i class="fas fa-phone text-sm"></i>
                        </div>
                        <div>
                          <span class="font-medium text-gray-800">Teléfono</span>
                          <p class="text-xs text-gray-600">0800-199-4545</p>
                        </div>
                      </a>

                      <a href="https://api.whatsapp.com/send/?phone=5492494060345&text&type=phone_number&app_absent=0"
                        target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-green-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                        <div
                          class="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i class="fab fa-whatsapp text-sm"></i>
                        </div>
                        <div>
                          <span class="font-medium text-gray-800">WhatsApp</span>
                          <p class="text-xs text-gray-600">Atención inmediata</p>
                        </div>
                      </a>

                      <a href="pages/centro_de_ayuda/index.html"
                        class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group md:col-span-2">
                        <div
                          class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i class="fas fa-user-cog text-sm"></i>
                        </div>
                        <div>
                          <span class="font-medium text-gray-800">Centro de Ayuda</span>
                          <p class="text-xs text-gray-600">Resolvé problemas básicos y consultá nuestras guías</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =========== Contact Section (ORDEN 7) =========== -->
    <section id="contact" class="py-8 md:py-12 bg-gray-50">
      <div class="container mx-auto px-6">
        <div class="bg-gray-100 p-8 lg:p-12 rounded-xl shadow-lg max-w-7xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 class="text-2xl font-bold mb-4">Contactanos</h3>
              <div class="space-y-4">
                <div class="flex items-center gap-4">
                  <div class="bg-blue-500 text-white p-3 rounded-full flex items-center justify-center w-12 h-12">
                    <i class="fa-solid fa-phone text-xl"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-lg">Teléfono</h4>
                    <a href="tel:08001994545" class="text-gray-600 hover:text-blue-600">0800-199-4545</a>
                    <p class="text-sm text-gray-500">Lunes a Viernes de 8 a 16hs.</p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="bg-green-500 text-white p-3 rounded-full flex items-center justify-center w-12 h-12">
                    <i class="fab fa-whatsapp text-3xl"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-lg">WhatsApp</h4>
                    <a href="https://wa.me/5492494060345" target="_blank" rel="noopener noreferrer"
                      class="text-gray-600 hover:text-green-600">+54 9 249 406-0345</a>
                    <p class="text-sm text-gray-500">L-V de 8 a 20hs. Sáb, Dom y feriados de 10 a 16hs.</p>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="bg-blue-500 text-white p-3 rounded-full flex items-center justify-center w-12 h-12">
                    <i class="fa-solid fa-envelope text-xl"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-lg">Email</h4>
                    <a href="mailto:contacto@usittel.com.ar"
                      class="text-gray-600 hover:text-blue-600">contacto@usittel.com.ar</a>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="bg-blue-500 text-white p-3 rounded-full flex items-center justify-center w-12 h-12">
                    <i class="fa-solid fa-location-dot text-xl"></i>
                  </div>
                  <div>
                    <h4 class="font-semibold text-lg">Oficina</h4>
                    <a href="https://maps.app.goo.gl/9a43a2Fv4Qf9eZ1f8" target="_blank" rel="noopener noreferrer"
                      class="text-gray-600 hover:text-blue-600">Nigro 575, Tandil, Buenos Aires</a>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-2xl font-bold mb-4">Nuestra ubicación</h3>
              <div class="rounded-lg overflow-hidden shadow-lg h-[300px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3173.370881402261!2d-59.13915212486734!3d-37.310041572106144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95912026456142db%3A0x4211da708442e913!2sNigro%20575%2C%20B7000%20Tandil%2C%20Provincia%20de%20Buenos%20Aires!5e0!3m2!1ses!2sar!4v1751241377698!5m2!1ses!2sar"
                  width="100%" height="100%" style="border: 0" allowfullscreen="" loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade" class="rounded-lg"></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
<?php include __DIR__ . '/includes/footer.php'; ?>
