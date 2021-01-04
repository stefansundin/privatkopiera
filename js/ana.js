document.addEventListener("DOMContentLoaded", () => {
  if (window.location.protocol != "file:") {
    (function(i, s, o, g, r) {
      i["GoogleAnalyticsObject"] = r;
      i[r] = i[r] || function() {
        (i[r].q = i[r].q || []).push(arguments);
      };
      i[r].l = 1 * new Date();
      const a = s.createElement(o);
      const m = s.getElementsByTagName(o)[0];
      a.async = 1;
      a.src = g;
      m.parentNode.insertBefore(a, m);
    })(window, document, "script", "//www.google-analytics.com/analytics.js", "ga");
  }

  const gaid = document.body.getAttribute("ga") || "UA-6797859-18";
  ga("create", gaid, "auto");
  ga("send", "pageview");

  function trackLink(e) {
    let category = this.getAttribute("track");
    if (!category) {
      if (this.href.indexOf("mailto:") == 0) {
        category = "mailto";
      }
      else {
        category = "link";
      }
    }
    ga("send", "event", category, "click", this.href);
  }

  const links = document.getElementsByTagName("a");
  for (let i=0; i < links.length; i++) {
    const link = links[i];
    link.addEventListener("click", trackLink);
  }

  function trackForm(e) {
    let category = this.getAttribute("track");
    if (!category) {
      category = "form";
    }
    let label = this.action;
    const inputs = this.getElementsByTagName("input");
    for (let i=0; i < inputs.length; i++) {
      const input = inputs[i];
      if (input.name && input.type != "hidden") {
        label += ` ${input.name}=${input.value}`;
      }
    }
    ga("send", "event", category, "click", label);
  }

  const forms = document.getElementsByTagName("form");
  for (let i=0; i < forms.length; i++) {
    const form = forms[i];
    form.addEventListener("submit", trackForm);
  }
});
