/* ============================================================
   kocik's arcade - ADMIN EXTRAS (loaded last)
   - infinite points + cheats in the admin panel
   - room moderation for the HOST: kick, ban (chosen duration),
     troll with points (give / take)
   - every player you mess with stays on the main menu as an entry
     you can open again (even when they are offline: bans and
     points are queued until they come back)
   Only works while the admin code is unlocked.
   ============================================================ */
"use strict";

var ADM = { roster: {}, loaded: false };

/* ---------- roster (players you messed with) ---------- */
function admKey(n) { return String(n || "").toLowerCase(); }
function admLoad() {
  if (ADM.loaded) return;
  ADM.loaded = true;
  try { ADM.roster = JSON.parse(localStorage.getItem("kac_adm_roster") || "{}") || {}; } catch (e) { ADM.roster = {}; }
}
function admSave() {
  try { localStorage.setItem("kac_adm_roster", JSON.stringify(ADM.roster)); } catch (e) {}
}
function admTouch(name) {
  admLoad();
  var k = admKey(name);
  if (!ADM.roster[k]) ADM.roster[k] = { name: name, until: 0, pending: 0 };
  admSave();
  return ADM.roster[k];
}
function admPlayer(name) {
  if (!MP.isHost) return null;
  var k = admKey(name);
  for (var i = 0; i < MP.players.length; i++) {
    if (MP.players[i].id !== MP.selfId && admKey(MP.players[i].name) === k) return MP.players[i];
  }
  return null;
}
function admStatus(name) {
  var p = admPlayer(name);
  if (!p) return "offline";
  return p.status === "playing" ? "playing" : "lobby";
}
function admFmt(ms) {
  var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
}

/* ---------- host actions ---------- */
function admGive(name, n) {
  var r = admTouch(name), p = admPlayer(name);
  if (p) mpDeliver(p.id, { t: "adm", op: "points", n: n });
  else r.pending += n;
  admSave();
}
function admBan(name, mins) {
  var r = admTouch(name), p = admPlayer(name);
  r.until = new Date().getTime() + mins * 60000;
  admSave();
  if (p) mpDeliver(p.id, { t: "adm", op: "ban", ms: mins * 60000 });
}
function admUnban(name) {
  var r = admTouch(name), p = admPlayer(name);
  r.until = 0;
  admSave();
  if (p) mpDeliver(p.id, { t: "adm", op: "unban" });
}
function admKick(name) {
  admTouch(name);
  var p = admPlayer(name);
  if (p) mpHostRemove(p.id, true);
}
function admForget(name) {
  admLoad();
  delete ADM.roster[admKey(name)];
  admSave();
}
/* hooks called from mp.js */
function admOnKick(id) {
  if (!adminUnlocked()) return;
  for (var i = 0; i < MP.players.length; i++) if (MP.players[i].id === id) admTouch(MP.players[i].name);
}
function admOnJoin(id, name) {
  admLoad();
  var r = ADM.roster[admKey(name)];
  if (!r) return;
  var now = new Date().getTime();
  if (r.until > now) mpDeliver(id, { t: "adm", op: "ban", ms: r.until - now });
  if (r.pending) { mpDeliver(id, { t: "adm", op: "points", n: r.pending }); r.pending = 0; admSave(); }
}
function admIsBanned(id) {
  if (!MP.isHost) return false;
  admLoad();
  for (var i = 0; i < MP.players.length; i++) {
    if (MP.players[i].id === id) {
      var r = ADM.roster[admKey(MP.players[i].name)];
      if (r && r.until > new Date().getTime()) {
        mpDeliver(id, { t: "adm", op: "ban", ms: r.until - new Date().getTime() });
        return true;
      }
    }
  }
  return false;
}

