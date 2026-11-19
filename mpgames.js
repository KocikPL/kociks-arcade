/* ============================================================
   kocik's arcade - MULTIPLAYER GAMES (plugs into mp.js)
   Pong, Penalty Shootout, Matchsticks (21), Blackjack duel.

   Every game is host-authoritative. A game is a MPG entry:
     MPG.id = { start(match), onMsg(match, id, m), view: fn }
   mp.js pairs 2 players, calls start(), forwards {t:"mpg"} messages
   to onMsg(), and shows `view` on both screens.
   Host -> clients : {t:"mpg_s", ...state}   {t:"mpg_o", winner, ...}
   Client -> host  : {t:"mpg", ...action}
   ============================================================ */
"use strict";

var MPG = {};

function mpgSend(match, o) {
  o.t = "mpg_s";
  mpDeliver(match.a, o);
  mpDeliver(match.b, o);
}
function mpgOver(match, winner, extra) {
  if (match.timer) { clearInterval(match.timer); match.timer = 0; }
  match.over = true;
  var o = extra || {};
  o.t = "mpg_o";
  o.winner = winner;
  mpDeliver(match.a, o);
  mpDeliver(match.b, o);
  mpHostEndMatch(match);
}
function mpgKind(winner) {
  return winner === null ? "draw" : (winner === MP.selfId ? "win" : "lose");
}
function mpgOther(match, id) { return match.a === id ? match.b : match.a; }

/* ============================================================
   MATCHSTICKS (21) - take 1-3, last stick wins
   ============================================================ */
MPG.nim = {
  start: function (match) {
    match.s = { left: 21, turn: match.a };
    mpgSend(match, { left: 21, turn: match.a, last: null });
  },
  onMsg: function (match, id, m) {
    var s = match.s;
    if (s.turn !== id) return;
    var n = m.take;
    if (typeof n !== "number" || n < 1 || n > 3 || n > s.left) return;
    s.left -= n;
    if (s.left === 0) { mpgOver(match, id, { left: 0, last: { by: id, n: n } }); return; }
    s.turn = mpgOther(match, id);
    mpgSend(match, { left: s.left, turn: s.turn, last: { by: id, n: n } });
  },
  view: function () { viewMPNim(); }
};

function viewMPNim() {
  var body = mountPanel("nimName");
  var st = { left: 21, turn: null, over: false };
  body.innerHTML =
    '<p class="hint">' + esc(t("mpNimRule")) + " - vs " + esc(MP.match ? MP.match.opp : "?") + "</p>" +
    '<div class="mp-score" id="nim-line"></div>' +
    '<div class="nim-sticks" id="nim-sticks"></div>' +
    '<div class="mp-row">' +
      '<button class="btn" type="button" data-t="1">1</button>' +
      '<button class="btn" type="button" data-t="2">2</button>' +
      '<button class="btn" type="button" data-t="3">3</button>' +
    "</div>" +
    '<p class="hint" id="nim-msg"></p>' +
    '<div class="feed" id="g-feed"></div>';
  var btns = body.getElementsByClassName("btn");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.onclick = function () {
        if (st.over || st.turn !== MP.selfId) return;
        mpSendMsg({ t: "mpg", take: parseInt(b.getAttribute("data-t"), 10) });
      };
    })(btns[i]);
  }
  function paint() {
    var l = document.getElementById("nim-line");
    if (l) l.textContent = t("nimLeft", { n: st.left });
    var s = document.getElementById("nim-sticks");
    if (s) { var x = "", k; for (k = 0; k < st.left; k++) x += "|"; s.textContent = x; }
    var mine = !st.over && st.turn === MP.selfId;
    for (var j = 0; j < btns.length; j++) {
      btns[j].disabled = !mine || parseInt(btns[j].getAttribute("data-t"), 10) > st.left;
    }
    var msg = document.getElementById("nim-msg");
    if (msg) msg.textContent = st.over ? "" : (mine ? t("mpYourTurn") : t("mpWaitTurn"));
  }
  function note(last) {
    if (!last) return;
    if (last.by === MP.selfId) feedLine(body, t("nimYou", { n: last.n, m: st.left }), "");
    else feedLine(body, t("mpNimOpp", { p: MP.match.opp, n: last.n, m: st.left }), "bad");
  }
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") { st.left = m.left; st.turn = m.turn; note(m.last); paint(); }
    else if (m.t === "mpg_o") {
      st.left = 0; st.over = true; note(m.last); paint();
      mpFinish(body, mpgKind(m.winner), 30);
    }
  };
  paint();
}

/* ============================================================
   PENALTY SHOOTOUT - 5 kicks each, both pick a corner at once
   ============================================================ */
MPG.pe = {
  start: function (match) {
    match.s = { round: 0, phase: 0, picks: {}, sa: 0, sb: 0 };
    mpgSend(match, { round: 0, phase: 0, sa: 0, sb: 0, ev: null });
  },
  onMsg: function (match, id, m) {
    var s = match.s;
    var d = m.d;
    if (typeof d !== "number" || d < 1 || d > 3 || s.picks[id]) return;
    s.picks[id] = d;
    if (!s.picks[match.a] || !s.picks[match.b]) return;
    var shooter = s.phase === 0 ? match.a : match.b;
    var keeper = mpgOther(match, shooter);
    var goal = s.picks[shooter] !== s.picks[keeper];
    var ev = { shooter: shooter, shot: s.picks[shooter], keep: s.picks[keeper], goal: goal };
    if (goal) { if (shooter === match.a) s.sa++; else s.sb++; }
    s.picks = {};
    if (s.phase === 0) s.phase = 1;
    else { s.phase = 0; s.round++; }
    if (s.round >= 5) {
      var w = s.sa > s.sb ? match.a : (s.sb > s.sa ? match.b : null);
      mpgOver(match, w, { sa: s.sa, sb: s.sb, ev: ev });
      return;
    }
    mpgSend(match, { round: s.round, phase: s.phase, sa: s.sa, sb: s.sb, ev: ev });
  },
  view: function () { viewMPPenalty(); }
};

