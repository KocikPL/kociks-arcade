/* ============================================================
   kocik's arcade - MULTIPLAYER (PeerJS, host-authoritative)

   - rooms with a random 4-digit code (create / join)
   - host sees the lobby and can kick players
   - auto-paired games: Tic-Tac-Toe, Rock Paper Scissors,
     Guess the Number
   - screen mirror: everyone can WATCH what others are playing
   ============================================================ */
"use strict";
if (!String.prototype.trim) {
  String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ""); };
}

var MP = {
  peer: null,
  conn: null,
  conns: {},
  isHost: false,
  roomCode: null,
  selfId: null,
  selfName: "",
  players: [],
  screens: {},
  watch: null,
  watchBox: null,
  matches: {},
  q: {},
  match: null,
  queueGame: null,
  onGame: null,
  mirrorT: 0,
  mirrorLobby: true
};

MP.inRoom = function () {
  return !!MP.roomCode;
};

/* STUN for same/normal networks, free TURN relay for cross-network
   (phone on cellular, friend's headset behind its own router...) */
var MP_ICE = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443"],
      username: "openrelayproject", credential: "openrelayproject" }
  ]
};

function mpVal(id) {
  var el = document.getElementById(id);
  var v = el ? String(el.value || "").trim() : "";
  return v;
}

function mpName(id) {
  for (var i = 0; i < MP.players.length; i++) {
    if (MP.players[i].id === id) return MP.players[i].name;
  }
  return "?";
}

function mpSendMsg(m) {
  if (MP.isHost) {
    mpHostData({ peer: MP.selfId, send: function () {} }, m);
  } else if (MP.conn) {
    try { MP.conn.send(m); } catch (e) {}
  }
}

function mpDeliver(id, m) {
  if (id === MP.selfId) { mpClientOnData(m); return; }
  var c = MP.conns[id];
  if (c) { try { c.send(m); } catch (e) {} }
}

function mpBroadcast(m, exceptId) {
  for (var id in MP.conns) {
    if (exceptId && id === exceptId) continue;
    try { MP.conns[id].send(m); } catch (e) {}
  }
}

function mpResetState() {
  MP.isHost = false;
  MP.roomCode = null;
  MP.selfId = null;
  MP.conns = {};
  MP.players = [];
  MP.screens = {};
  MP.matches = {};
  MP.q = {};
  MP.match = null;
  MP.queueGame = null;
  MP.onGame = null;
  MP.conn = null;
}

function mpStopMirror() {
  if (MP.mirrorT) { clearInterval(MP.mirrorT); MP.mirrorT = 0; }
}

function mpStartMirror() {
  if (MP.mirrorT) return;
  MP.mirrorLobby = true;
  MP.mirrorT = setInterval(mpMirrorTick, 800);
}

function mpStrip(html) {
  html = String(html).replace(/\sid="[^"]*"/g, "");
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  if (html.length > 70000) html = html.substring(0, 70000);
  return html;
}

function mpMirrorTick() {
  if (!MP.inRoom()) return;
  var lobbyView = currentView === renderMenu ||
    (typeof renderRoom !== "undefined" && currentView === renderRoom) ||
    (typeof renderWaiting !== "undefined" && currentView === renderWaiting);
  if (lobbyView) {
    if (!MP.mirrorLobby) {
      MP.mirrorLobby = true;
      mpSendMsg({ t: "screen", off: true });
    }
    return;
  }
  MP.mirrorLobby = false;
  var appEl = document.getElementById("app");
  if (!appEl) return;
  var title = "";
  var tt = document.querySelector ? document.querySelector(".game-title") : null;
  if (tt) title = tt.textContent || "";
  mpSendMsg({ t: "screen", title: title, html: mpStrip(appEl.innerHTML) });
}

/* ============================================================
   CREATE / JOIN / LEAVE
   ============================================================ */
function mpDefaultName(v) {
  v = String(v || "").replace(/[<>]/g, "").substring(0, 16);
  if (!v) v = "Player-" + ri(100, 999);
  return v;
}

function mpShowCreate() {
  if (typeof Peer === "undefined") { toast(t("mpNoLib")); return; }
  var body = mountPanel("mpCreate");
  body.innerHTML =
    '<p class="hint">' + esc(t("mpHint")) + "</p>" +
    '<div class="mp-row"><input class="text-input" id="mp-name" maxlength="16" placeholder="' +
      esc(t("mpYourName")) + '"></div>' +
    '<div class="mp-row"><button class="btn" id="mp-go" type="button">' +
      esc(t("mpCreateGo")) + "</button></div>";
  document.getElementById("mp-go").onclick = function () {
    mpCreate(mpVal("mp-name"));
  };
}

