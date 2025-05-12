const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const overlay = document.getElementById('overlay');
const closeMenu = document.getElementById('closeMenu');
const toggleProducts = document.getElementById('toggleProducts');
const productsSubmenu = document.getElementById('productsSubmenu');

function toggleMenu() {
  mobileMenu.classList.toggle('show');
  overlay.classList.toggle('show');
}

hamburger.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);
closeMenu.addEventListener('click', toggleMenu);

toggleProducts.addEventListener('click', () => {
  productsSubmenu.classList.toggle('show');
});

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
      navbar.classList.add('sticky-shadow');
    } else {
      navbar.classList.remove('sticky-shadow');
    }
  });
  