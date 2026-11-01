/* ============================================================
   kocik's arcade - NEW GAMES: Battleship + Chip Challenge
   Each one: vs computer (solo) AND vs friend (room code).
   Needs mpgames.js (MPG registry) - loaded after it.
   ============================================================ */
"use strict";

/* ---------- tiny grid helpers ---------- */
function gxGrid(n, cls, txt, extra) {
  var h = '<div class="gx-grid' + (extra ? " " + extra : "") + '" style="grid-template-columns:repeat(' + n + ',1fr)">';
  for (var i = 0; i < n * n; i++) {
    h += '<div class="gx-cell ' + (cls[i] || "") + '" data-i="' + i + '">' + (txt && txt[i] ? txt[i] : "") + "</div>";
  }
  return h + "</div>";
}
function gxBind(box, sel, fn) {
  var root = typeof sel === "string" ? box.querySelector(sel) : sel;
  if (!root) return;
  var cs = root.getElementsByClassName("gx-cell");
  for (var i = 0; i < cs.length; i++) {
    (function (c) { c.onclick = function () { fn(parseInt(c.getAttribute("data-i"), 10)); }; })(cs[i]);
  }
}

/* ============================================================
   BATTLESHIP - engine
   ============================================================ */
var BS_SHIPS = [5, 4, 3, 3, 2];
var BS_N = 10;

function bsCells(s) {
  var out = [];
  for (var i = 0; i < s.len; i++) out.push(s.h ? s.r * BS_N + s.c + i : (s.r + i) * BS_N + s.c);
  return out;
}
/* every ship in bounds and nothing overlaps */
function bsPlacementOk(ships) {
  var seen = {};
  for (var i = 0; i < ships.length; i++) {
    var s = ships[i];
    if (typeof s.r !== "number" || typeof s.c !== "number" || s.r < 0 || s.c < 0) return false;
    if (s.h ? s.c + s.len > BS_N || s.r >= BS_N : s.r + s.len > BS_N || s.c >= BS_N) return false;
    var cs = bsCells(s);
    for (var k = 0; k < cs.length; k++) {
      if (seen[cs[k]]) return false;
      seen[cs[k]] = true;
    }
  }
  return true;
}
/* host-side check of a fleet sent by a client */
function bsValidFleet(ships) {
  if (!ships || ships.length !== BS_SHIPS.length) return null;
  var lens = [], clean = [];
  for (var i = 0; i < ships.length; i++) {
    var s = ships[i];
    if (!s || typeof s.len !== "number") return null;
    lens.push(s.len);
    clean.push({ len: s.len, r: s.r, c: s.c, h: !!s.h });
  }
  lens.sort(function (a, b) { return b - a; });
  for (var j = 0; j < lens.length; j++) if (lens[j] !== BS_SHIPS[j]) return null;
  return bsPlacementOk(clean) ? clean : null;
}
function bsRandomShips() {
  for (var tries = 0; tries < 500; tries++) {
    var ships = [], ok = true;
    for (var i = 0; i < BS_SHIPS.length && ok; i++) {
      var placed = false;
      for (var a = 0; a < 80 && !placed; a++) {
        var s = { len: BS_SHIPS[i], r: ri(0, BS_N - 1), c: ri(0, BS_N - 1), h: Math.random() < 0.5 };
        if (bsPlacementOk(ships.concat([s]))) { ships.push(s); placed = true; }
      }
      if (!placed) ok = false;
    }
    if (ok) return ships;
  }
  return [{ len: 5, r: 0, c: 0, h: true }, { len: 4, r: 2, c: 0, h: true }, { len: 3, r: 4, c: 0, h: true },
          { len: 3, r: 6, c: 0, h: true }, { len: 2, r: 8, c: 0, h: true }];
}
function bsFleet(ships) {
  var f = { ships: [], map: {}, left: ships.length };
  for (var i = 0; i < ships.length; i++) {
    var cs = bsCells(ships[i]);
    f.ships.push({ len: ships[i].len, cells: cs, hits: 0 });
    for (var k = 0; k < cs.length; k++) f.map[cs[k]] = i;
  }
  return f;
}
/* returns { res: "hit"|"miss", sunk: length of sunk ship or 0, all: fleet destroyed } */
function bsFire(fleet, idx) {
  var si = fleet.map[idx];
  if (si === undefined) return { res: "miss", sunk: 0, all: false };
  var sh = fleet.ships[si];
  sh.hits++;
  var sunk = 0;
  if (sh.hits >= sh.len) { sunk = sh.len; fleet.left--; }
  return { res: "hit", sunk: sunk, all: fleet.left <= 0 };
}
function bsName(idx) { return String.fromCharCode(65 + (idx % BS_N)) + (Math.floor(idx / BS_N) + 1); }

