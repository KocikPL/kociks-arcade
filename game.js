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
  credit(owns("clock") ? 100 : 50);
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
    if (owns("calc")) st.rate *= 2;
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
      if (owns("detector")) {
        for (var mi = 0; mi < st.mine.length; mi++) {
          if (st.mine[mi]) { st.flg[mi] = true; break; }
        }
      }
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
  { id: "clover", icon: "+10%", price: 500, name: "itmClover", desc: "itmCloverD" },
  { id: "calc", icon: "x2", price: 250, name: "itmCalc", desc: "itmCalcD" },
  { id: "clock", icon: "+100", price: 350, name: "itmClock", desc: "itmClockD" },
  { id: "paddle", icon: "50%", price: 200, name: "itmPaddle", desc: "itmPaddleD" },
  { id: "detector", icon: "SONAR", price: 300, name: "itmDetector", desc: "itmDetectorD" },
  { id: "ball", icon: "+1", price: 200, name: "itmBall", desc: "itmBallD" },
  { id: "tip", icon: "TIP", price: 150, name: "itmTip", desc: "itmTipD" }
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
  var st = { w: 600, h: 300, pw: 10, ph: (owns("paddle") ? 90 : 60), bs: 10, ball: {x:300,y:150,vx:3,vy:2}, paddleY: 120, aiY: 120, score: 0, aiScore: 0, timer: 0, over: false, log: [], target: 5 };
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
   Connect Four helpers (shared by SP views and multiplayer)
   ============================================================ */
function c4Drop(board, col) {
  for (var r = 5; r >= 0; r--) if (board[r * 7 + col] === " ") return r;
  return -1;
}
function c4Cols(board) {
  var a = [];
  for (var c = 0; c < 7; c++) if (board[c] === " ") a.push(c);
  return a;
}
function c4Result(b) {
  var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (var r = 0; r < 6; r++) {
    for (var c = 0; c < 7; c++) {
      var v = b[r * 7 + c];
      if (v === " ") continue;
      for (var d = 0; d < 4; d++) {
        var rr = r, cc = c, cnt = 0;
        while (cnt < 4 && rr >= 0 && rr < 6 && cc >= 0 && cc < 7 && b[rr * 7 + cc] === v) {
          cnt++; rr += dirs[d][0]; cc += dirs[d][1];
        }
        if (cnt >= 4) return v;
      }
    }
  }
  if (b.indexOf(" ") !== -1) return null;
  return "tie";
}
function c4TryWin(b, mark) {
  var cols = c4Cols(b);
  for (var i = 0; i < cols.length; i++) {
    var r = c4Drop(b, cols[i]);
    b[r * 7 + cols[i]] = mark;
    var won = c4Result(b) === mark;
    b[r * 7 + cols[i]] = " ";
    if (won) return cols[i];
  }
  return null;
}
function c4MakesThree(b, mark) {
  var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  var cols = c4Cols(b);
  for (var i = 0; i < cols.length; i++) {
    var r = c4Drop(b, cols[i]);
    b[r * 7 + cols[i]] = mark;
    var found = false;
    for (var rr = 0; rr < 6 && !found; rr++) {
      for (var cc = 0; cc < 7 && !found; cc++) {
        if (b[rr * 7 + cc] !== mark) continue;
        for (var d = 0; d < 4 && !found; d++) {
          var vals = [], ar = rr, ac = cc, ok = true;
          for (var k = 0; k < 4; k++) {
            if (ar >= 0 && ar < 6 && ac >= 0 && ac < 7) {
              vals.push(b[ar * 7 + ac]); ar += dirs[d][0]; ac += dirs[d][1];
            } else { ok = false; break; }
          }
          if (ok && vals.length === 4 && vals.join("").split(mark).length === 3 &&
              vals.join("").split(" ").length === 2) found = true;
        }
      }
    }
    b[r * 7 + cols[i]] = " ";
    if (found) return cols[i];
  }
  return null;
}
function c4CompMove(b, level) {
  var cols = c4Cols(b);
  if (!cols.length) return null;
  var win = c4TryWin(b, "O");
  if (level === 1) {
    if (win !== null && Math.random() < 0.4) return win;
    return cols[Math.floor(Math.random() * cols.length)];
  }
  if (win !== null) return win;
  var block = c4TryWin(b, "X");
  if (level === 2) {
    if (block !== null) return block;
    if (cols.indexOf(3) !== -1 && Math.random() < 0.7) return 3;
    return cols[Math.floor(Math.random() * cols.length)];
  }
  if (block !== null) return block;
  var mine = c4MakesThree(b, "O");
  if (mine !== null) return mine;
  var stop = c4MakesThree(b, "X");
  if (stop !== null) return stop;
  if (cols.indexOf(3) !== -1 && Math.random() < 0.8) return 3;
  return cols[Math.floor(Math.random() * cols.length)];
}

/* ============================================================
   GAME: Connect Four (single player)
   ============================================================ */
function viewC4() {
  var body = mountPanel("c4Name");
  var st = { board: null, level: 0, over: true, busy: false };

  function renderDiff() {
    body.innerHTML =
      '<p class="hint">' + esc(t("c4Intro")) + "</p>" +
      '<div class="diff-row">' +
        c4Diff(1, t("levelEasy"), t("c4EasySub"), 15) +
        c4Diff(2, t("levelMedium"), t("c4MedSub"), 50) +
        c4Diff(3, t("levelHard"), t("c4HardSub"), 250) +
      "</div>";
    var btns = body.getElementsByClassName("diff-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { start(parseInt(b.getAttribute("data-l"), 10)); };
      })(btns[i]);
    }
  }
  function c4Diff(l, name, sub, prize) {
    return '<button class="diff-btn" type="button" data-l="' + l + '">' +
      '<div class="d-name">' + esc(name) + "</div>" +
      '<div class="d-sub">' + esc(sub) + "<br>" +
      esc(t("prizeWord") + " " + prize) + "</div></button>";
  }

  function start(level) {
    st.level = level;
    st.board = [];
    for (var i = 0; i < 42; i++) st.board.push(" ");
    st.over = false;
    st.busy = false;
    body.innerHTML =
      '<div class="c4-grid" id="c4-grid"></div>' +
      '<p class="hint" id="c4-msg"></p>' +
      '<div class="feed" id="g-feed"></div>';
    paint();
  }

  function paint() {
    var g = document.getElementById("c4-grid");
    var h = "", i;
    for (i = 0; i < 42; i++) {
      var v = st.board[i];
      h += '<div class="c4-cell' + (v !== " " ? " filled" : "") +
        '" data-c="' + (i % 7) + '">' +
        (v === "X" ? '<span class="c4-x">&#9679;</span>' :
         v === "O" ? '<span class="c4-o">&#9675;</span>' : "") + "</div>";
    }
    g.innerHTML = h;
    var cells = g.getElementsByClassName("c4-cell");
    for (i = 0; i < cells.length; i++) {
      (function (cell) {
        cell.onclick = function () {
          if (st.over || st.busy) return;
          playerMove(parseInt(cell.getAttribute("data-c"), 10));
        };
      })(cells[i]);
    }
  }

  function setMsg(s) {
    var el = document.getElementById("c4-msg");
    if (el) el.textContent = s;
  }

  function playerMove(col) {
    var row = c4Drop(st.board, col);
    if (row < 0) { feedLine(body, t("c4Full"), "bad"); return; }
    st.board[row * 7 + col] = "X";
    var r = c4Result(st.board);
    if (r) { paint(); finish(r); return; }
    st.busy = true;
    setMsg(t("tttThinking"));
    paint();
    setTimeout(function () {
      var mv = c4CompMove(st.board, st.level);
      if (mv !== null) {
        var rr = c4Drop(st.board, mv);
        st.board[rr * 7 + mv] = "O";
      }
      st.busy = false;
      var r2 = c4Result(st.board);
      paint();
      if (r2) finish(r2);
      else setMsg("");
    }, 350);
  }

  function finish(r) {
    st.over = true;
    setMsg("");
    var prize = 0, msg;
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
    againBtn(body, function () { viewC4(); });
  }

  renderDiff();
}

/* ============================================================
   GAME: Connect Four (multiplayer)
   ============================================================ */
