(function () {
  "use strict";

  const root = document.documentElement;
  const appearanceKey = "padelly-appearance";
  const presetKey = "padelly-color-preset";
  const languageKey = "padelly-language";
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

  function updateScreenshots() {
    document.querySelectorAll("[data-screenshot-scene][data-screenshot-platform]").forEach(function (image) {
      guardScreenshot(image);
      updateScreenshot(image);
    });
  }

  function guardScreenshot(image) {
    if (image.dataset.screenshotGuarded === "true") return;
    image.dataset.screenshotGuarded = "true";
    image.addEventListener("error", function () {
      const widths = (image.dataset.screenshotWidths || "")
        .split(",")
        .map(function (value) { return value.trim(); })
        .filter(Boolean);
      if (widths.length && image.dataset.screenshotFallback !== "true") {
        image.dataset.screenshotFallback = "true";
        image.src = "/assets/screenshots/" + image.dataset.screenshotScene + "-ultra-" + widths[0] + ".webp";
        image.srcset = widths.map(function (width) {
          return "/assets/screenshots/" + image.dataset.screenshotScene + "-ultra-" + width + ".webp " + width + "w";
        }).join(", ");
        image.hidden = false;
        image.removeAttribute("aria-hidden");
        return;
      }
      image.hidden = true;
      image.setAttribute("aria-hidden", "true");
    });
  }

  function updateScreenshot(image) {
    const scene = image.dataset.screenshotScene;
    const widths = (image.dataset.screenshotWidths || "")
      .split(",")
      .map(function (value) { return value.trim(); })
      .filter(Boolean);

    if (!scene || !widths.length) return;

    const base = screenshotBase(scene);
    image.src = base + "-" + widths[0] + ".webp";
    image.srcset = widths.map(function (width) {
      return base + "-" + width + ".webp " + width + "w";
    }).join(", ");
    image.removeAttribute("data-screenshot-fallback");
    image.hidden = false;
    image.removeAttribute("aria-hidden");
  }

  function updateVisibleAppIcons() {
    const locale = ["en", "de", "es"].includes(root.lang) ? root.lang : "en";
    const isDark = effectiveAppearance() === "dark";
    const iconName = isDark ? "midnight-black" : "classic-white";
    const iconLabel = {
      en: isDark ? "Padelly Midnight Black app icon" : "Padelly Classic White app icon",
      de: isDark ? "Padelly App-Symbol Midnight Black" : "Padelly App-Symbol Classic White",
      es: isDark ? "Icono Midnight Black de Padelly" : "Icono Classic White de Padelly",
    }[locale];

    document.querySelectorAll(".brand-icon").forEach(function (image) {
      image.src = "/assets/icons/" + iconName + "-96.webp";
    });

    document.querySelectorAll(".hero-app-icon").forEach(function (image) {
      image.src = "/assets/icons/" + iconName + "-512.webp";
      image.alt = iconLabel;
    });
  }

  updateThemeColor();
  updateScreenshots();
  updateVisibleAppIcons();

  // Keep device choice in one place. The query override makes both hero states
  // easy to inspect without relying on a particular browser or device.
  function resolveHeroDeviceMode() {
    const requested = (new URLSearchParams(window.location.search).get("device") || "").toLowerCase();
    if (requested === "ios" || requested === "android") return requested;

    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const hintedPlatform = navigator.userAgentData && navigator.userAgentData.platform
      ? navigator.userAgentData.platform
      : "";
    const isApplePlatform = /^(Mac|iPhone|iPad|iPod|AppleTV|iOS|macOS|iPadOS)/i.test(platform)
      || /^(iOS|macOS|iPadOS|AppleTV|visionOS)$/i.test(hintedPlatform)
      || /Macintosh|Mac OS X|iPhone|iPad|iPod|AppleTV|VisionOS/i.test(userAgent);

    return isApplePlatform ? "ios" : "android";
  }

  const heroDeviceMode = resolveHeroDeviceMode();
  root.dataset.deviceMode = heroDeviceMode;

  function heroCopy(locale) {
    const copy = {
      en: {
        iosLabel: "iPhone experience",
        androidLabel: "Android preview",
        androidAria: "Representative Android app preview.",
        androidEyebrow: "Android app preview",
        quickStart: "Quick Start",
        matchType: "Doubles",
        matchFormat: "Fast Match",
        startMatch: "Start match",
        preview: "Preview",
      },
      de: {
        iosLabel: "iPhone-Erlebnis",
        androidLabel: "Android-Vorschau",
        androidAria: "Repräsentative Android-App-Vorschau.",
        androidEyebrow: "Android-App-Vorschau",
        quickStart: "Schnellstart",
        matchType: "Doppel",
        matchFormat: "Schnelles Match",
        startMatch: "Match starten",
        preview: "Vorschau",
      },
      es: {
        iosLabel: "Experiencia en iPhone",
        androidLabel: "Vista previa de Android",
        androidAria: "Vista previa representativa de la app Android.",
        androidEyebrow: "Vista previa de la app Android",
        quickStart: "Inicio rápido",
        matchType: "Dobles",
        matchFormat: "Partido rápido",
        startMatch: "Iniciar partido",
        preview: "Vista previa",
      },
    };

    return copy[locale] || copy.en;
  }

  function createAndroidPreview(copy) {
    const device = document.createElement("div");
    device.className = "hero-device hero-device--android";
    device.setAttribute("aria-hidden", "true");
    device.innerHTML = `
      <div class="android-camera" aria-hidden="true"></div>
      <div class="android-screen">
        <div class="android-status" aria-hidden="true"><span>9:41</span><span>◒ ◔</span></div>
        <div class="android-appbar"><span class="android-appmark" aria-hidden="true"></span><strong>Padelly</strong><span class="android-preview-tag">${copy.preview}</span></div>
        <div class="android-screen-content">
          <p class="android-kicker">${copy.quickStart}</p>
          <h2>${copy.matchType}</h2>
          <div class="android-match-card"><span>${copy.matchFormat}</span><span aria-hidden="true">›</span></div>
          <div class="android-teams" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <div class="android-start-button"><span class="android-play" aria-hidden="true"></span>${copy.startMatch}</div>
        </div>
        <div class="android-navigation" aria-hidden="true"><span class="is-current"></span><span></span><span></span></div>
      </div>`;
    return device;
  }

  function enhanceHeroPresentation() {
    const visual = document.querySelector(".hero-visual");
    const fallbackFrame = visual && visual.querySelector(".screenshot-frame");
    const homeScreen = fallbackFrame && fallbackFrame.querySelector("img[data-screenshot-scene='home']");
    if (!visual || !fallbackFrame || !homeScreen) return;

    const locale = ["en", "de", "es"].includes(root.lang) ? root.lang : "en";
    const copy = heroCopy(locale);
    const stage = document.createElement("div");
    const court = document.createElement("div");
    const iosDevice = document.createElement("div");
    const iosScreen = document.createElement("div");
    const liveScreen = homeScreen.cloneNode(true);
    const caption = document.createElement("p");
    const hero = visual.closest(".hero");

    visual.classList.add("is-device-enhanced");
    visual.setAttribute("role", "img");
    visual.setAttribute("aria-label", heroDeviceMode === "ios" ? copy.iosLabel : copy.androidAria);
    stage.className = "hero-device-stage";
    court.className = "hero-court-lines";
    iosDevice.className = "hero-device hero-device--ios";
    iosDevice.setAttribute("aria-hidden", "true");
    iosScreen.className = "hero-ios-screen";
    homeScreen.classList.add("hero-screen-scene", "hero-screen-scene--home");
    homeScreen.alt = "";
    liveScreen.classList.add("hero-screen-scene", "hero-screen-scene--live");
    liveScreen.dataset.screenshotScene = "live-score";
    liveScreen.alt = "";
    liveScreen.removeAttribute("fetchpriority");
    liveScreen.loading = "eager";
    iosScreen.append(homeScreen, liveScreen);
    iosDevice.append(iosScreen);

    const androidDevice = createAndroidPreview(copy);
    iosDevice.hidden = heroDeviceMode !== "ios";
    androidDevice.hidden = heroDeviceMode !== "android";
    caption.className = "hero-device-caption";
    caption.textContent = heroDeviceMode === "ios" ? copy.iosLabel : copy.androidLabel;

    if (hero) {
      const availability = hero.querySelector(".availability");
      if (availability) availability.hidden = heroDeviceMode === "android";

      if (heroDeviceMode === "android") {
        const eyebrow = hero.querySelector(".eyebrow");
        if (eyebrow) eyebrow.textContent = copy.androidEyebrow;
      }
    }

    fallbackFrame.remove();
    stage.append(court, iosDevice, androidDevice);
    visual.append(stage, caption);
    updateScreenshots();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    root.classList.add("has-hero-motion");
    let framePending = false;

    function updateScrollMotion() {
      framePending = false;
      const bounds = visual.getBoundingClientRect();
      const travel = Math.max(bounds.height * 0.85, 1);
      const progress = Math.min(1, Math.max(0, -bounds.top / travel));
      const screenProgress = Math.min(1, Math.max(0, (progress - 0.16) / 0.6));

      stage.style.setProperty("--hero-scroll-y", `${Math.round((progress - 0.45) * -34)}px`);
      stage.style.setProperty("--hero-scroll-rotate", `${((progress - 0.5) * -3.2).toFixed(2)}deg`);
      stage.style.setProperty("--hero-screen-progress", screenProgress.toFixed(3));
    }

    function scheduleScrollMotion() {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(updateScrollMotion);
    }

    updateScrollMotion();
    window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
    window.addEventListener("resize", scheduleScrollMotion, { passive: true });

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      visual.addEventListener("pointermove", function (event) {
        const bounds = visual.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        stage.style.setProperty("--hero-tilt-x", `${(-y * 3).toFixed(2)}deg`);
        stage.style.setProperty("--hero-tilt-y", `${(x * 4).toFixed(2)}deg`);
      });

      visual.addEventListener("pointerleave", function () {
        stage.style.setProperty("--hero-tilt-x", "0deg");
        stage.style.setProperty("--hero-tilt-y", "0deg");
      });
    }
  }

  function currentLocale() {
    return ["en", "de", "es"].includes(root.lang) ? root.lang : "en";
  }

  function homepageCopy(locale) {
    const copy = {
      en: {
        previewLabel: "Inside Padelly",
        tourTitle: "Set up on iPhone. Score from your wrist.",
        tourCopy: "The Apple Watch leads the live match. Keep the iPhone companion close for setup, history, and Analytics.",
        steps: [
          { label: "Quick Start", scene: "home", title: "Begin with the match you know.", copy: "Pick up a recent setup or start fresh from the Play screen.", alt: "Padelly home screen with Quick Start on iPhone" },
          { label: "Set up", scene: "match-setup", title: "Choose the shape of the match.", copy: "Select singles or doubles, the format, and who serves first before the first ball.", alt: "Padelly match setup screen on iPhone" },
          { label: "Live score", scene: "live-score", title: "Keep the court in view.", copy: "Large, clear scoring controls make the next point a quick tap, with serving information always close by.", alt: "Padelly live score screen on iPhone" },
          { label: "Undo + serve", scene: "live-score", title: "Recover the point, not the rhythm.", copy: "Undo returns score and serving state across games, sets, and tie-breaks.", alt: "Padelly live score screen with undo and serving information on iPhone" },
          { label: "History", scene: "history", title: "Let the result stay useful.", copy: "Finished matches stay local with scores, duration, player records, and useful history.", alt: "Padelly match history screen on iPhone" },
          { label: "Analytics", scene: "analytics", title: "See the patterns after the match.", copy: "Overview, form, personal records, and point quality turn completed matches into useful context.", alt: "Padelly Analytics tab on iPhone" },
          { label: "Appearance", scene: "settings-colors", title: "Make the court yours.", copy: "Choose appearance and team colours without getting in the way of the match.", alt: "Padelly appearance and team colours screen on iPhone" },
        ],
        formatLabel: "Choose your match mode",
        formatTitle: "Five real formats. One clear decision.",
        formatCopy: "Tap a format to see its real launch rules. The full, crawlable comparison remains available for every format.",
        fullComparison: "Compare all scoring formats",
        formats: [
          { name: "German Club", detail: "Two standard sets, then a super tie-break to 10 if the match is level.", scoring: "Golden Point · tie-break to 7" },
          { name: "Classic Full", detail: "First to two standard sets to 6, with a full third set when needed.", scoring: "Advantage · tie-break to 7" },
          { name: "Fast", detail: "One standard set to 6 for a complete but time-conscious match.", scoring: "Golden Point · tie-break to 7" },
          { name: "Mini Set", detail: "One short set to 4, ideal for a warm-up, training, or a short booking.", scoring: "Golden Point · tie-break at 4–4" },
          { name: "Best of 3 Mini Sets", detail: "Short sets to 4. The first team to win two sets wins the match.", scoring: "Golden Point · tie-break at 4–4" },
        ],
        deviceLabel: "One match. Two natural ways to score.",
        deviceTitle: "Set up on iPhone. Keep score from the wrist.",
        phoneTitle: "iPhone", phoneCopy: "Choose players, format, and first serving team, or score on the phone when no Watch is available.",
        watchTitle: "Apple Watch", watchCopy: "Use the large on-court controls to record the next point while serving information stays visible.",
        watchViewerLabel: "Apple Watch first",
        watchViewerEntry: "Entry screen",
        watchViewerLive: "Live score",
        watchViewerEntryAlt: "Padelly Apple Watch entry screen waiting for a match",
        watchViewerLiveAlt: "Padelly live score controls on Apple Watch",
        phoneViewerLabel: "iPhone companion",
      },
      de: {
        previewLabel: "In Padelly",
        tourTitle: "Auf dem iPhone starten. Am Handgelenk zählen.",
        tourCopy: "Die Apple Watch steht im Mittelpunkt des Live-Matches. Das iPhone bleibt für Einrichtung, Verlauf und Analytics dabei.",
        steps: [
          { label: "Schnellstart", scene: "home", title: "Mit dem vertrauten Match beginnen.", copy: "Eine letzte Konfiguration fortsetzen oder im Play-Bereich neu starten.", alt: "Padelly-Startbildschirm mit Schnellstart auf dem iPhone" },
          { label: "Einrichten", scene: "match-setup", title: "Die Form des Matches wählen.", copy: "Einzel oder Doppel, Format und erstes Aufschlagteam vor dem ersten Ball festlegen.", alt: "Padelly-Match-Einrichtung auf dem iPhone" },
          { label: "Live zählen", scene: "live-score", title: "Den Court im Blick behalten.", copy: "Große, klare Bedienelemente machen den nächsten Punkt zum schnellen Tap. Die Aufschlaginfo bleibt nah.", alt: "Padelly-Live-Zähler auf dem iPhone" },
          { label: "Undo + Aufschlag", scene: "live-score", title: "Den Punkt korrigieren, nicht den Rhythmus.", copy: "Undo stellt Punktestand und Aufschlag auch über Spiele, Sätze und Tiebreaks hinweg wieder her.", alt: "Padelly-Live-Zähler mit Undo und Aufschlag auf dem iPhone" },
          { label: "Verlauf", scene: "history", title: "Das Ergebnis sinnvoll behalten.", copy: "Abgeschlossene Matches bleiben lokal mit Punkten, Dauer, Spielerprofilen und Verlauf.", alt: "Padelly-Matchverlauf auf dem iPhone" },
          { label: "Analytics", scene: "analytics", title: "Muster nach dem Match erkennen.", copy: "Übersicht, Form, persönliche Bestwerte und Point Quality machen abgeschlossene Matches nützlicher.", alt: "Padelly-Analytics auf dem iPhone" },
          { label: "Darstellung", scene: "settings-colors", title: "Den Court zu deinem machen.", copy: "Darstellung und Teamfarben wählen, ohne das Match zu überladen.", alt: "Padelly-Darstellung und Teamfarben auf dem iPhone" },
        ],
        formatLabel: "Matchmodus wählen",
        formatTitle: "Fünf echte Formate. Eine klare Entscheidung.",
        formatCopy: "Ein Format antippen, um die echten Startregeln zu sehen. Der vollständige, crawlbare Vergleich bleibt für jedes Format verfügbar.",
        fullComparison: "Alle Zählweisen vergleichen",
        formats: [
          { name: "Deutsches Club-Match", detail: "Zwei Standardsätze, bei Satzgleichstand ein Super-Tiebreak bis 10.", scoring: "Golden Point · Tiebreak bis 7" },
          { name: "Klassisches Match", detail: "Zwei Gewinnsätze bis 6, bei Bedarf mit vollem dritten Satz.", scoring: "Vorteil · Tiebreak bis 7" },
          { name: "Fast Match", detail: "Ein Standardsatz bis 6 für ein vollständiges, aber zeitsparendes Match.", scoring: "Golden Point · Tiebreak bis 7" },
          { name: "Mini-Set-Match", detail: "Ein kurzer Satz bis 4, ideal für Training oder eine kurze Courtzeit.", scoring: "Golden Point · Tiebreak bei 4:4" },
          { name: "Best of 3 Mini-Sets", detail: "Kurze Sätze bis 4. Wer zuerst zwei Sätze gewinnt, gewinnt das Match.", scoring: "Golden Point · Tiebreak bei 4:4" },
        ],
        deviceLabel: "Ein Match. Zwei natürliche Wege zum Zählen.",
        deviceTitle: "Auf dem iPhone einrichten. Am Handgelenk zählen.",
        phoneTitle: "iPhone", phoneCopy: "Spieler, Format und erstes Aufschlagteam wählen. Ohne Watch auch auf dem iPhone zählen.",
        watchTitle: "Apple Watch", watchCopy: "Die großen Bedienelemente am Court nutzen. Die Aufschlaginfo bleibt sichtbar.",
        watchViewerLabel: "Apple Watch zuerst",
        watchViewerEntry: "Startbildschirm",
        watchViewerLive: "Live zählen",
        watchViewerEntryAlt: "Padelly-Startbildschirm auf der Apple Watch, bereit für ein Match",
        watchViewerLiveAlt: "Padelly-Live-Zähler auf der Apple Watch",
        phoneViewerLabel: "iPhone-Begleiter",
      },
      es: {
        previewLabel: "Dentro de Padelly",
        tourTitle: "Configura en iPhone. Cuenta desde la muñeca.",
        tourCopy: "Apple Watch ocupa el centro del partido. El iPhone acompaña la configuración, el historial y Analytics.",
        steps: [
          { label: "Inicio rápido", scene: "home", title: "Empezar con el partido que conoces.", copy: "Retoma una configuración reciente o empieza de cero desde la pantalla Jugar.", alt: "Pantalla de inicio de Padelly con Inicio rápido en iPhone" },
          { label: "Configurar", scene: "match-setup", title: "Elegir la forma del partido.", copy: "Selecciona individual o dobles, el formato y quién saca primero antes de la primera bola.", alt: "Pantalla de configuración de partido de Padelly en iPhone" },
          { label: "Marcador", scene: "live-score", title: "Mantén la atención en la pista.", copy: "Los controles grandes y claros convierten el siguiente punto en un toque rápido, con el saque siempre a mano.", alt: "Pantalla de marcador en directo de Padelly en iPhone" },
          { label: "Deshacer + saque", scene: "live-score", title: "Recupera el punto, no el ritmo.", copy: "Deshacer restaura marcador y saque incluso entre juegos, sets y tiebreaks.", alt: "Marcador en directo de Padelly con deshacer y saque en iPhone" },
          { label: "Historial", scene: "history", title: "Haz que el resultado siga siendo útil.", copy: "Los partidos terminados se guardan en local con marcador, duración, jugadores e historial.", alt: "Historial de partidos de Padelly en iPhone" },
          { label: "Analytics", scene: "analytics", title: "Descubre patrones después del partido.", copy: "El resumen, la forma, los récords personales y la calidad de los puntos convierten el historial en contexto útil.", alt: "Analytics de Padelly en iPhone" },
          { label: "Apariencia", scene: "settings-colors", title: "Haz tuya la pista.", copy: "Elige apariencia y colores de equipo sin distraer del partido.", alt: "Pantalla de apariencia y colores de equipo de Padelly en iPhone" },
        ],
        formatLabel: "Elige tu modo de partido",
        formatTitle: "Cinco formatos reales. Una decisión clara.",
        formatCopy: "Toca un formato para ver sus reglas reales de lanzamiento. La comparación completa y rastreable sigue disponible para cada formato.",
        fullComparison: "Comparar todos los formatos",
        formats: [
          { name: "Partido de club alemán", detail: "Dos sets estándar y, si hay empate, un súper tiebreak a 10.", scoring: "Punto de oro · tiebreak a 7" },
          { name: "Partido clásico completo", detail: "Dos sets estándar a 6, con tercer set completo cuando sea necesario.", scoring: "Ventaja · tiebreak a 7" },
          { name: "Partido rápido", detail: "Un set estándar a 6 para un partido completo que cuida el tiempo.", scoring: "Punto de oro · tiebreak a 7" },
          { name: "Partido de mini set", detail: "Un set corto a 4, ideal para entrenar o reservar poco tiempo.", scoring: "Punto de oro · tiebreak en 4–4" },
          { name: "Mejor de 3 mini sets", detail: "Sets cortos a 4. Gana el partido quien consiga dos sets.", scoring: "Punto de oro · tiebreak en 4–4" },
        ],
        deviceLabel: "Un partido. Dos maneras naturales de contar.",
        deviceTitle: "Configura en iPhone. Cuenta desde la muñeca.",
        phoneTitle: "iPhone", phoneCopy: "Elige jugadores, formato y primer equipo al saque. Sin Watch, también puedes contar desde el teléfono.",
        watchTitle: "Apple Watch", watchCopy: "Usa los controles grandes en pista y mantén la información de saque visible.",
        watchViewerLabel: "Apple Watch primero",
        watchViewerEntry: "Pantalla de inicio",
        watchViewerLive: "Marcador",
        watchViewerEntryAlt: "Pantalla de inicio de Padelly en Apple Watch, lista para un partido",
        watchViewerLiveAlt: "Controles de marcador de Padelly en Apple Watch",
        phoneViewerLabel: "iPhone compañero",
      },
    };

    return copy[locale] || copy.en;
  }

  function createElement(name, className, text) {
    const element = document.createElement(name);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function screenshotBase(scene) {
    return "/assets/screenshots/" + scene + "-" + currentPreset;
  }

  function screenshotDimensions(scene, platform) {
    if (platform === "watchos") {
      return { widths: [320, 416], width: 320, height: 382 };
    }

    if (scene === "home" || scene === "live-score") {
      return { widths: [640, 960], width: 640, height: 1392 };
    }

    return { widths: [480, 720], width: 480, height: 1044 };
  }

  function setScreenshotSource(image, scene, platform) {
    const dimensions = screenshotDimensions(scene, platform);
    image.dataset.screenshotScene = scene;
    image.dataset.screenshotPlatform = platform;
    image.dataset.screenshotWidths = dimensions.widths.join(",");
    image.width = dimensions.width;
    image.height = dimensions.height;
    guardScreenshot(image);
    updateScreenshot(image);
  }

  function createScreenshot(scene, locale, alt, options) {
    const settings = options || {};
    const platform = settings.platform || "ios";
    const dimensions = screenshotDimensions(scene, platform);
    const widths = settings.widths || dimensions.widths;
    const image = document.createElement("img");
    const base = screenshotBase(scene);

    image.className = settings.className || "";
    image.dataset.screenshotScene = scene;
    image.dataset.screenshotPlatform = platform;
    image.dataset.screenshotWidths = widths.join(",");
    image.src = base + "-" + widths[0] + ".webp";
    image.srcset = widths.map(function (width) { return base + "-" + width + ".webp " + width + "w"; }).join(", ");
    image.sizes = settings.sizes || "(max-width: 820px) 84vw, 420px";
    image.width = widths[0];
    image.height = settings.height || (widths[0] === dimensions.width ? dimensions.height : platform === "watchos" ? 382 : widths[0] === 640 ? 1392 : 1044);
    image.alt = alt;
    image.loading = settings.loading || "lazy";
    image.decoding = "async";
    guardScreenshot(image);
    return image;
  }

  function formatRoute(locale) {
    return locale === "de"
      ? "padel-zaehlweisen/"
      : locale === "es"
        ? "formatos-de-puntuacion-de-padel/"
        : "padel-scoring-formats/";
  }

  function mountProductTour(main, copy, locale) {
    const hero = main.querySelector(".hero");
    if (!hero || main.querySelector(".product-tour")) return;

    const section = createElement("section", "product-tour section");
    const intro = createElement("div", "product-tour-intro");
    const label = createElement("p", "section-label", copy.previewLabel);
    const title = createElement("h2", "product-tour-title", copy.tourTitle);
    const description = createElement("p", "product-tour-copy", copy.tourCopy);
    const stage = createElement("div", "product-tour-stage");
    const tabList = createElement("div", "product-tour-tabs");
    const layout = createElement("div", "product-tour-layout");
    const controls = createElement("div", "product-tour-controls");
    const visual = createElement("div", "product-tour-visual");
    const devices = createElement("div", "product-tour-devices");
    const watchDevice = createElement("div", "product-tour-device product-tour-device--watch");
    const watchLabel = createElement("p", "product-tour-device-label", copy.watchViewerLabel);
    const watchTabs = createElement("div", "product-tour-watch-tabs");
    const watchEntryButton = createElement("button", "product-tour-watch-tab", copy.watchViewerEntry);
    const watchLiveButton = createElement("button", "product-tour-watch-tab", copy.watchViewerLive);
    const watchPanel = createElement("div", "product-tour-watch-panel");
    const watchFrame = createElement("div", "product-tour-watch-frame");
    const watchImage = createScreenshot("quick-start", locale, copy.watchViewerEntryAlt, {
      platform: "watchos",
      className: "product-tour-watch-shot",
      loading: "eager",
      sizes: "(max-width: 680px) 50vw, 190px",
    });
    const phoneDevice = createElement("div", "product-tour-device product-tour-device--phone");
    const phoneLabel = createElement("p", "product-tour-device-label", copy.phoneViewerLabel);
    const frame = createElement("div", "product-tour-phone");
    const screen = createElement("div", "product-tour-screen");
    const detail = createElement("div", "product-tour-detail");
    const stepCount = createElement("p", "product-tour-count");
    const detailTitle = createElement("h3");
    const detailCopy = createElement("p");
    const image = createScreenshot(copy.steps[0].scene, locale, copy.steps[0].alt, {
      className: "product-tour-shot",
      loading: "eager",
      sizes: "(max-width: 680px) 74vw, (max-width: 1040px) 42vw, 420px",
    });
    const buttons = [];
    const watchButtons = [watchEntryButton, watchLiveButton];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeIndex = 0;
    let touchStartX = null;
    let touchPointerId = null;

    section.id = "see-padelly";
    section.setAttribute("aria-labelledby", "product-tour-heading");
    title.id = "product-tour-heading";
    tabList.setAttribute("role", "tablist");
    tabList.setAttribute("aria-label", copy.previewLabel);
    screen.id = "product-tour-panel";
    screen.setAttribute("role", "tabpanel");
    watchTabs.setAttribute("role", "tablist");
    watchTabs.setAttribute("aria-label", copy.watchViewerLabel);
    watchPanel.id = "product-tour-watch-panel";
    watchPanel.setAttribute("role", "tabpanel");
    watchEntryButton.type = "button";
    watchLiveButton.type = "button";
    watchEntryButton.id = "product-tour-watch-entry";
    watchLiveButton.id = "product-tour-watch-live";
    watchButtons.forEach(function (button) {
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", watchPanel.id);
      button.tabIndex = -1;
    });
    detail.setAttribute("aria-live", "polite");
    detail.setAttribute("aria-atomic", "true");

    function setWatchScene(scene, alt, selectedButton) {
      watchButtons.forEach(function (button) {
        const isSelected = button === selectedButton;
        button.setAttribute("aria-selected", isSelected ? "true" : "false");
        button.tabIndex = isSelected ? 0 : -1;
      });
      watchPanel.setAttribute("aria-labelledby", selectedButton.id);
      watchImage.alt = alt;
      setScreenshotSource(watchImage, scene, "watchos");
    }

    watchEntryButton.addEventListener("click", function () {
      setWatchScene("quick-start", copy.watchViewerEntryAlt, watchEntryButton);
    });
    watchLiveButton.addEventListener("click", function () {
      setWatchScene("watch-point-score", copy.watchViewerLiveAlt, watchLiveButton);
    });
    watchTabs.addEventListener("keydown", function (event) {
      const currentIndex = watchButtons.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % watchButtons.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + watchButtons.length) % watchButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = watchButtons.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      const nextButton = watchButtons[nextIndex];
      nextButton.click();
      nextButton.focus();
    });

    copy.steps.forEach(function (step, index) {
      const button = createElement("button", "product-tour-tab", step.label);
      button.type = "button";
      button.id = "product-tour-tab-" + index;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", screen.id);
      button.setAttribute("aria-selected", index === 0 ? "true" : "false");
      button.tabIndex = index === 0 ? 0 : -1;
      button.addEventListener("click", function () { selectStep(index, true); });
      buttons.push(button);
      tabList.append(button);
    });

    function selectStep(index, shouldAnimate) {
      activeIndex = Math.max(0, Math.min(index, copy.steps.length - 1));
      const step = copy.steps[activeIndex];
      buttons.forEach(function (button, buttonIndex) {
        const isSelected = buttonIndex === activeIndex;
        button.setAttribute("aria-selected", isSelected ? "true" : "false");
        button.tabIndex = isSelected ? 0 : -1;
      });
      screen.setAttribute("aria-labelledby", buttons[activeIndex].id);
      image.alt = step.alt;
      setScreenshotSource(image, step.scene, "ios");
      stepCount.textContent = (activeIndex + 1) + " / " + copy.steps.length;
      detailTitle.textContent = step.title;
      detailCopy.textContent = step.copy;

      if (shouldAnimate && !reduceMotion.matches) {
        screen.classList.remove("is-changing");
        void screen.offsetWidth;
        screen.classList.add("is-changing");
      }

      if (shouldAnimate && tabList.scrollWidth > tabList.clientWidth) {
        buttons[activeIndex].scrollIntoView({
          block: "nearest",
          inline: "center",
          behavior: reduceMotion.matches ? "auto" : "smooth",
        });
      }
    }

    tabList.addEventListener("keydown", function (event) {
      const currentIndex = buttons.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = buttons.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      selectStep(nextIndex, true);
      buttons[nextIndex].focus();
    });

    screen.addEventListener("animationend", function () {
      screen.classList.remove("is-changing");
    });

    screen.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "touch") return;
      touchStartX = event.clientX;
      touchPointerId = event.pointerId;
      if (typeof screen.setPointerCapture === "function") screen.setPointerCapture(event.pointerId);
    });

    screen.addEventListener("pointerup", function (event) {
      if (event.pointerId !== touchPointerId || touchStartX === null) return;
      const distance = event.clientX - touchStartX;
      touchStartX = null;
      touchPointerId = null;
      if (Math.abs(distance) < 44) return;
      if (distance < 0 && activeIndex < buttons.length - 1) selectStep(activeIndex + 1, true);
      if (distance > 0 && activeIndex > 0) selectStep(activeIndex - 1, true);
    });

    screen.addEventListener("pointercancel", function () {
      touchStartX = null;
      touchPointerId = null;
    });

    intro.append(label, title, description);
    watchTabs.append(watchEntryButton, watchLiveButton);
    watchPanel.append(watchImage);
    watchFrame.append(watchPanel);
    watchDevice.append(watchLabel, watchTabs, watchFrame);
    screen.append(image);
    frame.append(screen);
    phoneDevice.append(phoneLabel, frame);
    devices.append(watchDevice, phoneDevice);
    visual.append(devices);
    detail.append(stepCount, detailTitle, detailCopy);
    controls.append(detail);
    layout.append(controls, visual);
    stage.append(tabList, layout);
    section.append(intro, stage);
    hero.insertAdjacentElement("afterend", section);
    setWatchScene("quick-start", copy.watchViewerEntryAlt, watchEntryButton);
    selectStep(0, false);
  }

  function mountFormatExplorer(main, copy, locale) {
    const anchor = main.querySelector(".court-intro");
    if (!anchor || main.querySelector(".format-explorer")) return;

    const section = createElement("section", "format-explorer section");
    const heading = createElement("div", "format-explorer-heading");
    const label = createElement("p", "section-label", copy.formatLabel);
    const title = createElement("h2", "format-explorer-title", copy.formatTitle);
    const description = createElement("p", "format-explorer-copy", copy.formatCopy);
    const layout = createElement("div", "format-explorer-layout");
    const choices = createElement("div", "format-explorer-tabs");
    const result = createElement("div", "format-explorer-result");
    const resultName = createElement("h3");
    const resultDetail = createElement("p");
    const resultScoring = createElement("p", "format-explorer-scoring");
    const link = createElement("a", "format-explorer-link", copy.fullComparison + " →");
    const buttons = [];

    section.setAttribute("aria-labelledby", "format-explorer-heading");
    title.id = "format-explorer-heading";
    choices.setAttribute("role", "tablist");
    choices.setAttribute("aria-label", copy.formatLabel);
    result.setAttribute("role", "tabpanel");
    link.href = formatRoute(locale);

    copy.formats.forEach(function (format, index) {
      const button = createElement("button", "format-explorer-tab", format.name);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", index === 0 ? "true" : "false");
      button.addEventListener("click", function () { selectFormat(index); });
      buttons.push(button);
      choices.append(button);
    });

    function selectFormat(index) {
      const format = copy.formats[index];
      buttons.forEach(function (button, buttonIndex) {
        button.setAttribute("aria-selected", buttonIndex === index ? "true" : "false");
      });
      resultName.textContent = format.name;
      resultDetail.textContent = format.detail;
      resultScoring.textContent = format.scoring;
    }

    heading.append(label, title, description);
    result.append(resultName, resultDetail, resultScoring, link);
    layout.append(choices, result);
    section.append(heading, layout);
    anchor.insertAdjacentElement("afterend", section);
    selectFormat(0);
  }

  function mountDeviceComparison(main, copy, locale) {
    const anchor = main.querySelector(".format-explorer");
    if (!anchor || main.querySelector(".device-comparison")) return;

    const section = createElement("section", "device-comparison section");
    const heading = createElement("div", "device-comparison-heading");
    const label = createElement("p", "section-label", copy.deviceLabel);
    const title = createElement("h2", "device-comparison-title", copy.deviceTitle);
    const cards = createElement("div", "device-comparison-cards");

    function makeCard(kind, titleText, descriptionText, image) {
      const card = createElement("article", "device-comparison-card device-comparison-card--" + kind);
      const art = createElement("div", "device-comparison-art");
      const copyWrap = createElement("div", "device-comparison-copy");
      const cardTitle = createElement("h3", null, titleText);
      const cardCopy = createElement("p", null, descriptionText);
      art.append(image);
      copyWrap.append(cardTitle, cardCopy);
      card.append(art, copyWrap);
      return card;
    }

    heading.append(label, title);
    cards.append(
      makeCard("phone", copy.phoneTitle, copy.phoneCopy, createScreenshot("live-score", locale, copy.phoneTitle + " Padelly live score", { className: "device-comparison-phone-shot" })),
      makeCard("watch", copy.watchTitle, copy.watchCopy, createScreenshot("watch-point-score", locale, copy.watchTitle + " Padelly live score", { platform: "watchos", className: "device-comparison-watch-shot", sizes: "260px" }))
    );
    section.append(heading, cards);
    anchor.insertAdjacentElement("afterend", section);
  }

  function configureStoreLinks() {
    // Store links are intentionally absent until a verified public listing exists.
  }

  function mountJourneyProgress() {
    if (document.querySelector(".journey-progress")) return;
    const progress = createElement("div", "journey-progress");
    const fill = createElement("span");
    let framePending = false;
    progress.setAttribute("aria-hidden", "true");
    progress.append(fill);
    document.body.append(progress);

    function update() {
      framePending = false;
      const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      fill.style.transform = "scaleX(" + Math.min(1, Math.max(0, window.scrollY / total)).toFixed(4) + ")";
    }

    function schedule() {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
  }

  function mountHomepageExperience() {
    const locale = currentLocale();
    const copy = homepageCopy(locale);
    const main = document.querySelector("main");
    const isHomepage = Boolean(main && main.querySelector(".hero") && main.querySelector(".facts-panel"));

    configureStoreLinks();
    if (!isHomepage) return;

    mountProductTour(main, copy, locale);
    mountFormatExplorer(main, copy, locale);
    mountJourneyProgress();
  }

  function onSystemAppearanceChange() {
    if (currentAppearance === "system") {
      updateThemeColor();
      updateVisibleAppIcons();
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
            updateVisibleAppIcons();
            syncPicker(picker, currentAppearance);
            closeMenu(picker, true);
          } else if (type === "preset") {
            currentPreset = presets.includes(value) ? value : "ultra";
            root.dataset.preset = currentPreset;
            savePreference(presetKey, currentPreset);
            updateScreenshots();
            syncPicker(picker, currentPreset);
            closeMenu(picker, true);
          } else if (type === "language") {
            const language = ["en", "de", "es"].includes(value) ? value : null;
            if (language) savePreference(languageKey, language);
            closeMenu(picker, false);
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

    document.querySelectorAll(".footer-languages a[lang]").forEach(function (link) {
      link.addEventListener("click", function () {
        const language = link.lang;
        if (["en", "de", "es"].includes(language)) savePreference(languageKey, language);
      });
    });

    enhanceHeroPresentation();
    mountHomepageExperience();

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
