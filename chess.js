/* ============================================================
   kocik's arcade - CHESS (engine + bot + board UI + multiplayer view)
   ES5, no dependencies. Loaded BEFORE game.js (the menu needs viewChess).

   Pieces: 0 empty, 1 P, 2 N, 3 B, 4 R, 5 Q, 6 K ; black = +8
   Board : 0x88 array (index = rank*16 + file, rank 0 = white's back rank)
   ============================================================ */
"use strict";

var CH_P = 1, CH_N = 2, CH_B = 3, CH_R = 4, CH_Q = 5, CH_K = 6;
var CH_KN = [33, 31, 18, 14, -33, -31, -18, -14];
var CH_DB = [17, 15, -17, -15];
var CH_DR = [16, -16, 1, -1];
var CH_DK = [17, 15, -17, -15, 16, -16, 1, -1];
var CH_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var CH_CRMASK = {};
CH_CRMASK[0] = 2; CH_CRMASK[7] = 1; CH_CRMASK[4] = 3;
CH_CRMASK[112] = 8; CH_CRMASK[119] = 4; CH_CRMASK[116] = 12;

/* ---------- position ---------- */
function chessEmpty() {
  var b = [];
  for (var i = 0; i < 128; i++) b.push(0);
  return { b: b, side: 0, cr: 0, ep: -1, half: 0, full: 1, ksq: [4, 116], stack: [] };
}

function chessFromFen(fen) {
  var pos = chessEmpty();
  var parts = String(fen).split(" ");
  var rows = parts[0].split("/");
  var map = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  for (var r = 0; r < 8; r++) {
    var rank = 7 - r, file = 0, row = rows[r] || "";
    for (var i = 0; i < row.length; i++) {
      var ch = row.charAt(i);
      if (ch >= "1" && ch <= "8") { file += parseInt(ch, 10); continue; }
      var lower = ch.toLowerCase();
      var pc = map[lower];
      if (!pc) continue;
      var color = ch === lower ? 8 : 0;
      var sq = rank * 16 + file;
      pos.b[sq] = pc + color;
      if (pc === CH_K) pos.ksq[color ? 1 : 0] = sq;
      file++;
    }
  }
  pos.side = parts[1] === "b" ? 1 : 0;
  var c = parts[2] || "-";
  if (c.indexOf("K") !== -1) pos.cr |= 1;
  if (c.indexOf("Q") !== -1) pos.cr |= 2;
  if (c.indexOf("k") !== -1) pos.cr |= 4;
  if (c.indexOf("q") !== -1) pos.cr |= 8;
  if (parts[3] && parts[3] !== "-") {
    pos.ep = (parseInt(parts[3].charAt(1), 10) - 1) * 16 + (parts[3].charCodeAt(0) - 97);
  }
  pos.half = parseInt(parts[4], 10) || 0;
  pos.full = parseInt(parts[5], 10) || 1;
  return pos;
}

function chessNew() { return chessFromFen(CH_START); }

function chessSqName(sq) {
  return String.fromCharCode(97 + (sq & 7)) + String((sq >> 4) + 1);
}

function chessToFen(pos) {
  var letters = ".pnbrqk", out = [];
  for (var rank = 7; rank >= 0; rank--) {
    var row = "", empty = 0;
    for (var file = 0; file < 8; file++) {
      var p = pos.b[rank * 16 + file];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      var ch = letters.charAt(p & 7);
      row += (p & 8) ? ch : ch.toUpperCase();
    }
    if (empty) row += empty;
    out.push(row);
  }
  var cr = "";
  if (pos.cr & 1) cr += "K";
  if (pos.cr & 2) cr += "Q";
  if (pos.cr & 4) cr += "k";
  if (pos.cr & 8) cr += "q";
  return out.join("/") + " " + (pos.side ? "b" : "w") + " " + (cr || "-") + " " +
    (pos.ep >= 0 ? chessSqName(pos.ep) : "-") + " " + pos.half + " " + pos.full;
}

/* position key for repetition (board + side + castling + ep) */
function chessKey(pos) {
  return chessToFen(pos).split(" ").slice(0, 4).join(" ");
}

