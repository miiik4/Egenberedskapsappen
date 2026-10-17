# Android device test, 2026-10-17

Preview build `7b8c97a7` (commit ab3fab4, version 1.5.0, the `.dev` variant) on a OnePlus 6, Android 11,
1080×2280, three-button navigation, English system language, **no screen lock and no fingerprints enrolled**.

Driven by Claude over adb from Mikkel's Mac: injected taps and key events, screenshots and `uiautomator` dumps,
logcat alongside. Nothing here has been checked by a person. The data on the phone was wiped first, so the whole
walk-through started from onboarding, and ended with «Slett alle data» back to onboarding.

Two limits of the method matter for reading this report:

- The system file and photo picker (DocumentsUI) never returned a file to injected taps, so adding photos and
  files to documents and belongings was **not** tested. The camera wasn't either.
- Injected taps are sometimes dropped by the phone (the first touch after a few seconds of idle, in system apps
  too), and instant 0 ms taps don't focus React Native text fields. Lost taps are therefore not reported as app
  bugs; everything below was seen with 100 ms presses and a warm-up tap, and repeated where it mattered.

## Works, as checked

- **Onboarding** on a fresh install: three steps, household stepper, hardware back goes back a step instead of
  leaving the app, the quick list with amount fields, the result card («0 av 7 døgn», «Det er maten som mangler
  mest»), «Bytt vannet» 12 months ahead, the check-interval dropdown. «Hvert halvår» was saved: Oversikt and
  Innstillinger showed it, and the next check landed on 17. april.
- **Date picker** opens on the selected day and OK keeps it (17. oktober 2027 stayed 17. oktober 2027), in
  onboarding and in «Rediger vare». «Legg til» on a date, the picker and the clear button work on the item page
  and in forms. The dialog is in English because the phone is; expected.
- **Oversikt**: the 0 state, the 7+ state («Dere følger DSBs anbefaling»), the days card with the limit as a
  link, «Neste å gjøre» with «Legg til en nødkontakt» and «Avtal et møtested» until they exist, and
  «Fiks lommelykt og radio · Fra beredskapssjekken» after the check. The gear opens Innstillinger.
- **Lager**: part-filled ring, «Kjøp 40 liter vann · Dere har 30 av 70 liter», «+3 døgn» / «+4 døgn» badges,
  days in the section header. «Ny vare» from «+» and from the Kjøp rows with the amount prefilled; saving;
  the type page; the item page with the pencil («Rediger») in the header, «Merk som byttet» and «Varsle meg
  1 uke før».
- **Nødinfo**: the «+» menu with its three actions; «Ny nødkontakt» with keyboard and phone pad, saved once;
  the call button opens the dialer with the number (no call); «Møtested» saved, «Kart» opens Google Maps;
  «Nytt dokument» leads to the document page, which sets FLAG_SECURE (screenshots blocked); cancelling the
  picker returns cleanly; the «⋯» menu with «Gi nytt navn» and «Slett dokument»; the delete alert and the delete.
  The documents stayed open with no prompt: this phone has no screen lock, and Innstillinger says so
  («Telefonen har ingen kode …») with the switch disabled.
- **Eiendeler**: the house icon menu with the properties and «Ny eiendom», the «+» icon, «Legg til ting» per
  room, «Ny gjenstand» with autofocus and keyboard, a value that saves («1 gjenstand · 8 000 kr»), the room
  page, «Innbooversikt» with birth date and «Lag PDF og del», which produced «Innbooversikt 2026-10-17.pdf» and
  opened the share sheet (Gmail, Print, Bluetooth, Drive). «Innboforsikring» saved with 1 500 000 kr.
- **Beredskapssjekk**: the four steps, «Ingenting går ut innen seks måneder», «Må fikses» kept as a follow-up,
  «Lagre sjekken», and the next date.
- **Innstillinger**: household, «Påminnelser På» (Android 11 needs no prompt), the interval, the lock switch,
  «Gi tilbakemelding» opens Gmail, «Slett alle data» asks, then wipes and returns to onboarding without errors.
- **Guides**: the list and «Lag en plan for 7 døgn».
- **Layout and system**: forms and the check start below the status bar; dark status- and navigation-bar
  icons; the app stays light with system dark mode on; font scale 1.3 keeps Nødinfo readable and the
  emergency numbers in their tiles; a cold start with Wi-Fi off opens Oversikt and Nødinfo (the update check
  logs an error and nothing else happens).
- **Manifest**: the installed APK requests CAMERA, READ_CONTACTS, USE_BIOMETRIC/USE_FINGERPRINT,
  POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, VIBRATE and
  DETECT_SCREEN_CAPTURE; no storage, overlay, location or audio permissions.
- **Reminders scheduled** (`dumpsys alarm`): the check on 2027-04-17 10:00 and the expiry reminder on
  2027-10-10 10:00, a week before the items expire.
- `npm test` 183 passing (mobile 27, core 77, store 48, sync 31), `npm run typecheck` and `npm run lint` clean.

## Bugs found