function mpShowJoin() {
  if (typeof Peer === "undefined") { toast(t("mpNoLib")); return; }
  var body = mountPanel("mpJoin");
  body.innerHTML =
    '<div class="mp-row"><input class="text-input" id="mp-name" maxlength="16" placeholder="' +
      esc(t("mpYourName")) + '"></div>' +
    '<div class="mp-row"><input class="num-input" id="mp-code" maxlength="4" placeholder="' +
      esc(t("mpEnterCode")) + '"></div>' +
    '<div class="mp-row"><button class="btn" id="mp-go" type="button">' +
      esc(t("mpJoinGo")) + "</button></div>";
  document.getElementById("mp-go").onclick = function () {
    mpJoin(mpVal("mp-code"), mpVal("mp-name"));
  };
}

function mpTeardown() {
  mpStopMirror();
  mpStopWatch();
  try { if (MP.conn) MP.conn.close(); } catch (e) {}
  for (var id in MP.conns) { try { MP.conns[id].close(); } catch (e) {} }
  try { if (MP.peer) MP.peer.destroy(); } catch (e) {}
  mpResetState();
}

function mpLeave() {
  mpTeardown();
  showView(renderMenu);
}

function mpCreate(name) {
  if (typeof Peer === "undefined") { toast(t("mpNoLib")); return; }
  mpTeardown();
  MP.selfName = mpDefaultName(name);
  var tries = 0;

  function attempt() {
    var code = String(ri(1000, 9999));
    var peer = new Peer("kociks-arcade-" + code, { config: MP_ICE });
    peer.on("open", function (id) {
      MP.peer = peer;
      MP.isHost = true;
      MP.roomCode = code;
      MP.selfId = id;
      MP.players = [{ id: id, name: MP.selfName, status: "lobby" }];
      mpStartMirror();
      toast("Room " + code + " ready - share the code!");
      showView(renderRoom);
    });
    peer.on("connection", function (conn) {
      MP.conns[conn.peer] = conn;
      conn.on("data", function (m) { mpHostData(conn, m); });
      conn.on("close", function () { mpHostRemove(conn.peer, false); });
      conn.on("error", function () { mpHostRemove(conn.peer, false); });
    });
    peer.on("disconnected", function () { try { peer.reconnect(); } catch (e) {} });
    peer.on("error", function (err) {
      if (err && err.type === "unavailable-id") {
        tries++;
        if (tries < 8) { try { peer.destroy(); } catch (e) {} attempt(); }
        else toast(t("mpNoNet", { e: "id-taken" }));
        return;
      }
      toast(t("mpNoNet", { e: (err && err.type) || "?" }));
    });
  }
  attempt();
}

function mpJoin(code, name) {
  if (typeof Peer === "undefined") { toast(t("mpNoLib")); return; }
  code = String(code || "").replace(/\D/g, "");
  if (code.length !== 4) { toast(t("mpEnterCode")); return; }
  mpTeardown();
  MP.selfName = mpDefaultName(name);
  var peer = new Peer({ config: MP_ICE });
  MP.peer = peer;
  var settled = false;
  var timer = setTimeout(function () {
    if (settled) return;
    settled = true;
    toast(t("mpNotFound"));
    mpTeardown();
  }, 20000);
  setTimeout(function () {
    if (settled) return;
    toast(t("mpSlowNet"));
  }, 8000);

  peer.on("open", function (id) {
    MP.selfId = id;
    var conn = peer.connect("kociks-arcade-" + code, { reliable: true });
    if (!conn) { if (!settled) { settled = true; clearTimeout(timer); toast(t("mpNotFound")); } return; }
    conn.on("open", function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      MP.conn = conn;
      conn.on("data", function (m) { mpClientOnData(m); });
      conn.on("close", function () {
        if (MP.roomCode) { toast(t("mpLost")); mpTeardown(); showView(renderMenu); }
      });
      conn.on("error", function () {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          toast(t("mpNotFound"));
          mpTeardown();
        } else {
          toast(t("mpLost"));
          mpTeardown();
          showView(renderMenu);
        }
      });
      conn.send({ t: "hello", name: MP.selfName });
      mpStartMirror();
      showView(renderRoom);
    });
  });
  peer.on("disconnected", function () { try { peer.reconnect(); } catch (e) {} });
  peer.on("error", function (err) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    var et = (err && err.type) || "?";
    if (et === "peer-unavailable") toast(t("mpNotFound"));
    else toast(t("mpNoNet", { e: et }));
    mpTeardown();
  });
}