function viewMPC4() {
  var body = mountPanel("c4Name");

  MP.onGame = function (m) {
    if (m.t === "c4_state" && MP.match) {
      MP.match.board = m.board;
      MP.match.turn = m.turn;
      MP.match.over = false;
      paint();
    } else if (m.t === "c4_over" && MP.match) {
      MP.match.board = m.board;
      MP.match.over = true;
      paint();
      var kind = m.winner === null ? "draw" : (m.winner === MP.selfId ? "win" : "lose");
      mpFinish(body, kind, 40);
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
    var g = document.getElementById("c4-grid");
    if (!g) { body.innerHTML = base(); g = document.getElementById("c4-grid"); }
    var h = "", i;
    for (i = 0; i < 42; i++) {
      var v = m.board[i];
      h += '<div class="c4-cell' + (v !== " " ? " filled" : "") +
        '" data-c="' + (i % 7) + '">' +
        (v === "X" ? '<span class="c4-x">&#9679;</span>' :
         v === "O" ? '<span class="c4-o">&#9675;</span>' : "") + "</div>";
    }
    g.innerHTML = h;
    var cells = g.getElementsByClassName("c4-cell");
    for (i = 0; i < cells.length; i++) {
      (function (cell) {
        cell.onclick = function () {
          var mm = MP.match;
          if (!mm || mm.over || !myTurn()) return;
          if (c4Drop(mm.board, parseInt(cell.getAttribute("data-c"), 10)) < 0) return;
          mpSendMsg({ t: "c4", col: parseInt(cell.getAttribute("data-c"), 10) });
        };
      })(cells[i]);
    }
    var msg = document.getElementById("c4-msg");
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
      '<div class="c4-grid" id="c4-grid"></div>' +
      '<p class="hint" id="c4-msg"></p>' +
      '<div class="feed" id="g-feed"></div>';
  }

  if (MP.match && MP.match.board) { paint(); }
  else { body.innerHTML = base(); }
}

/* ============================================================
   GAME: 2048
   ============================================================ */
function view2048() {
  var body = mountPanel("g2048Name");
  var st = { g: [], score: 0, over: false, reached: false };

  function spawn() {
    var empty = [], r, c;
    for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) if (st.g[r][c] === 0) empty.push([r, c]);
    if (!empty.length) return;
    var p = empty[Math.floor(Math.random() * empty.length)];
    st.g[p[0]][p[1]] = Math.random() < 0.1 ? 4 : 2;
    st.lastSpawn = [p[0], p[1]];
  }

  function slideLine(line) {
    var vals = line.filter(function (v) { return v !== 0; });
    var out = [], merged = [], gained = 0, i = 0;
    while (i < vals.length) {
      if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
        out.push(vals[i] * 2);
        merged.push(true);
        gained += vals[i] * 2;
        i += 2;
      } else {
        out.push(vals[i]);
        merged.push(false);
        i += 1;
      }
    }
    while (out.length < 4) { out.push(0); merged.push(false); }
    return { line: out, gained: gained, merged: merged };
  }

  function move(dir) { /* 0=left 1=right 2=up 3=down */
    var moved = false, k, old, line, res, nv, flags, q;
    st.merged = [];
    for (k = 0; k < 4; k++) {
      if (dir === 0 || dir === 1) old = st.g[k].slice(0);
      else old = [st.g[0][k], st.g[1][k], st.g[2][k], st.g[3][k]];
      line = (dir === 1 || dir === 3) ? old.slice(0).reverse() : old.slice(0);
      res = slideLine(line);
      nv = (dir === 1 || dir === 3) ? res.line.slice(0).reverse() : res.line;
      flags = (dir === 1 || dir === 3) ? res.merged.slice(0).reverse() : res.merged;
      for (q = 0; q < 4; q++) {
        if (flags[q]) st.merged.push(dir <= 1 ? [k, q] : [q, k]);
      }
      st.score += res.gained;
      if (nv.join() !== old.join()) moved = true;
      if (dir === 0 || dir === 1) st.g[k] = nv;
      else for (var r = 0; r < 4; r++) st.g[r][k] = nv[r];
    }
    return moved;
  }

  function hasMoves() {
    var r, c;
    for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) {
      if (st.g[r][c] === 0) return true;
      if (c < 3 && st.g[r][c] === st.g[r][c + 1]) return true;
      if (r < 3 && st.g[r][c] === st.g[r + 1][c]) return true;
    }
    return false;
  }

  function start() {
    st.g = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    st.score = 0;
    st.over = false;
    st.reached = false;
    st.lastSpawn = null;
    st.merged = [];
    spawn();
    spawn();
    body.innerHTML =
      '<p class="hint">' + esc(t("g2048Rule")) + "</p>" +
      '<div class="mp-score" id="g2048-score">0</div>' +
      '<div class="g2048-grid" id="g2048-grid"></div>' +
      '<div class="g2048-controls">' +
        '<button class="btn ghost" data-d="0" type="button">&#9664; left</button>' +
        '<button class="btn ghost" data-d="2" type="button">&#9650; up</button>' +
        '<button class="btn ghost" data-d="3" type="button">&#9660; down</button>' +
        '<button class="btn ghost" data-d="1" type="button">right &#9654;</button>' +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    var btns = body.getElementsByClassName("btn");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        var d = b.getAttribute("data-d");
        if (d === null) return;
        b.onclick = function () { doMove(parseInt(d, 10)); };
      })(btns[i]);
    }
    paint();
  }

  function paint() {
    var g = document.getElementById("g2048-grid");
    if (!g) return;
    var h = "", r, c;
    for (r = 0; r < 4; r++) {
      for (c = 0; c < 4; c++) {
        var v = st.g[r][c];
        var cls = "g2048-cell" + (v ? " n" + (v <= 2048 ? v : 2048) : "");
        if (st.lastSpawn && st.lastSpawn[0] === r && st.lastSpawn[1] === c) cls += " new";
        if (st.merged) {
          for (var mi = 0; mi < st.merged.length; mi++) {
            if (st.merged[mi][0] === r && st.merged[mi][1] === c) { cls += " merged"; break; }
          }
        }
        h += '<div class="' + cls + '">' + (v ? v : "") + "</div>";
      }
    }
    g.innerHTML = h;
    var sc = document.getElementById("g2048-score");
    if (sc) sc.textContent = st.score;
  }

  function doMove(dir) {
    if (st.over) return;
    if (!move(dir)) return;
    spawn();
    paint();
    if (!st.reached) {
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
        if (st.g[r][c] >= 2048) {
          st.reached = true;
          feedLine(body, t("g2048Reached"), "gold");
        }
      }
    }
    if (!hasMoves()) {
      st.over = true;
      var prize = award(Math.min(300, Math.floor(st.score / 20)));
      feedLine(body, t("g2048Over", { n: st.score }), "bad");
      if (prize) feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
      updateHUD();
      againBtn(body, function () { view2048(); });
    }
  }

  function onKey(e) {
    if (!document.getElementById("g2048-grid")) return;
    var dirs = { ArrowLeft: 0, a: 0, A: 0, ArrowRight: 1, d: 1, D: 1,
                 ArrowUp: 2, w: 2, W: 2, ArrowDown: 3, s: 3, S: 3 };
    if (e.key in dirs) {
      if (e.preventDefault) e.preventDefault();
      doMove(dirs[e.key]);
    }
  }
  document.addEventListener("keydown", onKey);

  start();
}

/* ============================================================
   SECRET CODE + BONUS GAMES (psp proszkow / hint: a school)
   ============================================================ */
