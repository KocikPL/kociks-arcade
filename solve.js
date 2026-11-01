/* ============================================================
   kocik's arcade - "SET IT FOR EACH OTHER" multiplayer
   Each player secretly makes a puzzle for the OTHER one:
     Guess the Number (a number), Hangman (a word),
     Mastermind (a code), Depth Charge (a hidden submarine).
   Then both solve at the same time. Fewer mistakes/tries wins.
   Host-authoritative (the host keeps both secrets). Needs mpgames.js.
   ============================================================ */
"use strict";

var SOLVE_WORD_RE = /^[A-ZĄĆĘŁŃÓŚŹŻ]$/;

/* ---------- host side: one generic engine, one def per game ---------- */
function mpsMake(def, view) {
  function push(match, who, fb) {
    var s = match.s, ids = [match.a, match.b];
    for (var i = 0; i < 2; i++) {
      var id = ids[i], oid = ids[1 - i], p = s.pz[id], o = s.pz[oid];
      var msg = { t: "mpg_s", ph: "play", mine: def.view(p), done: p.done, solved: p.solved,
        opp: { used: o.used, done: o.done, solved: o.solved } };
      if (id === who && fb !== undefined) msg.fb = fb;
      mpDeliver(id, msg);
    }
  }
  return {
    start: function (match) {
      match.s = { ph: "setup", sec: {}, pz: {} };
      mpgSend(match, { ph: "setup" });
    },
    onMsg: function (match, id, m) {
      var s = match.s;
      if (s.ph === "setup") {
        if (m.secret === undefined || s.sec[id] !== undefined) return;
        var v = def.validate(m.secret);
        if (v === null) { mpDeliver(id, { t: "mpg_s", ph: "setup", err: true }); return; }
        s.sec[id] = v;
        mpDeliver(id, { t: "mpg_s", ph: "wait" });
        if (s.sec[match.a] !== undefined && s.sec[match.b] !== undefined) {
          s.ph = "play";
          s.pz[match.a] = def.init(s.sec[match.b]);
          s.pz[match.b] = def.init(s.sec[match.a]);
          push(match, null);
        }
        return;
      }
      if (m.g === undefined) return;
      var p = s.pz[id];
      if (!p || p.done) return;
      var r = def.guess(p, m.g);
      if (r.bad) return;
      push(match, id, r.fb);
      var pa = s.pz[match.a], pb = s.pz[match.b];
      if (pa.done && pb.done) {
        var w = null;
        if (pa.solved && !pb.solved) w = match.a;
        else if (pb.solved && !pa.solved) w = match.b;
        else if (pa.solved && pb.solved) {
          var ca = def.cost(pa), cb = def.cost(pb);
          if (ca < cb) w = match.a; else if (cb < ca) w = match.b;
        }
        mpgOver(match, w, { secA: def.reveal(s.sec[match.a]), secB: def.reveal(s.sec[match.b]),
          ua: pa.used, ub: pb.used, sa: pa.solved, sb: pb.solved });
      }
    },
    view: view
  };
}

/* ----- Guess the number ----- */
var SOLVE_GN = {
  validate: function (raw) {
    var n = parseInt(raw, 10);
    return (isNaN(n) || n < 1 || n > 100) ? null : n;
  },
  init: function (n) { return { secret: n, used: 0, hist: [], solved: false, done: false, max: 7 }; },
  guess: function (p, g) {
    g = parseInt(g, 10);
    if (isNaN(g) || g < 1 || g > 100) return { bad: true };
    p.used++;
    var res = g < p.secret ? "low" : (g > p.secret ? "high" : "win");
    p.hist.push([g, res]);
    if (res === "win") { p.solved = true; p.done = true; }
    else if (p.used >= p.max) p.done = true;
    return { fb: res };
  },
  view: function (p) { return { hist: p.hist, max: p.max, used: p.used }; },
  cost: function (p) { return p.used; },
  reveal: function (n) { return n; }
};

