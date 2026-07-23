#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
manifest="$script_dir/manifest.json"
review_root="${PADELLY_SCREENSHOT_REVIEW_DIR:-$repo_root/qa-artifacts/app-screenshots}"
published_root="$repo_root/assets/screenshots"
android_sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"

usage() {
  cat <<'EOF'
Usage:
  capture.sh check
  capture.sh snapshot <app-source>
  capture.sh build-ios <app-source> <simulator-udid> <derived-data>
  capture.sh build-watchos <app-source> <watch-udid> <derived-data>
  capture.sh install-ios <simulator-udid> <derived-data>
  capture.sh install-watchos <watch-udid> <derived-data>
  capture.sh configure-apple <platform> <udid> <locale> <light|dark>
  capture.sh capture-apple <platform> <udid> <scene> <locale> <light|dark>
  capture.sh build-android <app-source> <app|wear>
  capture.sh install-android <serial> <app-source> <app|wear>
  capture.sh configure-android <serial> <locale> <light|dark>
  capture.sh capture-android <platform> <serial> <scene> <locale> <light|dark>
  capture.sh publish-apple <platform> <scene> <locale> <light|dark>
  capture.sh verify [review|published]

Raw PNGs are written below qa-artifacts/app-screenshots and are not deployed.
Only publish-apple writes optimized WebP files below assets/screenshots.
EOF
}

require() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

platform_value() {
  local platform="$1"
  local key="$2"
  jq -er --arg platform "$platform" --arg key "$key" \
    '.platforms[$platform][$key]' "$manifest"
}

bundle_id() {
  platform_value "$1" "bundleId"
}

assert_clean_source() {
  local source="$1"
  git -C "$source" diff --quiet
  git -C "$source" diff --cached --quiet
  if [ -n "$(git -C "$source" status --porcelain --untracked-files=normal)" ]; then
    printf 'App source must be a clean temporary checkout: %s\n' "$source" >&2
    exit 1
  fi
}

apple_app_path() {
  local platform="$1"
  local derived_data="$2"
  if [ "$platform" = "ios" ]; then
    find "$derived_data/Build/Products" -path '*Debug-iphonesimulator/Padelly.app' -print -quit
  else
    find "$derived_data/Build/Products" -path '*Debug-watchsimulator/Padelly Watch App Watch App.app' -print -quit
  fi
}

capture_path() {
  local platform="$1"
  local scene="$2"
  local locale="$3"
  local appearance="$4"
  printf '%s/%s/%s-%s-%s.png' "$review_root" "$platform" "$scene" "$locale" "$appearance"
}