/* ---------- attacks ---------- */
function chessAttacked(pos, sq, by) {
  var b = pos.b, i, to, p;
  var pawn = by ? (CH_P + 8) : CH_P;
  var pa = by ? [15, 17] : [-15, -17];
  for (i = 0; i < 2; i++) {
    to = sq + pa[i];
    if (!(to & 0x88) && b[to] === pawn) return true;
  }
  var kn = CH_N + (by ? 8 : 0);
  for (i = 0; i < 8; i++) {
    to = sq + CH_KN[i];
    if (!(to & 0x88) && b[to] === kn) return true;
  }
  var kg = CH_K + (by ? 8 : 0);
  for (i = 0; i < 8; i++) {
    to = sq + CH_DK[i];
    if (!(to & 0x88) && b[to] === kg) return true;
  }
  var bq = [CH_B + (by ? 8 : 0), CH_Q + (by ? 8 : 0)];
  var rq = [CH_R + (by ? 8 : 0), CH_Q + (by ? 8 : 0)];
  for (i = 0; i < 4; i++) {
    to = sq + CH_DB[i];
    while (!(to & 0x88)) {
      p = b[to];
      if (p) { if (p === bq[0] || p === bq[1]) return true; break; }
      to += CH_DB[i];
    }
    to = sq + CH_DR[i];
    while (!(to & 0x88)) {
      p = b[to];
      if (p) { if (p === rq[0] || p === rq[1]) return true; break; }
      to += CH_DR[i];
    }
  }
  return false;
}

function chessInCheck(pos) {
  return chessAttacked(pos, pos.ksq[pos.side], pos.side ^ 1);
}

/* ---------- move generation (pseudo-legal) ---------- */
/* move: { f, t, p (promotion piece type or 0), c (captured piece), fl }
   fl: 1 = ep capture, 2 = castle king side, 4 = castle queen side, 8 = double push */
function chessGen(pos, capsOnly) {
  var b = pos.b, side = pos.side, moves = [], sq, p, to, i, d, q;
  var enemy = side ? 0 : 8;
  function add(f, t2, promo, cap, fl) {
    moves.push({ f: f, t: t2, p: promo || 0, c: cap || 0, fl: fl || 0 });
  }
  for (sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    p = b[sq];
    if (!p || ((p >> 3) !== side)) continue;
    var type = p & 7;
    if (type === CH_P) {
      var dir = side ? -16 : 16;
      var startRank = side ? 6 : 1;
      var promoRank = side ? 0 : 7;
      to = sq + dir;
      if (!(to & 0x88) && !b[to] && !capsOnly) {
        if ((to >> 4) === promoRank) {
          for (q = CH_Q; q >= CH_N; q--) add(sq, to, q, 0, 0);
        } else {
          add(sq, to, 0, 0, 0);
          if ((sq >> 4) === startRank && !b[to + dir]) add(sq, to + dir, 0, 0, 8);
        }
      } else if (!(to & 0x88) && !b[to] && capsOnly && (to >> 4) === promoRank) {
        add(sq, to, CH_Q, 0, 0);
      }
      for (i = -1; i <= 1; i += 2) {
        to = sq + dir + i;
        if (to & 0x88) continue;
        if (b[to] && (b[to] >> 3) === (side ^ 1)) {
          if ((to >> 4) === promoRank) {
            for (q = CH_Q; q >= CH_N; q--) add(sq, to, q, b[to], 0);
          } else add(sq, to, 0, b[to], 0);
        } else if (to === pos.ep) {
          add(sq, to, 0, CH_P + enemy, 1);
        }
      }
    } else if (type === CH_N || type === CH_K) {
      var dirs = type === CH_N ? CH_KN : CH_DK;
      for (i = 0; i < 8; i++) {
        to = sq + dirs[i];
        if (to & 0x88) continue;
        if (!b[to]) { if (!capsOnly) add(sq, to, 0, 0, 0); }
        else if ((b[to] >> 3) !== side) add(sq, to, 0, b[to], 0);
      }
      if (type === CH_K && !capsOnly) {
        var base = side ? 112 : 0;
        if (sq === base + 4 && !chessAttacked(pos, sq, side ^ 1)) {
          if ((pos.cr & (side ? 4 : 1)) && !b[base + 5] && !b[base + 6] &&
              b[base + 7] === CH_R + (side ? 8 : 0) &&
              !chessAttacked(pos, base + 5, side ^ 1) && !chessAttacked(pos, base + 6, side ^ 1)) {
            add(sq, base + 6, 0, 0, 2);
          }
          if ((pos.cr & (side ? 8 : 2)) && !b[base + 3] && !b[base + 2] && !b[base + 1] &&
              b[base] === CH_R + (side ? 8 : 0) &&
              !chessAttacked(pos, base + 3, side ^ 1) && !chessAttacked(pos, base + 2, side ^ 1)) {
            add(sq, base + 2, 0, 0, 4);
          }
        }
      }
    } else {
      var sl = type === CH_B ? CH_DB : (type === CH_R ? CH_DR : CH_DK);
      var n = sl.length;
      for (d = 0; d < n; d++) {
        to = sq + sl[d];
        while (!(to & 0x88)) {
          if (!b[to]) { if (!capsOnly) add(sq, to, 0, 0, 0); }
          else {
            if ((b[to] >> 3) !== side) add(sq, to, 0, b[to], 0);
            break;
          }
          to += sl[d];
        }
      }
    }
  }
  return moves;
}

