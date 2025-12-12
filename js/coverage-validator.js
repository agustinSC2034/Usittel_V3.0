/**
 * Validador de Cobertura USITTEL
 * Sistema de validación de cobertura con mapa interactivo y georreferenciación inteligente
 */

// Variables globales para el mapa
let map;
let searchMarker = null;

// Cache/estado para geocoding y validación
let activeGeocodeController = null;
const geocodeCache = new Map();

let rawCurrentCoverageZones = null;
let rawFutureCoverageZones = null;
let compiledCurrentCoverage = null;
let compiledFutureCoverage = null;

function parseStreetAndNumber(input) {
  if (!input) return null;
  const match = String(input).trim().match(/^\s*(.*?)\s+(\d+)\b/);
  if (!match) return null;
  const street = match[1].trim();
  const number = parseInt(match[2], 10);
  if (!street || Number.isNaN(number)) return null;
  return { street, number };
}

/**
 * Inicializa el mapa de cobertura
 */
function initializeCoverageMap() {
  // Verificar si el elemento del mapa existe
  const mapElement = document.getElementById("coverage-map");
  if (!mapElement) {
    console.log("Elemento coverage-map no encontrado");
    return;
  }

  // Evitar doble inicialización
  if (map) return;

  // Leaflet requerido
  if (typeof window.L === "undefined") {
    console.log("Leaflet (L) no está disponible");
    return;
  }

  // Inicializar mapa
  map = L.map("coverage-map").setView([-37.321, -59.135], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // ZONA ACTUAL (A) - Cobertura disponible
  const currentCoverageCoords = [
    [-37.30705, -59.12641],
    [-37.30645, -59.12603],
    [-37.3063, -59.12617],
    [-37.30456, -59.12388],
    [-37.30691, -59.12062],
    [-37.31248, -59.11372], //F
    [-37.32471, -59.09797], // G
    [-37.33022, -59.10464], // G2
    [-37.32946, -59.1057], // G3
    [-37.33202, -59.10898], // G4
    [-37.33285, -59.11091], // G5
    [-37.32703, -59.11453], // H
    [-37.3323, -59.12859], // I
    [-37.32188, -59.135],
    [-37.32228, -59.13636],
    [-37.31302, -59.14202],
    [-37.31163, -59.13815],
    [-37.31196, -59.13788],
    [-37.30854, -59.12915],
    [-37.30813, -59.12942],
  ];

  // Crear polígono de cobertura actual
  const currentPolygon = L.polygon(currentCoverageCoords, {
    color: "#2563EB", // Azul oscuro para el borde
    weight: 3,
    fillColor: "#3B82F6", // Azul para relleno
    fillOpacity: 0.5
  }).addTo(map);

  // Popup informativo para zona actual
  currentPolygon.bindPopup("<b>✅ Zona de Cobertura Actual</b><br>¡Tenemos servicio disponible!");

  // Ajustar vista del mapa al polígono actual
  map.fitBounds(currentPolygon.getBounds());

  console.log("Mapa de cobertura inicializado correctamente");
}

/**
 * Función para buscar y marcar dirección en el mapa con fallback inteligente
 */
async function searchAndMarkAddress(address) {
  if (!map) return false;

  const parsed = parseStreetAndNumber(address);
  if (!parsed) return false;

  const streetName = parsed.street;
  const originalNumber = parsed.number;

  // Cancelar búsqueda anterior si existe
  try {
    if (activeGeocodeController) activeGeocodeController.abort();
  } catch {
    // no-op
  }
  activeGeocodeController = new AbortController();
  const { signal } = activeGeocodeController;

  const buildUrl = (street, number) => {
    const fullAddress = `${street} ${number}, Tandil, Buenos Aires, Argentina`;
    return `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=5&countrycodes=ar&addressdetails=1`;
  };

  const selectPreciseMatch = (data) => {
    if (!data || data.length === 0) return null;
    return (
      data.find((result) => {
        const hasHouseNumber = result.address && result.address.house_number;
        const isSpecificAddress =
          result.type === "house" ||
          result.type === "building" ||
          result.type === "address" ||
          (result.address && result.address.house_number);
        const isInTandil =
          result.address &&
          (result.address.city === "Tandil" ||
            result.address.town === "Tandil" ||
            result.address.municipality === "Tandil");
        return hasHouseNumber && isSpecificAddress && isInTandil;
      }) || null
    );
  };

  const fetchGeocode = async (street, number) => {
    const url = buildUrl(street, number);
    const cacheKey = normalizeString(url);
    if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

    const response = await fetch(url, {
      signal,
      headers: {
        "Accept": "application/json",
        "Accept-Language": "es",
      },
    });
    const data = await response.json();
    const match = selectPreciseMatch(data);
    geocodeCache.set(cacheKey, match);
    return match;
  };

  try {
    // 1) Intentar dirección exacta
    const exact = await fetchGeocode(streetName, originalNumber);
    if (exact) {
      createMarkerAndView(exact, `${streetName} ${originalNumber}`, true);
      return true;
    }

    // 2) Fallback: probar números cercanos secuencialmente (evita rate-limit por paralelismo)
    console.log(`No se encontró ${streetName} ${originalNumber}, buscando números cercanos...`);
    const nearbyNumbers = [
      originalNumber + 1,
      originalNumber - 1,
      originalNumber + 2,
      originalNumber - 2,
      originalNumber + 3,
      originalNumber - 3,
      originalNumber + 5,
      originalNumber - 5,
      originalNumber + 10,
      originalNumber - 10,
    ].filter((n) => n > 0);

    for (const nearbyNumber of nearbyNumbers) {
      if (signal.aborted) return false;
      const candidate = await fetchGeocode(streetName, nearbyNumber);
      if (candidate) {
        console.log(`Dirección alternativa encontrada: ${streetName} ${nearbyNumber}`);
        createMarkerAndView(candidate, `${streetName} ${originalNumber}`, true);
        return true;
      }
    }

    resetMapToDefaultView();
    return false;
  } catch (error) {
    // Si fue abortado por una nueva búsqueda, no es un error real
    if (error && (error.name === "AbortError" || String(error).includes("AbortError"))) {
      return false;
    }
    console.log("Error al buscar la dirección en el mapa:", error);
    resetMapToDefaultView();
    return false;
  }
}

/**
 * Función auxiliar para crear marcador y centrar vista
 */
function createMarkerAndView(result, originalAddress, success) {
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  
  // Crear nuevo marcador (el anterior ya fue removido en checkCoverage)
  searchMarker = L.marker([lat, lon], {
    icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }).addTo(map);
  
  // Agregar popup al marcador con la dirección original
  searchMarker.bindPopup(`<b>📍 ${originalAddress}</b><br>Tandil, Buenos Aires`).openPopup();
  
  // Centrar el mapa en la dirección encontrada
  map.setView([lat, lon], 16);
  
  console.log(`Dirección marcada en el mapa: ${originalAddress}`);
  return success;
}

/**
 * Función para resetear el mapa a la vista por defecto
 */
function resetMapToDefaultView() {
  if (map) {
    // Buscar todos los polígonos para crear el grupo
    const allPolygons = [];
    map.eachLayer(layer => {
      if (layer instanceof L.Polygon) {
        allPolygons.push(layer);
      }
    });
    
    if (allPolygons.length > 0) {
      const allZones = L.featureGroup(allPolygons);
      map.fitBounds(allZones.getBounds());
    } else {
      // Fallback a coordenadas fijas de Tandil
      map.setView([-37.321, -59.135], 13);
    }
  }
}

/**
 * Inicializa el validador de cobertura
 */
function initializeCoverageValidator() {
  const coverageButton = document.getElementById("coverage-button");
  const addressInput = document.getElementById("address-input");
  const coverageResultContainer = document.getElementById("coverage-result");

  if (!coverageButton || !addressInput || !coverageResultContainer) {
    console.log("Elementos del validador de cobertura no encontrados");
    return;
  }

  // Event listeners
  coverageButton.addEventListener("click", checkCoverage);

  addressInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      coverageButton.click();
    }
  });

  console.log("Validador de cobertura inicializado correctamente");
}

