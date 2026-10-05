/* ============================================================
   kocik's arcade — games + points economy (ES5, no dependencies)
   ============================================================ */
"use strict";

/* ---------- utils ---------- */
function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- i18n ---------- */
var lang = "en";
function t(key, vars) {
  var s = I18N[lang][key];
  if (s === undefined) s = key;
  if (vars) {
    for (var k in vars) {
      if (vars.hasOwnProperty(k)) {
        s = s.split("{" + k + "}").join(String(vars[k]));
      }
    }
  }
  return s;
}

/* ---------- save / points ---------- */
var SAVE_KEY = "kociks_arcade_save";
var save = null;

function loadSave() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    var s = JSON.parse(raw);
    if (s && typeof s.points === "number") {
      if (!s.items) s.items = [];
      if (s.lastBonus === undefined) s.lastBonus = "";
      if (s.points < 0) s.points = 0;
      return s;
    }
  } catch (e) {}
  return { points: 100, items: [], lastBonus: "" };
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}
function points() { return save.points; }
function owns(id) { return save.items.indexOf(id) !== -1; }
function spend(n) {
  if (n > save.points) return false;
  save.points -= n;
  persist();
  return true;
}
function credit(n) {
  save.points += n;
  persist();
}
function award(n) {
  if (n > 0 && owns("clover")) n = Math.round(n * 1.1);
  credit(n);
  return n;
}
function todayStr() {
  var d = new Date();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}
function maybeDailyBonus() {
  if (save.lastBonus === todayStr()) return false;
  save.lastBonus = todayStr();
  credit(50);
  return true;
}

/* ---------- shared UI ---------- */
var app = null;
var currentView = null;

function toast(msg, cls) {
  var box = document.getElementById("toast-box");
  var d = document.createElement("div");
  d.className = "toast" + (cls ? " " + cls : "");
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(function () {
    if (d.parentNode) d.parentNode.removeChild(d);
  }, 3200);
}
function updateHUD() {
  document.getElementById("points-num").textContent = save.points;
  if (document.body.classList) {
    document.body.classList.toggle("golden", owns("banner"));
  }
  document.getElementById("btn-en").className = "lang-btn" + (lang === "en" ? " active" : "");
  document.getElementById("btn-pl").className = "lang-btn" + (lang === "pl" ? " active" : "");
  document.documentElement.lang = lang;
}
function showView(fn) {
  currentView = fn;
  fn();
  if (typeof MP !== "undefined" && MP.inRoom && MP.inRoom() && typeof mpSendMsg === "function") {
    try {
      var lobbyView = fn === renderMenu ||
        (typeof renderRoom !== "undefined" && fn === renderRoom) ||
        (typeof renderWaiting !== "undefined" && fn === renderWaiting);
      mpSendMsg({ t: "status", s: lobbyView ? "lobby" : "playing" });
    } catch (e) {}
  }
}
function mountPanel(nameKey) {
  app.innerHTML =
    '<div class="game-panel">' +
      '<button class="back-btn" id="back-btn" type="button">&larr; ' + esc(t("backMenu")) + "</button>" +
      '<h2 class="game-title">' + esc(t(nameKey)) + "</h2>" +
      '<div class="game-body" id="game-body"></div>' +
    "</div>";
  document.getElementById("back-btn").onclick = function () { showView(renderMenu); };
  return document.getElementById("game-body");
}
function restoreFeed(log) {
  if (!log || !log.length) return;
  var f = document.getElementById("g-feed");
  if (!f) return;
  for (var i = 0; i < log.length; i++) {
    var d = document.createElement("div");
    d.className = "feed-line" + (log[i][1] ? " " + log[i][1] : "");
    d.textContent = log[i][0];
    f.appendChild(d);
  }
}
function setBody(bodyEl, html, log) {
  bodyEl.innerHTML = html;
  restoreFeed(log);
}
function feedGlobal(bodyEl, text, cls, log) {
  var f = document.getElementById("g-feed");
  if (!f) {
    f = document.createElement("div");
    f.className = "feed";
    f.id = "g-feed";
    bodyEl.insertBefore(f, bodyEl.firstChild);
  }
  var d = document.createElement("div");
  d.className = "feed-line" + (cls ? " " + cls : "");
  d.textContent = text;
  f.appendChild(d);
  if (log) log.push([text, cls || ""]);
}
function feedLine(bodyEl, text, cls) {
  feedGlobal(bodyEl, text, cls, null);
}
function againBtn(body, fn) {
  var r = document.createElement("div");
  r.className = "row";
  var b = document.createElement("button");
  b.className = "btn";
  b.type = "button";
  b.textContent = t("playAgain");
  b.onclick = fn;
  r.appendChild(b);
  body.appendChild(r);
}
function prizeToast(p) {
  toast(t("prizeWon", { n: p }));
}

/* ============================================================
   GAME 1: Guess the Number
   ============================================================ */
function viewGuess() {
  var body = mountPanel("guessName");
  var extra = owns("extra_guess") ? 2 : 0;
  var st = { secret: 0, left: 0, max: 0, low: 1, high: 50, prize: 0, over: false };

  function renderDiff() {
    body.innerHTML =
      '<div class="diff-row">' +
        '<button class="diff-btn" type="button" data-l="1"><div class="d-name">' + esc(t("levelEasy")) +
          '</div><div class="d-sub">' + esc(t("guessEasy", { n: 8 + extra })) + "</div></button>" +
        '<button class="diff-btn" type="button" data-l="2"><div class="d-name">' + esc(t("levelMedium")) +
          '</div><div class="d-sub">' + esc(t("guessMed", { n: 7 + extra })) + "</div></button>" +
        '<button class="diff-btn" type="button" data-l="3"><div class="d-name">' + esc(t("levelHard")) +
          '</div><div class="d-sub">' + esc(t("guessHard", { n: 6 + extra })) + "</div></button>" +
      "</div>";
    var btns = body.getElementsByClassName("diff-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (idx) {
        btns[idx].onclick = function () { start(parseInt(btns[idx].getAttribute("data-l"), 10)); };
      })(i);
    }
  }

  function start(level) {
    st.high = level === 1 ? 50 : level === 2 ? 100 : 200;
    st.max = (level === 1 ? 8 : level === 2 ? 7 : 6) + extra;
    st.prize = level === 1 ? 20 : level === 2 ? 50 : 100;
    st.secret = ri(1, st.high);
    st.left = st.max;
    st.over = false;
    body.innerHTML =
      '<p class="hint">' + esc(t("thinkingLbl") + " " + st.low + " " + t("thinkingLbl2") + " " + st.high) + "</p>" +
      '<div class="row">' +
        '<input class="num-input" id="g-in" type="number" min="1" max="' + st.high + '" placeholder="' + esc(t("guessInPh")) + '">' +
        '<button class="btn" id="g-go" type="button">' + esc(t("guessBtn")) + "</button>" +
      "</div>" +
      '<p class="hint" id="g-atm"></p>' +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("g-go").onclick = doGuess;
    document.getElementById("g-in").onkeydown = function (e) {
      e = e || window.event;
      if (e.keyCode === 13) doGuess();
    };
    updateAttempts();
    document.getElementById("g-in").focus();
  }

  function updateAttempts() {
    document.getElementById("g-atm").textContent = t("attemptLbl") + ": " + st.left + "/" + st.max;
  }

  function doGuess() {
    if (st.over) return;
    var inp = document.getElementById("g-in");
    var v = parseInt(inp.value, 10);
    if (isNaN(v) || v < st.low || v > st.high) {
      feedLine(body, t("guessRange", { a: st.low, b: st.high }), "bad");
      return;
    }
    st.left--;
    if (v === st.secret) {
      st.over = true;
      feedLine(body, t("guessWin", { n: st.secret }), "good");
      var p = award(st.prize);
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
      againBtn(body, function () { viewGuess(); });
      return;
    }
    var warm = Math.abs(v - st.secret) <= Math.max(5, Math.floor((st.high - st.low) / 10));
    var msg;
    if (v < st.secret) msg = warm ? t("guessLowWarm") : t("guessLow");
    else msg = warm ? t("guessHighWarm") : t("guessHigh");
    feedLine(body, msg, "bad");
    if (st.left <= 0) {
      st.over = true;
      feedLine(body, t("guessOut", { n: st.secret }), "bad");
      againBtn(body, function () { viewGuess(); });
      return;
    }
    updateAttempts();
    inp.value = "";
    inp.focus();
  }

  renderDiff();
}

/* ============================================================
   GAME 2: Tic-Tac-Toe
   ============================================================ */
var TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];
function checkTTT(board) {
  for (var i = 0; i < TTT_LINES.length; i++) {
    var a = TTT_LINES[i][0], b = TTT_LINES[i][1], c = TTT_LINES[i][2];
    if (board[a] !== " " && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  for (var j = 0; j < 9; j++) if (board[j] === " ") return null;
  return "tie";
}
function findTTTWin(board, mark) {
  for (var i = 0; i < TTT_LINES.length; i++) {
    var a = TTT_LINES[i][0], b = TTT_LINES[i][1], c = TTT_LINES[i][2];
    var trio = [board[a], board[b], board[c]];
    var cnt = 0, emptyIdx = -1, ok = true;
    for (var k = 0; k < 3; k++) {
      if (trio[k] === mark) cnt++;
      else if (trio[k] === " ") emptyIdx = k;
      else ok = false;
    }
    if (ok && cnt === 2 && emptyIdx !== -1) return [a, b, c][emptyIdx];
  }
  return -1;
}
function minimaxTTT(board, maximizing, memo) {
  var key = board.join("") + "|" + (maximizing ? "1" : "0");
  if (memo[key] !== undefined) return memo[key];
  var r = checkTTT(board);
  var empties = 0, i, s;
  for (i = 0; i < 9; i++) if (board[i] === " ") empties++;
  var val;
  if (r === "O") val = 10 + empties;
  else if (r === "X") val = -10 - empties;
  else if (r === "tie") val = 0;
  else if (maximizing) {
    val = -999;
    for (i = 0; i < 9; i++) {
      if (board[i] === " ") {
        board[i] = "O";
        s = minimaxTTT(board, false, memo);
        board[i] = " ";
        if (s > val) val = s;
      }
    }
  } else {
    val = 999;
    for (i = 0; i < 9; i++) {
      if (board[i] === " ") {
        board[i] = "X";
        s = minimaxTTT(board, true, memo);
        board[i] = " ";
        if (s < val) val = s;
      }
    }
  }
  memo[key] = val;
  return val;
}
function tttMove(board, diff) {
  var free = [], i;
  for (i = 0; i < 9; i++) if (board[i] === " ") free.push(i);
  if (!free.length) return -1;
  var win = findTTTWin(board, "O");
  var block = findTTTWin(board, "X");

  if (diff === "hard") {
    var memo = {}, best = -999, bestMoves = [];
    for (i = 0; i < 9; i++) {
      if (board[i] === " ") {
        board[i] = "O";
        var s = minimaxTTT(board, false, memo);
        board[i] = " ";
        if (s > best) { best = s; bestMoves = [i]; }
        else if (s === best) bestMoves.push(i);
      }
    }
    if (bestMoves.length) return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    return free[0];
  }
  if (diff === "medium") {
    if (win !== -1) return win;
    if (block !== -1) return block;
    if (board[4] === " ") return 4;
    var corners = [], cs = [0, 2, 6, 8];
    for (i = 0; i < 4; i++) if (board[cs[i]] === " ") corners.push(cs[i]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    return pick(free);
  }
  /* easy */
  if (win !== -1 && Math.random() < 0.4) return win;
  return pick(free);
}

function viewTTT() {
  var body = mountPanel("tttName");
  var st = { board: null, level: 0, over: true, busy: false };

  function renderDiff() {
    body.innerHTML =
      '<p class="hint">' + esc(t("tttIntro")) + "</p>" +
      '<div class="diff-row">' +
        diffBtn(1, "levelEasy", "tttEasySub", 15) +
        diffBtn(2, "levelMedium", "tttMedSub", 50) +
        diffBtn(3, "levelHard", "tttHardSub", 250) +
      "</div>";
    var btns = body.getElementsByClassName("diff-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (idx) {
        btns[idx].onclick = function () { start(parseInt(btns[idx].getAttribute("data-l"), 10)); };
      })(i);
    }
  }
  function diffBtn(l, nameKey, subKey, prize) {
    return '<button class="diff-btn" type="button" data-l="' + l + '">' +
      '<div class="d-name">' + esc(t(nameKey)) + "</div>" +
      '<div class="d-sub">' + esc(t(subKey)) + "<br>" + esc(t("prizeWord") + " " + prize) + "</div></button>";
  }
  function start(level) {
    st.level = level;
    st.board = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
    st.over = false;
    st.busy = false;
    body.innerHTML =
      '<div class="ttt-grid" id="ttt-grid"></div>' +
      '<p class="hint" id="ttt-msg"></p>' +
      '<div class="feed" id="g-feed"></div>';
    renderBoard();
  }
  function renderBoard() {
    var g = document.getElementById("ttt-grid");
    var h = "", i;
    for (i = 0; i < 9; i++) {
      var v = st.board[i];
      var cls = v === "X" ? " x" : v === "O" ? " o" : "";
      var txt = v === " " ? String(i + 1) : v;
      h += '<button class="ttt-cell' + cls + '" type="button" data-i="' + i + '">' + txt + "</button>";
    }
    g.innerHTML = h;
    var cells = g.getElementsByClassName("ttt-cell");
    for (i = 0; i < 9; i++) {
      (function (idx) { cells[idx].onclick = function () { onCell(idx); }; })(i);
    }
  }
  function onCell(i) {
    if (st.over || st.busy) return;
    if (st.board[i] !== " ") {
      feedLine(body, t("tttTaken"), "bad");
      return;
    }
    st.board[i] = "X";
    renderBoard();
    var r = checkTTT(st.board);
    if (r) { finish(r); return; }
    st.busy = true;
    document.getElementById("ttt-msg").textContent = t("tttThinking");
    setTimeout(function () {
      var mv = tttMove(st.board, st.level === 1 ? "easy" : st.level === 2 ? "medium" : "hard");
      if (mv !== -1) st.board[mv] = "O";
      st.busy = false;
      document.getElementById("ttt-msg").textContent = "";
      renderBoard();
      var r2 = checkTTT(st.board);
      if (r2) finish(r2);
    }, 400);
  }
  function finish(r) {
    st.over = true;
    var msg, prize = 0;
    if (r === "X") { prize = [15, 50, 250][st.level - 1]; msg = t("youWin"); }
    else if (r === "O") { msg = t("computerWins"); }
    else { prize = [5, 10, 30][st.level - 1]; msg = t("drawGame"); }
    feedLine(body, msg, r === "O" ? "bad" : "good");
    if (prize) {
      var p = award(prize);
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
    }
    againBtn(body, function () { viewTTT(); });
  }

  renderDiff();
}

/* ============================================================
   GAME 3: Rock Paper Scissors
   ============================================================ */
function viewRPS() {
  var body = mountPanel("rpsName");
  var st = { bet: 0, you: 0, cpu: 0, over: false };

  function renderBet() {
    var max = points();
    var h = '<p class="hint">' + esc(t("rpsRule")) + "</p>";
    if (max > 0) {
      h += '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="rps-bet" type="number" min="0" max="' + max + '" value="10"></div>';
    } else {
      h += '<p class="hint">' + esc(t("freeNote")) + "</p>";
    }
    h += '<div class="row"><button class="btn" id="rps-go" type="button">' + esc(t("startBtn")) + "</button></div>";
    body.innerHTML = h;
    document.getElementById("rps-go").onclick = function () {
      var b = 0;
      if (max > 0) {
        b = parseInt(document.getElementById("rps-bet").value, 10);
        if (isNaN(b) || b < 0) b = 0;
        if (b > max) b = max;
        if (b > 0) spend(b);
      }
      st.bet = b;
      st.you = 0;
      st.cpu = 0;
      st.over = false;
      renderGame();
    };
  }

  function renderGame() {
    body.innerHTML =
      '<div class="rps-score" id="rps-score"></div>' +
      '<div class="rps-row">' +
        '<button class="rps-btn" type="button" data-m="r" title="' + esc(t("rpsRock")) + '"' + esc(t("rpsRock")) + '</button>' +
        '<button class="rps-btn" type="button" data-m="p" title="' + esc(t("rpsPaper")) + '"' + esc(t("rpsPaper")) + '</button>' +
        '<button class="rps-btn" type="button" data-m="s" title="' + esc(t("rpsScissors")) + '">' + esc(t("rpsScissors")) + '</button>' +
      "</div>" +
      '<p class="hint center">' + esc(t("rpsRock") + " · " + t("rpsPaper") + " · " + t("rpsScissors")) + "</p>" +
      (st.bet ? '<p class="prize-line">' + esc(t("stakeSet", { n: st.bet })) + "</p>" : "") +
      '<div class="feed" id="g-feed"></div>';
    updateScore();
    var btns = body.getElementsByClassName("rps-btn");
    for (var i = 0; i < 3; i++) {
      (function (idx) {
        btns[idx].onclick = function () { round(btns[idx].getAttribute("data-m")); };
      })(i);
    }
  }

  function updateScore() {
    document.getElementById("rps-score").textContent = t("rpsScore", { a: st.you, b: st.cpu });
  }

  function round(m) {
    if (st.over) return;
    var moves = { r: t("rpsRock"), p: t("rpsPaper"), s: t("rpsScissors") };
    var cm = pick(["r", "p", "s"]);
    feedLine(body, t("rpsYouPlayed", { a: moves[m], b: moves[cm] }), "");
    if (m === cm) {
      feedLine(body, t("rpsTie"), "");
    } else if ((m === "r" && cm === "s") || (m === "p" && cm === "r") || (m === "s" && cm === "p")) {
      st.you++;
      feedLine(body, t("rpsRoundYou"), "good");
    } else {
      st.cpu++;
      feedLine(body, t("rpsRoundCpu"), "bad");
    }
    updateScore();
    if (st.you === 3 || st.cpu === 3) finish();
  }

  function finish() {
    st.over = true;
    if (st.you === 3) {
      feedLine(body, t("rpsMatchYou", { a: st.you, b: st.cpu }), "good");
      if (st.bet) {
        credit(st.bet * 2);
        feedLine(body, t("stakeDouble", { n: st.bet, p: st.bet }), "gold");
        prizeToast(st.bet);
        updateHUD();
      }
    } else {
      feedLine(body, t("rpsMatchCpu", { a: st.you, b: st.cpu }), "bad");
      if (st.bet) feedLine(body, t("stakeLost", { n: st.bet }), "bad");
    }
    againBtn(body, function () { viewRPS(); });
  }

  renderBet();
}

/* ============================================================
   GAME 4: Hangman
   ============================================================ */
var HANG_WORDS = {
  en: ["PYTHON", "HANGMAN", "KEYBOARD", "TERMINAL", "COMPILER",
       "PIXEL", "ROBOT", "GALAXY", "PUZZLE", "VARIABLE",
       "FUNCTION", "CAPTAIN", "JUNGLE", "MYSTERY", "ORACLE"],
  pl: ["PAJĄK", "KOMPUTER", "KLAWIATURA", "MYSZKA", "PLANETA",
       "TYGRYS", "WODA", "ZAMEK", "SKARB", "ZIMA",
       "KSIĘŻYC", "ROBOT", "KOLOR", "SZAFA", "OGRÓD"]
};
function hangAlphabet() {
  return lang === "pl" ? "AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
}

function viewHangman() {
  var body = mountPanel("hangName");
  var st = { word: "", guessed: {}, wrong: 0, helmet: false, over: false };

  function start() {
    st.word = pick(HANG_WORDS[lang] || HANG_WORDS.en);
    st.guessed = {};
    st.wrong = 0;
    st.helmet = owns("helmet");
    st.over = false;
    body.innerHTML =
      '<p class="hint">' + esc(t("hangRule")) + (st.helmet ? " " + esc(t("hangHelmetNote")) : "") + "</p>" +
      '<div class="hang-wrap">' +
        '<svg class="hang-svg" id="hang-svg" viewBox="0 0 150 170" width="150" height="170"></svg>' +
        '<div class="hang-side">' +
          '<div class="hang-word" id="hang-word"></div>' +
          '<p class="hint" id="hang-left"></p>' +
          '<div class="kbd" id="hang-kbd"></div>' +
        "</div>" +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    renderKbd();
    renderState();
  }

  function renderKbd() {
    var alpha = hangAlphabet(), i;
    var h = "";
    for (i = 0; i < alpha.length; i++) {
      var c = alpha.charAt(i);
      h += '<button class="kbd-btn" type="button" data-c="' + c + '"' +
        (st.guessed[c] || st.over ? " disabled" : "") + ">" + c + "</button>";
    }
    var kbd = document.getElementById("hang-kbd");
    kbd.innerHTML = h;
    var btns = kbd.getElementsByClassName("kbd-btn");
    for (i = 0; i < btns.length; i++) {
      (function (idx) {
        btns[idx].onclick = function () { guess(btns[idx].getAttribute("data-c")); };
      })(i);
    }
  }

  function wordHtml() {
    var out = [];
    for (var i = 0; i < st.word.length; i++) {
      var ch = st.word.charAt(i);
      out.push(st.guessed[ch] ? ch : "_");
    }
    return out.join(" ");
  }

  function renderState() {
    document.getElementById("hang-word").textContent = wordHtml();
    document.getElementById("hang-left").textContent = t("hangLeft") + " " + (6 - st.wrong);
    drawGallows();
  }

  function drawGallows() {
    var s = '<rect x="5" y="155" width="130" height="6" fill="#f2f2f2"/>' +
      '<rect x="24" y="14" width="6" height="142" fill="#f2f2f2"/>' +
      '<rect x="24" y="14" width="72" height="6" fill="#f2f2f2"/>' +
      '<rect x="90" y="14" width="6" height="18" fill="#f2f2f2"/>';
    if (st.wrong >= 1) s += '<circle cx="93" cy="48" r="15" fill="none" stroke="#ffffff" stroke-width="4"/>';
    if (st.wrong >= 2) s += '<line x1="93" y1="63" x2="93" y2="108" stroke="#ffffff" stroke-width="5"/>';
    if (st.wrong >= 3) s += '<line x1="93" y1="74" x2="67" y2="94" stroke="#ffffff" stroke-width="5"/>';
    if (st.wrong >= 4) s += '<line x1="93" y1="74" x2="119" y2="94" stroke="#ffffff" stroke-width="5"/>';
    if (st.wrong >= 5) s += '<line x1="93" y1="108" x2="71" y2="138" stroke="#ffd700" stroke-width="5"/>';
    if (st.wrong >= 6) s += '<line x1="93" y1="108" x2="115" y2="138" stroke="#ffd700" stroke-width="5"/>';
    document.getElementById("hang-svg").innerHTML = s;
  }

  function guess(c) {
    if (st.over || st.guessed[c]) return;
    st.guessed[c] = true;
    if (st.word.indexOf(c) === -1) {
      if (st.helmet) {
        st.helmet = false;
        feedLine(body, t("hangHelmetUsed", { l: c }), "gold");
      } else {
        st.wrong++;
        feedLine(body, t("hangNoLetter", { l: c }), "bad");
      }
    }
    renderKbd();
    renderState();
    var solved = true;
    for (var i = 0; i < st.word.length; i++) {
      if (!st.guessed[st.word.charAt(i)]) solved = false;
    }
    if (solved) {
      st.over = true;
      feedLine(body, t("hangWin", { w: st.word }), "good");
      var p = award(30);
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
      renderKbd();
      againBtn(body, function () { viewHangman(); });
      return;
    }
    if (st.wrong >= 6) {
      st.over = true;
      feedLine(body, t("hangLose", { w: st.word }), "bad");
      renderKbd();
      againBtn(body, function () { viewHangman(); });
    }
  }

  start();
}

/* ============================================================
   GAME 5: Memory Match
   ============================================================ */
function viewMemory() {
  var body = mountPanel("memName");
  var SYMS = ["@", "#", "$", "%", "&", "*", "+", "="];
  var st = { deck: [], up: [], found: [], moves: 0, sel: -1, lock: false, over: false };

  function start() {
    st.deck = shuffle(SYMS.concat(SYMS));
    st.up = [];
    st.found = [];
    for (var i = 0; i < 16; i++) {
      st.up.push(false);
      st.found.push(false);
    }
    st.moves = 0;
    st.sel = -1;
    st.lock = false;
    st.over = false;
    body.innerHTML =
      '<p class="hint" id="mem-info"></p>' +
      '<div class="mem-grid" id="mem-grid"></div>' +
      '<div class="feed" id="g-feed"></div>';
    render();
  }

  function render() {
    document.getElementById("mem-info").textContent =
      t("memTitle") + "   " + t("memMoves") + " " + st.moves;
    var g = document.getElementById("mem-grid");
    var h = "", i;
    for (i = 0; i < 16; i++) {
      var visible = st.found[i] || st.up[i];
      var cls = "mem-tile" + (visible ? " up" : "") + (st.found[i] ? " matched" : "");
      h += '<button class="' + cls + '" type="button" data-i="' + i + '">' +
        (visible ? esc(st.deck[i]) : "?") + "</button>";
    }
    g.innerHTML = h;
    var tiles = g.getElementsByClassName("mem-tile");
    for (i = 0; i < 16; i++) {
      (function (idx) { tiles[idx].onclick = function () { onTile(idx); }; })(i);
    }
  }

  function onTile(i) {
    if (st.over || st.lock || st.up[i]) return;
    if (st.sel === -1) {
      st.up[i] = true;
      st.sel = i;
      render();
      return;
    }
    var a = st.sel, b = i;
    st.up[i] = true;
    st.moves++;
    st.sel = -1;
    if (st.deck[a] === st.deck[b]) {
      st.found[a] = true;
      st.found[b] = true;
      render();
      feedLine(body, t("memMatch", { s: st.deck[a] }), "good");
      var done = true;
      for (var k = 0; k < 16; k++) if (!st.found[k]) done = false;
      if (done) {
        st.over = true;
        feedLine(body, t("memWin", { n: st.moves }), "good");
        var p = award(40);
        feedLine(body, t("prizeWon", { n: p }), "gold");
        prizeToast(p);
        updateHUD();
        againBtn(body, function () { viewMemory(); });
      }
      return;
    }
    render();
    feedLine(body, t("memNoMatch", { a: a + 1, b: b + 1, s1: st.deck[a], s2: st.deck[b] }), "");
    st.lock = true;
    setTimeout(function () {
      st.up[a] = false;
      st.up[b] = false;
      st.lock = false;
      render();
    }, 750);
  }

  start();
}

/* ============================================================
   GAME 6: Higher or Lower
   ============================================================ */
var SUIT_POOL = ["\u2665", "\u2666", "\u2663", "\u2660"];
function cardRankName(rank) {
  if (rank === 1) return t("ace");
  if (rank === 11) return t("jack");
  if (rank === 12) return t("queen");
  if (rank === 13) return t("king");
  return String(rank);
}
function cardIsRed(suit) {
  return suit === "\u2665" || suit === "\u2666";
}
function cardHtml(rank, suit, extraCls) {
  return '<div class="pcard ' + (cardIsRed(suit) ? "red" : "") + (extraCls ? " " + extraCls : "") + '">' +
    '<div class="p-rank">' + esc(cardRankName(rank)) + "</div>" +
    '<div class="p-suit">' + suit + "</div></div>";
}

function viewHilo() {
  var body = mountPanel("hiloName");
  var st = { bet: 0, card: 0, suit: "", next: 0, nextSuit: "", streak: 0, over: false, log: [] };
  function fb(text, cls) { feedGlobal(body, text, cls, st.log); }

  function renderBet() {
    st.log = [];
    var max = points();
    var h = '<p class="hint">' + esc(t("hiloRule")) + "</p>";
    if (max > 0) {
      h += '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="h-bet" type="number" min="0" max="' + max + '" value="10"></div>';
    } else {
      h += '<p class="hint">' + esc(t("freeNote")) + "</p>";
    }
    h += '<div class="row"><button class="btn" id="h-go" type="button">' + esc(t("startBtn")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    body.innerHTML = h;
    document.getElementById("h-go").onclick = function () {
      var b = 0;
      if (max > 0) {
        b = parseInt(document.getElementById("h-bet").value, 10);
        if (isNaN(b) || b < 0) b = 0;
        if (b > max) b = max;
        if (b > 0) spend(b);
        updateHUD();
      }
      st.bet = b;
      st.streak = 0;
      st.over = false;
      st.card = ri(1, 13);
      st.suit = pick(SUIT_POOL);
      st.log = [];
      if (b) fb(t("hiloStake", { n: b }), "gold");
      renderGuess();
    };
  }

  function renderGuess() {
    setBody(body,
      '<p class="hint">' + esc(t("hiloCurrent")) + "</p>" +
      '<div class="hilo-cards">' + cardHtml(st.card, st.suit) + "</div>" +
      '<div class="hilo-actions">' +
        '<button class="btn" id="h-up" type="button">&#9650; ' + esc(t("hiloH")) + "</button>" +
        '<button class="btn alt" id="h-down" type="button">&#9660; ' + esc(t("hiloL")) + "</button>" +
      "</div>" +
      '<div class="feed" id="g-feed"></div>', st.log);
    document.getElementById("h-up").onclick = function () { doGuess("h"); };
    document.getElementById("h-down").onclick = function () { doGuess("l"); };
  }

  function renderDecide() {
    setBody(body,
      '<div class="hilo-cards">' +
        cardHtml(st.card, st.suit) + cardHtml(st.next, st.nextSuit) +
      "</div>" +
      '<p class="hint center">' + esc(t("hiloNext")) + " " + esc(cardRankName(st.next)) + "</p>" +
      '<div class="hilo-actions">' +
        '<button class="btn" id="h-keep" type="button">' + esc(t("hiloKeep")) + "</button>" +
        (st.bet ? '<button class="btn gold" id="h-cash" type="button">' +
          esc(t("hiloCashNow", { n: st.bet * (st.streak + 1) })) + "</button>" : "") +
      "</div>" +
      '<div class="feed" id="g-feed"></div>', st.log);
    document.getElementById("h-keep").onclick = function () {
      st.card = st.next;
      st.suit = st.nextSuit;
      renderGuess();
    };
    var cash = document.getElementById("h-cash");
    if (cash) cash.onclick = cashOut;
  }

  function doGuess(dir) {
    if (st.over) return;
    st.next = ri(1, 13);
    st.nextSuit = pick(SUIT_POOL);
    if (st.next === st.card) {
      fb(t("hiloPush", { n: st.streak }), "");
      renderDecide();
      return;
    }
    var isHigher = st.next > st.card;
    if ((dir === "h") === isHigher) {
      st.streak++;
      fb(t("hiloCorrect", { n: st.streak }), "good");
      renderDecide();
    } else {
      st.over = true;
      fb(t("hiloWrong", { n: st.streak }), "bad");
      if (st.bet) fb(t("stakeLost", { n: st.bet }), "bad");
      againBtn(body, function () { viewHilo(); });
    }
  }

  function cashOut() {
    if (st.over) return;
    st.over = true;
    if (st.bet) {
      var winnings = st.bet * (st.streak + 1);
      credit(winnings);
      fb(t("hiloCashed", { n: winnings, p: winnings - st.bet }), "gold");
      prizeToast(winnings - st.bet);
      updateHUD();
    } else {
      fb(t("hiloFinish", { n: st.streak }), "good");
    }
    againBtn(body, function () { viewHilo(); });
  }

  renderBet();
}

/* ============================================================
   GAME 7: Math Quiz
   ============================================================ */
function makeMathQuestion(level) {
  var op, a, b, ans, tmp;
  if (level === 1) {
    op = pick(["+", "-"]);
    a = ri(1, 20);
    b = ri(1, 20);
    if (op === "-" && b > a) { tmp = a; a = b; b = tmp; }
    ans = op === "+" ? a + b : a - b;
  } else if (level === 2) {
    op = pick(["+", "-", "*"]);
    if (op === "*") {
      a = ri(2, 12);
      b = ri(2, 12);
      ans = a * b;
    } else {
      a = ri(10, 99);
      b = ri(10, 99);
      if (op === "-" && b > a) { tmp = a; a = b; b = tmp; }
      ans = op === "+" ? a + b : a - b;
    }
  } else if (level === 3) {
    op = pick(["-", "*", "/"]);
    if (op === "/") {
      b = ri(2, 12);
      ans = ri(2, 12);
      a = b * ans;
    } else if (op === "*") {
      a = ri(11, 25);
      b = ri(11, 25);
      ans = a * b;
    } else {
      a = ri(100, 999);
      b = ri(100, 999);
      if (b > a) { tmp = a; a = b; b = tmp; }
      ans = a - b;
    }
  } else {
    op = pick(["*", "/", "-", "+"]);
    if (op === "*") {
      a = ri(11, 99);
      b = ri(11, 99);
      ans = a * b;
    } else if (op === "/") {
      b = ri(12, 40);
      ans = ri(3, 30);
      a = b * ans;
    } else if (op === "-") {
      a = ri(500, 999);
      b = ri(100, 499);
      ans = a - b;
    } else {
      a = ri(200, 999);
      b = ri(200, 999);
      ans = a + b;
    }
  }
  return { text: a + " " + op + " " + b, ans: ans };
}

function viewMath() {
  var body = mountPanel("mathName");
  var st = { level: 0, i: 0, score: 0, rate: 0, q: null, wrong: [], log: [] };
  function fb(text, cls) { feedGlobal(body, text, cls, st.log); }

  function renderDiff() {
    body.innerHTML =
      '<div class="diff-row">' +
        diffBtn(1, "mathEasy", 3) +
        diffBtn(2, "mathMed", 6) +
        diffBtn(3, "mathHard", 10) +
        diffBtn(4, "mathExpert", 15) +
      "</div>";
    var btns = body.getElementsByClassName("diff-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (idx) {
        btns[idx].onclick = function () { start(parseInt(btns[idx].getAttribute("data-l"), 10)); };
      })(i);
    }
  }
  function diffBtn(l, key, rate) {
    return '<button class="diff-btn" type="button" data-l="' + l + '">' +
      '<div class="d-name">' + esc(t(key)) + "</div>" +
      '<div class="d-sub">' + esc(t("mathPer", { n: rate })) + "</div></button>";
  }

  function start(level) {
    st.level = level;
    st.rate = [3, 6, 10, 15][level - 1];
    st.i = 0;
    st.score = 0;
    st.wrong = [];
    st.log = [];
    nextQ();
  }

  function nextQ() {
    if (st.i >= 10) { finish(); return; }
    st.q = makeMathQuestion(st.level);
    setBody(body,
      '<p class="hint">' + esc(t("mathQ", { a: st.i + 1, b: 10 })) + " " + esc(t("mathPer", { n: st.rate })) + "</p>" +
      '<div class="math-q">' + esc(st.q.text) + " = ?</div>" +
      '<div class="row">' +
        '<input class="num-input" id="mq-in" type="number" placeholder="' + esc(t("mathAnswer")) + '">' +
        '<button class="btn" id="mq-go" type="button">' + esc(t("mathGo")) + "</button>" +
      "</div>" +
      '<div class="feed" id="g-feed"></div>', st.log);
    document.getElementById("mq-go").onclick = check;
    document.getElementById("mq-in").onkeydown = function (e) {
      e = e || window.event;
      if (e.keyCode === 13) check();
    };
    document.getElementById("mq-in").focus();
  }

  function check() {
    var inp = document.getElementById("mq-in");
    var v = parseInt(inp.value, 10);
    if (isNaN(v)) {
      fb(t("mathRange"), "bad");
      return;
    }
    if (v === st.q.ans) {
      st.score++;
      fb(t("mathCorrect"), "good");
    } else {
      st.wrong.push(st.q.text + " = " + st.q.ans);
      fb(t("mathWrong", { n: st.q.ans }), "bad");
    }
    st.i++;
    nextQ();
  }

  function finish() {
    setBody(body,
      '<div class="big" id="m-score"></div>' +
      '<div class="feed" id="g-feed"></div>', st.log);
    document.getElementById("m-score").textContent = t("mathScore", { a: st.score, b: 10 });
    fb(t("mathScore", { a: st.score, b: 10 }), st.score === 10 ? "good" : "");
    if (st.score === 10) fb(t("mathPerfect"), "good");
    if (st.wrong.length) {
      fb(t("mathMissed"), "bad");
      for (var i = 0; i < st.wrong.length; i++) fb(st.wrong[i], "bad");
    }
    if (st.score > 0) {
      var p = award(st.rate * st.score);
      fb(t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
    }
    againBtn(body, function () { viewMath(); });
  }

  renderDiff();
}

/* ============================================================
   GAME 8: Minesweeper
   ============================================================ */
function viewMines() {
  var body = mountPanel("minesName");
  var st = null;

  function renderDiff() {
    body.innerHTML =
      '<div class="diff-row">' +
        diffBtn(1, "minesEasy") +
        diffBtn(2, "minesMed") +
        diffBtn(3, "minesHard") +
      "</div>" +
      '<p class="hint">' + esc(t("minesHelp")) + "</p>";
    var btns = body.getElementsByClassName("diff-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (idx) {
        btns[idx].onclick = function () { start(parseInt(btns[idx].getAttribute("data-l"), 10)); };
      })(i);
    }
  }
  function diffBtn(l, key) {
    return '<button class="diff-btn" type="button" data-l="' + l + '">' +
      '<div class="d-name">' + esc(t(key)) + "</div></button>";
  }

  function start(level) {
    var cfg = [[6, 5, 60], [8, 10, 120], [10, 20, 200]][level - 1];
    st = {
      size: cfg[0], mineCount: cfg[1], prize: cfg[2],
      mine: [], nums: [], rev: [], flg: [],
      first: true, over: false, flagMode: false, hitIdx: -1, level: level
    };
    var n = st.size * st.size, i;
    for (i = 0; i < n; i++) {
      st.mine.push(false);
      st.nums.push(0);
      st.rev.push(false);
      st.flg.push(false);
    }
    body.innerHTML =
      '<div class="row">' +
        '<button class="btn ghost small flag-toggle" id="ms-flag" type="button">[F] ' + esc(t("minesFlag")) + "</button>" +
        '<button class="btn ghost small" id="ms-new" type="button">' + esc(t("minesNew")) + "</button>" +
      "</div>" +
      '<p class="hint">' + esc(t("minesHelp")) + "</p>" +
      '<div class="ms-grid" id="ms-grid"></div>' +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("ms-flag").onclick = function () {
      st.flagMode = !st.flagMode;
      this.className = "btn small flag-toggle" + (st.flagMode ? " on" : "");
    };
    document.getElementById("ms-new").onclick = function () { start(level); };
    render();
  }

  function placeMines(safe) {
    var spots = [], i;
    for (i = 0; i < st.size * st.size; i++) if (i !== safe) spots.push(i);
    shuffle(spots);
    for (i = 0; i < st.mineCount; i++) st.mine[spots[i]] = true;
    for (i = 0; i < st.size * st.size; i++) {
      if (st.mine[i]) { st.nums[i] = -1; continue; }
      var r = Math.floor(i / st.size), c = i % st.size, cnt = 0;
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          var rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < st.size && cc >= 0 && cc < st.size && st.mine[rr * st.size + cc]) cnt++;
        }
      }
      st.nums[i] = cnt;
    }
  }

  function flood(startIdx) {
    var stack = [startIdx];
    while (stack.length) {
      var i = stack.pop();
      if (i < 0 || i >= st.size * st.size) continue;
      if (st.rev[i] || st.flg[i]) continue;
      st.rev[i] = true;
      if (st.nums[i] === 0) {
        var r = Math.floor(i / st.size), c = i % st.size;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < st.size && cc >= 0 && cc < st.size) stack.push(rr * st.size + cc);
          }
        }
      }
    }
  }

  function render() {
    var g = document.getElementById("ms-grid");
    g.style.gridTemplateColumns = "repeat(" + st.size + ", 1fr)";
    g.style.maxWidth = (st.size * 38) + "px";
    var h = "", i;
    for (i = 0; i < st.size * st.size; i++) {
      var cls = "ms-cell", txt = "";
      if (st.rev[i]) {
        cls += " open";
        if (st.mine[i]) {
          cls += i === st.hitIdx ? " hit" : " mine";
          txt = "*";
        } else if (st.nums[i] > 0) {
          cls += " n" + st.nums[i];
          txt = String(st.nums[i]);
        }
      } else if (st.flg[i]) {
        txt = "F";
      }
      h += '<button class="' + cls + '" type="button" data-i="' + i + '">' + txt + "</button>";
    }
    g.innerHTML = h;
    var cells = g.getElementsByClassName("ms-cell");
    for (i = 0; i < cells.length; i++) {
      (function (idx) {
        cells[idx].onclick = function () { cellClick(idx, false); };
        cells[idx].oncontextmenu = function (e) {
          e = e || window.event;
          if (e.preventDefault) e.preventDefault();
          cellClick(idx, true);
          return false;
        };
      })(i);
    }
  }

  function cellClick(i, forceFlag) {
    if (st.over) return;
    if (forceFlag || st.flagMode) {
      if (st.rev[i]) return;
      st.flg[i] = !st.flg[i];
      render();
      return;
    }
    if (st.flg[i] || st.rev[i]) return;
    if (st.first) {
      placeMines(i);
      st.first = false;
    }
    if (st.mine[i]) {
      st.over = true;
      st.hitIdx = i;
      for (var k = 0; k < st.size * st.size; k++) if (st.mine[k]) st.rev[k] = true;
      render();
      feedLine(body, t("minesBoom"), "bad");
      againBtn(body, function () { start(st.level); });
      return;
    }
    flood(i);
    render();
    var done = true;
    for (var k2 = 0; k2 < st.size * st.size; k2++) {
      if (!st.mine[k2] && !st.rev[k2]) done = false;
    }
    if (done) {
      st.over = true;
      feedLine(body, t("minesWin"), "good");
      var p = award(st.prize);
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
      againBtn(body, function () { start(st.level); });
    }
  }

  renderDiff();
}