/* ============================================================
   HOST logic
   ============================================================ */
function mpHostApplyStatus(id, s) {
  for (var i = 0; i < MP.players.length; i++) {
    if (MP.players[i].id === id) MP.players[i].status = s;
  }
  mpHostLobby();
}

function mpHostLobby() {
  mpBroadcast({ t: "lobby", players: MP.players, code: MP.roomCode });
  if (currentView === renderRoom) renderRoom();
}

function mpHostDropQueue(id) {
  for (var g in MP.q) {
    var arr = [];
    for (var i = 0; i < MP.q[g].length; i++) {
      if (MP.q[g][i] !== id) arr.push(MP.q[g][i]);
    }
    MP.q[g] = arr;
  }
}

function mpHostEndMatch(match) {
  if (!match) return;
  delete MP.matches[match.a];
  delete MP.matches[match.b];
  mpHostDropQueue(match.a);
  mpHostDropQueue(match.b);
}

function mpHostData(conn, m) {
  if (!m || !m.t) return;
  var id = conn.peer;

  if (m.t === "hello") {
    if (mpPlayersFull()) { try { conn.send({ t: "kick" }); } catch (e) {} return; }
    var nm = mpDefaultName(m.name);
    MP.players.push({ id: id, name: nm, status: "lobby" });
    mpHostLobby();
    try { conn.send({ t: "lobby", players: MP.players, code: MP.roomCode }); } catch (e) {}
    mpBroadcast({ t: "joined", n: nm }, id);
    return;
  }
  if (m.t === "status") { mpHostApplyStatus(id, m.s); return; }
  if (m.t === "queue") { mpHostQueue(id, m.game); return; }
  if (m.t === "unqueue") {
    if (MP.q[m.game]) {
      var qq = [];
      for (var qi = 0; qi < MP.q[m.game].length; qi++) {
        if (MP.q[m.game][qi] !== id) qq.push(MP.q[m.game][qi]);
      }
      MP.q[m.game] = qq;
    }
    return;
  }
  if (m.t === "forfeit") {
    var fm = MP.matches[id];
    if (fm) {
      mpHostEndMatch(fm);
      var oth = fm.a === id ? fm.b : fm.a;
      mpDeliver(oth, { t: "opp_left" });
    }
    return;
  }
  if (m.t === "screen") {
    if (m.off) {
      MP.screens[id] = null;
      mpBroadcast({ t: "screen", off: true, from: id }, id);
    } else {
      MP.screens[id] = { title: m.title, html: m.html };
      mpBroadcast({ t: "screen", from: id, title: m.title, html: m.html }, id);
    }
    return;
  }
  if (m.t === "ttt" || m.t === "rps" || m.t === "gn") {
    mpHostGame(id, m);
    return;
  }
}

function mpPlayersFull() {
  return MP.players.length >= 8;
}

function mpHostQueue(id, game) {
  if (game !== "ttt" && game !== "rps" && game !== "gn") return;
  if (MP.matches[id]) return;
  MP.q[game] = MP.q[game] || [];
  if (MP.q[game].indexOf(id) !== -1) return;
  MP.q[game].push(id);
  mpDeliver(id, { t: "waiting", game: game });
  if (MP.q[game].length >= 2) {
    var a = MP.q[game].shift();
    var b = MP.q[game].shift();
    var match = { game: game, a: a, b: b, over: false };
    if (game === "ttt") {
      match.board = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
      match.turn = "X";
    }
    if (game === "rps") { match.sa = 0; match.sb = 0; match.picks = {}; }
    if (game === "gn") {
      match.secret = ri(1, 100);
      match.rem = {};
      match.rem[a] = 5;
      match.rem[b] = 5;
    }
    MP.matches[a] = match;
    MP.matches[b] = match;
    mpHostApplyStatus(a, "playing");
    mpHostApplyStatus(b, "playing");
    mpDeliver(a, { t: "paired", game: game, role: game === "ttt" ? "X" : "A", opp: mpName(b), oppId: b });
    mpDeliver(b, { t: "paired", game: game, role: game === "ttt" ? "O" : "B", opp: mpName(a), oppId: a });
    if (game === "ttt") {
      var st = { t: "ttt_state", board: match.board, turn: match.turn };
      mpDeliver(a, st);
      mpDeliver(b, st);
    }
    if (game === "gn") {
      mpDeliver(a, { t: "gn_start", left: 5 });
      mpDeliver(b, { t: "gn_start", left: 5 });
    }
  }
}