/**
 * Función principal para verificar cobertura
 */
async function checkCoverage() {
  const coverageButton = document.getElementById("coverage-button");
  const addressInput = document.getElementById("address-input");
  const coverageResultContainer = document.getElementById("coverage-result");

  // Animación del botón siempre que se presione
  coverageButton.classList.remove('button-animate');
  void coverageButton.offsetWidth; // Forzar reflow para reiniciar animación
  coverageButton.classList.add('button-animate');

  // Cambiar texto del botón temporalmente
  const originalText = coverageButton.innerHTML;
  coverageButton.innerHTML = '<span class="loading-spinner"></span> Consultando...';
  coverageButton.disabled = true;

  try {
    const address = addressInput.value.trim();
    addressInput.style.border = "1px solid #d1d5db";
    coverageResultContainer.innerHTML = "";

    // Limpiar marcador anterior del mapa antes de cada nueva búsqueda
    if (searchMarker && map) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }

    addressInput.classList.remove("input-shake");
    coverageResultContainer.classList.remove("result-animate");

    if (!address) {
      addressInput.style.border = "1px solid red";
      addressInput.classList.add("input-shake");
      displayMessage("Por favor, ingresá una dirección.", "warning");
      return;
    }

    const parsed = parseStreetAndNumber(address);
    if (!parsed) {
      addressInput.classList.add("input-shake");
      displayMessage(
        "Formato de dirección no válido. Asegurate de incluir calle y número (ej: Nigro 575).",
        "error"
      );
      return;
    }

    const fullAddress = `${parsed.street} ${parsed.number}`;
    await searchAndMarkAddress(fullAddress);
    processAddressValidation(parsed.street, parsed.number);

    coverageResultContainer.classList.add("result-animate");
  } catch (error) {
    console.log("Error en la validación de cobertura:", error);
    displayMessage(
      "Ocurrió un error al validar la dirección. Probá nuevamente en unos segundos.",
      "error"
    );
  } finally {
    coverageButton.innerHTML = originalText;
    coverageButton.disabled = false;
  }
}

