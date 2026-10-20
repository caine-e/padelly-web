import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const preferences = await readFile(new URL("../assets/preferences.js", import.meta.url), "utf8");

test("language URLs remain accessible regardless of browser or stored language", () => {
  for (const path of ["/", "/de/", "/es/"]) {
    for (const language of ["en", "de", "es"]) {
      const destination = `https://getpadelly.com${path}?source=search#inside`;
      const navigations = [];
      const root = { dataset: {} };
      const window = {
        localStorage: { getItem: (key) => key === "padelly-language" ? language : "dark" },
        location: { pathname: path, href: destination, replace: (url) => navigations.push(url) },
      };
      vm.runInNewContext(preferences, {
        window, document: { documentElement: root },
        navigator: { languages: [`${language}-DE`], language }, URL,
      });
      assert.deepEqual(navigations, [], `${path} redirected for ${language}`);
      assert.equal(window.location.href, destination);
      assert.equal(root.dataset.appearance, "dark");
    }
  }
});

test("appearance defaults still work when browser storage is unavailable", () => {
  const root = { dataset: {} };
  vm.runInNewContext(preferences, {
    window: { localStorage: { getItem: () => { throw new Error("Storage denied"); } } },
    document: { documentElement: root },
  });
  assert.equal(root.dataset.appearance, "light");
});