/* ---------- client: receive commands from the host ---------- */
function admBanLeft() {
  var u = 0;
  try { u = parseInt(localStorage.getItem("kac_ban_until"), 10) || 0; } catch (e) {}
  var left = u - new Date().getTime();
  if (left <= 0) {
    if (u) { try { localStorage.removeItem("kac_ban_until"); } catch (e2) {} }
    return 0;
  }
  return left;
}
function admApplyCmd(m) {
  if (typeof adminUnlocked === "function" && adminUnlocked()) {
    toast("(admin) host tried: " + m.op + (m.n ? " " + m.n : "") + " - ignored");
    return;
  }
  if (m.op === "points" && typeof m.n === "number") {
    var n = Math.floor(m.n);
    if (typeof MPD !== "undefined" && MPD.active && MPD.snapshot) MPD.snapshot.points = Math.max(0, MPD.snapshot.points + n);
    else save.points = Math.max(0, save.points + n);
    persist();
    updateHUD();
    toast(n >= 0 ? t("admGotPoints", { n: n }) : t("admLostPoints", { n: -n }));
    if (currentView === renderMenu) renderMenu();
  } else if (m.op === "ban" && typeof m.ms === "number") {
    try { localStorage.setItem("kac_ban_until", String(new Date().getTime() + m.ms)); } catch (e) {}
    toast(t("admBanToast", { m: Math.max(1, Math.round(m.ms / 60000)) }));
    if (MP.match) { mpSendMsg({ t: "forfeit" }); }
    MP.match = null; MP.onGame = null; MP.queueGame = null;
    if (currentView !== renderMenu && currentView !== renderRoom) showView(MP.inRoom() ? renderRoom : renderMenu);
    else if (currentView === renderMenu) renderMenu();
  } else if (m.op === "unban") {
    try { localStorage.removeItem("kac_ban_until"); } catch (e2) {}
    toast(t("admUnbanToast"));
    if (currentView === renderMenu) renderMenu();
  }
}

/* banned players may only see the menu, the room lobby and the shop */
var ADM_OK_KEYS = ["mpCreate", "mpJoin", "mpRoomLobby", "mpMatchmaking", "shopName", "admPlayer", "admBanned"];
(function () {
  var _mount = mountPanel;
  mountPanel = function (key) {
    if (admBanLeft() > 0 && ADM_OK_KEYS.indexOf(key) === -1) {
      var b = _mount("admBanned");
      var tick = function () {
        var el = document.getElementById("adm-ban-left");
        if (!el) return false;
        var left = admBanLeft();
        if (left <= 0) { showView(renderMenu); return false; }
        el.textContent = t("admBannedMsg", { t: admFmt(left) });
        return true;
      };
      b.innerHTML = '<p class="hint" id="adm-ban-left"></p>';
      tick();
      var iv = setInterval(function () { if (!tick()) clearInterval(iv); }, 1000);
      return document.createElement("div");      /* the game writes into nothing */
    }
    return _mount(key);
  };
})();

function admBanBanner() {
  var left = admBanLeft();
  if (left <= 0) return "";
  return '<div class="room-bar" style="border-color:#ff4d4d;color:#ff6b6b"><b>' +
    esc(t("admBanBanner", { t: admFmt(left) })) + "</b></div>";
}

/* ---------- main menu: roster entries ---------- */
function admMenuExtras() {
  if (typeof adminUnlocked !== "function" || !adminUnlocked()) return "";
  admLoad();
  var keys = [], k;
  for (k in ADM.roster) keys.push(k);
  if (!keys.length) return "";
  var h = '<div class="term-note" style="margin-top:10px">// players you messed with (click to open)</div>';
  for (var i = 0; i < keys.length; i++) {
    var r = ADM.roster[keys[i]], st = admStatus(r.name);
    var tag = st === "offline" ? "offline" : (st === "playing" ? "in game" : "in menu");
    if (r.until > new Date().getTime()) tag += " - BANNED";
    h += '<div class="term-item" data-adm="' + esc(r.name) + '" role="button" tabindex="0">' +
      '<span class="term-num">*)</span><span class="term-label">' + esc(r.name) + "</span>" +
      '<span class="lead" aria-hidden="true"></span><span class="term-tag">' + esc(tag) + "</span></div>";
  }
  return h;
}