function loadCoverageDatasetsIfNeeded() {
  if (rawCurrentCoverageZones && rawFutureCoverageZones) return;

  // Base de datos de zonas de cobertura
  rawCurrentCoverageZones = rawCurrentCoverageZones || [
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
    { calle: "avenida españa", desde: 800, hasta: 1000 },
    { calle: "av españa", desde: 800, hasta: 1000 },
    { calle: "av. españa", desde: 800, hasta: 1000 },
    { calle: "españa", desde: 800, hasta: 1000 },
    { calle: "sarmiento", desde: 850, hasta: 1800 },
    { calle: "mitre", desde: 850, hasta: 1800 },
    { calle: "sanmartin", desde: 850, hasta: 1800 },
    { calle: "san martin", desde: 850, hasta: 1800 },
    { calle: "san martín", desde: 850, hasta: 1800 },
    { calle: "pinto", desde: 850, hasta: 1800 },
    { calle: "belgrano", desde: 850, hasta: 1800 },
    { calle: "gral. belgrano", desde: 850, hasta: 1800 },
    { calle: "gral belgrano", desde: 850, hasta: 1800 },
    { calle: "general belgrano", desde: 850, hasta: 1800 },
    { calle: "maipu", desde: 850, hasta: 1800 },
    { calle: "maipú", desde: 850, hasta: 1800 },
    { calle: "veinticinco de mayo", desde: 850, hasta: 1800 },
    { calle: "25demayo", desde: 850, hasta: 1800 },
    { calle: "25 de mayo", desde: 850, hasta: 1800 },
    { calle: "constitucion", desde: 850, hasta: 1800 },
    { calle: "constitución", desde: 850, hasta: 1800 },
    { calle: "avellaneda", desde: 850, hasta: 1800 },
    { calle: "avenida avellaneda", desde: 850, hasta: 1800 },
    { calle: "av avellaneda", desde: 850, hasta: 1800 },
    { calle: "av. avellaneda", desde: 850, hasta: 1800 },
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
    { calle: "av. machado", desde: 800, hasta: 1800 },
    { calle: "avenida machado", desde: 800, hasta: 1800 },
    { calle: "machado", desde: 800, hasta: 1800 },
    { calle: "arana", desde: 800, hasta: 1800 },
    { calle: "uriburu", desde: 800, hasta: 1800 },
    { calle: "pellegrini", desde: 800, hasta: 1800 },
    { calle: "montevideo", desde: 800, hasta: 1800 },
    { calle: "las heras", desde: 800, hasta: 1800 },
    { calle: "garibaldi", desde: 800, hasta: 1800 },
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
    { calle: "colectora sur", desde: 200, hasta: 1800 },
    { calle: "colectora sur j.c pugliese", desde: 200, hasta: 1800 },
    { calle: "colectora j.c pugliese", desde: 200, hasta: 1800 },
    { calle: "colectora pugliese", desde: 200, hasta: 1800 },
    { calle: "pugliese", desde: 1000, hasta: 1800 },
    { calle: "piedrabuena", desde: 200, hasta: 1800 },
    { calle: "piñero", desde: 1200, hasta: 1600 },
    { calle: "piñiero", desde: 1200, hasta: 1600 },
    { calle: "piñeiro", desde: 1200, hasta: 1600 },
    { calle: "primera junta", desde: 200, hasta: 1800 },
    { calle: "franklin", desde: 200, hasta: 1700 },
    { calle: "colombia", desde: 200, hasta: 1600 },
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
    { calle: "liniers", desde: 200, hasta: 1700 },
    { calle: "pje castelli", desde: 1100, hasta: 1800 },
    { calle: "Pasaje castelli", desde: 1100, hasta: 1800 },
    { calle: "Castelli", desde: 1100, hasta: 1800 },
    
    // ZONA DE COBERTURA B
    { calle: "antartida argentina", desde: 800, hasta: 1100 },
    { calle: "antartica argentina", desde: 800, hasta: 1100 },
    { calle: "antártida argentina", desde: 800, hasta: 1100 },
    { calle: "las malvinas argentinas", desde: 800, hasta: 1400 },
    { calle: "malvinas argentinas", desde: 800, hasta: 1400 },
    { calle: "tierra del fuego", desde: 800, hasta: 1400 },
    { calle: "tierra de fuego", desde: 800, hasta: 1400 },
    { calle: "italia", desde: 700, hasta: 1400 },
    { calle: "portugal", desde: 700, hasta: 1400 },
    { calle: "caseros", desde: 700, hasta: 1400 },
    { calle: "canada", desde: 600, hasta: 1400 },
    { calle: "canadá", desde: 600, hasta: 1400 },
    { calle: "rosalia de castro", desde: 600, hasta: 1400 },
    { calle: "rosalía de castro", desde: 600, hasta: 1400 },
    { calle: "av falucho", desde: 500, hasta: 1400 },
    { calle: "av. falucho", desde: 500, hasta: 1400 },
    { calle: "avenida falucho", desde: 500, hasta: 1400 },
    { calle: "falucho", desde: 500, hasta: 1400 },
    { calle: "venezuela", desde: 200, hasta: 1100 },
    { calle: "mayor m novia", desde: 600, hasta: 850 },
    { calle: "mayor novia", desde: 600, hasta: 850 },
    { calle: "costa rica", desde: 200, hasta: 600 },
    { calle: "panama", desde: 200, hasta: 600 },
    { calle: "panamá", desde: 200, hasta: 600 },
    { calle: "nicaragua", desde: 200, hasta: 300 },
    { calle: "pasaje dr salceda", desde: 600, hasta: 800 },
    { calle: "pje dr salceda", desde: 600, hasta: 800 },
    { calle: "pje. dr salceda", desde: 600, hasta: 800 },
    { calle: "pasaje doctor salceda", desde: 600, hasta: 800 },
    { calle: "pje doctor salceda", desde: 600, hasta: 800 },
    { calle: "dr salceda", desde: 600, hasta: 800 },
    { calle: "doctor salceda", desde: 600, hasta: 800 },
    { calle: "pasaje alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "pje alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "pje. alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "pasaje 1", desde: 0, hasta: 1800 },
    { calle: "pje 1", desde: 0, hasta: 1800 },
    { calle: "pje. 1", desde: 0, hasta: 1800 },
    { calle: "pasaje 2", desde: 0, hasta: 1800 },
    { calle: "pje 2", desde: 0, hasta: 1800 },
    { calle: "pje. 2", desde: 0, hasta: 1800 },
    { calle: "pasaje ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "pje ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "pje. ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "pasaje jauretche", desde: 0, hasta: 1800 },
    { calle: "pje jauretche", desde: 0, hasta: 1800 },
    { calle: "pje. jauretche", desde: 0, hasta: 1800 },
    { calle: "jauretche", desde: 0, hasta: 1800 },
    { calle: "pasaje pontaut", desde: 0, hasta: 1800 },
    { calle: "pje pontaut", desde: 0, hasta: 1800 },
    { calle: "pje. pontaut", desde: 0, hasta: 1800 },
    { calle: "pontaut", desde: 0, hasta: 1800 },
    { calle: "colectora sur j c pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur j.c pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur j.c. pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur jc pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur pugliese", desde: 0, hasta: 400 },
        { calle: "colectora pugliese", desde: 0, hasta: 400 },
        { calle: "pugliese", desde: 0, hasta: 400 },
        { calle: "piedrabuena", desde: 0, hasta: 200 },
        { calle: "primera junta", desde: 0, hasta: 200 },
        { calle: "franklin", desde: 0, hasta: 200 },
        { calle: "liniers", desde: 0, hasta: 200 },
        { calle: "pasaje fort", desde: 0, hasta: 100 },
        { calle: "pje fort", desde: 0, hasta: 100 },
        { calle: "pje. fort", desde: 0, hasta: 100 },
        { calle: "fort", desde: 0, hasta: 100 },
        { calle: "colombia", desde: 0, hasta: 200 },
        { calle: "venezuela", desde: 0, hasta: 200 },
        { calle: "costa rica", desde: 0, hasta: 200 },
        { calle: "panama", desde: 0, hasta: 200 },
        { calle: "panamá", desde: 0, hasta: 200 },
        { calle: "nicaragua", desde: 0, hasta: 200 },
        { calle: "av brasil", desde: 0, hasta: 500 },
        { calle: "av. brasil", desde: 0, hasta: 500 },
        { calle: "avenida brasil", desde: 0, hasta: 500 },
        { calle: "brasil", desde: 0, hasta: 500 },
        { calle: "massini", desde: 200, hasta: 400 },
        { calle: "carlos linstow", desde: 0, hasta: 400 },
        { calle: "linstow", desde: 0, hasta: 400 },
        { calle: "galileo", desde: 0, hasta: 100 },
        { calle: "c la pesqueria", desde: 0, hasta: 2000 },
        { calle: "la pesqueria", desde: 0, hasta: 2000 },
        { calle: "pesqueria", desde: 0, hasta: 2000 },
        { calle: "tandileofu", desde: 0, hasta: 300 },
        { calle: "quequén", desde: 0, hasta: 300 },
        { calle: "quequen", desde: 0, hasta: 300 },
        { calle: "las chilcas", desde: 100, hasta: 300 },
        { calle: "chilcas", desde: 100, hasta: 300 },
        { calle: "barrientos", desde: 0, hasta: 2000 },
        { calle: "baarrientos", desde: 0, hasta: 2000 },
        { calle: "pasaje jose barrientos", desde: 0, hasta: 2000 },
        { calle: "pje jose barrientos", desde: 0, hasta: 2000 },
        { calle: "pje. jose barrientos", desde: 0, hasta: 2000 },
        { calle: "jose barrientos", desde: 0, hasta: 2000 },
        { calle: "rivas", desde: 500, hasta: 1400 },
        { calle: "pozos", desde: 500, hasta: 1400 },
        { calle: "renis", desde: 1100, hasta: 1200 },
        { calle: "tilcara", desde: 0, hasta: 2000 },
        { calle: "fulton", desde: 0, hasta: 2000 },
        { calle: "holmberg", desde: 400, hasta: 1400 },
        { calle: "avenida fidanza", desde: 400, hasta: 1400 },
        { calle: "av fidanza", desde: 400, hasta: 1400 },
        { calle: "av. fidanza", desde: 400, hasta: 1400 },
        { calle: "fidanza", desde: 400, hasta: 1400 },
        { calle: "hudson", desde: 0, hasta: 2000 },
        { calle: "grothe", desde: 1100, hasta: 1400 },
  ];

  // NUEVAS ZONAS DE COBERTURA - ZONA C Y D
  rawFutureCoverageZones = rawFutureCoverageZones || [
    // ZONA C
        
        
        // ZONA D
        { calle: "hermano crisostomo", desde: 0, hasta: 2000 },
        { calle: "crisostomo", desde: 0, hasta: 2000 },
        { calle: "carriego", desde: 0, hasta: 600 },
        { calle: "tacuari", desde: 0, hasta: 700 },
        { calle: "jose hernandez", desde: 0, hasta: 400 },
        { calle: "josé hernandez", desde: 0, hasta: 400 },
        { calle: "hernandez", desde: 0, hasta: 400 },
        { calle: "santos vega", desde: 0, hasta: 300 },
        { calle: "martin fierro", desde: 0, hasta: 200 },
        { calle: "martín fierro", desde: 0, hasta: 200 },
        { calle: "jose marti", desde: 0, hasta: 100 },
        { calle: "josé marti", desde: 0, hasta: 100 },
        { calle: "josé martí", desde: 0, hasta: 100 },
        { calle: "jose martí", desde: 0, hasta: 100 },
        { calle: "marti", desde: 0, hasta: 100 },
        { calle: "martí", desde: 0, hasta: 100 },
        { calle: "cerrito", desde: 0, hasta: 300 },
        { calle: "ruben diario", desde: 0, hasta: 300 },
        { calle: "rubén diario", desde: 0, hasta: 300 },
        { calle: "ruben dario", desde: 0, hasta: 800 },
        { calle: "rubén dario", desde: 0, hasta: 800 },
        { calle: "rubén darío", desde: 0, hasta: 800 },
        { calle: "ruben darío", desde: 0, hasta: 800 },
        { calle: "avenida simon bolivar", desde: 0, hasta: 800 },
        { calle: "av simon bolivar", desde: 0, hasta: 800 },
        { calle: "av. simon bolivar", desde: 0, hasta: 800 },
        { calle: "avenida simón bolivar", desde: 0, hasta: 800 },
        { calle: "av simón bolivar", desde: 0, hasta: 800 },
        { calle: "av. simón bolivar", desde: 0, hasta: 800 },
        { calle: "simon bolivar", desde: 0, hasta: 800 },
        { calle: "simón bolivar", desde: 0, hasta: 800 },
        { calle: "bolivar", desde: 0, hasta: 800 },
        { calle: "bolívar", desde: 0, hasta: 800 },
        { calle: "los lapachos", desde: 0, hasta: 2000 },
        { calle: "lapachos", desde: 0, hasta: 2000 },
        { calle: "sargento primero luis a barrufaldi", desde: 0, hasta: 2000 },
        { calle: "sargento primero luis barrufaldi", desde: 0, hasta: 2000 },
        { calle: "sargento luis a barrufaldi", desde: 0, hasta: 2000 },
        { calle: "sargento luis barrufaldi", desde: 0, hasta: 2000 },
        { calle: "luis a barrufaldi", desde: 0, hasta: 2000 },
        { calle: "luis barrufaldi", desde: 0, hasta: 2000 },
        { calle: "barrufaldi", desde: 0, hasta: 2000 },
        { calle: "guido dinelli", desde: 0, hasta: 2000 },
        { calle: "dinelli", desde: 0, hasta: 2000 },
        { calle: "carola lorenzini", desde: 200, hasta: 400 },
        { calle: "lorenzini", desde: 200, hasta: 400 },
        { calle: "eduardo olivero", desde: 0, hasta: 2000 },
        { calle: "olivero", desde: 0, hasta: 2000 },
        { calle: "c. fels", desde: 0, hasta: 2000 },
        { calle: "c fels", desde: 0, hasta: 2000 },
        { calle: "fels", desde: 0, hasta: 2000 },
        { calle: "pedro hansen", desde: 300, hasta: 400 },
        { calle: "hansen", desde: 300, hasta: 400 },
        { calle: "martin fierro", desde: 400, hasta: 800 },
        { calle: "martín fierro", desde: 400, hasta: 800 },
        { calle: "f de la cruz", desde: 1000, hasta: 1200 },
        { calle: "f. de la cruz", desde: 1000, hasta: 1200 },
        { calle: "de la cruz", desde: 1000, hasta: 1200 },
        { calle: "c santos vega", desde: 0, hasta: 2000 },
        { calle: "c. santos vega", desde: 0, hasta: 2000 },
        { calle: "av fleming", desde: 0, hasta: 2000 },
        { calle: "av. fleming", desde: 0, hasta: 2000 },
        { calle: "avenida fleming", desde: 0, hasta: 2000 },
        { calle: "fleming", desde: 0, hasta: 2000 },
        { calle: "roser", desde: 1100, hasta: 1800 },
        { calle: "rosser", desde: 1100, hasta: 1800 },
        { calle: "pasaje uruguay", desde: 0, hasta: 2000 },
        { calle: "pje uruguay", desde: 0, hasta: 2000 },
        { calle: "pje. uruguay", desde: 0, hasta: 2000 },
        { calle: "uruguay", desde: 0, hasta: 2000 },
        { calle: "carlos gardel", desde: 1000, hasta: 1800 },
        { calle: "gardel", desde: 1000, hasta: 1800 },
        { calle: "av s serrano", desde: 1400, hasta: 1800 },
        { calle: "av. s serrano", desde: 1400, hasta: 1800 },
        { calle: "av s. serrano", desde: 1400, hasta: 1800 },
        { calle: "av. s. serrano", desde: 1400, hasta: 1800 },
        { calle: "avenida s serrano", desde: 1400, hasta: 1800 },
        { calle: "avenida s. serrano", desde: 1400, hasta: 1800 },
        { calle: "serrano", desde: 1400, hasta: 1800 },
        { calle: "s serrano", desde: 1400, hasta: 1800 },
        { calle: "s. serrano", desde: 1400, hasta: 1800 },
        { calle: "fugl", desde: 1000, hasta: 1800 },
        { calle: "loberia", desde: 1100, hasta: 1500 },
        { calle: "lobería", desde: 1100, hasta: 1500 },
        { calle: "larrea", desde: 1000, hasta: 1600 },
        { calle: "avenida lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av. lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "avenida lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av. lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "general de la cruz", desde: 0, hasta: 2000 },
        { calle: "gral de la cruz", desde: 0, hasta: 2000 },
        { calle: "gral. de la cruz", desde: 0, hasta: 2000 },
        { calle: "de la cruz", desde: 0, hasta: 2000 },
  ];
}

function ensureCoverageCompiled() {
  loadCoverageDatasetsIfNeeded();
  if (!compiledCurrentCoverage) {
    compiledCurrentCoverage = compileCoverageZones(rawCurrentCoverageZones);
  }
  if (!compiledFutureCoverage) {
    compiledFutureCoverage = compileCoverageZones(rawFutureCoverageZones);
  }
}

/**
 * Procesa la validación de la dirección contra la base de datos de cobertura
 */
function processAddressValidation(streetName, streetNumber) {
  ensureCoverageCompiled();

  const normalizedStreet = normalizeString(streetName);
  const isInCoverage = isInCompiledCoverage(
    compiledCurrentCoverage,
    normalizedStreet,
    streetNumber
  );
  const isInNewCoverage = !isInCoverage
    ? isInCompiledCoverage(compiledFutureCoverage, normalizedStreet, streetNumber)
    : false;

  // Mostrar resultados
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
    displayMessage(successMessage, "success");
  } else if (isInNewCoverage) {
    const newCoverageMessage = `
        <h3 class="text-2xl font-bold text-blue-600">¡Tu hogar estará proximamente en nuestra zona de cobertura!</h3>
        <p class="mt-3 text-gray-600">
            Escribinos a nuestro WhatsApp haciendo click aquí: 
            <a href="https://wa.me/5492494060345"
               target="_blank" class="font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-2">
                <i class="fab fa-whatsapp"></i> Chatear Ahora
            </a>
        </p>
        <p class="mt-2 text-gray-600">
            O escribinos a nuestro mail 
            <a href="mailto:contacto@usittel.com.ar" class="font-bold text-blue-600 hover:text-blue-800">contacto@usittel.com.ar</a>
            para dejarnos tus datos y te contactaremos apenas lleguemos a tu zona.
        </p>`;
    displayMessage(newCoverageMessage, "info");
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
    displayMessage(failureMessage, "warning");
  }

  // (el botón/animación se manejan en checkCoverage)
}

function warmCoverageCompilation() {
  // Solo precalentar si el validador está presente en la página
  const hasValidator =
    document.getElementById("coverage-button") &&
    document.getElementById("address-input") &&
    document.getElementById("coverage-result");
  if (!hasValidator) return;

  const warm = () => {
    try {
      ensureCoverageCompiled();
    } catch (error) {
      console.log("No se pudo precalentar la compilación de cobertura:", error);
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(warm, { timeout: 1200 });
  } else {
    // Fallback compatible
    setTimeout(warm, 0);
  }
}

/**
 * Normaliza strings para comparación (sin acentos, minúsculas, sin puntuación)
 */
function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, "") // Quita puntos y comas
    .trim();
}

