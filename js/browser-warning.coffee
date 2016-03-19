---
---

if navigator.userAgent.indexOf("Chrome") == -1
  el = document.getElementById("browser-warning")
  el.className = el.className.replace("hidden", "")