function viewMPPenalty() {
  var body = mountPanel("peName");
  var isA = MP.match && MP.match.role === "A";
  var st = { round: 0, phase: 0, sa: 0, sb: 0, over: false, locked: false };
  var dirName = { 1: t("peL"), 2: t("peC"), 3: t("peR") };
  body.innerHTML =
    '<p class="hint">' + esc(t("peRule")) + " - vs " + esc(MP.match ? MP.match.opp : "?") + "</p>" +
    '<div class="mp-score" id="pe-line"></div>' +
    '<p class="hint" id="pe-role"></p>' +
    '<div class="mp-row">' +
      '<button class="btn" type="button" data-d="1">' + esc(t("peL")) + "</button>" +
      '<button class="btn" type="button" data-d="2">' + esc(t("peC")) + "</button>" +
      '<button class="btn" type="button" data-d="3">' + esc(t("peR")) + "</button>" +
    "</div>" +
    '<div class="feed" id="g-feed"></div>';
  var btns = body.getElementsByClassName("btn");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.onclick = function () {
        if (st.over || st.locked) return;
        st.locked = true;
        paint();
        mpSendMsg({ t: "mpg", d: parseInt(b.getAttribute("data-d"), 10) });
      };
    })(btns[i]);
  }
  function paint() {
    var line = document.getElementById("pe-line");
    var me = isA ? st.sa : st.sb, op = isA ? st.sb : st.sa;
    if (line) line.textContent = t("peStatus", { a: me, b: op, r: Math.min(st.round + 1, 5) });
    var shooting = (st.phase === 0) === isA;
    var rl = document.getElementById("pe-role");
    if (rl) rl.textContent = st.over ? "" : (st.locked ? t("mpPenWait") : (shooting ? t("mpPenShoot") : t("mpPenKeep")));
    for (var j = 0; j < btns.length; j++) btns[j].disabled = st.over || st.locked;
  }
  function note(ev) {
    if (!ev) return;
    var mine = ev.shooter === MP.selfId;
    var who = mine ? t("bjYou") : MP.match.opp;
    var good = mine ? ev.goal : !ev.goal;
    feedLine(body, t("mpPenLine", { who: who, s: dirName[ev.shot], k: dirName[ev.keep],
      r: ev.goal ? t("peGoal") : t("peSaved") }), good ? "good" : "bad");
  }
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") {
      st.round = m.round; st.phase = m.phase; st.sa = m.sa; st.sb = m.sb; st.locked = false;
      note(m.ev); paint();
    } else if (m.t === "mpg_o") {
      st.sa = m.sa; st.sb = m.sb; st.over = true; note(m.ev); paint();
      mpFinish(body, mpgKind(m.winner), 60);
    }
  };
  paint();
}

/* ============================================================
   PONG - host runs the physics, both send their paddle height
   ============================================================ */
var MPG_PONG = { W: 600, H: 300, PW: 10, PH: 60, BS: 10, TARGET: 5 };

function mpgPongReset(s, dir) {
  s.bx = MPG_PONG.W / 2; s.by = MPG_PONG.H / 2;
  s.vx = (dir || (Math.random() < 0.5 ? -1 : 1)) * 3;
  var vys = [-2, -1, 1, 2];
  s.vy = vys[Math.floor(Math.random() * 4)];
  s.freeze = 45;
}

MPG.pong = {
  start: function (match) {
    var s = { bx: 0, by: 0, vx: 0, vy: 0, ya: 120, yb: 120, sa: 0, sb: 0, freeze: 0, n: 0 };
    mpgPongReset(s);
    s.freeze = 90;
    match.s = s;
    var P = MPG_PONG;
    function pushState() {
      mpgSend(match, { bx: s.bx, by: s.by, ya: s.ya, yb: s.yb, sa: s.sa, sb: s.sb });
    }
    match.timer = setInterval(function () {
      if (match.over) { clearInterval(match.timer); return; }
      s.n++;
      if (s.freeze > 0) { s.freeze--; if (s.n % 2 === 0) pushState(); return; }
      s.bx += s.vx; s.by += s.vy;
      if (s.by <= P.BS / 2 || s.by >= P.H - P.BS / 2) {
        s.vy = -s.vy;
        s.by = Math.max(P.BS / 2, Math.min(P.H - P.BS / 2, s.by));
      }
      var hit;
      if (s.bx - P.BS / 2 <= P.PW && s.bx + P.BS / 2 >= 0 && s.vx < 0 &&
          s.by >= s.ya && s.by <= s.ya + P.PH) {
        s.vx = Math.abs(s.vx) + 0.2;
        hit = (s.by - s.ya) / P.PH - 0.5;
        s.vy = hit * 6;
      }
      if (s.bx + P.BS / 2 >= P.W - P.PW && s.bx - P.BS / 2 <= P.W && s.vx > 0 &&
          s.by >= s.yb && s.by <= s.yb + P.PH) {
        s.vx = -Math.abs(s.vx) - 0.2;
        hit = (s.by - s.yb) / P.PH - 0.5;
        s.vy = hit * 6;
      }
      var scored = false;
      if (s.bx < 0) { s.sb++; scored = true; mpgPongReset(s, 1); }
      else if (s.bx > P.W) { s.sa++; scored = true; mpgPongReset(s, -1); }
      if (scored) {
        if (s.sa >= P.TARGET || s.sb >= P.TARGET) {
          mpgOver(match, s.sa > s.sb ? match.a : match.b, { sa: s.sa, sb: s.sb });
          return;
        }
        pushState();
        return;
      }
      if (s.n % 2 === 0) pushState();
    }, 16);
  },
  onMsg: function (match, id, m) {
    var y = m.y;
    if (typeof y !== "number" || isNaN(y)) return;
    y = Math.max(0, Math.min(MPG_PONG.H - MPG_PONG.PH, y));
    if (id === match.a) match.s.ya = y; else match.s.yb = y;
  },
  view: function () { viewMPPong(); }
};

