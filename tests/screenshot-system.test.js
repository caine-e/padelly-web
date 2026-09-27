import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile(new URL("../tools/app-screenshots/manifest.json", import.meta.url), "utf8"));

test("every published Apple scene has localized light and dark assets", async () => {
  for (const platform of ["ios", "watchos"]) {
    const { scenes, widths } = manifest.platforms[platform];
    for (const scene of scenes) {
      for (const locale of Object.keys(manifest.locales)) {
        for (const appearance of manifest.appearances) {
          for (const width of widths) {
            const name = `${scene}-${locale}-${appearance}-${width}.webp`;
            const asset = new URL(`../assets/screenshots/${platform}/${name}`, import.meta.url);
            const details = await stat(asset);
            assert.ok(details.size > 0, `${platform}/${name} is empty`);
          }
        }
      }
    }
  }
});

test("homepage and Watch guide render locale-matched screenshots without JavaScript", async () => {
  const routes = [
    ["../index.html", "en"],
    ["../de/index.html", "de"],
    ["../es/index.html", "es"],
    ["../apple-watch-padel-scoring/index.html", "en"],
    ["../de/padel-zaehlen-mit-apple-watch/index.html", "de"],
    ["../es/marcador-de-padel-en-apple-watch/index.html", "es"],
  ];

  for (const [route, locale] of routes) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    const images = source.match(/<img [^>]*data-screenshot-scene=[^>]*>/g) || [];
    assert.ok(images.length > 0, `${route} has no managed screenshots`);
    for (const image of images) {
      assert.match(image, new RegExp(`src="/assets/screenshots/(ios|watchos)/[^"]+-${locale}-light-\\d+\\.webp\\?v=20260927c"`));
      assert.match(image, /width="\d+" height="\d+"/);
      assert.doesNotMatch(image, /<img hidden /);
    }
  }
});

test("appearance and language choices update the current screenshot matrix", async () => {
  const source = await readFile(new URL("../assets/site.js", import.meta.url), "utf8");
  assert.match(source, /function effectiveAppearance\(\)/);
  assert.match(source, /function screenshotPath\(image, language, appearance, width\)/);
  assert.match(source, /setScreenshot\(image, locale\(\), effectiveAppearance\(\)\)/);
  assert.match(source, /darkQuery\.addEventListener\("change"/);
  assert.doesNotMatch(source, /currentPreset|presetKey|screenshotBase/);
});
