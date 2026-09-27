# Padelly app screenshot workflow

This Mac-only workflow captures localized light and dark screenshots without
changing either app project. Build from a temporary clean checkout pinned to a
committed revision. Never point build commands at the active Padelly checkout.

## Safety boundary

- Only `assets/screenshots` and ignored `qa-artifacts/app-screenshots` in this
  website repository receive output.
- Raw PNG review files are not copied by `build.sh`.
- Android and Wear OS captures remain review-only while Android is advertised
  as coming soon.
- Use synthetic player names from `manifest.json`. Do not use personal data,
  Apple Health data, notifications, email addresses, or signed-in cloud data.

## Workflow

1. Run `./tools/app-screenshots/capture.sh check`.
2. Clone the app into a temporary directory and check out the recorded commit.
3. Create temporary simulators, build with external derived-data paths, install,
   and configure one locale and appearance at a time.
4. Use accessibility-based computer control to reach the scene.
5. Capture with `capture-apple` or `capture-android`.
6. Review every PNG before running `publish-apple`.
7. Run `verify published`, the site build, and the site audit.

The command help lists the exact subcommands:

```sh
./tools/app-screenshots/capture.sh
```

The website uses only `en`, `de`, and `es` plus `light` and `dark`. Its
`system` appearance resolves to one of those two image variants at runtime.
watchOS uses its native dark interface, so the Watch light and dark assets are
separate files with the same system appearance.

The September 2026 refresh was captured from app commit
`4831e8d2b198cbf71373ff9c2667ef2facaada11` in a disposable checkout.
The iPhone Play, History, and Analytics screens use five synthetic completed
matches with the names in `manifest.json`. Match setup and live scoring are
fresh simulator captures. The Watch quick-start and score screens use a
capture-only Debug fixture with one synthetic planned match and Fitness off,
so no Health permission or personal data appears. The fixture was added only
to the temporary checkout, not the app repository.