function viewMPPong() {
  var P = MPG_PONG;
  var body = mountPanel("pongName");
  var isA = MP.match && MP.match.role === "A";
  body.innerHTML =
    '<p class="hint">' + esc(t("mpPongRule")) + " - vs " + esc(MP.match ? MP.match.opp : "?") + "</p>" +
    '<div class="mp-score" id="mpg-pong-score">0 : 0</div>' +
    '<canvas id="mpg-pong" width="' + P.W + '" height="' + P.H +
      '" style="background:#0f0f0f;border:2px solid #333;border-radius:4px;display:block;margin:0 auto;max-width:100%;"></canvas>' +
    '<div class="feed" id="g-feed"></div>';
  var cv = document.getElementById("mpg-pong");
  var ctx = cv.getContext("2d");
  var S = { bx: P.W / 2, by: P.H / 2, ya: 120, yb: 120, sa: 0, sb: 0 };
  var myY = (P.H - P.PH) / 2, sent = -1, tick = 0, over = false, keys = {}, timer = 0;

  function kd(e) {
    keys[e.key] = true;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") { if (e.preventDefault) e.preventDefault(); }
  }
  function ku(e) { keys[e.key] = false; }
  document.addEventListener("keydown", kd);
  document.addEventListener("keyup", ku);
  function cleanup() {
    if (timer) { clearInterval(timer); timer = 0; }
    document.removeEventListener("keydown", kd);
    document.removeEventListener("keyup", ku);
  }
  function draw() {
    ctx.clearRect(0, 0, P.W, P.H);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#333";
    ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(P.W / 2, 0); ctx.lineTo(P.W / 2, P.H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillRect(0, isA ? myY : S.ya, P.PW, P.PH);
    ctx.fillRect(P.W - P.PW, isA ? S.yb : myY, P.PW, P.PH);
    ctx.beginPath(); ctx.arc(S.bx, S.by, P.BS / 2, 0, Math.PI * 2); ctx.fill();
  }
  function score() {
    var el = document.getElementById("mpg-pong-score");
    if (el) el.textContent = (isA ? S.sa : S.sb) + " : " + (isA ? S.sb : S.sa);
  }
  timer = setInterval(function () {
    if (!document.getElementById("mpg-pong")) { cleanup(); return; }
    if (over) return;
    if (keys.ArrowUp || keys.w || keys.W) myY -= 6;
    if (keys.ArrowDown || keys.s || keys.S) myY += 6;
    myY = Math.max(0, Math.min(P.H - P.PH, myY));
    tick++;
    if (myY !== sent && tick % 2 === 0) { sent = myY; mpSendMsg({ t: "mpg", y: myY }); }
    draw();
  }, 16);
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") { S = m; score(); }
    else if (m.t === "mpg_o") {
      over = true; S.sa = m.sa; S.sb = m.sb; score(); draw(); cleanup();
      mpFinish(body, mpgKind(m.winner), 50);
    }
  };
  draw();
}

/* ============================================================
   BLACKJACK DUEL - same dealer for both, best result wins
   ============================================================ */
function mpgDraw() {
  return { r: pick(BJ_RANKS), s: pick(["Hearts", "Diamonds", "Clubs", "Spades"]) };
}
function mpgBjRank(total, dealer) {
  if (total > 21) return 0;
  if (dealer > 21 || total > dealer) return 2;
  if (total === dealer) return 1;
  return 0;
}

MPG.bj = {
  start: function (match) {
    var s = { hand: {}, done: {}, dealer: [mpgDraw(), mpgDraw()] };
    s.hand[match.a] = [mpgDraw(), mpgDraw()];
    s.hand[match.b] = [mpgDraw(), mpgDraw()];
    s.done[match.a] = bjValue(s.hand[match.a]) >= 21;
    s.done[match.b] = bjValue(s.hand[match.b]) >= 21;
    match.s = s;
    MPG.bj.push(match);
    MPG.bj.maybeEnd(match);
  },
  push: function (match) {
    var s = match.s, ids = [match.a, match.b];
    for (var i = 0; i < 2; i++) {
      var me = ids[i], op = ids[1 - i];
      mpDeliver(me, { t: "mpg_s", mine: s.hand[me], myDone: s.done[me],
        oppN: s.hand[op].length, oppDone: s.done[op], up: s.dealer[1] });
    }
  },
  onMsg: function (match, id, m) {
    var s = match.s;
    if (s.done[id]) return;
    if (m.act === "hit") {
      s.hand[id].push(mpgDraw());
      if (bjValue(s.hand[id]) >= 21) s.done[id] = true;
    } else if (m.act === "stand") {
      s.done[id] = true;
    } else return;
    MPG.bj.push(match);
    MPG.bj.maybeEnd(match);
  },
  maybeEnd: function (match) {
    var s = match.s;
    if (!s.done[match.a] || !s.done[match.b]) return;
    while (bjValue(s.dealer) < 17) s.dealer.push(mpgDraw());
    var dt = bjValue(s.dealer);
    var ta = bjValue(s.hand[match.a]), tb = bjValue(s.hand[match.b]);
    var ra = mpgBjRank(ta, dt), rb = mpgBjRank(tb, dt), w = null;
    if (ra > rb) w = match.a;
    else if (rb > ra) w = match.b;
    else if (ra === 2) { if (ta > tb) w = match.a; else if (tb > ta) w = match.b; }
    mpgOver(match, w, { a: s.hand[match.a], b: s.hand[match.b], dealer: s.dealer,
      ta: ta, tb: tb, td: dt, ra: ra, rb: rb });
  },
  view: function () { viewMPBlackjack(); }
};

