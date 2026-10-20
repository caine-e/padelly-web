(function () {
  "use strict";

  var root = document.documentElement;

  function preference(key, allowed, fallback) {
    try {
      var value = window.localStorage.getItem(key);
      return allowed.indexOf(value) !== -1 ? value : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  root.dataset.appearance = preference(
    "padelly-appearance",
    ["system", "light", "dark"],
    "light"
  );
  root.dataset.preset = "ultra";

  // Each language has a stable URL. Language changes use the visible links,
  // so visitors and crawlers can always read the page they requested.
})();