/* ----- Hangman ----- */
var SOLVE_HANG = {
  validate: function (raw) {
    var w = String(raw || "").toUpperCase().replace(/\s+/g, "");
    if (w.length < 3 || w.length > 14) return null;
    for (var i = 0; i < w.length; i++) if (!SOLVE_WORD_RE.test(w.charAt(i))) return null;
    return w;
  },
  init: function (w) { return { word: w, letters: {}, wrong: 0, wrongL: [], used: 0, solved: false, done: false, max: 6 }; },
  guess: function (p, g) {
    g = String(g || "").toUpperCase();
    if (g.length !== 1 || !SOLVE_WORD_RE.test(g) || p.letters[g]) return { bad: true };
    p.letters[g] = true;
    p.used++;
    if (p.word.indexOf(g) === -1) { p.wrong++; p.wrongL.push(g); }
    var all = true;
    for (var i = 0; i < p.word.length; i++) if (!p.letters[p.word.charAt(i)]) all = false;
    if (all) { p.solved = true; p.done = true; }
    else if (p.wrong >= p.max) p.done = true;
    return { fb: p.word.indexOf(g) === -1 ? "miss" : "hit" };
  },
  view: function (p) {
    var mask = [];
    for (var i = 0; i < p.word.length; i++) {
      var c = p.word.charAt(i);
      mask.push(p.letters[c] || p.done ? c : "_");
    }
    return { mask: mask.join(" "), wrongL: p.wrongL, wrong: p.wrong, max: p.max, used: p.used, tried: p.letters };
  },
  cost: function (p) { return p.wrong * 100 + p.used; },
  reveal: function (w) { return w; }
};

/* ----- Mastermind ----- */
function solveCodeOk(s) {
  s = String(s || "");
  if (!/^[1-8]{4}$/.test(s)) return false;
  for (var i = 0; i < 4; i++) if (s.indexOf(s.charAt(i)) !== i) return false;
  return true;
}
var SOLVE_MM = {
  validate: function (raw) { raw = String(raw || ""); return solveCodeOk(raw) ? raw : null; },
  init: function (c) { return { code: c, used: 0, hist: [], solved: false, done: false, max: 10 }; },
  guess: function (p, g) {
    g = String(g || "");
    if (!solveCodeOk(g)) return { bad: true };
    var a = 0, b = 0;
    for (var i = 0; i < 4; i++) {
      if (g.charAt(i) === p.code.charAt(i)) a++;
      else if (p.code.indexOf(g.charAt(i)) !== -1) b++;
    }
    p.used++;
    p.hist.push([g, a, b]);
    if (a === 4) { p.solved = true; p.done = true; }
    else if (p.used >= p.max) p.done = true;
    return { fb: [a, b] };
  },
  view: function (p) { return { hist: p.hist, max: p.max, used: p.used }; },
  cost: function (p) { return p.used; },
  reveal: function (c) { return c; }
};

/* ----- Depth Charge (8x8, 3-cell submarine) ----- */
var SOLVE_DC = {
  validate: function (raw) {
    if (!raw || typeof raw.r !== "number" || typeof raw.c !== "number") return null;
    var r = raw.r, c = raw.c, vert = raw.d === 1, cells = [];
    for (var i = 0; i < 3; i++) {
      var rr = vert ? r + i : r, cc = vert ? c : c + i;
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return null;
      cells.push(rr * 8 + cc);
    }
    return cells;
  },
  init: function (cells) { return { cells: cells, shots: {}, hits: 0, used: 0, solved: false, done: false, max: 12 }; },
  guess: function (p, g) {
    if (typeof g !== "number" || g < 0 || g > 63 || p.shots[g] !== undefined) return { bad: true };
    p.used++;
    var hit = p.cells.indexOf(g) !== -1;
    p.shots[g] = hit ? 1 : 0;
    if (hit) p.hits++;
    if (p.hits >= 3) { p.solved = true; p.done = true; }
    else if (p.used >= p.max) p.done = true;
    return { fb: hit ? "hit" : "miss" };
  },
  view: function (p) { return { shots: p.shots, hits: p.hits, max: p.max, used: p.used, cells: p.done ? p.cells : null }; },
  cost: function (p) { return p.used; },
  reveal: function (c) { return c; }
};

/* ============================================================
   CLIENT: shared skeleton
   cfg = { name: i18n key of the title, prize, setup(body, submit),
           play(body, m, send), over(body, m, isA) }
   ============================================================ */