function viewMPBlackjack() {
  var body = mountPanel("bjName");
  var isA = MP.match && MP.match.role === "A";
  var st = { mine: [], myDone: false, oppN: 2, oppDone: false, up: null, over: false };

  function cardHtml(c) {
    var red = c.s === "Hearts" || c.s === "Diamonds";
    return '<div class="bcard' + (red ? " red" : "") + '">' + c.r + SUIT_SYM[c.s] + "</div>";
  }
  function handHtml(h) {
    var x = "";
    for (var i = 0; i < h.length; i++) x += cardHtml(h[i]);
    return x;
  }
  function holes(n) {
    var x = "";
    for (var i = 0; i < n; i++) x += '<div class="bcard hole">?</div>';
    return x;
  }
  var resWord = ["mpBjLoseW", "mpBjPushW", "mpBjWinW"];
  function resText(total, rank) { return total > 21 ? t("mpBjBustW") : t(resWord[rank]); }

  function paint() {
    var h = '<p class="hint">' + esc(t("mpBjRule")) + " - vs " + esc(MP.match ? MP.match.opp : "?") + "</p>" +
      '<div class="bj-table">' +
      '<div class="bj-row-label">' + esc(t("bjDealer")) + "</div>" +
      '<div class="bj-hand">' + holes(1) + (st.up ? cardHtml(st.up) : "") + "</div>" +
      '<div class="bj-row-label">' + esc(MP.match.opp) + " (" + st.oppN + " " + esc(t("mpBjCards")) + ")" +
        (st.oppDone ? " - " + esc(t("mpBjDone")) : "") + "</div>" +
      '<div class="bj-hand">' + holes(st.oppN) + "</div>" +
      '<div class="bj-row-label">' + esc(t("bjYou")) + " (" + bjValue(st.mine) + ")</div>" +
      '<div class="bj-hand">' + handHtml(st.mine) + "</div>";
    if (!st.myDone) {
      h += '<div class="row">' +
        '<button class="btn" id="mpbj-hit" type="button">' + esc(t("bjHit")) + "</button>" +
        '<button class="btn alt" id="mpbj-stand" type="button">' + esc(t("bjStand")) + "</button></div>";
    } else {
      h += '<p class="hint">' + esc(t("mpBjWait")) + "</p>";
    }
    h += '<div class="feed" id="g-feed"></div></div>';
    body.innerHTML = h;
    var hit = document.getElementById("mpbj-hit"), stand = document.getElementById("mpbj-stand");
    if (hit) hit.onclick = function () { hit.disabled = true; mpSendMsg({ t: "mpg", act: "hit" }); };
    if (stand) stand.onclick = function () { stand.disabled = true; mpSendMsg({ t: "mpg", act: "stand" }); };
  }

  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") {
      st.mine = m.mine; st.myDone = m.myDone; st.oppN = m.oppN; st.oppDone = m.oppDone; st.up = m.up;
      paint();
    } else if (m.t === "mpg_o") {
      st.over = true;
      var mine = isA ? m.a : m.b, theirs = isA ? m.b : m.a;
      var tm = isA ? m.ta : m.tb, tt = isA ? m.tb : m.ta;
      var rm = isA ? m.ra : m.rb, rt = isA ? m.rb : m.ra;
      body.innerHTML =
        '<div class="bj-table">' +
        '<div class="bj-row-label">' + esc(t("bjDealer")) + " (" + m.td + ")</div>" +
        '<div class="bj-hand">' + handHtml(m.dealer) + "</div>" +
        '<div class="bj-row-label">' + esc(MP.match.opp) + " (" + tt + ")</div>" +
        '<div class="bj-hand">' + handHtml(theirs) + "</div>" +
        '<div class="bj-row-label">' + esc(t("bjYou")) + " (" + tm + ")</div>" +
        '<div class="bj-hand">' + handHtml(mine) + "</div>" +
        '<div class="feed" id="g-feed"></div></div>';
      feedLine(body, t("bjYou") + ": " + tm + " - " + resText(tm, rm), rm === 2 ? "good" : (rm === 1 ? "" : "bad"));
      feedLine(body, MP.match.opp + ": " + tt + " - " + resText(tt, rt), "");
      mpFinish(body, mpgKind(m.winner), 40);
    }
  };
  paint();
}

/* ============================================================
   SCORE DUEL - every other game, played side by side
   Both players get the SAME start (100 points, no shop items), play the
   same game for MPD.secs seconds, the one who gained more points wins.
   Real points + items are saved first and restored afterwards, so a duel
   can never break (or farm) your real balance.
   ============================================================ */
var MPD = { secs: 90, lock: false, active: null, bar: null, tm: 0, baseline: 100 };

/* stray timers of a finished game must not touch real points */
(function () {
  var _credit = credit, _spend = spend;
  credit = function (n) { if (MPD.lock) return; _credit(n); };
  spend = function (n) { if (MPD.lock) return false; return _spend(n); };
  var _showView = showView;
  showView = function (fn) {
    if (MPD.lock && (fn === renderMenu || (typeof renderRoom !== "undefined" && fn === renderRoom))) MPD.lock = false;
    _showView(fn);
  };
})();

function mpdRestore() {
  var raw = null;
  try { raw = localStorage.getItem("kac_duel_backup"); } catch (e) {}
  if (!raw) return;
  try {
    var b = JSON.parse(raw);
    save.points = b.points; save.items = b.items || [];
    persist();
    updateHUD();
  } catch (e2) {}
  try { localStorage.removeItem("kac_duel_backup"); } catch (e3) {}
}
mpdRestore();   /* tab closed mid-duel last time -> give the real points back */

function mpdBegin() {
  try {
    localStorage.setItem("kac_duel_backup", JSON.stringify({ points: save.points, items: save.items }));
  } catch (e) {}
  MPD.snapshot = { points: save.points, items: save.items };
  save.points = MPD.baseline;
  save.items = [];
  updateHUD();
}
function mpdEnd() {
  var score = save.points - MPD.baseline;
  MPD.lock = true;
  save.points = MPD.snapshot.points;
  save.items = MPD.snapshot.items;
  persist();
  try { localStorage.removeItem("kac_duel_backup"); } catch (e) {}
  updateHUD();
  return score;
}
function mpdKillBar() {
  if (MPD.tm) { clearInterval(MPD.tm); MPD.tm = 0; }
  if (MPD.bar && MPD.bar.parentNode) MPD.bar.parentNode.removeChild(MPD.bar);
  MPD.bar = null;
}