/* ============================================================
   GAME 9: Blackjack
   ============================================================ */
var BJ_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
var SUIT_SYM = { Hearts: "\u2665", Diamonds: "\u2666", Clubs: "\u2663", Spades: "\u2660" };

function bjValue(hand) {
  var total = 0, aces = 0, i;
  for (i = 0; i < hand.length; i++) {
    var r = hand[i].r;
    if (r === "A") { total += 11; aces++; }
    else if (r === "J" || r === "Q" || r === "K") total += 10;
    else total += parseInt(r, 10);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function viewBJ() {
  var body = mountPanel("bjName");
  var st = { bet: 0, player: [], dealer: [], wins: 0, losses: 0, over: false, revealed: false, log: [] };
  function fb(text, cls) { feedGlobal(body, text, cls, st.log); }

  function draw() { return { r: pick(BJ_RANKS), s: pick(["Hearts", "Diamonds", "Clubs", "Spades"]) }; }

  function handHtml(hand, hideFirst) {
    var h = "";
    for (var i = 0; i < hand.length; i++) {
      if (i === 0 && hideFirst) {
        h += '<div class="bcard hole">?</div>';
      } else {
        var red = hand[i].s === "Hearts" || hand[i].s === "Diamonds";
        h += '<div class="bcard' + (red ? " red" : "") + '">' + hand[i].r + SUIT_SYM[hand[i].s] + "</div>";
      }
    }
    return h;
  }

  function renderBet() {
    st.log = [];
    var max = points();
    var h = '<p class="hint">' + esc(t("bjRule")) + "</p>";
    if (max > 0) {
      h += '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="bj-bet" type="number" min="0" max="' + max + '" value="10"></div>';
    } else {
      h += '<p class="hint">' + esc(t("freeNote")) + "</p>";
    }
    h += '<div class="row"><button class="btn" id="bj-go" type="button">' + esc(t("bjDeal")) + "</button></div>" +
      '<p class="hint" id="bj-record"></p>' +
      '<div class="feed" id="g-feed"></div>';
    body.innerHTML = h;
    updateRecord();
    document.getElementById("bj-go").onclick = function () {
      var b = 0;
      if (max > 0) {
        b = parseInt(document.getElementById("bj-bet").value, 10);
        if (isNaN(b) || b < 0) b = 0;
        if (b > max) b = max;
        if (b > 0) spend(b);
        updateHUD();
      }
      st.bet = b;
      deal();
    };
  }

  function updateRecord() {
    var el = document.getElementById("bj-record");
    if (el) el.textContent = t("bjRecord", { a: st.wins, b: st.losses });
  }

  function deal() {
    st.player = [draw(), draw()];
    st.dealer = [draw(), draw()];
    st.over = false;
    st.revealed = false;
    st.log = [];
    if (st.bet) fb(t("bjStake", { n: st.bet }), "gold");
    if (bjValue(st.player) === 21) {
      st.revealed = true;
      if (bjValue(st.dealer) === 21) settle("push");
      else settle("natural");
      return;
    }
    renderTable(true);
  }

  function renderTable(hitStand) {
    var h =
      '<div class="bj-table">' +
        '<div class="bj-row-label">' + esc(t("bjDealer")) +
          (st.revealed ? " (" + bjValue(st.dealer) + ")" : " (" + esc(t("bjHole")) + ")") + "</div>" +
        '<div class="bj-hand">' + handHtml(st.dealer, !st.revealed) + "</div>" +
        '<div class="bj-row-label">' + esc(t("bjYou")) + " (" + bjValue(st.player) + ")</div>" +
        '<div class="bj-hand">' + handHtml(st.player, false) + "</div>" +
        '<p class="hint" id="bj-record"></p>';
    if (hitStand) {
      h += '<div class="row">' +
        '<button class="btn" id="bj-hit" type="button">' + esc(t("bjHit")) + "</button>" +
        '<button class="btn alt" id="bj-stand" type="button">' + esc(t("bjStand")) + "</button>" +
        "</div>";
    }
    h += '<div class="feed" id="g-feed"></div></div>';
    setBody(body, h, st.log);
    updateRecord();
    if (hitStand) {
      document.getElementById("bj-hit").onclick = hit;
      document.getElementById("bj-stand").onclick = stand;
    }
  }

  function hit() {
    if (st.over) return;
    st.player.push(draw());
    if (bjValue(st.player) >= 21) {
      renderTable(false);
      stand();
      return;
    }
    renderTable(true);
  }

  function stand() {
    if (st.over) return;
    st.revealed = true;
    while (bjValue(st.dealer) < 17) st.dealer.push(draw());
    renderTable(false);
    var pt = bjValue(st.player), dt = bjValue(st.dealer);
    if (pt > 21) settle("lose");
    else if (dt > 21) settle("win");
    else if (pt > dt) settle("win");
    else if (pt < dt) settle("lose");
    else settle("push");
  }

  function settle(outcome) {
    st.over = true;
    st.revealed = true;
    renderTable(false);
    var pt = bjValue(st.player), dt = bjValue(st.dealer);
    if (outcome === "natural") {
      st.wins++;
      fb(t("bjNatural"), "good");
      if (st.bet) {
        credit(st.bet * 3);
        fb(t("bjNaturalPay", { n: st.bet * 2 }), "gold");
        prizeToast(st.bet * 2);
        updateHUD();
      }
    } else if (outcome === "win") {
      st.wins++;
      if (dt > 21) fb(t("bjBustDeal"), "good");
      if (st.bet) {
        credit(st.bet * 2);
        fb(t("bjWinPay", { n: st.bet }), "gold");
        prizeToast(st.bet);
        updateHUD();
      } else if (dt <= 21) {
        fb(t("bjWinFree"), "good");
      }
    } else if (outcome === "push") {
      if (pt === 21 && dt === 21) fb(t("bjNaturalBoth"), "");
      if (st.bet) {
        credit(st.bet);
        fb(t("bjPush"), "");
      } else {
        fb(t("bjPushFree"), "");
      }
    } else {
      st.losses++;
      if (pt > 21) fb(t("bjBustYou"), "bad");
      if (st.bet) fb(t("bjLoseStake", { n: st.bet }), "bad");
      else fb(t("bjLoseFree"), "bad");
    }
    if (pt <= 21 && dt <= 21) fb(t("bjFinal", { a: pt, b: dt }), "");
    updateRecord();
    var r = document.createElement("div");
    r.className = "row";
    var b = document.createElement("button");
    b.className = "btn";
    b.type = "button";
    b.textContent = t("bjAgain");
    b.onclick = renderBet;
    r.appendChild(b);
    body.appendChild(r);
  }

  renderBet();
}

/* ============================================================
   GAME 10: Roulette
   ============================================================ */
var RLT_RED = {
  1: 1, 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 14: 1, 16: 1, 18: 1,
  19: 1, 21: 1, 23: 1, 25: 1, 27: 1, 30: 1, 32: 1, 34: 1, 36: 1
};
function colorOf(n) {
  if (n === 0) return "green";
  return RLT_RED[n] ? "red" : "black";
}
function colorLabel(c) {
  return c === "red" ? t("rltRed") : c === "black" ? t("rltBlack") : t("rltGreen");
}

function viewRoulette() {
  var body = mountPanel("rltName");
  var st = { type: null, num: null, spinning: false, log: [] };
  function fb(text, cls) { feedGlobal(body, text, cls, st.log); }

  function renderTable() {
    if (points() < 1) {
      setBody(body,
        '<p class="hint">' + esc(t("rltNoPts")) + "</p>" +
        '<div class="feed" id="g-feed"></div>', st.log);
      return;
    }
    setBody(body,
      '<p class="hint">' + esc(t("rltRule")) + "</p>" +
      '<div class="rlt-type-row">' +
        '<button class="rlt-type t-red" data-t="red" type="button">' + esc(t("rltRed")) + " 1:1</button>" +
        '<button class="rlt-type t-black" data-t="black" type="button">' + esc(t("rltBlack")) + " 1:1</button>" +
        '<button class="rlt-type t-green" data-t="green" type="button">' + esc(t("rltGreen")) + " 35:1</button>" +
        '<button class="rlt-type t-num" data-t="num" type="button">' + esc(t("rltNumber")) + " 35:1</button>" +
      "</div>" +
      '<div id="rlt-numbers" style="display:none"><p class="hint">' + esc(t("rltPick")) + "</p>" +
        '<div class="rlt-grid" id="rlt-grid"></div></div>' +
      '<div class="rlt-display" id="rlt-display">?</div>' +
      '<div class="row"><span class="hint">' + esc(t("rltStake")) + ':</span>' +
        '<input class="num-input" id="rlt-bet" type="number" min="1" max="' + points() + '" value="10"></div>' +
      '<div class="row">' +
        '<button class="btn gold" id="rlt-spin" type="button">' + esc(t("rltSpin")) + "</button>" +
        '<button class="btn ghost" id="rlt-leave" type="button">' + esc(t("rltLeave")) + "</button>" +
      "</div>" +
      '<div class="feed" id="g-feed"></div>', st.log);
    buildGrid();
    selectType(st.type);
    var tbtns = body.getElementsByClassName("rlt-type");
    for (var i = 0; i < tbtns.length; i++) {
      (function (idx) {
        tbtns[idx].onclick = function () {
          selectType(tbtns[idx].getAttribute("data-t"));
        };
      })(i);
    }
    document.getElementById("rlt-spin").onclick = spin;
    document.getElementById("rlt-leave").onclick = function () { showView(renderMenu); };
  }

  function selectType(type) {
    st.type = type;
    var tbtns = body.getElementsByClassName("rlt-type"), j;
    for (j = 0; j < tbtns.length; j++) {
      var base = tbtns[j].getAttribute("data-t");
      tbtns[j].className = "rlt-type t-" + base + (base === type ? " sel" : "");
    }
    var box = document.getElementById("rlt-numbers");
    if (box) box.style.display = type === "num" ? "block" : "none";
  }

  function buildGrid() {
    var g = document.getElementById("rlt-grid");
    var h = "", i;
    for (i = 0; i <= 36; i++) {
      h += '<button class="rlt-num ' + colorOf(i) + (st.num === i ? " sel" : "") +
        '" type="button" data-n="' + i + '">' + i + "</button>";
    }
    g.innerHTML = h;
    var nums = g.getElementsByClassName("rlt-num");
    for (i = 0; i < nums.length; i++) {
      (function (idx) {
        nums[idx].onclick = function () {
          st.num = parseInt(nums[idx].getAttribute("data-n"), 10);
          var k;
          for (k = 0; k < nums.length; k++) {
            var nn = parseInt(nums[k].getAttribute("data-n"), 10);
            nums[k].className = "rlt-num " + colorOf(nn) + (nn === st.num ? " sel" : "");
          }
        };
      })(i);
    }
  }

  function betLabel() {
    if (st.type === "red") return t("rltRed");
    if (st.type === "black") return t("rltBlack");
    if (st.type === "green") return t("rltGreen");
    return t("rltNumber") + " " + st.num;
  }

  function spin() {
    if (st.spinning) return;
    if (!st.type || (st.type === "num" && st.num === null)) {
      fb(st.type === "num" ? t("rltPick") : t("rltRed") + " / " + t("rltBlack"), "");
      return;
    }
    var max = points();
    var bet = parseInt(document.getElementById("rlt-bet").value, 10);
    if (isNaN(bet) || bet < 1) bet = 1;
    if (bet > max) bet = max;
    spend(bet);
    updateHUD();
    st.spinning = true;
    document.getElementById("rlt-spin").disabled = true;
    fb(t("rltOn", { n: bet, x: betLabel() }), "");
    fb(t("rltSpinning"), "");
    var result = ri(0, 36);
    var ticks = 0, maxTicks = 14;
    var disp = document.getElementById("rlt-display");
    var iv = setInterval(function () {
      if (!disp || !disp.parentNode) {
        clearInterval(iv);
        st.spinning = false;
        return;
      }
      ticks++;
      var n = ticks >= maxTicks ? result : ri(0, 36);
      disp.textContent = n;
      disp.className = "rlt-display " + colorOf(n);
      if (ticks >= maxTicks) {
        clearInterval(iv);
        st.spinning = false;
        settle(result, bet);
      }
    }, 120);
  }

  function settle(result, bet) {
    var c = colorOf(result);
    var win = false;
    if (st.type === "red") win = c === "red";
    else if (st.type === "black") win = c === "black";
    else if (st.type === "green") win = c === "green";
    else win = result === st.num;

    if (win) {
      if (st.type === "red" || st.type === "black") {
        credit(bet * 2);
        fb(t("rltWinEven", { x: betLabel(), n: bet }), "good");
        prizeToast(bet);
      } else {
        credit(bet * 36);
        fb(t("rltJackpot", { n: bet * 35 }), "gold");
        toast(t("rltJackpot", { n: bet * 35 }));
      }
      updateHUD();
    } else {
      fb(t("rltLose", { n: bet }), "bad");
    }
    fb(result + " \u00B7 " + colorLabel(c), c === "red" ? "bad" : c === "green" ? "good" : "");
    if (points() < 1) {
      fb(t("rltBroke"), "bad");
      renderTable();
    } else {
      var spinBtn = document.getElementById("rlt-spin");
      if (spinBtn) spinBtn.disabled = false;
      var betInput = document.getElementById("rlt-bet");
      if (betInput) betInput.setAttribute("max", points());
    }
  }

  renderTable();
}

/* ============================================================
   GAME 11: Point Shop
   ============================================================ */
var SHOP_ITEMS = [
  { id: "extra_guess", icon: "+2", price: 200, name: "itmGuess", desc: "itmGuessD" },
  { id: "helmet", icon: "1UP", price: 250, name: "itmHelmet", desc: "itmHelmetD" },
  { id: "banner", icon: "GOLD", price: 300, name: "itmBanner", desc: "itmBannerD" },
  { id: "clover", icon: "+10%", price: 500, name: "itmClover", desc: "itmCloverD" }
];

function viewShop() {
  var body = mountPanel("shopName");
  var st = { log: [] };
  function fb(text, cls) { feedGlobal(body, text, cls, st.log); }

  function render() {
    var h = '<p class="hint">' + esc(t("shopYour")) + " " + points() + " " + esc(t("points")) + "</p>" +
      '<div class="shop-grid">';
    for (var i = 0; i < SHOP_ITEMS.length; i++) {
      var it = SHOP_ITEMS[i];
      var owned = owns(it.id);
      h += '<div class="item-card' + (owned ? " owned" : "") + '">' +
        '<div class="i-icon">' + it.icon + "</div>" +
        '<div class="i-name">' + esc(t(it.name)) + "</div>" +
        '<div class="i-desc">' + esc(t(it.desc)) + "</div>" +
        '<div class="i-price">' + (owned ? esc(t("shopOwned")) : it.price + " " + esc(t("points"))) + "</div>" +
        (owned ? "" : '<button class="btn" type="button" data-i="' + i + '">' + esc(t("shopBuy")) + "</button>") +
        "</div>";
    }
    h += '</div><div class="feed" id="g-feed"></div>';
    setBody(body, h, st.log);
    var btns = body.getElementsByClassName("btn");
    for (var j = 0; j < btns.length; j++) {
      (function (idx) {
        btns[idx].onclick = function () { buy(SHOP_ITEMS[parseInt(btns[idx].getAttribute("data-i"), 10)]); };
      })(j);
    }
  }

  function buy(it) {
    if (owns(it.id)) {
      fb(t("alreadyOwnedMsg") + " " + t(it.name), "");
      return;
    }
    if (points() < it.price) {
      fb(t("notEnough") + " " + (it.price - points()) + " " + t("morePts"), "bad");
      return;
    }
    spend(it.price);
    save.items.push(it.id);
    persist();
    fb(t("purchasedMsg") + " " + t(it.name) + "!", "gold");
    toast(t("purchasedMsg") + " " + t(it.name) + "!");
    updateHUD();
    render();
  }

  render();
}

/* ============================================================
   GAME 13: Pong
   ============================================================ */
function viewPong() {
  var body = mountPanel("pongName");
  var st = { w: 600, h: 300, pw: 10, ph: 60, bs: 10, ball: {x:300,y:150,vx:3,vy:2}, paddleY: 120, aiY: 120, score: 0, aiScore: 0, timer: 0, over: false, log: [], target: 5 };
  function fb(text, cls) { feedGlobal(body, text, cls, st.log); }

  function renderStart() {
    st.log = [];
    body.innerHTML =
      '<p class="hint">' + esc(t("pongDesc")) + '</p>' +
      '<p class="hint">Use Up/Down or W/S to move paddle. First to ' + st.target + ' wins.</p>' +
      '<div class="row"><button class="btn" id="pong-start" type="button">' + esc(t("startBtn")) + '</button></div>' +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("pong-start").onclick = startGame;
  }

  function startGame() {
    st.ball = {x: st.w/2, y: st.h/2, vx: pick([-3,3]), vy: pick([-2,-1,1,2])};
    st.paddleY = st.h/2 - st.ph/2;
    st.aiY = st.h/2 - st.ph/2;
    st.score = 0;
    st.aiScore = 0;
    st.over = false;
    body.innerHTML =
      '<div class="hilo-cards" style="justify-content:flex-start;gap:8px;">' +
        '<div class="hint" style="font-size:18px;font-weight:700;">You: <span id="pong-score">0</span>  |  AI: <span id="pong-aiscore">0</span></div>' +
      '</div>' +
      '<canvas id="pong-canvas" width="' + st.w + '" height="' + st.h + '" style="background:#0f0f0f;border:2px solid #333333;border-radius:4px;display:block;margin:0 auto;"></canvas>' +
      '<div class="feed" id="g-feed"></div>';
    var canvas = document.getElementById("pong-canvas");
    var ctx = canvas.getContext("2d");
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    st.keys = {};
    st.timer = setInterval(function() { pongLoop(ctx); }, 1000/60);
  }

  var keysPressed = {};

  function onKeyDown(e) { st.keys[e.key] = true; }
  function onKeyUp(e) { st.keys[e.key] = false; }

  function pongLoop(ctx) {
    if (st.over) return;
    if (!document.getElementById("pong-canvas")) {
      st.over = true;
      clearInterval(st.timer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      return;
    }
    // Player paddle
    if (st.keys["ArrowUp"] || st.keys["w"] || st.keys["W"]) st.paddleY -= 6;
    if (st.keys["ArrowDown"] || st.keys["s"] || st.keys["S"]) st.paddleY += 6;
    st.paddleY = Math.max(0, Math.min(st.h - st.ph, st.paddleY));

    // AI paddle (simple tracking)
    var ballCenter = st.ball.y;
    var aiCenter = st.aiY + st.ph/2;
    if (aiCenter < ballCenter - 10) st.aiY += 4;
    else if (aiCenter > ballCenter + 10) st.aiY -= 4;
    st.aiY = Math.max(0, Math.min(st.h - st.ph, st.aiY));

    // Ball movement
    st.ball.x += st.ball.vx;
    st.ball.y += st.ball.vy;

    // Top/bottom walls
    if (st.ball.y <= st.bs/2 || st.ball.y >= st.h - st.bs/2) {
      st.ball.vy = -st.ball.vy;
      st.ball.y = Math.max(st.bs/2, Math.min(st.h - st.bs/2, st.ball.y));
    }

    // Player paddle collision (left side)
    if (st.ball.x - st.bs/2 <= st.pw && st.ball.x + st.bs/2 >= 0) {
      if (st.ball.y >= st.paddleY && st.ball.y <= st.paddleY + st.ph) {
        st.ball.vx = Math.abs(st.ball.vx) + 0.2;
        var hitPos = (st.ball.y - st.paddleY) / st.ph - 0.5;
        st.ball.vy = hitPos * 6;
      }
    }

    // AI paddle collision (right side)
    if (st.ball.x + st.bs/2 >= st.w - st.pw && st.ball.x - st.bs/2 <= st.w) {
      if (st.ball.y >= st.aiY && st.ball.y <= st.aiY + st.ph) {
        st.ball.vx = -Math.abs(st.ball.vx) - 0.2;
        var hitPos2 = (st.ball.y - st.aiY) / st.ph - 0.5;
        st.ball.vy = hitPos2 * 6;
      }
    }

    // Score check
    if (st.ball.x < 0) {
      st.aiScore++;
      document.getElementById("pong-aiscore").textContent = st.aiScore;
      resetBall();
    } else if (st.ball.x > st.w) {
      st.score++;
      document.getElementById("pong-score").textContent = st.score;
      resetBall();
    }

    // Render
    ctx.clearRect(0, 0, st.w, st.h);
    ctx.fillStyle = "#ffffff";
    // Center line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(st.w/2, 0);
    ctx.lineTo(st.w/2, st.h);
    ctx.strokeStyle = "#333333";
    ctx.stroke();
    ctx.setLineDash([]);
    // Paddles
    ctx.fillRect(0, st.paddleY, st.pw, st.ph);
    ctx.fillRect(st.w - st.pw, st.aiY, st.pw, st.ph);
    // Ball
    ctx.beginPath();
    ctx.arc(st.ball.x, st.ball.y, st.bs/2, 0, Math.PI*2);
    ctx.fill();

    if (st.score >= st.target || st.aiScore >= st.target) {
      gameOver();
    }
  }

  function resetBall() {
    st.ball = {x: st.w/2, y: st.h/2, vx: pick([-3,3]), vy: pick([-2,-1,1,2])};
  }

  function gameOver() {
    st.over = true;
    clearInterval(st.timer);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    var won = st.score > st.aiScore;
    var p = award(won ? 50 : 0);
    if (won) {
      fb(t("youWin"), "good");
      if (p) fb(t("prizeWon", {n: p}), "gold");
    } else {
      fb(t("computerWins"), "bad");
    }
    prizeToast(p);
    updateHUD();
    againBtn(body, function () { viewPong(); });
  }

  renderStart();
}

/* ============================================================
   Menu
   ============================================================ */
var GAMES = [
  { icon: "\uD83C\uDFAF", name: "guessName", desc: "guessDesc", view: viewGuess, mp: "gn" },
  { icon: "\u2B55", name: "tttName", desc: "tttDesc", view: viewTTT, mp: "ttt" },
  { icon: "\u270A", name: "rpsName", desc: "rpsDesc", view: viewRPS, mp: "rps" },
  { icon: "\uD83D\uDD24", name: "hangName", desc: "hangDesc", view: viewHangman },
  { icon: "\uD83E\uDDE0", name: "memName", desc: "memDesc", view: viewMemory },
  { icon: "\uD83C\uDFB4", name: "hiloName", desc: "hiloDesc", view: viewHilo },
  { icon: "\uD83C\uDFC3", name: "pongName", desc: "pongDesc", view: viewPong },
  { icon: "\uD83E\uDDEE", name: "mathName", desc: "mathDesc", view: viewMath },
  { icon: "\uD83D\uDCA3", name: "minesName", desc: "minesDesc", view: viewMines, fav: true },
  { icon: "\uD83C\uDDB2", name: "bjName", desc: "bjDesc", view: viewBJ },
  { icon: "\uD83C\uDFA1", name: "rltName", desc: "rltDesc", view: viewRoulette },
  { icon: "\uD83D\uDED2", name: "shopName", desc: "shopDesc", view: viewShop }
];

function renderMenu() {
  var bar = "============================================================";
  var inRoom = typeof MP !== "undefined" && MP.inRoom && MP.inRoom();
  var html =
    '<div class="term">' +
      '<div class="term-bar">' + bar + "</div>" +
      '<div class="term-title">' + esc(t("siteTitle")) + "</div>" +
      '<div class="term-bar">' + bar + "</div>" +
      '<div class="term-tag">' + esc(t("menuTagline")) + "</div>" +
      '<div class="term-points">' + esc(t("youHave", { n: points() })) + "</div>" +
      '<div class="term-hello">' + esc(t("menuHello")) + "</div>" +
      (typeof mpRoomLine === "function" ? mpRoomLine() : "") +
      '<div class="term-list">';
  for (var i = 0; i < GAMES.length; i++) {
    html += '<div class="term-item" data-i="' + i + '" role="button" tabindex="0">' +
      '<span class="term-num">' + (i + 1) + ")</span>" +
      '<span class="term-label">' + esc(t(GAMES[i].name)) + "</span>" +
      '<span class="lead" aria-hidden="true"></span>' +
      (inRoom && GAMES[i].mp ? '<span class="term-tag">' + esc(t("mpTag")) + "</span>" : "") +
      (GAMES[i].fav ? '<span class="fav">&#9733; ' + esc(t("menuFav")) + "</span>" : "") +
      "</div>";
  }
  html += typeof mpMenuExtras === "function" ? mpMenuExtras() : "";
  html += "</div>" +
    '<div class="term-note">' + esc(t("freeEarners")) + "</div>" +
    '<div class="term-pick">' + esc(t("menuPick")) + '<span class="term-cursor"></span></div>' +
    "</div>";
  app.innerHTML = html;
  var items = app.getElementsByClassName("term-item");
  for (var j = 0; j < items.length; j++) {
    (function (elx) {
      elx.onclick = function () { menuActivate(elx); };
      elx.onkeydown = function (e) {
        e = e || window.event;
        if (e.key === "Enter" || e.key === " ") {
          if (e.preventDefault) e.preventDefault();
          menuActivate(elx);
        }
      };
    })(items[j]);
  }
}

function menuActivate(elx) {
  var mpk = elx.getAttribute("data-mp");
  if (mpk) {
    if (mpk === "c" && typeof mpShowCreate === "function") { mpShowCreate(); return; }
    if (mpk === "j" && typeof mpShowJoin === "function") { mpShowJoin(); return; }
    if (mpk === "r" && typeof renderRoom !== "undefined") { showView(renderRoom); return; }
    return;
  }
  var gi = elx.getAttribute("data-i");
  if (gi === null) return;
  var g = GAMES[parseInt(gi, 10)];
  if (!g) return;
  if (g.mp && typeof MP !== "undefined" && MP.inRoom && MP.inRoom() &&
      typeof mpQueue === "function") {
    mpQueue(g.mp);
    return;
  }
  showView(g.view);
}
/* ============================================================
   Init
   ============================================================ */
function setLang(l) {
  lang = l;
  save.lang = l;
  persist();
  updateHUD();
  if (currentView) currentView();
}

function init() {
  app = document.getElementById("app");
  save = loadSave();
  if (save.lang === "pl" || save.lang === "en") {
    lang = save.lang;
  } else if (typeof navigator !== "undefined" && navigator.language &&
             navigator.language.toLowerCase().indexOf("pl") === 0) {
    lang = "pl";
  }
  document.getElementById("btn-en").onclick = function () { setLang("en"); };
  document.getElementById("btn-pl").onclick = function () { setLang("pl"); };
  updateHUD();
  if (maybeDailyBonus()) {
    updateHUD();
    toast(t("dailyBonus"));
  }
  showView(renderMenu);
}

if (typeof document !== "undefined" && document.getElementById && document.getElementById("app")) {
  init();
}

/* export pure logic for tests (Node etc.) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    I18N: I18N,
    t: t,
    colorOf: colorOf,
    checkTTT: checkTTT,
    findTTTWin: findTTTWin,
    tttMove: tttMove,
    minimaxTTT: minimaxTTT,
    makeMathQuestion: makeMathQuestion,
    bjValue: bjValue,
    hangAlphabet: hangAlphabet
  };
}