1. **The keyboard doesn't open when a field is focused by code** (medium). In onboarding, ticking «Vann på
   kanner» or «Hermetikk» focuses the amount field (the IME binds to it) but no keyboard appears, every time
   (3 of 3). The same happened with `autoFocus` in «Møtested» and «Ny eiendom», while `autoFocus` in «Ny
   nødkontakt», «Ny vare», «Nytt dokument» and «Ny gjenstand» did open the keyboard. Once, a field pressed right
   after the keyboard had been closed with Back got focus and no keyboard either. Pressing the field opens it, so
   a user can get past it, but the first number in onboarding looks broken. Likely a race between
   `focus()`/`autoFocus` and the layout or screen transition on Android. Try focusing after the transition
   (`InteractionManager.runAfterInteractions` or a `requestAnimationFrame`), and on Android blur the focused
   input on `keyboardDidHide`.
2. **«Rediger hjemme» is a blank row in the Eiendeler property menu** (medium). expo-router's Android
   `MenuAction` takes its label only from a single string child
   (`StackToolbarMenu/native.android.js`, `typeof props.children === 'string'`), and this label is
   `Rediger {property.shortName.toLowerCase()}`, two children. Make it one template string. It's the only
   such label in the app.
3. **No notification channel on Android 12 and older** (low). `ensureAndroidChannel()` only runs inside
   `requestPermission`, which this Android 11 phone never needs, so `dumpsys notification` shows the two
   scheduled reminders and zero channels. They'll be posted on expo-notifications' fallback channel, with an
   English name in the phone's settings. Call it on startup as well.
4. **«Neste å gjøre» leads with water whatever the gap** (low). `nextActions` says the contact and meeting
   place come «right after the biggest gap», but it takes `gaps[0]`, and the gaps are always water, food, heat
   in that order. With 3 days of water and no food, the list started with «Kjøp 40 liter vann» (no day gain)
   while the days card said «Kjøp mat for 7 døgn til» (+3 døgn).
5. **The MenuField dropdowns draw as flat grey boxes** (known, `LAUNCH.md`): «Hver tredje måned» in onboarding
   and Innstillinger, «Kategori» and «Type» in Ny vare, «Selskap» in Innboforsikring, with Material You's tint
   (pinkish grey here).
6. **Seen once, not reproduced**: in one «Ny vare» form opened from «Kjøp mat for 7 døgn», «Legg til» on
   «Går ut» did nothing in five presses while the stepper beside it worked. It worked in every later form.
7. Cosmetic: with font scale 1.3 the icon before «Lagret på telefonen, kan åpnes uten nett» sits at the top of
   the wrapped line.

## Fixed in code the same day, and checked again on the phone with preview build e5246b2e

Publishing the fixes as a signed update failed: EAS refuses code signing without a Production plan, which
the account doesn't have (LAUNCH.md section 2). They went out as a new preview build instead. Checked on the
OnePlus 6 in that build: the onboarding amount field, «Møtested» and «Ny eiendom» all open the keyboard by
themselves; «Rediger hjemme» shows in the property menu; `dumpsys notification` lists the «Påminnelser»
channel; the dropdown rows and their options card look as intended, and the switch has a blue track with a
white knob. The second ordering fix for «Neste å gjøre» (below) came after that build and is covered by
tests, not yet seen on the phone.

- Bug 1: on Android a field with `autoFocus` (and the onboarding amounts, now `autoFocus` too) is focused from
  JavaScript 350 ms after it appears, once the sheet's transition is over, and the focused field is blurred when
  the keyboard is put away, so the next press brings the keyboard back (`components/form/fields.tsx`,
  `components/ui/keyboard-avoiding.tsx`, `velkommen.tsx`). The delay is one constant and may need tuning.
- Bug 2: the «Rediger …» menu label is one template string (`eiendeler/index.tsx`).
- Bug 3: the notification channel is created at startup, first in the scheduling chain
  (`notifications/notifications-provider.tsx`). Existing installs move onto it the next time reminders are
  rescheduled.
- Bug 4: the gaps are ordered by the days each kind has, fewest first, which is exactly how the days card
  picks its limit (`packages/core/src/actions.ts`, with tests). A first version ordered by the days closing
  each gap adds; on the phone that still led with water when food and heat were both at zero, since closing
  one of them alone adds nothing.
- Bug 5 and what Mikkel saw in «Ny vare»: the Android dropdowns are no longer the Material text field with a
  wallpaper tint and an underline; the value is a link on the row and a tap opens a small card with the options
  in the app's colours (`components/form/menu-field.android.tsx`). The switches share one component with a
  blue track and a white knob on Android, instead of the phone's own accent on the knob
  (`components/ui/switch.tsx`).

All of it is JavaScript only, so it can go out as a signed update to the preview build for a check.

## Not covered, needs a person with the phone

- Adding a photo, a gallery picture and a file to a document and to a belonging; the relock when coming back
  from the camera, picker or share sheet (needs a screen lock on the phone); the biometric prompt itself.
- The PDF's margins, pictures and Norwegian characters, and sending it with Gmail.
- A reminder arriving: set an item to expire within a week and wait for 10:00 the next day.
- The signed-update test, App Check, the Play pre-launch report, large screens, swipe to delete.