function mpsClient(cfg) {
  var body = mountPanel(cfg.name);
  var isA = MP.match && MP.match.role === "A";
  var opp = MP.match ? MP.match.opp : "?";
  var ctl = { opp: opp, isA: isA };
  function send(extra) { extra.t = "mpg"; mpSendMsg(extra); }
  function setup(err) {
    body.innerHTML = '<p class="hint" id="mps-err" style="color:#ff6b6b">' + (err ? esc(t("mpsBad")) : "") + "</p>" +
      '<div id="mps-box"></div><div class="feed" id="g-feed"></div>';
    cfg.setup(document.getElementById("mps-box"), function (secret) { send({ secret: secret }); }, ctl);
  }
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") {
      if (m.ph === "setup") setup(m.err);
      else if (m.ph === "wait") {
        body.innerHTML = '<p class="hint">' + esc(t("mpsWaitSet", { p: opp })) + '</p><div class="feed" id="g-feed"></div>';
      } else if (m.ph === "play") {
        body.innerHTML = '<div id="mps-box"></div><div class="feed" id="g-feed"></div>';
        cfg.play(document.getElementById("mps-box"), m, function (g) { send({ g: g }); }, ctl);
      }
    } else if (m.t === "mpg_o") {
      body.innerHTML = '<div id="mps-box"></div><div class="feed" id="g-feed"></div>';
      var ownSecret = isA ? m.secA : m.secB, theirSecret = isA ? m.secB : m.secA;
      var myUsed = isA ? m.ua : m.ub, theirUsed = isA ? m.ub : m.ua;
      var mySolved = isA ? m.sa : m.sb, theirSolved = isA ? m.sb : m.sa;
      feedLine(body, t("mpsRes", { n: t("bjYou"), u: myUsed, r: mySolved ? t("mpsSolved") : t("mpsFailed") }), mySolved ? "good" : "bad");
      feedLine(body, t("mpsRes", { n: opp, u: theirUsed, r: theirSolved ? t("mpsSolved") : t("mpsFailed") }), "");
      cfg.over(body, { own: ownSecret, theirs: theirSecret }, ctl);
      mpFinish(body, mpgKind(m.winner), cfg.prize);
    }
  };
  /* initial paint before the host's first message */
  body.innerHTML = '<p class="hint">...</p>';
  return ctl;
}

function mpsOppLine(m, opp) {
  var o = m.opp || {};
  return '<p class="hint">' + esc(opp) + ": " + o.used + " " + esc(t("mpsTriesUsed")) +
    (o.solved ? " - " + esc(t("mpsSolved")) : (o.done ? " - " + esc(t("mpsFailed")) : "")) + "</p>";
}

/* ----- client: Guess the Number ----- */
function viewMPGuessSet() {
  mpsClient({
    name: "guessName", prize: 50,
    setup: function (box, submit, ctl) {
      box.innerHTML = '<p class="hint">' + esc(t("mpsSetNum", { p: ctl.opp })) + "</p>" +
        '<div class="mp-row"><input class="num-input" id="mps-in" type="number" min="1" max="100">' +
        '<button class="btn" id="mps-go" type="button">' + esc(t("mpsLock")) + "</button></div>";
      document.getElementById("mps-go").onclick = function () { submit(document.getElementById("mps-in").value); };
      document.getElementById("mps-in").onkeydown = function (e) { if ((e || window.event).keyCode === 13) document.getElementById("mps-go").onclick(); };
    },
    play: function (box, m, send, ctl) {
      var h = '<p class="hint">' + esc(t("mpsGuessNum", { p: ctl.opp, n: m.mine.max - m.mine.used })) + "</p>";
      for (var i = 0; i < m.mine.hist.length; i++) {
        var x = m.mine.hist[i];
        h += '<div class="feed-line ' + (x[1] === "win" ? "good" : "bad") + '">' + x[0] + " - " +
          esc(x[1] === "low" ? t("mpsLow") : (x[1] === "high" ? t("mpsHigh") : t("mpsSolved"))) + "</div>";
      }
      if (!m.done) {
        h += '<div class="mp-row"><input class="num-input" id="mps-in" type="number" min="1" max="100">' +
          '<button class="btn" id="mps-go" type="button">' + esc(t("guessBtn")) + "</button></div>";
      } else h += '<p class="hint">' + esc(t("mpBjWait")) + "</p>";
      h += mpsOppLine(m, ctl.opp);
      box.innerHTML = h;
      var go = document.getElementById("mps-go"), inp = document.getElementById("mps-in");
      if (go) {
        go.onclick = function () { var v = parseInt(inp.value, 10); if (!isNaN(v)) send(v); };
        inp.onkeydown = function (e) { if ((e || window.event).keyCode === 13) go.onclick(); };
        inp.focus();
      }
    },
    over: function (body, s, ctl) {
      feedLine(body, t("mpsMine", { x: s.own }), "");
      feedLine(body, t("mpsReveal", { p: ctl.opp, x: s.theirs }), "");
    }
  });
}

