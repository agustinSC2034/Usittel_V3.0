(function () {
  const whatsappConfig = {
    phone: "5492494060345",
    text:
      "Hola USITTEL, vengo de Google Ads y quiero consultar cobertura para internet por fibra óptica en Tandil.",
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

    // Google Ads / GTM:
    // Conectar aca el disparador de conversion si se implementa gtag directo.
    // Ejemplo futuro:
    // gtag("event", "conversion", { send_to: "AW-CONVERSION_ID/LABEL" });
  }

  function wireWhatsappCtas() {
    const url = buildWhatsappUrl();
    document.querySelectorAll("[data-whatsapp-cta]").forEach((link) => {
      link.setAttribute("href", url);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
      link.addEventListener("click", () => {
        trackWhatsappClick(link.getAttribute("data-whatsapp-source"));
      });
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
})();
