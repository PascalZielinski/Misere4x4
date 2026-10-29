(function () {
  var m = document.cookie.match(/(?:^|; )theme=(light|dark)/);
  var theme = m
    ? m[1]
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();