function tokenizeNormalized(str) {
  if (!str) return [];
  return String(str)
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function mergeRanges(ranges) {
  if (!ranges || ranges.length === 0) return [];
  const sorted = ranges
    .slice()
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    const last = merged[merged.length - 1];
    if (start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

function compileCoverageZones(zones) {
  const rangesByCalle = new Map();

  for (const zone of zones || []) {
    const normalizedCalle = normalizeString(zone.calle);
    if (!normalizedCalle) continue;
    const desde = Number(zone.desde);
    const hasta = Number(zone.hasta);
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) continue;

    const key = normalizedCalle;
    const list = rangesByCalle.get(key) || [];
    list.push([desde, hasta]);
    rangesByCalle.set(key, list);
  }

  const entries = [];
  for (const [calle, ranges] of rangesByCalle.entries()) {
    entries.push({
      calle,
      ranges: mergeRanges(ranges),
      tokens: tokenizeNormalized(calle),
    });
  }

  // Index por tokens para reducir comparaciones
  const tokenIndex = new Map();
  entries.forEach((entry, idx) => {
    for (const token of entry.tokens) {
      const arr = tokenIndex.get(token) || [];
      arr.push(idx);
      tokenIndex.set(token, arr);
    }
  });

  return { entries, tokenIndex };
}

function numberInRanges(number, ranges) {
  for (const [desde, hasta] of ranges) {
    if (number >= desde && number <= hasta) return true;
  }
  return false;
}

function isInCompiledCoverage(compiled, normalizedStreet, streetNumber) {
  if (!compiled || !compiled.entries) return false;
  const entries = compiled.entries;
  if (!entries.length) return false;

  const tokens = tokenizeNormalized(normalizedStreet);
  const candidates = new Set();
  for (const token of tokens) {
    const list = compiled.tokenIndex.get(token);
    if (!list) continue;
    for (const idx of list) candidates.add(idx);
  }

  // Si no hay candidatos (casos raros/typos), hacemos fallback al escaneo completo
  const indices = candidates.size ? Array.from(candidates) : null;

  if (indices) {
    for (const idx of indices) {
      const entry = entries[idx];
      if (normalizedStreet.includes(entry.calle) && numberInRanges(streetNumber, entry.ranges)) {
        return true;
      }
    }
    return false;
  }

  for (const entry of entries) {
    if (normalizedStreet.includes(entry.calle) && numberInRanges(streetNumber, entry.ranges)) {
      return true;
    }
  }
  return false;
}

/**
 * Muestra mensajes de resultado con iconos y estilos
 */
function displayMessage(message, type) {
  const coverageResultContainer = document.getElementById("coverage-result");
  
  let iconHTML = "";
  let colorClasses = "";

  switch (type) {
    case "success":
      iconHTML = '<i class="fas fa-check-circle fa-2x text-green-500 mb-3"></i>';
      colorClasses = "bg-green-50 border-green-200";
      break;
    case "info":
      iconHTML = '<i class="fas fa-info-circle fa-2x text-blue-500 mb-3"></i>';
      colorClasses = "bg-blue-50 border-blue-200";
      break;
    case "warning":
      iconHTML = '<i class="fas fa-info-circle fa-2x text-yellow-500 mb-3"></i>';
      colorClasses = "bg-yellow-50 border-yellow-200";
      break;
    case "error":
      iconHTML = '<i class="fas fa-exclamation-triangle fa-2x text-red-500 mb-3"></i>';
      colorClasses = "bg-red-50 border-red-200";
      break;
  }

  coverageResultContainer.innerHTML = `
    <div class="p-6 rounded-lg border ${colorClasses} transition-opacity duration-500 ease-in-out opacity-100">
        ${iconHTML}
        <div>${message}</div>
    </div>
  `;
}

/**
 * Inicialización automática cuando el DOM está listo
 */
document.addEventListener("DOMContentLoaded", function() {
  // Inicializar mapa de cobertura
  initializeCoverageMap();
  
  // Inicializar validador de cobertura
  initializeCoverageValidator();

  // Precalentar compilación de cobertura para mejorar la primera consulta
  warmCoverageCompilation();
  
  console.log("Sistema de validación de cobertura USITTEL cargado correctamente");
});