function viewDuel(def) {
  var body = mountPanel(def.name);
  var opp = MP.match ? MP.match.opp : "?";
  var run = { started: false, over: false, left: 0, fn: currentView };
  body.innerHTML =
    '<p class="hint">' + esc(t("mpDuelIntro", { s: MPD.secs })) + " - vs " + esc(opp) + "</p>" +
    '<div class="mp-score" id="duel-cd">...</div>';
  var cd = 3;
  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s" && m.go && !run.started) {
      run.started = true;
      var iv = setInterval(function () {
        var el = document.getElementById("duel-cd");
        if (!el || currentView !== run.fn) { clearInterval(iv); return; }
        if (cd > 0) { el.textContent = t("mpDuelGo", { n: cd }); cd--; return; }
        clearInterval(iv);
        launch();
      }, 800);
    } else if (m.t === "mpg_o") {
      result(m);
    }
  };

  function leave(sendForfeit) {
    if (run.over) return;
    run.over = true;
    mpdKillBar();
    if (run.started && run.launched) mpdEnd();
    if (sendForfeit && MP.match) mpSendMsg({ t: "forfeit" });
    MP.match = null;
    MP.onGame = null;
    MPD.active = null;
  }

  function launch() {
    run.launched = true;
    run.left = MPD.secs;
    mpdBegin();
    MPD.active = run;
    def.view();                       /* the normal solo game, same panel */
    var bar = document.createElement("div");
    bar.id = "duel-bar";
    bar.innerHTML = '<span id="duel-txt"></span> <button class="btn small" id="duel-ff" type="button">' +
      esc(t("mpDuelForfeit")) + "</button>";
    document.body.appendChild(bar);
    MPD.bar = bar;
    document.getElementById("duel-ff").onclick = function () {
      leave(true);
      showView(renderRoom);
    };
    var t0 = new Date().getTime();
    MPD.tm = setInterval(function () {
      if (run.over) { mpdKillBar(); return; }
      if (currentView !== run.fn) { leave(true); return; }   /* back button = forfeit */
      var left = MPD.secs - Math.floor((new Date().getTime() - t0) / 1000);
      var txt = document.getElementById("duel-txt");
      if (txt) txt.textContent = t("mpDuelBar", { p: opp, s: Math.max(0, left), n: save.points - MPD.baseline });
      if (left <= 0) timeUp();
    }, 250);
  }

  function timeUp() {
    if (run.over) return;
    mpdKillBar();
    var score = mpdEnd();
    run.over = true;
    run.score = score;
    var b2 = mountPanel(def.name);
    b2.innerHTML = '<p class="hint">' + esc(t("mpDuelWait", { n: score, p: opp })) + "</p>" +
      '<div class="feed" id="g-feed"></div>';
    mpSendMsg({ t: "mpg", score: score });
  }

  function result(m) {
    if (!run.over) { leave(false); }            /* opponent finished first / left */
    var isA = MP.match && MP.match.role === "A";
    var mine = isA ? m.sa : m.sb, theirs = isA ? m.sb : m.sa;
    MPD.lock = false;                            /* the prize below is real */
    var b3 = mountPanel(def.name);
    b3.innerHTML = '<div class="feed" id="g-feed"></div>';
    if (!MP.match) MP.match = { game: "duel", role: isA ? "A" : "B", opp: opp };
    feedLine(b3, t("bjYou") + ": " + (mine === null ? "-" : mine), "");
    feedLine(b3, opp + ": " + (theirs === null ? "-" : theirs), "");
    mpFinish(b3, mpgKind(m.winner), 40);
    MPD.lock = true;
  }
}


/* ============================================================
   RUSSIAN ROULETTE - revolver UI, spin once per move, shot self / opp
   clean: click or BANG only
   ============================================================ */
MPG.rr = {
  start: function (match) {
    var chamber = Math.floor(Math.random() * 6);
    match.s = {
      chamber: chamber,
      pos: 0,
      turn: match.a,
      spun: false,
      alive: {}
    };
    match.s.alive[match.a] = true;
    match.s.alive[match.b] = true;
    mpgSend(match, { pos: 0, turn: match.a, spun: false, last: null });
  },
  onMsg: function (match, id, m) {
    var s = match.s;
    if (match.over) return;
    if (s.turn !== id) return;

    if (m.act === "spin") {
      if (s.spun) return; /* only one spin per move */
      s.chamber = Math.floor(Math.random() * 6);
      s.pos = 0;
      s.spun = true;
      mpgSend(match, { pos: s.pos, turn: s.turn, spun: true, last: { by: id, kind: "spin" } });
      return;
    }

    if (m.act !== "shot") return;
    var target = m.target; /* "self" or opponent id */
    if (target !== "self" && target !== match.a && target !== match.b) return;
    if (target !== "self" && target === id) target = "self";

    var victim = target === "self" ? id : target;
    var bang = (s.pos % 6) === s.chamber;

    if (bang) {
      s.alive[victim] = false;
      var winner = mpgOther(match, victim);
      mpgOver(match, winner, {
        pos: s.pos,
        spun: s.spun,
        last: { by: id, kind: "bang", target: victim }
      });
      return;
    }

    s.pos++;
    s.spun = false; /* next player's move may spin once */
    s.turn = mpgOther(match, id);
    mpgSend(match, {
      pos: s.pos,
      turn: s.turn,
      spun: false,
      last: { by: id, kind: "click", target: victim }
    });
  },
  view: function () { viewMPRR(); }
};

