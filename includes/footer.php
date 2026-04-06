
  <footer class="bg-gray-800 text-white pt-16 pb-8">
    <div class="container mx-auto px-6 max-w-7xl">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <!-- Columna de Contacto y Horarios -->
        <div class="space-y-4">
          <h4 class="font-bold uppercase tracking-wider">
            Contacto y Horarios
          </h4>
          <div class="space-y-3 text-gray-300">
            <p class="flex items-start gap-3">
              <i class="fas fa-map-marker-alt mt-1 text-blue-400"></i>
              <span>Nigro 575, Tandil</span>
            </p>

            <!-- Números oficiales de WhatsApp -->
            <div class="bg-gray-700 p-3 rounded-lg space-y-2">
              <p class="text-xs font-semibold text-gray-200 uppercase tracking-wide flex items-center">
                <img src="<?= $base ?>assets/icons/usittel-logo.png" alt="Usittel" class="w-4 h-4 mr-1.5"> Números Oficiales
              </p>
              <div class="space-y-2">
                <div>
                  <p class="flex items-center gap-2 text-sm">
                    <i class="fab fa-whatsapp text-green-400"></i>
                    <span class="font-medium">+54 9 249 406-0345</span>
                  </p>
                  <p class="pl-6 text-xs text-gray-400">Autogestión y atención</p>
                  <p class="pl-6 text-xs text-gray-400">L-V 8-20hs. <br> Sáb, Dom y feriados 10-16hs.</p>
                </div>
                <div>
                  <p class="flex items-center gap-2 text-sm">
                    <i class="fab fa-whatsapp text-green-400"></i>
                    <span class="font-medium">+54 9 249 450-4522</span>
                  </p>
                  <p class="pl-6 text-xs text-gray-400">Ventas y avisos</p>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <p class="flex items-center gap-3">
                <i class="fas fa-phone text-blue-400"></i>
                <span>0800-199-4545</span>
              </p>
              <p class="pl-6 text-xs text-gray-400">L-V de 8 a 16hs.</p>
            </div>
          </div>
        </div>

        <!-- Columna de Servicios -->
        <div>
          <h4 class="font-bold uppercase tracking-wider">Servicios</h4>
          <ul class="mt-4 space-y-2">
            <li>
              <a href="<?= $base ?>pages/internet/" class="text-gray-300 hover:text-white">Internet Fibra Óptica</a>
            </li>
            <li>
              <a href="<?= $base ?>pages/tv/" class="text-gray-300 hover:text-white">Televisión</a>
            </li>
            <li>
              <a href="<?= $base ?>pages/mesh/" class="text-gray-300 hover:text-white">WiFi Mesh</a>
            </li>
            <li>
              <a href="<?= $base ?>pages/alcances/" class="text-gray-300 hover:text-white">Alcances de servicios</a>
            </li>
          </ul>
        </div>

        <!-- Columna de Soporte -->
        <div>
          <h4 class="font-bold uppercase tracking-wider">Soporte</h4>
          <ul class="mt-4 space-y-2">
            <li>
              <a href="<?= $base ?>pages/centro_de_ayuda/" class="text-gray-300 hover:text-white">Centro de ayuda</a>
            </li>
            <li>
              <a href="https://phantom.usittel.com.ar/PHANTOM/Includes/CRM/CRM_APP/login.php"
                class="text-gray-300 hover:text-white" target="_blank" rel="noopener">Autogestión</a>
            </li>
            <li>
              <a href="<?= $base ?>pages/centro_de_ayuda/#medios-de-pago" class="text-gray-300 hover:text-white">Medios de pago</a>
            </li>
            <li>
              <a href="<?= $base ?>pages/baja/" class="text-gray-300 hover:text-white">Baja de servicio</a>
            </li>
          </ul>
        </div>

        <!-- Columna de Legal y Logo -->
        <div class="space-y-4">
          <h4 class="font-bold uppercase tracking-wider">Legal</h4>
          <ul class="space-y-2">
            <li>
              <a href="<?= $base ?>pages/terminos_y_condiciones/" class="text-gray-300 hover:text-white">Términos y
                condiciones</a>
            </li>
            <li>
              <a href="https://servicios.infoleg.gob.ar/infolegInternet/anexos/0-4999/638/texact.htm"
                class="text-gray-300 hover:text-white">Defensa del consumidor</a>
            </li>
            <li>
              <a href="https://www.argentina.gob.ar/sites/default/files/11186_2012_anexo_i.pdf"
                class="text-gray-300 hover:text-white">Ley 24240</a>
            </li>
            <li>
              <a href="<?= $base ?>datos-personales/" class="text-gray-300 hover:text-white">Política de privacidad</a>
            </li>
          </ul>
          <div class="pt-4">
            <img src="https://agustinsc2034.github.io/Usittel_V3.0/assets/img/logos/usina_tandil.png"
              alt="Logo Usina de Tandil" class="rounded-md w-36" />
          </div>
        </div>
      </div>

      <div class="border-t border-gray-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
        <p class="text-gray-400 text-sm mb-4 md:mb-0">
          &copy; 2025 Usittel. Todos los derechos reservados.
        </p>
        <div class="flex space-x-4">
          <a href="https://www.facebook.com/people/Usittel/100093569816699/#" class="text-gray-400 hover:text-white"><i
              class="fab fa-facebook-f fa-lg"></i></a>
          <a href="https://www.instagram.com/usittel.tandil/" class="text-gray-400 hover:text-white"><i
              class="fab fa-instagram fa-lg"></i></a>
          <a href="https://api.whatsapp.com/send/?phone=5492494060345&text&type=phone_number&app_absent=0"
            class="text-gray-400 hover:text-white"><i class="fab fa-whatsapp fa-lg"></i></a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Botón flotante de WhatsApp -->
  <div class="fixed bottom-4 right-4 z-[101] flex items-center group" style="font-size: 90%">
    <a href="https://wa.me/5492494060345" target="_blank" rel="noopener"
      class="flex items-center no-underline group hover:no-underline focus:no-underline"
      aria-label="Chateá con nosotros por WhatsApp">
      <span class="whatsapp-float flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"
        style="font-size: 37.8px; width: 50.4px; height: 50.4px">
        <i class="fab fa-whatsapp"></i>
      </span>
      <span
        class="ml-2.5 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-lg hidden md:flex flex-col items-start text-xs font-medium text-gray-800 group-hover:bg-green-50 group-hover:text-green-700 transition-colors"
        style="min-width: 126px">
        <span>¿Necesitás ayuda?</span>
        <span class="font-semibold mt-0.5">Chateá con nosotros</span>
      </span>
    </a>
  </div>

  <script>window.siteBase = '<?= $base ?>';</script>
  <script src="<?= $base ?>assets/js/main.js" defer></script>

  <!-- Validador de Cobertura -->
  <script src="<?= $base ?>js/coverage-validator.js"></script>

</body>

</html>
