/* Home interactions; independent of the shared pages and Autogestión. */
"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Load only the visible hero photo; later slides are requested as needed.
  const hero = document.getElementById("hero-container");
  const photos = [1, 2, 4, 5, 6, 8, 10].map(n => `assets/img/hero/web/hero_final_${n}.webp`);
  const stage = document.getElementById("hero-carousel-container");
  const slides = [stage.firstElementChild];
  let current = 0, timer;
  for (const [direction, step] of [["prev", -1], ["next", 1]]) {
    const button = document.createElement("button");
    button.className = `hero-arrow ${direction}`;
    button.setAttribute("aria-label", step < 0 ? "Imagen anterior" : "Imagen siguiente");
    button.innerHTML = `<i class="fas fa-chevron-${step < 0 ? "left" : "right"}" aria-hidden="true"></i>`;
    button.addEventListener("click", () => { showHero(current + step); restartHero(); });
    hero.append(button);
  }
  let requestedSlide = 0;
  async function showHero(index) {
    index = (index + photos.length) % photos.length;
    const request = ++requestedSlide;
    if (!slides[index]) {
      const picture = document.createElement("picture");
      picture.className = "hero-carousel-bg";
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.src = photos[index];
      picture.append(img);
      stage.append(picture);
      slides[index] = picture;
    }
    try { await slides[index].querySelector("img").decode(); } catch { return; }
    if (request !== requestedSlide) return;
    slides[current].classList.remove("active");
    current = index;
    slides[current].classList.add("active");
  }
  let heroVisible = true;
  function restartHero() {
    clearInterval(timer);
    if (!reducedMotion.matches && !document.hidden && heroVisible) {
      timer = setInterval(() => showHero(current + 1), 6500);
    }
  }
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; restartHero(); }).observe(hero);
  reducedMotion.addEventListener("change", restartHero);
  document.addEventListener("visibilitychange", restartHero);
  restartHero();

  // A single Mesh controller replaces the two competing legacy initializers.
  const meshSlides = [...document.querySelectorAll(".mesh-slide")];
  const meshDots = document.getElementById("mesh-dots-container");
  let meshIndex = 0;
  const meshButtons = meshSlides.map((_, index) => {
    const button = document.createElement("button");
    button.className = "mesh-dot";
    button.setAttribute("aria-label", `Ver equipo WiFi Mesh ${index + 1}`);
    button.innerHTML = '<i class="fas fa-circle" aria-hidden="true"></i>';
    button.addEventListener("click", () => showMesh(index));
    meshDots.append(button);
    return button;
  });
  function showMesh(index) {
    meshIndex = index;
    meshSlides.forEach((slide, i) => {
      slide.classList.toggle("active", i === index);
      meshButtons[i].classList.toggle("active", i === index);
      meshButtons[i].setAttribute("aria-pressed", String(i === index));
    });
  }
  showMesh(meshIndex);

  // FAQ disclosures use native details/summary, including keyboard support.
});