/* ---------- player control screen ---------- */
function admPlayerPanel(name) {
  admTouch(name);
  var body = mountPanel("admPlayer");
  var h2 = document.querySelector(".game-title");
  if (h2) h2.textContent = "Player: " + name;
  body.innerHTML =
    '<p class="hint" id="adm-pl-status"></p>' +
    '<p class="hint" id="adm-pl-note"></p>' +
    '<div class="adm-sect">points (troll)</div>' +
    '<div class="mp-row"><input class="num-input" id="adm-pl-n" type="number" value="500" min="1">' +
      '<button class="btn small" id="adm-pl-give" type="button">GIVE</button>' +
      '<button class="btn small" id="adm-pl-take" type="button">TAKE</button></div>' +
    '<div class="adm-sect">ban (cannot play anything)</div>' +
    '<div class="mp-row"><input class="num-input" id="adm-pl-min" type="number" value="5" min="1"> <span class="hint">minutes</span>' +
      '<button class="btn small" id="adm-pl-ban" type="button">BAN</button>' +
      '<button class="btn small alt" id="adm-pl-unban" type="button">UNBAN</button></div>' +
    '<div class="adm-sect">other</div>' +
    '<div class="mp-row"><button class="btn small" id="adm-pl-kick" type="button">KICK FROM ROOM</button>' +
      '<button class="btn small ghost" id="adm-pl-forget" type="button">REMOVE FROM LIST</button></div>';

  function num(id) { var v = parseInt(document.getElementById(id).value, 10); return isNaN(v) || v < 1 ? 0 : v; }
  function refresh() {
    var st = admStatus(name), r = ADM.roster[admKey(name)];
    var el = document.getElementById("adm-pl-status");
    if (!el) return false;
    var ban = r && r.until > new Date().getTime() ? "  |  BANNED " + admFmt(r.until - new Date().getTime()) + " left" : "";
    var pend = r && r.pending ? "  |  queued points: " + r.pending : "";
    el.textContent = (st === "offline" ? "OFFLINE" : (st === "playing" ? "IN A GAME" : "IN THE MENU")) + ban + pend;
    var busy = st === "playing";
    document.getElementById("adm-pl-give").disabled = busy;
    document.getElementById("adm-pl-take").disabled = busy;
    document.getElementById("adm-pl-ban").disabled = busy;
    document.getElementById("adm-pl-kick").disabled = st === "offline";
    document.getElementById("adm-pl-note").textContent = busy ? "In a game - wait until they are back in the menu (kick still works)." :
      (st === "offline" ? "Offline - points and bans are queued and apply when they rejoin." : "");
    return true;
  }
  document.getElementById("adm-pl-give").onclick = function () { var n = num("adm-pl-n"); if (n) { admGive(name, n); toast("Gave " + n + " to " + name); refresh(); } };
  document.getElementById("adm-pl-take").onclick = function () { var n = num("adm-pl-n"); if (n) { admGive(name, -n); toast("Took " + n + " from " + name); refresh(); } };
  document.getElementById("adm-pl-ban").onclick = function () { var m = num("adm-pl-min"); if (m) { admBan(name, m); toast(name + " banned for " + m + " min"); refresh(); } };
  document.getElementById("adm-pl-unban").onclick = function () { admUnban(name); toast(name + " unbanned"); refresh(); };
  document.getElementById("adm-pl-kick").onclick = function () { admKick(name); toast(name + " kicked"); refresh(); };
  document.getElementById("adm-pl-forget").onclick = function () { admForget(name); showView(renderMenu); };
  refresh();
  var iv = setInterval(function () { if (!refresh()) clearInterval(iv); }, 1000);
}

/* ---------- admin panel: cheats + room section ---------- */
var ADM_ALL_ITEMS = ["extra_guess", "helmet", "banner", "clover", "calc", "clock", "paddle", "detector", "ball", "tip"];

