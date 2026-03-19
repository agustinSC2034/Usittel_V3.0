    document.addEventListener("DOMContentLoaded", () => {
      // Mobile Menu Logic
      const hamburger = document.getElementById("hamburger"),
        mobileMenu = document.getElementById("mobileMenu"),
        overlay = document.getElementById("overlay"),
        closeMenu = document.getElementById("closeMenu"),
        toggleProducts = document.getElementById("toggleProducts"),
        productsSubmenu = document.getElementById("productsSubmenu");
      function toggleMenu() {
        mobileMenu.classList.toggle("show");
        overlay.classList.toggle("show");
      }
      if (hamburger) hamburger.addEventListener("click", toggleMenu);
      if (overlay) overlay.addEventListener("click", toggleMenu);
      if (closeMenu) closeMenu.addEventListener("click", toggleMenu);
      if (toggleProducts) {
        toggleProducts.addEventListener("click", (e) => {
          e.preventDefault();
          productsSubmenu.style.display =
            productsSubmenu.style.display === "flex" ? "none" : "flex";
        });
      }

      // Plans Section Logic
      const plansData = {
        internet: [
          {
            name: "Fibra 100",
            speed: "100 Mbps",
            symmetric: true,
            price: "17999",
            features: [
              "Instalación 100% bonificada",
              "100 Mbps SIMÉTRICOS (misma velocidad de subida y de bajada)",
              "Ideal para home office",
            ],
            popular: false,
            promoMonths: "3",
            promoFinal:
              "Precio final: $31.500 <br> a partir del 4to mes.<br>",
            promo: `Promoción válida para nuevos clientes personas físicas que contraten el servicio residencial de USITTEL.<br><br>
            El precio promocional de $17.999 es válido durante los primeros 3 meses. A partir del mes cuatro (4), el precio será de $31.500.<br><br>
            La adhesión al débito automático es requisito para acceder a la bonificación en la instalación y a los precios promocionales.<br><br>
            El precio del servicio podrá sufrir modificaciones conforme a la normativa vigente. <br><br>`,
          },
          {
            name: "Fibra 300",
            speed: "300 Mbps",
            symmetric: true,
            price: "19999",
            features: [
              "Instalación 100% bonificada",
              "300 Mbps SIMÉTRICOS (misma velocidad de subida y de bajada)",
              "Perfecto para familias y gaming",
            ],
            popular: true,
            promoMonths: "3",
            promoFinal:
              "Precio final: $34.999 <br> a partir del 4to mes.<br>",
            promo: `Promoción válida para nuevos clientes personas físicas que contraten el servicio residencial de USITTEL.<br><br>
            El precio promocional de $19.999 es válido durante los primeros 3 meses. A partir del mes cuatro (4), el precio será de $34.999.<br><br>
            La adhesión al débito automático es requisito para acceder a la bonificación en la instalación y a los precios promocionales.<br><br>
            El precio del servicio podrá sufrir modificaciones conforme a la normativa vigente.`,
          },
          {
            name: "Fibra 500",
            speed: "500 Mbps",
            symmetric: true,
            price: "22499",
            features: [
              "Instalación 100% bonificada",
              "500 Mbps SIMÉTRICOS (misma velocidad de subida y de bajada)",
              "La mejor experiencia online",
            ],
            popular: false,
            promoMonths: "6",
            promoFinal:
              "Precio final: $39.999 <br> (precio fijo hasta el mes 6).",
            promo: `Promoción válida para nuevos clientes personas físicas que contraten el servicio residencial de USITTEL.<br><br>
            El precio promocional de $22.499 es válido durante los primeros 6 meses. A partir del mes siete (7), el precio será de $39.999.<br><br>
            La adhesión al débito automático es requisito para acceder a la bonificación en la instalación y a los precios promocionales.<br><br>
            El precio de lista se mantiene fijo durante los primeros 6 meses de contratación.`,
          },
        ],
        internetTv: [
          {
            name: "Fibra 100 + TV",
            speed: "100 Mbps",
            symmetric: true,
            price: "29140",
            features: [
              "Instalación 100% bonificada",
              "Pack TV incluido",
              "+100 canales en vivo",
              "Contenido On-Demand",
            ],
            popular: false,
            promoMonths: "3",
            promoFinal:
              "Precio de lista: $50.999 a partir del 4to mes en combo.",
            promo: `Promoción válida para nuevos clientes personas físicas que contraten el servicio residencial de USITTEL.<br><br>
            El precio promocional de $29.140 es válido durante los primeros 3 meses. A partir del mes cuatro (4), el precio de lista será de $50.999.<br><br>
            La adhesión al débito automático es requisito para acceder a la bonificación en la instalación y a los precios promocionales.<br><br>
            El precio del servicio podrá sufrir modificaciones conforme a la normativa vigente.`,
          },
          {
            name: "Fibra 300 + TV",
            speed: "300 Mbps",
            symmetric: true,
            price: "31141",
            features: [
              "Instalación 100% bonificada",
              "Pack TV incluido",
              "Ideal para toda la familia",
              "Mirá en múltiples pantallas",
            ],
            popular: true,
            promoMonths: "3",
            promoFinal: "Precio de lista: $54.498 a partir del 4to mes en combo.",
            promo: `Promoción válida para nuevos clientes personas físicas que contraten el servicio residencial de USITTEL.<br><br>
            El precio promocional de $31.141 es válido durante los primeros 3 meses. A partir del mes cuatro (4), el precio de lista será de $54.498.<br><br>
            La adhesión al débito automático es requisito para acceder a la bonificación en la instalación y a los precios promocionales.<br><br>
            El precio del servicio podrá sufrir modificaciones conforme a la normativa vigente.`,
          },
          {
            name: "Fibra 500 + TV",
            speed: "500 Mbps",
            symmetric: true,
            price: "33647",
            features: [
              "Instalación 100% bonificada",
              "Pack TV incluido",
              "La experiencia completa",
              "Precio fijo por 6 meses 🔒",
            ],
            popular: false,
            promoMonths: "6",
            promoFinal:
              "Precio de lista: $59.498 a partir del 7mo mes. Precio fijo hasta el mes 6.",
            promo: `Promoción válida para nuevos clientes personas físicas que contraten el servicio residencial de USITTEL.<br><br>
            El precio promocional de $33.646,99 es válido durante los primeros 6 meses. A partir del mes siete (7), el precio de lista será de $59.498.<br><br>
            La adhesión al débito automático es requisito para acceder a la bonificación en la instalación y a los precios promocionales.<br><br>
            El precio de lista se mantiene fijo durante los primeros 6 meses de contratación.`,
          },
        ],
        soloTv: [
          {
            name: " USITTEL TV",
            speed: "Televisión Digital mediante la plataforma SENSA",
            symmetric: false,
            price: "19499",
            features: [
              "Más de 100 canales en vivo",
              "Series y películas On-Demand",
              "Acceso a la app de TV multidispositivo",
              "No requiere Internet de Usittel",
            ],
            popular: true,
          },
        ],
      };

      const defaultPlansView = document.getElementById("default-plans-view");
      const soloTvView = document.getElementById("solo-tv-view");
      const planCardsContainer = document.getElementById(
        "plan-cards-container"
      );
      const soloTvCardContainer = document.getElementById(
        "solo-tv-card-container"
      );
      const premiumPacksDefault = document.getElementById(
        "premium-packs-container-default"
      );

      const internetBtn = document.getElementById("internet-only-btn");
      const internetTvBtn = document.getElementById("internet-tv-btn");
      const tvOnlyBtn = document.getElementById("tv-only-btn");

      // NUEVO: El texto de condiciones se muestra en todos los contenedores a la vez

      function createPlanCard(plan, type) {
        const isSoloTvPlan = type === "soloTv";
        const paddingClass = isSoloTvPlan ? "p-8 md:p-10" : "p-8";
        const speedLine = plan.speed.includes("Mbps")
          ? `<p class="text-gray-500 mb-2">${plan.speed} ${plan.symmetric ? "Simétricos" : ""
          }</p>`
          : `<p class="text-blue-600 font-semibold mb-2">${plan.speed}</p>`;

        // Render features, supporting custom icon for object items
        const featuresHtml = plan.features
          .map((feature) => {
            if (typeof feature === "string") {
              return `<li class="flex items-start"><i class="fas fa-check-circle text-green-500 mr-2 mt-1 shrink-0"></i><span>${feature}</span></li>`;
            } else if (typeof feature === "object" && feature.icon) {
              return `<li class="flex items-start"><i class="fas ${feature.icon} text-blue-500 mr-2 mt-1 shrink-0"></i><span>${feature.text}</span></li>`;
            }
            return "";
          })
          .join("");

        // Mostrar el enlace de condiciones en internet e internetTv
        let promoHtml = "";
        if (type === "internet" || type === "internetTv") {
          promoHtml = `
        <div class="text-sm text-blue-600 font-semibold mb-4">Promoción: $${new Intl.NumberFormat(
            "es-AR"
          ).format(plan.price)} por ${plan.promoMonths || "3"} meses</div>
        <div class="text-xs text-gray-500 mb-2">${plan.promoFinal || ""}</div>
        <a href="#" class="text-blue-500 underline text-sm mb-2 self-start hover:text-blue-700 promo-toggle-link">Condiciones de la promoción</a>
        <div class="promo-details hidden text-gray-600 text-xs bg-blue-50 border border-blue-200 rounded p-3 mb-2">
          ${plan.promo || ""}
        </div>
          `;
        }

        return `<div class="hover-glow-card h-full border rounded-xl ${paddingClass} flex flex-col ${plan.popular
          ? "border-blue-500 border-2 relative bg-white"
          : "border-gray-200 bg-white"
          }">
        <h3 class="text-2xl font-bold text-gray-800">${plan.name}</h3>
        ${speedLine}
        <div class="my-2">
          <span class="text-4xl font-extrabold text-gray-900">${new Intl.NumberFormat(
            "es-AR"
          ).format(plan.price)}</span>
          <span class="text-gray-500"> $/mes</span>
        </div>
        <ul class="space-y-3 text-gray-600 mb-4 flex-grow">${featuresHtml}</ul>
        ${promoHtml}
        <a href="https://wa.me/5492494060345"
          target="_blank"
          rel="noopener"
          class="w-full text-center mt-auto bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 cta-button flex items-center justify-center gap-2">
          <i class="fab fa-whatsapp"></i> Consultar
        </a>
        ${plan.popular
            ? '<span class="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full absolute -top-3 right-4">MÁS ELEGIDO</span>'
            : ""
          }
        </div>`;
      }

      function displayPlans(type) {
        const premiumGigaContainer = document.getElementById("premium-giga-container"); // NUEVA LINEA

        if (internetBtn) internetBtn.classList.remove("active");
        if (internetTvBtn) internetTvBtn.classList.remove("active");
        if (tvOnlyBtn) tvOnlyBtn.classList.remove("active");

        if (type === "soloTv") {
          defaultPlansView.classList.add("hidden");
          soloTvView.classList.remove("hidden");
          if (premiumGigaContainer) premiumGigaContainer.classList.add("hidden"); // NUEVA LINEA

          soloTvCardContainer.innerHTML = createPlanCard(
            plansData.soloTv[0],
            "soloTv"
          );
          if (tvOnlyBtn) tvOnlyBtn.classList.add("active");
        } else {
          soloTvView.classList.add("hidden");
          defaultPlansView.classList.remove("hidden");

          planCardsContainer.innerHTML = "";
          if (plansData[type]) {
            plansData[type].forEach((plan) => {
              planCardsContainer.innerHTML += createPlanCard(plan, type);
            });
          }

          if (type === "internet") {
            if (internetBtn) internetBtn.classList.add("active");
            if (premiumPacksDefault) premiumPacksDefault.classList.add("hidden");
            if (premiumGigaContainer) premiumGigaContainer.classList.remove("hidden"); // NUEVA LINEA
          } else if (type === "internetTv") {
            if (internetTvBtn) internetTvBtn.classList.add("active");
            if (premiumPacksDefault) premiumPacksDefault.classList.remove("hidden");
            if (premiumGigaContainer) premiumGigaContainer.classList.add("hidden"); // NUEVA LINEA (No lo mostramos en combos por ahora)
          }
        }

        // NUEVO: Agrega los event listeners para los toggles de las promociones después de renderizar
        document.querySelectorAll(".promo-toggle-link").forEach((toggle) => {
          toggle.addEventListener("click", (e) => {
            e.preventDefault();
            document
              .querySelectorAll(".promo-details")
              .forEach((detailsContainer) => {
                detailsContainer.classList.toggle("hidden");
              });
          });
        });

        const buttonContainer = document.getElementById(
          "plan-info-button-container"
        );
        if (buttonContainer) {
          let btnHTML = "";
          if (type === "internet") {
            btnHTML = `<a href="${window.siteBase}pages/internet/" class="inline-block text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors">Más información sobre nuestra tecnología de Fibra <span aria-hidden=\"true\">→</span></a>`;
          } else if (type === "internetTv" || type === "soloTv") {
            btnHTML = `<a href="${window.siteBase}pages/tv/" class="inline-block text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors">Descubrí más sobre el servicio de TV <span aria-hidden=\"true\">→</span></a>`;
          }
          buttonContainer.innerHTML = btnHTML;
        }
      }

      if (internetBtn) internetBtn.addEventListener("click", () => {
        displayPlans("internet");
      });
      if (internetTvBtn) internetTvBtn.addEventListener("click", () => {
        displayPlans("internetTv");
      });
      if (tvOnlyBtn) tvOnlyBtn.addEventListener("click", () => {
        displayPlans("soloTv");
      });

      // Initial display
      displayPlans("internet");

      // FAQ Accordion Logic
      const faqContainer = document.getElementById("faq-accordion");
      if (faqContainer) {
        const questions = faqContainer.querySelectorAll(".faq-question");
        questions.forEach((question) => {
          question.addEventListener("click", () => {
            const answer = question.nextElementSibling;
            const isOpen = question.classList.contains("open");

            questions.forEach((q) => {
              if (q !== question) {
                q.classList.remove("open");
                q.nextElementSibling.style.maxHeight = null;
              }
            });

            if (isOpen) {
              question.classList.remove("open");
              answer.style.maxHeight = null;
            } else {
              question.classList.add("open");
              answer.style.maxHeight = answer.scrollHeight + "px";
            }
          });
        });
      }

      // Mesh Carousel Logic
      const meshSlides = document.querySelectorAll(".mesh-slide");
      const meshDotsContainer = document.getElementById(
        "mesh-dots-container"
      );
      let currentMeshSlide = 0;
      function createMeshDots() {
        if (!meshDotsContainer) return;
        meshDotsContainer.innerHTML = "";
        meshSlides.forEach((_, i) => {
          const dot = document.createElement("button");
          dot.classList.add("mesh-dot");
          if (i === 0) dot.classList.add("active");
          dot.addEventListener("click", () => showMeshSlide(i));
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
        meshDotsContainer.children[currentMeshSlide].classList.add("active");
      }
      if (meshSlides.length > 1) {
        createMeshDots();
      }

      // --- INICIO: LÓGICA DEL MAPA DE COBERTURA (MOVIDO A coverage-validator.js) ---
      // El código del mapa y validador de cobertura ahora está en js/coverage-validator.js
      // --- FIN: LÓGICA DEL MAPA DE COBERTURA ---
    });
  </script>
