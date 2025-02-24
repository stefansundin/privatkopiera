let localStorageUsable = false;
try {
  if ('localStorage' in window && localStorage) {
    localStorageUsable = true;
  }
} catch { }

function syncTheme() {
  const checkbox = document.getElementById('dark-mode');
  const theme = (checkbox.checked ? 'dark' : 'light');
  document.documentElement.setAttribute('data-bs-theme', theme);

  const launcher = document.getElementById('img-launcher');
  if (launcher) {
    launcher.src = `img/launcher-${theme}.png`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('dark-mode');
  const label = checkbox.parentElement.querySelector('label[for="dark-mode"]');
  checkbox.parentElement.classList.remove('d-none'); // Only show dark mode switch if JavaScript is enabled
  for (const el of [checkbox, label]) {
    el.addEventListener('click', (e) => {
      if (e.isTrusted && localStorageUsable) {
        // user initiated
        if (e.shiftKey) {
          localStorage.removeItem('theme');
          checkbox.checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
          checkbox.indeterminate = true;
        }
        else {
          localStorage.setItem('theme', (checkbox.checked ? 'dark' : 'light'));
        }
      }
      syncTheme();
    });
  }

  // Pass theme=dark in the query string to default to dark mode
  let theme = window.location.search.substring(1).split('&').find(v => v.startsWith('theme='))?.split('=')?.[1]
  if (localStorageUsable) {
    // localStorage has preference over query parameter
    const localTheme = localStorage.getItem('theme');
    if (localTheme) {
      theme = localTheme;
    }
  }
  const dark_mode_enabled = (theme === 'dark') || (theme === undefined && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark_mode_enabled !== checkbox.checked) {
    checkbox.click();
  }
  checkbox.indeterminate = (theme === undefined);
  syncTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (checkbox.indeterminate && checkbox.checked !== e.matches) {
      checkbox.click();
      checkbox.indeterminate = true;
    }
  });
});
