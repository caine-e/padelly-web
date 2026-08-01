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

  function savedLanguage() {
    try {
      var value = window.localStorage.getItem("padelly-language");
      return ["en", "de", "es"].indexOf(value) !== -1 ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function browserLanguage() {
    var languages = Array.prototype.slice.call(navigator.languages || []);
    if (!languages.length && navigator.language) languages.push(navigator.language);

    for (var index = 0; index < languages.length; index += 1) {
      var language = String(languages[index] || "").toLowerCase();
      if (language === "en" || language.indexOf("en-") === 0) return "en";
      if (language === "de" || language.indexOf("de-") === 0) return "de";
      if (language === "es" || language.indexOf("es-") === 0) return "es";
    }

    return "en";
  }

  // Language is selected in the browser only. A saved manual choice is always
  // more important than a browser guess, and direct locale URLs are never moved.
  if (window.location.pathname === "/") {
    var language = savedLanguage() || browserLanguage();

    if (language !== "en") {
      var destination = new URL(window.location.href);
      destination.pathname = "/" + language + "/";
      window.location.replace(destination.href);
    }
  }
})();