function admBuildExtra(el) {
  var h = '<div class="adm-sect">infinite points</div>' +
    '<div class="adm-row"><button class="btn small" id="adm-inf" type="button">INFINITE: ' + (save.inf ? "ON" : "OFF") + "</button>" +
    '<button class="btn small" id="adm-p1k" type="button">+1,000</button>' +
    '<button class="btn small" id="adm-p1m" type="button">+1,000,000</button></div>' +
    '<div class="adm-sect">cheats</div>' +
    '<div class="adm-row">' +
    '<button class="btn small" id="adm-unl" type="button">UNLOCK SECRET GAMES</button>' +
    '<button class="btn small" id="adm-items" type="button">ALL SHOP ITEMS</button>' +
    '<button class="btn small" id="adm-daily" type="button">RESET DAILY BONUS</button>' +
    '<button class="btn small" id="adm-chess" type="button">CHESS BEST-MOVE: ' + (save.cheatChess ? "ON" : "OFF") + "</button></div>" +
    '<div class="adm-sect">room players</div><div id="adm-room"></div>';
  el.innerHTML = h;

  function again() { persist(); updateHUD(); var p = document.getElementById("admin-panel"); if (p && adminOpen) buildAdminPanel(p); if (currentView === renderMenu) renderMenu(); }
  document.getElementById("adm-inf").onclick = function () {
    if (!save.inf) { save.infBackup = save.points; save.points = 1e12; save.inf = true; toast("Infinite points ON"); }
    else { save.points = typeof save.infBackup === "number" ? save.infBackup : 100; save.inf = false; toast("Infinite points off"); }
    again();
  };
  document.getElementById("adm-p1k").onclick = function () { credit(1000); toast("+1,000"); again(); };
  document.getElementById("adm-p1m").onclick = function () { credit(1000000); toast("+1,000,000"); again(); };
  document.getElementById("adm-unl").onclick = function () { try { localStorage.setItem("kac_bonus", "1"); } catch (e) {} toast("Secret games unlocked"); again(); };
  document.getElementById("adm-items").onclick = function () { save.items = ADM_ALL_ITEMS.slice(); toast("All shop items owned"); again(); };
  document.getElementById("adm-daily").onclick = function () { save.lastBonus = ""; toast("Daily bonus reset - reload to claim it"); again(); };
  document.getElementById("adm-chess").onclick = function () { save.cheatChess = !save.cheatChess; toast("Chess best-move " + (save.cheatChess ? "ON (button in chess)" : "off")); again(); };

  var room = document.getElementById("adm-room");
  if (!MP.inRoom()) room.innerHTML = '<span class="adm-note">not in a room - create one to moderate players</span>';
  else if (!MP.isHost) room.innerHTML = '<span class="adm-note">only the room HOST can moderate</span>';
  else {
    var rows = "", i, any = false;
    for (i = 0; i < MP.players.length; i++) {
      var p = MP.players[i];
      if (p.id === MP.selfId) continue;
      any = true;
      rows += '<div class="adm-row" style="margin:4px 0"><span style="min-width:110px;color:#fff">' + esc(p.name) +
        '</span><span class="adm-note">' + (p.status === "playing" ? "in game" : "in menu") + "</span>" +
        '<button class="btn small" data-mess="' + esc(p.name) + '" type="button">MESS</button>' +
        '<button class="btn small ghost" data-akick="' + esc(p.name) + '" type="button">KICK</button></div>';
    }
    room.innerHTML = any ? rows : '<span class="adm-note">nobody else is in the room</span>';
    var bs = room.getElementsByClassName("btn");
    for (i = 0; i < bs.length; i++) {
      (function (b) {
        if (b.getAttribute("data-mess")) b.onclick = function () { admPlayerPanel(b.getAttribute("data-mess")); };
        if (b.getAttribute("data-akick")) b.onclick = function () { admKick(b.getAttribute("data-akick")); buildAdminPanel(document.getElementById("admin-panel")); };
      })(bs[i]);
    }
  }
}
