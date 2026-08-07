import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const profiles = ["neon", "court", "ultra"];
const scenes = {
  home: [640, 960],
  history: [480, 720],
  "live-score": [480, 640, 720, 960],
  "match-setup": [480, 720],
  "settings-colors": [480, 720],
  "watch-point-score": [320, 416],
};

test("every published scene has responsive assets for all color profiles", async () => {
  for (const [scene, widths] of Object.entries(scenes)) {
    for (const profile of profiles) {
      for (const width of widths) {
        const asset = new URL(`../assets/screenshots/${scene}-${profile}-${width}.webp`, import.meta.url);
        const details = await stat(asset);
        assert.ok(details.size > 0, `${scene}-${profile}-${width}.webp is empty`);
      }
    }
  }
});

test("managed screenshots defer loading and provide Ultra Court no-script fallbacks", async () => {
  const pages = [
    "../index.html",
    "../de/index.html",
    "../es/index.html",
    "../apple-watch-padel-scoring/index.html",
    "../de/padel-zaehlen-mit-apple-watch/index.html",
    "../es/marcador-de-padel-en-apple-watch/index.html",
  ];

  for (const page of pages) {
    const source = await readFile(new URL(page, import.meta.url), "utf8");
    const managedImages = source.match(/<img [^>]*data-screenshot-scene=[^>]*>/g) || [];
    assert.ok(managedImages.length > 0, `${page} has no managed screenshots`);
    for (const image of managedImages) {
      assert.match(image, /^<img hidden /);
      assert.doesNotMatch(image, /\ssrc=/);
      assert.doesNotMatch(image, /\ssrcset=/);
      assert.match(image, /width="\d+" height="\d+"/);
    }
    assert.match(source, /<noscript><img src="\/assets\/screenshots\/[^"]+-ultra-\d+\.webp" srcset="[^"]+ \d+w, [^"]+ \d+w"/);
  }
});

test("the preset picker updates screenshot URLs immediately", async () => {
  const source = await readFile(new URL("../assets/site.js", import.meta.url), "utf8");
  assert.match(source, /function screenshotBase\(scene\)[\s\S]*scene \+ "-" \+ currentPreset/);
  assert.match(source, /type === "preset"[\s\S]*savePreference\(presetKey, currentPreset\);[\s\S]*updateScreenshots\(\);/);
  assert.doesNotMatch(source, /screenshots\/" \+ platform/);
});
