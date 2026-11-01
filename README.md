<p align="center">
  <img src="docs/assets/hardtuna-logo.svg" width="560" alt="HardTuna — browser guitar tuner" />
</p>

<p align="center">
  <strong>Play a string. Find the note. Tune in your browser.</strong>
</p>

<p align="center">
  <a href="https://github.com/amonn3/hardtuna/actions/workflows/pages.yml"><img src="https://github.com/amonn3/hardtuna/actions/workflows/pages.yml/badge.svg?branch=main" alt="Tests and deployment" /></a>
  <a href="https://amonn3.github.io/hardtuna/"><img src="https://img.shields.io/badge/open-HardTuna-5ef2c0?logo=githubpages&logoColor=white" alt="Open HardTuna" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4f7cff" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/React-TypeScript-3178c6?logo=typescript&logoColor=white" alt="React and TypeScript" />
</p>

---

HardTuna is a guitar tuner that runs in your browser. Open the page, allow microphone access, and play a string. There is no app to install, account to create, or audio interface to connect.

It focuses on one task: helping you reach standard **E A D G B E** tuning with a clear, readable display. Microphone audio is processed on your device; the app neither records nor uploads it. The interface opens in **English** by default, with **Português** available from the language selector. Your language, A4 reference, and sensitivity preferences are saved in your browser when storage is available.

## Features

- **Automatic string detection.** Switching margins and a short confirmation period reduce string changes caused by unstable readings.
- **Manual string selection.** Click any of the six strings to lock the target, even when the detected note is far from its expected pitch.
- **Clear tuning feedback.** The needle shows the deviation in cents, alongside the measured frequency and instructions to raise or lower the pitch.
- **Progress tracking.** A string receives a ✓ after 700 ms of valid readings within ±3 cents. Reset the checkmarks whenever you need to.
- **Adjustable reference pitch.** Set A4 between 430 and 450 Hz; your preference is kept between visits.
- **Signal guidance.** Background noise calibration, adjustable sensitivity, and warnings for unclear or clipped audio help you position the instrument.
- **Microphone lifecycle handling.** Canceling activation releases resources, interrupted capture can be reconnected, and hiding the tab stops capture.
- **Accessible controls.** Keyboard navigation, labeled control states, and a needle that respects reduced motion preferences.
- **English and Portuguese.** Switch languages before enabling the microphone or while tuning. Controls, instructions, microphone errors, and accessibility labels update immediately.

## Try it now

**[Open HardTuna →](https://amonn3.github.io/hardtuna/)**

1. Choose **English** or **Português** from the language selector. New visitors start in English, regardless of their browser language.
2. Click **Enable microphone** and allow access in your browser.
3. Stay quiet for one second while the app measures background noise.
4. Play one string at a time and let it ring.
5. Adjust the tuning peg gradually while following the needle. If the string is not recognized, select it in manual mode.

The public version follows `main`: updates appear after the deployment workflow completes.

Use a browser with audio capture and Web Audio support. Microphone access requires **HTTPS** or `localhost`. Enable it again after returning from another tab.

## How it works

```text
Device microphone
        │
        ▼
Audio filters ──► Pitch detector ──► Stabilization ──► Needle
        │                                  │
        └── noise and signal level         └── string and confirmation

                  Everything runs in the browser
```

Capture disables voice processing filters that can alter the instrument's sound. The detector uses the **McLeod Pitch Method**, with FFT autocorrelation and peak interpolation. Signal evidence and note context help reduce octave errors without simply forcing the expected frequency.

Analysis is capped at 20 readings per second. Stabilization uses elapsed time, and the needle stops animating once it settles. A previous reading may remain dimmed for up to 1.2 seconds, but stops counting as a valid signal as soon as no observation is accepted.

For details on analysis windows, thresholds, and code organization, see the [architecture guide](docs/ARCHITECTURE.md) (in Portuguese).

## Run locally

You need **Node.js 22** and npm. The version is specified in [`.nvmrc`](.nvmrc).

```bash
git clone https://github.com/amonn3/hardtuna.git
cd hardtuna
npm ci
npm run dev
```

Open **http://localhost:5173**. No application server, database, or API key is required.

```bash
npm test              # regression tests
npm run build         # production build for root hosting
npm run preview       # preview the production build
npm run benchmark     # local detector benchmark
```

Translations live in [`src/i18n.ts`](src/i18n.ts). Both languages share a typed set of messages. The selected language is stored as `hardtuna:language`; missing, unsupported, or unavailable stored values fall back to English. Language changes also update the page title, description, and document language for assistive technology.

## Deploy to GitHub Pages

The [Pages workflow](.github/workflows/pages.yml) installs dependencies, runs tests, and builds the site. Pull requests run validation; changes to `main` also deploy the result. Deployment uses the `github-pages` environment at **https://amonn3.github.io/hardtuna/**.

The public build uses the `/hardtuna/` base path for scripts, styles, and the favicon. To check that path before publishing:

```bash
npm run build:pages
npm run preview:pages
```

Open **http://localhost:4173/hardtuna/**. Configure **Settings → Pages → Source → GitHub Actions** in the repository. After the first merge, the workflow can also be started manually through **Actions → GitHub Pages → Run workflow**, selecting `main`.

## Known limitations

- **Standard six-string tuning only.** Alternative tunings are not available in this version.
- **One string at a time.** Chords, noise, and harmonics can confuse the detector. Octave safeguards reduce known cases but do not eliminate them all.
- **Synthetic accuracy is not a guarantee.** Error stayed below one cent on tested signals. Real microphones, environments, and instruments still require their own validation.
- **Sensitivity depends on the environment.** Calibrate in silence and repeat when background noise changes. Thresholds still need evaluation with representative recordings and devices.
- **The benchmark measures only the detector.** Around 0.32–0.36 ms per reading in Node in the original test environment; this does not measure total latency or mobile performance.
- **No offline installation.** Fonts use the system stack and audio stays local, but initial access depends on hosting. There is no service worker in this version.
- **Assistive technology validation is pending.** Control states and focus handling are implemented; real screen reader testing is still needed.

Automated scenarios and a real instrument testing checklist are in the [validation guide](docs/VALIDATION.md) (in Portuguese).

## Documentation

The supporting technical guides are currently in Portuguese.

| Document | Contents |
| --- | --- |
| [Architecture](docs/ARCHITECTURE.md) | Capture, detector, stabilization, and interface |
| [Validation](docs/VALIDATION.md) | Tests, benchmark, and real microphone checklist |
| [Improvements](melhorias.md) | Initial review, fixes, and measurements still pending |
| [Workflow](.github/workflows/pages.yml) | Pull request validation and Pages deployment |

## Contributing

[Issues](https://github.com/amonn3/hardtuna/issues) and pull requests are welcome. To report an incorrect reading, include your browser, device, string, mode, and observed behavior. Avoid sharing private recordings unnecessarily.

Before submitting a change, run `npm test` and `npm run build:pages`. Audio processing changes should include a regression case that reproduces the issue. Keep unrelated changes in separate, focused commits.

## Author and license

Created by **[amonn3](https://github.com/amonn3)**. HardTuna™.

**[MIT](LICENSE)** — you may use, modify, and distribute the code, including commercially, while preserving copyright and license notices. The software is provided without warranty.