/* ---------- make / unmake ---------- */
function chessMake(pos, m) {
  var b = pos.b, side = pos.side, piece = b[m.f];
  pos.stack.push({ cr: pos.cr, ep: pos.ep, half: pos.half, full: pos.full, piece: piece });
  b[m.f] = 0;
  if (m.fl & 1) b[m.t + (side ? 16 : -16)] = 0;
  b[m.t] = m.p ? (m.p + (side ? 8 : 0)) : piece;
  if (m.fl & 2) { b[m.t - 1] = b[m.t + 1]; b[m.t + 1] = 0; }
  if (m.fl & 4) { b[m.t + 1] = b[m.t - 2]; b[m.t - 2] = 0; }
  if ((piece & 7) === CH_K) pos.ksq[side] = m.t;
  if (CH_CRMASK[m.f]) pos.cr &= ~CH_CRMASK[m.f];
  if (CH_CRMASK[m.t]) pos.cr &= ~CH_CRMASK[m.t];
  pos.ep = (m.fl & 8) ? (m.f + m.t) / 2 : -1;
  if ((piece & 7) === CH_P || m.c) pos.half = 0; else pos.half++;
  if (side) pos.full++;
  pos.side = side ^ 1;
}

function chessUnmake(pos, m) {
  var u = pos.stack.pop(), b = pos.b;
  pos.side ^= 1;
  var side = pos.side;
  pos.cr = u.cr; pos.ep = u.ep; pos.half = u.half; pos.full = u.full;
  b[m.f] = u.piece;
  b[m.t] = 0;
  if (m.fl & 1) b[m.t + (side ? 16 : -16)] = CH_P + (side ? 0 : 8);
  else if (m.c) b[m.t] = m.c;
  if (m.fl & 2) { b[m.t + 1] = b[m.t - 1]; b[m.t - 1] = 0; }
  if (m.fl & 4) { b[m.t - 2] = b[m.t + 1]; b[m.t + 1] = 0; }
  if ((u.piece & 7) === CH_K) pos.ksq[side] = m.f;
}

function chessLegal(pos) {
  var all = chessGen(pos, false), out = [], side = pos.side;
  for (var i = 0; i < all.length; i++) {
    chessMake(pos, all[i]);
    if (!chessAttacked(pos, pos.ksq[side], side ^ 1)) out.push(all[i]);
    chessUnmake(pos, all[i]);
  }
  return out;
}

/* ---------- SAN ---------- */
function chessSan(pos, m, legal) {
  var p = pos.b[m.f], type = p & 7, s = "";
  if (m.fl & 2) s = "O-O";
  else if (m.fl & 4) s = "O-O-O";
  else {
    var cap = m.c || (m.fl & 1);
    if (type === CH_P) {
      if (cap) s += String.fromCharCode(97 + (m.f & 7)) + "x";
    } else {
      s += "?PNBRQK".charAt(type);
      var sameFile = false, sameRank = false, amb = false;
      for (var i = 0; i < legal.length; i++) {
        var o = legal[i];
        if (o !== m && o.t === m.t && (pos.b[o.f] & 7) === type && o.f !== m.f) {
          amb = true;
          if ((o.f & 7) === (m.f & 7)) sameFile = true;
          if ((o.f >> 4) === (m.f >> 4)) sameRank = true;
        }
      }
      if (amb) {
        if (!sameFile) s += String.fromCharCode(97 + (m.f & 7));
        else if (!sameRank) s += String((m.f >> 4) + 1);
        else s += chessSqName(m.f);
      }
      if (cap) s += "x";
    }
    s += chessSqName(m.t);
    if (m.p) s += "=" + "?PNBRQK".charAt(m.p);
  }
  chessMake(pos, m);
  if (chessInCheck(pos)) s += chessLegal(pos).length ? "+" : "#";
  chessUnmake(pos, m);
  return s;
}

/* ---------- game status ---------- */
function chessInsufficient(pos) {
  var minors = [], sq, p;
  for (sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    p = pos.b[sq] & 7;
    if (!p || p === CH_K) continue;
    if (p === CH_P || p === CH_R || p === CH_Q) return false;
    minors.push({ type: p, color: ((sq >> 4) + (sq & 7)) & 1 });
  }
  if (minors.length <= 1) return true;
  for (var i = 0; i < minors.length; i++) {
    if (minors[i].type !== CH_B || minors[i].color !== minors[0].color) return false;
  }
  return true;
}