/* computer opponent: hunts on a checkerboard, then chases hits */
function bsBotNew() { return { shot: {}, queue: [] }; }
function bsBotNext(b) {
  var idx = -1;
  while (b.queue.length) {
    var q = b.queue.shift();
    if (!b.shot[q]) { idx = q; break; }
  }
  if (idx < 0) {
    var pool = [], any = [], i;
    for (i = 0; i < BS_N * BS_N; i++) {
      if (b.shot[i]) continue;
      any.push(i);
      if (((Math.floor(i / BS_N) + (i % BS_N)) & 1) === 0) pool.push(i);
    }
    var src = pool.length ? pool : any;
    idx = src[Math.floor(Math.random() * src.length)];
  }
  b.shot[idx] = true;
  return idx;
}
function bsBotLearn(b, idx, r) {
  if (r.res !== "hit") return;
  if (r.sunk) { b.queue = []; return; }
  var row = Math.floor(idx / BS_N), col = idx % BS_N;
  if (col > 0) b.queue.push(idx - 1);
  if (col < BS_N - 1) b.queue.push(idx + 1);
  if (row > 0) b.queue.push(idx - BS_N);
  if (row < BS_N - 1) b.queue.push(idx + BS_N);
}

/* ---------- ship placement UI (shared by solo + multiplayer) ---------- */
function bsPlaceUI(box, onReady) {
  var st = { ships: [], h: true };
  function paint() {
    var cls = {}, i, k;
    for (i = 0; i < st.ships.length; i++) {
      var cs = bsCells(st.ships[i]);
      for (k = 0; k < cs.length; k++) cls[cs[k]] = "gx-ship";
    }
    var done = st.ships.length >= BS_SHIPS.length;
    box.innerHTML =
      '<p class="hint">' + esc(done ? t("bsAllPlaced") : t("bsPlace", { len: BS_SHIPS[st.ships.length] })) + "</p>" +
      '<div id="bs-place">' + gxGrid(BS_N, cls, null, "gx-bs") + "</div>" +
      '<div class="mp-row">' +
        '<button class="btn alt" id="bs-rot" type="button">' + esc(t("mpsRotate")) + "</button>" +
        '<button class="btn alt" id="bs-rnd" type="button">' + esc(t("bsRandom")) + "</button>" +
        '<button class="btn ghost" id="bs-clr" type="button">' + esc(t("bsClear")) + "</button>" +
        '<button class="btn" id="bs-go" type="button"' + (done ? "" : " disabled") + ">" + esc(t("bsReady")) + "</button>" +
      "</div>";
    gxBind(box, "#bs-place", function (idx) {
      if (st.ships.length >= BS_SHIPS.length) return;
      var s = { len: BS_SHIPS[st.ships.length], r: Math.floor(idx / BS_N), c: idx % BS_N, h: st.h };
      if (!bsPlacementOk(st.ships.concat([s]))) { toast(t("bsBadSpot")); return; }
      st.ships.push(s);
      paint();
    });
    document.getElementById("bs-rot").onclick = function () { st.h = !st.h; toast(st.h ? "-->" : "|"); };
    document.getElementById("bs-rnd").onclick = function () { st.ships = bsRandomShips(); paint(); };
    document.getElementById("bs-clr").onclick = function () { st.ships = []; paint(); };
    document.getElementById("bs-go").onclick = function () { if (st.ships.length === BS_SHIPS.length) onReady(st.ships); };
  }
  paint();
}