function bonusUnlocked() {
  try { return localStorage.getItem("kac_bonus") === "1"; } catch (e) { return false; }
}
function normalizeCode(v) {
  return String(v || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function menuGames() {
  if (!bonusUnlocked()) return GAMES;
  var out = [], i;
  for (i = 0; i < GAMES.length; i++) {
    if (GAMES[i].view === viewShop) out = out.concat(BONUS_GAMES);
    out.push(GAMES[i]);
  }
  return out;
}
function codeBarHtml() {
  if (bonusUnlocked()) {
    return '<div class="codebar ok">[ code accepted - 2 secret games unlocked ]</div>';
  }
  return '<div class="codebar">' +
    '<div class="codebar-row">' +
      '<span class="codebar-label">[ secret code ]</span>' +
      '<input class="code-input" id="code-input" maxlength="24" autocomplete="off" spellcheck="false" placeholder="...">' +
      '<button class="btn small" id="code-go" type="button">OK</button>' +
    "</div>" +
    '<div class="codebar-hint">' + esc(t("codeHint")) + "</div>" +
    "</div>";
}
function tryBonusCode() {
  var inp = document.getElementById("code-input");
  if (!inp) return;
  if (normalizeCode(inp.value) === "psp proszkow") {
    try { localStorage.setItem("kac_bonus", "1"); } catch (e) {}
    toast(t("codeOk"));
    renderMenu();
  } else {
    toast(t("codeBad"));
    if (inp) inp.value = "";
  }
}

/* ============================================================
   BONUS GAME: Reaction Test
   ============================================================ */
function viewReaction() {
  var body = mountPanel("rxName");
  var st = { state: 0, t0: 0, timer: 0 };
  body.innerHTML =
    '<p class="hint">' + esc(t("rxRule")) + "</p>" +
    '<div class="rx-pad" id="rx-pad">' + esc(t("rxStart")) + "</div>" +
    '<div class="feed" id="g-feed"></div>';
  var pad = document.getElementById("rx-pad");
  pad.onclick = function () {
    if (st.state === 0) {
      st.state = 1;
      pad.className = "rx-pad wait";
      pad.textContent = t("rxWait");
      st.timer = setTimeout(function () {
        st.state = 2;
        st.t0 = new Date().getTime();
        pad.className = "rx-pad go";
        pad.textContent = t("rxGo");
      }, 900 + Math.floor(Math.random() * 2600));
    } else if (st.state === 1) {
      clearTimeout(st.timer);
      st.state = 0;
      pad.className = "rx-pad";
      pad.textContent = t("rxStart");
      feedLine(body, t("rxEarly"), "bad");
    } else if (st.state === 2) {
      var ms = new Date().getTime() - st.t0;
      st.state = 0;
      pad.className = "rx-pad";
      pad.textContent = ms + " ms - " + t("rxRetry");
      var prize = ms < 250 ? 40 : (ms < 350 ? 25 : (ms < 500 ? 10 : 0));
      feedLine(body, t("rxTime", { n: ms }), prize ? "good" : "");
      if (prize) {
        var p = award(prize);
        feedLine(body, t("prizeWon", { n: p }), "gold");
        prizeToast(p);
        updateHUD();
      }
    }
  };
}

/* ============================================================
   BONUS GAME: Dice (bet high / low, 7 pushes)
   ============================================================ */
function viewDice() {
  var body = mountPanel("diceName");
  var st = { busy: false };

  function renderPlay() {
    var max = points();
    var h = '<p class="hint">' + esc(t("diceRule")) + "</p>";
    h += '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
      '<input class="num-input" id="dice-bet" type="number" min="0" max="' + max +
      '" value="' + Math.min(10, max) + '"></div>';
    h += '<div class="dice-face" id="dice-face">? + ?</div>';
    h += '<div class="mp-row">' +
      '<button class="btn" id="dice-high" type="button">&#9650; ' + esc(t("diceHigh")) + " (8-12)</button>" +
      '<button class="btn alt" id="dice-low" type="button">&#9660; ' + esc(t("diceLow")) + " (2-6)</button>" +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    body.innerHTML = h;
    document.getElementById("dice-high").onclick = function () { roll(1); };
    document.getElementById("dice-low").onclick = function () { roll(0); };
  }

  function roll(high) {
    if (st.busy) return;
    var betEl = document.getElementById("dice-bet");
    var b = parseInt(betEl ? betEl.value : "0", 10);
    if (isNaN(b) || b < 0) b = 0;
    if (b > points()) b = points();
    if (b > 0 && !spend(b)) return;
    st.busy = true;
    var face = document.getElementById("dice-face");
    var spins = 0;
    var iv = setInterval(function () {
      spins++;
      if (spins > 7) {
        clearInterval(iv);
        var a = 1 + Math.floor(Math.random() * 6);
        var c = 1 + Math.floor(Math.random() * 6);
        var sum = a + c;
        face.textContent = a + " + " + c + " = " + sum;
        face.className = "dice-face land";
        settle(b, high, sum);
        st.busy = false;
      } else {
        face.className = "dice-face spin";
        face.textContent = (1 + Math.floor(Math.random() * 6)) + " + " +
          (1 + Math.floor(Math.random() * 6)) + " ...";
      }
    }, 90);
  }

  function settle(b, high, sum) {
    if (sum === 7) {
      credit(b);
      feedLine(body, t("diceRoll", { s: sum }) + " - " + t("dicePush"), "");
    } else if ((sum >= 8) === !!high) {
      credit(b * 2);
      var p = b > 0 ? b : 0;
      feedLine(body, t("diceRoll", { s: sum }) + " - " + t("diceWin", { n: p }), "good");
      if (b > 0) { prizeToast(b); }
    } else {
      feedLine(body, t("diceRoll", { s: sum }) + " - " +
        (b > 0 ? t("diceLose", { n: b }) : t("diceLose", { n: 0 })), "bad");
    }
    updateHUD();
  }

  renderPlay();
}

/* ============================================================
   NEW GAME: Sequence (normal, free earner)
   ============================================================ */
function viewSequence() {
  var body = mountPanel("seqName");
  var st = { round: 1, seq: [], input: 0, phase: "idle", passed: 0 };
  var PAD = ["\u25B2", "\u25CF", "\u25A0", "\u2605"];

  function buildPad(g) {
    var h = "", i;
    for (i = 0; i < 4; i++) {
      h += '<button class="seq-btn" type="button" data-i="' + i + '">' + PAD[i] + "</button>";
    }
    g.innerHTML = h;
    var btns = g.getElementsByClassName("seq-btn");
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () { onPick(parseInt(b.getAttribute("data-i"), 10)); };
      })(btns[i]);
    }
  }

  function setMsg(s) {
    var el = document.getElementById("seq-msg");
    if (el) el.textContent = s;
  }

  function lightUp(i, cb) {
    var grid = document.getElementById("seq-grid");
    if (!grid) { if (cb) cb(); return; }
    var btns = grid.getElementsByClassName("seq-btn");
    if (btns[i]) btns[i].className = "seq-btn lit";
    setTimeout(function () {
      var b2 = grid.getElementsByClassName("seq-btn");
      if (b2[i]) b2[i].className = "seq-btn";
      if (cb) cb();
    }, 300);
  }

  function renderIdle() {
    body.innerHTML =
      '<p class="hint">' + esc(t("seqRule")) + "</p>" +
      '<div class="mp-row"><button class="btn" id="seq-start" type="button">' +
        esc(t("seqStart")) + "</button></div>" +
      '<div class="seq-grid" id="seq-grid"></div>' +
      '<p class="hint" id="seq-msg"></p>' +
      '<div class="feed" id="g-feed"></div>';
    buildPad(document.getElementById("seq-grid"));
    setMsg(t("seqIdle"));
    document.getElementById("seq-start").onclick = nextRound;
  }

  function nextRound() {
    st.phase = "show";
    setMsg(t("seqWatch") + " " + t("seqRound", { n: st.round }));
    st.seq.push(Math.floor(Math.random() * 4));
    showSeq(0);
  }

  function showSeq(k) {
    if (k >= st.seq.length) {
      st.phase = "input";
      st.input = 0;
      setMsg(t("seqTurn"));
      return;
    }
    lightUp(st.seq[k], function () {
      setTimeout(function () { showSeq(k + 1); }, 160);
    });
  }

  function onPick(i) {
    if (st.phase !== "input") return;
    lightUp(i, null);
    if (st.seq[st.input] === i) {
      st.input++;
      if (st.input >= st.seq.length) {
        st.passed = st.round;
        st.round++;
        st.phase = "wait";
        setMsg("\u2713 " + t("seqRound", { n: st.round }));
        setTimeout(nextRound, 700);
      }
    } else {
      st.phase = "over";
      var prize = award(Math.min(300, st.passed * 15));
      feedLine(body, t("seqFail", { n: st.passed }), "bad");
      if (prize) {
        feedLine(body, t("prizeWon", { n: prize }), "gold");
        prizeToast(prize);
      }
      updateHUD();
      againBtn(body, function () { viewSequence(); });
    }
  }

  renderIdle();
}

/* ============================================================
   BONUS: Slots
   ============================================================ */
