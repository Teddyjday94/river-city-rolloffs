export function shouldAnimate({ reducedMotion }) {
  return !reducedMotion;
}

export function setupScrollMotion(documentRef = document, windowRef = window) {
  const reducedMotion = windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!shouldAnimate({ reducedMotion })) {
    documentRef.documentElement.classList.add('motion-off');
    return;
  }

  documentRef.documentElement.classList.add('motion-ready');

  const hero = documentRef.querySelector('.hero');
  hero?.querySelectorAll('.hero-content > *').forEach((element, index) => {
    element.classList.add('motion-item');
    element.style.setProperty('--motion-delay', `${100 + index * 75}ms`);
  });
  windowRef.requestAnimationFrame(() => hero?.classList.add('is-visible'));

  const sections = [...documentRef.querySelectorAll('.section, .cta-strip')];
  sections.forEach((section) => {
    section.classList.add('reveal-section');
    section.querySelectorAll('.card, .service-card, .parish-card, .process-step, .benefit, .gallery a').forEach((item, index) => {
      item.classList.add('reveal-item');
      item.style.setProperty('--motion-delay', `${Math.min(index, 6) * 70}ms`);
    });
  });

  if (!('IntersectionObserver' in windowRef)) {
    sections.forEach((section) => section.classList.add('is-visible'));
    return;
  }

  const observer = new windowRef.IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  sections.forEach((section) => observer.observe(section));
}