/* ----- client: Hangman ----- */
function viewMPHangSet() {
  mpsClient({
    name: "hangName", prize: 50,
    setup: function (box, submit, ctl) {
      box.innerHTML = '<p class="hint">' + esc(t("mpsSetWord", { p: ctl.opp })) + "</p>" +
        '<div class="mp-row"><input class="text-input" id="mps-in" maxlength="14" autocomplete="off">' +
        '<button class="btn" id="mps-go" type="button">' + esc(t("mpsLock")) + "</button></div>";
      document.getElementById("mps-go").onclick = function () { submit(document.getElementById("mps-in").value); };
      document.getElementById("mps-in").onkeydown = function (e) { if ((e || window.event).keyCode === 13) document.getElementById("mps-go").onclick(); };
    },
    play: function (box, m, send, ctl) {
      var v = m.mine;
      var h = '<p class="hint">' + esc(t("mpsGuessWord", { w: v.wrong, m: v.max })) + "</p>" +
        '<div class="mp-score" style="letter-spacing:6px">' + esc(v.mask) + "</div>" +
        '<p class="hint">' + esc(t("mpsWrongL")) + " " + esc(v.wrongL.join(" ")) + "</p>";
      if (!m.done) {
        var al = hangAlphabet();
        h += '<div class="mp-row" style="flex-wrap:wrap">';
        for (var i = 0; i < al.length; i++) {
          var c = al.charAt(i);
          h += '<button class="btn small" type="button" data-l="' + c + '"' + (v.tried[c] ? " disabled" : "") + ">" + c + "</button>";
        }
        h += "</div>";
      } else h += '<p class="hint">' + esc(t("mpBjWait")) + "</p>";
      h += mpsOppLine(m, ctl.opp);
      box.innerHTML = h;
      var bs = box.getElementsByClassName("btn");
      for (var k = 0; k < bs.length; k++) {
        (function (b) { if (b.getAttribute("data-l")) b.onclick = function () { send(b.getAttribute("data-l")); }; })(bs[k]);
      }
    },
    over: function (body, s, ctl) {
      feedLine(body, t("mpsMine", { x: s.own }), "");
      feedLine(body, t("mpsReveal", { p: ctl.opp, x: s.theirs }), "");
    }
  });
}

/* ----- client: Mastermind ----- */
function viewMPMastSet() {
  mpsClient({
    name: "mmName", prize: 60,
    setup: function (box, submit, ctl) {
      box.innerHTML = '<p class="hint">' + esc(t("mpsSetCode", { p: ctl.opp })) + "</p>" +
        '<div class="mp-row"><input class="text-input" id="mps-in" maxlength="4" autocomplete="off" placeholder="1234">' +
        '<button class="btn" id="mps-go" type="button">' + esc(t("mpsLock")) + "</button></div>";
      document.getElementById("mps-go").onclick = function () { submit(document.getElementById("mps-in").value); };
      document.getElementById("mps-in").onkeydown = function (e) { if ((e || window.event).keyCode === 13) document.getElementById("mps-go").onclick(); };
    },
    play: function (box, m, send, ctl) {
      var h = '<p class="hint">' + esc(t("mpsGuessCode", { n: m.mine.max - m.mine.used })) + "</p>";
      for (var i = 0; i < m.mine.hist.length; i++) {
        var x = m.mine.hist[i];
        h += '<div class="feed-line ' + (x[1] === 4 ? "good" : "") + '">' + x[0] + "  " +
          esc(t("mpsAB", { a: x[1], b: x[2] })) + "</div>";
      }
      if (!m.done) {
        h += '<div class="mp-row"><input class="text-input" id="mps-in" maxlength="4" autocomplete="off" placeholder="1234">' +
          '<button class="btn" id="mps-go" type="button">' + esc(t("guessBtn")) + "</button></div>";
      } else h += '<p class="hint">' + esc(t("mpBjWait")) + "</p>";
      h += mpsOppLine(m, ctl.opp);
      box.innerHTML = h;
      var go = document.getElementById("mps-go"), inp = document.getElementById("mps-in");
      if (go) {
        go.onclick = function () { if (solveCodeOk(inp.value)) send(inp.value); else toast(t("mpsBad")); };
        inp.onkeydown = function (e) { if ((e || window.event).keyCode === 13) go.onclick(); };
        inp.focus();
      }
    },
    over: function (body, s, ctl) {
      feedLine(body, t("mpsMine", { x: s.own }), "");
      feedLine(body, t("mpsReveal", { p: ctl.opp, x: s.theirs }), "");
    }
  });
}