function viewSlots() {
  var body = mountPanel("slotName");
  var st = { busy: false };
  var SYMS = ["7", "BAR", "*", "O", "X"];

  function render() {
    var max = points();
    body.innerHTML =
      '<p class="hint">' + esc(t("slotRule")) + "</p>" +
      '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="slot-bet" type="number" min="0" max="' + max +
        '" value="' + Math.min(10, max) + '"></div>' +
      '<div class="slot-face" id="slot-face"><span>?</span><span>?</span><span>?</span></div>' +
      '<div class="mp-row"><button class="btn" id="slot-spin" type="button">' +
        esc(t("slotSpin")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("slot-spin").onclick = spin;
  }

  function faceHtml(a, b, c) {
    return "<span>" + a + "</span><span>" + b + "</span><span>" + c + "</span>";
  }

  function spin() {
    if (st.busy) return;
    var betEl = document.getElementById("slot-bet");
    var b = parseInt(betEl ? betEl.value : "0", 10);
    if (isNaN(b) || b < 0) b = 0;
    if (b > points()) b = points();
    if (b > 0 && !spend(b)) return;
    st.busy = true;
    var face = document.getElementById("slot-face");
    var n = 0;
    var iv = setInterval(function () {
      n++;
      if (n > 9) {
        clearInterval(iv);
        var r = [pick(SYMS), pick(SYMS), pick(SYMS)];
        face.innerHTML = faceHtml(r[0], r[1], r[2]);
        settle(b, r);
        st.busy = false;
      } else {
        face.innerHTML = faceHtml(pick(SYMS), pick(SYMS), pick(SYMS));
      }
    }, 90);
  }

  function settle(b, r) {
    var triple = r[0] === r[1] && r[1] === r[2];
    var pair = !triple && (r[0] === r[1] || r[0] === r[2] || r[1] === r[2]);
    if (triple) {
      var win = b * 5;
      credit(win);
      feedLine(body, t("slotTriple"), "gold");
      feedLine(body, b > 0 ? t("slotWin", { n: win }) : t("slotFree"),
               b > 0 ? "good" : "");
      if (b > 0) prizeToast(win);
    } else if (pair) {
      var back = b * 2;
      credit(back);
      feedLine(body, t("slotPair"), "");
      feedLine(body, b > 0 ? t("slotWin", { n: back }) : t("slotFree"), "");
    } else {
      feedLine(body, t("slotLose", { n: b }), "bad");
    }
    updateHUD();
  }

  render();
}

/* ============================================================
   BONUS: Double or Nothing
   ============================================================ */
function viewDouble() {
  var body = mountPanel("dodName");
  var st = { pot: 0, flip: 0, over: true, busy: false };

  function renderStart() {
    st.over = false;
    st.flip = 0;
    st.busy = false;
    var max = points();
    body.innerHTML =
      '<p class="hint">' + esc(t("dodRule")) + "</p>" +
      '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="dod-bet" type="number" min="1" max="' + max +
        '" value="' + Math.min(20, max) + '"></div>' +
      '<div class="mp-row"><button class="btn" id="dod-go" type="button">' +
        esc(t("startBtn")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("dod-go").onclick = function () {
      var b = parseInt(document.getElementById("dod-bet").value, 10);
      if (isNaN(b) || b < 1) b = 1;
      if (b > points()) b = points();
      if (!spend(b)) return;
      st.pot = b;
      renderPlay();
    };
  }

  function renderPlay() {
    body.innerHTML =
      '<div class="mp-score">' + esc(t("dodPot", { n: st.pot })) + " - " +
        esc(t("dodRound", { n: st.flip + 1 })) + "</div>" +
      '<div class="mp-row">' +
        '<button class="btn" id="dod-h" type="button">' + esc(t("dodHeads")) + "</button>" +
        '<button class="btn alt" id="dod-t" type="button">' + esc(t("dodTails")) + "</button>" +
        (st.flip > 0 ? '<button class="btn gold" id="dod-cash" type="button">' +
          esc(t("dodCash", { n: st.pot })) + "</button>" : "") +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("dod-h").onclick = function () { flip("H"); };
    document.getElementById("dod-t").onclick = function () { flip("T"); };
    var cash = document.getElementById("dod-cash");
    if (cash) cash.onclick = cashOut;
  }

  function flip(call) {
    if (st.busy || st.over) return;
    st.busy = true;
    var res = Math.random() < 0.5 ? "H" : "T";
    var name = res === "H" ? t("dodHeads") : t("dodTails");
    if (call === res) {
      st.pot *= 2;
      st.flip++;
      feedLine(body, t("dodResult", { s: name, n: st.pot }), "good");
      if (st.flip >= 8) {
        credit(st.pot);
        feedLine(body, t("dodMax", { n: st.pot }), "gold");
        finish();
        return;
      }
      st.busy = false;
      renderPlay();
    } else {
      feedLine(body, t("dodBusted", { s: name, n: st.pot }), "bad");
      finish();
    }
  }

  function cashOut() {
    if (st.busy || st.over) return;
    credit(st.pot);
    feedLine(body, t("dodCashed", { n: st.pot }), "gold");
    updateHUD();
    finish();
  }

  function finish() {
    st.over = true;
    updateHUD();
    againBtn(body, function () { viewDouble(); });
  }

  renderStart();
}

/* ============================================================
   BONUS: Typing Speed
   ============================================================ */
function viewTyping() {
  var body = mountPanel("typeName");
  var PHRASES = [
    "the quick brown fox jumps over the lazy dog",
    "small boxes pack big quiz questions",
    "never write code with sticky keys on",
    "arcade nights need popcorn and juice",
    "typing fast is fun when robots watch",
    "secret codes open secret games here"
  ];
  var st = { text: "", start: 0 };

  function render() {
    st.text = pick(PHRASES);
    st.start = 0;
    body.innerHTML =
      '<p class="hint">' + esc(t("typeRule")) + "</p>" +
      '<div class="type-target" id="type-target">' + esc(st.text) + "</div>" +
      '<input class="text-input type-input" id="type-in" type="text" autocomplete="off" ' +
        'spellcheck="false" placeholder="' + esc(t("typePlaceholder")) + '">' +
      '<div class="feed" id="g-feed"></div>';
    var inp = document.getElementById("type-in");
    inp.oninput = function () {
      if (!st.start) st.start = new Date().getTime();
      if (inp.value === st.text) {
        var secs = (new Date().getTime() - st.start) / 1000;
        if (secs < 0.5) secs = 0.5;
        var wpm = Math.round((st.text.length / 5) / (secs / 60));
        if (wpm > 250) wpm = 250;
        feedLine(body, t("typeResult", { n: wpm, s: Math.round(secs) }), "good");
        var amount = wpm >= 45 ? 60 : (wpm >= 30 ? 35 : (wpm >= 20 ? 15 : 5));
        var p = award(amount);
        feedLine(body, t("prizeWon", { n: p }), "gold");
        prizeToast(p);
        updateHUD();
        againBtn(body, function () { viewTyping(); });
      }
    };
  }

  render();
}


/* ============================================================
   NEW GAME: Whack-a-Mole (normal)
   ============================================================ */
function viewWhack() {
  var body = mountPanel("wamName");
  var st = { score: 0, misses: 0, over: false, hole: -1, started: false, escT: 0 };

  function render() {
    body.innerHTML =
      '<p class="hint">' + esc(t("wamRule")) + "</p>" +
      '<div class="mp-row"><button class="btn" id="wam-start" type="button">' +
        esc(t("wamStart")) + "</button></div>" +
      '<div class="mp-score" id="wam-line"></div>' +
      '<div class="wam-grid" id="wam-grid"></div>' +
      '<div class="feed" id="g-feed"></div>';
    build();
    update();
    document.getElementById("wam-start").onclick = function () {
      st.started = true;
      st.score = 0;
      st.misses = 0;
      spawn();
    };
  }

  function build() {
    var g = document.getElementById("wam-grid");
    var h = "", i;
    for (i = 0; i < 9; i++) h += '<div class="wam-hole" data-i="' + i + '"></div>';
    g.innerHTML = h;
    var holes = g.getElementsByClassName("wam-hole");
    for (i = 0; i < holes.length; i++) {
      (function (el) {
        el.onclick = function () { whack(parseInt(el.getAttribute("data-i"), 10)); };
      })(holes[i]);
    }
  }

  function update() {
    var el = document.getElementById("wam-line");
    if (el) el.textContent = t("wamLine", { n: st.score, m: st.misses });
  }

  function paint() {
    var g = document.getElementById("wam-grid");
    if (!g) return;
    var holes = g.getElementsByClassName("wam-hole");
    for (var i = 0; i < holes.length; i++) {
      holes[i].innerHTML = (i === st.hole) ? '<span class="mole">&#9679;</span>' : "";
      holes[i].className = "wam-hole" + (i === st.hole ? " up" : "");
    }
  }

  function spawn() {
    if (st.over) return;
    st.hole = Math.floor(Math.random() * 9);
    paint();
    st.escT = setTimeout(function () {
      if (st.over || st.hole === -1) return;
      st.hole = -1;
      st.misses++;
      update();
      paint();
      if (st.misses >= 3) { end(); return; }
      spawn();
    }, 1000);
  }

  function whack(i) {
    if (st.over || !st.started) return;
    if (i === st.hole) {
      clearTimeout(st.escT);
      st.hole = -1;
      st.score++;
      update();
      paint();
      spawn();
    } else {
      st.misses++;
      update();
      if (st.misses >= 3) end();
    }
  }

  function end() {
    st.over = true;
    clearTimeout(st.escT);
    st.hole = -1;
    paint();
    var prize = award(Math.min(150, st.score * 5));
    feedLine(body, t("wamOver", { n: st.score }), st.misses >= 3 ? "bad" : "");
    if (prize) {
      feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
    }
    updateHUD();
    againBtn(body, function () { viewWhack(); });
  }

  render();
}

/* ============================================================
   BONUS: Mastermind
   ============================================================ */
function viewMastermind() {
  var body = mountPanel("mmName");
  var st = { code: [], tries: 10, over: false };

  function newCode() {
    var pool = [1, 2, 3, 4, 5, 6, 7, 8];
    st.code = [];
    for (var i = 0; i < 4; i++) {
      st.code.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
  }

  function render() {
    newCode();
    st.tries = 10;
    st.over = false;
    body.innerHTML =
      '<p class="hint">' + esc(t("mmRule")) + "</p>" +
      '<div class="mp-row">' +
        '<input class="num-input" id="mm-in" maxlength="4" placeholder="1234">' +
        '<button class="btn" id="mm-go" type="button">' + esc(t("mmGuess")) + "</button>" +
      "</div>" +
      '<p class="hint" id="mm-left"></p>' +
      '<div class="feed" id="g-feed"></div>';
    updLeft();
    document.getElementById("mm-go").onclick = guess;
    document.getElementById("mm-in").onkeydown = function (e) {
      e = e || window.event;
      if (e.keyCode === 13) guess();
    };
  }

  function updLeft() {
    var el = document.getElementById("mm-left");
    if (el) el.textContent = t("mmLeft", { n: st.tries });
  }

  function guess() {
    if (st.over) return;
    var inp = document.getElementById("mm-in");
    var digits = [];
    var s = String(inp.value || "");
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) >= "1" && s.charAt(i) <= "8") digits.push(parseInt(s.charAt(i), 10));
    }
    var uniq = {};
    var dup = false;
    for (i = 0; i < digits.length; i++) {
      if (uniq[digits[i]]) dup = true;
      uniq[digits[i]] = 1;
    }
    if (digits.length !== 4 || dup) { feedLine(body, t("mmBad"), "bad"); return; }
    st.tries--;
    var a = 0, b = 0;
    for (i = 0; i < 4; i++) {
      if (digits[i] === st.code[i]) a++;
      else if (st.code.indexOf(digits[i]) !== -1) b++;
    }
    feedLine(body, t("mmFb", { g: digits.join(""), a: a, b: b }), "");
    updLeft();
    inp.value = "";
    if (a === 4) {
      st.over = true;
      var p = award(60);
      feedLine(body, t("mmWin", { n: 10 - st.tries }), "good");
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
      againBtn(body, function () { viewMastermind(); });
      return;
    }
    if (st.tries <= 0) {
      st.over = true;
      var c = award(10);
      feedLine(body, t("mmLose", { c: st.code.join("") }), "bad");
      feedLine(body, t("prizeWon", { n: c }), "gold");
      updateHUD();
      againBtn(body, function () { viewMastermind(); });
    }
  }

  render();
}

/* ============================================================
   BONUS: Tower of Hanoi
   ============================================================ */
