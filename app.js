/* NBRC Respiratory Pharmacology Chart — app logic (table, cards, flashcards, quiz).
   Data comes from data.js (CATS, D, W, K) and quiz.js (QUIZ). No build step needed. */
(function () {
  "use strict";

  const FIELDS = [
    ["str", "Strength", true],
    ["dose", "Dosage", true],
    ["eff", "Clinical effects & indications"],
    ["adv", "Adverse / side effects"],
    ["haz", "Hazards / special considerations"],
    ["dev", "Device"],
    ["note", "Notes / good to know"]
  ];
  const LABEL = Object.fromEntries(FIELDS.map(f => [f[0], f[1]]));
  LABEL.t = "Drug class";
  LABEL.all = "Everything";

  const $ = id => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("nbrc:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("nbrc:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const strip = s => String(s).replace(/<[^>]+>/g, "");
  const escapeHTML = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const list = a => `<ul class="b">${a.map(x => `<li>${x}</li>`).join("")}</ul>`;
  const devs = a => `<div class="dev">${a.map(x => `<span class="tag">${x}</span>`).join("")}</div>`;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const firstBrand = b => b.split(/[,;(]/)[0].trim();
  const catKeys = Object.keys(CATS);

  D.forEach((d, i) => {
    d.id = i;
    d._s = strip([d.g, d.b, d.t, CATS[d.c].n, ...FIELDS.flatMap(f => d[f[0]])].join(" ")).toLowerCase();
  });

  /* ---------- shared state ---------- */
  const active = new Set(store.get("classes", []).filter(k => CATS[k]));
  let view = "table";
  const pool = () => D.filter(d => !active.size || active.has(d.c));
  const hints = {
    table: "Filter by class, search any term, or turn on Hide answers and tap a cell to check yourself.",
    cards: "Tap a card to open its details. Class filters and search apply here too.",
    flash: "Flashcards follow the class filter. Pick what to study, then tap the card (or press Space) to flip it.",
    quiz: "The quiz draws from the classes you select. With no class selected it covers every class."
  };

  /* ---------- class chips ---------- */
  const chipsEl = $("chips");
  const allChip = document.createElement("button");
  allChip.type = "button"; allChip.className = "chip"; allChip.id = "chip-all";
  allChip.style.setProperty("--k", "var(--accent)");
  allChip.innerHTML = `<span class="dot"></span>All classes <span class="n">${D.length}</span>`;
  allChip.onclick = () => { active.clear(); syncChips(); onFilter(); };
  chipsEl.appendChild(allChip);
  catKeys.forEach(k => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.id = "chip-" + k; b.dataset.k = k;
    b.style.setProperty("--k", K(k));
    b.innerHTML = `<span class="dot"></span>${CATS[k].n.replace(/ \(.*\)/, "")} <span class="n">${D.filter(d => d.c === k).length}</span>`;
    b.onclick = () => { active.has(k) ? active.delete(k) : active.add(k); syncChips(); onFilter(); };
    chipsEl.appendChild(b);
  });
  function syncChips() {
    allChip.setAttribute("aria-pressed", String(!active.size));
    chipsEl.querySelectorAll("[data-k]").forEach(c => c.setAttribute("aria-pressed", String(active.has(c.dataset.k))));
    store.set("classes", [...active]);
  }

  const q = $("q");
  q.addEventListener("input", () => { renderTable(); renderCards(); updateCount(); });

  function onFilter() {
    renderTable(); renderCards(); buildDeck(false); renderFlash();
    if (quiz.stage !== "question") renderQuizSetup();
    updateCount();
  }

  function updateCount() {
    const term = q.value.trim().toLowerCase();
    const n = pool().filter(d => !term || d._s.includes(term)).length;
    let t;
    if (view === "flash") t = `${deck.length} card${deck.length === 1 ? "" : "s"} in this set`;
    else if (view === "quiz") t = `${buildQuestionPool().length} questions available`;
    else t = `${n} of ${D.length} medications`;
    $("count").textContent = t;
  }

  /* ---------- views ---------- */
  function setView(v) {
    view = v;
    document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", String(t.dataset.view === v)));
    ["table", "cards", "flash", "quiz"].forEach(n => { $("view-" + n).hidden = n !== v; });
    $("searchrow").hidden = !(v === "table" || v === "cards");
    $("blur").hidden = v !== "table";
    document.querySelector(".bar").classList.toggle("static", v === "flash" || v === "quiz");
    $("hint").textContent = hints[v];
    store.set("view", v);
    try { if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v); } catch (e) { /* not allowed in some embeds */ }
    updateCount();
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));

  /* ---------- table ---------- */
  const tb = $("tb");
  let blur = false;
  $("blur").onclick = () => {
    blur = !blur;
    $("blur").setAttribute("aria-pressed", String(blur));
    $("tbl").classList.toggle("blur", blur);
    tb.querySelectorAll(".shown").forEach(c => c.classList.remove("shown"));
  };
  tb.addEventListener("click", e => { if (!blur) return; const td = e.target.closest("td.hideable"); if (td) td.classList.toggle("shown"); });

  function grouped() {
    const term = q.value.trim().toLowerCase();
    return catKeys
      .filter(k => !active.size || active.has(k))
      .map(k => [k, D.filter(d => d.c === k && (!term || d._s.includes(term)))])
      .filter(([, rows]) => rows.length);
  }
  const nameCell = d => `<span class="gen">${d.g}</span><span class="brand">${d.b}</span><span class="cat">${d.t}</span>`;

  function renderTable() {
    const groups = grouped();
    tb.innerHTML = groups.map(([k, rows]) =>
      `<tr class="group" style="--k:${K(k)}"><td colspan="8">${CATS[k].n}<span>${CATS[k].s}</span></td></tr>` +
      rows.map(d => `<tr style="--k:${K(k)}">
        <td class="name">${nameCell(d)}</td>
        <td class="mono hideable"><div>${list(d.str)}</div></td>
        <td class="mono hideable"><div>${list(d.dose)}</div></td>
        <td class="wide hideable"><div>${list(d.eff)}</div></td>
        <td class="w hideable"><div>${list(d.adv)}</div></td>
        <td class="wide hideable"><div>${list(d.haz)}</div></td>
        <td class="hideable">${devs(d.dev)}</td>
        <td class="wide hideable"><div>${list(d.note)}</div></td>
      </tr>`).join("")
    ).join("") || `<tr><td colspan="8" class="empty">No medications match "${escapeHTML(q.value)}". Try a generic name, brand, or side effect.</td></tr>`;
  }

  /* ---------- cards ---------- */
  function renderCards() {
    const groups = grouped();
    $("cardsOut").innerHTML = groups.map(([k, rows]) =>
      `<h2 class="grouphead" style="--k:${K(k)}">${CATS[k].n}<span>${CATS[k].s}</span></h2>
       <div class="grid">${rows.map(d => `
        <details class="dcard" style="--k:${K(k)}">
          <summary>${nameCell(d)}${devs(d.dev)}<span class="more"></span></summary>
          <div class="dbody">${FIELDS.filter(f => f[0] !== "dev").map(([f, label, mono]) =>
            `<div class="field"><h4>${label}</h4><div class="${mono ? "mono" : ""}">${list(d[f])}</div></div>`).join("")}
          </div>
        </details>`).join("")}</div>`
    ).join("") || `<p class="empty">No medications match "${escapeHTML(q.value)}".</p>`;
  }
  $("expandAll").onclick = () => document.querySelectorAll(".dcard").forEach(d => d.open = true);
  $("collapseAll").onclick = () => document.querySelectorAll(".dcard").forEach(d => d.open = false);

  /* ---------- flashcards ---------- */
  const known = new Set(store.get("known", []));
  let deck = [], pos = 0, skipKnown = store.get("skipKnown", false), shuffled = false;
  const fCard = $("fCard"), fField = $("fField");
  fField.value = store.get("field", "all");
  $("fHideKnown").setAttribute("aria-pressed", String(skipKnown));

  function buildDeck(doShuffle) {
    if (doShuffle !== undefined) shuffled = doShuffle || shuffled;
    let ids = pool().filter(d => !skipKnown || !known.has(d.g)).map(d => d.id);
    deck = shuffled ? shuffle(ids) : ids;
    pos = Math.min(pos, Math.max(0, deck.length - 1));
  }
  function unflipInstantly() {
    const inner = fCard.querySelector(".finner");
    inner.style.transition = "none";
    fCard.classList.remove("flipped");
    void inner.offsetWidth;
    inner.style.transition = "";
  }
  function backContent(d, f) {
    if (f === "t") return `<div class="field"><h4>Drug class</h4><ul class="b"><li>${d.t}</li><li>${CATS[d.c].n}</li></ul></div>`;
    if (f === "dev") return `<div class="field"><h4>Device</h4>${devs(d.dev)}</div>`;
    const fs = f === "all" ? FIELDS.map(x => x[0]) : [f];
    return fs.map(x => `<div class="field"><h4>${LABEL[x]}</h4>${x === "dev" ? devs(d.dev) : list(d[x])}</div>`).join("");
  }
  function renderFlash() {
    const f = fField.value;
    const total = pool().length;
    const knownHere = pool().filter(d => known.has(d.g)).length;
    $("fKnown").textContent = `${knownHere} of ${total} known`;
    $("fBar").style.width = total ? (knownHere / total * 100) + "%" : "0";
    unflipInstantly();
    if (!deck.length) {
      fCard.style.setProperty("--k", "var(--good)");
      $("fPos").textContent = "Set complete";
      $("fFront").innerHTML = `<span class="gen">Nice work.</span><span class="brand">Every card in this set is marked known. Turn off "Skip known cards" or reset progress to go again.</span>`;
      $("fBack").innerHTML = "";
      return;
    }
    const d = D[deck[pos]];
    fCard.style.setProperty("--k", K(d.c));
    $("fPos").textContent = `Card ${pos + 1} of ${deck.length}`;
    $("fFront").innerHTML =
      `${f === "t" ? "" : `<span class="cat" style="--k:${K(d.c)}">${d.t}</span>`}
       <span class="gen">${d.g}</span><span class="brand">${d.b}</span>
       ${known.has(d.g) ? `<span class="known-badge">Known</span>` : ""}
       <span class="asking">Recall: ${LABEL[f]}</span>
       <span class="flip-hint">Tap or press Space to flip</span>`;
    $("fBack").innerHTML = `<span class="gen" style="font-size:18px">${d.g}</span>${backContent(d, f)}`;
  }
  function flip() { if (deck.length) fCard.classList.toggle("flipped"); }
  function move(step) { if (!deck.length) return; pos = (pos + step + deck.length) % deck.length; renderFlash(); }
  function mark(isKnown) {
    if (!deck.length) return;
    const d = D[deck[pos]];
    isKnown ? known.add(d.g) : known.delete(d.g);
    store.set("known", [...known]);
    if (skipKnown && isKnown) { deck.splice(pos, 1); if (pos >= deck.length) pos = 0; renderFlash(); updateCount(); }
    else move(1);
  }
  fCard.addEventListener("click", flip);
  $("fPrev").onclick = () => move(-1);
  $("fNext").onclick = () => move(1);
  $("fGot").onclick = () => mark(true);
  $("fAgain").onclick = () => mark(false);
  $("fShuffle").onclick = () => { shuffled = true; pos = 0; buildDeck(true); renderFlash(); };
  $("fHideKnown").onclick = () => {
    skipKnown = !skipKnown; store.set("skipKnown", skipKnown);
    $("fHideKnown").setAttribute("aria-pressed", String(skipKnown));
    pos = 0; buildDeck(); renderFlash(); updateCount();
  };
  $("fReset").onclick = () => { known.clear(); store.set("known", []); pos = 0; buildDeck(); renderFlash(); updateCount(); };
  fField.onchange = () => { store.set("field", fField.value); renderFlash(); };

  /* ---------- quiz ---------- */
  const quiz = { stage: "setup", qs: [], i: 0, score: 0, misses: [], size: store.get("quizSize", 10) };
  const LETTERS = ["A", "B", "C", "D"];

  function autoQuestions() {
    const out = [];
    pool().forEach(d => {
      const others = catKeys.filter(k => k !== d.c);
      out.push({
        c: d.c, q: `Which drug class does ${d.g} belong to?`, a: CATS[d.c].n,
        o: shuffle(others).slice(0, 3).map(k => CATS[k].n),
        x: `${d.g} (${firstBrand(d.b)}) is a ${d.t}.`
      });
      if (d.c !== "dil") {
        const same = D.filter(x => x.id !== d.id && x.c === d.c);
        const rest = D.filter(x => x.id !== d.id && x.c !== d.c && x.c !== "dil");
        const distract = shuffle(same).concat(shuffle(rest)).slice(0, 3).map(x => x.g);
        out.push({
          c: d.c, q: `${firstBrand(d.b)} is the brand name for which drug?`, a: d.g, o: distract,
          x: `${firstBrand(d.b)} is ${d.g}, a ${d.t}.`
        });
      }
    });
    return out;
  }
  function buildQuestionPool() {
    const curated = QUIZ.filter(x => !active.size || active.has(x.c));
    return curated.concat(autoQuestions());
  }
  function makeRound(n) {
    const curated = shuffle(QUIZ.filter(x => !active.size || active.has(x.c)));
    const auto = shuffle(autoQuestions());
    // Favor the hand-written NBRC-style questions: about 2 of every 3.
    const round = [];
    while (round.length < n && (curated.length || auto.length)) {
      const pickCurated = curated.length && (!auto.length || round.length % 3 !== 2);
      round.push(pickCurated ? curated.pop() : auto.pop());
    }
    return shuffle(round).map(x => ({ ...x, opts: shuffle([x.a, ...x.o]) }));
  }

  const out = $("quizOut");
  function renderQuizSetup() {
    quiz.stage = "setup";
    const avail = buildQuestionPool().length;
    const scope = active.size ? [...active].map(k => CATS[k].n.replace(/ \(.*\)/, "")).join(", ") : "all classes";
    out.innerHTML = `
      <div class="qbox" style="--k:var(--accent)">
        <span class="qnum">Practice quiz</span>
        <p class="qtext">Test yourself with NBRC-style multiple-choice questions on ${escapeHTML(scope)}.</p>
        <p class="hint">${avail} questions available. Scenario questions are mixed with drug-class and brand-name recall. Use the class chips above to focus on one area.</p>
        <div class="setup">
          <label class="inline" for="qSize">Questions
            <select id="qSize">
              ${[10, 20, 30].filter(n => n < avail).map(n => `<option value="${n}"${quiz.size == n ? " selected" : ""}>${n}</option>`).join("")}
              <option value="${avail}"${quiz.size >= avail ? " selected" : ""}>All ${avail}</option>
            </select>
          </label>
          <button class="btn primary" type="button" id="qStart"${avail ? "" : " disabled"}>Start quiz</button>
        </div>
      </div>`;
    $("qSize").onchange = e => { quiz.size = +e.target.value; store.set("quizSize", quiz.size); };
    $("qStart").onclick = () => startQuiz(makeRound(+$("qSize").value));
  }
  function startQuiz(qs) {
    Object.assign(quiz, { stage: "question", qs, i: 0, score: 0, misses: [] });
    renderQuestion();
  }
  function renderQuestion() {
    const x = quiz.qs[quiz.i];
    quiz.answered = false;
    out.innerHTML = `
      <div class="meter"><span>Question ${quiz.i + 1} of ${quiz.qs.length}</span><span>Score ${quiz.score}</span></div>
      <div class="progress"><i style="width:${quiz.i / quiz.qs.length * 100}%"></i></div>
      <div class="qbox" style="--k:${K(x.c)}">
        <span class="qnum">${CATS[x.c].n.replace(/ \(.*\)/, "")}</span>
        <p class="qtext">${x.q}</p>
        <div class="opts">${x.opts.map((o, j) => `<button class="opt" type="button" data-j="${j}"><b>${LETTERS[j]}</b><span>${o}</span></button>`).join("")}</div>
        <div id="qAfter"></div>
      </div>
      <div class="row"><button class="btn" type="button" id="qQuit">End quiz</button></div>`;
    out.querySelectorAll(".opt").forEach(b => b.onclick = () => answer(+b.dataset.j));
    $("qQuit").onclick = showResults;
  }
  function answer(j) {
    if (quiz.answered) return;
    quiz.answered = true;
    const x = quiz.qs[quiz.i];
    const chosen = x.opts[j], right = chosen === x.a;
    if (right) quiz.score++; else quiz.misses.push({ ...x, chosen });
    out.querySelectorAll(".opt").forEach(b => {
      const o = x.opts[+b.dataset.j];
      b.disabled = true;
      if (o === x.a) b.classList.add("right");
      else if (+b.dataset.j === j) b.classList.add("wrong");
    });
    const last = quiz.i === quiz.qs.length - 1;
    $("qAfter").innerHTML = `
      <p class="explain"><strong class="${right ? "ok" : "no"}">${right ? "Correct." : "Not quite."}</strong> ${x.x}</p>
      <div class="row"><button class="btn primary" type="button" id="qNext">${last ? "See results" : "Next question →"}</button></div>`;
    $("qNext").onclick = () => { if (last) showResults(); else { quiz.i++; renderQuestion(); } };
    $("qNext").focus();
  }
  function showResults() {
    quiz.stage = "results";
    const done = quiz.answered ? quiz.i + 1 : quiz.i;
    const pct = done ? Math.round(quiz.score / done * 100) : 0;
    const msg = pct >= 90 ? "Exam-ready on this set." : pct >= 75 ? "Solid. Review the misses below." : pct >= 60 ? "Getting there. Drill the misses with flashcards." : "Keep studying this set, then try again.";
    out.innerHTML = `
      <div class="qbox" style="--k:${pct >= 75 ? "var(--good)" : "var(--warn)"}">
        <span class="qnum">Results</span>
        <div class="score">${quiz.score}/${done}</div>
        <p class="qtext">${pct}% · ${msg}</p>
        <div class="row">
          <button class="btn primary" type="button" id="qAgain">New quiz</button>
          ${quiz.misses.length ? `<button class="btn" type="button" id="qRetry">Retry the ${quiz.misses.length} missed</button>` : ""}
        </div>
      </div>
      ${quiz.misses.length ? `<div class="review"><h2 class="grouphead" style="--k:var(--warn)">Review what you missed</h2>
        ${quiz.misses.map(m => `<div class="item"><p><strong>${m.q}</strong></p><p>You chose: ${m.chosen}</p><p class="a">Answer: ${m.a}</p><p class="hint">${m.x}</p></div>`).join("")}</div>` : ""}`;
    $("qAgain").onclick = renderQuizSetup;
    if ($("qRetry")) $("qRetry").onclick = () => startQuiz(shuffle(quiz.misses).map(m => ({ ...m, opts: shuffle([m.a, ...m.o]) })));
  }

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", e => {
    if (e.target.closest("input,select,textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (view === "flash") {
      if (e.key === " " || e.key === "Enter") { if (e.target.closest("button") && e.target !== fCard) return; e.preventDefault(); flip(); }
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key.toLowerCase() === "k") mark(true);
      else if (e.key.toLowerCase() === "l") mark(false);
    } else if (view === "quiz" && quiz.stage === "question" && !quiz.answered) {
      const idx = "abcd".indexOf(e.key.toLowerCase()) >= 0 ? "abcd".indexOf(e.key.toLowerCase()) : "1234".indexOf(e.key);
      if (idx >= 0 && idx < quiz.qs[quiz.i].opts.length) answer(idx);
    }
  });

  /* ---------- start ---------- */
  syncChips();
  renderTable(); renderCards(); buildDeck(false); renderFlash(); renderQuizSetup();
  const start = (location.hash || "").slice(1);
  setView(["table", "cards", "flash", "quiz"].includes(start) ? start : store.get("view", "table"));
})();
