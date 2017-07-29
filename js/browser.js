
if (navigator.userAgent.indexOf("Chrome") != -1) {
  document.getElementById("chrome-button").className = "btn btn-primary";
}
else if (navigator.userAgent.indexOf("Firefox") != -1) {
  document.getElementById("firefox-button").className = "btn btn-primary";
}
else {
  var el = document.getElementById("browser-warning");
  el.classList.remove("hidden");
}