function mpHostGame(id, m) {
  var match = MP.matches[id];
  if (!match || match.over) return;

  if (m.t === "ttt") {
    if (match.turn !== (match.a === id ? "X" : "O")) return;
    var i = m.i;
    if (typeof i !== "number" || i < 0 || i > 8) return;
    if (match.board[i] !== " ") return;
    match.board[i] = match.turn;
    var r = checkTTT(match.board);
    if (r === "X" || r === "O" || r === "tie") {
      match.over = true;
      var winner = r === "X" ? match.a : (r === "O" ? match.b : null);
      var over = { t: "ttt_over", board: match.board, result: r, winner: winner };
      mpDeliver(match.a, over);
      mpDeliver(match.b, over);
      mpHostEndMatch(match);
      return;
    }
    match.turn = match.turn === "X" ? "O" : "X";
    var st2 = { t: "ttt_state", board: match.board, turn: match.turn };
    mpDeliver(match.a, st2);
    mpDeliver(match.b, st2);
    return;
  }

  if (m.t === "rps") {
    var mv = m.m;
    if (mv !== "r" && mv !== "p" && mv !== "s") return;
    match.picks[id] = mv;
    if (!match.picks[match.a] || !match.picks[match.b]) return;
    var am = match.picks[match.a], bm = match.picks[match.b];
    match.picks = {};
    var w = mpRpsWinner(am, bm);
    if (w === 1) match.sa++;
    else if (w === 2) match.sb++;
    var round = { t: "rps_round", am: am, bm: bm, sa: match.sa, sb: match.sb, w: w };
    mpDeliver(match.a, round);
    mpDeliver(match.b, round);
    if (match.sa >= 3 || match.sb >= 3) {
      match.over = true;
      var winId = match.sa >= 3 ? match.a : match.b;
      var ov = { t: "rps_over", winner: winId };
      mpDeliver(match.a, ov);
      mpDeliver(match.b, ov);
      mpHostEndMatch(match);
    }
    return;
  }

  if (m.t === "gn") {
    if (match.rem[id] <= 0) return;
    var n = m.n;
    if (typeof n !== "number" || n < 1 || n > 100) return;
    match.rem[id]--;
    var other = match.a === id ? match.b : match.a;
    var res = n < match.secret ? "low" : (n > match.secret ? "high" : "win");
    if (res === "win") {
      match.over = true;
      var ov2 = { t: "gn_over", winner: id, secret: match.secret };
      mpDeliver(match.a, ov2);
      mpDeliver(match.b, ov2);
      mpHostEndMatch(match);
      return;
    }
    mpDeliver(id, { t: "gn_fb", n: n, res: res, left: match.rem[id] });
    mpDeliver(other, { t: "gn_opp", left: match.rem[id] });
    if (match.rem[match.a] <= 0 && match.rem[match.b] <= 0) {
      match.over = true;
      var ov3 = { t: "gn_over", winner: null, secret: match.secret };
      mpDeliver(match.a, ov3);
      mpDeliver(match.b, ov3);
      mpHostEndMatch(match);
    }
    return;
  }
}

function mpRpsWinner(a, b) {
  if (a === b) return 0;
  if ((a === "r" && b === "s") || (a === "p" && b === "r") || (a === "s" && b === "p")) return 1;
  return 2;
}

/* ============================================================
   CLIENT message handling
   ============================================================ */
function mpClientOnData(m) {
  if (!m || !m.t) return;

  if (m.t === "lobby") {
    MP.players = m.players || [];
    MP.roomCode = m.code || MP.roomCode;
    if (currentView === renderRoom) renderRoom();
    else if (currentView === renderMenu) renderMenu();
    return;
  }
  if (m.t === "joined") { toast(t("mpJoined", { n: m.n })); return; }
  if (m.t === "kick") {
    toast(t("mpKicked"));
    mpTeardown();
    showView(renderMenu);
    return;
  }
  if (m.t === "bye") {
    toast(t("mpHostLeft"));
    mpTeardown();
    showView(renderMenu);
    return;
  }
  if (m.t === "waiting") {
    MP.queueGame = m.game;
    showView(renderWaiting);
    return;
  }
  if (m.t === "paired") {
    MP.queueGame = null;
    MP.match = {
      game: m.game, role: m.role, opp: m.opp, oppId: m.oppId,
      board: null, turn: null, over: false, myLeft: 5, oppLeft: 5,
      pending: false, sa: 0, sb: 0
    };
    if (m.game === "ttt") showView(viewMPTTT);
    else if (m.game === "rps") showView(viewMPRPS);
    else showView(viewMPGuess);
    mpWireForfeit();
    return;
  }
  if (m.t === "opp_left") {
    toast(t("mpOppLeft"));
    MP.match = null;
    MP.onGame = null;
    showView(renderRoom);
    return;
  }
  if (m.t === "screen") {
    if (m.from === MP.selfId) return;
    if (m.off) {
      MP.screens[m.from] = null;
      if (MP.watch === m.from) mpWatchPaint(null);
    } else {
      MP.screens[m.from] = { title: m.title, html: m.html };
      if (MP.watch === m.from) mpWatchPaint(MP.screens[m.from]);
    }
    return;
  }
  mpGameUpdate(m);
}