/* keys: array of chessKey() strings of every position reached (incl. current) */
function chessStatus(pos, keys) {
  var legal = chessLegal(pos);
  var check = chessInCheck(pos);
  var r = { over: false, result: "", winner: null, check: check, legal: legal };
  if (!legal.length) {
    r.over = true;
    if (check) { r.result = "checkmate"; r.winner = pos.side ^ 1; }
    else r.result = "stalemate";
    return r;
  }
  if (chessInsufficient(pos)) { r.over = true; r.result = "insufficient"; return r; }
  if (pos.half >= 100) { r.over = true; r.result = "fifty"; return r; }
  if (keys && keys.length) {
    var cur = keys[keys.length - 1], n = 0;
    for (var i = 0; i < keys.length; i++) if (keys[i] === cur) n++;
    if (n >= 3) { r.over = true; r.result = "repetition"; return r; }
  }
  return r;
}

/* ============================================================
   BOT
   ============================================================ */
var CH_VAL = [0, 100, 320, 330, 500, 900, 0];
var CH_PST = {
  1: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
      0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  2: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30,
      -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
      -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  3: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10,
      -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10,
      -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  4: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  5: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10,
      -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10,
      -20,-10,-10,-5,-5,-10,-10,-20],
  6: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
      20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
};

/* static eval, positive = good for the side to move */
function chessEval(pos) {
  var score = 0, sq, p, type, color, idx, nonPawn = 0;
  var b = pos.b;
  for (sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    p = b[sq];
    if (p && (p & 7) !== CH_P && (p & 7) !== CH_K) nonPawn += CH_VAL[p & 7];
  }
  var endgame = nonPawn < 2600;
  for (sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    p = b[sq];
    if (!p) continue;
    type = p & 7; color = p >> 3;
    idx = color ? ((sq >> 4) * 8 + (sq & 7)) : ((7 - (sq >> 4)) * 8 + (sq & 7));
    var v = CH_VAL[type];
    if (type === CH_K && endgame) {
      var dr = Math.abs((sq >> 4) - 3.5), df = Math.abs((sq & 7) - 3.5);
      v += Math.round(30 - 12 * (dr + df));
    } else {
      v += CH_PST[type][idx];
    }
    score += color ? -v : v;
  }
  return pos.side ? -score : score;
}

var chBot = { nodes: 0, stop: false, deadline: 0 };

function chessOrder(pos, moves) {
  var b = pos.b;
  for (var i = 0; i < moves.length; i++) {
    var m = moves[i], s = 0;
    if (m.c) s = 10 * CH_VAL[m.c & 7] - CH_VAL[b[m.f] & 7] / 10 + 1000;
    else if (m.fl & 1) s = 1000 + 900;
    if (m.p) s += CH_VAL[m.p];
    m.s = s;
  }
  moves.sort(function (x, y) { return y.s - x.s; });
  return moves;
}

