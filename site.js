import { sendRentalRequest } from './form-delivery.mjs';
import { setupScrollMotion } from './motion.mjs';

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    }
  });
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

document.querySelectorAll('[data-rental-form]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = Object.fromEntries(new FormData(form).entries());
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const originalLabel = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending request…';
    }
    if (status) {
      status.classList.remove('is-error', 'is-success');
      status.textContent = '';
    }

    try {
      const message = await sendRentalRequest(values);
      if (status) {
        status.classList.add('is-success');
        status.textContent = message;
      }
      form.reset();
    } catch (error) {
      if (status) {
        status.classList.add('is-error');
        status.textContent = error instanceof Error ? error.message : 'The email could not be sent. Please call or text us.';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  });
});

setupScrollMotion();