function viewHanoi() {
  var body = mountPanel("hanoiName");
  var st = { pegs: [[4, 3, 2, 1], [], []], sel: null, moves: 0, over: false };

  function render() {
    var h = '<p class="hint">' + esc(t("hanoiRule")) + "</p>";
    h += '<div class="hanoi-board">';
    for (var p = 0; p < 3; p++) {
      h += '<div class="hanoi-peg' + (st.sel === p ? " sel" : "") + '" data-p="' + p + '">';
      var stack = st.pegs[p];
      for (var k = stack.length - 1; k >= 0; k--) {
        var sz = stack[k];
        h += '<div class="hanoi-disc" style="width:' + (34 + sz * 24) +
          "px;background:#" + ["888888", "aaaaaa", "cccccc", "eeeeee"][sz - 1] + '"></div>';
      }
      h += '<div class="hanoi-peg-label">' + "ABC".charAt(p) + "</div></div>";
    }
    h += "</div>" +
      '<p class="hint" id="hanoi-msg">' + esc(t("hanoiHelp")) + " (" + st.moves + ")</p>" +
      '<div class="mp-row"><button class="btn ghost" id="hanoi-reset" type="button">reset</button></div>' +
      '<div class="feed" id="g-feed"></div>';
    body.innerHTML = h;
    var pgs = body.getElementsByClassName("hanoi-peg");
    for (var i = 0; i < pgs.length; i++) {
      (function (el) {
        el.onclick = function () { clickPeg(parseInt(el.getAttribute("data-p"), 10)); };
      })(pgs[i]);
    }
    document.getElementById("hanoi-reset").onclick = function () {
      st.pegs = [[4, 3, 2, 1], [], []];
      st.sel = null;
      st.moves = 0;
      render();
    };
  }

  function setMsg(s) {
    var el = document.getElementById("hanoi-msg");
    if (el) el.textContent = s;
  }

  function clickPeg(p) {
    if (st.over) return;
    if (st.sel === null) {
      if (!st.pegs[p].length) return;
      st.sel = p;
      render();
      return;
    }
    if (st.sel === p) { st.sel = null; render(); return; }
    var from = st.pegs[st.sel];
    var to = st.pegs[p];
    var disc = from[from.length - 1];
    if (to.length && to[to.length - 1] < disc) {
      feedLine(body, t("hanoiIll"), "bad");
      st.sel = null;
      render();
      return;
    }
    to.push(from.pop());
    st.moves++;
    st.sel = null;
    if (st.pegs[2].length === 4) {
      st.over = true;
      var m = st.moves;
      var prize = award(m <= 15 ? 60 : (m <= 20 ? 35 : 15));
      feedLine(body, t("hanoiWin", { n: m }), "good");
      feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
      updateHUD();
      render();
      againBtn(body, function () { viewHanoi(); });
      return;
    }
    render();
  }

  render();
}

/* ============================================================
   BONUS: Plinko
   ============================================================ */
function viewPlinko() {
  var body = mountPanel("plName");
  var st = { busy: false };
  var MULT = [0, 0.5, 1, 3, 1, 0.5, 0];
  var LAB = ["0x", "0.5x", "1x", "3x", "1x", "0.5x", "0x"];

  function render() {
    var max = points();
    var slots = "";
    for (var i = 0; i < 7; i++) slots += "<span>" + LAB[i] + "</span>";
    body.innerHTML =
      '<p class="hint">' + esc(t("plRule")) + "</p>" +
      '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="pl-bet" type="number" min="0" max="' + max +
        '" value="' + Math.min(10, max) + '"></div>' +
      '<div class="plinko-board" id="pl-board">' +
        '<div class="plinko-ball" id="pl-ball"></div>' +
        '<div class="plinko-slots">' + slots + "</div>" +
      "</div>" +
      '<div class="mp-row"><button class="btn" id="pl-drop" type="button">' +
        esc(t("plDrop")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("pl-drop").onclick = drop;
    var ball = document.getElementById("pl-ball");
    ball.style.left = (3.5 / 7 * 100) + "%";
    ball.style.top = "2%";
  }

  function drop() {
    if (st.busy) return;
    var betEl = document.getElementById("pl-bet");
    var b = parseInt(betEl ? betEl.value : "0", 10);
    if (isNaN(b) || b < 0) b = 0;
    if (b > points()) b = points();
    if (b > 0 && !spend(b)) return;
    st.busy = true;
    var ball = document.getElementById("pl-ball");
    var col = 3, row = 0;
    function step() {
      row++;
      col = Math.max(0, Math.min(6, col + (Math.floor(Math.random() * 3) - 1)));
      ball.style.left = ((col + 0.5) / 7 * 100) + "%";
      ball.style.top = (2 + row * 14) + "%";
      if (row < 6) {
        setTimeout(step, 130);
      } else {
        settle(b, MULT[col]);
        st.busy = false;
      }
    }
    setTimeout(step, 60);
  }

  function settle(b, m) {
    var gained = Math.floor(b * m);
    credit(gained);
    if (b === 0) {
      feedLine(body, t("plFree"), "");
    } else if (m === 3) {
      feedLine(body, t("plJack", { n: gained }), "gold");
      prizeToast(gained);
    } else if (m === 1) {
      feedLine(body, t("plPush"), "");
    } else if (m > 0) {
      feedLine(body, t("plHalf", { n: gained }), "");
    } else {
      feedLine(body, t("plGone"), "bad");
    }
    updateHUD();
  }

  render();
}


/* ============================================================
   NORMAL GAME: Lights Out
   ============================================================ */
function viewLights() {
  var body = mountPanel("loName");
  var st = { g: [], moves: 0, over: false };

  function toggle(r, c) {
    var offs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < 5; k++) {
      var rr = r + offs[k][0], cc = c + offs[k][1];
      if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) st.g[rr * 3 + cc] = !st.g[rr * 3 + cc];
    }
  }
  function won() {
    for (var i = 0; i < 9; i++) if (st.g[i]) return false;
    return true;
  }
  function scramble() {
    st.g = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    st.moves = 0;
    st.over = false;
    for (var n = 0; n < 6; n++) toggle(Math.floor(Math.random() * 3), Math.floor(Math.random() * 3));
    if (won()) toggle(1, 1);
  }
  function render() {
    var h = '<p class="hint">' + esc(t("loRule")) + "</p>" +
      '<div class="mp-score" id="lo-line">' + esc(t("loMoves", { n: st.moves })) + "</div>" +
      '<div class="lo-grid">';
    for (var i = 0; i < 9; i++) {
      h += '<button class="lo-cell' + (st.g[i] ? " on" : "") + '" type="button" data-i="' + i + '"></button>';
    }
    h += "</div>" + '<div class="feed" id="g-feed"></div>';
    body.innerHTML = h;
    var cells = body.getElementsByClassName("lo-cell");
    for (var j = 0; j < cells.length; j++) {
      (function (el) {
        el.onclick = function () { press(parseInt(el.getAttribute("data-i"), 10)); };
      })(cells[j]);
    }
  }
  function press(i) {
    if (st.over) return;
    toggle(Math.floor(i / 3), i % 3);
    st.moves++;
    var ln = document.getElementById("lo-line");
    if (ln) ln.textContent = t("loMoves", { n: st.moves });
    if (won()) {
      st.over = true;
      var m = st.moves;
      var prize = award(m <= 10 ? 40 : (m <= 15 ? 25 : 10));
      feedLine(body, t("loWin", { n: m }), "good");
      feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
      updateHUD();
      againBtn(body, function () { viewLights(); });
      return;
    }
    render();
  }
  scramble();
  render();
}

/* ============================================================
   NORMAL GAME: Word Scramble
   ============================================================ */
