(() => {
  const $ = (s) => document.querySelector(s);
  const NS = "http://www.w3.org/2000/svg";
  const COL = [
    { id: "red", name: "Red" },
    { id: "green", name: "Green" },
    { id: "yellow", name: "Yellow" },
    { id: "blue", name: "Blue" },
  ];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ABORT = {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const spd = (ms) => (reduce ? Math.min(ms, 40) : ms);

  /* ---------- Board geometry (15x15 grid, clockwise track of 52 squares) ---------- */
  const PATH = [];
  const seg = (r, c, dr, dc, n) => {
    for (let i = 0; i < n; i++) PATH.push([r + dr * i, c + dc * i]);
  };
  seg(6, 1, 0, 1, 5);
  seg(5, 6, -1, 0, 6);
  seg(0, 7, 0, 1, 2);
  seg(1, 8, 1, 0, 5);
  seg(6, 9, 0, 1, 6);
  seg(7, 14, 1, 0, 2);
  seg(8, 13, 0, -1, 5);
  seg(9, 8, 1, 0, 6);
  seg(14, 7, 0, -1, 2);
  seg(13, 6, -1, 0, 5);
  seg(8, 5, 0, -1, 6);
  seg(7, 0, -1, 0, 2);
  const HOME = [
    [1, 2, 3, 4, 5].map((c) => [7, c]), // red: row 7 from the left
    [1, 2, 3, 4, 5].map((r) => [r, 7]), // green: column 7 from the top
    [13, 12, 11, 10, 9].map((c) => [7, c]), // yellow: row 7 from the right
    [13, 12, 11, 10, 9].map((r) => [r, 7]), // blue: column 7 from the bottom
  ];
  const BASEO = [
    [0, 0],
    [9, 0],
    [9, 9],
    [0, 9],
  ]; // [x,y] of each base square
  const DIR = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ];
  const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
  const absIdx = (ci, pos) => (ci * 13 + pos) % 52;

  function starPts(cx, cy, R, r) {
    let p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        k = i % 2 ? r : R;
      p.push(
        (cx + Math.cos(a) * k).toFixed(3) +
          "," +
          (cy + Math.sin(a) * k).toFixed(3),
      );
    }
    return p.join(" ");
  }

  function buildBoard() {
    let s = `<svg viewBox="0 0 15 15" xmlns="${NS}" role="img" aria-label="Ludo board"><defs><clipPath id="bc"><rect width="15" height="15" rx=".55"/></clipPath></defs><g clip-path="url(#bc)">`;
    s += `<rect width="15" height="15" fill="var(--board)"/>`;
    COL.forEach((c, i) => {
      const [ox, oy] = BASEO[i];
      s +=
        `<g class="base" data-c="${i}"><rect x="${ox}" y="${oy}" width="6" height="6" fill="var(--${c.id})"/>` +
        `<rect x="${ox + 1}" y="${oy + 1}" width="4" height="4" rx=".55" fill="var(--board)"/>`;
      [
        [2, 2],
        [4, 2],
        [2, 4],
        [4, 4],
      ].forEach(([a, b]) => {
        s += `<circle cx="${ox + a}" cy="${oy + b}" r=".66" fill="var(--cell)" stroke="var(--${c.id})" stroke-width=".1"/>`;
      });
      s += `<rect class="bring" x="${ox + 0.1}" y="${oy + 0.1}" width="5.8" height="5.8" rx=".3"/></g>`;
    });
    PATH.forEach(([r, c], i) => {
      const sc = i % 13 === 0 ? COL[i / 13].id : null;
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${sc ? `var(--${sc})` : "var(--cell)"}" stroke="var(--cellline)" stroke-width=".05"/>`;
      if (sc)
        s += `<polygon points="${starPts(c + 0.5, r + 0.5, 0.3, 0.13)}" fill="#fff" opacity=".9"/>`;
      else if (SAFE.has(i))
        s += `<polygon points="${starPts(c + 0.5, r + 0.5, 0.32, 0.14)}" fill="var(--star)"/>`;
    });
    HOME.forEach((cells, i) =>
      cells.forEach(([r, c]) => {
        s += `<rect x="${c}" y="${r}" width="1" height="1" fill="var(--${COL[i].id})" stroke="var(--cellline)" stroke-width=".05" opacity=".92"/>`;
      }),
    );
    const tri = [
      [
        [6, 6],
        [6, 9],
      ],
      [
        [6, 6],
        [9, 6],
      ],
      [
        [9, 6],
        [9, 9],
      ],
      [
        [6, 9],
        [9, 9],
      ],
    ];
    tri.forEach((t, i) => {
      s += `<polygon points="${t[0].join(",")} ${t[1].join(",")} 7.5,7.5" fill="var(--${COL[i].id})" stroke="var(--board)" stroke-width=".06"/>`;
    });
    s += `<circle cx="7.5" cy="7.5" r=".26" fill="var(--board)"/></g></svg>`;
    $("#board").insertAdjacentHTML("afterbegin", s);
  }
  buildBoard();

  const PAWN = `<svg viewBox="0 0 40 52"><ellipse cx="20" cy="46" rx="15" ry="5.2" fill="rgba(0,0,0,.28)"/><path d="M20 9c-5 0-8.2 3-8.2 7 0 2.8 1.6 4.8 3.8 5.9C12.8 26 9.7 33 8 43.5c0 1.4 5 3.3 12 3.3s12-1.9 12-3.3c-1.700-10.500-4.800-17.500-7.600-21.600 2.200-1.100 3.800-3.100 3.800-5.900 0-4-3.200-7-8.200-7z" fill="var(--tc)" stroke="var(--tcd)" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="16.200" cy="14" rx="3" ry="2.300" fill="#fff" opacity=".45"/><path d="M11.500 40.500c5 2 12 2 17 0" fill="none" stroke="var(--tcd)" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>`;

  /* ---------- Sound ---------- */
  let AC = null,
    muted = false;
  try {
    muted = localStorage.getItem("ludo-muted") === "1";
  } catch (e) {}
  function ac() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(f, d, type = "sine", vol = 0.07, delay = 0, to) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + d + 0.03);
  }
  const sfx = {
    step: () => tone(560 + Math.random() * 60, 0.07, "triangle", 0.06),
    roll: () => {
      for (let i = 0; i < 7; i++)
        tone(220 + Math.random() * 260, 0.05, "square", 0.03, i * 0.085);
    },
    capture: () => {
      tone(420, 0.3, "sawtooth", 0.06, 0, 110);
      tone(300, 0.3, "square", 0.04, 0.05, 80);
    },
    home: () =>
      [523, 659, 784, 1046].forEach((f, i) =>
        tone(f, 0.22, "triangle", 0.07, i * 0.09),
      ),
    out: () => {
      tone(392, 0.1, "triangle", 0.07);
      tone(587, 0.16, "triangle", 0.07, 0.08);
    },
    win: () =>
      [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) =>
        tone(f, 0.28, "triangle", 0.08, i * 0.13),
      ),
    pick: () => tone(880, 0.08, "sine", 0.05),
  };
  function syncMute() {
    const b = $("#muteBtn");
    b.textContent = muted ? "Sound off" : "Sound on";
    b.setAttribute("aria-pressed", String(muted));
  }
  $("#muteBtn").addEventListener("click", () => {
    muted = !muted;
    try {
      localStorage.setItem("ludo-muted", muted ? "1" : "0");
    } catch (e) {}
    syncMute();
    if (!muted) sfx.pick();
  });
  syncMute();

  /* ---------- State ---------- */
  let G = 0,
    state = null;
  let cfg = ["human", "bot", "bot", "bot"];
  const dieEl = $("#die");
  dieEl.innerHTML = '<span class="pip"></span>'.repeat(9);
  const PIPS = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  function setFace(v) {
    [...dieEl.children].forEach((p, i) =>
      p.classList.toggle("on", PIPS[v].includes(i)),
    );
    dieEl.setAttribute("aria-label", "Die shows " + v);
  }
  setFace(5);

  /* ---------- Setup UI ---------- */
  function drawSetup() {
    const rows = $("#rows");
    rows.innerHTML = "";
    COL.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "prow";
      row.innerHTML = `<span class="dot" style="background:var(--${c.id})"></span><span class="nm">${c.name}</span>`;
      const sg = document.createElement("div");
      sg.className = "seg";
      sg.setAttribute("role", "radiogroup");
      sg.setAttribute("aria-label", c.name + " player");
      [
        ["human", "Human"],
        ["bot", "Computer"],
        ["off", "Off"],
      ].forEach(([m, l]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = l;
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(cfg[i] === m));
        b.addEventListener("click", () => {
          cfg[i] = m;
          drawSetup();
        });
        sg.appendChild(b);
      });
      row.appendChild(sg);
      rows.appendChild(row);
    });
    const n = cfg.filter((m) => m !== "off").length;
    $("#hint").textContent = n < 2 ? "Turn on at least two colours." : "";
    $("#startBtn").disabled = n < 2;
  }
  document.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = b.dataset.preset;
      cfg =
        p === "duel"
          ? ["human", "off", "bot", "off"]
          : p === "trio"
            ? ["human", "bot", "bot", "bot"]
            : ["human", "human", "human", "human"];
      drawSetup();
    }),
  );
  drawSetup();

  /* ---------- Game setup ---------- */
  function startGame() {
    ac();
    G++;
    $("#setup").hidden = true;
    $("#win").hidden = true;
    $("#tokens").innerHTML = "";
    const players = [];
    cfg.forEach((m, ci) => {
      if (m === "off") return;
      const p = {
        ci,
        id: COL[ci].id,
        name: COL[ci].name,
        bot: m === "bot",
        rank: 0,
        tokens: [],
      };
      for (let i = 0; i < 4; i++) {
        const el = document.createElement("div");
        el.className = "token";
        el.style.setProperty("--tc", `var(--${p.id})`);
        el.style.setProperty("--tcd", `var(--${p.id}-d)`);
        el.innerHTML = `<div class="pawn">${PAWN}</div>`;
        $("#tokens").appendChild(el);
        const t = { p, i, pos: -1, el };
        el.addEventListener("click", () => pickToken(t));
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pickToken(t);
          }
        });
        p.tokens.push(t);
      }
      players.push(p);
    });
    state = {
      players,
      cur: 0,
      finished: 0,
      log: [],
      rollResolve: null,
      pick: null,
      over: false,
      six: 0,
      lastRoll: null,
    };
    render();
    playTurns(G).catch((e) => {
      if (e !== ABORT) console.error(e);
    });
  }
  $("#startBtn").addEventListener("click", startGame);
  $("#againBtn").addEventListener("click", startGame);
  $("#changeBtn").addEventListener("click", () => {
    $("#win").hidden = true;
    $("#setup").hidden = false;
  });
  $("#newBtn").addEventListener("click", () => {
    G++;
    if (state) {
      state.rollResolve = null;
      state.pick = null;
    }
    $("#win").hidden = true;
    $("#setup").hidden = false;
    setDieState(false);
  });

  /* ---------- Rendering ---------- */
  function unit(t) {
    const c = t.p.ci,
      pos = t.pos;
    if (pos === -1) {
      const [ox, oy] = BASEO[c];
      return [ox + [2, 2, 4, 4][t.i], oy + [2, 4, 2, 4][t.i]];
    }
    if (pos <= 50) {
      const [r, cc] = PATH[absIdx(c, pos)];
      return [cc + 0.5, r + 0.5];
    }
    if (pos <= 55) {
      const [r, cc] = HOME[c][pos - 51];
      return [cc + 0.5, r + 0.5];
    }
    const d = DIR[c],
      k = (t.i - 1.5) * 0.34;
    return [7.5 + d[0] * 0.8 - d[1] * k, 7.5 + d[1] * 0.8 + d[0] * k];
  }
  function render() {
    if (!state) return;
    const groups = new Map();
    for (const p of state.players)
      for (const t of p.tokens) {
        const [x, y] = unit(t);
        t._x = x;
        t._y = y;
        const k = x.toFixed(2) + "," + y.toFixed(2);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(t);
      }
    const canSet = state.pick ? new Set(state.pick.moves) : null;
    for (const g of groups.values()) {
      const n = g.length;
      g.forEach((t, i) => {
        let dx = 0,
          dy = 0,
          s = t.pos === 56 ? 0.58 : 1;
        if (n > 1 && t.pos !== 56) {
          s = n === 2 ? 0.84 : 0.72;
          if (n === 2) {
            dx = (i ? 1 : -1) * 0.2;
          } else {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            dx = Math.cos(a) * 0.26;
            dy = Math.sin(a) * 0.2;
          }
        }
        t.el.style.left = ((t._x + dx) / 15) * 100 + "%";
        t.el.style.top = ((t._y + dy) / 15) * 100 + "%";
        t.el.style.setProperty("--s", s);
        t.el.style.zIndex = Math.round((t._y + dy) * 10) + (t.lift ? 400 : 0);
        const can = !!(canSet && canSet.has(t));
        t.el.classList.toggle("can", can);
        if (can) {
          t.el.setAttribute("tabindex", "0");
          t.el.setAttribute("role", "button");
          t.el.setAttribute("aria-label", `${t.p.name} pawn ${t.i + 1}, move`);
        } else {
          t.el.removeAttribute("tabindex");
          t.el.removeAttribute("role");
          t.el.removeAttribute("aria-label");
        }
      });
    }
    const cur = state.players[state.cur];
    document
      .querySelectorAll(".base")
      .forEach((b) =>
        b.classList.toggle("active", !state.over && +b.dataset.c === cur.ci),
      );
    $("#shell").style.setProperty("--tc", `var(--${cur.id})`);
    $("#shell").style.setProperty("--tcd", `var(--${cur.id}-d)`);
    $("#plist").innerHTML = state.players
      .map((p, i) => {
        const home = p.tokens.filter((t) => t.pos === 56).length;
        return (
          `<li class="${i === state.cur && !state.over ? "active" : ""}" style="--pc:var(--${p.id})"><span class="dot"></span><span class="nm">${p.name}<span class="sub">${p.bot ? "Computer" : "Human"}${p.rank ? " · finished" : ""}</span></span>` +
          (p.rank
            ? `<span class="rk">#${p.rank}</span>`
            : `<span class="pips" aria-label="${home} of 4 home">${[0, 1, 2, 3].map((k) => `<i class="${k < home ? "on" : ""}"></i>`).join("")}</span>`) +
          `</li>`
        );
      })
      .join("");
    $("#log").innerHTML =
      state.log
        .slice(0, 5)
        .map(
          (l) => `<li><i style="background:var(--${l.id})"></i>${l.text}</li>`,
        )
        .join("") ||
      '<li style="color:var(--muted)">Moves will appear here.</li>';
  }
  function setTurn(name, msg, id) {
    $("#turnName").textContent = name;
    $("#turnMsg").textContent = msg;
    $("#turnDot").style.background = `var(--${id})`;
  }
  function logMsg(p, text) {
    state.log.unshift({ id: p.id, text });
  }
  function setDieState(ready) {
    dieEl.disabled = !ready;
    dieEl.classList.toggle("ready", ready);
  }
  function anim(t, cls, ms) {
    t.el.classList.remove(cls);
    void t.el.offsetWidth;
    t.el.classList.add(cls);
    setTimeout(() => t.el.classList.remove(cls), ms);
  }

  /* ---------- Rules ---------- */
  const legal = (p, v) =>
    p.tokens.filter((t) =>
      t.pos === -1 ? v === 6 : t.pos < 56 && t.pos + v <= 56,
    );
  function threatened(p, idx) {
    if (SAFE.has(idx)) return false;
    for (const o of state.players) {
      if (o === p) continue;
      for (const t of o.tokens) {
        if (t.pos >= 0 && t.pos <= 50) {
          const d = (idx - absIdx(o.ci, t.pos) + 52) % 52;
          if (d >= 1 && d <= 6) return true;
        }
      }
    }
    return false;
  }
  function victimsAt(p, idx) {
    const out = [];
    if (SAFE.has(idx)) return out;
    for (const o of state.players) {
      if (o === p) continue;
      for (const t of o.tokens)
        if (t.pos >= 0 && t.pos <= 50 && absIdx(o.ci, t.pos) === idx)
          out.push(t);
    }
    return out;
  }
  function botScore(p, t, v) {
    const np = t.pos === -1 ? 0 : t.pos + v;
    let s = np * 0.6;
    if (np === 56) s += 100;
    else if (np > 50) s += 45;
    if (t.pos === -1) s += 55;
    if (np <= 50) {
      const idx = absIdx(p.ci, np);
      if (SAFE.has(idx)) s += 22;
      else {
        const vs = victimsAt(p, idx);
        if (vs.length) s += 95 + vs[0].pos * 0.5;
        if (threatened(p, idx)) s -= 28;
      }
    }
    if (t.pos >= 0 && t.pos <= 50 && threatened(p, absIdx(p.ci, t.pos)))
      s += 30;
    return s + Math.random() * 3;
  }

  /* ---------- Turn flow ---------- */
  const chk = (my) => {
    if (my !== G) throw ABORT;
  };
  async function animateDice(v, my) {
    dieEl.classList.add("rolling");
    sfx.roll();
    const end = performance.now() + spd(650);
    while (performance.now() < end) {
      setFace(1 + Math.floor(Math.random() * 6));
      await sleep(75);
      chk(my);
    }
    setFace(v);
    dieEl.classList.remove("rolling");
  }
  async function getRoll(p, my) {
    if (!p.bot) {
      setTurn(p.name, "Your turn. Tap the die to roll.", p.id);
      $("#diceTitle").textContent = "Roll the die";
      $("#diceSub").textContent = "Tap it or press Space";
      setDieState(true);
      await new Promise((res) => {
        state.rollResolve = res;
      });
      chk(my);
      setDieState(false);
    } else {
      setTurn(p.name, "Computer is rolling…", p.id);
      $("#diceTitle").textContent = "Computer turn";
      $("#diceSub").textContent = p.name + " is rolling";
      await sleep(spd(650));
      chk(my);
    }
    const v = 1 + Math.floor(Math.random() * 6);
    await animateDice(v, my);
    $("#diceTitle").textContent = p.name + " rolled a " + v;
    return v;
  }
  function pickToken(t) {
    if (!state || !state.pick || !state.pick.moves.includes(t)) return;
    const r = state.pick.resolve;
    state.pick = null;
    r(t);
  }
  async function choose(p, moves, my) {
    if (p.bot) {
      let best = moves[0],
        bs = -1e9;
      for (const t of moves) {
        const s = botScore(p, t, state.lastRoll);
        if (s > bs) {
          bs = s;
          best = t;
        }
      }
      await sleep(spd(550));
      chk(my);
      return best;
    }
    const same = new Set(moves.map((t) => t.pos)).size === 1;
    state.pick = { moves, resolve: null };
    render();
    if (same) {
      $("#diceSub").textContent = "Moving automatically";
      await sleep(spd(450));
      chk(my);
      const t = moves[0];
      state.pick = null;
      render();
      return t;
    }
    setTurn(
      p.name,
      "Tap a glowing pawn to move it " + state.lastRoll + ".",
      p.id,
    );
    $("#diceSub").textContent = "Choose a pawn";
    const t = await new Promise((res) => {
      state.pick.resolve = res;
    });
    chk(my);
    render();
    return t;
  }
  async function moveToken(p, t, v, my) {
    let bonus = false;
    t.lift = true;
    if (t.pos === -1) {
      t.pos = 0;
      render();
      anim(t, "pop", 320);
      sfx.out();
      await sleep(spd(320));
      logMsg(p, `${p.name} brings a pawn out`);
    } else {
      for (let i = 0; i < v; i++) {
        t.pos++;
        render();
        anim(t, "hop", 180);
        sfx.step();
        await sleep(spd(190));
        chk(my);
      }
    }
    t.lift = false;
    render();
    if (t.pos <= 50) {
      const vs = victimsAt(p, absIdx(p.ci, t.pos));
      if (vs.length) {
        for (const o of vs) {
          o.pos = -1;
          anim(o, "sent", 460);
          logMsg(p, `${p.name} captures a ${o.p.name} pawn`);
        }
        sfx.capture();
        bonus = true;
        await sleep(spd(220));
        render();
        await sleep(spd(280));
        chk(my);
      }
    }
    if (t.pos === 56) {
      bonus = true;
      sfx.home();
      logMsg(p, `${p.name} gets a pawn home`);
      render();
      if (p.tokens.every((x) => x.pos === 56)) {
        p.rank = ++state.finished;
        logMsg(p, `${p.name} finishes #${p.rank}`);
        const left = state.players.filter((x) => !x.rank);
        if (left.length <= 1) {
          if (left[0]) left[0].rank = ++state.finished;
          state.over = true;
        }
        bonus = false;
      }
      await sleep(spd(350));
      chk(my);
    }
    render();
    return bonus;
  }
  async function playTurns(my) {
    while (!state.over) {
      const p = state.players[state.cur];
      let again = true;
      state.six = 0;
      while (again && !state.over) {
        again = false;
        render();
        const v = await getRoll(p, my);
        state.lastRoll = v;
        if (v === 6) state.six++;
        else state.six = 0;
        if (state.six === 3) {
          logMsg(p, `${p.name} rolled three 6s, turn lost`);
          render();
          setTurn(p.name, "Three 6s in a row. Turn lost.", p.id);
          await sleep(spd(1100));
          chk(my);
          break;
        }
        const moves = legal(p, v);
        if (!moves.length) {
          logMsg(p, `${p.name} rolled ${v}, no move`);
          render();
          setTurn(p.name, "No move possible with a " + v + ".", p.id);
          await sleep(spd(950));
          chk(my);
          again = v === 6;
          continue;
        }
        const t = await choose(p, moves, my);
        state.pick = null;
        const bonus = await moveToken(p, t, v, my);
        again = !state.over && (v === 6 || bonus);
        if (again) {
          setTurn(p.name, "Bonus roll!", p.id);
          await sleep(spd(500));
          chk(my);
        }
      }
      if (state.over) break;
      do {
        state.cur = (state.cur + 1) % state.players.length;
      } while (state.players[state.cur].rank);
      render();
    }
    render();
    await sleep(spd(700));
    chk(my);
    showWin();
  }

  /* ---------- Win ---------- */
  function showWin() {
    setDieState(false);
    const order = [...state.players].sort((a, b) => a.rank - b.rank);
    const w = order[0];
    $("#winTitle").textContent = w.name + " wins!";
    setTurn(w.name + " wins", "Great game", w.id);
    $("#rank").innerHTML = order
      .map(
        (p) =>
          `<li style="--pc:var(--${p.id})"><span class="n">${p.rank}.</span><span class="dot"></span>${p.name}</li>`,
      )
      .join("");
    $("#win").firstElementChild.style.setProperty("--pc", `var(--${w.id})`);
    $("#win").hidden = false;
    sfx.win();
    confetti();
  }
  function confetti() {
    if (reduce) return;
    const cv = $("#confetti"),
      ctx = cv.getContext("2d");
    const W = (cv.width = innerWidth),
      H = (cv.height = innerHeight);
    const cols = ["#E5484D", "#2EA466", "#F3B31C", "#3E63DD", "#ffffff"];
    const ps = Array.from({ length: 150 }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.6,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      s: 5 + Math.random() * 7,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      c: cols[Math.floor(Math.random() * cols.length)],
    }));
    const end = performance.now() + 4500;
    (function f() {
      ctx.clearRect(0, 0, W, H);
      for (const q of ps) {
        q.x += q.vx;
        q.y += q.vy;
        q.r += q.vr;
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.r);
        ctx.fillStyle = q.c;
        ctx.fillRect(-q.s / 2, -q.s / 3, q.s, q.s * 0.6);
        ctx.restore();
      }
      if (performance.now() < end) requestAnimationFrame(f);
      else ctx.clearRect(0, 0, W, H);
    })();
  }

  /* ---------- Input ---------- */
  dieEl.addEventListener("click", () => {
    if (state && state.rollResolve) {
      const r = state.rollResolve;
      state.rollResolve = null;
      r();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!state || !state.rollResolve) return;
    if (
      $("#setup").hidden &&
      $("#win").hidden &&
      (e.key === " " || e.key === "r" || e.key === "R") &&
      !(document.activeElement && document.activeElement.tagName === "BUTTON")
    ) {
      e.preventDefault();
      dieEl.click();
    }
  });

  /* idle preview behind the setup card */
  (function preview() {
    const players = [0, 1, 2, 3].map((ci) => ({
      ci,
      id: COL[ci].id,
      name: COL[ci].name,
      bot: true,
      rank: 0,
      tokens: [],
    }));
    players.forEach((p) => {
      for (let i = 0; i < 4; i++) {
        const el = document.createElement("div");
        el.className = "token";
        el.style.setProperty("--tc", `var(--${p.id})`);
        el.style.setProperty("--tcd", `var(--${p.id}-d)`);
        el.innerHTML = `<div class="pawn">${PAWN}</div>`;
        $("#tokens").appendChild(el);
        p.tokens.push({ p, i, pos: -1, el });
      }
    });
    state = {
      players,
      cur: 0,
      finished: 0,
      log: [],
      rollResolve: null,
      pick: null,
      over: false,
      six: 0,
      lastRoll: null,
    };
    const sample = [
      [0, 0, 6],
      [1, 0, 19],
      [2, 0, 32],
      [3, 0, 45],
      [0, 1, 52],
      [2, 1, 10],
    ];
    sample.forEach(([pi, ti, pos]) => {
      players[pi].tokens[ti].pos = pos;
    });
    render();
    setFace(5);
    state = null;
  })();
})();
