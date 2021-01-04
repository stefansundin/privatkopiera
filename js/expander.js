document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".expander");
  for (let i=0; i < links.length; i++) {
    const a = links[i];
    a.style.display = "inline-block";
    a.addEventListener("click", function() {
      const id = this.getAttribute("expand");
      document.getElementById(id).style.display = "block";
      this.style.display = "none";
    });
    const id = a.getAttribute("expand");
    document.getElementById(id).style.display = "none";
  }
});
