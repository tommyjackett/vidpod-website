/* VIDPOD Style Studio v3: engine and page. Everything client-specific comes from board.json.
   The looks themselves live in studio-looks.js (window.VPLooks). */
(function () {
  "use strict";

  /* ================= storage: the artifact database (or this device) ================= */
  var dbReady = (function () {
    var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, 10000); });
    var use;
    try { use = window.claude && typeof window.claude.use === "function" ? window.claude.use("db") : null; } catch (e) { use = null; }
    if (!use) return Promise.resolve(null);
    return Promise.race([Promise.resolve(use).catch(function () { return null; }), timeout]);
  })();
  function local(key, val) { try { if (val === undefined) return localStorage.getItem(key); if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) { return null; } }

  /* ================= the VIDPOD log: every sign-in, pick, like and screenshot goes to the Google Sheet "VidPod Studio Log"
     through a Google Apps Script web app (URL in codes.json, log_endpoint). Plain text body, no-cors: no preflight. ================= */
  var PAGE_VERSION = "v7";
  var SIGN = null, LOG_URL = "", CODES = {};
  function post(tab, rows, extra) {
    if (!LOG_URL || typeof fetch !== "function") return Promise.resolve(false);
    var body = JSON.stringify(Object.assign({
      tab: tab, name: (S && S.viewer) || (SIGN && SIGN.name) || "", client: B ? B.client.name : "", project: B && B.project ? (B.project.label || B.project.id) : "",
      code: SIGN ? SIGN.code : "", version: PAGE_VERSION + (B ? " (board " + B.board.version + ")" : ""), rows: rows || [{}]
    }, extra || {}));
    var opt = { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body };
    if (body.length < 60000) opt.keepalive = true;
    return fetch(LOG_URL, opt).then(function () { return true; }).catch(function () { return false; });
  }
  var toastT = 0;
  function toast(msg) { var t = document.getElementById("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2200); }

  /* ================= icons ================= */
  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.5a8 8 0 0 1 0 11"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>',
    heartOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>',
    zones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9 6.5h6M9 17.5h6" stroke-dasharray="1.6 1.8"/></svg>',
    clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ================= state ================= */
  var B = null;
  var S = { sec: null, view: null, looks: {}, picks: {}, app: "", viewer: "", hookText: null, likes: {}, favOnly: false, vtype: null, fixes: {} };
  /* headless renders (tools/studio_render.sh) sign in as "VIDPOD render": each section renders alone (no opener handover demo) */
  var RENDER = (function () { try { return localStorage.getItem("vidpod-studio-viewer") === "VIDPOD render"; } catch (e) { return false; } })();
  var video = document.getElementById("video");
  var screenEl = document.getElementById("screen");
  var under = document.getElementById("under"), over = document.getElementById("layer"), ui = document.getElementById("ui");
  var backdrop = document.getElementById("backdrop");
  var scale = 0.25, live = null, R = null;
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* phones (iOS Safari kills tabs that hold too much video and GPU memory): LITE = one video decoding at a time, small
     loops, studio footage as a still, slower close-up. Desktop keeps the richer preview. */
  var LITE = (window.matchMedia && matchMedia("(max-width: 820px), (pointer: coarse)").matches) || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
  /* one video at a time: when a video starts, every other video on the page pauses and lets go of its file
     (src removed + load()), except the main clip's own cut-out matte, which plays in step with it */
  function releaseVideo(v) { try { if (v.vpRelease) { v.vpRelease(); return; } v.pause(); if (v.getAttribute("src")) { v.removeAttribute("src"); v.load(); } } catch (e) {} }
  function followsMain(o) { return o === depthVid || studioRegs.some(function (r) { return r.el === o; }); }
  document.addEventListener("play", function (e) {
    var v = e.target; if (!v || v.tagName !== "VIDEO" || followsMain(v)) return;
    Array.prototype.forEach.call(document.querySelectorAll("video"), function (o) {
      if (o === v || followsMain(o)) return;   // the matte and studio layers follow the main clip's clock
      if (live && o === live.pre) { if (v !== video && !LC.paused) { setClock(clockT(), false); setPlayIcon(); } try { o.pause(); } catch (x) {} return; }   // a finished effect pauses (Play brings it back)
      if (o === video) { try { o.pause(); } catch (x) {} return; }          // the main clip pauses (Play brings it back)
      releaseVideo(o);
    });
  }, true);
  // the main clip lets go of its file while a finished effect plays in its place, and picks it up again after
  function releaseMain() { try { video.pause(); if (video.getAttribute("src")) { video.removeAttribute("src"); video.load(); } } catch (e) {} }
  function ensureMain() { if (B && B.base && B.base.video && !video.getAttribute("src")) { video.src = B.base.video; } }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sec(id) { return B.sections.filter(function (s) { return s.id === id; })[0]; }
  function styleDef(secObj, id) { return secObj.styles.filter(function (s) { return s.id === id; })[0]; }
  function fontDef(id) { var f = B.fonts.filter(function (x) { return x.id === id; })[0] || B.fonts[0]; return f.id === "brand" ? Object.assign({ id: "brand", label: f.label, sub: f.sub }, B.brand.font) : f; }
  function swatch(id) { if (/^#[0-9a-f]{6}$/i.test(String(id))) return { id: id, label: "Custom " + String(id).toUpperCase(), hex: String(id).toUpperCase() }; return (B.brand.swatches.filter(function (s) { return s.id === id; })[0] || B.brand.swatches[0]); }
  /* colour roles: every colour row is named by exactly what it colours; a second row where a style has two colourable parts.
     [first row label, second row label, second row default swatch]. Every swatch is applied as picked (no hidden fallbacks);
     text that sits on a box only swaps to a readable ink when it would match the box. */
  var COLOUR_ROLES = {
    "cap-weight-shift": ["Text colour"], "cap-per-word-rise": ["Text colour"], "cap-karaoke": ["Text colour"],
    "cap-box-word": ["Box colour", "Text colour", "white"], "cap-editorial": ["Text colour", "Key word colour", "primary"],
    "cap-colour-pop": ["Text colour", "Spoken word colour", "primary"], "cap-pill-karaoke": ["Pill colour", "Text colour", "dark"],
    "cap-clip-wipe": ["Text colour", "Key word colour", "primary"],
    "hook-bars": ["Bar colour", "Text colour", "dark"], "hook-mixed": ["Big word colour", "Small words colour", "white"],
    "hook-behind": ["Big word colour", "Text colour", "white"], "hook-quote": ["Key word colour", "Card colour", "white"],
    "hook-wordbyword": ["Text colour"], "hook-serif": ["Text colour"],
    "lt-clean-bar": ["Tab colour", "Card colour", "white"], "lt-soft-pill": ["Dot colour", "Pill colour", "white"],
    "lt-dark-card": ["Line colour", "Card colour", "dark"], "lt-accent-underline": ["Line colour", "Text colour", "white"],
    "lt-mask-reveal": ["Sweep colour", "Text colour", "white"], "lt-stack-bars": ["Role bar colour", "Name bar colour", "dark"],
    "hk-behind-head": ["Big word colour"], "hk-quote-box": ["Box colour", "Text colour", "dark"], "hk-mixed-stack": ["Big word colour", "Small words colour", "white"], "hk-highlight-bars": ["Top bar colour", "Bottom bar colour", "dark"], "hk-serif-keyword": ["Keyword colour", "Caps colour", "white"], "hk-headline-band": ["Text colour", "Band colour", "dark"],
    "cap-chest-punch": ["Text colour", "Punch word colour", "primary"], "hk-glow-intro": ["Punch line colour", "Top line colour", "white"]
  };
  function colourRole(styleId) { return COLOUR_ROLES[styleId] || ["Colour"]; }
  function colour2Of(L) { var r = colourRole(L.style); return r[1] ? (L.colour2 || r[2]) : null; }
  function isLight(hex) { var h = hex.replace("#", ""); var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) > 150; }
  function fmt(t) { t = Math.max(0, t); return Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0"); }
  var _cv = document.createElement("canvas").getContext("2d");
  function textW(text, weight, size, family) { _cv.font = weight + " " + size + "px \"" + family + "\""; return _cv.measureText(text).width; }
  function multi(sid) { return !!sec(sid || S.sec).multi; }

  /* ================= words + hook text ================= */
  var CASE = "spoken", PUNCT = false;
  // names kept as written in lowercase looks: the board's names plus every name fixed under "Names to check"
  function nameWords() { var fx = curFixes() || {}, out = (B.base.proper || []).slice(); Object.keys(fx.casing || {}).forEach(function (k) { out.push(fx.casing[k]); }); (fx.replace || []).forEach(function (r) { if (/[A-Z]/.test(String(r.to || ""))) out.push(String(r.to)); }); return out; }
  function caseText(str, c) {
    var out = c === "upper" ? str.toUpperCase() : (c === "lower" || c === "sentence") ? str.toLowerCase() : str;
    if (c === "lower") { nameWords().forEach(function (tok) { var re = new RegExp("(^|[^A-Za-z@'])(" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z])", "gi"); out = out.replace(re, function (m, a) { return a + tok; }); }); out = out.replace(/(^|[^a-z'])i(?=$|[^a-z])/g, function (m, a) { return a + "I"; }); }
    if (c === "sentence") (B.base.proper || []).forEach(function (tok) { var re = new RegExp("(^|[^A-Za-z@'])(" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z])", "gi"); out = out.replace(re, function (m, a) { return a + tok; }); });
    (B.base.protect_case || []).forEach(function (tok) { var re = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); out = out.replace(re, tok); });
    return out;
  }
  function W(i) { return B.base.words[i]; }
  // display text (caption rules): trailing commas and full stops go, ? ! quotes and apostrophes stay; acronyms stay in caps
  function wt(i) { var t = String(W(i).text); t = PUNCT ? t : t.replace(/[,.;:]+(?=["\u201d\u2019]?$)/, ""); if (CASE === "lower" && /^[^a-z]*[A-Z][^a-z]*[A-Z][^a-z]*$/.test(t.replace(/['\u2019]s$/, ""))) return t; return caseText(t, CASE); }
  /* corrections per clip ("Names to check"; the same shape as a job's fixes.json): {replace:[{from, to, punctuation?}], casing:{}}.
     The words keep their count and timings: a fix lands on the first word it replaces, the rest go blank and are skipped. */
  function fixKey() { return S.clip || B.base.clip_id || "base"; }
  function curFixes() { return (S.fixes || {})[fixKey()] || null; }
  function applyFixes() {
    var b = B.base; if (!b) return; if (!b._orig) b._orig = b.words;
    var fx = curFixes(), words = b._orig.map(function (w) { return Object.assign({}, w); }), key = function (x) { return String(x).toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9.'@-]/g, "").replace(/\.+$/, ""); };
    ((fx && fx.replace) || []).forEach(function (r) {
      var from = String(r.from || "").split(/\s+/).map(key).filter(Boolean); if (!from.length || r.to == null) return;
      for (var i = 0; i + from.length <= words.length; i++) {
        if (!from.every(function (k, j) { return key(b._orig[i + j].text) === k; })) continue;
        var lastW = b._orig[i + from.length - 1], trail = r.punctuation != null ? r.punctuation : ((String(lastW.text).match(/[,.;:?!]+$/) || [""])[0]);
        words[i].text = String(r.to) + trail; words[i].end = lastW.end;
        for (var j = 1; j < from.length; j++) words[i + j].text = "";
        i += from.length - 1;
      }
    });
    b.words = words;
  }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9@']/g, ""); }
  // "I really felt *confident*\nthere was going to be a *demand*" -> lines of tokens, each timed to her spoken word
  function parseHook(txt, seg) {
    var src = (txt == null ? B.base.hook_text : txt) || "";
    var lines = src.split(/\n|\s\/\s/).map(function (l) { return l.trim(); }).filter(Boolean);
    var words = B.base.words.filter(function (w) { return w.t >= seg[0] - 0.05 && w.t < seg[1]; });
    var p = 0, prevEnd = seg[0] + 0.1, out = [];
    lines.forEach(function (line) {
      var toks = [];
      line.split(/\s+/).forEach(function (raw) {
        if (!raw) return;
        var emph = /\*/.test(raw), text = raw.replace(/\*/g, ""); if (!text) return;
        var n = norm(text), hit = -1;
        for (var k = p; k < words.length; k++) { if (norm(words[k].text) === n || norm(words[k].text).indexOf(n) === 0 && n.length > 2) { hit = k; break; } }
        var t, end;
        if (hit >= 0) { t = words[hit].t; end = words[hit].end; p = hit + 1; } else { t = prevEnd + 0.08; end = t + 0.25; }
        prevEnd = end;
        toks.push({ text: caseText(text, CASE), emph: emph, t: t, end: end });
      });
      if (toks.length) out.push(toks);
    });
    return out;
  }

  /* ================= stages: the big preview and every mini card run the same looks ================= */
  var studioRegs = [];   // live studio videos to keep in step on the main stage
  /* drop shadow strength (0 to 100) -> one soft text shadow in the brand's shadow colour. 0 = none.
     Unset = the brand's own shadow (about 40). Applies to subtitles, hook and name (every renderer reads B.brand.shadow). */
  var SHADOW_DEFAULT = 40;
  function shadowCss(n) {
    n = Math.max(0, Math.min(100, +n || 0)); if (!n) return "none";
    var k = n / 100, m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(B.brand.shadow || ""), c = m ? m[1] + "," + m[2] + "," + m[3] : "0,0,0";
    return "0 " + (1 + 4 * k).toFixed(1) + "px " + Math.round(6 + 34 * k) + "px rgba(" + c + "," + (0.2 + 0.68 * k).toFixed(2) + "), 0 1px " + (1 + 3 * k).toFixed(1) + "px rgba(" + c + "," + (0.15 + 0.45 * k).toFixed(2) + ")";
  }
  // hooks carry their own text shadows, so the strength also adds a soft drop shadow to the hook layers (0 = none)
  function layerShadow(sd, L) {
    if (!sd || sd.id !== "hook" || L.shadow == null || !(+L.shadow > 0)) return "";
    var k = Math.min(100, +L.shadow) / 100, m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(B.brand.shadow || ""), c = m ? m[1] + "," + m[2] + "," + m[3] : "0,0,0";
    return "drop-shadow(0 " + Math.round(2 + 6 * k) + "px " + Math.round(8 + 30 * k) + "px rgba(" + c + "," + (0.15 + 0.6 * k).toFixed(2) + "))";
  }
  function boardFor(L) {
    if (L.shadow == null) return B;
    var b2 = Object.create(B); b2.brand = Object.assign({}, B.brand, { shadow: shadowCss(L.shadow) }); return b2;
  }
  /* a title look that holds for a set time (style.hold [min, max] s, e.g. the glow title 3 to 5 s): from the hook window's
     start to the first word that starts a phrase inside that range, else the middle of it. studio_render.py: glow_seg(). */
  function holdSeg(st, sd) {
    var s0 = sd.segment[0], h = st.hold, ws = (B.base.words || []).filter(function (w) { return String(w.text).trim(); }), end = s0 + (h[0] + h[1]) / 2;
    for (var i = 1; i < ws.length; i++) { var d = ws[i].t - s0; if (d >= h[0] && d <= h[1] && (/[,.;:?!]$/.test(String(ws[i - 1].text)) || ws[i].t - ws[i - 1].end >= 0.25)) { end = ws[i].t; break; } }
    return [s0, Math.round(Math.min(B.base.duration || end, end) * 1000) / 1000];
  }
  function lookSeg(st, sd) { return st && st.hold ? holdSeg(st, sd) : (st && st.segment) || sd.segment; }
  // Hook text (Round 7): every hook defaults to the speaker's own line (real words rule). The Glow title is a headline, not a
  // quote: it keeps its own text (S.headText, default the board's headline) and the page marks it "Headline, edit me".
  function isHeadline(L) { var st = L && styleDef(sec("hook") || { styles: [] }, L.style); return !!(st && (st.id === "hk-glow-intro" || (st.menu && (st.menu.needs || []).indexOf("headline") >= 0))); }
  function hookTextFor(L) {
    if (isHeadline(L)) return S.headText != null ? S.headText : (L && L.text) || B.base.hook_text;
    return S.hookText != null ? S.hookText : B.base.hook_text;
  }
  function makeCtx(L, sd, styleObj, stage) {
    var f = fontDef(L.font || "brand"), sw = swatch(L.colour || "white"), c2 = colour2Of(L), sw2 = c2 ? swatch(c2) : null;
    var segm = lookSeg(styleObj, sd), BB = boardFor(L);
    return {
      L: L, f: f, hex: sw.hex, colourId: sw.id, hex2: sw2 ? sw2.hex : null, colour2Id: sw2 ? sw2.id : null, shadow: isLight(sw.hex) ? BB.brand.shadow : "none", seg: segm, card: stage.card, B: BB,
      media: stage.media, backdrop: stage.backdrop, under: stage.under, over: stage.over, safe: B.safe,
      clipKey: fixKey(), frame1: sd.id === "hook" && (L.timing || "frame1") === "frame1",
      px: function (n) { return n * stage.scale(); },
      hook: function () { return parseHook(hookTextFor(L), segm); },
      // a still of the last frame before the cut, so pushes and dissolves can show both shots at once
      freeze: function (parent, css, at) {
        var cut = at == null ? B.base.cuts[0] : at, still = cardFrame(cut - 0.01);
        if (stage.card) { var i = el("img"); i.alt = ""; i.src = still; i.style.cssText = "position:absolute;object-fit:cover;" + (css || ""); parent.appendChild(i); return { el: i, grab: function () {} }; }
        var c = el("canvas"); c.width = 540; c.height = 960; c.style.cssText = "position:absolute;background:url(\"" + still + "\") center/cover;" + (css || ""); parent.appendChild(c);
        var g = c.getContext("2d");
        return { el: c, grab: function () { try { if (video.readyState >= 2) g.drawImage(video, 0, 0, 540, 960); } catch (e) {} } };
      },
      studio: function (parent, css) {
        var e;
        if (stage.card || (LITE && B.base.studio.poster)) { e = el("img"); e.src = B.base.studio.poster; e.alt = ""; }   // phones: a still, not a second video
        else { e = el("video"); e.muted = true; e.playsInline = true; e.setAttribute("playsinline", ""); e.preload = "auto"; e.src = B.base.studio.video; e.loop = true; }
        e.style.cssText = "position:absolute;object-fit:cover;display:block;" + (css || "");
        parent.appendChild(e);
        return { el: e, from: function (t0) { if (!stage.card && e.tagName === "VIDEO") studioRegs.push({ el: e, t0: t0 }); } };
      }
    };
  }

  /* ================= renderers ================= */
  var K = {
    el: el, esc: esc, W: W, wt: wt, textW: textW, isLight: isLight, swatch: swatch, caseText: caseText,
    getCase: function () { return CASE; }, board: function () { return B; },
    phrases: function (seg) {
      var p = B.base.phrases, out = [];
      for (var k = 0; k < p.length; k++) {
        var end = k + 1 < p.length ? p[k + 1] : B.base.words.length, idx = [];
        for (var i = p[k]; i < end; i++) if (W(i).t < seg[1] && String(W(i).text).trim()) idx.push(i);
        if (idx.length) out.push(idx);
      }
      return out;
    }
  };

  /* ---- standard add-ons on top of any look: backing box or blur, and a motion add-on (float, grow, wobble) ---- */
  function addOns(r, L, seg) {
    if (!r.block) return;
    var inners = r.block.querySelectorAll(".inner");
    if (L.backing === "box" || L.backing === "blur") Array.prototype.forEach.call(inners, function (n) {
      n.style.padding = "0.22em 0.5em 0.28em"; n.style.borderRadius = "22px"; n.style.fontSize = n.style.fontSize || "inherit";
      if (L.backing === "box") n.style.background = "rgba(18,15,15,.55)";
      else { n.style.background = "rgba(255,255,255,.10)"; n.style.webkitBackdropFilter = n.style.backdropFilter = "blur(18px) saturate(1.2)"; }
    });
    var m = L.motion || "none"; if (m === "none") return;
    var b = r.block, o = { t: seg[0] }, d = seg[1] - seg[0];
    r.tl.fromTo(o, { t: seg[0] }, { t: seg[1], duration: d, ease: "none", immediateRender: true, onUpdate: function () {
      var t = o.t, u = (t - seg[0]) / d, tr = "";
      if (m === "float") tr = "translateY(" + (10 * Math.sin(t * Math.PI * 2 / 3.2)).toFixed(2) + "px) rotate(" + (0.4 * Math.sin(t * Math.PI * 2 / 4.1)).toFixed(3) + "deg)";
      else if (m === "grow") tr = "scale(" + (0.94 + 0.06 * u).toFixed(4) + ")";
      else if (m === "wobble") tr = "translate(" + (2.2 * Math.sin(t * 4.1) + 1 * Math.sin(t * 6.7)).toFixed(2) + "px," + (2 * Math.sin(t * 4.9) + 0.8 * Math.sin(t * 7.3)).toFixed(2) + "px) rotate(" + (0.22 * Math.sin(t * 3.3)).toFixed(3) + "deg)";
      b.style.transform = tr;
    } }, seg[0]);
  }

  /* ================= main engine ================= */
  var mainStage = {
    card: false, media: video, backdrop: backdrop, under: under, over: over,
    scale: function () { return scale; }
  };
  function look(id) { return S.looks[id || S.sec]; }
  /* ---- own loop clock: sections with clock "loop" (the logo) play without footage, on wall time ---- */
  var LC = { t0: performance.now() / 1000, paused: false, at: 0 };
  function isOwn(id) {
    var s = sec(id || S.sec); if (s && s.clock === "loop") return true;
    if (!s || (id && id !== S.sec) || !S.looks[s.id]) return false;
    var st = styleDef(s, S.looks[s.id].style); return viewClip(st);
  }
  /* a finished effect (made by the effects kit): preview without engine "studio". A studio look can also carry a preview:
     a finished clip of it on the client's own footage, played for VIEWING; the live engine still draws it for Adjust,
     an edited hook line or changed settings, another demo clip, and renders. */
  function fin(st) { return !!(st && st.preview && st.preview.engine !== "studio"); }
  function canAdj(st) { return !!st && !fin(st) && !!(sec(S.sec).controls || []).length && !(S.sec === "transitions" && st.id !== "tr-lens"); }
  function viewClip(st) {
    if (!st || !st.preview) return false;
    if (fin(st)) return true;
    if (RENDER || (S.adjust && S.canAdjust && canAdj(st))) return false;
    if (st.preview.clip_id && S.clip && S.clip !== st.preview.clip_id) return false;
    var sd = B.sections.filter(function (x) { return x.styles.indexOf(st) >= 0; })[0], L = sd && S.looks[sd.id];
    if (!L || L.style !== st.id) return false;
    if (sd.id === "hook" && (isHeadline(L) ? S.headText != null : S.hookText != null)) return false;
    if (Array.isArray(L.emph) || curFixes()) return false;   // edited emphasis words or name fixes: drawn live
    var d = Object.assign({ style: st.id }, clone(st.defaults || {}));
    return LOOK_KEYS.every(function (k) { return L[k] == null || d[k] == null ? L[k] == d[k] || k === "y" || k === "emphClip" : L[k] === d[k]; });
  }
  /* finished effects (board style with a `preview`): a preview loop rendered by VIDPOD, played instead of a live look */
  function preLook(st) {
    var v = el("video"); v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.loop = true;
    // phones get the 540x960 copy of the loop (same name + "-540"); if it is missing, the full-size loop
    var full = st.preview.video, small = LITE ? full.replace(/\.mp4$/i, "-540.mp4") : full;
    if (small !== full) v.addEventListener("error", function () { if (v.getAttribute("src") === small) { v.src = full; } }, { once: true });
    v.src = small; v.poster = st.preview.still;
    v.style.cssText = "position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover;display:block;";
    over.appendChild(v);
    var tl = gsap.timeline({ paused: true }); tl.to({}, { duration: st.preview.loop || 2.8 });
    var still = new Image(); still.src = st.preview.still;   // the close-up falls back to the still while the loop loads or seeks
    return { tl: tl, loop: st.preview.loop || 2.8, pre: v, preStill: still, focus: st.preview.focus || null, fixed: true };
  }
  function preSync(t) {
    var v = live && live.pre; if (!v) return;
    var L2 = live.loop, tt = ((t % L2) + L2) % L2;
    if (playing()) { if (v.paused) v.play().catch(function () {}); if (Math.abs(v.currentTime - tt) > 0.25 && Math.abs(v.currentTime - tt) < L2 - 0.25) try { v.currentTime = tt; } catch (e) {} }
    else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - tt) > 0.03) try { v.currentTime = tt; } catch (e) {} }
  }
  function playing() { return isOwn() ? !LC.paused : !video.paused; }
  function clockT() { var L2 = seg()[1], t = LC.paused ? LC.at : performance.now() / 1000 - LC.t0; return ((t % L2) + L2) % L2; }
  function setClock(t, play) { LC.at = t; LC.t0 = performance.now() / 1000 - t; if (play != null) LC.paused = !play; }
  function startPlay() { if (isOwn()) { if (LC.paused) { setClock(clockT(), true); setPlayIcon(); } return; } ensureMain(); if (video.paused) video.play().catch(function () {}); }
  function togglePlay() { if (isOwn()) { var t = clockT(); setClock(t, LC.paused); setPlayIcon(); return; } ensureMain(); if (video.paused) video.play().catch(function () {}); else video.pause(); }
  function curStyle() { return styleDef(sec(S.sec), look().style); }
  function hasCtl(name) { return sec(S.sec).controls.indexOf(name) >= 0; }
  // the Hook tab plays the opener and then 3.5 s of the house subtitles taking over (OPENERS.md handover)
  function seg() {
    if (isOwn()) return [0, (live && live.loop) || sec(S.sec).segment[1]];
    var st = curStyle(), sg = lookSeg(st, sec(S.sec));
    if (S.sec === "hook" && st && !viewClip(st) && !RENDER) return [sg[0], Math.min(B.base.duration || sg[1] + 3.5, sg[1] + 3.5)];
    return sg;
  }
  /* the opener hands over to the house subtitles: the subtitle pick (or the look on the Subtitles tab) starts when the hook
     clears, in its own place, on the same clock. Renders skip this (each section is its own layer; studio_render.py
     gives the subtitle layer the hook window as its skip). */
  function handover(r, hookCtx) {
    var ssd = sec("subtitles"); if (!ssd) return;
    var Ls = clone(S.picks.subtitles || S.looks.subtitles || {}), sst = styleDef(ssd, Ls.style); if (!sst || fin(sst) || !R[Ls.style]) return;
    var H0 = hookCtx.seg[1], end = Math.min(B.base.duration || H0 + 3.5, H0 + 3.5); if (end - H0 < 0.5) return;
    var keepC = CASE, keepP = PUNCT; CASE = Ls.case || "spoken"; PUNCT = !!Ls.punct;
    var c2 = makeCtx(Ls, ssd, sst, mainStage); c2.seg = [H0, end];
    var r2; try { r2 = R[Ls.style](c2); } catch (e) { console.error(e); }
    CASE = keepC; PUNCT = keepP;
    if (!r2 || !r2.tl) return;
    if (r2.block) {
      r2.block.classList.add("block"); over.appendChild(r2.block);
      var h = 0; Array.prototype.forEach.call(r2.block.querySelectorAll(".inner"), function (c) { h = Math.max(h, c.offsetHeight); }); if (!h) h = r2.block.offsetHeight || 100;
      var z = B.safe, y = Ls.y == null ? 1325 : Ls.y;
      r2.block.style.left = z.x0 + "px"; r2.block.style.width = (z.x1 - z.x0) + "px"; r2.block.style.height = h + "px"; r2.block.style.top = Math.round(y - h / 2) + "px";
    }
    if (r2.after) try { r2.after(); } catch (e) {}
    r2.tl.paused(false); r.tl.add(r2.tl, 0);
    var td = r.teardown; r.teardown = function () { if (td) td(); if (r2.teardown) try { r2.teardown(); } catch (e) {} };
  }
  var buildToken = 0;
  function fontLoads(f) {
    if (!document.fonts) return Promise.resolve();
    var l = [f.w_bold + " 64px \"" + f.family + "\"", f.w_light + " 64px \"" + f.family + "\""];
    if (f.display) l.push(f.w_display + " 64px \"" + f.display + "\"");
    return Promise.all(l.map(function (q) { return document.fonts.load(q).catch(function () {}); }));
  }
  function rebuild() {
    var token = ++buildToken, L = look(), sd = sec(S.sec), f = fontDef(L.font || "brand");
    fontLoads(f).then(function () { if (token === buildToken) mount(L, sd); });
  }
  function resetMedia(m, bd) {
    m.style.transform = ""; m.style.filter = ""; m.style.clipPath = ""; m.style.webkitClipPath = ""; m.style.opacity = ""; m.style.borderRadius = "";
    if (bd) { bd.innerHTML = ""; bd.style.background = ""; }
    gsap.set(m, { clearProps: "all" });
  }
  function mount(L, sd) {
    teardown(); CU.lastRect = null; CU.rectAt = 0;
    applyFixes();
    CASE = L.case || "spoken"; PUNCT = !!L.punct;
    var st = styleDef(sd, L.style);
    var ctx = makeCtx(L, sd, st, mainStage);
    var r;
    if (viewClip(st)) { releaseMain(); r = preLook(st); }
    else try { r = R[L.style](ctx); } catch (e) { console.error(e); r = { tl: gsap.timeline({ paused: true }) }; }
    if (r.block) { r.block.classList.add("block"); (r.blockUnder ? under : over).appendChild(r.block); }
    if (sd.id === "hook" && !viewClip(st) && !RENDER) handover(r, ctx);
    under.style.filter = over.style.filter = layerShadow(sd, L);
    addOns(r, L, lookSeg(st, sd));
    if (!isOwn()) ensureMain();
    live = r; buildSfx(sd, st, r);
    demoBuild(L, sd, st);
    if (isOwn()) { releaseMain(); $("t-end").textContent = fmt(seg()[1]); }
    setDepth(!!r.depth);
    place();
    if (r.after) r.after();
    r.tl.seek(isOwn() ? clockT() : Math.max(seg()[0], video.currentTime || 0), false);
    syncPosSlider();
    refreshUI();
    if (CU.ok) cuSync();
  }
  function teardown() {
    if (!live) return;
    if (live.tl) live.tl.kill();
    if (live.teardown) try { live.teardown(); } catch (e) {}
    if (live.pre) try { live.pre.pause(); live.pre.removeAttribute("src"); live.pre.load(); } catch (e) {}
    under.innerHTML = ""; over.innerHTML = ""; under.style.filter = over.style.filter = "";
    studioRegs.forEach(function (s) { try { s.el.pause(); s.el.removeAttribute("src"); s.el.load(); } catch (e) {} }); studioRegs = [];
    resetMedia(video, backdrop);
    live = null;
  }
  function blockH() {
    if (!live || !live.block) return 0;
    var h = 0; Array.prototype.forEach.call(live.block.querySelectorAll(".inner"), function (c) { h = Math.max(h, c.offsetHeight); });
    if (!h) h = live.block.offsetHeight;
    return Math.round(h);
  }
  function yRange() { var h = blockH(), z = B.safe; var lo = z.y0 + h / 2, hi = z.y1 - h / 2; if (lo > hi) { lo = hi = (z.y0 + z.y1) / 2; } return [Math.round(lo), Math.round(hi)]; }
  /* the name card and the subtitle line never overlap: when they would, the name sits just above the subtitles.
     Subtitle block height is estimated from its size and lines (the render uses the same rule, so picks match). */
  function subsBox() {
    var sp = S.picks.subtitles || S.looks.subtitles; if (!sp || sp.y == null) return null;
    var h = Math.round((sp.size || 60) * 1.32 * ((+sp.lines || 1) === 2 ? 2 : 1) + (sp.backing && sp.backing !== "none" ? (sp.size || 60) * 0.5 : 0) + 20);
    return { top: sp.y - h / 2, bottom: sp.y + h / 2 };
  }
  function clearOfSubs(y, h) {
    var sb = subsBox(); if (!sb) return y;
    var top = y - h / 2, bot = y + h / 2, gap = 24;
    if (bot + gap <= sb.top || top - gap >= sb.bottom) return y;
    return Math.round(Math.max(B.safe.y0 + h / 2, sb.top - gap - h / 2));
  }
  function clampY(y) { var r = yRange(); return Math.round(Math.min(r[1], Math.max(r[0], y))); }
  function place() {
    if (!live || !live.block || live.fixed) { updateGrab(); return; }
    var L = look(), z = B.safe, h = blockH();
    if (L.y == null) return;
    L.y = clampY(L.y);
    if (S.sec === "name") L.y = clearOfSubs(L.y, h);
    var b = live.block;
    b.style.left = z.x0 + "px"; b.style.width = (z.x1 - z.x0) + "px"; b.style.height = h + "px"; b.style.top = Math.round(L.y - h / 2) + "px";
    updateGrab();
  }

  /* ---- depth: the person matte, so words can sit between her and the wall ---- */
  var depthVid = null, dBg = $("depth-bg"), dFg = $("depth-fg"), gl = null, glTex = null, depthOn = false, ctx2d = null;
  function initDepth() {
    if (depthVid || !B.base.depth) return;
    depthVid = el("video"); depthVid.muted = true; depthVid.playsInline = true; depthVid.setAttribute("playsinline", ""); depthVid.preload = "auto"; depthVid.crossOrigin = "anonymous";
    var dfull = B.base.depth.video, dsmall = LITE ? dfull.replace(/\.mp4$/i, "-half.mp4") : dfull;   // phones: half-size matte
    if (dsmall !== dfull) depthVid.addEventListener("error", function () { if (depthVid && depthVid.getAttribute("src") === dsmall) depthVid.src = dfull; }, { once: true });
    depthVid.src = dsmall; depthVid.className = "studio-v"; screenEl.appendChild(depthVid);
    ctx2d = dBg.getContext("2d");
    if (gl) return;
    try {
      gl = dFg.getContext("webgl", { premultipliedAlpha: true, alpha: true }) || dFg.getContext("experimental-webgl");
      var vs = "attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
      var fs = "precision mediump float;varying vec2 v;uniform sampler2D t;void main(){vec3 c=texture2D(t,vec2(v.x,v.y*.5)).rgb;float a=texture2D(t,vec2(v.x,.5+v.y*.5)).r;a=smoothstep(.12,.88,a);gl_FragColor=vec4(c*a,a);}";
      var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      glTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (e) { gl = null; }
  }
  function dropDepth() { // a new clip, or no cut-out look selected: let go of the matte video, the WebGL context and the canvases
    if (depthVid) { try { depthVid.pause(); depthVid.removeAttribute("src"); depthVid.load(); depthVid.remove(); } catch (e) {} }
    depthVid = null; depthOn = false; dBg.hidden = dFg.hidden = true; DEPTH.lastT = -1;
    if (gl) {
      try { var lc = gl.getExtension("WEBGL_lose_context"); if (glTex) gl.deleteTexture(glTex); if (lc) lc.loseContext(); } catch (e) {}
      gl = null; glTex = null;
      var fresh = dFg.cloneNode(false); fresh.width = 1; fresh.height = 1; dFg.parentNode.replaceChild(fresh, dFg); dFg = fresh;   // a lost context cannot be reused
    }
    dFg.width = dFg.height = 1; dBg.width = dBg.height = 1;   // free the backing stores
  }
  var DEPTH = { lastT: -1, lastW: 0 };
  function setDepth(on) {
    if (on) initDepth(); else if (depthVid || gl) dropDepth();
    depthOn = !!(on && gl && depthVid);
    dBg.hidden = !depthOn; dFg.hidden = !depthOn;
    sizeDepth();
  }
  function sizeDepth() {
    if (!depthOn) return;
    // the canvases match the preview as it is shown on screen (not 1080x1920)
    var dpr = Math.min(LITE ? 1.5 : 2, window.devicePixelRatio || 1), w = Math.round(screenEl.clientWidth * dpr), h = Math.round(screenEl.clientHeight * dpr);
    if (dFg.width !== w || dFg.height !== h) { dFg.width = w; dFg.height = h; dBg.width = w; dBg.height = h; DEPTH.lastT = -1; }
  }
  function drawDepth(t) {
    if (!depthOn) return;
    var d = B.base.depth.duration;
    if (t > d - 0.02) { dBg.style.visibility = dFg.style.visibility = "hidden"; return; }
    if (Math.abs(depthVid.currentTime - t) > (video.paused ? 0.02 : 0.12)) { try { depthVid.currentTime = t; } catch (e) {} }
    if (!video.paused && depthVid.paused) depthVid.play().catch(function () {});
    if (video.paused && !depthVid.paused) depthVid.pause();
    if (depthVid.readyState < 2) { dBg.style.visibility = dFg.style.visibility = "hidden"; return; }
    dBg.style.visibility = dFg.style.visibility = "visible";
    if (video.paused && DEPTH.lastT === depthVid.currentTime && DEPTH.lastW === dFg.width) return;   // nothing new to upload
    DEPTH.lastT = depthVid.currentTime; DEPTH.lastW = dFg.width;
    var vw = depthVid.videoWidth, vh = depthVid.videoHeight / 2;
    ctx2d.drawImage(depthVid, 0, 0, vw, vh, 0, 0, dBg.width, dBg.height);
    gl.viewport(0, 0, dFg.width, dFg.height);
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, depthVid); } catch (e) { return; }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ---- sound effects (licensed library, trimmed): scheduled on the timeline, played through Web Audio ---- */
  var SFX = { on: false, ctx: null, buf: {}, events: [], lastT: -1 };
  function sfxPeak(n) { return ((B.sfx || {}).files || {})[n] ? B.sfx.files[n].peak : 0; }
  function buildSfx(sd, st, r) {
    var ev = [], seg2 = (st && st.segment) || sd.segment, at = function (name, peakAt) { ev.push({ name: name, t: peakAt - sfxPeak(name) }); };
    if (r && r.sfx) r.sfx.forEach(function (e) { at(e.name, e.at); });
    else if (sd.id === "hook") { var toks = parseHook(S.hookText, seg2), em = []; toks.forEach(function (l) { l.forEach(function (tk) { if (tk.emph) em.push(tk); }); }); if (em[0]) at("pop", em[0].t); if (em.length > 1) at("riser", em[em.length - 1].t); }
    else if (sd.id === "name") at("pop", B.base.name_at + 0.2);
    else if (sd.id === "logo") at("pop", 0.3);
    else if (sd.id === "transitions" && st.id !== "tr-cut") at(st.id === "tr-white" || st.id === "tr-dip" ? "swish" : "whoosh", B.base.cuts[0]);
    else if (sd.id === "moves") { if (st.id === "move-zoom") { at("whoosh", B.base.cuts[0]); at("whoosh", B.base.cuts[0] + 2.8); } else if (st.id === "move-world") { at("riser", seg2[0] + 2.2); at("whoosh", seg2[0] + 4.9); at("whoosh", seg2[0] + 8.3); at("shimmer", seg2[0] + 10.6); } else if (st.id === "move-punch") at("swish", B.base.cuts[0]); else at("whoosh", seg2[0] + 0.6); }
    else if (sd.id === "graphics") at("pop", seg2[0] + 0.55);
    SFX.events = ev.filter(function (e) { return e.t >= seg2[0] - 0.01; });
    SFX.used = ev.map(function (e) { return e.name; }).filter(function (n, i, a) { return a.indexOf(n) === i; });
  }
  function sfxInit() {
    if (SFX.ctx) return Promise.resolve();
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return Promise.resolve();
    SFX.ctx = new AC();
    var files = (B.sfx || {}).files || {};
    return Promise.all(Object.keys(files).map(function (n) {
      return fetch(files[n].src).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return new Promise(function (res) { SFX.ctx.decodeAudioData(ab, function (b) { SFX.buf[n] = b; res(); }, function () { res(); }); }); }).catch(function () {});
    }));
  }
  function sfxPlay(n, off) { if (!SFX.ctx || !SFX.buf[n]) return; var s = SFX.ctx.createBufferSource(), g = SFX.ctx.createGain(); g.gain.value = 0.55; s.buffer = SFX.buf[n]; s.connect(g); g.connect(SFX.ctx.destination); try { s.start(0, Math.max(0, off || 0)); } catch (e) {} }
  function sfxTick(t) {
    if (SFX.on && playing() && SFX.lastT >= 0 && t > SFX.lastT && t - SFX.lastT < 0.5) SFX.events.forEach(function (e) { if (e.t > SFX.lastT && e.t <= t) sfxPlay(e.name, t - e.t); });
    SFX.lastT = t;
  }
  function setSfxIcon() { var b = $("sfx"); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/></svg>'; b.setAttribute("aria-pressed", String(SFX.on)); b.setAttribute("aria-label", SFX.on ? "Sound effects on" : "Sound effects off"); }
  $("sfx").addEventListener("click", function () {
    SFX.on = !SFX.on; setSfxIcon(); S.sfx = SFX.on; save();
    if (SFX.on) { if (video.muted) { video.muted = false; setMute(); } sfxInit().then(function () { if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume(); }); if (SFX.ctx && SFX.ctx.resume) SFX.ctx.resume(); startPlay(); }
  });

  /* ---- clock ---- */
  var scrubbing = false;
  function frame(now) {
    var s = seg(), own = isOwn(), t = own ? clockT() : video.currentTime;
    if (own && !video.paused) video.pause();
    if (!own && !video.paused && (t >= s[1] - 0.04 || t < s[0] - 0.3)) { video.currentTime = s[0]; t = s[0]; }
    if (live && live.tl) live.tl.seek(Math.max(s[0], t), false);
    if (live && live.pre) preSync(t);
    demoTick(own && live && live.pre ? DM.off + (live.pre.currentTime || 0) : t);
    if (!own) drawDepth(t); sfxTick(t);
    studioRegs.forEach(function (r) {
      var lt = t - r.t0, v = r.el, dur = v.duration || 4;
      if (lt < 0) { if (!v.paused) v.pause(); if (v.currentTime > 0.05) try { v.currentTime = 0; } catch (e) {} return; }
      lt = lt % dur;
      if (Math.abs(v.currentTime - lt) > 0.3 || video.paused) { if (Math.abs(v.currentTime - lt) > 0.04) try { v.currentTime = lt; } catch (e) {} }
      if (!video.paused && v.paused) v.play().catch(function () {});
      if (video.paused && !v.paused) v.pause();
    });
    var p = Math.min(1, Math.max(0, (t - s[0]) / (s[1] - s[0])));
    if (!scrubbing) $("scrub").value = Math.round(p * 1000);
    $("scrub").style.setProperty("--p", (p * 100).toFixed(2) + "%");
    $("t-now").textContent = fmt(t - s[0]);
    cuRender(now || performance.now());
    playAllTick(t);
    requestAnimationFrame(frame);
  }
  function setPlayIcon() { var playing = isOwn() ? !LC.paused : !video.paused; $("play").innerHTML = playing ? I.pause : I.play; $("play").setAttribute("aria-label", playing ? "Pause" : "Play"); $("play-l").textContent = playing ? "Pause" : "Play"; }
  function goSeg(play) {
    var s = seg();
    if (isOwn()) { video.pause(); setClock(0, !!play && !reduceMotion); $("t-end").textContent = fmt(s[1] - s[0]); setPlayIcon(); return; }
    ensureMain(); try { video.currentTime = s[0]; } catch (e) {} $("t-end").textContent = fmt(s[1] - s[0]);
    if (play && !reduceMotion) video.play().catch(function () {}); setPlayIcon();
  }
  function fit() { var w = screenEl.clientWidth; scale = w / 1080; [backdrop, under, over, ui].forEach(function (l) { l.style.transform = "scale(" + scale + ")"; }); sizeDepth(); updateGrab(); }

  /* ---- check against an app: the app screen plus the covered areas, labelled ---- */
  var dragging = false, activeSnap = null;
  /* safe zones: Reels, TikTok and Shorts show the app screen (measured mock-ups); YouTube shows YouTube's own published
     safe area for vertical video (TEMPLATES/social-safe-zones/safe-zones.json youtube_shorts: top 288, bottom 672, right 192) */
  var YT = { id: "youtube", label: "YouTube", name: "YouTube", note: "YouTube's own guide", img: null,
    covered: [[0, 0, 1080, 288, "top"], [888, 288, 1080, 1248, "right side"], [0, 1248, 1080, 1920, "bottom"]] };
  function appList() { var l = (B.apps || []).slice(); if (!l.some(function (a) { return a.id === "youtube"; })) l.push(YT); return l; }
  function appDef(id) { return appList().filter(function (a) { return a.id === id; })[0]; }
  function refreshUI() {
    ui.innerHTML = "";
    var a = appDef(S.app);
    if (a) {
      if (a.img) { var img = el("img", "app-ui"); img.alt = ""; img.src = a.img; ui.appendChild(img); }
      a.covered.forEach(function (c) {
        var d = el("div", "cover" + (c[4] === "buttons" || c[4] === "right side" ? " rail" : ""), "<span>" + (a.img ? "Covered by " + esc(a.name) + " " + esc(c[4]) : "Keep clear") + "</span>");
        d.style.left = c[0] + "px"; d.style.top = c[1] + "px"; d.style.width = (c[2] - c[0]) + "px"; d.style.height = (c[3] - c[1]) + "px";
        if (c[4] === "buttons") { d.firstChild.style.transformOrigin = "50% 50%"; }
        ui.appendChild(d);
      });
    }
    if (dragging) {
      var z = B.safe, box = el("div", "safe-box"); box.style.cssText = "left:" + z.x0 + "px;top:" + z.y0 + "px;width:" + (z.x1 - z.x0) + "px;height:" + (z.y1 - z.y0) + "px;"; ui.appendChild(box);
      ui.appendChild(el("div", "vguide"));
      (B.snaps || []).forEach(function (sn) {
        var g = el("div", "guide" + (activeSnap === sn.y ? " on" : ""), "<span>" + esc(sn.label) + "</span>"); g.style.top = sn.y + "px"; ui.appendChild(g);
      });
    }
    var note = $("check-note");
    note.textContent = a ? (a.img ? "Red areas are covered by the " + a.name + " app." : "Red areas are outside " + a.note + ".") : "";
    var sb = $("sz-btn"); if (sb) { sb.setAttribute("aria-pressed", String(!!a)); sb.innerHTML = I.zones + (a ? '<span class="tag"></span>' : ""); }
  }
  /* round rail buttons that open a small drop-down (Safe zones, Footage) */
  function railMenu(btnId, menuId, items, cur, onPick) {
    var m = $(menuId), b = $(btnId); m.innerHTML = "";
    items.forEach(function (it) {
      var x = el("button", "", esc(it.label) + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "")); x.type = "button"; x.setAttribute("role", "menuitemradio"); x.setAttribute("aria-checked", String(it.id === cur));
      x.addEventListener("click", function () { closeMenus(); onPick(it.id); });
      m.appendChild(x);
    });
  }
  function closeMenus() { ["sz", "clip"].forEach(function (k) { var m = $(k + "-menu"), b = $(k + "-btn"); if (m) m.hidden = true; if (b) b.setAttribute("aria-expanded", "false"); }); }
  function openMenu(k) {
    var m = $(k + "-menu"), open = m.hidden; closeMenus(); if (!open) return;
    m.hidden = false; $(k + "-btn").setAttribute("aria-expanded", "true");
    var f = m.querySelector('[aria-checked="true"]') || m.querySelector("button"); if (f) f.focus();
  }
  document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest(".rail-menu")) closeMenus(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenus(); });
  function renderCheck() {
    railMenu("sz-btn", "sz-menu", [{ id: "", label: "Off" }].concat(appList().map(function (a) { return { id: a.id, label: a.label, sub: a.img ? "" : "guide" }; })), S.app, function (id) { S.app = id; renderCheck(); refreshUI(); });
  }

  /* ---- drag to position: only the text itself grabs, so the page still scrolls on a phone ---- */
  var grab = $("grab"), dragStart = null;
  function canDrag() { return hasCtl("position") && live && live.block && !live.fixed; }
  function updateGrab() {
    if (!canDrag()) { grab.hidden = true; return; }
    var L = look(), z = B.safe, h = Math.max(blockH(), 90);
    grab.hidden = false;
    grab.style.left = (z.x0 * scale) + "px"; grab.style.width = ((z.x1 - z.x0) * scale) + "px";
    grab.style.top = ((L.y - h / 2) * scale) + "px"; grab.style.height = (h * scale) + "px";
  }
  function snapY(y) {
    var best = null;
    (B.snaps || []).forEach(function (sn) { var c = clampY(sn.y); if (Math.abs(y - c) < 34 && (best === null || Math.abs(y - c) < Math.abs(y - best.c))) best = { c: c, y: sn.y }; });
    return best ? { y: best.c, snap: best.y } : { y: Math.round(y / 2) * 2, snap: null };
  }
  grab.addEventListener("pointerdown", function (e) {
    if (!canDrag()) return;
    e.preventDefault();
    dragging = true; grab.classList.add("active"); grab.setPointerCapture(e.pointerId);
    dragStart = { cy: e.clientY, y: look().y }; hideHint(); refreshUI();
  });
  grab.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var raw = clampY(dragStart.y + (e.clientY - dragStart.cy) / scale), s = snapY(raw);
    look().y = s.y; if (activeSnap !== s.snap) { activeSnap = s.snap; refreshUI(); }
    place(); syncPosSlider(); markDirty();
  });
  function endDrag() { if (!dragging) return; dragging = false; activeSnap = null; grab.classList.remove("active"); refreshUI(); save(); }
  grab.addEventListener("pointerup", endDrag); grab.addEventListener("pointercancel", endDrag);
  var hintShown = false;
  function showHint() { if (hintShown || !canDrag()) return; hintShown = true; $("drag-hint").classList.add("show"); grab.classList.add("hint"); setTimeout(hideHint, 3200); }
  function hideHint() { $("drag-hint").classList.remove("show"); grab.classList.remove("hint"); }

  /* ================= option pills: static stills at each option's best frame ================= */
  /* Text options (subtitles, hook, name) show a magnified crop of the words so they read at pill size; the others show
     the whole frame. Pills never animate: tap one and it plays in the big preview, with the close-up under it. */
  var cards = [], cardIO = null;
  var TEXT_SECS = ["subtitles", "hook", "name", "logo"];
  function cardFrame(t) { var fr = B.base.card_frames, src = fr[0].src; fr.forEach(function (f) { if (t >= f.t) src = f.src; }); return src; }
  function buildCard(sd, st) {
    var land = TEXT_SECS.indexOf(sd.id) >= 0, sq = sd.id === "graphics";
    var btn = el("button", "card " + (land ? "land" : sq ? "sq" : "port")); btn.type = "button"; btn.setAttribute("role", "radio"); btn.dataset.style = st.id;
    btn.setAttribute("aria-label", st.code + " " + st.label);
    var mini = el("div", "mini"), fr = el("div", "frame");
    var bd = el("div", "layer"), img = el("img", "bg"), und = el("div", "layer"), cut = el("img", "cut"), ov = el("div", "layer");
    img.alt = ""; cut.alt = ""; cut.hidden = true; if (sd.clock === "loop") img.style.visibility = "hidden";
    [bd, img, und, cut, ov].forEach(function (x) { fr.appendChild(x); });
    mini.appendChild(fr); mini.appendChild(el("span", "picked-mark", I.tick));
    btn.appendChild(mini);
    btn.appendChild(el("div", "meta", '<span class="id">' + esc(st.code) + '</span><span class="nm">' + esc(st.label) + "</span>" + (isOurPick(sd.id, st.id) ? '<span class="our">Our pick</span>' : "")));
    var c = { btn: btn, mini: mini, fr: fr, img: img, und: und, ov: ov, cut: cut, bd: bd, sd: sd, st: st, tl: null, visible: false, land: land, sq: sq, built: false };
    btn.addEventListener("click", function () { chooseStyle(st.id); });
    return c;
  }
  // the moment that shows each option best: all the words in, the effect at its peak
  function bestT(sd, st, r) {
    if (st.best_t != null) return st.best_t;
    var sg = r && r.loop ? [0, r.loop] : (st.segment || sd.segment), d = sg[1] - sg[0];
    if (r && r.loop) return r.loop * 0.8;
    if (sd.id === "subtitles" && r && r.tl) { // the moment with the most words on screen (first 8 s), so the pill shows a full line
      var best = sg[0] + 1, most = -1;
      B.base.words.forEach(function (w) {
        if (w.t < sg[0] || w.t > Math.min(sg[1], sg[0] + 8)) return;
        var t = w.t + 0.15; try { r.tl.seek(t, false); } catch (e) { return; }
        var n = 0; Array.prototype.forEach.call(r.block ? r.block.querySelectorAll(".grp") : [], function (g) {
          if (g.style.visibility === "hidden" || +(g.style.opacity || 1) < 0.5) return;
          Array.prototype.forEach.call(g.querySelectorAll("span"), function (sp) { if (sp.querySelector("span")) return; var o = +(getComputedStyle(sp).opacity || 1); if (o > 0.5) n += sp.textContent.length; });
        });
        if (n >= most) { most = n; best = t; }
      });
      return best;
    }
    if (sd.id === "hook") return Math.max(sg[0], sg[1] - 0.6);
    if (sd.id === "name") return Math.min(sg[1] - 0.8, B.base.name_at + 1.4);
    if (sd.id === "transitions") return Math.min(sg[1], (B.base.cuts[0] || sg[0] + d / 2) + 0.04);
    return sg[0] + d * 0.55;
  }
  function mountCard(c) {
    var sd = c.sd, st = c.st, L = cardLook(sd, st);
    if (st.preview) {
      if (c.tl) c.tl.kill(); c.und.innerHTML = ""; c.ov.innerHTML = ""; c.bd.innerHTML = ""; c.cut.hidden = true;
      c.img.style.cssText = ""; c.img.src = st.preview.still; c.r = { tl: gsap.timeline({ paused: true }) }; c.tl = c.r.tl; c.built = true;
      var w0 = c.mini.clientWidth || 124, h0 = c.mini.clientHeight || 70, zf = w0 / 1080, f = st.preview.focus;
      if (!(c.land || c.sq) || !f) { c.fr.style.transform = "scale(" + zf.toFixed(5) + ")"; return; }
      var bw = f[2] - f[0], bh = f[3] - f[1], z = Math.max(zf, Math.min(0.36, w0 * 0.96 / bw, h0 * 0.96 / bh));
      var ox = Math.min(0, Math.max(w0 - 1080 * z, w0 / 2 - (f[0] + f[2]) / 2 * z)), oy = Math.min(0, Math.max(h0 - 1920 * z, h0 / 2 - (f[1] + f[3]) / 2 * z));
      c.fr.style.transform = "translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px) scale(" + z.toFixed(5) + ")";
      return;
    }
    var stage = { card: true, media: c.img, backdrop: c.bd, under: c.und, over: c.ov, scale: function () { return 1; } };
    var ctx = makeCtx(L, sd, st, stage), prevCase = CASE, prevP = PUNCT;
    if (c.r && c.r.teardown) try { c.r.teardown(); } catch (e) {}
    if (c.tl) c.tl.kill();
    CASE = L.case || "spoken"; PUNCT = !!L.punct;
    c.und.innerHTML = ""; c.ov.innerHTML = ""; c.bd.innerHTML = ""; c.img.style.cssText = sd.clock === "loop" ? "visibility:hidden" : "";
    var r;
    try { r = R[st.id](ctx); } catch (e) { console.error(st.id, e); r = { tl: gsap.timeline({ paused: true }) }; }
    CASE = prevCase; PUNCT = prevP;
    if (r.block) {
      r.block.classList.add("block"); (r.blockUnder ? c.und : c.ov).appendChild(r.block);
      if (!r.fixed) {
        var z = B.safe, h = 0; Array.prototype.forEach.call(r.block.querySelectorAll(".inner"), function (x) { h = Math.max(h, x.offsetHeight); });
        var y = Math.min(z.y1 - h / 2, Math.max(z.y0 + h / 2, L.y || 1150));
        r.block.style.left = z.x0 + "px"; r.block.style.width = (z.x1 - z.x0) + "px"; r.block.style.height = h + "px"; r.block.style.top = Math.round(y - h / 2) + "px";
      }
    }
    if (r.after) r.after();
    c.und.style.filter = c.ov.style.filter = layerShadow(sd, L);
    addOns(r, L, st.segment || sd.segment);
    c.depth = !!r.depth; c.r = r; c.tl = r.tl; c.built = true;
    var t = bestT(sd, st, r);
    if (c.depth && B.base.card_cutout) { c.cut.src = B.base.card_cutout.src; c.cut.hidden = false; c.img.src = cardFrame(B.base.card_cutout.t); }
    else if (sd.clock !== "loop") c.img.src = cardFrame(t);
    try { r.tl.seek(t, false); } catch (e) {}
    cropCard(c);
    if (!c.cropLater) { c.cropLater = true; setTimeout(function () { c.cropLater = false; if (c.built) cropCard(c); }, 700); }
  }
  /* the words on screen right now, as a box in 1080x1920 units: visible text elements (and logo images), keeping only the
     big type (at least 55 % of the largest size), so a small caption under a giant hook word does not widen the frame */
  function textBox(roots, stopEl, left, top, k) {
    var items = [], maxFs = 0;
    var vis = function (n) { for (var e = n; e && e !== stopEl; e = e.parentElement) { var cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.05) return false; } return true; };
    roots.forEach(function (Ly) {
      Array.prototype.forEach.call(Ly.querySelectorAll("*"), function (n) {
        var own = false; for (var ch = n.firstChild; ch; ch = ch.nextSibling) if (ch.nodeType === 3 && ch.nodeValue.trim()) { own = true; break; }
        var pic = /^(IMG|svg)$/i.test(n.tagName);
        if (!own && !pic) return;
        var q = n.getBoundingClientRect(); if (q.width < 1 || q.height < 1 || !vis(n)) return;
        var fs = pic ? 9999 : parseFloat(getComputedStyle(n).fontSize) || 0; if (!pic) maxFs = Math.max(maxFs, fs);
        items.push({ q: q, fs: fs });
      });
    });
    var box = null;
    items.forEach(function (it) {
      if (it.fs < maxFs * 0.55) return;
      var q = it.q, x0 = (q.left - left) / k, y0 = (q.top - top) / k, x1 = (q.right - left) / k, y1 = (q.bottom - top) / k;
      box = box ? { x0: Math.min(box.x0, x0), y0: Math.min(box.y0, y0), x1: Math.max(box.x1, x1), y1: Math.max(box.y1, y1) } : { x0: x0, y0: y0, x1: x1, y1: y1 };
    });
    return box;
  }
  // a graphic: every visible element in the graphic layers that is not full-frame (cards, photos, text), as one box
  function graphicBox(c, mr, k) {
    var box = null;
    [c.und, c.ov].forEach(function (Ly) {
      Array.prototype.forEach.call(Ly.querySelectorAll("*"), function (n) {
        var q = n.getBoundingClientRect(); if (q.width < 2 || q.height < 2) return;
        var w = q.width / k, h = q.height / k; if (w > 1000 && h > 1700) return;
        var cs = getComputedStyle(n); if (cs.visibility === "hidden" || +cs.opacity < 0.05) return;
        var x0 = (q.left - mr.left) / k, y0 = (q.top - mr.top) / k, x1 = x0 + w, y1 = y0 + h;
        if (x1 < 0 || y1 < 0 || x0 > 1080 || y0 > 1920) return;
        box = box ? { x0: Math.min(box.x0, x0), y0: Math.min(box.y0, y0), x1: Math.max(box.x1, x1), y1: Math.max(box.y1, y1) } : { x0: x0, y0: y0, x1: x1, y1: y1 };
      });
    });
    if (box) { box.x0 = Math.max(0, box.x0); box.y0 = Math.max(0, box.y0); box.x1 = Math.min(1080, box.x1); box.y1 = Math.min(1920, box.y1); }
    return box;
  }
  // frame the pill: text options zoom to the words; footage options show the full frame
  function cropCard(c) {
    var w0 = c.mini.clientWidth || (c.land ? 124 : 64), h0 = c.mini.clientHeight || (c.land ? 70 : 114), zFull = w0 / 1080;
    if (!c.land && !c.sq) { c.fr.style.transform = "scale(" + zFull.toFixed(5) + ")"; return; }
    c.fr.style.transform = "scale(" + zFull.toFixed(5) + ")";
    var mr = c.mini.getBoundingClientRect(), box = textBox([c.und, c.ov], c.fr, mr.left, mr.top, zFull);
    if (!box) { box = { x0: 140, y0: 700, x1: 940, y1: 1220 }; }
    if (c.sq) { var bb = graphicBox(c, mr, zFull); if (bb) box = bb; }
    var bw = Math.max(c.sd.id === "logo" ? 300 : c.sq ? 420 : 560, box.x1 - box.x0), bh = Math.max(c.sq ? 420 : 60, box.y1 - box.y0), cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    var z = Math.max(zFull, Math.min(c.sq ? 0.36 : 0.3, (w0 * 0.92) / bw, (h0 * 0.86) / bh));
    var ox = Math.min(0, Math.max(w0 - 1080 * z, w0 / 2 - cx * z)), oy = Math.min(0, Math.max(h0 - 1920 * z, h0 / 2 - cy * z));
    c.fr.style.transform = "translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px) scale(" + z.toFixed(5) + ")";
  }
  function cardLook(sd, st) {
    // a pill shows the option in the client's current font, case, colours and shadow for that tab where it makes sense
    var L = Object.assign({ style: st.id }, clone(st.defaults || {}));
    var cur = S.looks[sd.id];
    if (cur && cur.fontTouched) L.font = cur.font;
    if (cur && cur.case && hasCtlIn(sd, "case")) L.case = cur.case;
    if (cur && cur.shadow != null) L.shadow = cur.shadow;
    if (cur && sd.clock === "loop") ["bg", "speed", "label"].forEach(function (k) { if (cur[k] != null) L[k] = cur[k]; });
    return L;
  }
  function hasCtlIn(sd, name) { return (sd.controls || []).indexOf(name) >= 0; }
  /* Round 7: the pinned list. Short names, the playing one marked like a highlighter, a round Pick button on each row.
     Tap a name: it plays in the big window (one video at a time, the engine's own rules). No stills are built, so the
     list costs nothing on a phone. The old pill code above stays for reference (buildCard, mountCard, cropCard). */
  var PA = { on: false, last: -1 };
  function isPicked(sid, styleId) { var p = S.picks[sid]; return multi(sid) ? (p || []).some(function (x) { return x.style === styleId; }) : !!(p && p.style === styleId); }
  function renderCards() {
    var box = $("cards"), sd = sec(S.sec); box.innerHTML = "";
    cards = []; if (cardIO) { cardIO.disconnect(); cardIO = null; }
    var list = sd.styles.slice(), admin = isVidpodCode();
    var head = el("div", "ohead");
    head.appendChild(el("span", "lbl", esc(list.length + (list.length === 1 ? " option" : " options"))));
    if (list.length > 1) {
      var pa = el("button", "playall", "<i></i>Play all"); pa.type = "button"; pa.setAttribute("aria-pressed", String(PA.on)); pa.id = "playall";
      pa.addEventListener("click", function () { PA.on = !PA.on; PA.last = -1; pa.setAttribute("aria-pressed", String(PA.on)); if (PA.on) { var i0 = list.findIndex(function (x) { return x.id === look().style; }); chooseStyle(list[Math.max(0, i0)].id, false, true); goSeg(true); } });
      head.appendChild(pa);
    }
    box.appendChild(head);
    var lastKind = null, anyFin = list.some(function (x) { return fin(x); }), anyLive = list.some(function (x) { return !fin(x); });
    var split = anyFin && anyLive && (S.sec === "moves" || S.sec === "graphics"), grp = el("div", "ogrp"); box.appendChild(grp);
    list.forEach(function (st, i) {
      var kind = fin(st) ? "fin" : "live";
      if (split && kind !== lastKind) { if (lastKind) { grp = el("div", "ogrp"); box.appendChild(grp); } grp.appendChild(el("div", "osub", kind === "fin" ? (S.sec === "moves" ? "Effects" : "Effect graphics") : (S.sec === "moves" ? "Moves" : "Graphics"))); }
      lastKind = kind;
      var row = el("div", "orow"); row.dataset.style = st.id;
      var tags = (isOurPick(sd.id, st.id) ? '<span class="t our">Our pick</span>' : "") + (st.preview && st.preview.example ? '<span class="t ex">Example</span>' : "");
      var nb = el("button", "oname", '<span class="n">' + esc(st.label) + "</span>" + (admin ? '<span class="c">' + esc(st.code) + "</span>" : "") + tags);
      nb.type = "button"; nb.setAttribute("role", "radio"); nb.setAttribute("aria-label", st.label + (admin ? " " + st.code : ""));
      nb.addEventListener("click", function () { PA.on = false; var pb = $("playall"); if (pb) pb.setAttribute("aria-pressed", "false"); chooseStyle(st.id); if (window.innerWidth < 980) { var sg = $("stage"); if (sg.getBoundingClientRect().top < -40) sg.scrollIntoView({ behavior: "smooth", block: "start" }); } });
      var pk = el("button", "opick", I.tick); pk.type = "button"; pk.setAttribute("aria-label", "Pick " + st.label);
      pk.addEventListener("click", function () { if (look().style !== st.id) chooseStyle(st.id); togglePick(st.id); });
      row.appendChild(nb); row.appendChild(pk); grp.appendChild(row);
      cards.push({ btn: row, st: st, sd: sd, built: false });
    });
    box.classList.toggle("long", list.length > 11); box.classList.toggle("split", split);
    markCards();
  }
  // Play all: each option plays once through, then the next (stops at the end of the list or on any tap)
  function playAllTick(t) {
    if (!PA.on || !playing()) { PA.last = t; return; }
    if (PA.last >= 0 && t + 0.08 < PA.last) {
      var list = sec(S.sec).styles, i = list.findIndex(function (x) { return x.id === look().style; });
      if (i < list.length - 1) chooseStyle(list[i + 1].id, false, true);
      else { PA.on = false; var pb = $("playall"); if (pb) pb.setAttribute("aria-pressed", "false"); }
      PA.last = -1; return;
    }
    PA.last = t;
  }
  /* ---- phones: step through the options under the window (prev / name / next / pick) ---- */
  function stepList() { var s0 = sec(S.sec); return (s0 && s0.styles) || []; }
  function stepSync() {
    var box = $("step"); if (!box) return;
    var list = stepList(), L = look(), i = list.findIndex(function (x) { return x.id === L.style; });
    if (list.length < 2 || i < 0) { box.hidden = true; return; }
    box.hidden = false;
    var st = list[i], picked = isPicked(S.sec, st.id);
    $("st-name").textContent = st.label;
    $("st-n").textContent = (i + 1) + " of " + list.length + (isVidpodCode() ? "  ·  " + st.code : "") + (picked ? "  ·  picked" : "");
    var pk = $("st-pick"); pk.setAttribute("aria-pressed", String(picked)); pk.setAttribute("aria-label", (picked ? "Remove " : "Pick ") + st.label);
  }
  function stepGo(d) {
    var list = stepList(), i = list.findIndex(function (x) { return x.id === look().style; }); if (!list.length) return;
    PA.on = false; var pb = $("playall"); if (pb) pb.setAttribute("aria-pressed", "false");
    chooseStyle(list[(i + d + list.length) % list.length].id);
  }
  function initStep() {
    if (!$("step")) return;
    $("st-pick").innerHTML = I.tick;
    $("st-prev").addEventListener("click", function () { stepGo(-1); });
    $("st-next").addEventListener("click", function () { stepGo(1); });
    $("st-pick").addEventListener("click", function () { togglePick(look().style); });
  }
  /* ---- VIDPOD's pick: board.json vidpod_pick holds one recommended option (and its settings) per section ---- */
  function isOurPick(sid, styleId) { var p = (B.vidpod_pick || {})[sid]; if (!p) return false; return Array.isArray(p) ? p.some(function (x) { return x.style === styleId; }) : p.style === styleId; }
  function markCards() {
    var L = look();
    cards.forEach(function (c) {
      var on = c.st.id === L.style, picked = isPicked(S.sec, c.st.id);
      c.btn.classList.toggle("cur", on); c.btn.querySelector(".oname").setAttribute("aria-checked", String(on));
      var pk = c.btn.querySelector(".opick"); pk.setAttribute("aria-pressed", String(picked)); pk.setAttribute("aria-label", (picked ? "Remove " : "Pick ") + c.st.label);
    });
    stepSync();
  }

  /* ================= panel ================= */
  /* sections: House style (same on every video), Openers, Motion graphics, Cuts. Box style is a placeholder tab that
     studio-mograph.js fills (window.VPMograph.render). Tab labels come from the board, except where noted here. */
  // Round 7 (8 Nov): House style, then one tab per kind of moment, in the order a video plays
  var GROUPS = [
    { id: "house", label: "Whole video", tabs: ["subtitles", "name", "logo"] },
    { id: "openers", label: "Openers", tabs: ["hook"] },
    { id: "graphics", label: "Graphics", tabs: ["graphics"] },
    { id: "fx", label: "Effects and moves", tabs: ["moves"] },
    { id: "joins", label: "Transitions", tabs: ["transitions"] },
    { id: "bg", label: "Backgrounds", tabs: ["backgrounds"] },
    { id: "end", label: "End card", tabs: ["endcard"] }
  ];
  var TAB_LABEL = { hook: "Openers", box: "Box style", moves: "Effects and moves", graphics: "Graphics", transitions: "Transitions", backgrounds: "Backgrounds", endcard: "End card" };
  var SEC_HELP = {
    subtitles: "Runs under everything said. Always centred.", hook: "The first line on screen, from the first frame.",
    name: "Who is speaking, the first time they talk.", logo: "How the logo signs off.",
    graphics: "A number, a list or a quote, right when it is said. Pick as many as you like.", moves: "Bigger moments for a key line. One or two per video is plenty.",
    transitions: "Plays at the join between two moments.", backgrounds: "A new background behind the speaker.", endcard: "The last few seconds."
  };
  function renderTabs() {
    var t = $("tabs"); t.innerHTML = "";
    GROUPS.forEach(function (g) {
      var ids = g.tabs.filter(function (id) { return id === "box" || sec(id); }); if (!ids.length) return;
      var gw = el("div", "tgrp" + (g.tabs.length === 1 ? " solo" : "")); gw.setAttribute("role", "group"); gw.setAttribute("aria-label", g.label);
      gw.appendChild(el("span", "tgrp-l", g.tabs.length === 1 ? "&nbsp;" : esc(g.label)));
      var row = el("div", "tgrp-t");
      ids.forEach(function (id) {
        var s = id === "box" ? null : sec(id), p = s ? S.picks[s.id] : null, has = s ? (multi(s.id) ? p && p.length : !!p) : false;
        var on = id === "box" ? S.view === "box" : (S.view !== "box" && id === S.sec);
        var b = el("button", "tab" + (has ? " picked" : ""), esc(TAB_LABEL[id] || s.tab) + '<span class="pk" aria-hidden="true"></span>');
        b.type = "button"; b.setAttribute("role", "tab"); b.id = "tab-" + id; b.setAttribute("aria-selected", String(on));
        b.addEventListener("click", function () { if (id === "box") openBox(); else switchSec(id, true); });
        row.appendChild(b);
      });
      gw.appendChild(row); t.appendChild(gw);
    });
    var sel = t.querySelector('[aria-selected="true"]'); if (sel && t.scrollWidth > t.clientWidth) { var gl = sel.closest(".tgrp"), x = gl ? gl.offsetLeft : sel.offsetLeft; if (x + (gl || sel).offsetWidth > t.scrollLeft + t.clientWidth || x < t.scrollLeft) t.scrollLeft = Math.max(0, x - 16); }
    if (sel && sel.closest(".tgrp") === t.firstChild) t.scrollLeft = 0;
    tabFade();
  }
  /* back to the start: first section, top of the page, preview from the beginning, no safe zone, nothing open */
  function goStart() {
    closeMenus(); if ($("stage").classList.contains("full")) setFull(false);
    S.app = ""; renderCheck(); refreshUI();
    switchSec(orderedSections()[0].id, false);
    $("tabs").scrollLeft = 0; tabFade();
    window.scrollTo(0, 0); requestAnimationFrame(function () { window.scrollTo(0, 0); }); setTimeout(function () { window.scrollTo(0, 0); }, 350);
  }
  // the section row fades at an edge while there is more to scroll
  function tabFade() { var t = $("tabs"); if (!t) return; t.classList.toggle("more-l", t.scrollLeft > 4); t.classList.toggle("more-r", t.scrollLeft + t.clientWidth < t.scrollWidth - 4); }
  /* Box style (Motion graphics): the preview keeps the last look; the panel shows the module's container */
  function showBox(on) { $("panel-body").hidden = on; $("mograph-view").hidden = !on; }
  function openBox() {
    S.view = "box"; showBox(true); renderTabs(); cuSync();
    var api = mgApi();
    try { if (window.VPMograph && typeof window.VPMograph.render === "function" && !openBox.done) { window.VPMograph.render($("mograph"), api); openBox.done = true; } } catch (e) { console.error(e); }
    try { document.dispatchEvent(new CustomEvent("vidpod:mograph-open", { detail: api })); } catch (e) {}
  }
  function mgApi() { return { board: function () { return B; }, client: function () { return B.client; }, el: el, esc: esc, toast: toast, post: post, signedIn: function () { return SIGN; } }; }
  // Openers: the opener-into-subtitles card (studio-mograph.js VPMograph.renderOpener) shows under the Hook titles options
  function renderOpenerSlot() {
    var box = $("opener-slot"); if (!box) return;
    var ok = false; // Round 7: off the main path (the Openers tab already plays the opener into the subtitles)
    box.hidden = !ok; if (!ok || box.dataset.done) return;
    try { window.VPMograph.renderOpener(box, mgApi()); box.dataset.done = "1"; } catch (e) { console.error(e); }
  }
  function renderHead() { renderOpenerSlot(); var s = sec(S.sec); $("sec-q").textContent = s.question; $("sec-help").textContent = SEC_HELP[s.id] || s.help; }
  /* who the words belong to, for the plain lines: VIDPOD sees "her words", the client sees "your words" */
  function speakerWords() {
    if (!isVidpodCode()) return { poss: "your", subj: "you", cap: "Your", you: true };
    var pr = String(B.base.pronoun || ({ vidpod: "he", atpilates: "she" })[B.client.id] || "they").toLowerCase();
    var poss = pr === "he" ? "his" : pr === "she" ? "her" : "their";
    return { poss: poss, subj: pr, cap: poss.charAt(0).toUpperCase() + poss.slice(1), you: false, plural: pr === "they" };
  }
  var MAKES = { layer: "a transparent layer for Resolve", finished: "a finished clip for that moment", endcard: "an end card, plus a transparent layer", "layer+move": "a transparent layer, plus the pull-back as a finished clip" };
  function needText(tok) {
    var w = speakerWords(), says = w.you || w.plural ? "say" : "says";
    return ({ words: w.poss + " words", line: "a line " + w.subj + " " + says, headline: "a headline (we write it, you edit it)", name: w.poss + " name and role",
      number: "a number " + w.subj + " " + says, list: "a list " + w.subj + " " + says, quote: "a line worth quoting", word: "one word " + w.subj + " " + says, place: "the place",
      cutout: "a cut-out (we make it)", broll: "B-roll", photos: "photos", logo: "your logo", takes: "two takes to join", clips: "a few clips",
      app: "an app or page screen", article: "an article or page", headlines: "headlines or posts" })[tok] || tok;
  }
  function renderNeeds() {
    var st = curStyle(), box = $("needs"); if (!box) return;
    var m = (st && st.menu) || { needs: [], makes: "" }, parts = [];
    if (m.needs && m.needs.length) parts.push("<span><b>Needs</b> " + esc(m.needs.map(needText).join(", ")) + "</span>");
    if (isVidpodCode() && m.makes) parts.push("<span><b>Makes</b> " + esc(MAKES[m.makes] || m.makes) + "</span>");
    var ex = st && st.preview && st.preview.example ? '<span class="ex">' + esc(st.preview.example_note || "Example on VIDPOD footage. We make it on yours.") + "</span>" : "";
    box.innerHTML = parts.join("") + ex;
  }
  function renderChosen() {
    var st = curStyle(), box = $("chosen"); box.innerHTML = "";
    var list = sec(S.sec).styles, i = list.findIndex(function (x) { return x.id === st.id; });
    var txt = el("div", "txt", "<b>" + esc(st.label) + '</b><span class="of">' + (i + 1 < 10 ? "0" : "") + (i + 1) + "/" + (list.length < 10 ? "0" : "") + list.length + "</span>");
    var acts = el("div", "acts");
    var ub = el("button", "btn", "Pick this"); ub.type = "button"; ub.id = "use-btn"; ub.addEventListener("click", function () { togglePick(st.id); });
    var canAdjust = canAdj(st);
    if (canAdjust) {
      var ab = el("button", "btn ghost adjust-btn", "Adjust"); ab.type = "button"; ab.id = "adjust-btn"; ab.setAttribute("aria-expanded", String(!!S.adjust)); ab.setAttribute("aria-controls", "adjust");
      ab.addEventListener("click", function () { S.adjust = !S.adjust; showAdjust(); if (curStyle() && curStyle().preview && !fin(curStyle())) rebuild(); if (S.adjust) setTimeout(function () { var r = $("adjust").getBoundingClientRect(); if (r.top > window.innerHeight - 120) $("adjust").scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 60); });
      acts.appendChild(ab);
    }
    acts.appendChild(ub);
    box.appendChild(txt); box.appendChild(acts);
    S.canAdjust = canAdjust; showAdjust();
    renderNeeds(); updateUse();
  }
  function showAdjust() { var on = !!(S.adjust && S.canAdjust); $("adjust").hidden = !on; var ab = $("adjust-btn"); if (ab) ab.setAttribute("aria-expanded", String(on)); if (CU.ok) cuSync(); }
  // pick or unpick an option (the round button on a row, or Pick this)
  function togglePick(id) {
    if (multi()) { usePick(); return; }
    var p = S.picks[S.sec];
    if (p && p.style === id && sameLook(p, look())) delete S.picks[S.sec];
    else { var L = look(); S.picks[S.sec] = clone(L); delete S.picks[S.sec].fontTouched; if (S.sec === "hook") { S.picks.hook.hookText = hookTextFor(L); S.picks.hook.textIs = isHeadline(L) ? "headline" : "quote"; } if (p && p.at) S.picks[S.sec].at = p.at; }
    save(); renderTabs(); updateUse(); updateFoot(); markCards();
    toast(S.picks[S.sec] && (multi() ? true : S.picks[S.sec].style === id) ? "Added to my picks" : "Taken out of my picks");
  }
  function seg3(label, opts, cur, onPick) {
    var w = el("div"); w.appendChild(el("p", "label", esc(label)));
    var sg = el("div", "seg"); sg.setAttribute("role", "radiogroup"); sg.setAttribute("aria-label", label);
    opts.forEach(function (o) {
      var b = el("button", "", esc(o[1])); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(o[0] === cur));
      b.addEventListener("click", function () { onPick(o[0]); });
      sg.appendChild(b);
    });
    w.appendChild(sg); return w;
  }
  /* ---- the hook line: the first thing on the Hook tab, above the cards ---- */
  function renderLead() {
    var box = $("lead"); box.innerHTML = "";
    if (!hasCtl("hooktext") || fin(curStyle())) { box.hidden = true; return; }
    box.hidden = false;
    var head = isHeadline(look()), who = speakerWords();
    var hb = el("div", "field lead-field");
    hb.innerHTML = head
      ? '<label for="hook-text">Headline<span class="tag hd">Headline, edit me</span></label><textarea id="hook-text" rows="2" spellcheck="true"></textarea><p class="hint">A headline we write for the video, never shown as a quote. One line per row, *stars* round the big word.</p>'
      : '<label for="hook-text">Opening line<span class="tag">' + esc(who.cap) + " own words</span></label><textarea id=\"hook-text\" rows=\"2\" spellcheck=\"true\"></textarea><p class=\"hint\">Straight from what " + esc(who.subj) + " " + (who.you ? "say" : "says") + ". One line per row, *stars* round the big word.</p>";
    box.appendChild(hb);
    var ta = hb.querySelector("textarea"); ta.value = hookTextFor(look());
    var hT = null; ta.addEventListener("input", function () { if (head) S.headText = ta.value; else S.hookText = ta.value; clearTimeout(hT); hT = setTimeout(function () { changed(); }, 260); });
    var rs = el("div", "hook-chips");
    var b1 = el("button", "chip", head ? "Reset the headline" : esc(who.cap) + " line"); b1.type = "button";
    b1.addEventListener("click", function () { if (head) S.headText = null; else S.hookText = null; ta.value = hookTextFor(look()); changed(); });
    var b2 = el("button", "chip", "Words as said"); b2.type = "button";
    b2.addEventListener("click", function () { var v = B.base.words.filter(function (w) { return w.t < sec("hook").segment[1]; }).map(function (w) { return w.text; }).join(" ").replace(/,\s*/g, "\n"); if (head) S.headText = v; else S.hookText = v; ta.value = v; changed(); });
    rs.appendChild(b1); rs.appendChild(b2); hb.appendChild(rs);
  }
  /* ---- colour swatches: brand colours first, then Custom (colour picker plus a checked #RRGGBB field) ---- */
  function isHex(v) { return /^#[0-9a-f]{6}$/i.test(String(v || "")); }
  function swatchRow(list, cur, onPick, aria) {
    var wrap = el("div"), sws = el("div", "swatches"); sws.setAttribute("role", "radiogroup"); sws.setAttribute("aria-label", aria || "Colour");
    list.forEach(function (w) {
      var b = el("button", "swatch", '<i style="background:' + w.hex + '"></i>' + esc(w.label));
      b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(w.id === cur));
      b.addEventListener("click", function () { onPick(w.id, false); });
      sws.appendChild(b);
    });
    var isC = isHex(cur), rainbow = "conic-gradient(#E5484D,#F5D90A,#30A46C,#0091FF,#8E4EC6,#E5484D)";
    var cb = el("button", "swatch", '<i style="background:' + (isC ? cur : rainbow) + '"></i>Custom');
    cb.type = "button"; cb.setAttribute("role", "radio"); cb.setAttribute("aria-checked", String(isC)); sws.appendChild(cb);
    var row = el("div", "custom-row"); row.hidden = !isC;
    row.innerHTML = '<input type="color" aria-label="Pick a colour"><input type="text" maxlength="7" placeholder="#RRGGBB" aria-label="Hex colour code" spellcheck="false" autocomplete="off" autocapitalize="characters"><span class="hex-err" hidden>Use # and six digits, like #BCA28F</span>';
    var ci = row.children[0], ti = row.children[1], er = row.children[2];
    var start = isC ? cur : ((list.filter(function (w) { return w.id === cur; })[0] || list[0] || { hex: "#000000" }).hex);
    ci.value = start.toLowerCase(); ti.value = isC ? cur.toUpperCase() : "";
    var take = function (v) {
      v = v.toUpperCase(); er.hidden = true;
      Array.prototype.forEach.call(sws.children, function (x) { x.setAttribute("aria-checked", String(x === cb)); });
      cb.firstChild.style.background = v; onPick(v, true);
    };
    cb.addEventListener("click", function () { row.hidden = false; take(isHex(ti.value) ? ti.value : ci.value); ti.value = ci.value.toUpperCase(); });
    ci.addEventListener("input", function () { ti.value = ci.value.toUpperCase(); take(ci.value); });
    ti.addEventListener("input", function () {
      var v = ti.value.trim(); if (v && v.charAt(0) !== "#") v = "#" + v;
      if (isHex(v)) { ci.value = v.toLowerCase(); take(v); } else er.hidden = v.length < 7;
    });
    wrap.appendChild(sws); wrap.appendChild(row); return wrap;
  }
  function logoBgs() { return (B.brand.logo_backgrounds || [{ id: "white", label: "White", key: "ground" }]).map(function (d) { return { id: d.id, label: d.label, hex: d.hex || B.brand[d.key] || "#FFFFFF" }; }); }
  function logoBg(id) { if (isHex(id)) return { id: id, label: "Custom " + id.toUpperCase(), hex: id.toUpperCase() }; var l = logoBgs(); return l.filter(function (d) { return d.id === (id || "white"); })[0] || l[0]; }
  function renderCustom() {
    var s = sec(S.sec), L = look(), st = curStyle(), box = $("custom"); box.innerHTML = "";
    box.appendChild(el("h3", "custom-h", "Adjust<span class=\"dot\"></span>"));
    if (fin(st)) {
      var pb0 = el("div");
      pb0.appendChild(el("p", "none-note", "Set by VIDPOD to your brand. We make it on your clip, with your words and colours."));
      var rb0 = el("button", "btn ghost sm", I.replay.replace("<svg", "<svg width=\"16\" height=\"16\"") + " Replay"); rb0.type = "button"; rb0.style.marginTop = "12px";
      rb0.addEventListener("click", replay); pb0.appendChild(rb0); box.appendChild(pb0);
      return;
    }
    if (!s.controls.length || (S.sec === "transitions" && st.id !== "tr-lens")) {
      var reb = el("div");
      reb.appendChild(el("p", "none-note", S.sec === "transitions" ? "Transitions play at the join between two moments. Tap Replay to see it again." : "This one is set by VIDPOD to suit your footage. Tap Replay to watch it again, and pick as many as you like."));
      var rb = el("button", "btn ghost sm", I.replay.replace("<svg", "<svg width=\"16\" height=\"16\"") + " Replay"); rb.type = "button"; rb.style.marginTop = "12px";
      rb.addEventListener("click", replay); reb.appendChild(rb); box.appendChild(reb);
      return;
    }
    var grid = el("div", "ctl-grid"); box.appendChild(grid);
    // order (Tommy, 7 Nov): Font, Case, Size, then Position, Colour, Shadow, Motion
    var grpH = function (t) { var h = el("p", "grp-h wide", esc(t)); grid.appendChild(h); };
    var redo = function () { changed(); renderCustom(); };
    if (hasCtl("font")) {
      var fb = el("div", "wide"); fb.appendChild(el("p", "label", "Font"));
      var chips = el("div", "chips"); chips.setAttribute("role", "radiogroup"); chips.setAttribute("aria-label", "Font");
      B.fonts.forEach(function (fo) {
        var c = el("button", "chip", esc(fo.label) + (fo.sub ? "<small>" + esc(fo.sub) + "</small>" : ""));
        c.type = "button"; c.setAttribute("role", "radio"); c.setAttribute("aria-checked", String(fo.id === L.font));
        if (fo.family) c.style.fontFamily = "\"" + fo.family + "\", system-ui";
        c.addEventListener("click", function () { L.font = fo.id; L.fontTouched = true; redo(); });
        chips.appendChild(c);
      });
      fb.appendChild(chips); grid.appendChild(fb);
    }
    if (hasCtl("case")) { var cs3 = seg3("Case", [["upper", "UPPER"], ["lower", "lower"], ["spoken", "As said"]], L.case || "spoken", function (v) { L.case = v; redo(); }); cs3.classList.add("wide"); grid.appendChild(cs3); }
    if (hasCtl("punct")) grid.appendChild(seg3("Punctuation", [[false, "Off"], [true, "On"]], !!L.punct, function (v) { L.punct = v; redo(); }));
    if (hasCtl("size") || hasCtl("lines") || hasCtl("wpl")) grpH("Size");
    if (hasCtl("size")) {
      var r = s.size_range, sb = el("div", "wide");
      sb.innerHTML = '<p class="label"><label for="ctl-size">' + (S.sec === "logo" ? "Logo width" : "Text size") + '</label><output id="out-size">' + L.size + ' px</output></p><input type="range" id="ctl-size" min="' + r[0] + '" max="' + r[1] + '" step="2" value="' + L.size + '">';
      grid.appendChild(sb);
      var cs = sb.querySelector("input"); paintRange(cs);
      cs.addEventListener("input", function () { L.size = +cs.value; $("out-size").textContent = L.size + " px"; paintRange(cs); changedSoon(); });
    }
    if (hasCtl("lines")) grid.appendChild(seg3("Lines", [[1, "1 line"], [2, "2 lines"]], L.lines || 1, function (v) { L.lines = v; redo(); }));
    if (hasCtl("wpl")) grid.appendChild(seg3("Words per line", [[0, "Auto"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]], +L.wpl || 0, function (v) { L.wpl = v; redo(); }));
    var posOK = hasCtl("position") && !st.no_position;
    if (posOK || hasCtl("align")) grpH("Position");
    if (posOK) {
      var pb = el("div", "wide");
      pb.innerHTML = '<p class="label"><label for="ctl-pos">Height</label><output id="out-pos"></output></p>';
      var snaps = el("div", "chips"); snaps.style.marginBottom = "10px";
      (B.snaps || []).forEach(function (sn) {
        var c = el("button", "chip", esc(sn.label)); c.type = "button"; c.dataset.y = sn.y;
        c.addEventListener("click", function () { L.y = clampY(sn.y); place(); syncPosSlider(); markDirty(); save(); flashGuide(sn.y); });
        snaps.appendChild(c);
      });
      pb.appendChild(snaps);
      var rg = el("input"); rg.type = "range"; rg.id = "ctl-pos"; rg.min = 0; rg.max = 100; rg.step = 1; pb.appendChild(rg);
      pb.appendChild(el("p", "hint", "Or drag the words in the preview."));
      grid.appendChild(pb);
      rg.addEventListener("input", function () { var rr = yRange(); L.y = Math.round(rr[0] + (rr[1] - rr[0]) * (+rg.value / 100)); var sn = snapY(L.y); L.y = sn.y; place(); syncPosSlider(); markDirty(); save(); });
    }
    if (hasCtl("align")) grid.appendChild(seg3("Align", [["left", "Left"], ["centre", "Centre"]], L.align || "left", function (v) { L.align = v; redo(); }));
    if (hasCtl("bg") || hasCtl("colour") || hasCtl("highlight") || hasCtl("backing")) grpH("Colour");
    if (hasCtl("bg")) {
      var bgw = el("div", "wide"); bgw.appendChild(el("p", "label", "Background"));
      bgw.appendChild(swatchRow(logoBgs(), L.bg || "white", function (v, keep) { L.bg = v; if (keep) changedSoon(); else redo(); }, "Background"));
      grid.appendChild(bgw);
    }
    if (hasCtl("colour")) {
      var role = colourRole(L.style);
      var cb = el("div", "wide"); cb.appendChild(el("p", "label", role[0]));
      cb.appendChild(swatchRow(B.brand.swatches, L.colour, function (v, keep) { L.colour = v; if (keep) changedSoon(); else redo(); }, role[0]));
      grid.appendChild(cb);
      if (role[1]) {
        var cb2 = el("div", "wide"); cb2.appendChild(el("p", "label", role[1]));
        cb2.appendChild(swatchRow(B.brand.swatches, colour2Of(L), function (v, keep) { L.colour2 = v; if (keep) changedSoon(); else redo(); }, role[1]));
        grid.appendChild(cb2);
      }
    }
    if (hasCtl("highlight")) {
      var hw = el("div", "wide"); hw.appendChild(seg3("Highlight the spoken word", [[false, "Off"], [true, "On"]], !!L.hl, function (v) { L.hl = v; if (v && !L.hlColour) L.hlColour = "primary"; redo(); }));
      if (L.hl) {
        var hs = seg3("How", [["colour", "Colour"], ["box", "Box"], ["scale", "Bigger"]], L.hlStyle || "colour", function (v) { L.hlStyle = v; redo(); }); hs.style.marginTop = "14px"; hw.appendChild(hs);
        var hcw = el("div"); hcw.style.marginTop = "14px"; hcw.appendChild(el("p", "label", "Highlight colour"));
        hcw.appendChild(swatchRow(B.brand.swatches, L.hlColour, function (v, keep) { L.hlColour = v; if (keep) changedSoon(); else redo(); }, "Highlight colour"));
        hw.appendChild(hcw);
      }
      grid.appendChild(hw);
    }
    if (hasCtl("backing")) grid.appendChild(seg3("Behind the words", [["none", "Nothing"], ["box", "Box"], ["blur", "Blur"]], L.backing || "none", function (v) { L.backing = v; redo(); }));
    if (hasCtl("shadow") || hasCtl("outline")) {
      grpH("Shadow");
      var shv = L.shadow == null ? SHADOW_DEFAULT : +L.shadow, shw = el("div", "wide shadow-row");
      var shWord = function (v) { return v === 0 ? "Off" : v < 30 ? "Light" : v < 65 ? "Medium" : "Strong"; };
      shw.innerHTML = '<p class="label"><label for="ctl-shadow">Strength</label><output id="out-shadow">' + shWord(shv) + " " + shv + '</output></p><input type="range" id="ctl-shadow" min="0" max="100" step="5" value="' + shv + '"><p class="hint">Push it up on light footage so the words stand out.</p>';
      grid.appendChild(shw);
      var shr = shw.querySelector("input"); paintRange(shr);
      shr.addEventListener("input", function () { L.shadow = +shr.value; if (L.fx === "none" || L.fx === "hard") L.fx = "shadow"; $("out-shadow").textContent = shWord(L.shadow) + " " + L.shadow; paintRange(shr); changedSoon(); });
      if (hasCtl("outline")) grid.appendChild(seg3("Outline", [[false, "Off"], [true, "On"]], L.fx === "stroke", function (v) { L.fx = v ? "stroke" : "shadow"; redo(); }));
    }
    if (hasCtl("anim") || hasCtl("motion") || hasCtl("speed") || hasCtl("label") || (hasCtl("flash") && st.id === "tr-lens")) grpH("Motion");
    if (hasCtl("anim")) { var an = seg3("Entrance", [["style", "As designed"], ["none", "None"], ["pop", "Pop"], ["rise", "Rise"], ["fade", "Fade"], ["word", "Word by word"]], L.anim || "style", function (v) { L.anim = v; redo(); }); an.classList.add("wide"); grid.appendChild(an); }
    if (hasCtl("motion")) grid.appendChild(seg3("Drift", [["none", "None"], ["float", "Float"], ["grow", "Grow"], ["wobble", "Wobble"]], L.motion || "none", function (v) { L.motion = v; redo(); }));
    if (hasCtl("speed")) grid.appendChild(seg3("Speed", [["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]], L.speed || "normal", function (v) { L.speed = v; redo(); }));
    if (hasCtl("label")) grid.appendChild(seg3("Web address under the logo", [[false, "Off"], [true, "On"]], !!L.label, function (v) { L.label = v; redo(); }));
    if (hasCtl("flash") && st.id === "tr-lens") {
      grid.appendChild(seg3("Flash colour", [["white", "White"], ["warm", "Warm"], ["brand", "Brand"]], L.flash || "warm", function (v) { L.flash = v; changed(); renderCustom(); replay(); }));
      var rb2 = el("button", "btn ghost sm", "Replay the join"); rb2.type = "button"; rb2.addEventListener("click", replay); grid.appendChild(rb2);
    }
    if (S.sec === "hook" && !st.hold) {
      grpH("Timing");
      var tm = seg3("When it shows", [["frame1", "From the first frame"], ["spoken", "As it is said"]], L.timing || "frame1", function (v) { L.timing = v; redo(); });
      tm.classList.add("wide"); tm.appendChild(el("p", "hint", "Top videos have the hook up on the very first frame. Your subtitles take over when it clears.")); grid.appendChild(tm);
    }
    if (S.sec === "subtitles" && st.id === "cap-chest-punch") renderEmph(grid, L, grpH);
    if (S.sec === "subtitles") renderNames(grid, grpH);
    var rs2 = el("button", "reset", "Reset this look"); rs2.type = "button";
    rs2.addEventListener("click", function () { chooseStyle(L.style, true); });
    box.appendChild(rs2);
    syncPosSlider();
  }
  /* Emphasis words (SUB-09): the rare lead-in + keyword moments. Chosen from the words by strength (about one every 8 to 12 s);
     tap one to drop it, tap a suggestion to add it. Kept per clip (emphClip), so a new clip starts from its own best words. */
  function renderEmph(grid, L, grpH) {
    var plan = R && K.H && K.H.emphPlan ? K.H.emphPlan(sec("subtitles").segment, L, fixKey(), L.skip) : null; if (!plan) return;
    grpH("Emphasis words");
    var box = el("div", "wide"), wrap = el("div", "chips emph-chips");
    var label = function (x) { var keep = CASE; CASE = L.case || "lower"; var t = x.setup.map(wt).join(" ") + " / " + x.punch.map(wt).join(" "); CASE = keep; return t; };
    var setList = function (list) { L.emph = list.map(function (x) { return x.key; }).sort(function (a, b) { return a - b; }); L.emphClip = fixKey(); changed(); renderCustom(); };
    plan.chosen.forEach(function (x) {
      var c = el("button", "chip on", esc(label(x)) + "<small>" + fmt(x.t) + " &middot; tap to remove</small>"); c.type = "button"; c.setAttribute("aria-pressed", "true");
      c.addEventListener("click", function () { setList(plan.chosen.filter(function (y) { return y !== x; })); });
      wrap.appendChild(c);
    });
    if (!plan.chosen.length) wrap.appendChild(el("p", "hint", "No emphasis moments. Add one below."));
    box.appendChild(wrap);
    if (plan.more.length) {
      box.appendChild(el("p", "label", "Add one"));
      var w2 = el("div", "chips");
      plan.more.forEach(function (x) {
        var c = el("button", "chip", "+ " + esc(label(x)) + "<small>" + fmt(x.t) + "</small>"); c.type = "button";
        c.addEventListener("click", function () { setList(plan.chosen.concat([x])); });
        w2.appendChild(c);
      });
      box.appendChild(w2);
    }
    box.appendChild(el("p", "hint", "About one every 8 to 12 seconds reads best. The keyword takes your brand colour."));
    grid.appendChild(box);
  }
  /* Names to check: every name in the words (the board's names, capitalised words mid-sentence, @handles, mixed case).
     Fix a misheard one here: every look (and the render) shows the fix. Saved per clip as the clip's corrections. */
  function nameList() {
    var b = B.base, orig = b._orig || b.words, seen = {}, out = [], prop = (b.proper || []).map(norm);
    orig.forEach(function (w, i) {
      var raw = String(w.text).replace(/[,.;:?!"\u201d\u2019]+$/, "").replace(/^["\u201c\u2018(]+/, ""); if (!raw || /^I(['\u2019]|$)/.test(raw)) return;
      var afterStop = i === 0 || /[.?!]["\u201d]?$/.test(String(orig[i - 1].text));
      var isName = prop.indexOf(norm(raw)) >= 0 || /@/.test(raw) || (/^[A-Z]/.test(raw) && !afterStop) || (/[A-Z]/.test(raw.slice(1)) && /[a-z]/.test(raw)) || (/\d/.test(raw) && /[A-Za-z]/.test(raw));
      if (!isName || seen[norm(raw)]) return; seen[norm(raw)] = 1; out.push({ raw: raw, t: w.t });
    });
    return out;
  }
  function renderNames(grid, grpH) {
    var list = nameList(); if (!list.length) return;
    grpH("Names to check");
    var box = el("div", "wide names-box"), fx = curFixes() || { replace: [], casing: {} };
    list.forEach(function (n) {
      var cur = (fx.replace || []).filter(function (r) { return r.from === n.raw; })[0];
      var row = el("label", "name-row"); row.appendChild(el("small", "", fmt(n.t)));
      var inp = el("input"); inp.type = "text"; inp.value = cur ? cur.to : n.raw; inp.spellcheck = false; inp.setAttribute("aria-label", "Spelling of " + n.raw);
      var commit = function () {
        var v = inp.value.trim(); if (!v) { inp.value = cur ? cur.to : n.raw; return; }
        var F = S.fixes[fixKey()] = curFixes() || { replace: [], casing: {} }; F.replace = (F.replace || []).filter(function (r) { return r.from !== n.raw; }); F.casing = F.casing || {};
        if (v !== n.raw) { F.replace.push({ from: n.raw, to: v }); F.casing[v.toLowerCase()] = v; } else delete F.casing[v.toLowerCase()];
        if (!F.replace.length && !Object.keys(F.casing).length) delete S.fixes[fixKey()];
        save(); changed(); toast(v !== n.raw ? "Fixed: " + n.raw + " is now " + v : "Back to " + n.raw);
      };
      inp.addEventListener("change", commit); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
      row.appendChild(inp); box.appendChild(row);
    });
    box.appendChild(el("p", "hint", "Check each name is spelt right. Fix one here and every look uses it."));
    grid.appendChild(box);
  }
  function flashGuide(y) { activeSnap = y; dragging = true; refreshUI(); dragging = false; setTimeout(function () { activeSnap = null; refreshUI(); }, 900); }
  function paintRange(r) { var p = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty("--p", p + "%"); }
  function syncPosSlider() {
    var cp = $("ctl-pos"); if (!cp || !live) return;
    var rr = yRange(), L = look(); var v = rr[1] === rr[0] ? 50 : (L.y - rr[0]) / (rr[1] - rr[0]) * 100;
    cp.value = Math.round(v); paintRange(cp);
    var lab = "y " + L.y; (B.snaps || []).forEach(function (sn) { if (clampY(sn.y) === L.y) lab = sn.label; });
    $("out-pos").textContent = lab;
    Array.prototype.forEach.call(document.querySelectorAll("[data-y]"), function (c) { c.setAttribute("aria-pressed", String(clampY(+c.dataset.y) === L.y)); });
  }
  var LOOK_KEYS = ["style", "font", "size", "y", "colour", "colour2", "case", "lines", "align", "flash", "wpl", "punct", "hl", "hlStyle", "hlColour", "fx", "shadow", "anim", "backing", "motion", "bg", "speed", "label", "timing", "text", "emphClip"];
  function sameLook(a, b) { return a && b && LOOK_KEYS.every(function (k) { return a[k] === b[k]; }) && JSON.stringify(a.emph || null) === JSON.stringify(b.emph || null); }
  function updateUse() {
    var ub = $("use-btn"); if (!ub) return;
    var p = S.picks[S.sec], L = look();
    ub.classList.remove("picked"); ub.disabled = false;
    if (multi()) {
      var has = (p || []).some(function (x) { return x.style === L.style; });
      ub.textContent = has ? "Picked" : "Pick this"; if (has) ub.classList.add("picked");
    } else if (p && sameLook(p, L)) { ub.textContent = "Picked"; ub.classList.add("picked"); }
    else if (p) { ub.textContent = p.style === L.style ? "Update my pick" : "Swap to this"; }
    else ub.textContent = "Pick this";
  }
  function markDirty() { updateUse(); }
  var soonT = null;
  function changedSoon() { clearTimeout(soonT); soonT = setTimeout(changed, 50); }
  function changed() { rebuild(); updateUse(); save(); if (S.sec === "hook" || S.sec === "subtitles" || S.sec === "name" || isOwn()) refreshCardsSoon(); }
  var rcT = null;
  function refreshCardsSoon() { clearTimeout(rcT); rcT = setTimeout(function () { cards.forEach(function (c) { if (c.built) mountCard(c); }); }, 400); }
  function chooseStyle(id, reset) {
    var s = sec(S.sec), d = styleDef(s, id), L = look(), keepFont = L.fontTouched && !reset ? L.font : null;
    var n = Object.assign({ style: id }, clone(d.defaults || {}));
    if (keepFont && s.controls.indexOf("font") >= 0) { n.font = keepFont; n.fontTouched = true; }
    if (!reset && s.clock === "loop") ["bg", "speed", "label", "size"].forEach(function (k) { if (L[k] != null) n[k] = L[k]; });
    S.looks[S.sec] = n;
    var newSeg = d.segment || s.segment, oldSeg = seg();
    rebuild(); save();
    markCards(); renderChosen(); renderLead(); renderCustom();
    if (!d.segment || newSeg[0] !== oldSeg[0] || newSeg[1] !== oldSeg[1] || S.sec === "transitions" || S.sec === "logo" || S.sec === "moves" || S.sec === "graphics") goSeg(true);
    $("t-end").textContent = fmt(seg()[1] - seg()[0]);
  }
  function usePick() {
    var L = look(), st = curStyle();
    if (multi()) {
      var arr = S.picks[S.sec] || [], i = arr.findIndex(function (x) { return x.style === L.style; });
      if (i >= 0) arr.splice(i, 1); else arr.push({ style: L.style });
      S.picks[S.sec] = arr;
    } else { S.picks[S.sec] = clone(L); delete S.picks[S.sec].fontTouched; if (S.sec === "hook") { S.picks.hook.hookText = hookTextFor(L); S.picks.hook.textIs = isHeadline(L) ? "headline" : "quote"; } }
    save(); renderTabs(); updateUse(); updateFoot(); markCards();
  }
  function switchSec(id, scroll) {
    S.sec = id; S.view = null; showBox(false); if (CU.ok) setTimeout(cuSync, 0); renderTabs(); renderHead(); renderLead(); renderRef(); renderCards(); renderChosen(); renderCustom(); goSeg(true); rebuild(); save();
    if (scroll) { var stk = $("sticky"), r = stk.getBoundingClientRect(); if (r.top <= 0) window.scrollTo({ top: window.scrollY + $("panel-body").getBoundingClientRect().top - stk.offsetHeight, behavior: "smooth" }); }
    setTimeout(showHint, 900);
  }
  function replay() { var s = seg(); if (isOwn()) { setClock(0, true); setPlayIcon(); return; } ensureMain(); try { video.currentTime = s[0]; } catch (e) {} video.play().catch(function () {}); }

  /* ---- preview on: a board can carry several clips; words, timings, cards and matte follow the chosen clip ---- */
  function clipList() { return (B.clips || []).filter(function (c) { return c.base; }); }
  function applyClip(c) {
    B.base = c.base; var sg = c.segments || {};
    B.sections.forEach(function (s2) { if (sg.sections && sg.sections[s2.id]) s2.segment = sg.sections[s2.id]; s2.styles.forEach(function (st) { if (sg.styles && sg.styles[st.id]) st.segment = sg.styles[st.id]; }); });
  }
  function renderClips() {
    var list = clipList(); $("clip-wrap").hidden = list.length < 2; if (list.length < 2) return;
    $("clip-btn").innerHTML = I.clip;
    railMenu("clip-btn", "clip-menu", list.map(function (c) { return { id: c.id, label: c.label }; }), S.clip, function (id) { if (id !== S.clip) useClip(id); });
  }
  function useClip(id, quiet) {
    var c = clipList().filter(function (x) { return x.id === id; })[0]; if (!c) return;
    S.clip = id; applyClip(c); S.hookText = null;
    if (quiet) return;
    teardown(); dropDepth(); video.src = B.base.video; video.poster = B.base.poster; $("veil").style.display = "";
    video.addEventListener("loadeddata", function () { $("veil").style.display = "none"; }, { once: true });
    setTimeout(function () { $("veil").style.display = "none"; }, 6000);
    save(); renderClips(); renderLead(); renderCards(); renderChosen(); renderCustom(); goSeg(true); rebuild();
    toast("Now on: " + c.label);
  }

  /* ---- match a look: a client drops a screenshot of a look they love (assets + db "references") ---- */
  var ASSETS = null;
  (function () { try { if (window.claude && typeof window.claude.use === "function") Promise.resolve(window.claude.use("assets")).then(function (a) { ASSETS = a || null; renderRef(); }).catch(function () {}); } catch (e) {} })();
  function renderRef() {
    var box = $("ref"); if (!box || !B) return; box.innerHTML = "";
    var show = false; box.hidden = true; if (!show) return; // Round 3: off the main path (screenshots go in through the mood board)
    var head = el("div", "ref-head", '<div><b>Seen a look you love?</b><small>Drop a screenshot so VIDPOD can see it. Nothing is built until you ask.</small></div>');
    var pick = el("label", "btn ghost sm ref-pick", "Add screenshot<input type=\"file\" accept=\"image/png,image/jpeg,image/webp,image/gif\" class=\"sr\">");
    head.appendChild(pick); box.appendChild(head);
    var form = el("div", "ref-form"); form.hidden = true; box.appendChild(form);
    var input = pick.querySelector("input"), file = null;
    input.addEventListener("change", function () {
      file = input.files && input.files[0]; if (!file) return;
      form.hidden = false; form.innerHTML = "";
      var th = el("img", "ref-thumb"); th.alt = "Your screenshot"; th.src = URL.createObjectURL(file); form.appendChild(th);
      var col = el("div", "ref-col");
      var note = el("input"); note.placeholder = "What do you like about it? (optional)"; note.maxLength = 300;
      var send = el("button", "btn sm", "Send to VIDPOD"); send.type = "button";
      var msg = el("span", "ok");
      col.appendChild(note); col.appendChild(send); col.appendChild(msg); form.appendChild(col);
      send.addEventListener("click", function () {
        if (file.size > 4 * 1024 * 1024) { msg.textContent = "That file is too big. Try a screenshot under 4 MB."; return; }
        send.disabled = true; msg.textContent = "Sending";
        var st0 = curStyle(), noteTxt = note.value.trim(), type = /^image\/(png|jpeg|webp|gif)$/.test(file.type) ? file.type : "image/png";
        var toSheet = new Promise(function (res) {
          if (!LOG_URL) return res(false);
          var fr = new FileReader();
          fr.onload = function () {
            var b64 = String(fr.result || "").replace(/^data:[^,]*,/, "");
            post("References", [{ section: S.sec, optionCode: st0 ? st0.code : "", label: "Screenshot of a look they love", settings: { currentStyle: look().style, clip: S.clip || null, useCase: S.vtype || null, file: file.name, contentType: type, bytes: file.size }, note: noteTxt }], { image: { base64: b64, contentType: type, filename: file.name } }).then(res);
          };
          fr.onerror = function () { res(false); };
          fr.readAsDataURL(file);
        });
        var toDb = !ASSETS ? Promise.resolve(false) : ASSETS.upload(file, /^image\/(png|jpeg|webp|gif)$/.test(file.type) ? undefined : { type: "image/png" }).then(function (up) {
          return writeDoc("references", Object.assign(baseFields(), { section: S.sec, assetId: up.id, contentType: up.contentType, note: noteTxt, currentStyle: look().style, at: new Date().toISOString() }));
        }).catch(function () { return false; });
        Promise.all([toSheet, toDb]).then(function (r) {
          if (r[0] || r[1]) { msg.textContent = "Sent to VIDPOD. Thanks, we will take a look."; send.textContent = "Sent"; }
          else { send.disabled = false; msg.textContent = "That did not send. Check your connection and try again."; }
        });
      });
    });
  }

  /* ---- video type: reorders the tabs and puts the options made for it first ---- */
  function vtypeLabel() { var v = (B.video_types || []).filter(function (x) { return x.id === S.vtype; })[0]; return v ? v.label : ""; }
  // house style (subtitles, name, logo) is the same on every video, so it always comes first and ignores the video type
  function orderedSections() {
    var v = (B.video_types || []).filter(function (x) { return x.id === S.vtype; })[0];
    var any = B.sections.filter(function (s) { return s.scope === "any"; }), typ = B.sections.filter(function (s) { return s.scope !== "any"; });
    if (v && v.order) typ = v.order.map(sec).filter(function (s) { return s && s.scope !== "any"; }).concat(typ.filter(function (s) { return v.order.indexOf(s.id) < 0; }));
    return any.concat(typ);
  }
  function renderVtype() {}
  /* ---- likes: one heart per card, saved to the shared likes collection with an optional note ---- */
  function baseFields() { return { clientId: B.client.id, clientName: B.client.name, projectId: (B.project || {}).id || null, person: S.viewer || "", boardVersion: B.board.version, useCase: S.vtype || null }; }
  function writeDoc(coll, doc) { return dbReady.then(function (db) { if (!db) return false; return db.collection(coll).add(doc).then(function () { return true; }); }).catch(function () { return false; }); }
  function toggleLike(sd, st) {
    var on = !S.likes[st.id];
    if (on) S.likes[st.id] = { at: new Date().toISOString() }; else delete S.likes[st.id];
    save();
    var likeDb = writeDoc("likes", Object.assign(baseFields(), { section: sd.id, style: st.id, code: st.code, label: st.label, liked: on, note: "", at: new Date().toISOString() }));
    var likeLog = post("Likes", [{ section: sd.id, optionCode: st.code, label: st.label, settings: { liked: on, style: st.id, clip: S.clip || null, useCase: S.vtype || null }, note: on ? "liked" : "unliked" }]);
    Promise.all([likeLog, likeDb]).then(function (r) { toast(r[0] || r[1] ? (on ? "Liked. Sent to VIDPOD" : "Unliked. Sent to VIDPOD") : "Saved on this device only"); });
    if (on && look().style !== st.id) chooseStyle(st.id); else renderChosen();
  }
  function likeNote(st) {
    var w = el("div", "like-note");
    if (!S.viewer) { var nmI = el("input"); nmI.placeholder = "Your name"; nmI.autocomplete = "name"; nmI.id = "like-name"; w.appendChild(nmI); }
    var inp = el("input"); inp.placeholder = "Why you like " + st.code + " (optional)"; inp.value = (S.likes[st.id] && S.likes[st.id].note) || "";
    var sb = el("button", "btn ghost sm", "Save note"); sb.type = "button";
    var ok = el("span", "ok");
    sb.addEventListener("click", function () {
      var nmI2 = $("like-name"); if (nmI2 && nmI2.value.trim()) { S.viewer = nmI2.value.trim(); local("vidpod-studio-viewer", S.viewer); }
      S.likes[st.id] = Object.assign(S.likes[st.id] || {}, { note: inp.value.trim() }); save();
      ok.textContent = "Sending";
      Promise.all([
        post("Likes", [{ section: S.sec, optionCode: st.code, label: st.label, settings: { liked: true, style: st.id, clip: S.clip || null, useCase: S.vtype || null }, note: inp.value.trim() }]),
        writeDoc("likes", Object.assign(baseFields(), { section: S.sec, style: st.id, code: st.code, label: st.label, liked: true, note: inp.value.trim(), at: new Date().toISOString() }))
      ]).then(function (r) { ok.textContent = r[0] || r[1] ? "Sent to VIDPOD" : "Saved on this device only (offline)"; });
    });
    w.appendChild(inp); w.appendChild(sb); w.appendChild(ok);
    return w;
  }

  /* ---- picks bar + review ---- */
  function lookDetail(sid, p) {
    var s = sec(sid), d = styleDef(s, p.style), parts = [];
    if (fin(d)) return { label: d.code + " " + d.label, detail: "finished effect, set by VIDPOD to your brand" };
    if (s.controls.indexOf("font") >= 0) { var fo = B.fonts.filter(function (x) { return x.id === p.font; })[0] || B.fonts[0]; parts.push(fo.id === "brand" ? fo.sub : fo.label); }
    if (s.controls.indexOf("size") >= 0) parts.push((sid === "logo" ? "width " : "") + p.size + " px");
    if (s.controls.indexOf("position") >= 0 && p.y != null && !(d && d.no_position)) parts.push("height y " + p.y);
    if (s.controls.indexOf("lines") >= 0) parts.push((p.lines || 1) + (p.lines === 2 ? " lines" : " line"));
    if (s.controls.indexOf("align") >= 0) parts.push(p.align === "centre" ? "centred" : "left");
    if (s.controls.indexOf("colour") >= 0) { var rl = colourRole(p.style); parts.push(rl[0].toLowerCase() + " " + swatch(p.colour).label); if (rl[1]) parts.push(rl[1].toLowerCase() + " " + swatch(colour2Of(p)).label); }
    if (s.controls.indexOf("case") >= 0) parts.push(p.case === "upper" ? "UPPER case" : p.case === "lower" ? "lower case" : p.case === "sentence" ? "sentence case" : "case as said");
    if (p.flash && p.style === "tr-lens") parts.push(p.flash + " flash");
    if (s.controls.indexOf("wpl") >= 0 && +p.wpl) parts.push(p.wpl + " words per line");
    if (s.controls.indexOf("anim") >= 0 && p.anim && p.anim !== "style") parts.push(p.anim + " animation");
    if (s.controls.indexOf("highlight") >= 0 && p.hl) parts.push((p.hlStyle || "colour") + " highlight in " + swatch(p.hlColour || "primary").label);
    if (p.shadow != null) parts.push("shadow " + p.shadow);
    if (s.controls.indexOf("outline") >= 0 && p.fx && p.fx !== "shadow") parts.push(p.fx === "stroke" ? "outline" : p.fx === "none" ? "no shadow" : "hard shadow");
    if (s.controls.indexOf("punct") >= 0 && p.punct) parts.push("punctuation on");
    if (p.backing && p.backing !== "none") parts.push(p.backing + " behind text");
    if (p.motion && p.motion !== "none") parts.push(p.motion);
    if (s.controls.indexOf("bg") >= 0) parts.push(logoBg(p.bg).label + " background");
    if (s.controls.indexOf("speed") >= 0) parts.push((p.speed || "normal") + " speed");
    if (s.controls.indexOf("label") >= 0 && p.label) parts.push("label on");
    return { label: d.code + " " + d.label, detail: parts.join(", ") };
  }
  function pickedCount() { return B.sections.filter(function (s) { var p = S.picks[s.id]; return multi(s.id) ? p && p.length : !!p; }).length; }
  function updateFoot() {
    var n = pickedCount(), codes = [], items = pickItems();
    items.forEach(function (it) { codes.push(it.d.code); });
    var dots = B.sections.map(function (s) { var p = S.picks[s.id]; return '<i class="' + ((multi(s.id) ? p && p.length : p) ? "on" : "") + '"></i>'; }).join("");
    $("count").innerHTML = '<span class="stack" aria-hidden="true">' + dots + "</span><span><b>" + items.length + (items.length === 1 ? " pick" : " picks") + "</b> <u>My picks</u></span>";
    $("count").title = codes.join(", ");
    $("count").setAttribute("aria-label", "My picks: " + items.length + " picked");
    var admin = isVidpodCode();
    $("review-btn").textContent = admin ? "Make these" : "Send to VIDPOD";
    $("review-btn").disabled = items.length === 0;
    $("tpl-btn").hidden = !admin;
    if ($("mk") && $("mk").open) renderMk();
  }
  /* ---- My picks (VIDPOD): everything picked for this client and video, with an optional "where" per moment; Make these
     (Sheet tab Picks, section "make", read by tools/picks_to_jobs.py and the run-my-picks skill) and Copy as message ---- */
  var HOUSE = ["subtitles", "name", "logo"];
  function pickItems() {
    var out = [];
    orderedPickSecs().forEach(function (s) { var p = S.picks[s.id]; if (!p) return; (multi(s.id) ? p : [p]).forEach(function (x) { var d = styleDef(s, x.style); if (d) out.push({ s: s, p: x, d: d }); }); });
    return out;
  }
  function orderedPickSecs() { var ids = ["subtitles", "name", "logo", "hook", "graphics", "moves", "transitions", "backgrounds", "endcard"]; return ids.map(sec).filter(Boolean).concat(B.sections.filter(function (s) { return ids.indexOf(s.id) < 0; })); }
  function defaultAt(sid) { return sid === "hook" ? "Opening" : sid === "endcard" ? "End" : ""; }
  function atOf(it) { return it.p.at || defaultAt(it.s.id); }
  function jobInfo() { var j = S.job || {}; return { project: j.project != null ? j.project : ((B.project || {}).label || ""), video: j.video || "" }; }
  function cleanAt(v) { v = String(v || "").trim(); var m = /^(\d{1,2})[:.](\d{1,2})$/.exec(v); if (m) return m[1] + ":" + ("0" + m[2]).slice(-2); if (/^\d{1,3}$/.test(v)) { var n = +v; return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2); } return v; }
  function messageText() {
    // the order a video plays: house style, the opening, moments by time, moments with no time yet, the end
    var j = jobInfo(), items = pickItems(), hasEnd = items.some(function (it) { return it.s.id === "endcard"; });
    var B5 = [[], [], [], [], []], secsOf = function (a) { var m = /^(\d+):(\d{2})$/.exec(a); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
    items.forEach(function (it) {
      var at = atOf(it), c = it.d.code, sid = it.s.id;
      if (sid === "subtitles") B5[0].unshift("subtitles " + c);
      else if (sid === "name") B5[0].push("name " + c);
      else if (sid === "logo") { if (hasEnd) B5[0].push("logo " + c); else B5[4].push("end " + c); }
      else if (/^opening$/i.test(at)) B5[1].push("opening " + c);
      else if (/^end$/i.test(at)) B5[4].unshift("end " + c);
      else if (at) B5[2].push([secsOf(at), at + " " + c]);
      else B5[3].push(c);
    });
    B5[2] = B5[2].sort(function (x, y) { return x[0] - y[0]; }).map(function (x) { return x[1]; });
    var who = (j.video || B.client.name).trim();
    var hp = S.picks.hook, hk = hp && hp.hookText ? ". " + (hp.textIs === "headline" ? "Headline" : "Opening line") + ': "' + hp.hookText.replace(/\*/g, "").replace(/\n/g, " ").trim() + '"' : "";
    return who + ": " + [].concat(B5[0], B5[1], B5[2], B5[3], B5[4]).join(", ") + hk;
  }
  function renderMk() {
    var box = $("mk-list"); box.innerHTML = "";
    var items = pickItems(), j = jobInfo();
    if ($("mk-project") !== document.activeElement) $("mk-project").value = j.project;
    if ($("mk-video") !== document.activeElement) $("mk-video").value = j.video;
    if (!items.length) { box.appendChild(el("p", "mk-empty", "Nothing picked yet. Tap the round button beside a name to pick it.")); $("mk-msg").textContent = ""; return; }
    var groups = [["Whole video", items.filter(function (it) { return HOUSE.indexOf(it.s.id) >= 0; })], ["This video", items.filter(function (it) { return HOUSE.indexOf(it.s.id) < 0; })]];
    groups.forEach(function (g) {
      if (!g[1].length) return;
      box.appendChild(el("p", "mk-sec", esc(g[0])));
      var ul = el("ul", "mk-rows");
      g[1].forEach(function (it) {
        var li = el("li");
        li.appendChild(el("div", "what", "<small>" + esc(TAB_LABEL[it.s.id] || it.s.tab) + "</small><b>" + esc(it.d.label) + "</b><code>" + esc(it.d.code) + "</code>"));
        if (HOUSE.indexOf(it.s.id) < 0) {
          var w = el("div", "mk-at"), cur = atOf(it);
          var setAt = function (v) { it.p.at = v; save(); renderMk(); };
          ["Opening", "End"].forEach(function (lab) { var b = el("button", "", lab); b.type = "button"; b.setAttribute("aria-pressed", String(cur === lab)); b.addEventListener("click", function () { setAt(cur === lab ? "" : lab); }); w.appendChild(b); });
          var ti = el("input"); ti.inputMode = "numeric"; ti.placeholder = "time"; ti.setAttribute("aria-label", "Where, a time like 0:42"); ti.value = /^\d/.test(cur) ? cur : "";
          ti.addEventListener("change", function () { setAt(cleanAt(ti.value)); });
          w.appendChild(ti); li.appendChild(w);
        }
        var rm = el("button", "mk-rm", "Remove"); rm.type = "button";
        rm.addEventListener("click", function () { if (multi(it.s.id)) S.picks[it.s.id] = (S.picks[it.s.id] || []).filter(function (x) { return x !== it.p; }); else delete S.picks[it.s.id]; save(); renderTabs(); markCards(); updateUse(); updateFoot(); renderMk(); });
        li.appendChild(rm); ul.appendChild(li);
      });
      box.appendChild(ul);
    });
    $("mk-msg").textContent = messageText();
  }
  function openMk() {
    $("mk-err").hidden = true; renderMk();
    var d = $("mk"); if (d.showModal) d.showModal(); else d.setAttribute("open", "");
  }
  function closeMk() { var d = $("mk"); if (d.close) d.close(); else d.removeAttribute("open"); }
  function saveJob() { S.job = { project: $("mk-project").value.trim(), video: $("mk-video").value.trim() }; save(); $("mk-msg").textContent = pickItems().length ? messageText() : ""; }
  function makeThese() {
    var j = jobInfo(), items = pickItems(), er = $("mk-err"), btn = $("mk-make");
    if (!items.length) { er.textContent = "Pick at least one look first."; er.hidden = false; return; }
    if (!j.video) { er.textContent = "Name the video first, for example: " + (B.base.name || B.client.name).split(" ")[0] + " #1."; er.hidden = false; $("mk-video").focus(); return; }
    er.hidden = true;
    var doc = picksDoc(), now = new Date(), p2 = function (n) { return ("0" + n).slice(-2); }, stamp = now.getFullYear() + p2(now.getMonth() + 1) + p2(now.getDate()) + "-" + p2(now.getHours()) + p2(now.getMinutes());
    var batch = "MK-" + B.client.id + "-" + stamp, msg = messageText();
    // one summary row (the whole send doc, like a studio Send's "all" row, plus video and batch), then one row per pick in the
    // pick shape tools/picks_to_jobs.py reads: {client, project, video, section, code, at, settings}; at = "whole" (house style),
    // "opening", "end", seconds on the cut, or null (not set yet)
    var jobAt = function (it) { if (HOUSE.indexOf(it.s.id) >= 0) return "whole"; var a = atOf(it); if (/^opening$/i.test(a)) return "opening"; if (/^end$/i.test(a)) return "end"; var m = /^(\d+):(\d{2})$/.exec(a); return m ? (+m[1]) * 60 + (+m[2]) : null; };
    var strip = function (o) { if (!o) return {}; var s2 = {}; Object.keys(o).forEach(function (k) { if (["code", "label", "registry", "source", "scope", "at", "how", "finished", "ref"].indexOf(k) < 0) s2[k] = o[k]; }); return s2; };
    var sum = Object.assign({}, doc, { video: j.video, project: j.project, batch: batch, make: true, message: msg });
    sum.picks = {}; Object.keys(doc.picks).forEach(function (k) { var v = doc.picks[k]; if (!v) return; (Array.isArray(v) ? v : [v]).forEach(function (x) { var it0 = items.filter(function (y) { return y.s.id === k && y.d.code === x.code; })[0]; if (it0) x.at = jobAt(it0); }); sum.picks[k] = v; });
    var rows = [{ section: "make", optionCode: "all", label: "Make these: " + items.length + (items.length === 1 ? " pick" : " picks") + " for " + j.video, settings: sum, note: msg }];
    items.forEach(function (it) {
      var full = doc.picks[it.s.id], one = Array.isArray(full) ? full.filter(function (x) { return x.style === it.d.id; })[0] : full;
      rows.push({ section: "make", optionCode: it.d.code, label: (TAB_LABEL[it.s.id] || it.s.tab) + ": " + it.d.label,
        settings: { client: B.client.id, project: j.project, video: j.video, section: it.s.id, code: it.d.code, at: jobAt(it), settings: strip(one),
          where: atOf(it) || null, label: it.d.label, finished: fin(it.d), ref: ((it.d.recipe || {}).ref) || null, batch: batch, clip: S.clip || null, by: S.viewer || (SIGN && SIGN.name) || "", sentAt: now.toISOString() },
        note: "" });
    });
    btn.disabled = true; btn.textContent = "Sending";
    local("vidpod-studio-last-make-" + B.client.id, JSON.stringify({ batch: batch, rows: rows }));
    post("Picks", rows, { project: j.project || "" }).then(function (ok) {
      btn.disabled = false; btn.textContent = "Make these";
      toast(ok ? "Sent to the job sheet. Tell Claude: run my picks" : "Saved on this device. Try again when online.");
      $("mk-msg").textContent = (ok ? "Sent as " + batch + ". " : "") + msg;
    });
  }
  function copyMessage() {
    var txt = messageText();
    var done = function () { toast("Copied. Paste it to Claude."); $("mk-msg").textContent = txt; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(function () { fallbackCopy(txt); done(); });
    else { fallbackCopy(txt); done(); }
  }
  function fallbackCopy(txt) { var ta = document.createElement("textarea"); ta.value = txt; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); }
  function initMk() {
    $("mk-close").innerHTML = I.close;
    $("mk-close").addEventListener("click", closeMk);
    $("mk-project").addEventListener("input", saveJob); $("mk-video").addEventListener("input", saveJob);
    $("mk-copy").addEventListener("click", copyMessage);
    $("mk-make").addEventListener("click", makeThese);
    $("mk-tpl").addEventListener("click", function () { closeMk(); openTpl(); });
    $("mk").addEventListener("click", function (e) { if (e.target === $("mk")) closeMk(); });
    $("count").addEventListener("click", function () { if (isVidpodCode()) openMk(); else openReview(); });
  }
  // the one line at the top, chosen by the code: clients pick; VIDPOD runs the studio
  function renderStageLine() {
    var n = $("stage-line"); if (!n) return;
    n.innerHTML = isVidpodCode()
      ? "<b>Studio.</b> Tap a name to play it on " + esc(B.client.id === "vidpod" ? "the footage" : B.client.name + "'s footage") + ". Pick, adjust, then <b>Make these</b> or copy the list to Claude."
      : "<b>Pick your looks.</b> Tap a name to see it on your footage, then tap the circle to pick it.";
  }
  function openReview() {
    $("sum").innerHTML = B.sections.map(function (s) {
      var p = S.picks[s.id];
      if (!p || (multi(s.id) && !p.length)) return "<li><span>" + esc(s.tab) + '</span><span class="none">Not picked</span></li>';
      if (multi(s.id)) return "<li><span>" + esc(s.tab) + "</span><span>" + p.map(function (x) { var d = styleDef(s, x.style); return "<b>" + esc(d.code + " " + d.label) + "</b>"; }).join("") + "</span></li>";
      var d = lookDetail(s.id, p); return "<li><span>" + esc(s.tab) + "</span><span><b>" + esc(d.label) + "</b>" + (d.detail ? "<small>" + esc(d.detail) + "</small>" : "") + (p.hookText ? "<small>Hook: " + esc(p.hookText.replace(/\n/g, " / ")) + "</small>" : "") + "</span></li>";
    }).join("");
    $("viewer-name").value = S.viewer; $("sheet-err").hidden = true; whoLines();
    $("sheet-main").style.display = "flex"; $("sheet-done").style.display = "none";
    var dlg = $("sheet"); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    (S.viewer ? $("sheet-send") : $("viewer-name")).focus();
  }
  function closeReview() { var d = $("sheet"); if (d.close) d.close(); else d.removeAttribute("open"); }
  function picksDoc() {
    var picks = {};
    B.sections.forEach(function (s) {
      var p = S.picks[s.id];
      if (multi(s.id)) { picks[s.id] = p && p.length ? p.map(function (x) { var d = styleDef(s, x.style); var o2 = { style: d.id, code: d.code, label: d.label, registry: d.registry || null, source: d.source || null }; if (fin(d)) { o2.finished = true; o2.ref = (d.recipe || {}).ref || null; } if (x.at) o2.at = x.at; return o2; }) : null; return; }
      if (!p) { picks[s.id] = null; return; }
      var d = styleDef(s, p.style), o = { style: p.style, code: d.code, label: d.label, registry: d.registry || null, scope: s.scope === "any" ? "house-style" : "per-video-type" };
      if (p.at) o.at = p.at;
      if (fin(d)) { o.finished = true; o.ref = (d.recipe || {}).ref || null; o.how = (d.recipe || {}).how || ""; picks[s.id] = o; return; }
      if (s.controls.indexOf("font") >= 0) { var fo = fontDef(p.font); o.font = p.font; o.fontFamily = p.font === "brand" ? B.brand.font.sub : fo.family; }
      if (s.controls.indexOf("size") >= 0) o.sizePx = p.size;
      if (s.controls.indexOf("position") >= 0) o.yPx = p.y;
      if (s.controls.indexOf("lines") >= 0) o.lines = p.lines || 1;
      if (s.controls.indexOf("align") >= 0) o.align = p.align || "left";
      if (s.controls.indexOf("colour") >= 0) { var rl2 = colourRole(p.style); o.colour = p.colour; o.colourHex = swatch(p.colour).hex; o.colourIs = rl2[0]; if (rl2[1]) { o.colour2 = colour2Of(p); o.colour2Hex = swatch(o.colour2).hex; o.colour2Is = rl2[1]; } }
      if (s.controls.indexOf("case") >= 0) o.case = p.case;
      if (p.shadow != null) { o.shadow = +p.shadow; o.shadowIs = "strength 0 to 100, soft drop shadow (0 = none)"; }
      if (p.flash && p.style === "tr-lens") o.flash = p.flash;
      if (p.hookText) { o.hookText = p.hookText; o.textIs = p.textIs || "quote"; }
      if (s.id === "hook") o.timing = p.timing || (d.hold ? "frame1" : "frame1");
      if (s.id === "subtitles") { if (Array.isArray(p.emph)) { o.emph = p.emph; o.emphClip = p.emphClip || null; } if (curFixes()) o.fixes = curFixes(); }
      ["wpl", "punct", "hl", "hlStyle", "hlColour", "fx", "anim", "backing", "motion"].forEach(function (k2) { if (s.controls.indexOf(k2 === "hlStyle" || k2 === "hlColour" || k2 === "hl" ? "highlight" : k2 === "fx" ? "outline" : k2) >= 0 && p[k2] != null) o[k2] = p[k2]; });
      if (o.hlColour) o.hlColourHex = swatch(o.hlColour).hex;
      if (s.controls.indexOf("bg") >= 0) { var bgd = logoBg(p.bg); o.background = p.bg || "white"; o.backgroundHex = bgd.hex; }
      if (s.controls.indexOf("speed") >= 0) o.speed = p.speed || "normal";
      if (s.controls.indexOf("label") >= 0) o.label = !!p.label;
      picks[s.id] = o;
    });
    var likes = Object.keys(S.likes).map(function (id) { var d = null; B.sections.forEach(function (s) { var x = styleDef(s, id); if (x) d = x; }); return d ? { style: id, code: d.code, note: S.likes[id].note || "" } : null; }).filter(Boolean);
    var sfx = { on: !!SFX.on, sounds: {} };
    B.sections.forEach(function (s) { var p = S.picks[s.id]; if (!p) return; var st = styleDef(s, (multi(s.id) ? (p[0] || {}).style : p.style)); if (!st) return; var keep = SFX.events, used = SFX.used; buildSfx(s, st, null); sfx.sounds[s.id] = SFX.used.map(function (n) { return { name: n, file: B.sfx.files[n].src, from: B.sfx.files[n].from }; }); SFX.events = keep; SFX.used = used; });
    return Object.assign(baseFields(), { clip: S.clip || null, fixes: curFixes(), sfx: sfx, client: B.client.id, sentAt: new Date().toISOString(), viewer: S.viewer, accessCode: SIGN ? SIGN.code : null, note: $("viewer-note").value.trim(), canvas: "1080x1920", yIs: "centre of the text block, px on 1080x1920", picks: picks, likes: likes });
  }
  function finish(ok, text) {
    $("done-title").innerHTML = (ok ? "Sent" : "Saved") + '<span class="dot"></span>';
    $("done-text").textContent = text;
    $("sheet-main").style.display = "none"; $("sheet-done").style.display = "flex";
  }
  $("sheet-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("viewer-name").value.trim();
    if (!name) { $("sheet-err").textContent = "Add your name so we know whose picks these are."; $("sheet-err").hidden = false; $("viewer-name").focus(); return; }
    S.viewer = name; local("vidpod-studio-viewer", name); if (SIGN && SIGN.name !== name) { SIGN.name = name; saveSign(); }
    var doc = picksDoc(), btn = $("sheet-send"); btn.disabled = true; btn.textContent = "Sending";
    local("vidpod-studio-last-sent-" + B.client.id, JSON.stringify(doc));
    var fallback = "We could not reach VIDPOD just now, so your picks are saved on this device. Try Send again when you are back online.";
    var rows = [{ section: "all", optionCode: Object.keys(doc.picks).map(function (k) { var v = doc.picks[k]; return !v ? null : Array.isArray(v) ? v.map(function (x) { return x.code; }).join(" ") : v.code; }).filter(Boolean).join(", "), label: pickedCount() + " of " + B.sections.length + " picked", settings: doc, note: doc.note }];
    B.sections.forEach(function (s2) { var v = doc.picks[s2.id]; if (!v) return; rows.push({ section: s2.id, optionCode: Array.isArray(v) ? v.map(function (x) { return x.code; }).join(", ") : v.code, label: Array.isArray(v) ? v.map(function (x) { return x.label; }).join(", ") : v.label, settings: v, note: "" }); });
    var toDb = dbReady.then(function (db) { if (!db) return false; return db.collection("picks").add(doc).then(function () { return true; }); }).catch(function () { return false; });
    Promise.all([post("Picks", rows), toDb]).then(function (r) {
      if (r[0] || r[1]) finish(true, "Sent to VIDPOD. Thanks " + name + ". Change anything and send again whenever you like.");
      else finish(false, fallback);
    }).then(function () { btn.disabled = false; btn.textContent = "Send picks"; });
  });
  $("sheet-cancel").addEventListener("click", closeReview);
  $("sheet-close").addEventListener("click", closeReview);
  $("review-btn").addEventListener("click", function () { if (isVidpodCode()) openMk(); else openReview(); });

  function save() { local("vidpod-studio-v3-" + B.client.id, JSON.stringify({ looks: S.looks, picks: S.picks, sec: S.sec, hookText: S.hookText, headText: S.headText, likes: S.likes, vtype: S.vtype, clip: S.clip, fixes: S.fixes, adjust: !!S.adjust, job: S.job || null })); }

  /* ---- buttons ---- */
  $("play").addEventListener("click", togglePlay);
  video.addEventListener("play", setPlayIcon); video.addEventListener("pause", setPlayIcon);
  function setMute() { $("mute").innerHTML = video.muted ? I.mute : I.sound; $("mute").setAttribute("aria-pressed", String(!video.muted)); $("mute").setAttribute("aria-label", video.muted ? "Turn sound on" : "Turn sound off"); }
  $("mute").addEventListener("click", function () { video.muted = !video.muted; setMute(); startPlay(); });
  $("full").innerHTML = I.full; $("close-full").innerHTML = I.close; $("replay").innerHTML = I.replay; var _x = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg>';
  $("replay").addEventListener("click", replay);
  function setFull(on) {
    $("stage").classList.toggle("full", on); if (CU.ok) cuSync();
    requestAnimationFrame(fit);
    if (on) startPlay();
  }
  $("full").addEventListener("click", function () { setFull(true); });
  $("close-full").addEventListener("click", function () { setFull(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setFull(false); });
  var scrub = $("scrub");
  scrub.addEventListener("input", function () { scrubbing = true; var s = seg(), t = s[0] + (s[1] - s[0]) * scrub.value / 1000; if (isOwn()) setClock(Math.min(t, s[1] - 0.01)); else video.currentTime = t; });
  scrub.addEventListener("change", function () { scrubbing = false; });
  scrub.addEventListener("pointerup", function () { scrubbing = false; });

  /* ---- close-up: a magnified live view of the words (subtitles, hook, name, logo). It sits under the preview while the
     preview is on screen; on a phone, once the preview scrolls away, it docks above the Send bar. ---- */
  var CU = { want: local("vidpod-studio-closeup") !== "off", last: 0, ok: false, slotSeen: true, onScreen: true };
  var CU_SECS = ["subtitles", "hook", "name", "logo"];
  function cuWanted() { return CU_SECS.indexOf(S.sec) >= 0 && !(live && live.pre && !live.focus) && !$("stage").classList.contains("full") && !!live; }   // 8 Nov: back for everyone, under the window; docks on phones (Tommy: "one of the best features")
  function cuSync() {
    var want = cuWanted(), slot = $("cu-slot"), cu = $("closeup");
    slot.hidden = !want;
    var dock = want && CU.want && !CU.slotSeen && window.innerWidth < 980; // phones: once the window scrolls away, the close-up docks above the bottom bar
    if (dock) slot.style.height = slot.offsetHeight ? slot.offsetHeight + "px" : slot.style.height; else slot.style.height = "";
    cu.classList.toggle("docked", dock); document.body.classList.toggle("cu-docked", dock);
    document.body.classList.toggle("cu-off", !CU.want);
    $("cu-toggle").textContent = CU.want ? "Hide" : "Show close-up";
    if (dock && cu.offsetHeight) document.body.style.setProperty("--cu-h", cu.offsetHeight + "px");
    if (typeof demoFit === "function" && DM && DM.r) demoFit();
  }
  function cuShown() { return CU.ok && CU.want && !$("cu-slot").hidden; }
  function initCloseup() {
    $("cu-toggle").addEventListener("click", function () { CU.want = !CU.want; local("vidpod-studio-closeup", CU.want ? "on" : "off"); cuSync(); });
    // dock only when the slot has scrolled up out of view (not when it is below the fold)
    if ("IntersectionObserver" in window) new IntersectionObserver(function (ents) { ents.forEach(function (en) { var rc = en.boundingClientRect; CU.slotSeen = en.isIntersecting || rc.top > 0 || rc.height === 0; }); cuSync(); }, { threshold: 0, rootMargin: "-60px 0px 0px 0px" }).observe($("cu-slot"));
    if ("IntersectionObserver" in window) new IntersectionObserver(function (ents) { ents.forEach(function (en) { CU.onScreen = en.isIntersecting; if (en.isIntersecting) CU.last = 0; }); }, { threshold: 0 }).observe($("closeup"));
    window.addEventListener("resize", function () { cuSync(); demoFit(); });
    $("dm-custom").addEventListener("click", function () {
      if (!S.adjust) { S.adjust = true; showAdjust(); rebuild(); }
      setTimeout(function () { var a = $("adjust"); if (a && !a.hidden) a.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    });
    CU.ok = true; cuSync();
  }
  function cuRect() {
    // the words, in 1080x1920 canvas units, measured on the live screen
    if (live && live.pre && live.focus) { var f = live.focus; return { x: (f[0] + f[2]) / 2, y: (f[1] + f[3]) / 2, w: f[2] - f[0], h: f[3] - f[1] }; }
    var nowT = performance.now(); if (CU.lastRect && nowT - (CU.rectAt || 0) < 240) return CU.lastRect; CU.rectAt = nowT;
    var sr = screenEl.getBoundingClientRect(), k = scale || 0.25;
    var bx = null;
    if (live && live.block && !live.fixed) { // a positioned block (subtitles, name): its line boxes, steady while words reveal
      Array.prototype.forEach.call(live.block.querySelectorAll(".inner"), function (n) { var q = n.getBoundingClientRect(); if (q.width < 1 || q.height < 1) return; var b2 = { x0: (q.left - sr.left) / k, y0: (q.top - sr.top) / k, x1: (q.right - sr.left) / k, y1: (q.bottom - sr.top) / k }; bx = bx ? { x0: Math.min(bx.x0, b2.x0), y0: Math.min(bx.y0, b2.y0), x1: Math.max(bx.x1, b2.x1), y1: Math.max(bx.y1, b2.y1) } : b2; });
    }
    if (!bx) bx = textBox([under, over], screenEl, sr.left, sr.top, k);
    if (!bx) { if (CU.lastRect) return CU.lastRect; return { x: 540, y: 960, w: 800, h: 300 }; }
    CU.lastRect = { x: (bx.x0 + bx.x1) / 2, y: (bx.y0 + bx.y1) / 2, w: bx.x1 - bx.x0, h: bx.y1 - bx.y0 };
    return CU.lastRect;
  }
  // copy a layer as it is right now (inline styles carry the animation state); media and canvases are skipped so nothing reloads
  function cuClone(n) {
    if (n.nodeType !== 1) return n.cloneNode(false);
    var c = n.cloneNode(false); c.removeAttribute("id");
    for (var ch = n.firstChild; ch; ch = ch.nextSibling) { var t = ch.nodeName; if (t === "VIDEO" || t === "AUDIO" || t === "CANVAS" || t === "SCRIPT") continue; c.appendChild(cuClone(ch)); }
    return c;
  }
  // a plate that a look moves (HOOK-06 headroom, HOOK-09 pull-back): its scale and shift about its origin, in 1080 px, so the
  // close-up draws the frame where the big preview shows it
  function cuMap(elm) {
    try {
      var cs = getComputedStyle(elm); if (!cs.transform || cs.transform === "none") return null;
      var m = new DOMMatrix(cs.transform), k = 1080 / (elm.clientWidth || elm.offsetWidth || 1080), o = String(cs.transformOrigin).split(" ").map(parseFloat);
      return { a: m.a || 1, d: m.d || 1, e: m.e * k, f: m.f * k, ox: (o[0] || 0) * k, oy: (o[1] || 0) * k };
    } catch (e) { return null; }
  }
  function cuSrc(mp, sx, sy, w, h) { if (!mp) return [sx, sy, w, h]; return [mp.ox + (sx - mp.e - mp.ox) / mp.a, mp.oy + (sy - mp.f - mp.oy) / mp.d, w / mp.a, h / mp.d]; }
  /* ---- subtitles: "How it works" (8 Nov, Tommy). The same renderer and settings as the clip above, drawn on its own plain
     stage, big and sharp, on the clip's clock; it replaces the video close-up for subtitles (that copy lagged on phones).
     Customise opens Adjust right there. ---- */
  var DM = { r: null, off: 0, y: 1400, k: 0.4 };
  var dmStage = { card: false, media: $("dm-media"), backdrop: $("dm-backdrop"), under: $("dm-under"), over: $("dm-over"), scale: function () { return DM.k; } };
  function demoOn() { return S.sec === "subtitles"; }
  function demoTear() {
    if (DM.r) { try { if (DM.r.tl) DM.r.tl.kill(); if (DM.r.teardown) DM.r.teardown(); } catch (e) {} }
    DM.r = null; ["dm-under", "dm-over", "dm-backdrop", "dm-media"].forEach(function (id) { $(id).innerHTML = ""; });
  }
  function demoBuild(L, sd, st) {
    demoTear();
    var on = demoOn() && !!st && !fin(st) && !!R[L.style];
    $("dm-view").hidden = !on; $("cu-view").hidden = on; $("cu-title").textContent = on ? "How it works" : "Close-up";
    $("dm-custom").hidden = !(on && canAdj(st));
    if (!on) return;
    var r; try { r = R[L.style](makeCtx(L, sd, st, dmStage)); } catch (e) { console.error(e); return; }
    if (!r || !r.tl) return;
    if (r.block) {
      r.block.classList.add("block"); (r.blockUnder ? $("dm-under") : $("dm-over")).appendChild(r.block);
      var h = 0; Array.prototype.forEach.call(r.block.querySelectorAll(".inner"), function (c) { h = Math.max(h, c.offsetHeight); }); if (!h) h = r.block.offsetHeight || 100;
      var z = B.safe, y = L.y == null ? 1400 : L.y;
      r.block.style.left = z.x0 + "px"; r.block.style.width = (z.x1 - z.x0) + "px"; r.block.style.height = h + "px"; r.block.style.top = Math.round(y - h / 2) + "px";
    }
    addOns(r, L, lookSeg(st, sd));
    if (r.after) try { r.after(); } catch (e) {}
    DM.r = r; DM.y = L.y == null ? 1400 : L.y;
    DM.off = st.preview && st.preview.loop ? Math.max(0, (sd.segment || [0, 0])[1] - st.preview.loop) : 0;
    demoFit();
  }
  function demoFit() {
    var v = $("dm-view"), vw = v.clientWidth, vh = v.clientHeight; if (!vw || !vh) return;
    var z = B.safe, k = vw / (z.x1 - z.x0 + 60); DM.k = k;
    $("dm-stage").style.transform = "translate(" + (-(z.x0 - 30) * k).toFixed(1) + "px," + (vh / 2 - DM.y * k).toFixed(1) + "px) scale(" + k.toFixed(4) + ")";
  }
  function demoTick(t) {
    if (!DM.r || !cuShown() || !CU.onScreen) return;
    if ($("dm-stage").style.transform === "" || !DM.k) demoFit();
    DM.r.tl.seek(t, false);
  }
  function cuRender(now) {
    if (demoOn() && DM.r) return;   // subtitles: the demo draws itself
    // a low-rate copy of the main frame: 15 a second on desktop, 5 on a phone, 4 while paused; only while it is on screen
    var gap = !playing() ? 250 : LITE ? 200 : 66;
    if (!cuShown() || !CU.onScreen || now - CU.last < gap) return;
    CU.last = now;
    var view = $("cu-view"), vw = view.clientWidth, vh = view.clientHeight; if (!vw || !vh) return;
    var big = ($("screen-slot").clientWidth || 260) / 1080, rc = cuRect();
    var z = Math.min(Math.max(big * 2, vw / 1080 * 1.2), (vw - 20) / Math.max(rc.w, 1), (vh - 14) / Math.max(rc.h, 1)); // the whole text block always fits
    var ox = vw / 2 - rc.x * z, oy = vh / 2 - rc.y * z;
    var lay = $("cu-layers"); lay.style.transform = "translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px) scale(" + z.toFixed(4) + ")";
    var frag = document.createDocumentFragment();
    [backdrop, under, over].forEach(function (L0) { frag.appendChild(cuClone(L0)); });
    lay.replaceChildren(frag);
    var cv = $("cu-canvas"), dpr = Math.min(LITE ? 1.5 : 2, window.devicePixelRatio || 1), cw = Math.round(vw * dpr), ch = Math.round(vh * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    var g = cv.getContext("2d"); g.fillStyle = "#111"; g.fillRect(0, 0, cw, ch);
    var srcV = live && live.pre ? live.pre : (!isOwn() ? video : null);
    if (srcV && !(srcV.readyState >= 2 && srcV.videoWidth) && live && live.preStill && live.preStill.complete && live.preStill.naturalWidth) srcV = live.preStill;
    var srcW = srcV ? (srcV.videoWidth || srcV.naturalWidth || 0) : 0;
    if (srcV && srcW && (srcV.tagName === "IMG" || srcV.readyState >= 2)) {
      var kv = srcW / 1080, r0 = cuSrc(srcV === video ? cuMap(video) : null, -ox / z, -oy / z, vw / z, vh / z);
      try { g.drawImage(srcV, r0[0] * kv, r0[1] * kv, r0[2] * kv, r0[3] * kv, 0, 0, cw, ch); } catch (e) {}
    }
    // the person cut-out in front of the words (hooks behind the head), as on the big preview
    var fg = $("cu-fg"), gf = fg.getContext("2d"); if (fg.width !== cw || fg.height !== ch) { fg.width = cw; fg.height = ch; }
    gf.clearRect(0, 0, cw, ch);
    if (depthOn && !dFg.hidden && dFg.style.visibility !== "hidden" && dFg.width) {
      var kf = dFg.width / 1080, r1 = cuSrc(cuMap(dFg), -ox / z, -oy / z, vw / z, vh / z);
      try { gf.drawImage(dFg, r1[0] * kf, r1[1] * kf, r1[2] * kf, r1[3] * kf, 0, 0, cw, ch); } catch (e) {}
    }
  }

  /* ================= templates: save every setting under a name, load it back, rework it, build from it =================
     Back end: Sheet tab "Templates" through the log endpoint (one row per save = the change log; Code.gs v2):
       POST {tab:"Templates", client:<board id>, project, rows:[{section: "draft"|"locked", optionCode: id, label: name, settings, note: parentId}]}
       GET  <endpoint>?templates=<board id> -> {templates:[{id, name, status, parent, project, savedBy, savedAt, settings}]}
       GET  <endpoint>?template=<id>        -> {template, history:[...]}
     A local copy (localStorage "vidpod-studio-templates-<board id>") keeps it working offline. Runbook: TEMPLATES.md. */
  var TPL = { items: {}, mode: "new", ref: null, synced: false };
  function tplKey() { return "vidpod-studio-templates-" + B.client.id; }
  function tplLoadLocal() { try { TPL.items = (JSON.parse(local(tplKey()) || "{}") || {}).items || {}; } catch (e) { TPL.items = {}; } }
  function tplSaveLocal() { local(tplKey(), JSON.stringify({ items: TPL.items })); }
  function tplList() { return Object.keys(TPL.items).map(function (k) { return TPL.items[k]; }).sort(function (a, b) { return String(b.savedAt).localeCompare(String(a.savedAt)); }); }
  function tplNewId() {
    var d = new Date(), ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"), pre = "TPL-" + B.client.id + "-" + ymd + "-", n = 0;
    Object.keys(TPL.items).forEach(function (id) { if (id.indexOf(pre) === 0) n = Math.max(n, +id.slice(pre.length) || 0); });
    return pre + (n + 1);
  }
  function tplWhen(iso) { try { var d = new Date(iso); return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }); } catch (e) { return iso || ""; } }
  function tplStatus(t) { return String(t.status || "draft").toLowerCase() === "locked" ? "locked" : "draft"; }
  function isVidpodCode() { return !!(SIGN && String(SIGN.code).toUpperCase() === "VIDPOD"); }
  function pickedNow() { return B.sections.some(function (s2) { var p = S.picks[s2.id]; return multi(s2.id) ? p && p.length : !!p; }); }
  // the settings a template carries: the full picks (as sent to VIDPOD, ready for the render) plus the raw studio state to load back
  function tplSettings(meta) {
    var doc = picksDoc();
    return { template: meta, picks: doc.picks, sfx: doc.sfx, clip: S.clip || null, canvas: doc.canvas, yIs: doc.yIs,
      raw: { picks: clone(S.picks), looks: clone(S.looks), hookText: S.hookText, clip: S.clip || null } };
  }
  function tplWrite(t, changeNote) {
    // one save = one row (and one local history line)
    t.history = t.history || [];
    t.history.push({ version: t.version, status: t.status, savedAt: t.savedAt, savedBy: t.savedBy, note: changeNote || "" });
    TPL.items[t.id] = t; tplSaveLocal();
    var row = { section: t.status, optionCode: t.id, label: t.name, settings: t.settings, note: t.parent || "" };
    return post("Templates", [row], { client: B.client.id, project: t.project || "" });
  }
  function tplSaveNew(name, project, parent, note) {
    var at = new Date().toISOString(), id = tplNewId();
    var meta = { id: id, name: name, version: 1, status: "draft", parent: parent || null, project: project, client: B.client.id, savedBy: S.viewer || (SIGN && SIGN.name) || "", savedAt: at, changeNote: note || (parent ? "Built from " + ((TPL.items[parent] || {}).name || parent) + " (" + parent + ")" : "First save") };
    var t = { id: id, name: name, status: "draft", parent: parent || null, project: project, client: B.client.id, savedBy: meta.savedBy, savedAt: at, version: 1, settings: tplSettings(meta) };
    TPL.loaded = { id: id };
    return tplWrite(t, meta.changeNote).then(function (ok) { return { ok: ok, t: t }; });
  }
  function tplNewVersion(t0, status, note, keepSettings) {
    var at = new Date().toISOString(), v = (+t0.version || 1) + 1;
    var meta = { id: t0.id, name: t0.name, version: v, status: status, parent: t0.parent || null, project: t0.project, client: B.client.id, savedBy: S.viewer || (SIGN && SIGN.name) || "", savedAt: at, changeNote: note || "" };
    var settings = keepSettings ? Object.assign(clone(t0.settings || {}), { template: meta }) : tplSettings(meta);
    var t = Object.assign({}, t0, { status: status, savedAt: at, savedBy: meta.savedBy, version: v, settings: settings });
    return tplWrite(t, note).then(function (ok) { return { ok: ok, t: t }; });
  }
  function tplApply(t) {
    var raw = (t.settings || {}).raw; if (!raw) { toast("This template has no studio settings to load."); return false; }
    if (raw.clip && raw.clip !== S.clip && clipList().some(function (c) { return c.id === raw.clip; })) useClip(raw.clip);
    S.picks = clone(raw.picks || {});
    B.sections.forEach(function (s2) {
      var lk = raw.looks && raw.looks[s2.id], pk = S.picks[s2.id];
      if (!multi(s2.id) && pk && styleDef(s2, pk.style)) { S.looks[s2.id] = clone(pk); delete S.looks[s2.id].hookText; }
      else if (lk && styleDef(s2, lk.style)) S.looks[s2.id] = clone(lk);
      if (multi(s2.id) && pk && !Array.isArray(pk)) S.picks[s2.id] = [];
      if (pk && !multi(s2.id) && !styleDef(s2, pk.style)) delete S.picks[s2.id];
    });
    S.hookText = raw.hookText == null ? null : raw.hookText;
    TPL.loaded = { id: t.id };
    save(); renderTabs(); renderHead(); renderLead(); renderCards(); renderChosen(); renderCustom(); updateFoot(); goSeg(true); rebuild();
    return true;
  }
  // settings in plain words, one line per tab
  function tplPlain(t) {
    var raw = (t.settings || {}).raw || {}, pk = raw.picks || {}, out = [];
    B.sections.forEach(function (s2) {
      var p = pk[s2.id], txt;
      if (!p || (multi(s2.id) && !p.length)) txt = "Not picked";
      else if (multi(s2.id)) txt = p.map(function (x) { var d = styleDef(s2, x.style); return d ? d.code + " " + d.label : x.style; }).join(", ");
      else if (!styleDef(s2, p.style)) txt = p.style + " (no longer on this board)";
      else { var d = lookDetail(s2.id, p); txt = d.label + (d.detail ? ": " + d.detail : ""); if (s2.id === "hook" && (p.hookText || raw.hookText)) txt += '. Words: "' + String(p.hookText || raw.hookText).replace(/\*/g, "").replace(/\n/g, " / ") + '"'; }
      out.push([TAB_LABEL[s2.id] || s2.tab, txt]);
    });
    return out;
  }
  function tplProjects() {
    var seen = {}, list = [];
    var add = function (lab) { lab = String(lab || "").trim(); if (lab && !seen[lab.toLowerCase()]) { seen[lab.toLowerCase()] = 1; list.push(lab); } };
    if (B.project) add(B.project.label || B.project.id);
    tplList().forEach(function (t) { add(t.project); });
    return list;
  }
  function tplFormMode(mode, ref) {
    TPL.mode = mode; TPL.ref = ref || null;
    var t = ref ? TPL.items[ref] : null, par = $("tpl-parent");
    $("tpl-err").hidden = true; $("tpl-note").value = "";
    $("tpl-note-f").hidden = mode !== "rework"; $("tpl-cancel").hidden = mode === "new";
    $("tpl-name").closest(".field").hidden = mode === "rework"; $("tpl-project").closest(".field").hidden = mode === "rework";
    par.hidden = mode === "new";
    if (mode === "rework" && t) { par.innerHTML = "Reworking <b>" + esc(t.name) + "</b> (version " + esc(t.version) + "). Saving keeps the same template and adds version " + ((+t.version || 1) + 1) + "."; $("tpl-save").textContent = "Save new version"; $("tpl-intro").hidden = true; }
    else if (mode === "build" && t) { par.innerHTML = "Building from <b>" + esc(t.name) + "</b>. The new template links back to it."; $("tpl-save").textContent = "Save as template"; $("tpl-name").value = t.name + ", new"; $("tpl-intro").hidden = true; tplProjectSelect(t.project); }
    else { $("tpl-save").textContent = "Save as template"; $("tpl-intro").hidden = false; }
  }
  function tplProjectSelect(cur) {
    var sel = $("tpl-project"), list = tplProjects(); sel.innerHTML = "";
    list.forEach(function (lab) { var o = el("option", "", esc(lab)); o.value = lab; sel.appendChild(o); });
    var nw = el("option", "", "New project"); nw.value = "__new"; sel.appendChild(nw);
    sel.value = cur && list.indexOf(cur) >= 0 ? cur : (list[0] || "__new");
    $("tpl-project-new").hidden = sel.value !== "__new";
  }
  function tplRender() {
    var ul = $("tpl-list"), list = tplList(); ul.innerHTML = "";
    if (!list.length) { ul.appendChild(el("li", "tpl-empty", "None yet. Save your first one above.")); ul.firstChild.style.border = "0"; ul.firstChild.style.padding = "0"; return; }
    list.forEach(function (t) {
      var li = el("li"), st = tplStatus(t), locked = st === "locked", isLoaded = TPL.loaded && TPL.loaded.id === t.id;
      var parent = t.parent && TPL.items[t.parent] ? TPL.items[t.parent].name : t.parent;
      li.appendChild(el("div", "tpl-top", "<div><b>" + esc(t.name) + "</b><small>" + esc(t.project || "No project") + " · version " + esc(t.version || 1) + " · " + esc(tplWhen(t.savedAt)) + (t.savedBy ? " · " + esc(t.savedBy) : "") + "</small>" + (parent ? "<small>Built from " + esc(parent) + "</small>" : "") + (isLoaded ? "<small><b>Loaded now</b></small>" : "") + '</div><span class="tpl-st' + (locked ? " locked" : "") + '">' + (locked ? "Locked" : "Draft") + "</span>"));
      var acts = el("div", "tpl-acts"), btn = function (label, fn, title) { var b = el("button", "chip", esc(label)); b.type = "button"; if (title) b.title = title; b.addEventListener("click", fn); acts.appendChild(b); return b; };
      var detail = el("div"); detail.hidden = true;
      btn("Load", function () { if (tplApply(t)) { closeTpl(); toast("Loaded " + t.name + "."); } }, "Put these settings into the studio");
      btn("Settings", function () { detail.hidden = !detail.hidden; if (!detail.hidden) tplDetail(t, detail); }, "See exactly what it uses");
      if (!locked) btn("Rework", function () { if (!isLoaded) tplApply(t); tplFormMode("rework", t.id); closeTpl(); toast("Loaded " + t.name + ". Change anything, then tap Save template to save a new version."); }, "Change it and save a new version");
      btn("Build from this", function () { tplApply(t); tplFormMode("build", t.id); closeTpl(); toast("Loaded " + t.name + ". Change anything, then tap Save template to make a new one from it."); }, "Start a new template from this one");
      if (!locked) btn("Lock", function () { tplNewVersion(t, "locked", "Locked", true).then(function (r) { tplRender(); toast(r.ok ? "Locked. Sent to VIDPOD." : "Locked on this device. Not sent yet."); }); }, "Make it read only");
      else if (isVidpodCode()) btn("Unlock", function () { tplNewVersion(t, "draft", "Unlocked by VIDPOD", true).then(function (r) { tplRender(); toast(r.ok ? "Unlocked." : "Unlocked on this device."); }); }, "VIDPOD only");
      if (locked && !isVidpodCode()) acts.appendChild(el("small", "", "Locked. Ask VIDPOD to change it."));
      li.appendChild(acts); li.appendChild(detail); ul.appendChild(li);
    });
  }
  function tplDetail(t, box) {
    box.innerHTML = "";
    var ul = el("ul", "tpl-set"); tplPlain(t).forEach(function (r) { ul.appendChild(el("li", "", "<span>" + esc(r[0]) + "</span><span>" + esc(r[1]) + "</span>")); }); box.appendChild(ul);
    var lg = el("ol", "tpl-log"), fill = function (hist) { lg.innerHTML = ""; hist.forEach(function (h) { lg.appendChild(el("li", "", "Version " + esc(h.version || "") + ", " + esc(tplWhen(h.savedAt)) + (h.savedBy ? ", " + esc(h.savedBy) : "") + (h.status === "locked" ? ", locked" : "") + (h.note ? ": " + esc(h.note) : ""))); }); };
    box.appendChild(el("p", "label", "Change log")); box.lastChild.style.margin = "10px 0 4px"; box.appendChild(lg);
    fill(t.history || [{ version: t.version, savedAt: t.savedAt, savedBy: t.savedBy, status: t.status, note: ((t.settings || {}).template || {}).changeNote }]);
    if (LOG_URL) fetch(LOG_URL + "?template=" + encodeURIComponent(t.id)).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok || !Array.isArray(j.history) || !j.history.length) return;
      fill(j.history.map(function (h) { var m = (h.settings || {}).template || {}; return { version: m.version || "", savedAt: h.savedAt, savedBy: h.savedBy, status: h.status, note: m.changeNote || "" }; }));
    }).catch(function () {});
  }
  function tplSync() {
    if (!LOG_URL) { $("tpl-sync").textContent = "Saved on this device."; return Promise.resolve(); }
    return fetch(LOG_URL + "?templates=" + encodeURIComponent(B.client.id)).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !Array.isArray(j.templates)) { $("tpl-sync").textContent = "Showing this device's copies."; return; }
      j.templates.forEach(function (rt) {
        var m = (rt.settings || {}).template || {}, cur = TPL.items[rt.id];
        if (cur && String(cur.savedAt) >= String(rt.savedAt)) return;
        TPL.items[rt.id] = { id: rt.id, name: rt.name || m.name, status: String(rt.status || "draft").toLowerCase(), parent: rt.parent || m.parent || null, project: rt.project || m.project || "", client: B.client.id, savedBy: rt.savedBy, savedAt: rt.savedAt, version: m.version || (cur ? cur.version : 1), settings: rt.settings || {}, history: (cur && cur.history) || [] };
      });
      tplSaveLocal(); $("tpl-sync").textContent = ""; TPL.synced = true;
    }).catch(function () { $("tpl-sync").textContent = "Offline. Showing this device's copies."; });
  }
  function openTpl() {
    if (TPL.mode === "new") { $("tpl-name").value = ""; tplProjectSelect(); }
    tplFormMode(TPL.mode, TPL.ref); if (TPL.mode !== "build") tplProjectSelect(TPL.ref && TPL.items[TPL.ref] ? TPL.items[TPL.ref].project : null);
    if (TPL.mode === "build" && TPL.ref && TPL.items[TPL.ref]) $("tpl-name").value = TPL.items[TPL.ref].name + ", new";
    tplRender();
    var d = $("tpl"); if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    tplSync().then(tplRender);
  }
  function closeTpl() { var d = $("tpl"); if (d.close) d.close(); else d.removeAttribute("open"); }
  function initTemplates() {
    tplLoadLocal();
    $("tpl-btn").addEventListener("click", openTpl);
    $("tpl-close").addEventListener("click", closeTpl);
    $("tpl-cancel").addEventListener("click", function () { tplFormMode("new"); $("tpl-name").value = ""; tplProjectSelect(); });
    $("tpl-project").addEventListener("change", function () { var nw = $("tpl-project").value === "__new"; $("tpl-project-new").hidden = !nw; if (nw) $("tpl-project-new").focus(); });
    $("tpl-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var er = $("tpl-err"), btn = $("tpl-save"), fail = function (m) { er.textContent = m; er.hidden = false; };
      er.hidden = true;
      if (!pickedNow()) return fail("Pick at least one look first: tap a look, then Use this look.");
      var done = function (r, what) {
        btn.disabled = false; tplFormMode("new"); $("tpl-name").value = ""; tplProjectSelect(r.t.project); tplRender();
        toast(what + (r.ok ? " Sent to VIDPOD." : " Saved on this device; it sends when you are back online."));
      };
      if (TPL.mode === "rework" && TPL.ref && TPL.items[TPL.ref]) {
        var t0 = TPL.items[TPL.ref]; if (tplStatus(t0) === "locked") return fail("This template is locked. Use Build from this to make a new one.");
        btn.disabled = true; tplNewVersion(t0, "draft", $("tpl-note").value.trim() || "Reworked").then(function (r) { done(r, "Saved version " + r.t.version + " of " + r.t.name + "."); });
        return;
      }
      var name = $("tpl-name").value.trim(), pv = $("tpl-project").value, project = pv === "__new" ? $("tpl-project-new").value.trim() : pv;
      if (!name) { $("tpl-name").focus(); return fail("Give it a name, for example: " + B.client.name + " template."); }
      if (!project) { $("tpl-project-new").focus(); return fail("Add the project it is for."); }
      btn.disabled = true;
      tplSaveNew(name, project, TPL.mode === "build" ? TPL.ref : null).then(function (r) { done(r, "Saved " + name + "."); });
    });
  }

  /* ================= boot ================= */
  function boot(board) {
    B = board;
    R = window.VPLooks(K);
    var c = B.client;
    $("client-logo").src = c.logo; $("client-logo").alt = c.logo_alt; $("client-logo-dark").src = c.logo_on_dark;
    var css = B.brand.font.faces.map(function (fc) { return "@font-face{font-family:\"" + fc.family + "\";src:url(\"" + fc.src + "\");font-weight:" + fc.weight + ";font-display:block;}"; }).join("");
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var saved = {}; try { saved = JSON.parse(local("vidpod-studio-v3-" + c.id) || "{}") || {}; } catch (e) { saved = {}; }
    if (c.id === "vidpod" && !isVidpodCode()) document.querySelector(".made-for").style.display = "none";
    clientSwitch(c);
    if (B.clips && B.clips.length) { B.clips[0].base = B.clips[0].base || B.base; S.clip = B.clips[0].id; if (saved.clip && saved.clip !== S.clip) useClip(saved.clip, true); }
    S.viewer = (SIGN && SIGN.name) || local("vidpod-studio-viewer") || "";
    S.hookText = saved.hookText == null ? null : saved.hookText;
    S.headText = saved.headText == null ? null : saved.headText; S.adjust = !!saved.adjust; S.job = saved.job || null;
    S.fixes = saved.fixes && typeof saved.fixes === "object" ? saved.fixes : {};
    S.likes = saved.likes || {};
    S.vtype = saved.vtype || ((B.video_types || [])[0] || {}).id || null;
    B.sections.forEach(function (s) {
      var sv = saved.looks && saved.looks[s.id];
      S.looks[s.id] = sv && styleDef(s, sv.style) ? sv : Object.assign({ style: s.styles[0].id }, clone(s.styles[0].defaults || {}));
    });
    S.picks = saved.picks || {};
    B.sections.forEach(function (s) { if (multi(s.id) && S.picks[s.id] && !Array.isArray(S.picks[s.id])) S.picks[s.id] = []; });
    // options retired from the board (old hooks, names, logos) drop out of saved picks and likes
    B.sections.forEach(function (s) { var p = S.picks[s.id]; if (!p) return; if (multi(s.id)) S.picks[s.id] = p.filter(function (x) { return styleDef(s, x.style); }); else if (!styleDef(s, p.style)) delete S.picks[s.id]; });
    Object.keys(S.likes).forEach(function (id) { if (!B.sections.some(function (s) { return styleDef(s, id); })) delete S.likes[id]; });
    var q = route().sec;
    S.sec = sec(q) ? q : saved.sec && sec(saved.sec) ? saved.sec : orderedSections()[0].id;
    video.src = B.base.video; video.poster = B.base.poster;
    video.addEventListener("loadeddata", function () { $("veil").style.display = "none"; }, { once: true });
    setTimeout(function () { $("veil").style.display = "none"; }, 6000);
    video.muted = true; setMute(); setSfxIcon();
    fit(); if ("ResizeObserver" in window) new ResizeObserver(function () { fit(); place(); }).observe(screenEl); else window.addEventListener("resize", fit);
    renderCheck(); renderClips(); renderVtype(); renderTabs(); renderHead(); renderLead(); renderRef(); renderCards(); renderChosen(); renderCustom(); updateFoot();
    goSeg(true); rebuild(); requestAnimationFrame(frame);
    setTimeout(showHint, 1500);
    whoLines(); initCloseup(); initFeedback(); initTemplates(); initMk(); initStep(); stepSync(); renderStageLine(); updateFoot();
    // phones: the tabs stick just under the window
    if ("ResizeObserver" in window) new ResizeObserver(function () { document.documentElement.style.setProperty("--stage-h", "0px"); }).observe($("stage"));
    $("home").addEventListener("click", goStart);
    $("tabs").addEventListener("scroll", tabFade, { passive: true }); window.addEventListener("resize", tabFade);
    $("sz-btn").addEventListener("click", function () { openMenu("sz"); }); $("clip-btn").addEventListener("click", function () { openMenu("clip"); });
    if (SIGN) post("Sign-ins", [{ section: "", optionCode: "", label: SIGN.fresh ? "Signed in" : "Came back", settings: { board: B.client.id, hash: location.hash || "", page: location.host || "claude", screen: window.innerWidth + "x" + window.innerHeight }, note: (navigator.userAgent || "").slice(0, 160) }]);
    window.__studio = { S: S, goStart: goStart, switchSec: switchSec, openBox: openBox, templates: function () { return TPL; }, chooseStyle: chooseStyle, setApp: function (a) { S.app = a; renderCheck(); refreshUI(); }, seek: function (t) { if (isOwn()) { setClock(t, false); setPlayIcon(); return; } video.pause(); video.currentTime = t; }, look: look, useClip: useClip, setLook: function (o) { Object.assign(look(), o); changed(); renderCustom(); }, live: function () { return live; } };
  }
  /* ---- which board: #atpilates (or #atpilates/hook) opens that client's board; no hash opens the VIDPOD standard board ---- */
  var SECTION_IDS = ["subtitles", "hook", "name", "logo", "moves", "graphics", "transitions", "backgrounds", "endcard"];
  function route() {
    var parts = (location.hash || "").replace(/^#\/?/, "").split("/").filter(Boolean), out = { client: "vidpod", sec: null, explicit: false };
    parts.forEach(function (x) { x = decodeURIComponent(x).toLowerCase(); if (SECTION_IDS.indexOf(x) >= 0) out.sec = x; else if (/^[a-z0-9-]{2,40}$/.test(x)) { out.client = x; out.explicit = true; } });
    return out;
  }
  function getBoard(id) { return fetch("clients/" + id + "/board.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  // the vector mark (for the logo draw-on) is read once from the board's SVG: paths and polygons, viewBox, fill colour
  function loadMark(b) {
    var src = b.brand && (b.brand.mark_svg || b.brand.twin_circle); if (!src) return Promise.resolve(b);
    return fetch(src).then(function (r) { return r.ok ? r.text() : ""; }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, "image/svg+xml"), svg = doc.querySelector("svg"); if (!svg) return b;
      var vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
      var paths = Array.prototype.map.call(doc.querySelectorAll("path, polygon"), function (n) { return n.tagName.toLowerCase() === "polygon" ? "M" + n.getAttribute("points").trim() + "Z" : n.getAttribute("d"); }).filter(Boolean);
      var m = /fill:\s*(#[0-9a-f]{3,6})/i.exec(txt);
      b._mark = { vb: vb.length === 4 ? vb : [0, 0, 100, 100], paths: paths, fill: m ? m[1] : null };
      return b;
    }).catch(function () { return b; });
  }
  window.addEventListener("hashchange", function () { var r = route(); if (B && r.explicit && r.client !== B.client.id && isVidpodCode()) location.reload(); else if (B && r.sec && r.sec !== S.sec && sec(r.sec)) switchSec(r.sec, false); });

  /* ---- feedback: a text note and, outside the Claude page, a hold-to-record voice note with live words where the browser can ---- */
  var FB = { rec: null, chunks: [], blob: null, type: "", t0: 0, timer: 0, stream: null, sr: null, words: "", interim: "", holding: false, secs: 0 };
  function fbVoiceOK() { return !(window.claude && typeof window.claude.use === "function") && typeof window.MediaRecorder === "function" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"; }
  function fbType() { var c = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]; for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i]; return ""; }
  function fbShowWords() { var w = $("fb-words"); var txt = (FB.words + " " + FB.interim).trim(); w.hidden = !txt; w.innerHTML = esc(FB.words) + (FB.interim ? " <em>" + esc(FB.interim) + "</em>" : ""); }
  function fbStartWords() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    try {
      var sr = new SR(); sr.lang = "en-AU"; sr.continuous = true; sr.interimResults = true;
      sr.onresult = function (ev) { var fin = "", mid = ""; for (var i = ev.resultIndex; i < ev.results.length; i++) { var r = ev.results[i]; if (r.isFinal) fin += r[0].transcript; else mid += r[0].transcript; } if (fin) FB.words = (FB.words + " " + fin).trim(); FB.interim = mid; fbShowWords(); };
      sr.onerror = function () {}; sr.onend = function () { FB.sr = null; };
      sr.start(); FB.sr = sr;
    } catch (e) { FB.sr = null; }
  }
  function fbTick() { var s2 = Math.floor((Date.now() - FB.t0) / 1000); FB.secs = s2; $("fb-time").textContent = "Recording " + fmt(s2) + " of 2:00. Let go to stop."; if (s2 >= 120) fbStop(); }
  function fbBegin() {
    FB.chunks = []; FB.words = ""; FB.interim = ""; fbShowWords();
    FB.type = fbType();
    try { FB.rec = FB.type ? new MediaRecorder(FB.stream, { mimeType: FB.type }) : new MediaRecorder(FB.stream); } catch (e) { FB.rec = new MediaRecorder(FB.stream); }
    FB.type = FB.rec.mimeType || FB.type || "audio/webm";
    FB.rec.ondataavailable = function (e) { if (e.data && e.data.size) FB.chunks.push(e.data); };
    FB.rec.onstop = function () {
      FB.blob = new Blob(FB.chunks, { type: FB.type.split(";")[0] });
      $("fb-audio").src = URL.createObjectURL(FB.blob); $("fb-take").hidden = !FB.blob.size;
      $("fb-time").textContent = FB.blob.size ? "Voice note ready (" + fmt(FB.secs) + "). Hold again to replace it." : "Nothing recorded. Hold the button while you talk.";
      if (FB.stream) { FB.stream.getTracks().forEach(function (t) { t.stop(); }); FB.stream = null; }
    };
    FB.rec.start(500); FB.t0 = Date.now(); FB.secs = 0; clearInterval(FB.timer); FB.timer = setInterval(fbTick, 250); fbTick();
    $("fb-rec").setAttribute("aria-pressed", "true"); $("fb-rec-l").textContent = "Recording. Let go to stop";
    fbStartWords();
  }
  function fbStart() {
    if (FB.rec && FB.rec.state === "recording") return;
    FB.holding = true; $("fb-err").hidden = true;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      FB.stream = st;
      if (!FB.holding) { st.getTracks().forEach(function (t) { t.stop(); }); FB.stream = null; $("fb-time").textContent = "Microphone ready. Now hold the button while you talk."; return; }
      fbBegin();
    }).catch(function () { FB.holding = false; $("fb-err").textContent = "We could not use your microphone. You can still type your note."; $("fb-err").hidden = false; });
  }
  function fbStop() {
    FB.holding = false; clearInterval(FB.timer);
    $("fb-rec").setAttribute("aria-pressed", "false"); $("fb-rec-l").textContent = "Hold to record a voice note";
    if (FB.sr) try { FB.sr.stop(); } catch (e) {}
    if (FB.interim) { FB.words = (FB.words + " " + FB.interim).trim(); FB.interim = ""; fbShowWords(); }
    if (FB.rec && FB.rec.state === "recording") FB.rec.stop();
  }
  function fbClear() { FB.blob = null; FB.words = ""; FB.interim = ""; fbShowWords(); $("fb-take").hidden = true; $("fb-audio").removeAttribute("src"); $("fb-time").textContent = "Up to 2 minutes. Let go to stop."; }
  function initFeedback() {
    var dlg = $("fb");
    $("fb-btn").addEventListener("click", function () {
      $("fb-main").style.display = "flex"; $("fb-done").style.display = "none"; $("fb-err").hidden = true;
      $("fb-voice").hidden = !fbVoiceOK();
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    });
    var close = function () { fbStop(); if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
    $("fb-cancel").addEventListener("click", close); $("fb-close").addEventListener("click", close);
    var rb = $("fb-rec");
    rb.addEventListener("pointerdown", function (e) { e.preventDefault(); try { rb.setPointerCapture(e.pointerId); } catch (x) {} fbStart(); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { rb.addEventListener(n, function () { if (FB.holding || (FB.rec && FB.rec.state === "recording")) fbStop(); }); });
    rb.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    rb.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); fbStart(); } });
    rb.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fbStop(); } });
    $("fb-del").addEventListener("click", fbClear);
    $("fb-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var note = $("fb-note").value.trim(), btn = $("fb-send"), st0 = curStyle();
      if (!note && !FB.blob) { $("fb-err").textContent = "Add a note or record a voice note first."; $("fb-err").hidden = false; return; }
      if (FB.blob && FB.blob.size > 5 * 1024 * 1024) { $("fb-err").textContent = "That voice note is too long to send. Try a shorter one."; $("fb-err").hidden = false; return; }
      btn.disabled = true; btn.textContent = "Sending";
      var row = { section: S.sec, optionCode: st0 ? st0.code : "", label: FB.blob ? "Feedback with voice note" : "Feedback", settings: { clip: S.clip || null, useCase: S.vtype || null, voiceSeconds: FB.blob ? FB.secs : 0, audioType: FB.blob ? FB.blob.type : null }, note: note, transcript: FB.words };
      var withAudio = !FB.blob ? Promise.resolve(null) : new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res({ base64: String(fr.result || "").replace(/^data:[^,]*,/, ""), contentType: FB.blob.type || "audio/mp4", filename: "voice note." + (/mp4/.test(FB.blob.type) ? "m4a" : /ogg/.test(FB.blob.type) ? "ogg" : "webm") }); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(FB.blob); });
      withAudio.then(function (au) { return post("Feedback", [row], au ? { audio: au } : null); }).then(function (ok) {
        btn.disabled = false; btn.textContent = "Send feedback";
        if (!ok) { local("vidpod-studio-feedback-unsent", JSON.stringify(row)); $("fb-err").textContent = "We could not reach VIDPOD just now. Your note is saved on this device; try again in a moment."; $("fb-err").hidden = false; return; }
        $("fb-done-p").textContent = "Sent to VIDPOD. Thanks " + (S.viewer || "") + ", we read every note.";
        $("fb-main").style.display = "none"; $("fb-done").style.display = "flex";
        $("fb-note").value = ""; fbClear();
      });
    });
  }

  /* ---- sign-in: name + access code (no account). The code decides the board; a client hash in the URL still wins (for VIDPOD). ---- */
  function saveSign() { local("vidpod-studio-signin", JSON.stringify({ name: SIGN.name, code: SIGN.code })); }
  function loadCodes() { return fetch("codes.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function gate(cfg) {
    var codes = {}; Object.keys(cfg.codes || {}).forEach(function (k) { codes[k.toUpperCase()] = cfg.codes[k]; });
    var saved = null; try { saved = JSON.parse(local("vidpod-studio-signin") || "null"); } catch (e) { saved = null; }
    if (saved && saved.name && saved.code && codes[String(saved.code).toUpperCase()]) {
      var c0 = String(saved.code).toUpperCase();
      return Promise.resolve({ name: saved.name, code: c0, board: codes[c0].board, fresh: false });
    }
    return new Promise(function (res) {
      var g = $("gate"); g.hidden = false;
      $("gate-name").value = (saved && saved.name) || local("vidpod-studio-viewer") || "";
      ($("gate-name").value ? $("gate-code") : $("gate-name")).focus();
      $("gate-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var nm = $("gate-name").value.trim(), cd = $("gate-code").value.trim().toUpperCase(), er = $("gate-err");
        if (!nm) { er.textContent = "Add your name so VIDPOD knows who is picking."; er.hidden = false; $("gate-name").focus(); return; }
        if (!codes[cd]) { er.textContent = cd ? "That code did not work. Check it with your VIDPOD contact and try again." : "Add the access code VIDPOD gave you."; er.hidden = false; $("gate-code").focus(); $("gate-code").select(); return; }
        er.hidden = true; g.hidden = true;
        local("vidpod-studio-signin", JSON.stringify({ name: nm, code: cd })); local("vidpod-studio-viewer", nm);
        res({ name: nm, code: cd, board: codes[cd].board, fresh: true });
      });
    });
  }
  /* VIDPOD only: a client switcher in the header (opens that client's board on this sign-in, so Make these works on their footage).
     Client codes never see it, and a client hash in the URL is ignored for them (one board per client code). */
  function clientSwitch(c) {
    if (!isVidpodCode()) return;
    var mf = document.querySelector(".made-for"), boards = {};
    Object.keys(CODES).forEach(function (k) { boards[CODES[k].board] = CODES[k].label || k; });
    if (Object.keys(boards).length < 2) return;
    mf.classList.add("switch");
    if (c.id === "vidpod") { mf.classList.add("own"); mf.appendChild(el("b", "sw-name", "Clients")); }
    var chev = el("span", "sw-chev", "<svg viewBox=\"0 0 24 24\" width=\"12\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 9l6 6 6-6\"/></svg>");
    mf.appendChild(chev);
    var sel = el("select", "sw-sel"); sel.setAttribute("aria-label", "Open another client's board");
    Object.keys(boards).forEach(function (id) { var o = el("option", "", esc(boards[id])); o.value = id; if (id === c.id) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { location.hash = sel.value; });
    mf.appendChild(sel);
  }
  function switchUser() { local("vidpod-studio-signin", null); location.reload(); }
  function whoLines() {
    if (!SIGN) return;
    ["who-foot", "who-sheet"].forEach(function (id) {
      var n = $(id); if (!n) return;
      n.innerHTML = "Signed in as <b>" + esc(S.viewer || SIGN.name) + "</b>. ";
      var b = el("button", "link", "Not you? Switch"); b.type = "button"; b.addEventListener("click", switchUser); n.appendChild(b);
    });
  }
  loadCodes().catch(function () { return null; }).then(function (cfg) {
    if (!cfg) { $("veil").textContent = "The studio could not load. Check your connection and refresh."; return; }
    LOG_URL = /^https:\/\//.test(cfg.log_endpoint || "") ? cfg.log_endpoint : "";
    CODES = cfg.codes || {};
    return gate(cfg).then(function (sg) {
      SIGN = sg;
      var r = route(), vp = String(sg.code).toUpperCase() === "VIDPOD", startClient = (r.explicit && vp) ? r.client : (sg.board || "vidpod");
      return getBoard(startClient).catch(function () { return startClient === "vidpod" ? Promise.reject(new Error("no board")) : getBoard("vidpod"); }).then(loadMark).then(boot);
    });
  }).catch(function (e) {
    console.error(e); $("veil").textContent = "The studio could not load. Refresh to try again.";
  });
})();
