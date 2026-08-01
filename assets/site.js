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

  function updateScreenshots() {
    const locale = ["en", "de", "es"].includes(root.lang) ? root.lang : "en";
    const appearance = effectiveAppearance();

    document.querySelectorAll("[data-screenshot-scene][data-screenshot-platform]").forEach(function (image) {
      const scene = image.dataset.screenshotScene;
      const platform = image.dataset.screenshotPlatform;
      const widths = (image.dataset.screenshotWidths || "")
        .split(",")
        .map(function (value) { return value.trim(); })
        .filter(Boolean);

      if (!scene || !platform || !widths.length) return;

      const base = "/assets/screenshots/" + platform + "/" + scene + "-" + locale + "-" + appearance;
      image.src = base + "-" + widths[0] + ".webp";
      image.srcset = widths.map(function (width) {
        return base + "-" + width + ".webp " + width + "w";
      }).join(", ");
    });
  }

  updateThemeColor();
  updateScreenshots();

  // Keep device choice in one place. The query override makes both hero states
  // easy to inspect without relying on a particular browser or device.
  function resolveHeroDeviceMode() {
    const requested = new URLSearchParams(window.location.search).get("device");
    if (requested === "ios" || requested === "android") return requested;

    const userAgent = navigator.userAgent || "";
    const isWebKit = /AppleWebKit/i.test(userAgent);
    const isPhoneOrTablet = /iPhone|iPad|iPod/i.test(userAgent);
    const isDesktopModeIPad = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;

    return isWebKit && (isPhoneOrTablet || isDesktopModeIPad) ? "ios" : "android";
  }

  const heroDeviceMode = resolveHeroDeviceMode();
  root.dataset.deviceMode = heroDeviceMode;

  function heroCopy(locale) {
    const copy = {
      en: {
        iosLabel: "iPhone experience",
        androidLabel: "Android preview",
        androidAria: "Representative Android app preview. Android availability is coming soon.",
        androidEyebrow: "Android app preview",
        androidAvailability: "Google Play availability coming soon",
        quickStart: "Quick Start",
        matchType: "Doubles",
        matchFormat: "Fast Match",
        startMatch: "Start match",
        preview: "Preview",
      },
      de: {
        iosLabel: "iPhone-Erlebnis",
        androidLabel: "Android-Vorschau",
        androidAria: "Repräsentative Android-App-Vorschau. Android ist bald verfügbar.",
        androidEyebrow: "Android-App-Vorschau",
        androidAvailability: "Google Play ist bald verfügbar",
        quickStart: "Schnellstart",
        matchType: "Doppel",
        matchFormat: "Schnelles Match",
        startMatch: "Match starten",
        preview: "Vorschau",
      },
      es: {
        iosLabel: "Experiencia en iPhone",
        androidLabel: "Vista previa de Android",
        androidAria: "Vista previa representativa de la app Android. Android estará disponible próximamente.",
        androidEyebrow: "Vista previa de la app Android",
        androidAvailability: "Google Play estará disponible próximamente",
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

    if (heroDeviceMode === "android" && hero) {
      const eyebrow = hero.querySelector(".eyebrow");
      const availability = hero.querySelector(".availability");
      if (eyebrow) eyebrow.textContent = copy.androidEyebrow;
      if (availability) availability.textContent = copy.androidAvailability;
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

  // Store values deliberately live in one configuration object. Leave every
  // value null until a public listing exists: the UI stays useful without
  // inventing a store URL or turning a placeholder into a broken link.
  const storeConfig = Object.freeze({
    appStoreUrl: null,
    googlePlayUrl: null,
    appStoreId: null,
    universalLinkBase: null,
    androidAppLinkBase: null,
  });

  function currentLocale() {
    return ["en", "de", "es"].includes(root.lang) ? root.lang : "en";
  }

  function homepageCopy(locale) {
    const copy = {
      en: {
        tryPadelly: "Try Padelly",
        heroActionSubline: "Interactive preview",
        previewLabel: "Interactive preview",
        tourTitle: "From first point to match point.",
        tourCopy: "A short, guided look at the real Padelly flow. The screenshots are from the app. The controls are a deterministic product preview, not a live account or online match.",
        tourOpen: "Open the full preview",
        steps: [
          { label: "Quick Start", scene: "home", title: "Begin with the match you know.", copy: "Pick up a recent setup or start fresh from the Play screen.", alt: "Padelly home screen with Quick Start on iPhone" },
          { label: "Set up", scene: "match-setup", title: "Choose the shape of the match.", copy: "Select singles or doubles, the format, and who serves first before the first ball.", alt: "Padelly match setup screen on iPhone" },
          { label: "Live score", scene: "live-score", title: "Keep the court in view.", copy: "Large, clear scoring controls make the next point a quick tap, with serving information always close by.", alt: "Padelly live score screen on iPhone" },
          { label: "Undo + serve", scene: "live-score", title: "Recover the point, not the rhythm.", copy: "Undo returns score and serving state across games, sets, and tie-breaks.", alt: "Padelly live score screen with undo and serving information on iPhone" },
          { label: "History", scene: "history", title: "Let the result stay useful.", copy: "Finished matches stay local with scores, duration, player records, and useful history.", alt: "Padelly match history screen on iPhone" },
          { label: "Appearance", scene: "appearance-colors", title: "Make the court yours.", copy: "Choose appearance and team colours without getting in the way of the match.", alt: "Padelly appearance and team colours screen on iPhone" },
        ],
        prototypeTitle: "Try Padelly",
        prototypeLead: "A short interactive preview using real app screenshots.",
        close: "Close preview",
        reset: "Reset demo",
        back: "Back",
        next: "Continue",
        representative: "Representative preview",
        summaryTitle: "Match completed",
        summaryCopy: "A representative result screen based on the current Padelly match-completion flow.",
        summaryResult: "Alex & Sam won",
        summaryScore: "6–4, 6–3",
        summaryDuration: "56 min",
        liveControls: "Demo controls",
        scoreThem: "Them +1",
        scoreYou: "You +1",
        undo: "Undo",
        serving: "Switch serving",
        demoState: "Demo state",
        servingLabel: "Serving",
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
        downloadTitle: "See Padelly in action", downloadSubline: "Store listings are coming soon", mobileDownload: "Try the preview",
        previewQuery: "preview",
      },
      de: {
        tryPadelly: "Padelly ausprobieren",
        heroActionSubline: "Interaktive Vorschau",
        previewLabel: "Interaktive Vorschau",
        tourTitle: "Vom ersten Punkt zum Matchball.",
        tourCopy: "Ein kurzer, geführter Blick auf den echten Padelly-Ablauf. Die Screenshots stammen aus der App. Die Bedienelemente sind eine deterministische Produktvorschau, kein Konto und kein Online-Match.",
        tourOpen: "Vollständige Vorschau öffnen",
        steps: [
          { label: "Schnellstart", scene: "home", title: "Mit dem vertrauten Match beginnen.", copy: "Eine letzte Konfiguration fortsetzen oder im Play-Bereich neu starten.", alt: "Padelly-Startbildschirm mit Schnellstart auf dem iPhone" },
          { label: "Einrichten", scene: "match-setup", title: "Die Form des Matches wählen.", copy: "Einzel oder Doppel, Format und erstes Aufschlagteam vor dem ersten Ball festlegen.", alt: "Padelly-Match-Einrichtung auf dem iPhone" },
          { label: "Live zählen", scene: "live-score", title: "Den Court im Blick behalten.", copy: "Große, klare Bedienelemente machen den nächsten Punkt zum schnellen Tap. Die Aufschlaginfo bleibt nah.", alt: "Padelly-Live-Zähler auf dem iPhone" },
          { label: "Undo + Aufschlag", scene: "live-score", title: "Den Punkt korrigieren, nicht den Rhythmus.", copy: "Undo stellt Punktestand und Aufschlag auch über Spiele, Sätze und Tiebreaks hinweg wieder her.", alt: "Padelly-Live-Zähler mit Undo und Aufschlag auf dem iPhone" },
          { label: "Verlauf", scene: "history", title: "Das Ergebnis sinnvoll behalten.", copy: "Abgeschlossene Matches bleiben lokal mit Punkten, Dauer, Spielerprofilen und Verlauf.", alt: "Padelly-Matchverlauf auf dem iPhone" },
          { label: "Darstellung", scene: "appearance-colors", title: "Den Court zu deinem machen.", copy: "Darstellung und Teamfarben wählen, ohne das Match zu überladen.", alt: "Padelly-Darstellung und Teamfarben auf dem iPhone" },
        ],
        prototypeTitle: "Padelly ausprobieren",
        prototypeLead: "Eine kurze interaktive Vorschau mit echten App-Screenshots.",
        close: "Vorschau schließen",
        reset: "Demo zurücksetzen",
        back: "Zurück",
        next: "Weiter",
        representative: "Repräsentative Vorschau",
        summaryTitle: "Match abgeschlossen",
        summaryCopy: "Ein repräsentativer Ergebnisbildschirm auf Basis des aktuellen Padelly-Abschlussablaufs.",
        summaryResult: "Alex & Sam gewinnen",
        summaryScore: "6–4, 6–3",
        summaryDuration: "56 Min.",
        liveControls: "Demo-Steuerung",
        scoreThem: "Sie +1",
        scoreYou: "Ihr +1",
        undo: "Undo",
        serving: "Aufschlag wechseln",
        demoState: "Demo-Status",
        servingLabel: "Aufschlag",
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
        downloadTitle: "Padelly in Aktion sehen", downloadSubline: "Store-Listings kommen bald", mobileDownload: "Vorschau testen",
        previewQuery: "preview",
      },
      es: {
        tryPadelly: "Probar Padelly",
        heroActionSubline: "Vista previa interactiva",
        previewLabel: "Vista previa interactiva",
        tourTitle: "Del primer punto al punto de partido.",
        tourCopy: "Un recorrido breve por el flujo real de Padelly. Las capturas son de la app. Los controles son una vista previa determinista del producto, no una cuenta ni un partido en línea.",
        tourOpen: "Abrir la vista previa completa",
        steps: [
          { label: "Inicio rápido", scene: "home", title: "Empezar con el partido que conoces.", copy: "Retoma una configuración reciente o empieza de cero desde la pantalla Jugar.", alt: "Pantalla de inicio de Padelly con Inicio rápido en iPhone" },
          { label: "Configurar", scene: "match-setup", title: "Elegir la forma del partido.", copy: "Selecciona individual o dobles, el formato y quién saca primero antes de la primera bola.", alt: "Pantalla de configuración de partido de Padelly en iPhone" },
          { label: "Marcador", scene: "live-score", title: "Mantén la atención en la pista.", copy: "Los controles grandes y claros convierten el siguiente punto en un toque rápido, con el saque siempre a mano.", alt: "Pantalla de marcador en directo de Padelly en iPhone" },
          { label: "Deshacer + saque", scene: "live-score", title: "Recupera el punto, no el ritmo.", copy: "Deshacer restaura marcador y saque incluso entre juegos, sets y tiebreaks.", alt: "Marcador en directo de Padelly con deshacer y saque en iPhone" },
          { label: "Historial", scene: "history", title: "Haz que el resultado siga siendo útil.", copy: "Los partidos terminados se guardan en local con marcador, duración, jugadores e historial.", alt: "Historial de partidos de Padelly en iPhone" },
          { label: "Apariencia", scene: "appearance-colors", title: "Haz tuya la pista.", copy: "Elige apariencia y colores de equipo sin distraer del partido.", alt: "Pantalla de apariencia y colores de equipo de Padelly en iPhone" },
        ],
        prototypeTitle: "Probar Padelly",
        prototypeLead: "Una vista previa interactiva breve con capturas reales de la app.",
        close: "Cerrar vista previa",
        reset: "Reiniciar demo",
        back: "Atrás",
        next: "Continuar",
        representative: "Vista previa representativa",
        summaryTitle: "Partido terminado",
        summaryCopy: "Una pantalla de resultado representativa basada en el flujo actual de finalización de Padelly.",
        summaryResult: "Alex y Sam ganan",
        summaryScore: "6–4, 6–3",
        summaryDuration: "56 min",
        liveControls: "Controles de demo",
        scoreThem: "Ellos +1",
        scoreYou: "Tú +1",
        undo: "Deshacer",
        serving: "Cambiar saque",
        demoState: "Estado de demo",
        servingLabel: "Saque",
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
        downloadTitle: "Mira Padelly en acción", downloadSubline: "Las fichas de las tiendas llegarán pronto", mobileDownload: "Probar vista previa",
        previewQuery: "preview",
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

  function screenshotBase(scene, locale, platform) {
    return "/assets/screenshots/" + platform + "/" + scene + "-" + locale + "-" + effectiveAppearance();
  }

  function createScreenshot(scene, locale, alt, options) {
    const settings = options || {};
    const platform = settings.platform || "ios";
    const widths = settings.widths || (platform === "watchos" ? [416] : [640, 960]);
    const image = document.createElement("img");
    const base = screenshotBase(scene, locale, platform);

    image.className = settings.className || "";
    image.dataset.screenshotScene = scene;
    image.dataset.screenshotPlatform = platform;
    image.dataset.screenshotWidths = widths.join(",");
    image.src = base + "-" + widths[0] + ".webp";
    image.srcset = widths.map(function (width) { return base + "-" + width + ".webp " + width + "w"; }).join(", ");
    image.sizes = settings.sizes || "(max-width: 820px) 84vw, 420px";
    image.width = widths[0];
    image.height = settings.height || (platform === "watchos" ? 416 : 1392);
    image.alt = alt;
    image.loading = settings.loading || "lazy";
    image.decoding = "async";
    return image;
  }

  function formatRoute(locale) {
    return locale === "de"
      ? "padel-zaehlweisen/"
      : locale === "es"
        ? "formatos-de-puntuacion-de-padel/"
        : "padel-scoring-formats/";
  }

  function homeRoute(locale) {
    return locale === "en" ? "/" : "/" + locale + "/";
  }

  function mountProductTour(main, copy, locale) {
    const hero = main.querySelector(".hero");
    if (!hero || main.querySelector(".product-tour")) return;

    const section = createElement("section", "product-tour section");
    const intro = createElement("div", "product-tour-intro");
    const label = createElement("p", "section-label", copy.previewLabel);
    const title = createElement("h2", "product-tour-title", copy.tourTitle);
    const description = createElement("p", "product-tour-copy", copy.tourCopy);
    const layout = createElement("div", "product-tour-layout");
    const controls = createElement("div", "product-tour-controls");
    const tabList = createElement("div", "product-tour-tabs");
    const visual = createElement("div", "product-tour-visual");
    const frame = createElement("div", "product-tour-phone");
    const screen = createElement("div", "product-tour-screen");
    const detail = createElement("div", "product-tour-detail");
    const detailTitle = createElement("h3");
    const detailCopy = createElement("p");
    const open = createElement("button", "prototype-open-button", copy.tourOpen);
    const image = createScreenshot(copy.steps[0].scene, locale, copy.steps[0].alt, {
      className: "product-tour-shot",
      loading: "eager",
    });
    const buttons = [];

    section.id = "see-padelly";
    section.setAttribute("aria-labelledby", "product-tour-heading");
    title.id = "product-tour-heading";
    tabList.setAttribute("role", "tablist");
    tabList.setAttribute("aria-label", copy.previewLabel);
    screen.id = "product-tour-panel";
    screen.setAttribute("role", "tabpanel");
    open.type = "button";
    open.dataset.openPrototype = "true";
    open.setAttribute("aria-haspopup", "dialog");

    copy.steps.forEach(function (step, index) {
      const button = createElement("button", "product-tour-tab", step.label);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", screen.id);
      button.setAttribute("aria-selected", index === 0 ? "true" : "false");
      button.addEventListener("click", function () { selectStep(index); });
      buttons.push(button);
      tabList.append(button);
    });

    function selectStep(index) {
      const step = copy.steps[index];
      buttons.forEach(function (button, buttonIndex) {
        button.setAttribute("aria-selected", buttonIndex === index ? "true" : "false");
      });
      image.dataset.screenshotScene = step.scene;
      image.alt = step.alt;
      image.src = screenshotBase(step.scene, locale, "ios") + "-640.webp";
      image.srcset = screenshotBase(step.scene, locale, "ios") + "-640.webp 640w, " + screenshotBase(step.scene, locale, "ios") + "-960.webp 960w";
      detailTitle.textContent = step.title;
      detailCopy.textContent = step.copy;
    }

    intro.append(label, title, description);
    screen.append(image);
    frame.append(screen);
    visual.append(frame);
    detail.append(detailTitle, detailCopy, open);
    controls.append(tabList, detail);
    layout.append(controls, visual);
    section.append(intro, layout);
    hero.insertAdjacentElement("afterend", section);
    selectStep(0);
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
      makeCard("watch", copy.watchTitle, copy.watchCopy, createScreenshot("live-score", locale, copy.watchTitle + " Padelly live score", { platform: "watchos", widths: [416], className: "device-comparison-watch-shot", sizes: "260px" }))
    );
    section.append(heading, cards);
    anchor.insertAdjacentElement("afterend", section);
  }

  function mountPrototype(copy, locale) {
    if (document.querySelector(".prototype-dialog")) return null;

    const dialog = createElement("dialog", "prototype-dialog");
    const shell = createElement("div", "prototype-shell");
    const header = createElement("header", "prototype-header");
    const meta = createElement("div", "prototype-meta");
    const label = createElement("p", "prototype-label", copy.previewLabel);
    const title = createElement("h2", "prototype-title", copy.prototypeTitle);
    const lead = createElement("p", "prototype-lead", copy.prototypeLead);
    const actions = createElement("div", "prototype-header-actions");
    const reset = createElement("button", "prototype-reset", copy.reset);
    const headerNext = createElement("button", "prototype-header-next", "→");
    const close = createElement("button", "prototype-close", "×");
    const body = createElement("div", "prototype-body");
    const progress = createElement("p", "prototype-progress");
    const phone = createElement("div", "prototype-phone");
    const phoneScreen = createElement("div", "prototype-phone-screen");
    const screen = createElement("div", "prototype-screen");
    const caption = createElement("div", "prototype-caption");
    const captionTitle = createElement("h3");
    const captionCopy = createElement("p");
    const navigation = createElement("div", "prototype-navigation");
    const back = createElement("button", "prototype-back", copy.back);
    const next = createElement("button", "prototype-next", copy.next);
    const screenDefinitions = [
      { key: "quick-start", scene: "home", title: copy.steps[0].title, copy: copy.steps[0].copy, alt: copy.steps[0].alt, next: copy.steps[1].label },
      { key: "setup", scene: "match-setup", title: copy.steps[1].title, copy: copy.steps[1].copy, alt: copy.steps[1].alt, next: copy.steps[2].label },
      { key: "players", scene: "match-setup", title: copy.steps[1].title, copy: copy.steps[1].copy, alt: copy.steps[1].alt, next: copy.steps[2].label },
      { key: "live", scene: "live-score", title: copy.steps[2].title, copy: copy.steps[3].copy, alt: copy.steps[3].alt, next: copy.summaryTitle },
      { key: "summary", title: copy.summaryTitle, copy: copy.summaryCopy, next: copy.steps[4].label },
      { key: "history", scene: "history", title: copy.steps[4].title, copy: copy.steps[4].copy, alt: copy.steps[4].alt, next: copy.steps[5].label },
      { key: "settings", scene: "appearance-colors", title: copy.steps[5].title, copy: copy.steps[5].copy, alt: copy.steps[5].alt, next: copy.reset },
    ];
    const scoreLabels = ["0", "15", "30", "40"];
    let index = 0;
    let scoreThem = 2;
    let scoreYou = 1;
    let serving = "Alex";
    let actionsHistory = [];
    let opener = null;

    dialog.hidden = true;
    dialog.setAttribute("aria-labelledby", "prototype-dialog-title");
    dialog.setAttribute("aria-describedby", "prototype-dialog-lead");
    title.id = "prototype-dialog-title";
    lead.id = "prototype-dialog-lead";
    close.type = "button";
    close.setAttribute("aria-label", copy.close);
    reset.type = "button";
    headerNext.type = "button";
    headerNext.setAttribute("aria-label", copy.next);
    back.type = "button";
    next.type = "button";
    screen.setAttribute("aria-live", "polite");
    screen.setAttribute("aria-atomic", "true");

    meta.append(label, title, lead);
    actions.append(reset, headerNext, close);
    header.append(meta, actions);
    phoneScreen.append(screen);
    phone.append(phoneScreen);
    caption.append(captionTitle, captionCopy);
    navigation.append(back, next);
    body.append(progress, phone, caption, navigation);
    shell.append(header, body);
    dialog.append(shell);
    document.body.append(dialog);

    function resetDemo() {
      index = 0;
      scoreThem = 2;
      scoreYou = 1;
      serving = "Alex";
      actionsHistory = [];
      render();
    }

    function demoStatus() {
      return copy.demoState + ": " + scoreLabels[scoreThem] + "–" + scoreLabels[scoreYou] + " · " + copy.servingLabel + ": " + serving;
    }

    function addLiveControls() {
      const controls = createElement("div", "prototype-live-controls");
      const status = createElement("p", "prototype-live-status", demoStatus());
      const titleText = createElement("span", "prototype-live-controls-title", copy.liveControls);
      const scoring = createElement("div", "prototype-live-buttons");
      const them = createElement("button", null, copy.scoreThem);
      const you = createElement("button", null, copy.scoreYou);
      const undo = createElement("button", null, copy.undo);
      const switchServing = createElement("button", null, copy.serving);

      [them, you, undo, switchServing].forEach(function (button) { button.type = "button"; });
      them.addEventListener("click", function () {
        actionsHistory.push({ scoreThem: scoreThem, scoreYou: scoreYou, serving: serving });
        scoreThem = Math.min(scoreThem + 1, scoreLabels.length - 1);
        status.textContent = demoStatus();
      });
      you.addEventListener("click", function () {
        actionsHistory.push({ scoreThem: scoreThem, scoreYou: scoreYou, serving: serving });
        scoreYou = Math.min(scoreYou + 1, scoreLabels.length - 1);
        status.textContent = demoStatus();
      });
      undo.addEventListener("click", function () {
        const previous = actionsHistory.pop();
        if (previous) {
          scoreThem = previous.scoreThem;
          scoreYou = previous.scoreYou;
          serving = previous.serving;
        }
        status.textContent = demoStatus();
      });
      switchServing.addEventListener("click", function () {
        actionsHistory.push({ scoreThem: scoreThem, scoreYou: scoreYou, serving: serving });
        serving = serving === "Alex" ? "Sam" : "Alex";
        status.textContent = demoStatus();
      });
      scoring.append(them, you);
      controls.append(titleText, status, scoring, undo, switchServing);
      screen.append(controls);
    }

    function addSummary() {
      const summary = createElement("div", "prototype-summary");
      const labelText = createElement("p", "prototype-summary-label", copy.representative);
      const result = createElement("h4", null, copy.summaryResult);
      const score = createElement("strong", null, copy.summaryScore);
      const duration = createElement("span", null, copy.summaryDuration);
      const done = createElement("span", "prototype-summary-mark", "✓");
      summary.append(labelText, done, result, score, duration);
      screen.append(summary);
    }

    function render() {
      const definition = screenDefinitions[index];
      screen.replaceChildren();
      progress.textContent = (index + 1) + " / " + screenDefinitions.length;
      captionTitle.textContent = definition.title;
      captionCopy.textContent = definition.copy;
      back.disabled = index === 0;
      next.textContent = definition.next || copy.next;
      headerNext.hidden = index === screenDefinitions.length - 1;
      headerNext.setAttribute("aria-label", definition.next || copy.next);

      if (definition.scene) {
        const image = createScreenshot(definition.scene, locale, definition.alt, {
          className: "prototype-shot",
          loading: "eager",
          sizes: "(max-width: 680px) 74vw, 340px",
        });
        screen.append(image);
        if (definition.key === "live") addLiveControls();
      } else {
        addSummary();
      }

      updateScreenshots();
    }

    function closePrototype() {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.hidden = true;
        document.body.classList.remove("has-prototype-open");
        if (opener) opener.focus();
      }
    }

    function advancePrototype() {
      if (index === screenDefinitions.length - 1) resetDemo();
      else {
        index += 1;
        render();
      }
    }

    function openPrototype(trigger) {
      opener = trigger || document.activeElement;
      resetDemo();
      dialog.hidden = false;
      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
      } else {
        document.body.classList.add("has-prototype-open");
      }
      window.requestAnimationFrame(function () { close.focus(); });
    }

    close.addEventListener("click", closePrototype);
    reset.addEventListener("click", resetDemo);
    headerNext.addEventListener("click", advancePrototype);
    back.addEventListener("click", function () {
      if (index > 0) {
        index -= 1;
        render();
      }
    });
    next.addEventListener("click", advancePrototype);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closePrototype();
    });
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePrototype();
      }
    });
    dialog.addEventListener("close", function () {
      dialog.hidden = true;
      document.body.classList.remove("has-prototype-open");
      if (opener) opener.focus();
    });
    document.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-open-prototype]");
      if (!trigger) return;
      event.preventDefault();
      openPrototype(trigger);
    });

    render();
    return { open: openPrototype };
  }

  function configureStoreLinks() {
    if (storeConfig.appStoreId && !document.querySelector('meta[name="apple-itunes-app"]')) {
      const smartBanner = document.createElement("meta");
      smartBanner.name = "apple-itunes-app";
      smartBanner.content = "app-id=" + storeConfig.appStoreId;
      document.head.append(smartBanner);
    }

    document.querySelectorAll(".store-row").forEach(function (row) {
      const badges = row.querySelectorAll(".store-badge");
      [storeConfig.appStoreUrl, storeConfig.googlePlayUrl].forEach(function (url, index) {
        const badge = badges[index];
        if (!badge) return;
        badge.dataset.storeState = url ? "available" : "coming-soon";
        if (!url || badge.tagName === "A") return;
        const link = document.createElement("a");
        link.className = badge.className.replace("store-badge-unavailable", "").trim();
        link.href = url;
        link.append(...Array.from(badge.childNodes));
        badge.replaceWith(link);
      });
    });
  }

  function createPreviewAction(copy, locale, isHomepage, className) {
    if (isHomepage) {
      const button = createElement("button", className, copy.tryPadelly);
      button.type = "button";
      button.dataset.openPrototype = "true";
      button.setAttribute("aria-haspopup", "dialog");
      return button;
    }

    const link = createElement("a", className, copy.tryPadelly);
    link.href = homeRoute(locale) + "?preview=1#see-padelly";
    return link;
  }

  function mountDownloadSystem(copy, locale, isHomepage) {
    const headerBar = document.querySelector(".header-bar");
    if (!headerBar || headerBar.querySelector(".header-download")) return;

    const headerAction = createPreviewAction(copy, locale, isHomepage, "header-download");
    const headerSmall = createElement("small", null, copy.downloadSubline);
    const mobile = createElement("div", "mobile-download-bar");
    const mobileCopy = createElement("span", "mobile-download-copy");
    const mobileTitle = createElement("strong", null, copy.downloadTitle);
    const mobileSmall = createElement("small", null, copy.downloadSubline);
    const mobileAction = createPreviewAction(copy, locale, isHomepage, "mobile-download-action");

    headerAction.append(headerSmall);
    mobileCopy.append(mobileTitle, mobileSmall);
    mobileAction.textContent = copy.mobileDownload;
    mobile.append(mobileCopy, mobileAction);
    headerBar.append(headerAction);
    document.body.append(mobile);
  }

  function mountHeroPrototypeTrigger(main, copy) {
    const hero = main.querySelector(".hero");
    const storePanel = hero && hero.querySelector(".store-panel");
    const closingCard = main.querySelector(".cta-card");
    if (!hero || !storePanel || hero.querySelector(".hero-prototype-action")) return;

    const action = createElement("button", "hero-prototype-action", copy.tryPadelly);
    const actionSmall = createElement("span", null, copy.heroActionSubline);
    action.type = "button";
    action.dataset.openPrototype = "true";
    action.setAttribute("aria-haspopup", "dialog");
    action.append(actionSmall);
    storePanel.insertAdjacentElement("afterend", action);

    if (closingCard && !closingCard.querySelector(".cta-prototype-action")) {
      const closingAction = createElement("button", "cta-prototype-action", copy.tryPadelly);
      closingAction.type = "button";
      closingAction.dataset.openPrototype = "true";
      closingAction.setAttribute("aria-haspopup", "dialog");
      closingCard.append(closingAction);
    }
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
    mountDownloadSystem(copy, locale, isHomepage);
    if (!isHomepage) return;

    const prototype = mountPrototype(copy, locale);
    mountHeroPrototypeTrigger(main, copy);
    mountProductTour(main, copy, locale);
    mountFormatExplorer(main, copy, locale);
    mountDeviceComparison(main, copy, locale);
    mountJourneyProgress();

    if (prototype && new URLSearchParams(window.location.search).get(copy.previewQuery) === "1") {
      window.requestAnimationFrame(function () { prototype.open(); });
    }
  }

  function onSystemAppearanceChange() {
    if (currentAppearance === "system") {
      updateThemeColor();
      updateScreenshots();
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
            updateScreenshots();
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