var SW_WORDS = {
  en: ["pixel", "rocket", "button", "screen", "cursor", "memory", "cable", "socket", "buffer", "vector"],
  pl: ["piksel", "ekran", "myszka", "kursor", "plik", "okno", "haslo", "kabel", "dysk", "glosnik"]
};
function swScramble(w) {
  if (w.length < 4) return w;
  var a = w.split("");
  for (var i = 0; i < 12; i++) {
    var j = Math.floor(Math.random() * a.length);
    var k = Math.floor(Math.random() * a.length);
    var tmp = a[j]; a[j] = a[k]; a[k] = tmp;
    if (a.join("") !== w) return a.join("");
  }
  var t2 = a[0]; a[0] = a[1]; a[1] = t2;
  return a.join("") === w ? w.split("").reverse().join("") : a.join("");
}
function viewScramble() {
  var body = mountPanel("swName");
  var list = SW_WORDS[lang] || SW_WORDS.en;
  var st = { word: "", scr: "", tries: 3, over: false };

  function newWord() {
    st.word = pick(list);
    st.scr = swScramble(st.word);
    st.tries = 3;
    st.over = false;
    render();
  }
  function render() {
    body.innerHTML =
      '<p class="hint">' + esc(t("swRule")) + "</p>" +
      '<div class="sw-word">' + esc(st.scr) + "</div>" +
      '<div class="mp-row"><input class="text-input" id="sw-in" maxlength="24" autocomplete="off">' +
      '<button class="btn" id="sw-go" type="button">' + esc(t("guessBtn")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("sw-go").onclick = submit;
    document.getElementById("sw-in").onkeydown = function (e) {
      e = e || window.event;
      if (e.keyCode === 13) submit();
    };
    document.getElementById("sw-in").focus();
  }
  function submit() {
    if (st.over) return;
    var v = (document.getElementById("sw-in").value || "").trim().toLowerCase();
    if (!v) return;
    if (v === st.word) {
      st.over = true;
      var p = award(30);
      feedLine(body, t("swWin", { w: st.word }), "good");
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
      againBtn(body, function () { viewScramble(); });
    } else {
      st.tries--;
      if (st.tries > 0) {
        feedLine(body, t("swWrong", { n: st.tries }), "bad");
        document.getElementById("sw-in").value = "";
      } else {
        st.over = true;
        feedLine(body, t("swLose", { w: st.word }), "bad");
        againBtn(body, function () { viewScramble(); });
      }
    }
  }
  newWord();
}

/* ============================================================
   NORMAL GAME: Star Catcher
   ============================================================ */
function viewStars() {
  var body = mountPanel("stName");
  var st = { col: 4, starC: 0, row: 0, score: 0, miss: 0, live: false, timer: 0 };

  function render() {
    body.innerHTML =
      '<p class="hint">' + esc(t("stRule")) + "</p>" +
      '<div class="mp-row"><button class="btn" id="st-start" type="button">' +
        esc(t("startBtn")) + "</button></div>" +
      '<div class="mp-score" id="st-line">' + esc(t("stLine", { n: 0, m: 0 })) + "</div>" +
      '<div class="stars-board" id="stars-board"></div>' +
      '<div class="feed" id="g-feed"></div>';
    draw();
    document.getElementById("st-start").onclick = start;
  }
  function draw() {
    var g = document.getElementById("stars-board");
    if (!g) return;
    var h = "", r, c;
    for (r = 0; r < 7; r++) {
      for (c = 0; c < 9; c++) {
        var cls = "st-cell";
        if (r < 6 && st.live && r === st.row && c === st.starC) cls += " star";
        if (r === 6 && c === st.col) cls += " catcher";
        h += '<div class="' + cls + '"></div>';
      }
    }
    g.innerHTML = h;
    var ln = document.getElementById("st-line");
    if (ln) ln.textContent = t("stLine", { n: st.score, m: st.miss });
  }
  function start() {
    st.score = 0;
    st.miss = 0;
    st.live = true;
    st.row = 0;
    st.starC = Math.floor(Math.random() * 9);
    st.timer = setInterval(step, 170);
    document.addEventListener("keydown", onKey);
    draw();
  }
  function onKey(e) {
    if (!document.getElementById("stars-board")) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { if (st.col > 0) st.col--; if (e.preventDefault) e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { if (st.col < 8) st.col++; if (e.preventDefault) e.preventDefault(); }
    draw();
  }
  function step() {
    if (!document.getElementById("stars-board")) {
      clearInterval(st.timer);
      document.removeEventListener("keydown", onKey);
      return;
    }
    st.row++;
    if (st.row === 6) {
      if (st.starC === st.col) st.score++;
      else st.miss++;
      if (st.miss >= 3) { end(); return; }
      st.row = 0;
      st.starC = Math.floor(Math.random() * 9);
    }
    draw();
  }
  function end() {
    st.live = false;
    clearInterval(st.timer);
    document.removeEventListener("keydown", onKey);
    var prize = award(Math.min(150, st.score * 5));
    feedLine(body, t("stOver", { n: st.score }), "bad");
    if (prize) {
      feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
    }
    updateHUD();
    var g = document.getElementById("stars-board");
    if (g) g.innerHTML = "";
    againBtn(body, function () { viewStars(); });
  }
  render();
}

/* ============================================================
   NORMAL GAME: Lucky Race
   ============================================================ */
function viewRace() {
  var body = mountPanel("lrName");
  var st = { pos: [0, 0, 0, 0], timer: 0, busy: false };

  function render() {
    var max = points();
    var lanes = "", i;
    for (i = 0; i < 4; i++) {
      lanes += '<div class="race-lane"><div class="race-run" id="lr-r' + i + '">&#9733;</div></div>';
    }
    body.innerHTML =
      '<p class="hint">' + esc(t("lrRule")) + "</p>" +
      '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="lr-bet" type="number" min="0" max="' + max +
        '" value="' + Math.min(10, max) + '"></div>' +
      '<div class="race-board" id="lr-board">' + lanes + "</div>" +
      '<div class="mp-row">' +
        '<button class="btn" type="button" data-p="0">#1</button>' +
        '<button class="btn" type="button" data-p="1">#2</button>' +
        '<button class="btn" type="button" data-p="2">#3</button>' +
        '<button class="btn" type="button" data-p="3">#4</button>' +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    var btns = body.getElementsByClassName("btn");
    for (i = 0; i < btns.length; i++) {
      (function (b) {
        var p = b.getAttribute("data-p");
        if (p === null) return;
        b.onclick = function () { race(parseInt(p, 10)); };
      })(btns[i]);
    }
    for (i = 0; i < 4; i++) move(i, 0);
  }
  function move(i, pos) {
    var el = document.getElementById("lr-r" + i);
    if (el) el.style.left = (pos / 24 * 96) + "%";
  }
  function race(pick4) {
    if (st.busy) return;
    var betEl = document.getElementById("lr-bet");
    var b = parseInt(betEl ? betEl.value : "0", 10);
    if (isNaN(b) || b < 0) b = 0;
    if (b > points()) b = points();
    if (b > 0 && !spend(b)) return;
    st.busy = true;
    st.pos = [0, 0, 0, 0];
    if (owns("tip")) {
      var tipIdx = Math.floor(Math.random() * 4);
      st.pos[tipIdx] = 4;
      feedLine(body, t("raceTip", { n: tipIdx + 1 }), "");
    }
    var i;
    for (i = 0; i < 4; i++) move(i, 0);
    st.timer = setInterval(function () {
      var win = -1;
      for (i = 0; i < 4; i++) {
        st.pos[i] += Math.floor(Math.random() * 3);
        move(i, st.pos[i]);
        if (st.pos[i] >= 24 && win < 0) win = i;
      }
      if (win >= 0) {
        clearInterval(st.timer);
        settle(b, pick4, win);
      }
    }, 130);
  }
  function settle(b, picked, win) {
    var n = win + 1;
    if (win === picked) {
      if (b > 0) {
        credit(b * 3);
        feedLine(body, t("lrWin", { n: n, k: b * 3 }), "gold");
        prizeToast(b * 3);
      } else {
        feedLine(body, t("lrFree", { n: n }), "");
      }
    } else {
      if (b > 0) feedLine(body, t("lrLose", { n: n, b: b }), "bad");
      else feedLine(body, t("lrFree", { n: n }), "");
    }
    st.busy = false;
    updateHUD();
  }
  render();
}

/* ============================================================
   SECRET GAME: Breakout
   ============================================================ */
function viewBreakout() {
  var body = mountPanel("boName");
  var BW = 420, BH = 260;
  var st = { x: 206, y: 180, vx: 3, vy: -4, px: 170, lives: 3, killed: 0, bricks: [], timer: 0 };

  function start() {
    st.x = 206; st.y = 180;
    st.vx = Math.random() < 0.5 ? 3 : -3;
    st.vy = -4;
    st.px = 170;
    st.lives = owns("ball") ? 4 : 3;
    st.killed = 0;
    st.bricks = [];
    var h = '<p class="hint">' + esc(t("boRule")) + "</p>" +
      '<div class="mp-score" id="bo-line"></div>' +
      '<div class="bo-board" id="bo-board">' +
      '<div class="bo-ball" id="bo-ball"></div>' +
      '<div class="bo-pad" id="bo-pad"></div>';
    var b, i;
    for (b = 0; b < 5; b++) {
      for (i = 0; i < 9; i++) {
        st.bricks.push({ x: 4 + i * 46, y: 4 + b * 18, alive: true, id: "bo-b" + (b * 9 + i) });
        h += '<div class="bo-brick br' + b + '" id="bo-b' + (b * 9 + i) +
          '" style="left:' + (4 + i * 46) + "px;top:" + (4 + b * 18) + 'px"></div>';
      }
    }
    h += "</div>" +
      '<div class="mp-row"><button class="btn ghost" type="button" id="bo-l">&#9664;</button>' +
      '<button class="btn ghost" type="button" id="bo-r">&#9654;</button></div>' +
      '<div class="feed" id="g-feed"></div>';
    body.innerHTML = h;
    updateLine();
    document.getElementById("bo-l").onclick = function () { pad(-30); };
    document.getElementById("bo-r").onclick = function () { pad(30); };
    document.addEventListener("keydown", onKey);
    st.timer = setInterval(step, 40);
    drawBall();
  }
  function pad(d) {
    st.px = Math.max(0, Math.min(BW - 80, st.px + d));
    var p = document.getElementById("bo-pad");
    if (p) p.style.left = st.px + "px";
  }
  function onKey(e) {
    if (!document.getElementById("bo-board")) return;
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { pad(-24); if (e.preventDefault) e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { pad(24); if (e.preventDefault) e.preventDefault(); }
  }
  function drawBall() {
    var el = document.getElementById("bo-ball");
    if (el) { el.style.left = st.x + "px"; el.style.top = st.y + "px"; }
    var p = document.getElementById("bo-pad");
    if (p) p.style.left = st.px + "px";
    updateLine();
  }
  function updateLine() {
    var left = 0, i;
    for (i = 0; i < st.bricks.length; i++) if (st.bricks[i].alive) left++;
    var ln = document.getElementById("bo-line");
    if (ln) ln.textContent = t("boLine", { n: st.lives, m: left });
    return left;
  }
  function step() {
    if (!document.getElementById("bo-board")) {
      clearInterval(st.timer);
      document.removeEventListener("keydown", onKey);
      return;
    }
    st.x += st.vx;
    st.y += st.vy;
    if (st.x < 0) { st.x = 0; st.vx = Math.abs(st.vx); }
    if (st.x > BW - 8) { st.x = BW - 8; st.vx = -Math.abs(st.vx); }
    if (st.y < 0) { st.y = 0; st.vy = Math.abs(st.vy); }
    if (st.y >= BH - 30 && st.y <= BH - 16 && st.x + 8 >= st.px && st.x <= st.px + 80) {
      st.vy = -Math.abs(st.vy);
      st.vx += (st.x - (st.px + 40)) / 20;
      if (st.vx > 6) st.vx = 6;
      if (st.vx < -6) st.vx = -6;
    }
    if (st.y > BH - 14) {
      st.lives--;
      if (st.lives <= 0) { end(false); return; }
      st.x = 206; st.y = 180;
      st.vx = Math.random() < 0.5 ? 3 : -3;
      st.vy = -4;
    }
    var i;
    for (i = 0; i < st.bricks.length; i++) {
      var br = st.bricks[i];
      if (!br.alive) continue;
      if (st.x + 8 > br.x && st.x < br.x + 44 && st.y + 8 > br.y && st.y < br.y + 16) {
        br.alive = false;
        st.vy = -st.vy;
        st.killed++;
        var bel = document.getElementById(br.id);
        if (bel) bel.style.visibility = "hidden";
        break;
      }
    }
    drawBall();
    if (updateLine() === 0) { end(true); return; }
  }
  function end(won) {
    clearInterval(st.timer);
    document.removeEventListener("keydown", onKey);
    var prize = won ? award(Math.min(250, st.killed * 6)) : award(Math.min(60, st.killed * 2));
    feedLine(body, won ? t("boWin") : t("boLose"), won ? "good" : "bad");
    if (prize) {
      feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
    }
    updateHUD();
    againBtn(body, function () { viewBreakout(); });
  }
  renderStart();
  function renderStart() {
    body.innerHTML =
      '<p class="hint">' + esc(t("boRule")) + "</p>" +
      '<div class="mp-row"><button class="btn" id="bo-go" type="button">' +
        esc(t("startBtn")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    document.getElementById("bo-go").onclick = start;
  }
}


/* ============================================================
   SECRET GAME: Penalty Shootout
   ============================================================ */
function viewPenalty() {
  var body = mountPanel("peName");
  var st = { ys: 0, as: 0, round: 0, phase: "k", over: false };

  function render() {
    body.innerHTML =
      '<p class="hint">' + esc(t("peRule")) + "</p>" +
      '<div class="mp-score" id="pe-line"></div>' +
      '<div class="mp-row">' +
        '<button class="btn" type="button" data-d="1">' + esc(t("peL")) + "</button>" +
        '<button class="btn" type="button" data-d="2">' + esc(t("peC")) + "</button>" +
        '<button class="btn" type="button" data-d="3">' + esc(t("peR")) + "</button>" +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    var btns = body.getElementsByClassName("btn");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        var d = b.getAttribute("data-d");
        if (d === null) return;
        b.onclick = function () { act(parseInt(d, 10)); };
      })(btns[i]);
    }
    updateLine();
  }
  function updateLine() {
    var el = document.getElementById("pe-line");
    if (el) el.textContent = t("peStatus", { a: st.ys, b: st.as, r: Math.min(st.round + 1, 5) });
  }
  function act(pick) {
    if (st.over) return;
    if (st.phase === "k") {
      var keeper = ri(1, 3);
      if (keeper === pick) feedLine(body, t("peSaved"), "bad");
      else { st.ys++; feedLine(body, t("peGoal"), "good"); }
      st.phase = "s";
    } else {
      var shot = ri(1, 3);
      if (shot === pick) feedLine(body, t("peSaved"), "good");
      else { st.as++; feedLine(body, t("peGoal"), "bad"); }
      st.phase = "k";
      st.round++;
      updateLine();
      if (st.round >= 5) finish();
    }
    updateLine();
  }
  function finish() {
    st.over = true;
    if (st.ys > st.as) {
      var p = award(60);
      feedLine(body, t("peWin", { a: st.ys, b: st.as }), "good");
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
    } else if (st.ys < st.as) {
      feedLine(body, t("peLose", { a: st.ys, b: st.as }), "bad");
    } else {
      var p2 = award(20);
      feedLine(body, t("peTie", { a: st.ys, b: st.as }), "");
      feedLine(body, t("prizeWon", { n: p2 }), "gold");
    }
    updateHUD();
    againBtn(body, function () { viewPenalty(); });
  }
  render();
}

/* ============================================================
   SECRET GAME: Lotto
   ============================================================ */
function viewLotto() {
  var body = mountPanel("knName");
  var st = { sel: [], drawn: [], busy: false };

  function render() {
    var max = points();
    var grid = "", i;
    for (i = 1; i <= 20; i++) {
      grid += '<button class="kn-num' + (st.sel.indexOf(i) !== -1 ? " sel" : "") +
        '" type="button" data-n="' + i + '">' + i + "</button>";
    }
    body.innerHTML =
      '<p class="hint">' + esc(t("knRule")) + "</p>" +
      '<div class="mp-score" id="kn-line">' + esc(t("knPicked", { n: st.sel.length })) + "</div>" +
      '<div class="kn-grid">' + grid + "</div>" +
      '<div class="row"><span class="hint">' + esc(t("betLbl")) + "</span>" +
        '<input class="num-input" id="kn-bet" type="number" min="0" max="' + max +
        '" value="' + Math.min(10, max) + '"></div>' +
      '<div class="mp-row"><button class="btn" id="kn-go" type="button">' +
        esc(t("knDraw")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    var cells = body.getElementsByClassName("kn-num");
    for (i = 0; i < cells.length; i++) {
      (function (b) {
        b.onclick = function () { toggleNum(parseInt(b.getAttribute("data-n"), 10)); };
      })(cells[i]);
    }
    document.getElementById("kn-go").onclick = draw;
  }
  function toggleNum(n) {
    if (st.busy) return;
    var at = st.sel.indexOf(n);
    if (at !== -1) st.sel.splice(at, 1);
    else if (st.sel.length < 5) st.sel.push(n);
    else return;
    var ln = document.getElementById("kn-line");
    if (ln) ln.textContent = t("knPicked", { n: st.sel.length });
    var cells = body.getElementsByClassName("kn-num");
    for (var i = 0; i < cells.length; i++) {
      var v = parseInt(cells[i].getAttribute("data-n"), 10);
      cells[i].className = "kn-num" + (st.sel.indexOf(v) !== -1 ? " sel" : "");
    }
  }
  function draw() {
    if (st.busy) return;
    if (st.sel.length !== 5) { feedLine(body, t("knNeed"), "bad"); return; }
    var betEl = document.getElementById("kn-bet");
    var b = parseInt(betEl ? betEl.value : "0", 10);
    if (isNaN(b) || b < 0) b = 0;
    if (b > points()) b = points();
    if (b > 0 && !spend(b)) return;
    st.busy = true;
    var pool = [], i;
    for (i = 1; i <= 20; i++) pool.push(i);
    shuffle(pool);
    st.drawn = pool.slice(0, 10);
    st.drawn.sort(function (x, y) { return x - y; });
    var out = "";
    var n = 0;
    var iv = setInterval(function () {
      n++;
      feedLine(body, t("knDrawn", { n: st.drawn[n - 1] }), "");
      if (n >= 10) {
        clearInterval(iv);
        settle(b);
        st.busy = false;
      }
    }, 180);
  }
  function settle(b) {
    var m = 0, i;
    for (i = 0; i < st.sel.length; i++) {
      if (st.drawn.indexOf(st.sel[i]) !== -1) m++;
    }
    if (m >= 5) { credit(b * 25); feedLine(body, t("knWin", { n: b * 25, m: m }), "gold"); if (b > 0) prizeToast(b * 25); }
    else if (m === 4) { credit(b * 6); feedLine(body, t("knWin", { n: b * 6, m: m }), "good"); }
    else if (m === 3) { credit(b * 2); feedLine(body, t("knWin", { n: b * 2, m: m }), ""); }
    else { feedLine(body, t("knLose", { m: m, b: b }), "bad"); }
    updateHUD();
  }
  render();
}

/* ============================================================
   SECRET GAME: Matchsticks (nim)
   ============================================================ */
function viewNim() {
  var body = mountPanel("nimName");
  var st = { left: 21, over: false };

  function sticksStr() {
    var s = "", i;
    for (i = 0; i < st.left; i++) s += "|";
    return s;
  }
  function render() {
    body.innerHTML =
      '<p class="hint">' + esc(t("nimRule")) + "</p>" +
      '<div class="mp-score" id="nim-line"></div>' +
      '<div class="nim-sticks" id="nim-sticks"></div>' +
      '<div class="mp-row">' +
        '<button class="btn" type="button" data-t="1">1</button>' +
        '<button class="btn" type="button" data-t="2">2</button>' +
        '<button class="btn" type="button" data-t="3">3</button>' +
      "</div>" +
      '<div class="feed" id="g-feed"></div>';
    var btns = body.getElementsByClassName("btn");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        var tt = b.getAttribute("data-t");
        if (tt === null) return;
        b.onclick = function () { take(parseInt(tt, 10)); };
      })(btns[i]);
    }
    update();
  }
  function update() {
    var l = document.getElementById("nim-line");
    if (l) l.textContent = t("nimLeft", { n: st.left });
    var s = document.getElementById("nim-sticks");
    if (s) s.textContent = sticksStr();
  }
  function take(n) {
    if (st.over) return;
    if (n > st.left) return;
    st.left -= n;
    feedLine(body, t("nimYou", { n: n, m: st.left }), "");
    if (st.left === 0) { win(); return; }
    update();
    setTimeout(function () {
      var ai = st.left % 4 === 0 ? 1 + Math.floor(Math.random() * 3) : st.left % 4;
      if (ai > st.left) ai = st.left;
      st.left -= ai;
      feedLine(body, t("nimAi", { n: ai, m: st.left }), "bad");
      if (st.left === 0) { lose(); return; }
      update();
    }, 550);
  }
  function win() {
    st.over = true;
    update();
    var p = award(30);
    feedLine(body, t("nimWin"), "good");
    feedLine(body, t("prizeWon", { n: p }), "gold");
    prizeToast(p);
    updateHUD();
    againBtn(body, function () { viewNim(); });
  }
  function lose() {
    st.over = true;
    update();
    feedLine(body, t("nimLose"), "bad");
    againBtn(body, function () { viewNim(); });
  }
  render();
}