function mpGameUpdate(m) {
  if (MP.onGame) MP.onGame(m);
}

/* ============================================================
   VIEWS: waiting + lobby
   ============================================================ */
function mpCancelQueue() {
  if (MP.queueGame) {
    mpSendMsg({ t: "unqueue", game: MP.queueGame });
    MP.queueGame = null;
  }
  showView(renderRoom);
}

function renderWaiting() {
  var body = mountPanel("mpMatchmaking");
  body.innerHTML =
    '<p class="hint">' + esc(t("mpWaiting")) + "</p>" +
    '<div class="mp-row"><button class="btn ghost" id="mp-cancel" type="button">' +
      esc(t("mpLeave")) + "</button></div>";
  document.getElementById("mp-cancel").onclick = mpCancelQueue;
  var back = document.getElementById("back-btn");
  if (back) back.onclick = mpCancelQueue;
}

function renderRoom() {
  var body = mountPanel("mpRoomLobby");
  var h = '<div class="room-bar">' +
    '<div class="hint">' + esc(t("mpRoomCode")) + "</div>" +
    '<div class="room-code" id="mp-code-el">' + esc(MP.roomCode || "...") + "</div>" +
    '<div class="room-hint">' + esc(t("mpCopyCode")) + "</div>" +
    '<div class="room-hint">' + esc(t("mpPlayers")) + ": " +
      (MP.players.length ? String(MP.players.length) : esc(t("mpConnecting"))) +
    "</div></div>";

  h += '<div class="lobby">';
  if (!MP.players.length) {
    h += '<div class="lobby-row"><span class="lr-status">' + esc(t("mpConnecting")) + "</span></div>";
  }
  for (var i = 0; i < MP.players.length; i++) {
    var p = MP.players[i];
    var isSelf = p.id === MP.selfId;
    h += '<div class="lobby-row" data-p="' + esc(p.id) + '">' +
      '<span class="lr-name' + (isSelf ? " lr-you" : "") + '">' + esc(p.name) +
        (isSelf ? (MP.isHost ? " (host)" : " (you)") : "") + "</span>" +
      '<span class="lr-status">' +
        (p.status === "playing" ? esc(t("mpInGame")) : esc(t("mpLobby"))) +
        (p.status === "playing" && MP.screens[p.id] && MP.screens[p.id].title
          ? " - " + esc(MP.screens[p.id].title) : "") +
      "</span>";
    if (p.status === "playing" && !isSelf) {
      h += '<button class="btn ghost" type="button" data-watch="' + esc(p.id) + '">' +
        esc(t("mpWatch")) + "</button>";
    }
    if (MP.isHost && !isSelf) {
      h += '<button class="btn" type="button" data-kick="' + esc(p.id) + '">' +
        esc(t("mpKick")) + "</button>";
    }
    h += "</div>";
  }
  h += "</div>";

  h += '<div class="mp-row"><button class="btn ghost" id="mp-leave-btn" type="button">' +
    esc(t("mpLeave")) + "</button></div>";
  h += '<div class="hint">' + esc(t("mpHint")) + "</div>";
  body.innerHTML = h;

  var codeEl = document.getElementById("mp-code-el");
  if (codeEl) codeEl.onclick = mpCopyCode;
  var leaveB = document.getElementById("mp-leave-btn");
  if (leaveB) leaveB.onclick = mpLeave;

  var watchBtns = body.querySelectorAll ? body.querySelectorAll("[data-watch]") : [];
  for (var w = 0; w < watchBtns.length; w++) {
    (function (b) {
      b.onclick = function () { mpWatch(b.getAttribute("data-watch")); };
    })(watchBtns[w]);
  }
  var kickBtns = body.querySelectorAll ? body.querySelectorAll("[data-kick]") : [];
  for (var k = 0; k < kickBtns.length; k++) {
    (function (b) {
      b.onclick = function () { mpHostRemove(b.getAttribute("data-kick"), true); };
    })(kickBtns[k]);
  }
}

