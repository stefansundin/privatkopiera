document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('dark-mode');
  const label = checkbox.parentElement.querySelector('label[for="dark-mode"]');
  for (const el of [checkbox, label]) {
    el.addEventListener('click', (e) => {
      if (e.isTrusted) {
        // user initiated
        if (e.shiftKey) {
          localStorage.removeItem('theme');
          checkbox.checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
          checkbox.indeterminate = true;
        } else {
          localStorage.setItem('theme', checkbox.checked ? 'dark' : 'light');
        }
      }

      const theme = checkbox.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', theme);
    });
  }

  const theme = localStorage.getItem('theme');
  if (theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    checkbox.click();
  }
  checkbox.indeterminate = theme === null;
  document.documentElement.setAttribute('data-bs-theme', checkbox.checked ? 'dark' : 'light');

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (checkbox.indeterminate && checkbox.checked !== e.matches) {
        checkbox.click();
        checkbox.indeterminate = true;
      }
    });
});