/* two boards: enemy waters (click) + own fleet */
function bsBoardsHtml(enemyCls, ownCls, enemyTxt) {
  return '<div class="gx-pair">' +
    '<div><div class="hint">' + esc(t("bsEnemy")) + '</div><div id="bs-enemy">' + gxGrid(BS_N, enemyCls, enemyTxt, "gx-bs") + "</div></div>" +
    '<div><div class="hint">' + esc(t("bsYours")) + "</div>" + gxGrid(BS_N, ownCls, null, "gx-bs gx-small") + "</div>" +
    "</div>";
}

/* ---------- Battleship vs computer ---------- */
function viewBattleship() {
  var body = mountPanel("bsName");
  var st = { mine: null, myShips: null, bot: null, botFleet: null, botAi: bsBotNew(),
             enemyMarks: {}, ownMarks: {}, turn: true, over: false, busy: false };

  function startPlacing() {
    body.innerHTML = '<p class="hint">' + esc(t("bsIntro")) + '</p><div id="bs-box"></div>';
    bsPlaceUI(document.getElementById("bs-box"), function (ships) {
      st.myShips = ships;
      st.mine = bsFleet(ships);
      st.botFleet = bsFleet(bsRandomShips());
      render();
    });
  }
  function render() {
    var ec = {}, oc = {}, et = {}, i, k;
    for (k in st.enemyMarks) { ec[k] = st.enemyMarks[k] === "hit" ? "gx-hit" : "gx-miss"; et[k] = st.enemyMarks[k] === "hit" ? "X" : "·"; }
    for (i = 0; i < st.myShips.length; i++) {
      var cs = bsCells(st.myShips[i]);
      for (k = 0; k < cs.length; k++) oc[cs[k]] = "gx-ship";
    }
    for (k in st.ownMarks) oc[k] = st.ownMarks[k] === "hit" ? "gx-hit" : (oc[k] || "") + " gx-miss";
    var feed = document.getElementById("g-feed");
    var keepFeed = feed ? feed.innerHTML : "";
    body.innerHTML = '<p class="hint" id="bs-msg"></p>' + bsBoardsHtml(ec, oc, et) + '<div class="feed" id="g-feed">' + keepFeed + "</div>";
    var msg = document.getElementById("bs-msg");
    if (msg) msg.textContent = st.over ? "" : (st.turn ? t("mpYourTurn") : t("tttThinking"));
    if (!st.over) gxBind(body, "#bs-enemy", fire);
  }
  function fire(idx) {
    if (st.over || !st.turn || st.busy || st.enemyMarks[idx]) return;
    var r = bsFire(st.botFleet, idx);
    st.enemyMarks[idx] = r.res;
    render();
    feedLine(body, t("bsFire", { who: t("bjYou"), c: bsName(idx), r: r.res === "hit" ? (r.sunk ? t("bsSunk", { n: r.sunk }) : t("bsHit")) : t("bsMiss") }),
      r.res === "hit" ? "good" : "");
    if (r.all) { finish(true); return; }
    st.turn = false;
    render();
    setTimeout(botTurn, 650);
  }
  function botTurn() {
    if (st.over) return;
    var idx = bsBotNext(st.botAi);
    var r = bsFire(st.mine, idx);
    bsBotLearn(st.botAi, idx, r);
    st.ownMarks[idx] = r.res;
    st.turn = true;
    render();
    feedLine(body, t("bsFire", { who: t("botName"), c: bsName(idx), r: r.res === "hit" ? (r.sunk ? t("bsSunk", { n: r.sunk }) : t("bsHit")) : t("bsMiss") }),
      r.res === "hit" ? "bad" : "");
    if (r.all) finish(false);
  }
  function finish(won) {
    st.over = true;
    render();
    if (won) {
      var p = award(60);
      feedLine(body, t("youWin"), "good");
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
    } else feedLine(body, t("computerWins"), "bad");
    againBtn(body, function () { viewBattleship(); });
  }
  startPlacing();
}