function mpCopyCode() {
  var code = MP.roomCode;
  if (!code) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code);
      toast(t("mpCopied"));
      return;
    }
  } catch (e) {}
  try {
    var ta = document.createElement("textarea");
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast(t("mpCopied"));
  } catch (e2) {
    toast(code);
  }
}

function mpHostRemove(id, kicked) {
  if (id === MP.selfId) return;
  if (kicked) mpDeliver(id, { t: "kick" });
  delete MP.conns[id];
  var wasPlayer = false;
  var left = [];
  for (var i = 0; i < MP.players.length; i++) {
    if (MP.players[i].id === id) wasPlayer = true;
    else left.push(MP.players[i]);
  }
  if (!wasPlayer) return;
  MP.players = left;
  mpHostDropQueue(id);
  var match = MP.matches[id];
  if (match) {
    mpHostEndMatch(match);
    var other = match.a === id ? match.b : match.a;
    mpDeliver(other, { t: "opp_left" });
  }
  mpBroadcast({ t: "screen", off: true, from: id }, id);
  delete MP.screens[id];
  mpHostLobby();
}

/* ============================================================
   WATCH (screen mirror)
   ============================================================ */
function mpWatch(id) {
  MP.watch = id;
  var box = document.getElementById("watch-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "watch-box";
    box.className = "watch-box";
    box.innerHTML =
      '<div class="watch-head"><span id="watch-title"></span>' +
      '<button class="btn small" id="watch-stop" type="button">' +
      esc(t("mpStopWatch")) + "</button></div>" +
      '<div class="watch-body" id="watch-body"></div>';
    document.body.appendChild(box);
    document.getElementById("watch-stop").onclick = mpStopWatch;
  }
  box.className = "watch-box on";
  mpWatchPaint(MP.screens[id]);
}

function mpWatchPaint(scr) {
  var tt = document.getElementById("watch-title");
  var bd = document.getElementById("watch-body");
  if (!tt || !bd) return;
  if (!scr) {
    tt.textContent = t("mpWatching") + " " + mpName(MP.watch) + " " + t("mpBackLobby");
    return;
  }
  tt.textContent = t("mpWatching") + " " + mpName(MP.watch) +
    (scr.title ? " - " + scr.title : "");
  bd.innerHTML = scr.html;
}

function mpStopWatch() {
  MP.watch = null;
  var box = document.getElementById("watch-box");
  if (box) box.className = "watch-box";
}

/* ============================================================
   ROOM LINE + MENU ENTRIES (shown in the main menu)
   ============================================================ */
function mpRoomLine() {
  if (!MP.inRoom()) return "";
  return '<div class="room-bar"><b>' + esc(t("mpRoomCode")) + ": " + esc(MP.roomCode) +
    "</b> &nbsp;-&nbsp; " + esc(t("mpPlayers")) + ": " + MP.players.length + "</div>";
}

function mpMenuExtras() {
  var lab = function (key, tag) {
    return '<div class="term-item" data-mp="' + tag + '" role="button" tabindex="0">' +
      '<span class="term-num">' + tag.toUpperCase() + ")</span>" +
      '<span class="term-label">' + esc(t(key)) + "</span>" +
      '<span class="lead" aria-hidden="true"></span></div>';
  };
  if (MP.inRoom()) return lab("mpRoomLobby", "r");
  return lab("mpCreate", "c") + lab("mpJoin", "j");
}

/* ============================================================
   QUEUE (from the menu)
   ============================================================ */
function mpQueue(game) {
  if (!MP.inRoom()) { toast(t("mpNotInRoom")); return; }
  if (MP.match || MP.queueGame) return;
  MP.queueGame = game;
  mpSendMsg({ t: "queue", game: game });
  renderWaiting();
}

/* ============================================================
   GAME: Tic-Tac-Toe (multiplayer)
   ============================================================ */
