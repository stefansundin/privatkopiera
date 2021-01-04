function get_cookie(name) {
  const c = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  if (c == undefined) {
    return undefined;
  }
  return c.substring(c.indexOf("=")+1);
}

document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("dark-mode");
  checkbox.addEventListener("click", (e) => {
    if (e.isTrusted) {
      // user initiated
      if (e.shiftKey) {
        // delete cookie
        document.cookie = `dark-mode=; path=/; expires=${new Date(0).toUTCString()}; samesite=lax`;
        e.target.checked = window.matchMedia("(prefers-color-scheme: dark)").matches;
        e.target.indeterminate = true;
      }
      else {
        // save preference
        document.cookie = `dark-mode=${e.target.checked}; path=/; max-age=${60*60*24*365}; samesite=lax${window.location.protocol == "https:"?"; secure":""}`;
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

  const dark_mode = get_cookie("dark-mode");
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