/* ---------- Battleship multiplayer ---------- */
MPG.bs = {
  start: function (match) {
    match.s = { ph: "setup", fl: {}, raw: {}, shot: {}, turn: null };
    match.s.shot[match.a] = {}; match.s.shot[match.b] = {};
    mpgSend(match, { ph: "setup" });
  },
  onMsg: function (match, id, m) {
    var s = match.s;
    if (s.ph === "setup") {
      if (!m.ships || s.fl[id]) return;
      var ships = bsValidFleet(m.ships);
      if (!ships) { mpDeliver(id, { t: "mpg_s", ph: "setup", err: true }); return; }
      s.raw[id] = ships;
      s.fl[id] = bsFleet(ships);
      mpDeliver(id, { t: "mpg_s", ph: "wait" });
      if (s.fl[match.a] && s.fl[match.b]) {
        s.ph = "play";
        s.turn = match.a;
        mpgSend(match, { ph: "play", turn: s.turn, ev: null });
      }
      return;
    }
    if (typeof m.fire !== "number" || m.fire < 0 || m.fire >= BS_N * BS_N) return;
    if (s.turn !== id || s.shot[id][m.fire]) return;
    var other = mpgOther(match, id);
    s.shot[id][m.fire] = true;
    var r = bsFire(s.fl[other], m.fire);
    var ev = { by: id, cell: m.fire, res: r.res, sunk: r.sunk };
    if (r.all) {
      var reveal = {};
      reveal[match.a] = s.raw[match.a]; reveal[match.b] = s.raw[match.b];
      mpgOver(match, id, { ev: ev, shipsA: s.raw[match.a], shipsB: s.raw[match.b] });
      return;
    }
    s.turn = other;
    mpgSend(match, { ph: "play", turn: s.turn, ev: ev });
  },
  view: function () { viewMPBattleship(); }
};

function viewMPBattleship() {
  var body = mountPanel("bsName");
  var opp = MP.match ? MP.match.opp : "?";
  var isA = MP.match && MP.match.role === "A";
  var st = { ships: null, enemy: {}, own: {}, turn: null, over: false, enemyShips: null };

  function setup(err) {
    body.innerHTML = '<p class="hint" style="color:#ff6b6b">' + (err ? esc(t("mpsBad")) : "") + "</p>" +
      '<p class="hint">' + esc(t("bsIntro")) + " - vs " + esc(opp) + '</p><div id="bs-box"></div>';
    bsPlaceUI(document.getElementById("bs-box"), function (ships) {
      st.ships = ships;
      mpSendMsg({ t: "mpg", ships: ships });
    });
  }
  function render() {
    var ec = {}, oc = {}, et = {}, i, k, cs;
    for (k in st.enemy) { ec[k] = st.enemy[k] === "hit" ? "gx-hit" : "gx-miss"; et[k] = st.enemy[k] === "hit" ? "X" : "·"; }
    if (st.enemyShips) {
      for (i = 0; i < st.enemyShips.length; i++) {
        cs = bsCells(st.enemyShips[i]);
        for (k = 0; k < cs.length; k++) if (!ec[cs[k]]) ec[cs[k]] = "gx-ship";
      }
    }
    for (i = 0; i < st.ships.length; i++) {
      cs = bsCells(st.ships[i]);
      for (k = 0; k < cs.length; k++) oc[cs[k]] = "gx-ship";
    }
    for (k in st.own) oc[k] = st.own[k] === "hit" ? "gx-hit" : (oc[k] || "") + " gx-miss";
    var keep = document.getElementById("g-feed");
    var kf = keep ? keep.innerHTML : "";
    var mine = !st.over && st.turn === MP.selfId;
    body.innerHTML = '<p class="hint">' + esc(st.over ? "" : (mine ? t("mpYourTurn") : t("mpWaitTurn"))) + " - vs " + esc(opp) + "</p>" +
      bsBoardsHtml(ec, oc, et) + '<div class="feed" id="g-feed">' + kf + "</div>";
    if (mine) gxBind(body, "#bs-enemy", function (idx) {
      if (st.enemy[idx] || st.turn !== MP.selfId) return;
      st.turn = null;                       /* wait for the host */
      mpSendMsg({ t: "mpg", fire: idx });
    });
  }
  function note(ev) {
    if (!ev) return;
    var mine = ev.by === MP.selfId;
    if (mine) st.enemy[ev.cell] = ev.res; else st.own[ev.cell] = ev.res;
    render();
    feedLine(body, t("bsFire", { who: mine ? t("bjYou") : opp, c: bsName(ev.cell),
      r: ev.res === "hit" ? (ev.sunk ? t("bsSunk", { n: ev.sunk }) : t("bsHit")) : t("bsMiss") }),
      ev.res === "hit" ? (mine ? "good" : "bad") : "");
  }
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") {
      if (m.ph === "setup") setup(m.err);
      else if (m.ph === "wait") body.innerHTML = '<p class="hint">' + esc(t("mpsWaitSet", { p: opp })) + '</p><div class="feed" id="g-feed"></div>';
      else if (m.ph === "play") { st.turn = m.turn; if (m.ev) note(m.ev); else render(); }
    } else if (m.t === "mpg_o") {
      st.over = true;
      st.enemyShips = isA ? m.shipsB : m.shipsA;
      if (m.ev) note(m.ev); else render();
      render();
      mpFinish(body, mpgKind(m.winner), 80);
    }
  };
  body.innerHTML = '<p class="hint">...</p>';
}

