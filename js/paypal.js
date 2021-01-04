document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll('form[action="https://www.paypal.com/cgi-bin/webscr"]');
  for (let i=0; i < forms.length; i++) {
    const form = forms[i];
    form.addEventListener("submit", function(e) {
      if (parseInt(this.amount.value) < 1) {
        if (ga) {
          ga("send", "event", "paypal", "click", `paypal cheapskate ${this.amount.value}`);
        }
        e.preventDefault();
        alert("Den minsta donationssumman är en dollar. Om summan är mindre än en dollar så tar PayPal nästan allt med deras avgifter.\n\nOm du inte har råd med en dollar så vill jag istället uppmana dig till att ge till en välgörenhet nära dig.");
        return false;
      }
    });
  }
});