function viewMPTTT() {
  var body = mountPanel("tttName");
  MP.onGame = function (m) {
    if (m.t === "ttt_state" && MP.match) {
      MP.match.board = m.board;
      MP.match.turn = m.turn;
      MP.match.over = false;
      paint();
    } else if (m.t === "ttt_over" && MP.match) {
      MP.match.board = m.board;
      MP.match.over = true;
      paint();
      var kind = m.winner === null ? "draw" : (m.winner === MP.selfId ? "win" : "lose");
      mpFinish(body, kind, 30);
    }
  };

  function myTurn() {
    var m = MP.match;
    return m && !m.over && m.board &&
      (m.role === "X" ? m.turn === "X" : m.turn === "O");
  }

  function paint() {
    var m = MP.match;
    if (!m || !m.board) return;
    var g = document.getElementById("mp-ttt");
    if (!g) { body.innerHTML = base(); g = document.getElementById("mp-ttt"); }
    var html = "", i;
    for (i = 0; i < 9; i++) {
      var v = m.board[i];
      var cls = v === "X" ? " x" : v === "O" ? " o" : "";
      html += '<button class="ttt-cell' + cls + '" type="button" data-i="' + i + '">' +
        (v === " " ? String(i + 1) : v) + "</button>";
    }
    g.innerHTML = html;
    var cells = g.getElementsByClassName("ttt-cell");
    for (i = 0; i < cells.length; i++) {
      (function (idx) {
        idx.onclick = function () {
          var mm = MP.match;
          if (!mm || mm.over || !myTurn()) return;
          if (mm.board[idx.getAttribute("data-i") | 0] !== " ") return;
          mpSendMsg({ t: "ttt", i: idx.getAttribute("data-i") | 0 });
        };
      })(cells[i]);
    }
    var msg = document.getElementById("mp-ttt-msg");
    if (msg) {
      if (m.over) msg.textContent = "";
      else if (myTurn()) msg.textContent = t("mpYourTurn");
      else msg.textContent = t("mpWaitTurn");
    }
  }

  function base() {
    var m = MP.match;
    return '<p class="hint">You are ' + esc(m ? m.role : "?") + " - vs " +
      esc(m ? m.opp : "?") + "</p>" +
      '<div class="ttt-grid" id="mp-ttt"></div>' +
      '<p class="hint" id="mp-ttt-msg"></p>' +
      '<div class="feed" id="g-feed"></div>';
  }

  if (MP.match && MP.match.board) { paint(); }
  else { body.innerHTML = base(); }
}

/* ============================================================
   GAME: Rock Paper Scissors (multiplayer, first to 3)
   ============================================================ */
function viewMPRPS() {
  var body = mountPanel("rpsName");
  var moves = { r: t("rpsRock"), p: t("rpsPaper"), s: t("rpsScissors") };

  body.innerHTML =
    '<p class="hint">' + esc(t("rpsRule")) + " - vs " + esc(MP.match ? MP.match.opp : "?") + "</p>" +
    '<div class="mp-score" id="mp-rps-score">0 : 0</div>' +
    '<div class="rps-row">' +
      '<button class="rps-btn" type="button" data-m="r">ROCK</button>' +
      '<button class="rps-btn" type="button" data-m="p">PAPER</button>' +
      '<button class="rps-btn" type="button" data-m="s">SCISSORS</button>' +
    "</div>" +
    '<div class="feed" id="g-feed"></div>';

  var btns = body.getElementsByClassName("rps-btn");
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.onclick = function () {
        var m = MP.match;
        if (!m || m.over || m.pending) return;
        m.pending = true;
        var k;
        for (k = 0; k < btns.length; k++) btns[k].disabled = true;
        mpSendMsg({ t: "rps", m: b.getAttribute("data-m") });
      };
    })(btns[i]);
  }

  MP.onGame = function (m) {
    if (m.t === "rps_round" && MP.match) {
      MP.match.sa = m.sa;
      MP.match.sb = m.sb;
      MP.match.pending = false;
      var sc = document.getElementById("mp-rps-score");
      if (sc) sc.textContent = m.sa + " : " + m.sb;
      var line;
      if (m.w === 0) line = t("rpsTie");
      else if ((m.w === 1) === (MP.match.role === "A")) line = t("rpsRoundYou");
      else line = t("rpsRoundCpu");
      feedLine(body, t("rpsYouPlayed", { a: moves[m.am], b: moves[m.bm] }), "");
      feedLine(body, line, m.w === 0 ? "" : ((m.w === 1) === (MP.match.role === "A") ? "good" : "bad"));
      var k;
      for (k = 0; k < btns.length; k++) btns[k].disabled = false;
    } else if (m.t === "rps_over" && MP.match) {
      MP.match.over = true;
      var kind = m.winner === MP.selfId ? "win" : "lose";
      mpFinish(body, kind, 40);
    }
  };
}