/* ============================================================
   CHIP CHALLENGE
   Each player has their OWN plate of 16 chips. You secretly poison
   3 chips on the OTHER player's plate. Then you take turns eating
   one chip from your own plate. Eat all 3 chips your opponent
   poisoned before they do and you lose.
   ============================================================ */
var CHIP_N = 4;
var CHIP_TOTAL = CHIP_N * CHIP_N;

function chipPickUI(box, who, onLock) {
  var sel = [];
  function paint() {
    var cls = {}, txt = {}, i;
    for (i = 0; i < sel.length; i++) { cls[sel[i]] = "gx-sel"; txt[sel[i]] = "☠"; }
    var fillTxt = {};
    for (i = 0; i < CHIP_TOTAL; i++) fillTxt[i] = txt[i] || "●";
    box.innerHTML = '<p class="hint">' + esc(t("chipPick", { p: who, n: sel.length })) + "</p>" +
      '<div id="chip-pick">' + gxGrid(CHIP_N, cls, fillTxt, "gx-chip") + "</div>" +
      '<div class="mp-row"><button class="btn" id="chip-go" type="button"' + (sel.length === 3 ? "" : " disabled") + ">" +
      esc(t("mpsLock")) + "</button></div>";
    gxBind(box, "#chip-pick", function (idx) {
      var at = sel.indexOf(idx);
      if (at !== -1) sel.splice(at, 1);
      else if (sel.length < 3) sel.push(idx);
      paint();
    });
    document.getElementById("chip-go").onclick = function () { if (sel.length === 3) onLock(sel.slice()); };
  }
  paint();
}

/* paint a plate: eaten = {idx: 0 safe | 1 poisoned}; marks = my poison choices (shown on the opponent plate) */
function chipPlateHtml(eaten, marks, clickable) {
  var cls = {}, txt = {}, i;
  for (i = 0; i < CHIP_TOTAL; i++) {
    if (eaten[i] === 1) { cls[i] = "gx-hit"; txt[i] = "☠"; }
    else if (eaten[i] === 0) { cls[i] = "gx-eaten"; txt[i] = "✓"; }
    else { txt[i] = (marks && marks.indexOf(i) !== -1) ? "☠?" : "●"; if (marks && marks.indexOf(i) !== -1) cls[i] = "gx-mark"; }
  }
  return gxGrid(CHIP_N, cls, txt, "gx-chip" + (clickable ? " gx-live" : ""));
}

