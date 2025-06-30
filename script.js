      // --- INICIO: LÓGICA DEL MAPA DE COBERTURA (NUEVO Y ACTUALIZADO) ---
      const map = L.map('coverage-map').setView([-37.321, -59.135], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Coordenadas actualizadas para reflejar los nuevos límites
      const coverageAreaCoords = [
        [-37.30468, -59.1238],
        [-37.3069, -59.12637],
        [-37.30767, -59.12591],
        [-37.3128, -59.1394],
        [-37.33198, -59.12802],
        [-37.32687, -59.11452],
        [-37.31597, -59.12094],
        [-37.31185, -59.1145],
        [-37.31117, -59.11508],
        [-37.30675, -59.12081],
        [-37.30661, -59.12126],

      ];

      const polygon = L.polygon(coverageAreaCoords, {
        color: '#2563EB',      // Color del borde (azul oscuro)
        weight: 3,             // Grosor del borde
        fillColor: '#3B82F6',  // Color de relleno (azul)
        fillOpacity: 0.45      // Opacidad del relleno
      }).addTo(map);

      // El mapa se ajusta automáticamente para mostrar toda la zona de cobertura.
      map.fitBounds(polygon.getBounds());

      polygon.bindPopup("<b>¡Estás dentro de la zona de cobertura!</b>");
      // --- FIN: LÓGICA DEL MAPA DE COBERTURA ---
    ;


    const coverageButton = document.getElementById('coverage-button');
    const addressInput = document.getElementById('address-input');
    const coverageResultContainer = document.getElementById('coverage-result');

    if (coverageButton) {
      coverageButton.addEventListener('click', checkCoverage);
    }

    if (addressInput) {
      addressInput.addEventListener('keyup', function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          coverageButton.click();
        }
      });
    }


    function checkCoverage() {
      const address = addressInput.value.trim();
      addressInput.style.border = "1px solid #d1d5db"; // Reset border color
      coverageResultContainer.innerHTML = ''; // Limpiar resultados anteriores

      if (address === "") {
        addressInput.style.border = "1px solid red";
        displayMessage('Por favor, ingresá una dirección.', 'warning');
        coverageResultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const match = address.match(/^(.*?)\s+(\d+)/);

      if (!match) {
        displayMessage('Formato de dirección no válido. Asegurate de incluir calle y número (ej: San Martín 550).', 'error');
        coverageResultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const streetName = match[1];
      const streetNumber = parseInt(match[2], 10);

      const zonasDeCobertura = [
        { calle: "paz", desde: 1, hasta: 1599 },
        { calle: "general paz", desde: 1, hasta: 1599 },
        { calle: "gral paz", desde: 1, hasta: 1599 },
        { calle: "gral. paz", desde: 1, hasta: 1599 },
        { calle: "4 de abril", desde: 1, hasta: 1600 },
        { calle: "4 abril", desde: 1, hasta: 1600 },
        { calle: "cuatro de abril", desde: 1, hasta: 1600 },
        { calle: "santamarina", desde: 1, hasta: 900 },
        { calle: "av Santamarina", desde: 1, hasta: 900 },
        { calle: "av Santa marina", desde: 1, hasta: 900 },
        { calle: "av. Santamarina", desde: 1, hasta: 900 },
        { calle: "av. Santa marina", desde: 1, hasta: 900 },
        { calle: "avenida Santa marina", desde: 1, hasta: 900 },
        { calle: "avenida Santamarina", desde: 1, hasta: 900 },
        { calle: "alsina", desde: 1, hasta: 1600 },
        { calle: "alcina", desde: 1, hasta: 1600 },
        { calle: "gral roca", desde: 1, hasta: 1600 },
        { calle: "gral. roca", desde: 1, hasta: 1600 },
        { calle: "general roca", desde: 1, hasta: 1600 },
        { calle: "roca", desde: 1, hasta: 1600 },
        { calle: "11 de septiembre", desde: 1, hasta: 1600 },
        { calle: "11 de setiembre", desde: 1, hasta: 1600 },
        { calle: "once de setiembre", desde: 1, hasta: 1600 },
        { calle: "once de septiembre", desde: 1, hasta: 1600 },
        { calle: "montiel", desde: 1, hasta: 1600 },
        { calle: "moreno", desde: 1, hasta: 1600 },
        { calle: "saavedra", desde: 1, hasta: 1600 },
        { calle: "savedra", desde: 1, hasta: 1600 },
        { calle: "saaveedra", desde: 1, hasta: 1600 },
        { calle: "saaveedra", desde: 1, hasta: 1600 },
        { calle: "buzon", desde: 1, hasta: 1100 },
        { calle: "av buzon", desde: 1, hasta: 1100 },
        { calle: "av buzón", desde: 1, hasta: 1100 },
        { calle: "avenida buzon", desde: 1, hasta: 1100 },
        { calle: "avenida marconi", desde: 1000, hasta: 1800 },
        { calle: "av marconi", desde: 1000, hasta: 1800 },
        { calle: "marconi", desde: 1000, hasta: 1800 },
        { calle: "avenida españa", desde: 900, hasta: 1000 },
        { calle: "av españa", desde: 900, hasta: 1000 },
        { calle: "av. españa", desde: 900, hasta: 1000 },
        { calle: "españa", desde: 900, hasta: 1000 },
        { calle: "sarmiento", desde: 900, hasta: 1800 },
        { calle: "mitre", desde: 900, hasta: 1800 },
        { calle: "sanmartin", desde: 900, hasta: 1800 },
        { calle: "san martin", desde: 900, hasta: 1800 },
        { calle: "san martín", desde: 900, hasta: 1800 },
        { calle: "pinto", desde: 900, hasta: 1800 },
        { calle: "belgrano", desde: 900, hasta: 1800 },
        { calle: "gral. belgrano", desde: 900, hasta: 1800 },
        { calle: "gral belgrano", desde: 900, hasta: 1800 },
        { calle: "general belgrano", desde: 900, hasta: 1800 },
        { calle: "maipu", desde: 900, hasta: 1800 },
        { calle: "maipú", desde: 900, hasta: 1800 },
        { calle: "veinticinco de mayo", desde: 900, hasta: 1800 },
        { calle: "25demayo", desde: 900, hasta: 1800 },
        { calle: "25 de mayo", desde: 900, hasta: 1800 },
        { calle: "constitucion", desde: 900, hasta: 1800 },
        { calle: "constitución", desde: 900, hasta: 1800 },
        { calle: "avellaneda", desde: 900, hasta: 1800 },
        { calle: "avenida avellaneda", desde: 900, hasta: 1800 },
        { calle: "av avellaneda", desde: 900, hasta: 1800 },
        { calle: "av. avellaneda", desde: 900, hasta: 1800 },
        { calle: "1 de mayo", desde: 1000, hasta: 1499 },
        { calle: "uno de mayo", desde: 1000, hasta: 1499 },
        { calle: "primero de mayo", desde: 1000, hasta: 1499 },
        { calle: "1ero de mayo", desde: 1000, hasta: 1499 },
        { calle: "pasaje primero de mayo", desde: 1000, hasta: 1499 },
        { calle: "pasaje 1 de mayo", desde: 1000, hasta: 1499 },
        { calle: "pasaje uno de mayo", desde: 1000, hasta: 1499 },
        { calle: "pasaje 1ero de mayo", desde: 1000, hasta: 1499 },
        { calle: "psje 1ero de mayo", desde: 1000, hasta: 1499 },
        { calle: "pje 1ero de mayo", desde: 1000, hasta: 1499 },
        { calle: "pje. 1ero de mayo", desde: 1000, hasta: 1499 },
        { calle: "pasaje uno de mayo", desde: 1000, hasta: 1499 },
        { calle: "pje 1 de mayo", desde: 1000, hasta: 1499 },
        { calle: "psaje 1 de mayo", desde: 1000, hasta: 1499 },
        { calle: "pje uno de mayo", desde: 1000, hasta: 1499 },
        { calle: "psaje uno de mayo", desde: 1000, hasta: 1499 },
        { calle: "roser", desde: 1500, hasta: 1599 },
        { calle: "rosser", desde: 1500, hasta: 1599 },
        { calle: "cruz roja argentina", desde: 0, hasta: 1700 },
        { calle: "cruz roja", desde: 0, hasta: 1700 },
        { calle: "cruz roja arg.", desde: 0, hasta: 1700 },
        { calle: "cruz roja arg", desde: 0, hasta: 1700 },
        { calle: "pasaje cruz roja argentina", desde: 0, hasta: 1700 },
        { calle: "pje cruz roja argentina", desde: 0, hasta: 1700 },
        { calle: "pje. cruz roja argentina", desde: 0, hasta: 1700 },
        { calle: "cruz roja argentina casa", desde: 0, hasta: 1700 },
        { calle: "cruz roja casa", desde: 0, hasta: 1700 },
        { calle: "cruz roja arg. casa", desde: 0, hasta: 1700 },
        { calle: "cruz roja arg casa", desde: 0, hasta: 1700 },
        { calle: "pasaje cruz roja argentina casa", desde: 0, hasta: 1700 },
        { calle: "pje cruz roja argentina casa", desde: 0, hasta: 1700 },
        { calle: "pje. duggan martignoni casa", desde: 0, hasta: 1700 },
        { calle: "duggan martignoni", desde: 0, hasta: 1700 },
        { calle: "dugan martinoni", desde: 0, hasta: 1700 },
        { calle: "dugan martignoni", desde: 0, hasta: 1700 },
        { calle: "pje. duggan martignoni ", desde: 0, hasta: 1700 },
        { calle: "duggan martignoni casa", desde: 0, hasta: 1700 },
        { calle: "dugan martinoni casa", desde: 0, hasta: 1700 },
        { calle: "dugan martignoni casa", desde: 0, hasta: 1700 },
        { calle: "pasaje agote casa", desde: 0, hasta: 1700 },
        { calle: "pasaje agote", desde: 0, hasta: 1700 },
        { calle: "pje. agote casa", desde: 0, hasta: 1700 },
        { calle: "pje. agote", desde: 0, hasta: 1700 },
        { calle: "pasaje luis agote casa", desde: 0, hasta: 1700 },
        { calle: "pasaje luis agote", desde: 0, hasta: 1700 },
        { calle: "pje. luis agote casa", desde: 0, hasta: 1700 },
        { calle: "pje. luis agote", desde: 0, hasta: 1700 },
        { calle: "pje. r. gutierrez casa", desde: 0, hasta: 1700 },
        { calle: "r. gutierrez", desde: 0, hasta: 1700 },
        { calle: "r gutierrez", desde: 0, hasta: 1700 },
        { calle: "r. gutierrez casa", desde: 0, hasta: 1700 },
        { calle: "pje. r. gutierrez", desde: 0, hasta: 1700 },
        { calle: "r. gutierrez casa", desde: 0, hasta: 1700 },
        { calle: "r gutierrez casa", desde: 0, hasta: 1700 },
        { calle: "pje. r gutierrez casa", desde: 0, hasta: 1700 },
        { calle: "pje. mariano castex casa", desde: 0, hasta: 1700 },
        { calle: "pje. mariano castex ", desde: 0, hasta: 1700 },
        { calle: "mariano castex", desde: 0, hasta: 1700 },
        { calle: "mariano castex casa", desde: 0, hasta: 1700 },
        { calle: "pje mariano castex", desde: 0, hasta: 1700 },
        { calle: "pje mariano castex casa", desde: 0, hasta: 1700 },
        { calle: "pasaje mariano castex casa", desde: 0, hasta: 1700 },
        { calle: "pasaje mariano castex ", desde: 0, hasta: 1700 },
        { calle: "pje. baldomero moreno casa", desde: 0, hasta: 1700 },
        { calle: "pje. baldomero moreno", desde: 0, hasta: 1700 },
        { calle: "baldomero moreno", desde: 0, hasta: 1700 },
        { calle: "baldomero moreno casa", desde: 0, hasta: 1700 },
        { calle: "pje baldomero moreno", desde: 0, hasta: 1700 },
        { calle: "pje baldomero moreno casa", desde: 0, hasta: 1700 },
        { calle: "pasaje baldomero moreno casa", desde: 0, hasta: 1700 },
        { calle: "pasaje baldomero moreno ", desde: 0, hasta: 1700 },
        { calle: "pje. crucero gral belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pje. crucero gral belgrano", desde: 0, hasta: 1700 },
        { calle: "crucero gral belgrano", desde: 0, hasta: 1700 },
        { calle: "crucero gral belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pje crucero gral belgrano", desde: 0, hasta: 1700 },
        { calle: "pje crucero gral belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pasaje crucero gral belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pasaje crucero gral belgrano ", desde: 0, hasta: 1700 },
        { calle: "pje. crucero general belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pje. crucero general belgrano", desde: 0, hasta: 1700 },
        { calle: "crucero general belgrano", desde: 0, hasta: 1700 },
        { calle: "crucero general belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pje crucero general belgrano", desde: 0, hasta: 1700 },
        { calle: "pje crucero general belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pasaje crucero general belgrano casa", desde: 0, hasta: 1700 },
        { calle: "pasaje crucero general belgrano ", desde: 0, hasta: 1700 },
        { calle: "pje. combate de obligado casa", desde: 0, hasta: 1700 },
        { calle: "pje. combate de obligado", desde: 0, hasta: 1700 },
        { calle: "combate de obligado", desde: 0, hasta: 1700 },
        { calle: "combate de obligado casa", desde: 0, hasta: 1700 },
        { calle: "pje combate de obligado", desde: 0, hasta: 1700 },
        { calle: "pje combate de obligado casa", desde: 0, hasta: 1700 },
        { calle: "pasaje combate de obligado casa", desde: 0, hasta: 1700 },
        { calle: "pasaje combate de obligado", desde: 0, hasta: 1700 },
        { calle: "pje. combate de obligado casa", desde: 0, hasta: 1700 },
        { calle: "pje. Combatientes de malvinas", desde: 0, hasta: 1700 },
        { calle: " Combatientes de malvinas ", desde: 0, hasta: 1700 },
        { calle: " Combatientes de malvinas casa", desde: 0, hasta: 1700 },
        { calle: "pje Combatientes de malvinas ", desde: 0, hasta: 1700 },
        { calle: "pje Combatientes de malvinas casa", desde: 0, hasta: 1700 },
        { calle: "pasaje Combatientes de malvinas casa", desde: 0, hasta: 1700 },
        { calle: "pasaje Combatientes de malvinas ", desde: 0, hasta: 1700 },
        { calle: "pje. S. Austral", desde: 0, hasta: 1700 },
        { calle: " S. Austral ", desde: 0, hasta: 1700 },
        { calle: " S. Austral casa", desde: 0, hasta: 1700 },
        { calle: "pje Soberanía Austral ", desde: 0, hasta: 1700 },
        { calle: "pje Soberanía Austral casa", desde: 0, hasta: 1700 },
        { calle: "pasaje Soberanía Austral casa", desde: 0, hasta: 1700 },
        { calle: "pasaje Soberanía Austral ", desde: 0, hasta: 1700 },
        { calle: "pje. puerto argentino casa", desde: 0, hasta: 1700 },
        { calle: "pje. puerto argentino", desde: 0, hasta: 1700 },
        { calle: "puerto argentino", desde: 0, hasta: 1700 },
        { calle: "puerto argentino casa", desde: 0, hasta: 1700 },
        { calle: "pje puerto argentino", desde: 0, hasta: 1700 },
        { calle: "pje puerto argentino casa", desde: 0, hasta: 1700 },
        { calle: "pasaje puerto argentino casa", desde: 0, hasta: 1700 },
        { calle: "pasaje puerto argentino", desde: 0, hasta: 1700 },
        { calle: "pje. jose vernet casa", desde: 0, hasta: 1700 },
        { calle: "pje. jose vernet", desde: 0, hasta: 1700 },
        { calle: "jose vernet", desde: 0, hasta: 1700 },
        { calle: "jose vernet casa", desde: 0, hasta: 1700 },
        { calle: "pje jose vernet", desde: 0, hasta: 1700 },
        { calle: "pje jose vernet casa", desde: 0, hasta: 1700 },
        { calle: "pasaje jose vernet casa", desde: 0, hasta: 1700 },
        { calle: "pasaje jose vernet", desde: 0, hasta: 1700 },
        { calle: "pje. c. posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "pje. c. posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "c. posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "c. posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "pje c. posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "pje c. posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "pasaje c. posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "pasaje c. posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "pje. c. posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "pje. posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "posta de yatasto casa", desde: 0, hasta: 1700 },
        { calle: "posta de yatasto", desde: 0, hasta: 1700 },
        { calle: "av. machado", desde: 900, hasta: 1800 },
        { calle: "avenida machado", desde: 900, hasta: 1800 },
        { calle: "machado", desde: 900, hasta: 1800 },
        { calle: "arana", desde: 900, hasta: 1800 },
        { calle: "uriburu", desde: 900, hasta: 1800 },
        { calle: "pellegrini", desde: 900, hasta: 1800 },
        { calle: "montevideo", desde: 900, hasta: 1800 },
        { calle: "las heras", desde: 900, hasta: 1800 },
        { calle: "garibaldi", desde: 900, hasta: 1800 },
        { calle: "av balbin", desde: 900, hasta: 1700 },
        { calle: "balbin", desde: 900, hasta: 1700 },
        { calle: "avenida balbin", desde: 900, hasta: 1700 },
        { calle: "avenida colón", desde: 900, hasta: 1600 },
        { calle: "av colón", desde: 900, hasta: 1600 },
        { calle: "colón", desde: 900, hasta: 1600 },
        { calle: "avenida colon", desde: 900, hasta: 1600 },
        { calle: "av colon", desde: 900, hasta: 1600 },
        { calle: "colon", desde: 900, hasta: 1600 },
        { calle: "av espora", desde: 800, hasta: 1400 },
        { calle: "espora", desde: 800, hasta: 1400 },
        { calle: "avenida espora", desde: 800, hasta: 1400 },
        { calle: "guatemala", desde: 900, hasta: 1500 },
        { calle: "mejico", desde: 1000, hasta: 1400 },
        { calle: "mexico", desde: 1000, hasta: 1400 },
        { calle: "gomez", desde: 1200, hasta: 1400 },
        { calle: "colectora sur", desde: 1000, hasta: 1800 },
        { calle: "colectora sur j.c pugliese", desde: 1000, hasta: 1800 },
        { calle: "colectora j.c pugliese", desde: 1000, hasta: 1800 },
        { calle: "colectora pugliese", desde: 1000, hasta: 1800 },
        { calle: "pugliese", desde: 1000, hasta: 1800 },
        { calle: "piedrabuena", desde: 1000, hasta: 1800 },
        { calle: "piñero", desde: 1200, hasta: 1600 },
        { calle: "piñiero", desde: 1200, hasta: 1600 },
        { calle: "piñeiro", desde: 1200, hasta: 1600 },
        { calle: "primera junta", desde: 1000, hasta: 1800 },
        { calle: "franklin", desde: 1000, hasta: 1700 },
        { calle: "colombia", desde: 1000, hasta: 1400 },
        { calle: "newton", desde: 900, hasta: 1400 },
        { calle: "edison", desde: 900, hasta: 1200 },
        { calle: "cuba", desde: 900, hasta: 1400 },
        { calle: "haiti", desde: 900, hasta: 1400 },
        { calle: "jurado", desde: 1200, hasta: 1400 },
        { calle: "rauch", desde: 1000, hasta: 1400 },
        { calle: "peyrel", desde: 1200, hasta: 1400 },
        { calle: "honduras", desde: 1300, hasta: 1400 },
        { calle: "pioxii", desde: 1300, hasta: 1400 },
        { calle: "pioXII", desde: 1300, hasta: 1400 },
        { calle: "guemes", desde: 1200, hasta: 1400 },
        { calle: "güemes", desde: 1200, hasta: 1400 },
        { calle: "pasaje guernica", desde: 1600, hasta: 1800 },
        { calle: "pje guernica", desde: 1600, hasta: 1800 },
        { calle: "pje guernica", desde: 1600, hasta: 1800 },
        { calle: "pasaje orbe", desde: 0, hasta: 1800 },
        { calle: "pje orbe", desde: 0, hasta: 1800 },
        { calle: "orbe", desde: 0, hasta: 1800 },
        { calle: "pasaje c. disney", desde: 0, hasta: 1800 },
        { calle: "pje c. disney", desde: 0, hasta: 1800 },
        { calle: "c. disney", desde: 0, hasta: 1800 },
        { calle: "Pasaje interno barrio san francisco", desde: 1100, hasta: 1500 },
        { calle: "pje interno barrio san francisco", desde: 1100, hasta: 1500 },
        { calle: "Pasaje interno bo san francisco", desde: 1100, hasta: 1500 },
        { calle: "liniers", desde: 1000, hasta: 1700 },
        { calle: "pje castelli", desde: 1100, hasta: 1800 },
        { calle: "Pasaje castelli", desde: 1100, hasta: 1800 },
        { calle: "Castelli", desde: 1100, hasta: 1800 }
      ];

      const normalizedStreet = normalizeString(streetName);
      let isInCoverage = false;

      for (const zona of zonasDeCobertura) {
        const normalizedZonaCalle = normalizeString(zona.calle);
        if (normalizedStreet.includes(normalizedZonaCalle) && streetNumber >= zona.desde && streetNumber <= zona.hasta) {
          isInCoverage = true;
          break;
        }
      }

      if (isInCoverage) {
        const successMessage = `
            <h3 class="text-2xl font-bold text-green-600">¡Buenas Noticias! Estás en Zona Usittel</h3>
            <p class="mt-3 text-gray-600">
                Contactate por WhatsApp haciendo click aquí: 
                <a href="https://wa.me/5492494060345"
                   target="_blank" class="font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-2">
                    <i class="fab fa-whatsapp"></i> Chatear Ahora
                </a>
            </p>
            <p class="mt-2 text-gray-600">
                O si preferís, 
                <a href="#contact" class="font-bold text-blue-600 hover:text-blue-800">dejanos tu consulta</a> y te contactaremos.
            </p>`;
        displayMessage(successMessage, 'success');
      } else {
        const failureMessage = `
            <h3 class="text-2xl font-bold text-yellow-600">Aún no llegamos a tu domicilio</h3>
            <p class="mt-3 text-gray-600">
                Por el momento no contamos con cobertura en la dirección indicada. ¡Pero no te preocupes! Seguimos ampliando nuestra red.
            </p>
            <p class="mt-2 text-gray-600">
                Por favor, 
                <a href="#contact" class="font-bold text-blue-600 hover:text-blue-800">dejanos tus datos de contacto</a> para que podamos avisarte en cuanto lleguemos a tu zona.
            </p>`;
        displayMessage(failureMessage, 'warning');
      }

      coverageResultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function normalizeString(str) {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[.,]/g, '') // Quita puntos y comas
        .trim();
    }

    function displayMessage(message, type) {
      let iconHTML = '';
      let colorClasses = '';

      switch (type) {
        case 'success':
          iconHTML = '<i class="fas fa-check-circle fa-2x text-green-500 mb-3"></i>';
          colorClasses = 'bg-green-50 border-green-200';
          break;
        case 'warning':
          iconHTML = '<i class="fas fa-info-circle fa-2x text-yellow-500 mb-3"></i>';
          colorClasses = 'bg-yellow-50 border-yellow-200';
          break;
        case 'error':
          iconHTML = '<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i>';
          colorClasses = 'bg-red-50 border-red-200';
          break;
      }

      coverageResultContainer.innerHTML = `
        <div class="p-6 rounded-lg border ${colorClasses} transition-opacity duration-500 ease-in-out opacity-100">
            ${iconHTML}
            <div>${message}</div>
        </div>
    `;
    }