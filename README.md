# Police report registration — test design

Training demo and Playwright suite for the user story تسجيل بيانات المحضر.
The governorates, stations, and people on the page are fictional.

## What to hand in

- `docs/Police-Report-Manual-Test-Cases.xlsx` — manual cases in English, with an Arabic sheet for reference
- `docs/Police-Report-User-Story-Review.docx` — requirement review
- this project — the demo page and the Playwright TypeScript scripts
- `recording/automation-walkthrough.webm` — short recording, after `npm run record`

## Run the tests

```bash
npm install
npx playwright install chromium
npm test
```

`npm test` starts the demo, runs the suite, and writes an HTML report. Open it with:

```bash
npm run report
```

## Open the demo

```bash
npm start
```

Then open http://127.0.0.1:4173

## Record the walkthrough

```bash
npm run record
```

`npm run record` saves the video to `recording/automation-walkthrough.webm`.

## Public demo

Open the form without installing anything:

https://omarkhalidrashad-oss.github.io/police-report-registration/demo/

The suite reads `BASE_URL`. Against the hosted page:

```powershell
$env:BASE_URL = "https://omarkhalidrashad-oss.github.io/police-report-registration/demo/"
npm test
```

Keep the trailing slash. Without it, Playwright would open the GitHub user site instead of this form.

With `BASE_URL` set, Playwright does not start the local server.

## Where the rules live in code

- Screen behaviour and messages: `demo/app.js`
- Steps shared by the scripts: `tests/pages/report-page.ts`
- Expected messages: `tests/support/messages.ts`
- One spec file per area under `tests/specs/`

Comments in `demo/app.js` and the spec files mark catalogue text and assumption text.

## التشغيل

1. `npm install`
2. `npx playwright install chromium`
3. `npm test` لتشغيل كل السكربتات
4. `npm start` ثم افتح http://127.0.0.1:4173 لتجربة الفورم
5. أو افتح الفورم مباشرة من https://marawan10.github.io/police-report-registration/
6. ملف الإكسل وملف المراجعة داخل `docs`