/* ---------- Chip Challenge vs computer ---------- */
function viewChips() {
  var body = mountPanel("chipName");
  var st = { myPoison: null, botPoison: null, myEaten: {}, botEaten: {}, myStrikes: 0, botStrikes: 0, turn: true, over: false };

  function randomPoison() {
    var all = [], i;
    for (i = 0; i < CHIP_TOTAL; i++) all.push(i);
    shuffle(all);
    return all.slice(0, 3);
  }
  function start() {
    body.innerHTML = '<p class="hint">' + esc(t("chipIntro", { p: t("botName") })) + '</p><div id="chip-box"></div>';
    chipPickUI(document.getElementById("chip-box"), t("botName"), function (sel) {
      st.botPoison = sel;               /* poison on the computer's plate */
      st.myPoison = randomPoison();     /* poison on YOUR plate */
      render();
    });
  }
  function render() {
    var kf = document.getElementById("g-feed");
    var keep = kf ? kf.innerHTML : "";
    body.innerHTML =
      '<p class="hint">' + esc(st.over ? "" : (st.turn ? t("mpYourTurn") : t("tttThinking"))) + "</p>" +
      '<div class="gx-pair">' +
        '<div><div class="hint">' + esc(t("chipYourPlate")) + " - " + esc(t("chipStrikes", { n: st.myStrikes })) + "</div>" +
          '<div id="chip-mine">' + chipPlateHtml(st.myEaten, null, !st.over && st.turn) + "</div></div>" +
        '<div><div class="hint">' + esc(t("chipOppPlate", { p: t("botName") })) + " - " + esc(t("chipStrikes", { n: st.botStrikes })) + "</div>" +
          chipPlateHtml(st.botEaten, st.botPoison, false) + "</div>" +
      "</div>" +
      '<div class="feed" id="g-feed">' + keep + "</div>";
    if (!st.over && st.turn) gxBind(body, "#chip-mine", eat);
  }
  function eat(idx) {
    if (st.over || !st.turn || st.myEaten[idx] !== undefined) return;
    var bad = st.myPoison.indexOf(idx) !== -1 ? 1 : 0;
    st.myEaten[idx] = bad;
    st.myStrikes += bad;
    st.turn = false;
    render();
    feedLine(body, t("chipAte", { who: t("bjYou"), r: bad ? t("chipPoison") : t("chipSafe") }), bad ? "bad" : "good");
    if (st.myStrikes >= 3) { finish(false); return; }
    setTimeout(botEat, 650);
  }
  function botEat() {
    if (st.over) return;
    var free = [], i;
    for (i = 0; i < CHIP_TOTAL; i++) if (st.botEaten[i] === undefined) free.push(i);
    var idx = free[Math.floor(Math.random() * free.length)];
    var bad = st.botPoison.indexOf(idx) !== -1 ? 1 : 0;
    st.botEaten[idx] = bad;
    st.botStrikes += bad;
    st.turn = true;
    render();
    feedLine(body, t("chipAte", { who: t("botName"), r: bad ? t("chipPoison") : t("chipSafe") }), bad ? "good" : "");
    if (st.botStrikes >= 3) finish(true);
  }
  function finish(won) {
    st.over = true;
    render();
    if (won) {
      var p = award(40);
      feedLine(body, t("youWin"), "good");
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
    } else feedLine(body, t("computerWins"), "bad");
    againBtn(body, function () { viewChips(); });
  }
  start();
}

/* ---------- Chip Challenge multiplayer ---------- */
MPG.chip = {
  start: function (match) {
    match.s = { ph: "setup", poison: {}, eaten: {}, strikes: {}, turn: null };
    match.s.eaten[match.a] = {}; match.s.eaten[match.b] = {};
    match.s.strikes[match.a] = 0; match.s.strikes[match.b] = 0;
    mpgSend(match, { ph: "setup" });
  },
  onMsg: function (match, id, m) {
    var s = match.s;
    if (s.ph === "setup") {
      var p = m.poison;
      if (!p || s.poison[id] || p.length !== 3) return;
      var seen = {}, ok = true;
      for (var i = 0; i < 3; i++) {
        if (typeof p[i] !== "number" || p[i] < 0 || p[i] >= CHIP_TOTAL || seen[p[i]]) ok = false;
        seen[p[i]] = true;
      }
      if (!ok) { mpDeliver(id, { t: "mpg_s", ph: "setup", err: true }); return; }
      s.poison[id] = p.slice();          /* poison on the OTHER player's plate */
      mpDeliver(id, { t: "mpg_s", ph: "wait" });
      if (s.poison[match.a] && s.poison[match.b]) {
        s.ph = "play";
        s.turn = match.a;
        mpgSend(match, { ph: "play", turn: s.turn, ev: null });
      }
      return;
    }
    if (s.turn !== id || typeof m.eat !== "number" || m.eat < 0 || m.eat >= CHIP_TOTAL) return;
    if (s.eaten[id][m.eat] !== undefined) return;
    var other = mpgOther(match, id);
    var bad = s.poison[other].indexOf(m.eat) !== -1 ? 1 : 0;
    s.eaten[id][m.eat] = bad;
    s.strikes[id] += bad;
    var ev = { by: id, idx: m.eat, bad: bad, strikes: s.strikes[id] };
    if (s.strikes[id] >= 3) {
      mpgOver(match, other, { ev: ev, pa: s.poison[match.a], pb: s.poison[match.b] });
      return;
    }
    s.turn = other;
    mpgSend(match, { ph: "play", turn: s.turn, ev: ev });
  },
  view: function () { viewMPChips(); }
};

