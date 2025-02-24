
if (navigator.userAgent.includes('Chrome')) {
  document.getElementById('chrome-button').className = 'btn btn-primary';
} else if (navigator.userAgent.includes('Firefox')) {
  document.getElementById('firefox-button').className = 'btn btn-primary';
} else {
  document.getElementById('browser-warning').classList.remove('d-none');
}