/* ----- client: Depth Charge ----- */
function solveGrid(cls) {
  var h = '<div class="gx-grid" style="grid-template-columns:repeat(8,1fr);max-width:360px">';
  for (var i = 0; i < 64; i++) h += '<div class="gx-cell ' + (cls[i] || "") + '" data-i="' + i + '"></div>';
  return h + "</div>";
}
function viewMPDepthSet() {
  mpsClient({
    name: "dcName", prize: 70,
    setup: function (box, submit, ctl) {
      var st = { r: -1, c: -1, d: 0 };
      function paint() {
        var cls = {};
        if (st.r >= 0) {
          for (var i = 0; i < 3; i++) {
            var rr = st.d ? st.r + i : st.r, cc = st.d ? st.c : st.c + i;
            if (rr <= 7 && cc <= 7) cls[rr * 8 + cc] = "gx-ship";
          }
        }
        box.innerHTML = '<p class="hint">' + esc(t("mpsSetSub", { p: ctl.opp })) + "</p>" + solveGrid(cls) +
          '<div class="mp-row"><button class="btn alt" id="mps-rot" type="button">' + esc(t("mpsRotate")) + "</button>" +
          '<button class="btn" id="mps-go" type="button">' + esc(t("mpsLock")) + "</button></div>";
        var cs = box.getElementsByClassName("gx-cell");
        for (var k = 0; k < cs.length; k++) {
          (function (c) {
            c.onclick = function () {
              var i2 = parseInt(c.getAttribute("data-i"), 10);
              st.r = Math.floor(i2 / 8); st.c = i2 % 8; paint();
            };
          })(cs[k]);
        }
        document.getElementById("mps-rot").onclick = function () { st.d = st.d ? 0 : 1; paint(); };
        document.getElementById("mps-go").onclick = function () {
          if (st.r < 0) return;
          submit({ r: st.r, c: st.c, d: st.d });
        };
      }
      paint();
    },
    play: function (box, m, send, ctl) {
      var v = m.mine, cls = {}, i;
      for (var k in v.shots) cls[k] = v.shots[k] ? "gx-hit" : "gx-miss";
      if (v.cells) for (i = 0; i < v.cells.length; i++) if (!cls[v.cells[i]]) cls[v.cells[i]] = "gx-ship";
      box.innerHTML = '<p class="hint">' + esc(t("mpsGuessSub", { p: ctl.opp, n: v.max - v.used })) + "</p>" +
        solveGrid(cls) + mpsOppLine(m, ctl.opp);
      if (!m.done) {
        var cs = box.getElementsByClassName("gx-cell");
        for (i = 0; i < cs.length; i++) {
          (function (c) {
            c.onclick = function () { send(parseInt(c.getAttribute("data-i"), 10)); };
          })(cs[i]);
        }
      }
    },
    over: function (body, s, ctl) {}
  });
}

/* ---------- register + swap the menu entries to the new versions ---------- */
MPG.gnset = mpsMake(SOLVE_GN, function () { viewMPGuessSet(); });
MPG.hangset = mpsMake(SOLVE_HANG, function () { viewMPHangSet(); });
MPG.mmset = mpsMake(SOLVE_MM, function () { viewMPMastSet(); });
MPG.dcset = mpsMake(SOLVE_DC, function () { viewMPDepthSet(); });

(function () {
  var map = { guessName: "gnset", hangName: "hangset", mmName: "mmset", dcName: "dcset" };
  var all = GAMES.concat(typeof BONUS_GAMES !== "undefined" ? BONUS_GAMES : []);
  for (var i = 0; i < all.length; i++) {
    if (map[all[i].name]) all[i].mp = map[all[i].name];
  }
})();
