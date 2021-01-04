document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll("a[fubar]");
  for (let i=0; i < links.length; i++) {
    const a = links[i];
    if (a.href != "") {
      continue;
    }
    a.textContent = a.textContent.replace(/[A-Z]{2}/, function(c) {
      return (c[0] + "@" + c[1]).toLowerCase();
    }).replace(/[A-Z]/g, function(c) {
      return "." + c.toLowerCase();
    });
    a.href = "mailto:" + a.textContent;
  }
});
