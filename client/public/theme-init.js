(function () {
  var consented = false;
  try {
    consented = localStorage.getItem('misere4x4:cookie-consent') === 'accepted';
  } catch (error) {
    console.error('Could not read cookie consent from localStorage.', error);
  }
  var m = consented ? document.cookie.match(/(?:^|; )theme=(light|dark)/) : null;
  var theme = m
    ? m[1]
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();