function viewMPRR() {
  var body = mountPanel("rrName");
  var oppName = MP.match ? MP.match.opp : "?";
  var st = { pos: 0, turn: null, over: false, spun: false, hammer: false };

  body.innerHTML =
    '<p class="hint">' + esc(t("rrRule")) + " - vs " + esc(oppName) + "</p>" +
    '<div class="mp-score" id="rr-line"></div>' +
    '<div class="rr-gun" id="rr-gun">' +
        '        <div class="rr-stage">' +
        '          <svg class="rr-svg" id="rr-rev" viewBox="0 0 520 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '            <defs>' +
        '              <linearGradient id="rrSteel" x1="0" y1="0" x2="0" y2="1">' +
        '                <stop offset="0%" stop-color="#c8c8c8"/>' +
        '                <stop offset="35%" stop-color="#7a7a7a"/>' +
        '                <stop offset="70%" stop-color="#3a3a3a"/>' +
        '                <stop offset="100%" stop-color="#1a1a1a"/>' +
        '              </linearGradient>' +
        '              <linearGradient id="rrSteelH" x1="0" y1="0" x2="1" y2="0">' +
        '                <stop offset="0%" stop-color="#9a9a9a"/>' +
        '                <stop offset="50%" stop-color="#555"/>' +
        '                <stop offset="100%" stop-color="#2a2a2a"/>' +
        '              </linearGradient>' +
        '              <linearGradient id="rrWood" x1="0" y1="0" x2="1" y2="1">' +
        '                <stop offset="0%" stop-color="#8b5a2b"/>' +
        '                <stop offset="40%" stop-color="#5c3a1e"/>' +
        '                <stop offset="100%" stop-color="#2a1608"/>' +
        '              </linearGradient>' +
        '              <radialGradient id="rrCylGrad" cx="40%" cy="35%" r="65%">' +
        '                <stop offset="0%" stop-color="#8a8a8a"/>' +
        '                <stop offset="55%" stop-color="#3d3d3d"/>' +
        '                <stop offset="100%" stop-color="#151515"/>' +
        '              </radialGradient>' +
        '              <filter id="rrShadow" x="-20%" y="-20%" width="140%" height="140%">' +
        '                <feDropShadow dx="3" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.55"/>' +
        '              </filter>' +
        '            </defs>' +
        '            <g filter="url(#rrShadow)">' +
        '              <!-- grip -->' +
        '              <path d="M355 128' +
        '                       C358 128 362 130 368 138' +
        '                       L410 210' +
        '                       C414 218 412 228 402 232' +
        '                       L348 245' +
        '                       C338 248 328 242 324 230' +
        '                       L310 168' +
        '                       C308 155 318 140 335 132' +
        '                       Z" fill="url(#rrWood)" stroke="#1a0e06" stroke-width="2"/>' +
        '              <!-- grip checkering lines -->' +
        '              <path d="M340 150 L390 220 M348 148 L398 218 M356 146 L404 214' +
        '                       M335 160 L385 230 M345 165 L392 228" stroke="#3a2210" stroke-width="1" opacity="0.45"/>' +
        '              <circle cx="368" cy="188" r="6" fill="#888" stroke="#222" stroke-width="1"/>' +
        '              <line x1="363" y1="188" x2="373" y2="188" stroke="#222" stroke-width="1.5"/>' +
        '' +
        '              <!-- trigger guard -->' +
        '              <path d="M300 145' +
        '                       C300 145 298 175 312 188' +
        '                       C322 196 340 194 348 180' +
        '                       L348 155"' +
        '                    fill="none" stroke="url(#rrSteelH)" stroke-width="5" stroke-linecap="round"/>' +
        '' +
        '              <!-- trigger -->' +
        '              <g id="rr-trig">' +
        '                <path d="M318 148 L322 148 L326 175 C326 180 320 182 318 178 Z" fill="#555" stroke="#222" stroke-width="1"/>' +
        '              </g>' +
        '' +
        '              <!-- frame body -->' +
        '              <path d="M175 70' +
        '                       L300 70' +
        '                       C320 70 340 78 348 95' +
        '                       L355 125' +
        '                       L348 145' +
        '                       L300 155' +
        '                       L210 155' +
        '                       C190 155 175 140 175 120' +
        '                       Z" fill="url(#rrSteel)" stroke="#111" stroke-width="1.5"/>' +
        '              <!-- top strap -->' +
        '              <path d="M180 70 L295 70 C300 70 305 72 305 78 L180 78 Z" fill="#9a9a9a" opacity="0.5"/>' +
        '              <!-- side plate rivet -->' +
        '              <circle cx="250" cy="110" r="3" fill="#666" stroke="#222"/>' +
        '' +
        '              <!-- barrel -->' +
        '              <path d="M10 88' +
        '                       L175 88' +
        '                       L175 118' +
        '                       L18 118' +
        '                       C8 118 4 112 4 103' +
        '                       C4 94 8 88 10 88' +
        '                       Z" fill="url(#rrSteel)" stroke="#111" stroke-width="1.5"/>' +
        '              <!-- barrel rib -->' +
        '              <path d="M20 82 L160 82 L160 88 L20 88 Z" fill="#8a8a8a" stroke="#333" stroke-width="0.8"/>' +
        '              <!-- front sight -->' +
        '              <path d="M28 74 L34 74 L33 82 L29 82 Z" fill="#bbb" stroke="#333" stroke-width="0.6"/>' +
        '              <!-- muzzle hole -->' +
        '              <ellipse cx="10" cy="103" rx="6" ry="9" fill="#0a0a0a" stroke="#333" stroke-width="1"/>' +
        '              <ellipse cx="10" cy="103" rx="3.5" ry="5.5" fill="#000"/>' +
        '' +
        '              <!-- ejector rod housing under barrel -->' +
        '              <rect x="55" y="118" width="95" height="7" rx="2" fill="#4a4a4a" stroke="#222" stroke-width="0.8"/>' +
        '' +
        '              <!-- cylinder crane / window recess -->' +
        '              <circle cx="210" cy="112" r="42" fill="#0d0d0d" stroke="#2a2a2a" stroke-width="3"/>' +
        '              <circle cx="210" cy="112" r="42" fill="none" stroke="#555" stroke-width="1.5" opacity="0.6"/>' +
        '' +
        '              <!-- cylinder group (rotates) -->' +
        '              <g id="rr-cyl" transform="translate(210,112)">' +
        '                <circle r="36" fill="url(#rrCylGrad)" stroke="#111" stroke-width="2"/>' +
        '                <!-- flutes -->' +
        '                <g stroke="#111" stroke-width="1.2" opacity="0.5" fill="none">' +
        '                  <path d="M0 -36 Q8 -20 0 -8"/>' +
        '                  <path d="M31 -18 Q18 -12 8 -4"/>' +
        '                  <path d="M31 18 Q18 12 8 4"/>' +
        '                  <path d="M0 36 Q8 20 0 8"/>' +
        '                  <path d="M-31 18 Q-18 12 -8 4"/>' +
        '                  <path d="M-31 -18 Q-18 -12 -8 -4"/>' +
        '                </g>' +
        '                <!-- chambers -->' +
        '                <g id="rr-chambers">' +
        '                  <circle class="rr-ch" data-i="0" cx="0" cy="-22" r="7" fill="#0a0a0a" stroke="#666" stroke-width="1.2"/>' +
        '                  <circle class="rr-ch" data-i="1" cx="19" cy="-11" r="7" fill="#0a0a0a" stroke="#666" stroke-width="1.2"/>' +
        '                  <circle class="rr-ch" data-i="2" cx="19" cy="11" r="7" fill="#0a0a0a" stroke="#666" stroke-width="1.2"/>' +
        '                  <circle class="rr-ch" data-i="3" cx="0" cy="22" r="7" fill="#0a0a0a" stroke="#666" stroke-width="1.2"/>' +
        '                  <circle class="rr-ch" data-i="4" cx="-19" cy="11" r="7" fill="#0a0a0a" stroke="#666" stroke-width="1.2"/>' +
        '                  <circle class="rr-ch" data-i="5" cx="-19" cy="-11" r="7" fill="#0a0a0a" stroke="#666" stroke-width="1.2"/>' +
        '                </g>' +
        '                <!-- center pin -->' +
        '                <circle r="5" fill="#bbb" stroke="#333" stroke-width="1"/>' +
        '                <circle r="2" fill="#555"/>' +
        '              </g>' +
        '' +
        '              <!-- hammer -->' +
        '              <g id="rr-hammer" transform="translate(318,78)">' +
        '                <path d="M0 8' +
        '                         L4 0' +
        '                         L12 -6' +
        '                         L16 -4' +
        '                         L14 4' +
        '                         L10 28' +
        '                         L2 30' +
        '                         L0 20' +
        '                         Z" fill="url(#rrSteel)" stroke="#111" stroke-width="1.2"/>' +
        '                <!-- spur -->' +
        '                <path d="M4 0 L10 -10 L16 -6 L12 -2 Z" fill="#aaa" stroke="#222" stroke-width="0.8"/>' +
        '              </g>' +
        '            </g>' +
        '' +
        '            <!-- muzzle flash (hidden by default) -->' +
        '            <g id="rr-flash" opacity="0" pointer-events="none">' +
        '              <ellipse cx="8" cy="103" rx="22" ry="16" fill="#fff6a0" opacity="0.95"/>' +
        '              <ellipse cx="8" cy="103" rx="12" ry="9" fill="#fff"/>' +
        '              <path d="M8 103 L-30 90" stroke="#ffd24a" stroke-width="4" stroke-linecap="round" opacity="0.8"/>' +
        '              <path d="M8 103 L-34 103" stroke="#ffe080" stroke-width="5" stroke-linecap="round" opacity="0.9"/>' +
        '              <path d="M8 103 L-30 116" stroke="#ffd24a" stroke-width="4" stroke-linecap="round" opacity="0.8"/>' +
        '              <ellipse class="rr-smoke-svg" cx="-5" cy="95" rx="18" ry="12" fill="#bbb" opacity="0.35"/>' +
        '            </g>' +
        '          </svg>' +
        '        </div>' +
        '      </div>' +
    '<div class="mp-row rr-btns">' +
      '<button class="btn ghost" id="rr-spin" type="button">' + esc(t("rrSpin")) + "</button>" +
      '<button class="btn gold" id="rr-shot" type="button">' + esc(t("rrShot")) + "</button>" +
      '<button class="btn" id="rr-shot-opp" type="button">' + esc(t("rrShotOpp", { p: oppName })) + "</button>" +
    "</div>" +
    '<p class="hint" id="rr-msg"></p>' +
    '<div class="feed" id="g-feed"></div>';

  function paint() {
    var line = document.getElementById("rr-line");
    if (line) line.textContent = t("rrStatus", { n: st.pos, s: st.spun ? 1 : 0 });
    var cyl = document.getElementById("rr-cyl");
    if (cyl) {
      cyl.setAttribute("transform", "translate(210,112) rotate(" + (st.pos * 60) + ")");
      var ch = cyl.querySelectorAll(".rr-ch");
      for (var i = 0; i < ch.length; i++) {
        ch[i].setAttribute("fill", "#0a0a0a");
        ch[i].setAttribute("stroke", "#666");
      }
    }
    var hammer = document.getElementById("rr-hammer");
    if (hammer) {
      hammer.setAttribute("transform", st.hammer ? "translate(318,78) rotate(-42)" : "translate(318,78)");
    }
    var mine = !st.over && st.turn === MP.selfId;
    var spinB = document.getElementById("rr-spin");
    var shotB = document.getElementById("rr-shot");
    var oppB = document.getElementById("rr-shot-opp");
    if (spinB) spinB.disabled = !mine || st.spun;
    if (shotB) shotB.disabled = !mine;
    if (oppB) oppB.disabled = !mine;
    var msg = document.getElementById("rr-msg");
    if (msg) msg.textContent = st.over ? "" : (mine ? t("mpYourTurn") : t("mpWaitTurn"));
  }

  function flashBang() {
    var f = document.getElementById("rr-flash");
    var rev = document.getElementById("rr-rev");
    var ham = document.getElementById("rr-hammer");
    var trig = document.getElementById("rr-trig");
    if (f) {
      f.setAttribute("opacity", "1");
      setTimeout(function () { if (f) f.setAttribute("opacity", "0"); }, 320);
    }
    if (rev) {
      rev.classList.remove("recoil");
      void rev.offsetWidth;
      rev.classList.add("recoil");
      setTimeout(function () { if (rev) rev.classList.remove("recoil"); }, 360);
    }
    if (ham) {
      ham.setAttribute("transform", "translate(318,78) rotate(10)");
      setTimeout(function () { if (ham) ham.setAttribute("transform", "translate(318,78)"); }, 160);
    }
    if (trig) {
      trig.setAttribute("transform", "rotate(20 320 148)");
      setTimeout(function () { if (trig) trig.removeAttribute("transform"); }, 180);
    }
  }
  function animClick() {
    var ham = document.getElementById("rr-hammer");
    var trig = document.getElementById("rr-trig");
    if (ham) {
      ham.setAttribute("transform", "translate(318,78) rotate(10)");
      setTimeout(function () { if (ham) ham.setAttribute("transform", "translate(318,78)"); }, 160);
    }
    if (trig) {
      trig.setAttribute("transform", "rotate(18 320 148)");
      setTimeout(function () { if (trig) trig.removeAttribute("transform"); }, 160);
    }
  }
  function animSpin() {
    var cyl = document.getElementById("rr-cyl");
    var rev = document.getElementById("rr-rev");
    if (rev) {
      rev.classList.remove("spin-kick");
      void rev.offsetWidth;
      rev.classList.add("spin-kick");
      setTimeout(function () { if (rev) rev.classList.remove("spin-kick"); }, 520);
    }
    if (cyl) {
      var start = performance.now();
      var dur = 750;
      function frame(now) {
        var p = Math.min(1, (now - start) / dur);
        var ease = 1 - Math.pow(1 - p, 3);
        var ang = ease * 1080;
        cyl.setAttribute("transform", "translate(210,112) rotate(" + ang + ")");
        if (p < 1) requestAnimationFrame(frame);
        else if (typeof paint === "function") paint();
      }
      requestAnimationFrame(frame);
    }
  }

  function note(last) {
    if (!last) return;
    var who = last.by === MP.selfId ? t("bjYou") : oppName;
    var tgt = last.target == null ? who :
      (last.target === MP.selfId ? t("bjYou") : (last.target === "self" ? who : oppName));
    if (last.kind === "spin") { animSpin(); feedLine(body, t("rrSpun", { who: who }), ""); }
    else if (last.kind === "click") { animClick(); feedLine(body, t("rrClickAt", { who: who, target: tgt }), "good"); }
    else if (last.kind === "bang") {
      flashBang();
      feedLine(body, t("rrBangAt", { who: who, target: tgt }), "bad");
    }
  }

  document.getElementById("rr-spin").onclick = function () {
    if (st.over || st.turn !== MP.selfId || st.spun) return;
    mpSendMsg({ t: "mpg", act: "spin" });
  };
  document.getElementById("rr-shot").onclick = function () {
    if (st.over || st.turn !== MP.selfId) return;
    st.hammer = true; paint();
    mpSendMsg({ t: "mpg", act: "shot", target: "self" });
  };
  document.getElementById("rr-shot-opp").onclick = function () {
    if (st.over || st.turn !== MP.selfId) return;
    st.hammer = true; paint();
    var oppId = MP.match && MP.match.role === "A" ? null : null;
    /* host starts as match.a for role A; send other player's id via match stored on client */
    var other = null;
    if (MP.match) {
      /* clients don't always store peer ids; host routes by self vs other */
      other = "opp";
    }
    mpSendMsg({ t: "mpg", act: "shot", target: "opp" });
  };

  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "mpg_s") {
      st.pos = m.pos; st.turn = m.turn; st.spun = !!m.spun; st.hammer = false;
      note(m.last); paint();
    } else if (m.t === "mpg_o") {
      st.over = true; st.pos = m.pos != null ? m.pos : st.pos; st.hammer = false;
      note(m.last); paint();
      mpFinish(body, mpgKind(m.winner), 40);
    }
  };
  paint();
}

