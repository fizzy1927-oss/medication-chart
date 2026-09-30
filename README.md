# NBRC Respiratory Pharmacology Chart

An interactive study site for the respiratory medications tested on the NBRC TMC and CSE exams. It covers 45 drugs across 11 classes, with generic and brand names, category, strength, dosage, onset/peak/duration, clinical effects, adverse effects, hazards, delivery device, and exam notes.

## Study modes

- **Table**: the full chart. Filter by drug class, search any term (a drug, brand, side effect or device), and turn on **Hide answers** to blur every column except the drug name. Tap a cell to check yourself.
- **Cards**: one card per drug, grouped by class. Tap a card to open its details. Works well on a phone.
- **Flashcards**: pick what to study (strength, dosage, onset/peak/duration, side effects, hazards, and so on), flip the card, and mark it **I know this** or **Still learning**. Progress is saved in your browser.
  Keyboard: Space flips · ← → move · K marks known · L marks still learning.
- **Quiz**: NBRC-style multiple-choice questions mixed with drug-class and brand-name recall. Choose 10, 20, 30 or all questions, get an explanation after each answer, then retry just the ones you missed. Keyboard: A–D or 1–4 to answer.

Class filters apply to every mode, so you can quiz yourself on only anti-infectives or only corticosteroids.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Look and layout (light and dark themes) |
| `data.js` | All medication information. Edit this to add or correct a drug. |
| `quiz.js` | The hand-written practice questions. Add your own here. |
| `app.js` | Table, cards, flashcards and quiz logic |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

No build step or installs are needed. You can also open `index.html` straight from your computer.

## Put it on GitHub Pages

1. Sign in at [github.com](https://github.com) and click **New repository**. Name it (for example `nbrc-med-chart`), set it to **Public**, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**. Drag in all the files from this folder (`index.html`, `styles.css`, `data.js`, `quiz.js`, `app.js`, `README.md`, `.nojekyll`) and click **Commit changes**.
   The `.nojekyll` file is hidden on Mac and Windows by default. If you can't see it, the site still works without it.
3. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose the `main` branch and the `/ (root)` folder, and click **Save**.
4. Wait a minute or two, then refresh the Pages settings. Your site's address appears at the top, in the form `https://<your-username>.github.io/nbrc-med-chart/`.

You can link straight to a mode by adding `#table`, `#cards`, `#flash` or `#quiz` to the end of the address.

## Adding or editing a drug

Open `data.js` and copy an existing entry. Each entry looks like this:

```js
{c:"beta", g:"Albuterol", b:"Proventil HFA, Ventolin HFA", t:"SABA (short-acting β2 agonist)",
 str:["0.5% (5 mg/mL) concentrate"],
 dose:["SVN: 2.5 mg TID–QID"],
 opd:{on:"5–15 min", pk:"30–60 min", du:"4–6 hr"},
 eff:["Rapid bronchodilation"],
 adv:["Tachycardia, tremor"],
 haz:["Stop if HR rises more than 20/min"],
 dev:["Nebulizer","pMDI"],
 note:["Most tested rescue drug"]},
```

`c` must be one of the class keys at the top of the file (`beta`, `anti`, `combo`, `xan`, `bio`, `masto`, `ltm`, `abx`, `muco`, `ster`, `dil`). Wrap a bullet's start in `W("Label")+` to add a red warning flag, for example `W("Boxed warning")+"Never use alone in asthma"`. New drugs show up automatically in every mode, including the auto-generated quiz questions.

## Disclaimer

Doses are typical adult values from standard respiratory therapy pharmacology texts, for exam study only. Pediatric doses differ, and several brands listed are discontinued in the US but still appear in textbooks and practice exams. Always follow the current order and package insert in clinical practice.
