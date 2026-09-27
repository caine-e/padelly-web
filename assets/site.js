(function () {
  "use strict";

  const root = document.documentElement;
  const appearanceKey = "padelly-appearance";
  const languageKey = "padelly-language";
  const appearances = ["light", "dark", "system"];
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function readPreference(key, allowed, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return allowed.includes(value) ? value : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function savePreference(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // A choice still applies to the current page when storage is unavailable.
    }
  }

  let currentAppearance = readPreference(appearanceKey, appearances, "light");
  root.dataset.appearance = currentAppearance;

  function locale() {
    return ["en", "de", "es"].includes(root.lang) ? root.lang : "en";
  }

  function effectiveAppearance() {
    return currentAppearance === "system" ? (darkQuery.matches ? "dark" : "light") : currentAppearance;
  }

  function screenshotPath(image, language, appearance, width) {
    const platform = image.dataset.screenshotPlatform === "watchos" ? "watchos" : "ios";
    return "/assets/screenshots/" + platform + "/" + image.dataset.screenshotScene + "-" + language + "-" + appearance + "-" + width + ".webp?v=20260927c";
  }

  function screenshotWidths(image) {
    if (image.dataset.screenshotPlatform === "watchos") return ["416"];
    return (image.dataset.screenshotWidths || "640,960").split(",").map(function (value) {
      return value.trim();
    }).filter(Boolean);
  }

  function setScreenshot(image, language, appearance) {
    const widths = screenshotWidths(image);
    image.src = screenshotPath(image, language, appearance, widths[0]);
    image.srcset = widths.map(function (width) {
      return screenshotPath(image, language, appearance, width) + " " + width + "w";
    }).join(", ");
    image.hidden = false;
  }

  function updateScreenshots() {
    document.querySelectorAll("img[data-screenshot-scene][data-screenshot-platform]").forEach(function (image) {
      if (image.dataset.screenshotGuarded !== "true") {
        image.dataset.screenshotGuarded = "true";
        image.addEventListener("error", function () {
          if (image.dataset.screenshotFallback === "true") {
            image.hidden = true;
            return;
          }
          image.dataset.screenshotFallback = "true";
          setScreenshot(image, "en", "light");
        });
      }
      image.dataset.screenshotFallback = "false";
      setScreenshot(image, locale(), effectiveAppearance());
    });
  }

  function updateThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = effectiveAppearance() === "dark" ? "#0d1724" : "#f5f6f4";
  }

  function updateVisibleAppIcons() {
    const icon = effectiveAppearance() === "dark" ? "midnight-black" : "classic-white";
    document.querySelectorAll(".brand-icon").forEach(function (image) {
      image.src = "/assets/icons/" + icon + "-96.webp";
    });
  }

  function refreshAppearance() {
    updateThemeColor();
    updateVisibleAppIcons();
    updateScreenshots();
  }

  if (typeof darkQuery.addEventListener === "function") {
    darkQuery.addEventListener("change", function () {
      if (currentAppearance === "system") refreshAppearance();
    });
  } else if (typeof darkQuery.addListener === "function") {
    darkQuery.addListener(function () {
      if (currentAppearance === "system") refreshAppearance();
    });
  }

  function setupPickers() {
    const pickers = Array.from(document.querySelectorAll("[data-picker]"));
    let openPicker = null;

    function items(picker) {
      return Array.from(picker.querySelectorAll('[role="menuitemradio"]'));
    }

    function close(picker, restoreFocus) {
      if (!picker) return;
      const trigger = picker.querySelector("[data-picker-trigger]");
      picker.querySelector("[data-picker-menu]").hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      picker.classList.remove("is-open");
      if (openPicker === picker) openPicker = null;
      if (restoreFocus) trigger.focus();
    }

    function open(picker, focusSelected) {
      if (openPicker && openPicker !== picker) close(openPicker, false);
      picker.querySelector("[data-picker-menu]").hidden = false;
      picker.querySelector("[data-picker-trigger]").setAttribute("aria-expanded", "true");
      picker.classList.add("is-open");
      openPicker = picker;
      if (focusSelected) {
        const selected = items(picker).find(function (item) {
          return item.getAttribute("aria-checked") === "true";
        });
        (selected || items(picker)[0]).focus();
      }
    }

    function sync(picker, value) {
      const selected = items(picker).find(function (item) { return item.dataset.value === value; });
      if (!selected) return;
      items(picker).forEach(function (item) {
        item.setAttribute("aria-checked", item === selected ? "true" : "false");
      });
      const label = selected.querySelector(".option-label");
      const valueLabel = picker.querySelector("[data-picker-value]");
      const flag = picker.querySelector("[data-current-flag]");
      if (valueLabel && label) valueLabel.textContent = label.textContent;
      if (flag && selected.dataset.flag) flag.textContent = selected.dataset.flag;
      picker.querySelector("[data-picker-trigger]").setAttribute("aria-label", (picker.dataset.label || "Selection") + ": " + label.textContent);
    }

    pickers.forEach(function (picker) {
      const type = picker.dataset.picker;
      const trigger = picker.querySelector("[data-picker-trigger]");
      const menu = picker.querySelector("[data-picker-menu]");
      sync(picker, type === "appearance" ? currentAppearance : root.lang);

      trigger.addEventListener("click", function () {
        if (menu.hidden) open(picker, true);
        else close(picker, true);
      });
      trigger.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          open(picker, true);
        } else if (event.key === "Escape" && !menu.hidden) {
          event.preventDefault();
          close(picker, true);
        }
      });
      menu.addEventListener("keydown", function (event) {
        const options = items(picker);
        const index = options.indexOf(document.activeElement);
        if (event.key === "Escape") { event.preventDefault(); close(picker, true); return; }
        if (event.key === "Tab") { close(picker, false); return; }
        let next = null;
        if (event.key === "ArrowDown") next = (index + 1 + options.length) % options.length;
        if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = options.length - 1;
        if (next !== null) { event.preventDefault(); options[next].focus(); }
      });
      items(picker).forEach(function (item) {
        item.addEventListener("click", function () {
          if (type === "appearance") {
            currentAppearance = appearances.includes(item.dataset.value) ? item.dataset.value : "light";
            root.dataset.appearance = currentAppearance;
            savePreference(appearanceKey, currentAppearance);
            sync(picker, currentAppearance);
            refreshAppearance();
            close(picker, true);
          } else if (type === "language") {
            if (["en", "de", "es"].includes(item.dataset.value)) savePreference(languageKey, item.dataset.value);
            close(picker, false);
          }
        });
      });
    });

    document.addEventListener("pointerdown", function (event) {
      if (openPicker && !openPicker.contains(event.target)) close(openPicker, false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && openPicker) { event.preventDefault(); close(openPicker, true); }
    });
    document.querySelectorAll(".footer-languages a[lang]").forEach(function (link) {
      link.addEventListener("click", function () {
        if (["en", "de", "es"].includes(link.lang)) savePreference(languageKey, link.lang);
      });
    });
  }

  function setupHeroMotion() {
    const art = document.querySelector(".v2-hero-art");
    if (!art || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current = 0;
    let target = 0;
    let active = false;
    function frame() {
      current += (target - current) * 0.11;
      art.style.setProperty("--v2-hero-shift", current.toFixed(2) + "px");
      if (Math.abs(target - current) > 0.1) window.requestAnimationFrame(frame);
      else active = false;
    }
    function scroll() {
      const bounds = art.getBoundingClientRect();
      target = Math.max(-16, Math.min(16, -bounds.top * 0.045));
      if (!active) { active = true; window.requestAnimationFrame(frame); }
    }
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
  }

  function setupSupportForm() {
    const form = document.querySelector("[data-support-form]");
    if (!form || typeof window.fetch !== "function") return;
    const submitButton = form.querySelector('button[type="submit"]');
    const submitLabel = form.querySelector("[data-submit-label]");
    const sendingLabel = form.querySelector("[data-sending-label]");
    const status = form.querySelector("[data-form-status]");

    function submitting(value) {
      submitButton.disabled = value;
      submitLabel.hidden = value;
      sendingLabel.hidden = !value;
      form.setAttribute("aria-busy", value ? "true" : "false");
    }
    function show(message, state) {
      status.textContent = message;
      status.dataset.state = state;
    }
    function resetTurnstile() {
      if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        show(form.dataset.invalidMessage, "error");
        return;
      }
      submitting(true);
      show("", "");
      try {
        const body = new URLSearchParams();
        new FormData(form).forEach(function (value, key) {
          if (typeof value === "string") body.append(key, value);
        });
        const response = await window.fetch(form.action, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: body.toString(),
          credentials: "same-origin",
        });
        let result = null;
        try { result = await response.json(); } catch (_error) { result = null; }
        if (response.ok && result && result.ok === true) {
          form.reset();
          show(form.dataset.successMessage, "success");
        } else {
          const message = result && result.code === "invalid_request"
            ? form.dataset.invalidMessage
            : result && result.code === "verification_failed"
              ? form.dataset.verificationMessage
              : form.dataset.serverMessage;
          show(message, "error");
        }
        resetTurnstile();
      } catch (_error) {
        show(form.dataset.serverMessage, "error");
        resetTurnstile();
      } finally {
        submitting(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    refreshAppearance();
    setupPickers();
    setupHeroMotion();
    setupSupportForm();
  });
})();