function chessQuiesce(pos, alpha, beta, ply) {
  chBot.nodes++;
  if ((chBot.nodes & 2047) === 0 && new Date().getTime() > chBot.deadline) chBot.stop = true;
  var stand = chessEval(pos);
  if (chBot.stop || ply > 6) return stand;
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  var moves = chessOrder(pos, chessGen(pos, true)), side = pos.side;
  for (var i = 0; i < moves.length; i++) {
    chessMake(pos, moves[i]);
    if (chessAttacked(pos, pos.ksq[side], side ^ 1)) { chessUnmake(pos, moves[i]); continue; }
    var sc = -chessQuiesce(pos, -beta, -alpha, ply + 1);
    chessUnmake(pos, moves[i]);
    if (chBot.stop) return alpha;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function chessSearch(pos, depth, alpha, beta, ply) {
  chBot.nodes++;
  if ((chBot.nodes & 2047) === 0 && new Date().getTime() > chBot.deadline) chBot.stop = true;
  if (chBot.stop) return 0;
  if (depth <= 0) return chessQuiesce(pos, alpha, beta, 0);
  var side = pos.side, moves = chessOrder(pos, chessGen(pos, false));
  var legalCount = 0;
  for (var i = 0; i < moves.length; i++) {
    chessMake(pos, moves[i]);
    if (chessAttacked(pos, pos.ksq[side], side ^ 1)) { chessUnmake(pos, moves[i]); continue; }
    legalCount++;
    var sc = -chessSearch(pos, depth - 1, -beta, -alpha, ply + 1);
    chessUnmake(pos, moves[i]);
    if (chBot.stop) return 0;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  if (!legalCount) {
    return chessAttacked(pos, pos.ksq[side], side ^ 1) ? (-30000 + ply) : 0;
  }
  return alpha;
}

/* level 1 = easy (random-ish), 2 = medium, 3 = hard */
function chessBotMove(pos, level, keys) {
  var legal = chessLegal(pos);
  if (!legal.length) return null;
  if (legal.length === 1) return legal[0];
  var i, m, sc;

  if (level <= 1) {
    /* 1-ply greedy with lots of noise: grabs free pieces sometimes, blunders a lot */
    var best = null, bestSc = -1e9;
    for (i = 0; i < legal.length; i++) {
      m = legal[i];
      chessMake(pos, m);
      sc = -chessEval(pos) + Math.random() * 260;
      chessUnmake(pos, m);
      if (sc > bestSc) { bestSc = sc; best = m; }
    }
    return best;
  }

  var maxDepth = level === 2 ? 3 : 5;
  var budget = level === 2 ? 600 : 2200;
  /* avoid walking back into positions that were already seen (stops silly repetition draws) */
  function seenPenalty(mv) {
    if (!keys || !keys.length) return 0;
    chessMake(pos, mv);
    var k = chessKey(pos), cnt = 0;
    chessUnmake(pos, mv);
    for (var q = 0; q < keys.length; q++) if (keys[q] === k) cnt++;
    return cnt * 80;
  }
  chBot.deadline = new Date().getTime() + budget;
  chBot.stop = false;
  chBot.nodes = 0;
  var chosen = legal[Math.floor(Math.random() * legal.length)];
  var side = pos.side;
  var ordered = chessOrder(pos, legal.slice());

  for (var depth = 1; depth <= maxDepth; depth++) {
    var alpha = -1e9, iterBest = null, iterScores = [];
    for (i = 0; i < ordered.length; i++) {
      m = ordered[i];
      chessMake(pos, m);
      /* medium needs EXACT root scores (noise is added below), so no root pruning for it */
      sc = -chessSearch(pos, depth - 1, -1e9, level === 2 ? 1e9 : -alpha, 1);
      chessUnmake(pos, m);
      if (chBot.stop) break;
      /* medium: a little noise so it is not identical every game */
      sc -= seenPenalty(m);
      if (level === 2) sc += Math.random() * 25;
      iterScores.push([m, sc]);
      if (sc > alpha) { alpha = sc; iterBest = m; }
    }
    if (chBot.stop) break;
    if (iterBest) {
      chosen = iterBest;
      /* search best first next iteration */
      ordered.sort(function (a, b2) {
        return (a === iterBest ? -1 : 0) - (b2 === iterBest ? -1 : 0);
      });
      if (alpha > 29000) break;
    }
  }
  return chosen;
}

/* ============================================================
   BOARD UI (shared by the bot game and the multiplayer game)
   ============================================================ */
var CH_GLYPH = ["", "♟︎", "♞︎", "♝︎", "♜︎", "♛︎", "♚︎"];

/* o: { color: function -> 0|1 (side the user controls), flip: bool,
        onMove: function(move) }  */
function chessBoard(el, o) {
  var st = { pos: null, legal: [], last: null, sel: -1, promo: null, enabled: false, check: false, hint: null };

  function glyph(p) {
    return '<span class="ch-piece ' + ((p >> 3) ? "ch-b" : "ch-w") + '">' + CH_GLYPH[p & 7] + "</span>";
  }

  function paint() {
    if (!st.pos) { el.innerHTML = ""; return; }
    var targets = {}, i;
    if (st.sel >= 0) {
      for (i = 0; i < st.legal.length; i++) if (st.legal[i].f === st.sel) targets[st.legal[i].t] = true;
    }
    var h = '<div class="chess-board">';
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var rank = o.flip ? r : 7 - r;
        var file = o.flip ? 7 - f : f;
        var sq = rank * 16 + file;
        var p = st.pos.b[sq];
        var cls = "ch-sq " + (((rank + file) & 1) ? "ch-light" : "ch-dark");
        if (st.sel === sq) cls += " ch-sel";
        if (st.hint && (st.hint.f === sq || st.hint.t === sq)) cls += " ch-hint";
        if (st.last && (st.last.f === sq || st.last.t === sq)) cls += " ch-last";
        if (st.check && p && (p & 7) === CH_K && (p >> 3) === st.pos.side) cls += " ch-check";
        if (targets[sq]) cls += p ? " ch-cap" : " ch-dot";
        h += '<div class="' + cls + '" data-sq="' + sq + '">' +
          (p ? glyph(p) : "") +
          (f === 0 ? '<span class="ch-rk">' + (rank + 1) + "</span>" : "") +
          (r === 7 ? '<span class="ch-fl">' + String.fromCharCode(97 + file) + "</span>" : "") +
          "</div>";
      }
    }
    h += "</div>";
    if (st.promo) {
      h += '<div class="ch-promo">';
      var col = st.pos.side;
      var types = [CH_Q, CH_R, CH_B, CH_N];
      for (i = 0; i < types.length; i++) {
        h += '<button class="ch-promo-btn" type="button" data-pt="' + types[i] + '">' +
          glyph(types[i] + (col ? 8 : 0)) + "</button>";
      }
      h += "</div>";
    }
    el.innerHTML = h;
    var cells = el.getElementsByClassName("ch-sq");
    for (i = 0; i < cells.length; i++) {
      (function (c) {
        c.onclick = function () { click(parseInt(c.getAttribute("data-sq"), 10)); };
      })(cells[i]);
    }
    var pb = el.getElementsByClassName("ch-promo-btn");
    for (i = 0; i < pb.length; i++) {
      (function (b) {
        b.onclick = function () {
          var pt = parseInt(b.getAttribute("data-pt"), 10);
          var cands = st.promo;
          st.promo = null;
          for (var k = 0; k < cands.length; k++) {
            if (cands[k].p === pt) { commit(cands[k]); return; }
          }
        };
      })(pb[i]);
    }
  }

  function commit(m) {
    st.sel = -1;
    st.promo = null;
    st.enabled = false;
    paint();
    o.onMove(m);
  }

  function click(sq) {
    if (!st.enabled || !st.pos) return;
    var mine = o.color();
    if (st.sel >= 0) {
      var cands = [];
      for (var i = 0; i < st.legal.length; i++) {
        if (st.legal[i].f === st.sel && st.legal[i].t === sq) cands.push(st.legal[i]);
      }
      if (cands.length === 1) { commit(cands[0]); return; }
      if (cands.length > 1) { st.promo = cands; paint(); return; }
    }
    st.promo = null;
    var p = st.pos.b[sq];
    if (p && (p >> 3) === mine && sq !== st.sel) {
      var has = false;
      for (var j = 0; j < st.legal.length; j++) if (st.legal[j].f === sq) { has = true; break; }
      st.sel = has ? sq : -1;
    } else st.sel = -1;
    paint();
  }

  return {
    /* legal: legal moves for st.pos (needed for click handling) */
    update: function (pos, legal, last, enabled, check) {
      st.pos = pos; st.legal = legal || []; st.last = last || null;
      st.enabled = !!enabled; st.check = !!check; st.sel = -1; st.promo = null; st.hint = null;
      paint();
    },
    setHint: function (f, t2) { st.hint = { f: f, t: t2 }; paint(); },
    setFlip: function (f) { o.flip = f; paint(); },
    setEnabled: function (e) { st.enabled = e; if (!e) { st.sel = -1; st.promo = null; } paint(); }
  };
}

function chessResultText(result, winnerColor, myColor) {
  /* returns text for the status line */
  var why = {
    checkmate: t("chessMate"), stalemate: t("chessStale"), insufficient: t("chessInsuff"),
    fifty: t("chessFifty"), repetition: t("chessRep"), resign: t("chessResign")
  }[result] || "";
  return why;
}

function chessMovesHtml(sanList) {
  var h = "";
  for (var i = 0; i < sanList.length; i += 2) {
    h += '<span class="ch-mn">' + (i / 2 + 1) + ".</span> " + esc(sanList[i]) +
      (sanList[i + 1] ? " " + esc(sanList[i + 1]) : "") + "&nbsp; ";
  }
  return h;
}

/* admin cheat: ask the engine for the best move (button only exists when the admin enabled it) */
function chessCheatHtml() {
  var on = false;
  try { on = typeof adminUnlocked === "function" && adminUnlocked() && save.cheatChess; } catch (e) {}
  return on ? '<div class="row"><button class="btn small" id="ch-cheat" type="button">BEST MOVE (admin)</button></div>' : "";
}
function chessCheatBind(getPos, getKeys, board, canAsk) {
  var b = document.getElementById("ch-cheat");
  if (!b) return;
  b.onclick = function () {
    var pos = getPos();
    if (!pos || !canAsk()) return;
    b.disabled = true;
    setTimeout(function () {
      var m = chessBotMove(pos, 3, getKeys());
      b.disabled = false;
      if (m) board.setHint(m.f, m.t);
    }, 30);
  };
}

/* ============================================================
   GAME: Chess vs bot
   ============================================================ */
function viewChess() {
  var body = mountPanel("chessName");
  var st = { level: 0, color: 0, wantColor: "w", pos: null, keys: [], san: [], last: null,
             over: true, busy: false, board: null };

  function renderStart() {
    body.innerHTML =
      '<p class="hint">' + esc(t("chessIntro")) + "</p>" +
      '<div class="ch-colors">' +
        '<span class="hint">' + esc(t("chessYouPlay")) + "</span> " +
        '<button class="btn small ch-col" type="button" data-c="w">' + esc(t("chessWhite")) + "</button> " +
        '<button class="btn small ch-col" type="button" data-c="b">' + esc(t("chessBlack")) + "</button> " +
        '<button class="btn small ch-col" type="button" data-c="r">' + esc(t("chessRandom")) + "</button>" +
      "</div>" +
      '<div class="diff-row">' +
        diff(1, t("levelEasy"), t("chessEasySub"), "20-5") +
        diff(2, t("levelMedium"), t("chessMedSub"), "70-15") +
        diff(3, t("levelHard"), t("chessHardSub"), "300-50") +
      "</div>";
    var cols = body.getElementsByClassName("ch-col");
    function markCols() {
      for (var i = 0; i < cols.length; i++) {
        cols[i].className = "btn small ch-col" + (cols[i].getAttribute("data-c") === st.wantColor ? "" : " ghost");
      }
    }
    for (var i = 0; i < cols.length; i++) {
      (function (b) {
        b.onclick = function () { st.wantColor = b.getAttribute("data-c"); markCols(); };
      })(cols[i]);
    }
    markCols();
    var btns = body.getElementsByClassName("diff-btn");
    for (var j = 0; j < btns.length; j++) {
      (function (b) {
        b.onclick = function () { start(parseInt(b.getAttribute("data-l"), 10)); };
      })(btns[j]);
    }
  }
  function diff(l, name, sub, prize) {
    return '<button class="diff-btn" type="button" data-l="' + l + '">' +
      '<div class="d-name">' + esc(name) + "</div>" +
      '<div class="d-sub">' + esc(sub) + "<br>" + esc(t("prizeWord") + " " + prize) + "</div></button>";
  }

  function start(level) {
    st.level = level;
    st.color = st.wantColor === "r" ? ri(0, 1) : (st.wantColor === "b" ? 1 : 0);
    st.pos = chessNew();
    st.keys = [chessKey(st.pos)];
    st.san = [];
    st.last = null;
    st.over = false;
    st.busy = false;
    body.innerHTML =
      '<div id="ch-board"></div>' +
      '<p class="hint" id="ch-msg"></p>' +
      '<div class="ch-moves" id="ch-moves"></div>' + chessCheatHtml() +
      '<div class="row"><button class="btn ghost" id="ch-resign" type="button">' +
        esc(t("chessResignBtn")) + "</button></div>" +
      '<div class="feed" id="g-feed"></div>';
    st.board = chessBoard(document.getElementById("ch-board"), {
      flip: st.color === 1,
      color: function () { return st.color; },
      onMove: playerMove
    });
    document.getElementById("ch-resign").onclick = function () {
      if (st.over) return;
      finish({ over: true, result: "resign", winner: st.color ^ 1 });
    };
    chessCheatBind(function () { return st.pos; }, function () { return st.keys; }, st.board,
      function () { return !st.over && !st.busy && st.pos.side === st.color; });
    refresh();
  }

  function setMsg(s) {
    var el = document.getElementById("ch-msg");
    if (el) el.textContent = s;
  }

  function refresh() {
    var status = chessStatus(st.pos, st.keys);
    var mv = document.getElementById("ch-moves");
    if (mv) { mv.innerHTML = chessMovesHtml(st.san); mv.scrollTop = mv.scrollHeight; }
    var mineTurn = !status.over && st.pos.side === st.color;
    st.board.update(st.pos, status.legal, st.last, mineTurn && !st.busy, status.check);
    if (status.over) { finish(status); return; }
    if (mineTurn) setMsg(t("mpYourTurn") + (status.check ? " - " + t("chessCheck") : ""));
    else {
      setMsg(t("tttThinking"));
      botTurn();
    }
  }

  function applyMove(m) {
    var legal = chessLegal(st.pos);
    var san = chessSan(st.pos, m, legal);
    chessMake(st.pos, m);
    st.san.push(san);
    st.last = { f: m.f, t: m.t };
    st.keys.push(chessKey(st.pos));
  }

  function playerMove(m) {
    if (st.over) return;
    applyMove(m);
    refresh();
  }

  function botTurn() {
    if (st.busy) return;
    st.busy = true;
    setTimeout(function () {
      if (st.over) { st.busy = false; return; }
      var m = chessBotMove(st.pos, st.level, st.keys);
      st.busy = false;
      if (st.over || !m) return;
      applyMove(m);
      refresh();
    }, 250);
  }

  function finish(status) {
    st.over = true;
    st.busy = false;
    st.board.setEnabled(false);
    var rs = document.getElementById("ch-resign");
    if (rs) rs.parentNode.removeChild(rs);
    var why = chessResultText(status.result);
    var prize = 0, msg, kind;
    var L = st.level - 1;
    if (status.winner === st.color) { prize = [20, 70, 300][L]; msg = t("youWin"); kind = "good"; }
    else if (status.winner === null) { prize = [5, 15, 50][L]; msg = t("drawGame"); kind = ""; }
    else { msg = t("computerWins"); kind = "bad"; }
    setMsg("");
    feedLine(body, msg + (why ? " (" + why + ")" : ""), kind);
    if (prize) {
      var p = award(prize);
      feedLine(body, t("prizeWon", { n: p }), "gold");
      prizeToast(p);
      updateHUD();
    }
    againBtn(body, function () { viewChess(); });
  }

  renderStart();
}

/* ============================================================
   GAME: Chess (multiplayer) - host validates every move
   ============================================================ */
function viewMPChess() {
  var body = mountPanel("chessName");
  var m0 = MP.match;
  var myColor = m0 && m0.role === "B" ? 1 : 0;
  var st = { pos: null, last: null, san: [], over: false };

  body.innerHTML =
    '<p class="hint">' + esc(t("chessYouAre", { c: myColor ? t("chessBlack") : t("chessWhite") })) +
      " - vs " + esc(m0 ? m0.opp : "?") + "</p>" +
    '<div id="ch-board"></div>' +
    '<p class="hint" id="ch-msg"></p>' +
    '<div class="ch-moves" id="ch-moves"></div>' + chessCheatHtml() +
    '<div class="row"><button class="btn ghost" id="ch-resign" type="button">' +
      esc(t("chessResignBtn")) + "</button></div>" +
    '<div class="feed" id="g-feed"></div>';

  var board = chessBoard(document.getElementById("ch-board"), {
    flip: myColor === 1,
    color: function () { return myColor; },
    onMove: function (m) {
      mpSendMsg({ t: "chess", f: m.f, to: m.t, p: m.p || 0 });
    }
  });

  document.getElementById("ch-resign").onclick = function () {
    if (st.over) return;
    mpSendMsg({ t: "chess_resign" });
  };
  chessCheatBind(function () { return st.pos; }, function () { return []; }, board,
    function () { return !st.over && st.pos && st.pos.side === myColor; });

  function msg(s) {
    var el = document.getElementById("ch-msg");
    if (el) el.textContent = s;
  }

  function show(m, over) {
    st.pos = chessFromFen(m.fen);
    st.last = m.last ? { f: m.last[0], t: m.last[1] } : null;
    st.san = m.san || [];
    var legal = chessLegal(st.pos);
    var check = chessInCheck(st.pos);
    var mv = document.getElementById("ch-moves");
    if (mv) { mv.innerHTML = chessMovesHtml(st.san); mv.scrollTop = mv.scrollHeight; }
    var mine = !over && st.pos.side === myColor;
    board.update(st.pos, legal, st.last, mine, check);
    if (over) msg("");
    else msg((mine ? t("mpYourTurn") : t("mpWaitTurn")) + (check ? " - " + t("chessCheck") : ""));
  }

  MP.onGame = function (m) {
    if (!MP.match) return;
    if (m.t === "chess_state") {
      MP.match.over = false;
      show(m, false);
    } else if (m.t === "chess_over") {
      MP.match.over = true;
      st.over = true;
      show(m, true);
      var rs = document.getElementById("ch-resign");
      if (rs && rs.parentNode) rs.parentNode.removeChild(rs);
      var why = chessResultText(m.result);
      if (why) feedLine(body, why, "");
      var kind = m.winner === null ? "draw" : (m.winner === MP.selfId ? "win" : "lose");
      mpFinish(body, kind, 60);
    }
  };
}

/* ============================================================
   HOST helpers (called from mp.js)
   ============================================================ */
function chessHostNew() {
  var pos = chessNew();
  return { pos: pos, keys: [chessKey(pos)], san: [], last: null };
}

function chessHostPayload(c) {
  return { fen: chessToFen(c.pos), last: c.last ? [c.last.f, c.last.t] : null, san: c.san };
}

/* returns { over:bool, result, winner:"a"|"b"|null } or null if the move was illegal */
function chessHostMove(match, id, m) {
  var c = match.chess;
  var color = match.a === id ? 0 : 1;
  if (c.pos.side !== color) return null;
  var legal = chessLegal(c.pos), mv = null;
  for (var i = 0; i < legal.length; i++) {
    if (legal[i].f === m.f && legal[i].t === m.to && legal[i].p === (m.p || 0)) { mv = legal[i]; break; }
  }
  if (!mv) return null;
  c.san.push(chessSan(c.pos, mv, legal));
  chessMake(c.pos, mv);
  c.last = { f: mv.f, t: mv.t };
  c.keys.push(chessKey(c.pos));
  var s = chessStatus(c.pos, c.keys);
  if (!s.over) return { over: false };
  return { over: true, result: s.result, winner: s.winner === null ? null : (s.winner === 0 ? match.a : match.b) };
}

/* export pure logic for tests (Node etc.) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    chessNew: chessNew, chessFromFen: chessFromFen, chessToFen: chessToFen,
    chessLegal: chessLegal, chessMake: chessMake, chessUnmake: chessUnmake,
    chessStatus: chessStatus, chessKey: chessKey, chessSan: chessSan,
    chessBotMove: chessBotMove, chessInCheck: chessInCheck
  };
}
