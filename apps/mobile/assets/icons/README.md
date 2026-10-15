# App icon

One Liquid Glass icon, `vera.icon`, made as an Icon Composer document. It
is a top-down aloe vera (Vera is named after the plant): two rings of six
curved leaves, like a pinwheel. It replaced a Messages-style speech bubble
that App Review would likely have rejected. The concepts it was chosen from
are in PR #52.

Appearances:

- Light: pale glass leaves on a green gradient.
- Dark: green leaves on near-black.
- Clear and tinted: gray leaves on near-black, which iOS turns into glass
  or tints.

Alternate leaves sit in separate layers with slightly different fills, so
overlapping leaves read as separate leaves.

## Alternate icons

Green is the primary icon. Settings > App Icon offers one more per color
theme (blue, teal, indigo, purple, pink, orange, graphite) as iOS alternate
icons. The icon is its own choice: any icon goes with any color theme.
Vera Dev's primary icon stays amber and offers green as an alternate too.

Each alternate is green's design with its colors turned to the theme's hue
in OKLCH (`THEME_HUES` in `build-icons.py`). Each gradient keeps green's
OKLab distance between its top and bottom stops, so every icon changes as
much from top to bottom as green does. Most hues can't be as saturated as
light green, so the top stop gets that distance from lightness instead.
Graphite is green with the hue removed. Clear and tinted look the same in
every icon, since iOS colors them.

`plugins/with-alternate-icons.cjs` copies the alternates into the Xcode
project (`app.config.ts` lists them), and the app switches with
`expo-alternate-app-icons` (`src/features/preferences/app-icon.ts`).
Android has one icon.

Files:

- `vera.icon`: the Icon Composer bundle (`ios.icon` in `app.config.ts`).
  One SVG layer per ring half, with light, dark, and tinted fills.
- `vera-<theme>.icon`: the alternate icons; `vera-dev.icon`: Vera Dev's.
- `previews/`: 180px light and dark renders of each icon for Settings.
- `vera-android-foreground.png`, `vera-android-monochrome.png`, and
  `vera-android-background.png`: Android adaptive icon layers.
- `vera-android-notification.png`: Android's notification small icon
  (white leaves on transparent; the `expo-notifications` plugin's `icon`).
  iOS badges notifications with the app icon itself.
- `../images/icon.png`: square, opaque, flat icon (the Expo fallback and the
  welcome screen).

## Editing

`build-icons.py` writes every `.icon` from the leaf geometry and colors at
its top, runs `render-flat.swift` for the flat assets, and renders the
Settings previews. Change the
design there, not in Icon Composer. Then render every iOS appearance with
Apple's renderer and look at them:

```sh
python3 build-icons.py --check /tmp/vera-icons   # Default, Dark, Clear*, Tinted*
```

A layer's light fill must be the unqualified entry in its
`fill-specializations`. If it is a plain `fill` instead, `ictool` and iOS
ignore the dark fill.

To render one appearance by hand:

```sh
ICTOOL="/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
"$ICTOOL" "$PWD/vera.icon" --export-image --output-file /tmp/vera-dark.png \
  --platform iOS --rendition Dark --width 1024 --height 1024 --scale 1
```

Renditions are `Default`, `Dark`, `ClearLight`, `ClearDark`, `TintedLight`,
and `TintedDark`. `ictool` exports are pre-masked previews, not source art.
`ictool` cannot open documents inside the Codex sandbox; run it from a
normal shell.