case "${1:-}" in
  check)
    for tool in git jq xcodebuild xcrun cwebp; do
      require "$tool"
    done
    test -x "$android_sdk/platform-tools/adb" || {
      printf 'Missing adb below Android SDK: %s\n' "$android_sdk" >&2
      exit 1
    }
    test -x "$android_sdk/emulator/emulator" || {
      printf 'Missing Android emulator below Android SDK: %s\n' "$android_sdk" >&2
      exit 1
    }
    jq -e . "$manifest" >/dev/null
    printf 'Screenshot tooling and manifest are ready.\n'
    ;;

  snapshot)
    source="${2:?app source is required}"
    printf 'commit=%s\n' "$(git -C "$source" rev-parse HEAD)"
    printf 'status_sha256=%s\n' \
      "$(git -C "$source" status --porcelain=v1 | shasum -a 256 | awk '{print $1}')"
    ;;

  build-ios|build-watchos)
    platform="ios"
    [ "$1" = "build-watchos" ] && platform="watchos"
    source="${2:?app source is required}"
    udid="${3:?simulator udid is required}"
    derived_data="${4:?derived data path is required}"
    assert_clean_source "$source"
    project="$(platform_value "$platform" "project")"
    scheme="$(platform_value "$platform" "scheme")"
    destination_platform="iOS Simulator"
    [ "$platform" = "watchos" ] && destination_platform="watchOS Simulator"
    xcodebuild \
      -project "$source/$project" \
      -scheme "$scheme" \
      -configuration Debug \
      -destination "platform=$destination_platform,id=$udid" \
      -derivedDataPath "$derived_data" \
      CODE_SIGNING_ALLOWED=NO \
      build
    ;;

  install-ios|install-watchos)
    platform="ios"
    [ "$1" = "install-watchos" ] && platform="watchos"
    udid="${2:?simulator udid is required}"
    derived_data="${3:?derived data path is required}"
    app_path="$(apple_app_path "$platform" "$derived_data")"
    test -n "$app_path" || {
      printf 'Built app not found below %s\n' "$derived_data" >&2
      exit 1
    }
    xcrun simctl install "$udid" "$app_path"
    ;;

  configure-apple)
    platform="${2:?platform is required}"
    udid="${3:?simulator udid is required}"
    locale="${4:?locale is required}"
    appearance="${5:?appearance is required}"
    language="${locale%%_*}"
    if [ "$platform" = "ios" ]; then
      xcrun simctl ui "$udid" appearance "$appearance"
      xcrun simctl status_bar "$udid" override \
        --time 9:41 \
        --operatorName Padelly \
        --wifiBars 3 \
        --cellularBars 4 \
        --batteryState charged \
        --batteryLevel 100
    fi
    xcrun simctl terminate "$udid" "$(bundle_id "$platform")" >/dev/null 2>&1 || true
    xcrun simctl launch "$udid" "$(bundle_id "$platform")" \
      -AppleLanguages "($language)" \
      -AppleLocale "$locale"
    if [ "$platform" = "watchos" ]; then
      sleep 1
    fi
    ;;

  capture-apple)
    platform="${2:?platform is required}"
    udid="${3:?simulator udid is required}"
    scene="${4:?scene is required}"
    locale="${5:?locale is required}"
    appearance="${6:?appearance is required}"
    output="$(capture_path "$platform" "$scene" "$locale" "$appearance")"
    mkdir -p "$(dirname "$output")"
    xcrun simctl io "$udid" screenshot --type=png "$output"
    printf '%s\n' "$output"
    ;;

  build-android)
    source="${2:?app source is required}"
    module="${3:?app or wear module is required}"
    assert_clean_source "$source"
    (
      cd "$source/android"
      ./gradlew ":$module:assembleDebug"
    )
    ;;

  install-android)
    serial="${2:?adb serial is required}"
    source="${3:?app source is required}"
    module="${4:?app or wear module is required}"
    apk="$(find "$source/android/$module/build/outputs/apk/debug" -name '*-debug.apk' -print -quit)"
    test -n "$apk" || {
      printf 'Debug APK not found for module %s\n' "$module" >&2
      exit 1
    }
    "$android_sdk/platform-tools/adb" -s "$serial" install -r "$apk"
    ;;

  configure-android)
    serial="${2:?adb serial is required}"
    locale="${3:?locale is required}"
    appearance="${4:?appearance is required}"
    package="$(bundle_id android)"
    mode="no"
    [ "$appearance" = "dark" ] && mode="yes"
    "$android_sdk/platform-tools/adb" -s "$serial" shell cmd uimode night "$mode"
    "$android_sdk/platform-tools/adb" -s "$serial" shell settings put global sysui_demo_allowed 1
    "$android_sdk/platform-tools/adb" -s "$serial" shell am broadcast \
      -a com.android.systemui.demo -e command enter >/dev/null 2>&1 || true
    "$android_sdk/platform-tools/adb" -s "$serial" shell am broadcast \
      -a com.android.systemui.demo -e command clock -e hhmm 0941 >/dev/null 2>&1 || true
    "$android_sdk/platform-tools/adb" -s "$serial" shell am broadcast \
      -a com.android.systemui.demo -e command battery -e level 100 -e plugged true >/dev/null 2>&1 || true
    "$android_sdk/platform-tools/adb" -s "$serial" shell am broadcast \
      -a com.android.systemui.demo -e command network -e wifi show -e mobile show -e level 4 >/dev/null 2>&1 || true
    "$android_sdk/platform-tools/adb" -s "$serial" shell cmd locale set-app-locales \
      "$package" --user 0 --locales "$locale" >/dev/null 2>&1 || true
    "$android_sdk/platform-tools/adb" -s "$serial" shell am force-stop "$package"
    "$android_sdk/platform-tools/adb" -s "$serial" shell am start -W \
      -n "$package/.MainActivity" >/dev/null
    sleep 3
    ;;

  capture-android)
    platform="${2:?platform is required}"
    serial="${3:?adb serial is required}"
    scene="${4:?scene is required}"
    locale="${5:?locale is required}"
    appearance="${6:?appearance is required}"
    output="$(capture_path "$platform" "$scene" "$locale" "$appearance")"
    mkdir -p "$(dirname "$output")"
    "$android_sdk/platform-tools/adb" -s "$serial" exec-out screencap -p >"$output"
    printf '%s\n' "$output"
    ;;

  publish-apple)
    platform="${2:?platform is required}"
    scene="${3:?scene is required}"
    locale="${4:?locale is required}"
    appearance="${5:?appearance is required}"
    source_png="$(capture_path "$platform" "$scene" "$locale" "$appearance")"
    test -f "$source_png" || {
      printf 'Review image not found: %s\n' "$source_png" >&2
      exit 1
    }
    output_dir="$published_root/$platform"
    mkdir -p "$output_dir"
    while IFS= read -r width; do
      output="$output_dir/$scene-$locale-$appearance-$width.webp"
      cwebp -quiet -mt -q 84 -m 6 -resize "$width" 0 "$source_png" -o "$output"
      printf '%s\n' "$output"
    done < <(jq -r --arg platform "$platform" '.platforms[$platform].widths[]' "$manifest")
    ;;

  verify)
    mode="${2:-review}"
    failures=0
    for platform in ios watchos android wearos; do
      if [ "$mode" = "published" ] && [ "$(platform_value "$platform" "published")" != "true" ]; then
        continue
      fi
      while IFS= read -r scene; do
        for locale in en de es; do
          for appearance in light dark; do
            if [ "$mode" = "review" ]; then
              file="$(capture_path "$platform" "$scene" "$locale" "$appearance")"
              if [ ! -s "$file" ]; then
                printf 'Missing review image: %s\n' "$file" >&2
                failures=$((failures + 1))
              elif [ "$platform" = "ios" ] &&
                   [ "$(wc -c <"$file")" -lt 100000 ]; then
                printf 'iPhone image looks blank or unfinished: %s\n' "$file" >&2
                failures=$((failures + 1))
              elif [ "$platform" = "watchos" ] &&
                   [ "$scene" = "live-score" ] &&
                   [ "$(wc -c <"$file")" -lt 100000 ]; then
                printf 'Watch live image looks like an unfinished launch screen: %s\n' "$file" >&2
                failures=$((failures + 1))
              fi
            else
              while IFS= read -r width; do
                file="$published_root/$platform/$scene-$locale-$appearance-$width.webp"
                if [ ! -s "$file" ]; then
                  printf 'Missing published image: %s\n' "$file" >&2
                  failures=$((failures + 1))
                elif [ "$platform" = "ios" ] &&
                     [ "$(wc -c <"$file")" -lt 10000 ]; then
                  printf 'Published iPhone image looks blank or unfinished: %s\n' "$file" >&2
                  failures=$((failures + 1))
                fi
              done < <(jq -r --arg platform "$platform" '.platforms[$platform].widths[]' "$manifest")
            fi
          done
        done
      done < <(jq -r --arg platform "$platform" '.platforms[$platform].scenes[]' "$manifest")
    done
    [ "$failures" -eq 0 ] || exit 1
    printf '%s screenshot matrix is complete.\n' "$mode"
    ;;

  *)
    usage
    exit 1
    ;;
esac