/* fix target "opp" on host: map to the other player id */
(function () {
  var _on = MPG.rr.onMsg;
  MPG.rr.onMsg = function (match, id, m) {
    if (m && m.act === "shot" && m.target === "opp") {
      m = { act: "shot", target: mpgOther(match, id) };
    }
    return _on(match, id, m);
  };
})();

/* register every game that is not multiplayer yet */
(function () {
  var all = GAMES.concat(typeof BONUS_GAMES !== "undefined" ? BONUS_GAMES : []);
  for (var i = 0; i < all.length; i++) {
    (function (g) {
      if (g.mp || g.view === viewShop) return;
      var id = "d_" + g.name;
      g.mp = id;
      MPG[id] = {
        start: function (match) {
          match.s = { scores: {} };
          match.timer = setTimeout(function () {
            /* safety net: someone's tab died - resolve with what we have */
            var sc = match.s.scores;
            var ha = sc[match.a] !== undefined, hb = sc[match.b] !== undefined;
            if (!match.over) {
              mpgOver(match, ha && !hb ? match.a : (hb && !ha ? match.b : null),
                { sa: ha ? sc[match.a] : null, sb: hb ? sc[match.b] : null });
            }
          }, (MPD.secs + 15) * 1000 + 4000);
          mpgSend(match, { go: true });
        },
        onMsg: function (match, id, m) {
          var s = match.s;
          if (typeof m.score !== "number" || isNaN(m.score) || s.scores[id] !== undefined) return;
          s.scores[id] = Math.max(-1e7, Math.min(1e7, Math.floor(m.score)));
          if (s.scores[match.a] === undefined || s.scores[match.b] === undefined) return;
          var a = s.scores[match.a], b = s.scores[match.b];
          mpgOver(match, a > b ? match.a : (b > a ? match.b : null), { sa: a, sb: b });
        },
        view: function () { viewDuel(g); }
      };
    })(all[i]);
  }
})();