/* ============================================================
   SECRET GAME: Depth Charge
   ============================================================ */
function viewDepth() {
  var body = mountPanel("dcName");
  var st = { sub: [], shots: 12, hit: {}, over: false };

  function placeSub() {
    st.sub = [];
    var horiz = Math.random() < 0.5;
    var r = ri(0, horiz ? 7 : 5);
    var c = ri(0, horiz ? 5 : 7);
    for (var i = 0; i < 3; i++) {
      st.sub.push(horiz ? (r * 8 + c + i) : ((r + i) * 8 + c));
    }
  }
  function render() {
    placeSub();
    st.shots = 12;
    st.hit = {};
    st.over = false;
    body.innerHTML =
      '<p class="hint">' + esc(t("dcRule")) + "</p>" +
      '<div class="mp-score" id="dc-line"></div>' +
      '<div class="depth-grid" id="dc-grid"></div>' +
      '<div class="feed" id="g-feed"></div>';
    var g = document.getElementById("dc-grid");
    var h = "", i;
    for (i = 0; i < 64; i++) h += '<button class="dc-cell" type="button" data-i="' + i + '"></button>';
    g.innerHTML = h;
    var cells = g.getElementsByClassName("dc-cell");
    for (i = 0; i < cells.length; i++) {
      (function (el) {
        el.onclick = function () { fire(parseInt(el.getAttribute("data-i"), 10)); };
      })(cells[i]);
    }
    updateLine();
  }
  function updateLine() {
    var el = document.getElementById("dc-line");
    if (el) el.textContent = t("dcLeft", { n: st.shots });
  }
  function fire(i) {
    if (st.over || st.hit[i]) return;
    st.shots--;
    var cell = document.getElementById("dc-grid").getElementsByClassName("dc-cell")[i];
    if (st.sub.indexOf(i) !== -1) {
      st.hit[i] = "x";
      if (cell) { cell.className = "dc-cell hit"; cell.textContent = "X"; }
      var all = true, k;
      for (k = 0; k < 3; k++) if (st.hit[st.sub[k]] !== "x") all = false;
      if (all) {
        st.over = true;
        updateLine();
        var p = award(70);
        feedLine(body, t("dcWin", { n: st.shots }), "good");
        feedLine(body, t("prizeWon", { n: p }), "gold");
        prizeToast(p);
        updateHUD();
        againBtn(body, function () { viewDepth(); });
        return;
      }
      feedLine(body, t("dcHit"), "good");
    } else {
      st.hit[i] = ".";
      if (cell) { cell.className = "dc-cell miss"; cell.textContent = "."; }
      feedLine(body, t("dcMiss"), "");
    }
    if (st.shots <= 0) {
      st.over = true;
      updateLine();
      var p2 = award(10);
      feedLine(body, t("dcLose"), "bad");
      feedLine(body, t("prizeWon", { n: p2 }), "gold");
      updateHUD();
      againBtn(body, function () { viewDepth(); });
      return;
    }
    updateLine();
  }
  render();
}

