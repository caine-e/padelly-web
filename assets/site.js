(function () {
  "use strict";

  const root = document.documentElement;
  const appearanceKey = "padelly-appearance";
  const presetKey = "padelly-color-preset";
  const appearances = ["system", "light", "dark"];
  const presets = ["neon", "court", "ultra"];

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
      // The visual choice still applies for this page if storage is unavailable.
    }
  }

  let currentAppearance = readPreference(appearanceKey, appearances, "system");
  let currentPreset = readPreference(presetKey, presets, "ultra");

  root.dataset.appearance = currentAppearance;
  root.dataset.preset = currentPreset;

  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function effectiveAppearance() {
    if (currentAppearance === "system") {
      return darkQuery.matches ? "dark" : "light";
    }
    return currentAppearance;
  }

  function updateThemeColor() {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", effectiveAppearance() === "dark" ? "#090b0e" : "#f4f2ef");
    }
  }

  updateThemeColor();

  function onSystemAppearanceChange() {
    if (currentAppearance === "system") {
      updateThemeColor();
    }
  }

  if (typeof darkQuery.addEventListener === "function") {
    darkQuery.addEventListener("change", onSystemAppearanceChange);
  } else if (typeof darkQuery.addListener === "function") {
    darkQuery.addListener(onSystemAppearanceChange);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const pickers = Array.from(document.querySelectorAll("[data-picker]"));
    let openPicker = null;

    function pickerItems(picker) {
      return Array.from(picker.querySelectorAll('[role="menuitemradio"]'));
    }

    function closeMenu(picker, restoreFocus) {
      if (!picker) return;
      const trigger = picker.querySelector("[data-picker-trigger]");
      const menu = picker.querySelector("[data-picker-menu]");
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      picker.classList.remove("is-open");
      if (openPicker === picker) openPicker = null;
      if (restoreFocus) trigger.focus();
    }

    function openMenu(picker, focusSelected) {
      if (openPicker && openPicker !== picker) closeMenu(openPicker, false);
      const trigger = picker.querySelector("[data-picker-trigger]");
      const menu = picker.querySelector("[data-picker-menu]");
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      picker.classList.add("is-open");
      openPicker = picker;

      if (focusSelected) {
        const selected = pickerItems(picker).find(function (item) {
          return item.getAttribute("aria-checked") === "true";
        });
        (selected || pickerItems(picker)[0]).focus();
      }
    }

    function syncPicker(picker, value) {
      const items = pickerItems(picker);
      const selected = items.find(function (item) {
        return item.dataset.value === value;
      });
      if (!selected) return;

      items.forEach(function (item) {
        item.setAttribute("aria-checked", item === selected ? "true" : "false");
      });

      const valueLabel = picker.querySelector("[data-picker-value]");
      const optionLabel = selected.querySelector(".option-label");
      if (valueLabel && optionLabel) valueLabel.textContent = optionLabel.textContent;

      const flag = picker.querySelector("[data-current-flag]");
      if (flag && selected.dataset.flag) flag.textContent = selected.dataset.flag;

      const trigger = picker.querySelector("[data-picker-trigger]");
      const pickerLabel = picker.dataset.label || "Selection";
      if (trigger && optionLabel) {
        trigger.setAttribute("aria-label", pickerLabel + ": " + optionLabel.textContent);
      }
    }

    pickers.forEach(function (picker) {
      const type = picker.dataset.picker;
      const trigger = picker.querySelector("[data-picker-trigger]");
      const menu = picker.querySelector("[data-picker-menu]");
      const initialValue = type === "appearance"
        ? currentAppearance
        : type === "preset"
          ? currentPreset
          : root.lang;

      syncPicker(picker, initialValue);

      trigger.addEventListener("click", function () {
        if (menu.hidden) openMenu(picker, true);
        else closeMenu(picker, true);
      });

      trigger.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          openMenu(picker, true);
        } else if (event.key === "Escape" && !menu.hidden) {
          event.preventDefault();
          closeMenu(picker, true);
        }
      });

      menu.addEventListener("keydown", function (event) {
        const items = pickerItems(picker);
        const currentIndex = items.indexOf(document.activeElement);

        if (event.key === "Escape") {
          event.preventDefault();
          closeMenu(picker, true);
          return;
        }

        if (event.key === "Tab") {
          closeMenu(picker, false);
          return;
        }

        let nextIndex = null;
        if (event.key === "ArrowDown") nextIndex = (currentIndex + 1 + items.length) % items.length;
        if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = items.length - 1;

        if (nextIndex !== null) {
          event.preventDefault();
          items[nextIndex].focus();
        }
      });

      pickerItems(picker).forEach(function (item) {
        item.addEventListener("click", function () {
          const value = item.dataset.value;

          if (type === "appearance") {
            currentAppearance = appearances.includes(value) ? value : "system";
            root.dataset.appearance = currentAppearance;
            savePreference(appearanceKey, currentAppearance);
            updateThemeColor();
            syncPicker(picker, currentAppearance);
            closeMenu(picker, true);
          } else if (type === "preset") {
            currentPreset = presets.includes(value) ? value : "ultra";
            root.dataset.preset = currentPreset;
            savePreference(presetKey, currentPreset);
            syncPicker(picker, currentPreset);
            closeMenu(picker, true);
          } else {
            closeMenu(picker, false);
          }
        });
      });
    });

    document.addEventListener("pointerdown", function (event) {
      if (openPicker && !openPicker.contains(event.target)) {
        closeMenu(openPicker, false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && openPicker) {
        event.preventDefault();
        closeMenu(openPicker, true);
      }
    });

    const supportForm = document.querySelector("[data-support-form]");
    if (supportForm && typeof window.fetch === "function") {
      const submitButton = supportForm.querySelector('button[type="submit"]');
      const submitLabel = supportForm.querySelector("[data-submit-label]");
      const sendingLabel = supportForm.querySelector("[data-sending-label]");
      const status = supportForm.querySelector("[data-form-status]");

      function setSubmitting(isSubmitting) {
        submitButton.disabled = isSubmitting;
        submitLabel.hidden = isSubmitting;
        sendingLabel.hidden = !isSubmitting;
        supportForm.setAttribute("aria-busy", isSubmitting ? "true" : "false");
      }

      function showStatus(message, state) {
        status.textContent = message;
        status.dataset.state = state;
      }

      function resetTurnstile() {
        if (window.turnstile && typeof window.turnstile.reset === "function") {
          window.turnstile.reset();
        }
      }

      supportForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!supportForm.checkValidity()) {
          supportForm.reportValidity();
          showStatus(supportForm.dataset.invalidMessage, "error");
          return;
        }

        setSubmitting(true);
        showStatus("", "");

        try {
          const formData = new FormData(supportForm);
          const body = new URLSearchParams();
          formData.forEach(function (value, key) {
            if (typeof value === "string") body.append(key, value);
          });

          const response = await window.fetch(supportForm.action, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: body.toString(),
            credentials: "same-origin",
          });

          let result = null;
          try {
            result = await response.json();
          } catch (_error) {
            result = null;
          }

          if (response.ok && result && result.ok === true) {
            supportForm.reset();
            showStatus(supportForm.dataset.successMessage, "success");
            resetTurnstile();
          } else {
            const message = result && result.code === "invalid_request"
              ? supportForm.dataset.invalidMessage
              : result && result.code === "verification_failed"
                ? supportForm.dataset.verificationMessage
                : supportForm.dataset.serverMessage;
            showStatus(message, "error");
            resetTurnstile();
          }
        } catch (_error) {
          showStatus(supportForm.dataset.serverMessage, "error");
          resetTurnstile();
        } finally {
          setSubmitting(false);
        }
      });
    }
  });
})();
