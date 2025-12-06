// Плавні переходи між сторінками
console.log("transitions.js loaded");

// ============================================
// Header Hide/Show Animation
// ============================================

let lastScrollTop = 0;
let isHeaderVisible = true;
let header = null;
const scrollThreshold = 30;

function handleHeaderScroll() {
  if (!header) return;

  const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

  // Дебаг
  console.log('Scroll:', currentScroll, 'Visible:', isHeaderVisible);

  if (currentScroll <= scrollThreshold) {
    // На початку сторінки завжди показуємо header
    if (!isHeaderVisible) {
      header.classList.remove('header-hidden');
      header.classList.add('header-visible');
      isHeaderVisible = true;
      console.log('Header shown (top zone)');
    }
  } else if (currentScroll > lastScrollTop) {
    // Скрол вниз — ховаємо
    if (isHeaderVisible) {
      header.classList.remove('header-visible');
      header.classList.add('header-hidden');
      isHeaderVisible = false;
      console.log('Header hidden (scroll down)');
    }
  } else if (currentScroll < lastScrollTop) {
    // Скрол вверх — показуємо
    if (!isHeaderVisible) {
      header.classList.remove('header-hidden');
      header.classList.add('header-visible');
      isHeaderVisible = true;
      console.log('Header shown (scroll up)');
    }
  }

  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
}

document.addEventListener('DOMContentLoaded', () => {
  // Знаходимо header
  header = document.querySelector('header');

  if (header) {
    // Початковий стан
    header.classList.add('header-visible');
    lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Вішаємо scroll тільки тепер
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });

    console.log("✓ Header animation initialized");
  }

  // ДАЛІ — твій існуючий код з посиланнями / якорями / переходами
  const navLinks = document.querySelectorAll('a[href]:not([href^="#"])');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.target === '_blank' || link.hostname !== window.location.hostname) {
        return;
      }

      const href = link.getAttribute('href');

      if (href === window.location.pathname) {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      const transition = document.createElement('div');
      transition.className = 'page-transition';

      document.body.appendChild(transition);

      setTimeout(() => {
        window.location.href = href;
      }, 300);
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');

      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});
