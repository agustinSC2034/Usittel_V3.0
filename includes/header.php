<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= $pageTitle ?? 'Usittel - Internet por Fibra Óptica en Tandil' ?></title>

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="<?= $base ?>assets/icons/usittel-logo.png">

  <!-- Tailwind CSS (build de producción) -->
  <link rel="stylesheet" href="<?= $base ?>assets/css/tailwind.output.css">

  <!-- Google Fonts: Poppins & Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@500;600;700&display=swap"
    rel="stylesheet" />

  <!-- Font Awesome for Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

  <!-- Three.js Library -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

  <!-- Leaflet CSS (NUEVO) -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />

  <!-- Leaflet JS (NUEVO) -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <!-- reCAPTCHA -->
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>

  <!-- Estilos propios -->
  <link rel="stylesheet" href="<?= $base ?>assets/css/main.css">

  <!-- Meta Tags -->
  <meta name="description"
    content="Internet por fibra óptica, WiFi Mesh y TV digital en Tandil. Planes para hogares y empresas. Atención personalizada y soporte local. Descubrí Usittel." />
  <!-- Open Graph -->
  <meta property="og:title" content="Usittel - Internet por Fibra Óptica en Tandil" />
  <meta property="og:description"
    content="Internet por fibra óptica, WiFi Mesh y TV digital en Tandil. Planes para hogares y empresas. Atención personalizada y soporte local." />
  <meta property="og:image" content="/assets/img/logos/usittel-logo_and_name.png" />
  <meta property="og:type" content="website" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Usittel - Internet por Fibra Óptica en Tandil" />
  <meta name="twitter:description"
    content="Internet por fibra óptica, WiFi Mesh y TV digital en Tandil. Planes para hogares y empresas. Atención personalizada y soporte local." />
  <meta name="twitter:image" content="/assets/img/logos/usittel-logo_and_name.png" />
</head>

<body class="text-gray-800">
  <!-- =========== Header / Navigation =========== -->
  <header class="navbar-section">
    <nav class="navbar">
      <div class="navbar-container">
        <div class="mobile-header-bar mobile-only">
          <div class="hamburger" id="hamburger">
            <span></span><span></span><span></span>
          </div>
          <a href="<?= $base ?>index.html" class="logo">
            <img src="<?= $base ?>assets/icons/usittel-logo.png" alt="Usittel Logo" />
          </a>
        </div>
        <div class="nav-left desktop-only">
          <a href="#" class="logo">
            <picture>
              <source srcset="<?= $base ?>assets/img/logos/usittel-logo_and_name.webp" type="image/webp"><img
                src="<?= $base ?>assets/img/logos/usittel-logo_and_name.png" alt="Usittel Logo" />
            </picture>
          </a>
          <ul class="nav-links">
            <li><a href="#" class="active">Home</a></li>
            <li class="dropdown">
              <a href="#plans">Productos ▾</a>
              <ul class="dropdown-menu">
                <li><a href="<?= $base ?>pages/internet/">Internet</a></li>
                <li><a href="<?= $base ?>pages/mesh/">WiFi Mesh</a></li>
                <li><a href="<?= $base ?>pages/tv/">TV</a></li>
              </ul>
            </li>
            <li><a href="<?= $base ?>pages/empresas/">Empresas</a></li>
            <li><a href="<?= $base ?>pages/contacto/">Contáctanos</a></li>
          </ul>
        </div>
        <div class="nav-actions desktop-only">
          <a href="<?= $base ?>pages/centro_de_ayuda/" class="nav-button-green">Centro de ayuda</a>
          <a href="https://phantom.usittel.com.ar/PHANTOM/Includes/CRM/CRM_APP/login.php" class="nav-button2"
            target="_blank" rel="noopener">Autogestión</a>
        </div>
      </div>
      <div class="overlay" id="overlay"></div>
      <div class="mobile-menu-slide" id="mobileMenu">
        <div class="mobile-menu-header">
          <img src="<?= $base ?>assets/img/logos/usittel-logo_and_name.png" alt="Usittel Logo" />
          <button class="close-menu" id="closeMenu">&times;</button>
        </div>
        <hr />
        <a href="#" class="active">Home</a>
        <div class="submenu-container">
          <button class="submenu-toggle" id="toggleProducts">
            Productos ▾
          </button>
          <div class="submenu" id="productsSubmenu">
            <a href="<?= $base ?>pages/internet/">Internet</a><a href="<?= $base ?>pages/mesh/">WiFi Mesh</a><a href="<?= $base ?>pages/tv/">TV</a>
          </div>
        </div>
        <a href="<?= $base ?>pages/empresas/">Empresas</a><a href="<?= $base ?>pages/contacto/">Contáctanos</a><a href="<?= $base ?>pages/centro_de_ayuda/"
          class="nav-button-green">Centro de ayuda</a><a
          href="https://phantom.usittel.com.ar/PHANTOM/Includes/CRM/CRM_APP/login.php" class="nav-button2"
          target="_blank" rel="noopener">Autogestión</a>
      </div>
    </nav>
  </header>

  <!-- Barra de Promociones -->
  <div
    class="promo-bar bg-gradient-to-r from-blue-600 via-blue-500 to-green-500 text-white py-2.5 text-center relative overflow-hidden">
    <div class="container mx-auto px-4 flex items-center justify-center gap-3 text-sm md:text-base">
      <i class="fas fa-gift animate-bounce hidden sm:inline"></i>
      <span class="font-semibold">NUEVO LANZAMIENTO:</span>
      <span class="font-medium">¡Llegaron los 1000 MEGAS a Tandil! Simétricos y con Wi-Fi 6.</span>
      <a href="#plans"
        class="ml-2 bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-100 transition-colors hidden md:inline-block">
        Ver planes
      </a>
    </div>
  </div>
