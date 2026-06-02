(function () {
  const whatsappConfig = {
    phone: "5492494060345",
    text:
      "Hola USITTEL, quiero consultar cobertura para internet por fibra óptica en Tandil.",
  };

  function buildWhatsappUrl() {
    return `https://wa.me/${whatsappConfig.phone}?text=${encodeURIComponent(
      whatsappConfig.text
    )}`;
  }

  function trackWhatsappClick(source) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "whatsapp_google_ads_click",
      whatsapp_source: source || "landing",
      whatsapp_phone: whatsappConfig.phone,
    });

    // Tracking real:
    // Hoy este archivo solo empuja un evento a dataLayer.
    // Para medir conversiones reales hay que instalar GTM o gtag en el sitio
    // y conectar el evento whatsapp_google_ads_click con Google Ads.
    // Ejemplo futuro:
    // gtag("event", "conversion", { send_to: "AW-CONVERSION_ID/LABEL" });
  }

  function wireWhatsappCtas() {
    const url = buildWhatsappUrl();
    document.querySelectorAll("[data-whatsapp-cta], a[href^='https://wa.me/5492494060345']").forEach((link) => {
      if (link.dataset.whatsappWired === "true") return;
      link.setAttribute("href", url);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
      link.addEventListener("click", () => {
        trackWhatsappClick(link.getAttribute("data-whatsapp-source") || "dynamic-whatsapp-link");
      });
      link.dataset.whatsappWired = "true";
    });
  }

  window.UsittelWhatsappAds = {
    buildWhatsappUrl,
    trackWhatsappClick,
    config: whatsappConfig,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireWhatsappCtas);
  } else {
    wireWhatsappCtas();
  }

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(wireWhatsappCtas);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