/* ============================================================
   GAME: Guess the Number (multiplayer race, 5 tries)
   ============================================================ */
function viewMPGuess() {
  var body = mountPanel("guessName");
  body.innerHTML =
    '<p class="hint">' + esc(t("mpGuessRule")) + " - vs " +
      esc(MP.match ? MP.match.opp : "?") + "</p>" +
    '<div class="mp-row">' +
      '<input class="num-input" id="mp-gn-in" type="number" min="1" max="100" placeholder="' +
        esc(t("guessInPh")) + '">' +
      '<button class="btn" id="mp-gn-go" type="button">' + esc(t("guessBtn")) + "</button>" +
    "</div>" +
    '<p class="hint" id="mp-gn-left"></p>' +
    '<div class="feed" id="g-feed"></div>';

  var inp = document.getElementById("mp-gn-in");
  var go = document.getElementById("mp-gn-go");
  function send() {
    var m = MP.match;
    if (!m || m.over) return;
    var v = parseInt(inp.value, 10);
    if (isNaN(v) || v < 1 || v > 100) { feedLine(body, t("guessRange", { a: 1, b: 100 }), "bad"); return; }
    go.disabled = true;
    mpSendMsg({ t: "gn", n: v });
    inp.value = "";
  }
  go.onclick = send;
  inp.onkeydown = function (e) {
    e = e || window.event;
    if (e.keyCode === 13) send();
  };
  function updLeft() {
    var el = document.getElementById("mp-gn-left");
    if (el && MP.match) el.textContent = t("attemptLbl") + ": " + MP.match.myLeft + "/5";
  }
  updLeft();

  MP.onGame = function (m) {
    if (m.t === "gn_start" && MP.match) {
      MP.match.myLeft = m.left;
      MP.match.oppLeft = m.left;
      updLeft();
    } else if (m.t === "gn_fb" && MP.match) {
      MP.match.myLeft = m.left;
      updLeft();
      if (m.res === "low") feedLine(body, t("guessLow"), "bad");
      else feedLine(body, t("guessHigh"), "bad");
      go.disabled = false;
      inp.focus();
    } else if (m.t === "gn_opp" && MP.match) {
      MP.match.oppLeft = m.left;
      feedLine(body, t("mpOppGuess", { n: m.left }), "");
    } else if (m.t === "gn_over" && MP.match) {
      MP.match.over = true;
      go.disabled = true;
      feedLine(body, t("guessWin", { n: m.secret }), m.winner === MP.selfId ? "good" : "");
      var kind = m.winner === null ? "draw" : (m.winner === MP.selfId ? "win" : "lose");
      mpFinish(body, kind, 50);
    }
  };
}

/* ============================================================
   shared: finish screen + back to lobby
   ============================================================ */
function mpFinish(body, kind, prize) {
  MP.onGame = null;
  if (kind === "win") {
    var p = award(prize);
    feedLine(body, t("mpYouWin"), "good");
    feedLine(body, t("prizeWon", { n: p }), "gold");
    prizeToast(p);
    updateHUD();
  } else if (kind === "lose") {
    feedLine(body, t("mpOppWins"), "bad");
  } else {
    feedLine(body, t("mpDraw"), "");
  }
  var r = document.createElement("div");
  r.className = "row";
  var b = document.createElement("button");
  b.className = "btn";
  b.type = "button";
  b.textContent = t("mpRoomLobby");
  b.onclick = function () {
    MP.match = null;
    showView(renderRoom);
  };
  r.appendChild(b);
  body.appendChild(r);
  var back = document.getElementById("back-btn");
  if (back) back.onclick = function () {
    mpSendMsg({ t: "forfeit" });
    MP.match = null;
    showView(renderRoom);
  };
}

/* back button inside a live match = forfeit */
function mpWireForfeit() {
  var back = document.getElementById("back-btn");
  if (!back) return;
  var orig = back.onclick;
  back.onclick = function () {
    if (MP.match && !MP.match.over) mpSendMsg({ t: "forfeit" });
    MP.match = null;
    MP.onGame = null;
    MP.queueGame = null;
    if (orig) orig();
    else showView(renderRoom);
  };
}

/* re-render the initial menu now that mp.js is loaded */
try {
  if (typeof app !== "undefined" && app &&
      typeof currentView !== "undefined" && currentView === renderMenu) {
    renderMenu();
  }
} catch (e) {}
