"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const mobile = window.matchMedia("(max-width: 900px)");
  const menu = document.getElementById("mobileMenu");
  const hamburger = document.getElementById("hamburger");
  const overlay = document.getElementById("overlay");
  function setMenu(open) {
    menu.classList.toggle("show", open);
    overlay.classList.toggle("show", open);
    menu.inert = !open;
    document.body.classList.toggle("menu-open", open);
    hamburger.setAttribute("aria-expanded", String(open));
    if (open) document.getElementById("closeMenu").focus();
    else hamburger.focus({ preventScroll: true });
  }
  hamburger.addEventListener("click", () => setMenu(true));
  overlay.addEventListener("click", () => setMenu(false));
  document.getElementById("closeMenu").addEventListener("click", () => setMenu(false));
  menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", event => {
    if (!menu.classList.contains("show")) return;
    if (event.key === "Escape") setMenu(false);
    if (event.key === "Tab") {
      const controls = [...menu.querySelectorAll("a, button")].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  mobile.addEventListener("change", () => {
    if (!mobile.matches && menu.classList.contains("show")) {
      setMenu(false);
      document.querySelector(".nav-left .logo").focus();
    }
  });
  const productsToggle = document.getElementById("toggleProducts");
  productsToggle.addEventListener("click", () => {
    const open = document.getElementById("productsSubmenu").classList.toggle("show");
    productsToggle.setAttribute("aria-expanded", String(open));
  });

});