/* ============================================================
   SECRET GAME: 15 Puzzle
   ============================================================ */
function viewP15() {
  var body = mountPanel("p15Name");
  var st = { t: [], moves: 0, over: false };

  function ordered() {
    for (var i = 0; i < 15; i++) if (st.t[i] !== i + 1) return false;
    return st.t[15] === 0;
  }
  function scramble() {
    st.t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
    st.moves = 0;
    st.over = false;
    for (var n = 0; n < 100; n++) {
      var blank = st.t.indexOf(0);
      var br = Math.floor(blank / 4), bc = blank % 4;
      var opts = [];
      if (br > 0) opts.push(blank - 4);
      if (br < 3) opts.push(blank + 4);
      if (bc > 0) opts.push(blank - 1);
      if (bc < 3) opts.push(blank + 1);
      var pickI = opts[Math.floor(Math.random() * opts.length)];
      st.t[blank] = st.t[pickI];
      st.t[pickI] = 0;
    }
    if (ordered()) scramble();
  }
  function render() {
    body.innerHTML =
      '<p class="hint">' + esc(t("p15Rule")) + "</p>" +
      '<div class="mp-score" id="p15-line">' + esc(t("p15Moves", { n: st.moves })) + "</div>" +
      '<div class="p15-grid" id="p15-grid"></div>' +
      '<div class="feed" id="g-feed"></div>';
    paint();
  }
  function paint() {
    var g = document.getElementById("p15-grid");
    var h = "", i;
    for (i = 0; i < 16; i++) {
      var v = st.t[i];
      h += '<button class="p15-tile' + (v === 0 ? " blank" : "") +
        '" type="button" data-i="' + i + '">' + (v === 0 ? "" : v) + "</button>";
    }
    g.innerHTML = h;
    var cells = g.getElementsByClassName("p15-tile");
    for (i = 0; i < cells.length; i++) {
      (function (el) {
        el.onclick = function () { slide(parseInt(el.getAttribute("data-i"), 10)); };
      })(cells[i]);
    }
    var ln = document.getElementById("p15-line");
    if (ln) ln.textContent = t("p15Moves", { n: st.moves });
  }
  function slide(i) {
    if (st.over) return;
    var blank = st.t.indexOf(0);
    var ok = (Math.abs(Math.floor(i / 4) - Math.floor(blank / 4)) === 1 && (i % 4) === (blank % 4)) ||
      (Math.abs((i % 4) - (blank % 4)) === 1 && Math.floor(i / 4) === Math.floor(blank / 4));
    if (!ok) { feedLine(body, t("p15Ill"), "bad"); return; }
    st.t[blank] = st.t[i];
    st.t[i] = 0;
    st.moves++;
    if (ordered()) {
      st.over = true;
      var m = st.moves;
      var prize = award(m <= 80 ? 50 : (m <= 140 ? 25 : 10));
      feedLine(body, t("p15Win", { n: m }), "good");
      feedLine(body, t("prizeWon", { n: prize }), "gold");
      prizeToast(prize);
      updateHUD();
      paint();
      againBtn(body, function () { viewP15(); });
      return;
    }
    paint();
  }
  scramble();
  render();
}


var BONUS_GAMES = [
  { icon: "\u23F1", name: "rxName", desc: "rxDesc", view: viewReaction },
  { icon: "\uD83C\uDFB2", name: "diceName", desc: "diceDesc", view: viewDice },
  { icon: "\uD83C\uDFB0", name: "slotName", desc: "slotDesc", view: viewSlots },
  { icon: "\uD83E\uDE99", name: "dodName", desc: "dodDesc", view: viewDouble },
  { icon: "\u2328", name: "typeName", desc: "typeDesc", view: viewTyping },
  { icon: "\uD83E\uDDE0", name: "mmName", desc: "mmDesc", view: viewMastermind },
  { icon: "\u26F6", name: "hanoiName", desc: "hanoiDesc", view: viewHanoi },
  { icon: "\uD83C\uDFB2", name: "plName", desc: "plDesc", view: viewPlinko },
  { icon: "\u258C", name: "boName", desc: "boDesc", view: viewBreakout },
  { icon: "\u26BD", name: "peName", desc: "peDesc", view: viewPenalty },
  { icon: "\u2660", name: "knName", desc: "knDesc", view: viewLotto },
  { icon: "\u2665", name: "nimName", desc: "nimDesc", view: viewNim },
  { icon: "\u2693", name: "dcName", desc: "dcDesc", view: viewDepth },
  { icon: "\u2261", name: "p15Name", desc: "p15Desc", view: viewP15 }
];

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
  { icon: "\uD83D\uDCA3", name: "minesName", desc: "minesDesc", view: viewMines },
  { icon: "\uD83C\uDDB2", name: "bjName", desc: "bjDesc", view: viewBJ },
  { icon: "\uD83C\uDFA1", name: "rltName", desc: "rltDesc", view: viewRoulette },
  { icon: "\u265A", name: "c4Name", desc: "c4Desc", view: viewC4, mp: "c4" },
  { icon: "\uD83C\uDFAF", name: "g2048Name", desc: "g2048Desc", view: view2048 },
  { icon: "\u25C9", name: "seqName", desc: "seqDesc", view: viewSequence },
  { icon: "\uD83D\uDC2D", name: "wamName", desc: "wamDesc", view: viewWhack },
  { icon: "\u25A0", name: "loName", desc: "loDesc", view: viewLights },
  { icon: "\u270E", name: "swName", desc: "swDesc", view: viewScramble },
  { icon: "\u2B50", name: "stName", desc: "stDesc", view: viewStars },
  { icon: "\u26BD", name: "lrName", desc: "lrDesc", view: viewRace },
  { icon: "\uD83D\uDED2", name: "shopName", desc: "shopDesc", view: viewShop }
];

function renderMenu() {
  var bar = "============================================================";
  var inRoom = typeof MP !== "undefined" && MP.inRoom && MP.inRoom();
  if (document.body && document.body.classList) {
    document.body.classList.toggle("code-user", bonusUnlocked());
  }
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
  var list = menuGames();
  for (var i = 0; i < list.length; i++) {
    html += '<div class="term-item" data-i="' + i + '" role="button" tabindex="0">' +
      '<span class="term-num">' + (i + 1) + ")</span>" +
      '<span class="term-label">' + esc(t(list[i].name)) + "</span>" +
      '<span class="lead" aria-hidden="true"></span>' +
      (inRoom && list[i].mp ? '<span class="term-tag">' + esc(t("mpTag")) + "</span>" : "") +
      "</div>";
  }
  html += typeof mpMenuExtras === "function" ? mpMenuExtras() : "";
  html += "</div>" +
    codeBarHtml() +
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
  var cg = document.getElementById("code-go");
  if (cg) cg.onclick = tryBonusCode;
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
  var g = menuGames()[parseInt(gi, 10)];
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
