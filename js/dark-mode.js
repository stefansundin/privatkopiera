document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("dark-mode");
  checkbox.addEventListener("click", (e) => {
    if (e.isTrusted) {
      // user initiated
      if (e.shiftKey) {
        localStorage.removeItem("dark-mode");
        e.target.checked = window.matchMedia("(prefers-color-scheme: dark)").matches;
        e.target.indeterminate = true;
      }
      else {
        localStorage.setItem("dark-mode", e.target.checked.toString());
      }
    }

    if (e.target.checked) {
      document.body.classList.add("bg-dark");
      document.body.classList.add("text-light");
    }
    else {
      document.body.classList.remove("bg-dark");
      document.body.classList.remove("text-light");
    }

    const launcher = document.getElementById("img-launcher");
    if (launcher) {
      launcher.src = `img/launcher-${e.target.checked ? "dark":"light"}.png`;
    }
  });

  const dark_mode = localStorage.getItem("dark-mode");
  if (dark_mode == "true" || (dark_mode == undefined && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    checkbox.click();
  }
  checkbox.indeterminate = (dark_mode == undefined);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  const checkbox = document.getElementById("dark-mode");
  if (checkbox.indeterminate && checkbox.checked != e.matches) {
    checkbox.click();
    checkbox.indeterminate = true;
  }
});
