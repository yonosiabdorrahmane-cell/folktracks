# Folktracks

A private, installable iOS PWA for nutrition, training and body composition.
Liquid-glass UI, a macOS-style magnifying dock you slide a thumb along to pick a tab, and
a small recurring cast. No account, no server, no analytics — every byte of
your data lives in `localStorage` on the device.

---

## Run it

Service workers and ES modules need a real origin, so open it over HTTP,
not `file://`:

```bash
cd zenith
python3 -m http.server 8791
# then open http://localhost:8791
```

### Install on your iPhone (and keep it after the tunnel dies)

iOS only registers a service worker over **HTTPS** (or `localhost`), so the
phone needs the files over TLS. A Cloudflare quick tunnel is the shortest
path — no account, no config:

```bash
./serve.sh 8791                                   # terminal 1
cloudflared tunnel --url http://localhost:8791    # terminal 2
```

It prints a `https://<random-words>.trycloudflare.com` URL. That URL works
on this machine and on the phone, and it is **public while it is open** —
anyone holding the link can load the app. Nothing of yours is exposed (all
data is local to each device), but close the tunnel when you are done.

Then, on the iPhone:

1. open the HTTPS URL in **Safari** (Chrome on iOS cannot install PWAs),
2. tap **Share** → **Add to Home Screen**,
3. **launch it from the Home Screen while the tunnel is still up, and give
   it a few seconds.** This step is the one people skip. iOS gives the
   standalone app its own storage separate from Safari, so it installs its
   own service worker and precaches the ~2.7 MB shell on that first
   standalone launch. Until that happens, the icon is just a bookmark
   pointing at a URL that will stop existing.

Once it has, the app is genuinely self-contained: kill the tunnel, close
the laptop, turn off Wi-Fi and cellular — it still opens, and every view,
the whole food library and all your logs still work. Only Open Food Facts
search and barcode lookups need a connection, and the app falls back to
the built-in library without them.

To ship an update, bump `VERSION` in `sw.js` and reopen the app while it
can reach the tunnel; the old cache is dropped on activation.

---

## What's in it

**Tracking**
- 287-food built-in library, every name localised in all five languages, with full macro + micro data per 100 g, searchable
  in English, French, Spanish, German and Arabic (with typo tolerance)
- Open Food Facts search and barcode scanning when online; the built-in
  library keeps working when not
- Portion editor with real servings ("1 fillet", "1 cup", grams, oz)
- Custom foods, favourites, recents, quick-add calories
- Water, body weight, and a per-day note
- Training log: 46 exercises, six session templates, sets/reps/load, estimated
  1RM (Epley), volume, PR detection against your own history

**Maths**
- Mifflin–St Jeor BMR, or Katch–McArdle when you supply a body-fat %
- Activity-multiplied TDEE, goal-driven calorie target with a safety floor
- Protein anchored to body mass, fat as a share of energy, carbs take the rest
- Least-squares weight trend with EWMA smoothing and a target-date projection
- Optional weekly calorie carry-over

**Feel**
- Liquid glass: blurred, saturated backdrops with a specular rim and inner sheen
- macOS dock magnification — gaussian falloff plus neighbour spread, driven by
  touch drag exactly like a trackpad
- A genuine genie warp for panels: N horizontal slices of a clone riding one
  continuous curve, so the bottom edge reaches the dock long before the top
- Swipe-to-delete rows, drag-to-dismiss sheets, spring segmented controls
- Haptics (real vibration where available, a WebAudio click on iPhone)

**Settings**
- Theme: System / Light / Dark, where System follows the iPhone live, including
  Auto at sunset, and drives the status-bar tint
- Language: English, Français, Español, Deutsch, العربية — Arabic flips the
  whole app to RTL with no second stylesheet
- Metric/imperial, kcal/kJ, week start, water goal and cup size
- Reduce motion, glass quality (Full/Lite for older devices), haptics on/off
- Levels and achievements can be switched off entirely for a clinical view
- Export/import your data as JSON; clear logs; full reset

---

## Layout

```
index.html              app shell + SVG icon sprite
manifest.webmanifest    installable metadata, shortcuts, maskable icons
sw.js                   precached shell, SWR runtime, network-first for OFF
css/
  base.css              tokens, three theme blocks, reset, wallpaper
  glass.css             the liquid-glass material system
  dock.css              magnification dock
  motion.css            genie stage, panels, sheets, view transitions
  views.css             every screen component
js/
  app.js                bootstrap, routing, gestures, reminders, SW
  store.js              observable state + localStorage persistence
  nutrition.js          BMR/TDEE/macros/trends/projections
  foods.js              library parsing, search, Open Food Facts
  genie.js              the mesh-warp approximation
  dock.js               magnification + neighbour spread
  gamify.js             XP, levels, streaks, 12 achievements
  i18n.js               5 languages, RTL, locale formatting
  theme.js, haptics.js, ui.js, charts.js, util.js
  views/                today, diary, progress, train, add, settings, onboarding
data/library.js         the packed food table
assets/                 icons + 12 iOS launch images
```

## Notes and limits

- **Reminders** fire as local notifications while the app is running. iOS only
  delivers *push* to installed PWAs and that needs a push server, which Folktracks
  deliberately does not have.
- **Barcode scanning** uses the native `BarcodeDetector`. Safari does not
  implement it yet, so on iPhone the scanner shows the camera and accepts the
  number typed in; the Open Food Facts lookup is identical either way.
- **Food names** display in English. Search matches across all five languages,
  and Open Food Facts results come back in your language.
- Data lives in `localStorage`, so clearing Safari's website data erases it —
  Settings → Export is the backup.
