# Android readiness review (static)

Date: 2026-10-09. Expo SDK 57, RN 0.86.3, expo-router 57. This Mac has no Android SDK or emulator, so
everything below comes from reading the code, the config plugins and the library sources in `node_modules`.
Nothing was built or run. **Nothing here has been checked on a device.**

Generated native settings worth knowing: targetSdk/compileSdk 36, minSdk 24 (RN defaults), edge-to-edge
always on (`edgeToEdgeEnabled=true` in the template), `AppTheme` parent `Theme.AppCompat.DayNight.NoActionBar`,
`allowBackup` defaults to `true` (Expo's `AllowBackup` plugin).

Findings are ranked by how likely they are to break or embarrass on a real Android phone.

---

## 1. Blockers: features that don't exist on Android

### 1.1 The property menu on Eiendeler is missing, so there's no way to add, edit or switch a property
`apps/mobile/src/app/(tabs)/eiendeler/index.tsx:38-57`

The left `Stack.Toolbar.Menu` has only a `Stack.Toolbar.Label` and no `icon`. On Android, expo-router draws
header toolbars with Jetpack Compose, and a root menu with no image source returns `null`
(`node_modules/expo-router/build/layouts/stack-utils/toolbar/StackToolbarMenu/native.android.js`, "requires an
ImageSourcePropType icon"). This menu is the only way into `/eiendom` (grep finds no other `router.push('/eiendom')`),
so on Android you can't add a property, rename one or switch between them.

*Fix:* on Android, render the menu with an image icon (as `ToolbarIcons` does), or put a plain row/button on the
screen itself (e.g. «Eiendom: Hjemme ›») that opens a list or `/eiendom`. Either way it's JS-only.

### 1.2 «Rediger» on a stock item doesn't show
`apps/mobile/src/app/(tabs)/lager/vare/[id].tsx:66`

`<Stack.Toolbar.Button>Rediger</Stack.Toolbar.Button>` has text and no icon. The Android button returns `null`
without a source (`StackToolbarButton/native.android.js:17-21`). The edit form can still be reached through the
«Hvor» row (line 119), but nobody would guess that, and deleting an item lives in that form too.

*Fix:* add an Android image icon (pencil PNG, like `assets/icons/plus.png`), or add a «Rediger vare» row/button in
the body on Android.

> General rule worth a lint check: every `Stack.Toolbar.Button` and root `Stack.Toolbar.Menu` needs an
> image `icon` on Android. `MenuAction` items with SF Symbol strings are fine: the icon is dropped and the text
> stays.

---

## 2. High: visible on first use

### 2.1 Dark mode: the headers, menus and tab bar go dark while the screens stay light (navy text on dark grey)
`apps/mobile/src/constants/theme.ts:9-10`, `apps/mobile/src/app/_layout.tsx:20,35`,
`apps/mobile/src/components/tab-stack.tsx:14-17`, `apps/mobile/src/app/(tabs)/_layout.tsx:7-13`

What an Android user with dark mode on actually sees:

| Part | Where the colour comes from | Dark mode on Android | Readable? |
|---|---|---|---|
| Screen backgrounds, cards, all body text | `Colors.*` set on every style (light values on Android) | Light `#F4F7FA` / white, navy text | Yes. Every `Text` and `TextInput` style sets an explicit colour, so no white-on-white text from the DayNight theme. |
| Header bar in each tab (`TabStack`) | No `headerStyle.backgroundColor`, so React Navigation `DarkTheme.colors.card` | `#121212` | **No.** Title and back arrow are `Colors.label` = navy `#0B2B4A` on near-black (about 1.3:1). |
| Header toolbar buttons and dropdown menus (Compose) | Tint = `headerTintColor` (navy); background = Material `surfaceContainer` (dynamic, follows dark) | Dark surface | **No.** The navy `+`/`⋯` icons and the menu item text are close to invisible. |
| Bottom tab bar (`NativeTabs`) | Background `surfaceContainer`, indicator `secondaryContainer` (Material You, from the wallpaper); labels/icons `secondaryLabel`/`accent` | Dark, wallpaper-tinted | Poor: `#5B7285` and `#0E5FC0` on dark grey come out around 2.5–3:1. |
| Status bar icons | System, DayNight → light icons | White icons | **No** on modal screens with `headerShown: false` (forms, Beredskapssjekk, Velkommen), where light `#F4F7FA` sits under them. Fine under the dark header. |
| Root stack background during transitions | `DarkTheme.colors.background` `rgb(1,1,1)` | Black | Flashes black behind sheets as they slide. |
| Alerts, date picker dialog, `MenuField` dropdown (Compose) | System / Material | Dark dialogs | Readable, but they clash. The `MenuField` read-only `TextField` may show as a dark box inside a white card. |

So the body copy stays readable, but every header title and toolbar icon in the four tabs becomes unreadable, and
the app looks broken half-dark. Light mode has milder versions of the same thing: the header is white
(`DefaultTheme.card`) on a `#F4F7FA` page, and the tab bar and its selected pill pick up the wallpaper colour
(Material You), which can turn them pink or green under a navy brand.

*Fix for 1.0 (smallest):* force light on Android. Set `"android": { "userInterfaceStyle": "light" }` in
`app.json` (expo-system-ui is already installed, so it applies). `useColorScheme()` then returns `light`, the
`DefaultTheme` is used, Compose follows the light configuration, and the status bar gets dark icons. This changes
native config, so **bump `version`** per AGENTS.md. In any case:
- Pass a custom navigation theme built from `Colors` (`background`, `card: Colors.background`, `text: Colors.label`,
  `primary: Colors.accent`, `border: Colors.separator`) instead of plain `DefaultTheme`/`DarkTheme`.
- Set `backgroundColor` and `indicatorColor` on `NativeTabs` (e.g. `Colors.card` and `Colors.accentSoft`).

*Proper fix later:* make `color()` return real dark values on Android, either through `useColorScheme()`-driven
colours or `PlatformColor` with `values-night` resources from a config plugin. Note that `StyleSheet.create` runs
once, so a hook-based palette touches every screen.

### 2.2 Form sheets and the Beredskapssjekk sit under the status bar
`apps/mobile/src/app/beredskapssjekk.tsx:185-191` (`paddingTop: 16`), `apps/mobile/src/components/form/sheet.tsx:96`
(`paddingTop: 24` on Android)

On iOS these are page sheets that start below the status bar. On Android, `presentation: 'modal'` is a full-screen
screen, and with edge-to-edge the content starts at y=0. The 44 pt close and save buttons overlap the status bar:
fully on Beredskapssjekk, partly in every form (status bars on punch-hole phones are 28–52 dp, not 24). The bottom
is tight too: `paddingBottom: 40/48` against a 48 dp three-button navigation bar.

*Fix:* use `useSafeAreaInsets()` (already a dependency) and set `paddingTop: insets.top + 8` and
`paddingBottom: insets.bottom + …` in `FormSheet` and `Beredskapssjekk`, the way `fil.tsx` and `film/video.tsx`
already do.

### 2.3 The date picker moves the date back by one day
`apps/mobile/src/components/form/fields.tsx:146-157`, `@expo/ui/src/community/datetime-picker/DateTimePicker.android.tsx`

`value` is local midnight (`toLocalDate`), which is passed as `value.toISOString()`. That is 22:00/23:00 UTC on
the **previous** day in Norway. The Material 3 `DatePickerDialog` reads `initialSelectedDateMillis` as UTC, so
it opens with yesterday selected. Tap OK without changing anything and it returns UTC midnight of yesterday, and
`todayIso()` turns that into yesterday's date. Every expiry date («Går ut»), «Kjøpt» date and the birth date in
the report goes back one day each time the dialog is confirmed. Picking another day works, because the
UTC-midnight result is still the same local day in UTC+1/+2.

*Fix:* pass a Date at UTC midnight of the local day (`new Date(Date.UTC(y, m-1, d))`) on Android, and read the
picked date with `getUTCFullYear/Month/Date` instead of `todayIso(picked)`. Cover the conversion with a unit test.

Related, minor: the Android row shows `formatDate(value)` («2. oktober») with no year, so the «Fødselsdato» in
`rapport.tsx:72` and dates a year or more away can't be read back.

### 2.4 Subtitles under the header are clipped at the top
`apps/mobile/src/app/(tabs)/(oversikt)/index.tsx:212`, `lager/index.tsx:94`, `lager/type/[id].tsx:86`,
`lager/vare/[id].tsx:158`, `eiendeler/rom/[id].tsx:77`, `husstand.tsx:162`, `nodinfo/index.tsx:142`,
`components/ui/link-text.tsx:16`, `forsikring.tsx:119`

`marginTop: -16` is meant to tuck the subtitle under an iOS large title. Android has no large title
(`headerLargeTitleEnabled` and `contentInsetAdjustmentBehavior` are iOS-only). `Screen` gives `paddingTop: 8`, so
the first line ends up at −8 and the top of the text is clipped by the ScrollView on the very first screen.

*Fix:* `marginTop: Platform.OS === 'ios' ? -16 : 0`, or put it once in a shared `subtitle` style or in `Screen`.

### 2.5 Reminder notifications show a white square in the status bar
`apps/mobile/app.json:46` (`"expo-notifications"` with no options)

Without `icon`, Android uses the launcher icon as the small notification icon, and an opaque icon is drawn as a
solid white square. Reminders are the main way the app reaches people.

*Fix:* `["expo-notifications", { "icon": "./assets/images/notification-icon.png", "color": "#0B2B4A" }]`, using a
96×96 all-white glyph on transparent (`android-icon-monochrome.png` is the right shape but 1024 px with the
adaptive padding, so it would look small). This is native config, so bump `version`.

---

## 3. Medium

### 3.1 Documents lock themselves while you add a photo or share a file
`apps/mobile/src/documents/lock.tsx:45-49`

RN Android reports `background` on every `onPause`. The camera, the system photo picker, the document picker
(SAF) and the share chooser are all separate activities, so going to one of them sets `unlocked=false`. You come
back to «Dokumentene er låst» and `DocumentGate` immediately asks for biometrics again. The file is still added,
but it feels broken. The same happens with «Åpne PDF» in `fil.tsx`.

*Fix:* set a short "expected external activity" flag around `pickFiles()` and `Sharing.shareAsync()` and skip
the lock while it's set, or require a minimum time in the background before locking (watch the privacy promise:
keep it short).

### 3.2 «Lås opp med fingeravtrykk» on face-unlock phones
`apps/mobile/src/documents/lock.tsx:28`

Android always shows «fingeravtrykk» when biometrics are enrolled, even on phones with only face unlock (Pixel 8+,
many Samsungs), and the prompt also allows the PIN. *Fix:* use a neutral label on Android, «Lås opp», or «Lås opp
med biometri eller kode».

### 3.3 Passport photos can't be zoomed
`apps/mobile/src/app/fil.tsx:103-112`

`maximumZoomScale`/`minimumZoomScale` on `ScrollView` only work on iOS. On Android a document photo can't be
pinched to read small print. *Fix:* use a gesture-handler pinch with Reanimated (both already installed).

### 3.4 «Åpne PDF» opens a share sheet, not a viewer
`apps/mobile/src/app/fil.tsx:96-101`

`Sharing.shareAsync` shows Gmail, Drive and Messenger next to the PDF viewers. For a passport scan that is one tap
away from sending it somewhere. It also triggers 3.1. *Fix (later, new native module, so bump `version`):* open it
with `ACTION_VIEW` (expo-intent-launcher plus a content URI). For 1.0, at least change the wording: «Del eller åpne
PDF-en i en annen app».

### 3.5 The insurance PDF has no page margins
`apps/mobile/src/report/make-report.ts:77`, `apps/mobile/src/report/report-html.ts:66`

`printToFileAsync({ margins })` is iOS-only, and `body { margin: 0 }`. On Android the innbo report goes edge to
edge on the page, and this is the document that goes to the insurer. *Fix:* add `@page { margin: 40pt 36pt; }` to
the HTML (check that iOS doesn't double it), or set the body margin on Android only.

### 3.6 The report file is deleted while the mail app may still need it
`apps/mobile/src/report/make-report.ts:82-86`

`finally { named.delete() }` runs once `shareAsync` resolves. On Android that can be before Gmail or Outlook has read
the content URI (they often send in the background after the compose screen closes), which gives a "couldn't
attach" or empty attachment. *Fix:* leave the file and clear old `Innbooversikt *.pdf` files from the cache the next
time the app starts or a new report is made.

### 3.7 Hardware or gesture back on Velkommen leaves the app instead of going back a step
`apps/mobile/src/app/velkommen.tsx:44-104`

The three onboarding steps are local state, and only the on-screen chevron goes back. Back on step 2 or 3 sends the
app to the background. *Fix:* `BackHandler.addEventListener('hardwareBackPress', …)` while `step > 0`, which works
with `predictiveBackGestureEnabled: false`.

Other back behaviour, which is fine: forms and sheets close with back (native-stack pops them), the same as
swiping down on iOS and also without a confirmation. Beredskapssjekk closes with back and drops the answers, the
same as its ✕. Acceptable, though back could undo the last answer while `answers.length > 0`. No `BackHandler`
or `usePreventRemove` is used anywhere.

### 3.8 The keyboard may cover the bottom fields
`apps/mobile/src/components/form/sheet.tsx:30`, `apps/mobile/src/app/velkommen.tsx:120`

`automaticallyAdjustKeyboardInsets` is iOS-only. Android relies on `adjustResize`, which behaves differently under
forced edge-to-edge (Android 15+). There is no `KeyboardAvoidingView`. Check on a device: the NumberFields at the
bottom of onboarding step 2, and the fields at the bottom of `vare`, `kontakt` and `gjenstand`.

### 3.9 Permissions in the release manifest that the app doesn't need
`apps/mobile/app.json` has no `android.permissions` or `android.blockedPermissions`, so the template's permissions
and every library's are merged in:

| Permission | From | Needed? |
|---|---|---|
| `CAMERA` | expo-camera, expo-image-picker | Yes (document photos) |
| `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` | expo-notifications | Yes. Android 13+ prompt via `requestPermissionsAsync`, which is only asked from Oversikt and the Beredskapssjekk. Good. |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | expo-local-authentication | Yes |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK` | template, Firebase, expo-image, expo-updates | Yes (updates, Firebase later) |
| `DETECT_SCREEN_CAPTURE` (API 34+) | expo-screen-capture | Harmless (normal permission) |
| `RECORD_AUDIO` | | Already blocked (expo-image-picker `microphonePermission: false`, expo-camera `recordAudioAndroid: false`). Video is recorded with `mute` (`film/video.tsx:103`). Good. |
| `SYSTEM_ALERT_WINDOW` | Expo template main manifest | **No.** Shows as «vise over andre apper» in the store listing. Block it. |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (≤ API 32) | template, expo-file-system, expo-image-picker, expo-image, expo-screen-capture | **No.** The photo picker and SAF need no permission. Block them. |
| `READ_MEDIA_IMAGES` (API 33 only) | expo-screen-capture (for screenshot listeners, which aren't used) | **No.** It also brings in Play's Photo and Video Permissions declaration. Block it. |
| `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` | | Not requested, and not needed: expo-notifications falls back to `setAndAllowWhileIdle` when it can't schedule exact alarms (`ExpoSchedulingDelegate.kt:105-121`). A 10:00 reminder a few minutes late is fine. Don't add it (Play policy). |
| Location | | Not requested by anything. Block it as a precaution. |

*Fix:* `"android": { "blockedPermissions": ["android.permission.SYSTEM_ALERT_WINDOW",
"android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE",
"android.permission.READ_MEDIA_IMAGES", "android.permission.ACCESS_FINE_LOCATION",
"android.permission.ACCESS_COARSE_LOCATION", "android.permission.RECORD_AUDIO"] }`. This is native config, so bump
`version`. Then test the photo picker and the document picker on Android 10–12.

---

## 4. Low

- **Notification channel only exists once permission has been asked** (`notifications/scheduler.ts:22-29`,
  `notifications-provider.tsx:50-51`). On Android ≤ 12 permission is granted from the start, so reminders are
  scheduled with `channelId: 'reminders'` before the channel exists. expo-notifications then posts them to its
  fallback channel, which has an English system name in Settings. *Fix:* call `ensureAndroidChannel()` on startup.
- **Destructive alert buttons aren't red.** Android ignores `style: 'destructive'`, and tapping outside dismisses
  without calling the cancel handler. No alert has more than 3 buttons, so none are lost. No code depends on the
  cancel handler running.
- **Large screens.** With targetSdk 36, Android 16 ignores `orientation: portrait` on screens ≥ 600 dp, so
  tablets and unfolded foldables will rotate and stretch. Either check the layout or limit the devices in the Play
  Console.
- **Swipe to delete** (`components/ui/swipe-delete.tsx`) works, but Android users don't expect it. Make sure
  every delete can also be reached from a form (stock items: see 1.2).
- **Predictive back** is off (`predictiveBackGestureEnabled: false`, so `enableOnBackInvokedCallback=false`).
  That's fine for 1.0 and still honoured on Android 16. Turn it on once back has been tested.
- **The release AAB has Firebase and App Check (Play Integrity) linked but not loaded** while
  `EGENBEREDSKAP_PLUS_ENABLED` is false. That's fine. Before turning it on, Play Integrity needs the Play app signing
  SHA-256 in Firebase (LAUNCH.md, App Check item).
- `components/form/compact-date-picker.tsx` (non-iOS) is never rendered on Android, because `fields.tsx` only uses
  it under `Platform.OS === 'ios'`. Dead but harmless.
- `expo-glass-effect` is a dependency with no imports in `src/`.

---

## 5. Config items checked and found fine

- **Package ID:** `no.htas.egenberedskap` (production) and `no.htas.egenberedskap.dev` (`app.config.ts:15,37`).
  Both `google-services.json` files contain the matching `package_name`.
- **Adaptive icon:** new assets with background `#0B2B4A`. The foreground and monochrome are 1024², and the drawing
  sits within a 277 px radius of the centre, inside the 312 px safe circle, so launcher masks won't crop it.
  Monochrome is white on transparent (themed icons OK). The splash uses the same mark on navy at 200 dp.
- **Backups:** `allowBackup` is true (Expo default), and `modules/backup-exclusion/app.plugin.js` writes
  `backup_rules.xml` (≤ API 30) and `data_extraction_rules.xml` (API 31+, both `cloud-backup` and
  `device-transfer`). They exclude `file:dokumenter/`, `file:analyse/` and `sharedpref:SecureStore`. `Paths.document` is
  `context.filesDir` on Android (`expo-file-system/.../FileSystemModule.kt:38`), which is the `file` domain, so
  the paths are right. expo-secure-store's own rules are switched off (`configureAndroidBackup: false`), and its
  plugin only removes attributes equal to its own paths, so it can't undo ours whatever order the plugins run in.
  The JS module is `requireOptionalNativeModule` and Apple-only, so it's a no-op on Android (no crash). The SQLite
  database is backed up on purpose, as on iOS. **Check on a device:** Android's documented examples name
  shared-prefs files with `.xml` (`device.xml`), while this rule and Expo's say `SecureStore`. If it doesn't match,
  restored SecureStore entries can't be decrypted on the new phone. Adding a second line with `SecureStore.xml`
  is cheap insurance.
- **Edge-to-edge:** always on (SDK 57 / targetSdk 36). Covered in 2.2.
- **FLAG_SECURE:** `ScreenCapture.usePreventScreenCapture('documents')` inside `DocumentGate`
  (`documents/lock.tsx:109`) sets FLAG_SECURE on Android, which blocks screenshots and blanks the Recents
  thumbnail while documents are open. `enableAppSwitcherProtectionAsync` is correctly iOS-only. Nødinfo and the
  contacts are not gated. Good.
- **Biometrics fallback:** `authenticateAsync` with the default `disableDeviceFallback: false` lets Android fall back
  to PIN/pattern. A phone with no screen lock gets `method = null`, and the documents stay open with the
  household sheet saying so (same as iOS).
- **Icons:** every `<Icon>` passes `{ ios, android }` Material names. A plain SF string would render nothing on
  Android (`expo-symbols/build/SymbolView.js`: string name → `fallback`), but none do. The Material Symbols font is
  bundled (works offline). The tab icons have `md` names. Toolbar `+`/`⋯` use PNGs (`components/toolbar-icons.ts`).
- **iOS-only APIs:** `@expo/ui/swift-ui` is only imported from `.ios.tsx` files (`compact-date-picker.ios.tsx`,
  `menu-field.ios.tsx`). `menu-field.android.tsx` uses the Compose `Picker`. `DynamicColorIOS` is guarded. There is no
  `ActionSheetIOS` or `PlatformColor`. `maps://` vs `geo:` is handled (`nodinfo/index.tsx:25`). `Menlo` vs
  `monospace` is handled. `borderCurve` is ignored harmlessly.
- **`mailto:` / `tel:`** use `openURL` with a catch (no `canOpenURL`, so no Android 11 `<queries>` problem).

## 6. eas.json

- `production` sets no `android` options, so EAS builds an **AAB** (`app-bundle` is the default; only `preview`
  sets `apk`). Good.
- **Signing:** no `credentialsSource`, so the default is remote. The first production Android build will ask to
  generate an EAS-managed upload keystore (it must run interactively once, not with `--non-interactive`). Enrol in
  Play App Signing, and back up the keystore with `eas credentials`. Note the account caveat in LAUNCH.md: the
  credentials will belong to the Expo account they're created under («mkl96»).
- `autoIncrement: true` with `appVersionSource: remote` manages `versionCode`. Good.
- `submit.production` is empty. Android needs a Play service-account key and `track` (e.g. `internal`), and **the
  first AAB must be uploaded by hand** in the Play Console before `eas submit` can use the API.
- `preview` builds arm64-only APKs. That's fine for modern phones, but they won't install on x86_64 emulators or the
  odd 32-bit phone. This only matters for testing.

---

## 7. Only a real device or emulator can confirm these

1. Dark mode end to end: header, toolbar menus, tab bar, status and navigation bar icons, Compose dropdown and date
   dialog. Then again after forcing light.
2. Light mode with a colourful wallpaper (Material You tint on the tab bar, toolbar button backgrounds and menus).
3. Safe areas on a punch-hole phone, with both gesture and three-button navigation: the top of forms and the
   Beredskapssjekk, the bottom «Lagre sjekken» and «Slett» buttons.
4. Keyboard covering fields in onboarding and the forms (Android 14 and 15+).
5. Date picker: open an existing expiry date and press OK, and check the date doesn't move back a day (2.3).
6. Documents: add from the camera, the photo picker and Files, and confirm the relock and prompt behaviour (3.1).
   Biometric prompt with fingerprint, with face only and with PIN only.
7. Recents thumbnail and screenshot blocking on a document. Also check the thumbnail captured as you leave a
   document is blank and not the document (the lock unmounts FLAG_SECURE as the app backgrounds; the timing needs
   a look).
8. Auto Backup / device transfer: `adb shell bmgr backupnow <pkg>` and restore, and check `dokumenter/`,
   `analyse/` and SecureStore are absent and the app copes with documents whose files are missing.
9. Notifications: Android 13+ permission prompt, the reminder arriving roughly at 10:00 after a reboot and in Doze,
   the small icon, the channel name in Settings, and tapping it opening the right screen.
10. Hardware and predictive back on every sheet, Velkommen, the tab roots, and inside the Compose dropdowns.
11. Insurance PDF: margins, photos, the Norwegian characters, and sending it via Gmail (3.5, 3.6).
12. PDF «Åpne» flow and image zoom in `fil.tsx`.
13. Photo picker and Files on Android 10–12 after blocking the storage permissions.
14. Fonts (Archivo/Source Sans 3) and `adjustsFontSizeToFit` on the emergency numbers with large system font
    sizes.
15. Large screen or foldable behaviour, if it isn't excluded in the Play Console.
16. The Play Console pre-launch report: upload to the internal track and it crawls the app on real devices for
    free. It catches crashes, contrast problems and accessibility issues.

## Suggested order for 1.0

All JS-only unless marked; native changes need a `version` bump and new builds:
1.1, 1.2, 2.3, 2.2, 2.4, then the native batch together in one bump: 2.1 (force light), 2.5 (notification
icon), 3.9 (blocked permissions). Then 3.1, 3.5, 3.6, 3.7 and 3.2.
