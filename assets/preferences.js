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
    "system"
  );
  root.dataset.preset = preference(
    "padelly-color-preset",
    ["neon", "court", "ultra"],
    "ultra"
  );
})();