function viewMPChips() {
  var body = mountPanel("chipName");
  var opp = MP.match ? MP.match.opp : "?";
  var isA = MP.match && MP.match.role === "A";
  var st = { myPoison: null, mine: {}, theirs: {}, ms: 0, ts: 0, turn: null, over: false };

  function setup(err) {
    body.innerHTML = '<p class="hint" style="color:#ff6b6b">' + (err ? esc(t("mpsBad")) : "") + "</p>" +
      '<p class="hint">' + esc(t("chipIntro", { p: opp })) + '</p><div id="chip-box"></div>';
    chipPickUI(document.getElementById("chip-box"), opp, function (sel) {
      st.myPoison = sel;
      mpSendMsg({ t: "mpg", poison: sel });
    });
  }
  function render() {
    var kf = document.getElementById("g-feed");
    var keep = kf ? kf.innerHTML : "";
    var mine = !st.over && st.turn === MP.selfId;
    body.innerHTML = '<p class="hint">' + esc(st.over ? "" : (mine ? t("mpYourTurn") : t("mpWaitTurn"))) + " - vs " + esc(opp) + "</p>" +
      '<div class="gx-pair">' +
        '<div><div class="hint">' + esc(t("chipYourPlate")) + " - " + esc(t("chipStrikes", { n: st.ms })) + "</div>" +
          '<div id="chip-mine">' + chipPlateHtml(st.mine, null, mine) + "</div></div>" +
        '<div><div class="hint">' + esc(t("chipOppPlate", { p: opp })) + " - " + esc(t("chipStrikes", { n: st.ts })) + "</div>" +
          chipPlateHtml(st.theirs, st.myPoison, false) + "</div>" +
      "</div>" +
      '<div class="feed" id="g-feed">' + keep + "</div>";
    if (mine) gxBind(body, "#chip-mine", function (idx) {
      if (st.mine[idx] !== undefined || st.turn !== MP.selfId) return;
      st.turn = null;
      mpSendMsg({ t: "mpg", eat: idx });
    });
  }
  function note(ev) {
    if (!ev) return;
    var me = ev.by === MP.selfId;
    if (me) { st.mine[ev.idx] = ev.bad; st.ms = ev.strikes; }
    else { st.theirs[ev.idx] = ev.bad; st.ts = ev.strikes; }
    render();
    feedLine(body, t("chipAte", { who: me ? t("bjYou") : opp, r: ev.bad ? t("chipPoison") : t("chipSafe") }),
      ev.bad ? (me ? "bad" : "good") : "");
  }
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") {
      if (m.ph === "setup") setup(m.err);
      else if (m.ph === "wait") body.innerHTML = '<p class="hint">' + esc(t("mpsWaitSet", { p: opp })) + '</p><div class="feed" id="g-feed"></div>';
      else if (m.ph === "play") { st.turn = m.turn; if (m.ev) note(m.ev); else render(); }
    } else if (m.t === "mpg_o") {
      st.over = true;
      if (m.ev) note(m.ev); else render();
      mpFinish(body, mpgKind(m.winner), 50);
    }
  };
  body.innerHTML = '<p class="hint">...</p>';
}

/* ---------- add both games to the menu (just before the Point Shop) ---------- */
(function () {
  var at = GAMES.length;
  for (var i = 0; i < GAMES.length; i++) if (GAMES[i].view === viewShop) { at = i; break; }
  GAMES.splice(at, 0,
    { icon: "🚢", name: "bsName", desc: "bsDesc", view: viewBattleship, mp: "bs" },
    { icon: "☠", name: "chipName", desc: "chipDesc", view: viewChips, mp: "chip" });
})();

try {
  if (typeof currentView !== "undefined" && currentView === renderMenu) renderMenu();
} catch (e) {}
