// Applies the saved theme before first paint so a dark page never flashes white.
// A file, not an inline script: the Content-Security-Policy of the zones allows no inline scripts.
(function () {
  try {
    var mode = localStorage.getItem('ys-theme');
    var dark = mode === 'dark' || (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
