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
  var PAGE_VERSION = "v5";
  var SIGN = null, LOG_URL = "";
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
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ================= state ================= */
  var B = null;
  var S = { sec: null, looks: {}, picks: {}, app: "", viewer: "", hookText: null, likes: {}, favOnly: false, vtype: null };
  var video = document.getElementById("video");
  var screenEl = document.getElementById("screen");
  var under = document.getElementById("under"), over = document.getElementById("layer"), ui = document.getElementById("ui");
  var backdrop = document.getElementById("backdrop");
  var scale = 0.25, live = null, R = null;
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    "lt-mask-reveal": ["Sweep colour", "Text colour", "white"], "lt-stack-bars": ["Role bar colour", "Name bar colour", "dark"]
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
  function caseText(str, c) {
    var out = c === "upper" ? str.toUpperCase() : (c === "lower" || c === "sentence") ? str.toLowerCase() : str;
    if (c === "sentence") (B.base.proper || []).forEach(function (tok) { var re = new RegExp("(^|[^A-Za-z@'])(" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z])", "gi"); out = out.replace(re, function (m, a) { return a + tok; }); });
    (B.base.protect_case || []).forEach(function (tok) { var re = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); out = out.replace(re, tok); });
    return out;
  }
  function W(i) { return B.base.words[i]; }
  function wt(i) { var t = String(W(i).text); return caseText(PUNCT ? t : t.replace(/[,.!?]$/, ""), CASE); }
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
        for (var k = p; k < Math.min(words.length, p + 9); k++) { if (norm(words[k].text) === n || norm(words[k].text).indexOf(n) === 0 && n.length > 2) { hit = k; break; } }
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
  function makeCtx(L, sd, styleObj, stage) {
    var f = fontDef(L.font || "brand"), sw = swatch(L.colour || "white"), c2 = colour2Of(L), sw2 = c2 ? swatch(c2) : null;
    var segm = styleObj.segment || sd.segment;
    return {
      L: L, f: f, hex: sw.hex, colourId: sw.id, hex2: sw2 ? sw2.hex : null, colour2Id: sw2 ? sw2.id : null, shadow: isLight(sw.hex) ? B.brand.shadow : "none", seg: segm, card: stage.card, B: B,
      media: stage.media, backdrop: stage.backdrop, under: stage.under, over: stage.over, safe: B.safe,
      px: function (n) { return n * stage.scale(); },
      hook: function () { return parseHook(S.hookText, segm); },
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
        if (stage.card) { e = el("img"); e.src = B.base.studio.poster; e.alt = ""; }
        else { e = el("video"); e.muted = true; e.playsInline = true; e.setAttribute("playsinline", ""); e.preload = "auto"; e.src = B.base.studio.video; e.loop = true; }
        e.style.cssText = "position:absolute;object-fit:cover;display:block;" + (css || "");
        parent.appendChild(e);
        return { el: e, from: function (t0) { if (!stage.card) studioRegs.push({ el: e, t0: t0 }); } };
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
        for (var i = p[k]; i < end; i++) if (W(i).t < seg[1]) idx.push(i);
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
  function isOwn(id) { var s = sec(id || S.sec); return !!(s && s.clock === "loop"); }
  function playing() { return isOwn() ? !LC.paused : !video.paused; }
  function clockT() { var L2 = seg()[1], t = LC.paused ? LC.at : performance.now() / 1000 - LC.t0; return ((t % L2) + L2) % L2; }
  function setClock(t, play) { LC.at = t; LC.t0 = performance.now() / 1000 - t; if (play != null) LC.paused = !play; }
  function startPlay() { if (isOwn()) { if (LC.paused) { setClock(clockT(), true); setPlayIcon(); updateDock(); } return; } if (video.paused) video.play().catch(function () {}); }
  function togglePlay() { if (isOwn()) { var t = clockT(); setClock(t, LC.paused); setPlayIcon(); updateDock(); return; } if (video.paused) video.play().catch(function () {}); else video.pause(); }
  function curStyle() { return styleDef(sec(S.sec), look().style); }
  function hasCtl(name) { return sec(S.sec).controls.indexOf(name) >= 0; }
  function seg() { if (isOwn()) return [0, (live && live.loop) || sec(S.sec).segment[1]]; var st = curStyle(); return (st && st.segment) || sec(S.sec).segment; }
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
    teardown();
    CASE = L.case || "spoken"; PUNCT = !!L.punct;
    var st = styleDef(sd, L.style);
    var ctx = makeCtx(L, sd, st, mainStage);
    var r;
    try { r = R[L.style](ctx); } catch (e) { console.error(e); r = { tl: gsap.timeline({ paused: true }) }; }
    if (r.block) { r.block.classList.add("block"); (r.blockUnder ? under : over).appendChild(r.block); }
    addOns(r, L, (st && st.segment) || sd.segment);
    live = r; buildSfx(sd, st, r);
    if (isOwn()) { video.pause(); $("t-end").textContent = fmt(seg()[1]); }
    setDepth(!!r.depth);
    place();
    if (r.after) r.after();
    r.tl.seek(isOwn() ? clockT() : Math.max(seg()[0], video.currentTime || 0), false);
    syncPosSlider();
    refreshUI();
  }
  function teardown() {
    if (!live) return;
    if (live.tl) live.tl.kill();
    if (live.teardown) try { live.teardown(); } catch (e) {}
    under.innerHTML = ""; over.innerHTML = "";
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
  function clampY(y) { var r = yRange(); return Math.round(Math.min(r[1], Math.max(r[0], y))); }
  function place() {
    if (!live || !live.block || live.fixed) { updateGrab(); return; }
    var L = look(), z = B.safe, h = blockH();
    if (L.y == null) return;
    L.y = clampY(L.y);
    var b = live.block;
    b.style.left = z.x0 + "px"; b.style.width = (z.x1 - z.x0) + "px"; b.style.height = h + "px"; b.style.top = Math.round(L.y - h / 2) + "px";
    updateGrab();
  }

  /* ---- depth: the person matte, so words can sit between her and the wall ---- */
  var depthVid = null, dBg = $("depth-bg"), dFg = $("depth-fg"), gl = null, glTex = null, depthOn = false, ctx2d = null;
  function initDepth() {
    if (depthVid || !B.base.depth) return;
    depthVid = el("video"); depthVid.muted = true; depthVid.playsInline = true; depthVid.setAttribute("playsinline", ""); depthVid.preload = "auto"; depthVid.crossOrigin = "anonymous";
    depthVid.src = B.base.depth.video; depthVid.className = "studio-v"; screenEl.appendChild(depthVid);
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
  function dropDepth() { // a new clip: forget the old matte (a clip without one shows matte looks without the cut-out)
    if (depthVid) { try { depthVid.pause(); depthVid.removeAttribute("src"); depthVid.load(); depthVid.remove(); } catch (e) {} }
    depthVid = null; depthOn = false; dBg.hidden = dFg.hidden = true;
  }
  function setDepth(on) {
    if (on) initDepth();
    depthOn = !!(on && gl && depthVid);
    dBg.hidden = !depthOn; dFg.hidden = !depthOn;
    if (!depthOn && depthVid) depthVid.pause();
    sizeDepth();
  }
  function sizeDepth() {
    if (!depthOn) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(screenEl.clientWidth * dpr), h = Math.round(screenEl.clientHeight * dpr);
    if (dFg.width !== w) { dFg.width = w; dFg.height = h; dBg.width = w; dBg.height = h; }
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
    tickCards(now || performance.now());
    cuRender(now || performance.now());
    requestAnimationFrame(frame);
  }
  function setPlayIcon() { var playing = isOwn() ? !LC.paused : !video.paused; $("play").innerHTML = playing ? I.pause : I.play; $("play").setAttribute("aria-label", playing ? "Pause" : "Play"); $("play-l").textContent = playing ? "Pause" : "Play"; }
  function goSeg(play) {
    var s = seg();
    if (isOwn()) { video.pause(); setClock(0, !!play && !reduceMotion); $("t-end").textContent = fmt(s[1] - s[0]); setPlayIcon(); return; }
    try { video.currentTime = s[0]; } catch (e) {} $("t-end").textContent = fmt(s[1] - s[0]);
    if (play && !reduceMotion) video.play().catch(function () {}); setPlayIcon();
  }
  function fit() { var w = screenEl.clientWidth; scale = w / 1080; [backdrop, under, over, ui].forEach(function (l) { l.style.transform = "scale(" + scale + ")"; }); sizeDepth(); updateGrab(); }

  /* ---- check against an app: the app screen plus the covered areas, labelled ---- */
  var dragging = false, activeSnap = null;
  function appDef(id) { return (B.apps || []).filter(function (a) { return a.id === id; })[0]; }
  function refreshUI() {
    ui.innerHTML = "";
    var a = appDef(S.app);
    if (a) {
      var img = el("img", "app-ui"); img.alt = ""; img.src = a.img; ui.appendChild(img);
      a.covered.forEach(function (c) {
        var d = el("div", "cover" + (c[4] === "buttons" ? " rail" : ""), "<span>Covered by " + esc(a.name) + " " + esc(c[4]) + "</span>");
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
    note.textContent = a ? "Shaded areas are covered by " + a.name + ". Your words stay clear of them." : "";
  }
  function renderCheck() {
    var box = $("check"); box.innerHTML = "";
    [{ id: "", label: "Off" }].concat(B.apps || []).forEach(function (a) {
      var b = el("button", "", esc(a.label)); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(a.id === S.app));
      b.addEventListener("click", function () { S.app = a.id; renderCheck(); refreshUI(); });
      box.appendChild(b);
    });
  }

  /* ---- drag to position: only the text itself grabs, so the page still scrolls on a phone ---- */
  var grab = $("grab"), dragStart = null;
  function canDrag() { return hasCtl("position") && live && live.block && !live.fixed && !screenEl.classList.contains("pip"); }
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

  /* ================= mini preview cards ================= */
  var cards = [], cardIO = null;
  function cardFrame(t) { var fr = B.base.card_frames, src = fr[0].src; fr.forEach(function (f) { if (t >= f.t) src = f.src; }); return src; }
  function buildCard(sd, st) {
    var btn = el("button", "card"); btn.type = "button"; btn.setAttribute("role", "radio"); btn.dataset.style = st.id;
    var mini = el("div", "mini");
    var bd = el("div", "layer");
    var img = el("img", "bg"); img.alt = ""; if (sd.clock === "loop") img.style.visibility = "hidden"; else img.src = cardFrame((st.segment || sd.segment)[0]);
    var und = el("div", "layer"), cut = el("img", "cut"), ov = el("div", "layer");
    cut.alt = ""; cut.hidden = true;
    mini.appendChild(bd); mini.appendChild(img); mini.appendChild(und); mini.appendChild(cut); mini.appendChild(ov);
    mini.appendChild(el("span", "picked-mark", I.tick));
    var lk = el("button", "like", S.likes[st.id] ? I.heartOn : I.heart); lk.type = "button"; lk.setAttribute("aria-pressed", String(!!S.likes[st.id])); lk.setAttribute("aria-label", "Like " + st.code);
    lk.addEventListener("click", function (e) { e.stopPropagation(); toggleLike(sd, st); });
    mini.appendChild(lk);
    btn.appendChild(mini);
    var fits = S.vtype && sd.scope !== "any" && (st.use_cases || []).indexOf(S.vtype) >= 0 && (st.use_cases || []).length < 4;
    btn.appendChild(el("div", "meta", '<span class="id">' + esc(st.code) + '</span><span class="nm">' + esc(st.label) + "</span>" + (st.kind ? '<span class="kind">' + esc(st.kind) + "</span>" : "") + (fits ? '<span class="rec">Made for ' + esc(vtypeLabel()) + "</span>" : "") + (isOurPick(sd.id, st.id) ? '<span class="our">Our pick</span>' : "")));
    var c = { btn: btn, mini: mini, img: img, und: und, ov: ov, cut: cut, bd: bd, sd: sd, st: st, tl: null, visible: false, t0: performance.now() / 1000 + Math.random() * 0.4, sc: 0.1, built: false };
    btn.addEventListener("click", function () { chooseStyle(st.id); });
    return c;
  }
  function mountCard(c) {
    var sd = c.sd, st = c.st, L = cardLook(sd, st), w = c.mini.clientWidth || 118;
    c.sc = w / 1080; c.und.style.transform = c.ov.style.transform = c.bd.style.transform = "scale(" + c.sc + ")";
    var stage = { card: true, media: c.img, backdrop: c.bd, under: c.und, over: c.ov, scale: function () { return c.sc; } };
    var ctx = makeCtx(L, sd, st, stage), prevCase = CASE, prevP = PUNCT;
    CASE = L.case || "spoken"; PUNCT = !!L.punct;
    c.und.innerHTML = ""; c.ov.innerHTML = ""; c.bd.innerHTML = "";
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
    addOns(r, L, st.segment || sd.segment);
    c.depth = !!r.depth;
    if (c.depth && B.base.card_cutout) { c.cut.src = B.base.card_cutout.src; c.cut.hidden = false; c.img.src = cardFrame(B.base.card_cutout.t); }
    c.r = r; c.tl = r.tl; c.built = true; c.seg = r.loop ? [0, r.loop] : st.segment || sd.segment; c.gap = r.loop ? 0 : 0.6;
  }
  function cardLook(sd, st) {
    // a card shows the style in the client's current font/colour choices for that tab where it makes sense
    var L = Object.assign({ style: st.id }, clone(st.defaults || {}));
    var cur = S.looks[sd.id];
    if (cur && cur.fontTouched) L.font = cur.font;
    if (cur && sd.clock === "loop") ["bg", "speed", "label"].forEach(function (k) { if (cur[k] != null) L[k] = cur[k]; });
    return L;
  }
  function renderCards() {
    var box = $("cards"), sd = sec(S.sec); box.innerHTML = "";
    if (cardIO) cardIO.disconnect();
    cards.forEach(function (c) { if (c.tl) c.tl.kill(); });
    var list = sd.styles.slice();
    if (S.vtype && sd.scope !== "any") list.sort(function (a, b) { var fa = (a.use_cases || []).indexOf(S.vtype) >= 0 ? 0 : 1, fb = (b.use_cases || []).indexOf(S.vtype) >= 0 ? 0 : 1; return fa - fb; });
    if (S.favOnly) list = list.filter(function (st) { return S.likes[st.id]; });
    $("fav-toggle").setAttribute("aria-pressed", String(S.favOnly));
    if (!list.length) box.appendChild(el("p", "empty-fav", "No favourites in this tab yet. Tap the heart on any card to save it here."));
    cards = list.map(function (st) { var c = buildCard(sd, st); box.appendChild(c.btn); return c; });
    markCards();
    cardIO = "IntersectionObserver" in window ? new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { var c = cards.filter(function (x) { return x.btn === en.target; })[0]; if (!c) return; c.visible = en.isIntersecting; if (c.visible && !c.built) mountCard(c); });
    }, { root: null, rootMargin: "0px 200px 0px 200px" }) : null;
    cards.forEach(function (c) { if (cardIO) cardIO.observe(c.btn); else { c.visible = true; } });
    if (!cardIO) cards.forEach(mountCard);
    // keep the chosen card in view in the swipe row
    var sel = cards.filter(function (c) { return c.st.id === look().style; })[0];
    if (sel && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, sel.btn.offsetLeft - 16);
  }
  /* ---- VIDPOD's pick: board.json vidpod_pick holds one recommended option (and its settings) per section ---- */
  function isOurPick(sid, styleId) { var p = (B.vidpod_pick || {})[sid]; if (!p) return false; return Array.isArray(p) ? p.some(function (x) { return x.style === styleId; }) : p.style === styleId; }
  function useOurPicks() {
    var vp = B.vidpod_pick || {}, n = 0;
    B.sections.forEach(function (s2) {
      var p = vp[s2.id]; if (!p) return;
      if (Array.isArray(p)) { S.picks[s2.id] = p.filter(function (x) { return styleDef(s2, x.style); }).map(clone); n++; return; }
      if (!styleDef(s2, p.style)) return;
      S.looks[s2.id] = clone(p); S.picks[s2.id] = clone(p); n++;
      if (s2.id === "hook") S.picks.hook.hookText = S.hookText == null ? B.base.hook_text : S.hookText;
    });
    save(); renderTabs(); renderCards(); renderChosen(); renderCustom(); updateFoot(); rebuild(); updateDock();
    toast(n ? "VIDPOD's picks are in every tab. Change anything you like." : "No picks set for this board yet.");
  }
  function markCards() {
    var L = look(), p = S.picks[S.sec];
    cards.forEach(function (c) {
      c.btn.setAttribute("aria-checked", String(c.st.id === L.style));
      var picked = multi() ? (p || []).some(function (x) { return x.style === c.st.id; }) : (p && p.style === c.st.id);
      c.btn.classList.toggle("is-picked", !!picked);
    });
  }
  var lastCardsT = 0;
  function tickCards(now) {
    if (reduceMotion) return;
    var t = now / 1000;
    cards.forEach(function (c) {
      if (!c.visible || !c.built || !c.tl) return;
      var d = c.seg[1] - c.seg[0], lt = c.seg[0] + ((t - c.t0) % (d + c.gap));
      if (lt > c.seg[1]) lt = c.seg[1];
      c.tl.seek(lt, false);
      if (!c.depth && !c.r.loop) { var src = cardFrame(lt); if (c.img.getAttribute("src") !== src) c.img.setAttribute("src", src); }
    });
  }

  /* ================= panel ================= */
  function renderTabs() {
    var t = $("tabs"); t.innerHTML = "";
    var lastScope = null;
    orderedSections().forEach(function (s) {
      if (lastScope && lastScope !== s.scope) t.appendChild(el("span", "tab-sep", ""));
      lastScope = s.scope;
      var p = S.picks[s.id], has = multi(s.id) ? p && p.length : !!p;
      var b = el("button", "tab" + (has ? " picked" : ""), esc(s.tab) + '<span class="pk" aria-hidden="true"></span>');
      b.type = "button"; b.setAttribute("role", "tab"); b.id = "tab-" + s.id; b.setAttribute("aria-selected", String(s.id === S.sec));
      b.addEventListener("click", function () { switchSec(s.id, true); });
      t.appendChild(b);
    });
    var sel = t.querySelector('[aria-selected="true"]'); if (sel && t.scrollWidth > t.clientWidth && (sel.offsetLeft + sel.offsetWidth > t.scrollLeft + t.clientWidth || sel.offsetLeft < t.scrollLeft)) t.scrollLeft = Math.max(0, sel.offsetLeft - 40);
  }
  function renderHead() { var s = sec(S.sec); $("sec-q").textContent = s.question; $("sec-help").textContent = s.help; }
  function renderChosen() {
    var st = curStyle(), box = $("chosen"); box.innerHTML = "";
    var txt = el("div", "txt", '<span class="cid">' + esc(st.code) + "</span><b>" + esc(st.label) + (st.kind ? " <span style=\"font-weight:600;color:var(--muted)\">\u00b7 " + esc(st.kind) + "</span>" : "") + "</b><small>" + esc(st.best_for) + "</small>");
    var ub = el("button", "btn", "Use this look"); ub.type = "button"; ub.id = "use-btn";
    ub.addEventListener("click", usePick);
    box.appendChild(txt); box.appendChild(ub);
    if (S.likes[st.id]) box.appendChild(likeNote(st));
    updateUse();
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
    if (!hasCtl("hooktext")) { box.hidden = true; return; }
    box.hidden = false;
    var hb = el("div", "field lead-field");
    hb.innerHTML = '<label for="hook-text">Your hook line</label><textarea id="hook-text" rows="3" spellcheck="true"></textarea><p class="hint">Start here. One line per row. Put *stars* round the big word. Every card below updates as you type.</p>';
    box.appendChild(hb);
    var ta = hb.querySelector("textarea"); ta.value = S.hookText == null ? B.base.hook_text : S.hookText;
    var hT = null; ta.addEventListener("input", function () { S.hookText = ta.value; clearTimeout(hT); hT = setTimeout(function () { changed(); }, 260); });
    var rs = el("div", "hook-chips");
    var b1 = el("button", "chip", "Words as said"); b1.type = "button";
    b1.addEventListener("click", function () { S.hookText = B.base.words.filter(function (w) { return w.t < sec("hook").segment[1]; }).map(function (w) { return w.text; }).join(" ").replace(/,\s*/g, "\n"); ta.value = S.hookText; changed(); });
    var b2 = el("button", "chip", "VIDPOD suggestion"); b2.type = "button";
    b2.addEventListener("click", function () { S.hookText = null; ta.value = B.base.hook_text; changed(); });
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
    box.appendChild(el("h3", "custom-h", "Customise<span class=\"dot\"></span>"));
    if (!s.controls.length || (S.sec === "transitions" && st.id !== "tr-lens")) {
      var reb = el("div");
      reb.appendChild(el("p", "none-note", S.sec === "transitions" ? "Transitions play at the join between two moments. Tap Replay to see it again." : "This one is set by VIDPOD to suit your footage. Tap Replay to watch it again, and pick as many as you like."));
      var rb = el("button", "btn ghost sm", I.replay.replace("<svg", "<svg width=\"16\" height=\"16\"") + " Replay"); rb.type = "button"; rb.style.marginTop = "12px";
      rb.addEventListener("click", replay); reb.appendChild(rb); box.appendChild(reb);
      return;
    }
    var grid = el("div", "ctl-grid"); box.appendChild(grid);
    if (hasCtl("font")) {
      var fb = el("div", "wide"); fb.appendChild(el("p", "label", "Font"));
      var chips = el("div", "chips"); chips.setAttribute("role", "radiogroup"); chips.setAttribute("aria-label", "Font");
      B.fonts.forEach(function (fo) {
        var c = el("button", "chip", esc(fo.label) + (fo.sub ? "<small>" + esc(fo.sub) + "</small>" : ""));
        c.type = "button"; c.setAttribute("role", "radio"); c.setAttribute("aria-checked", String(fo.id === L.font));
        if (fo.family) c.style.fontFamily = "\"" + fo.family + "\", system-ui";
        c.addEventListener("click", function () { L.font = fo.id; L.fontTouched = true; changed(); renderCustom(); });
        chips.appendChild(c);
      });
      fb.appendChild(chips); grid.appendChild(fb);
    }
    // order Tommy works in: the style (cards above), then layout, then colour, then text, then motion
    var grpH = function (t) { var h = el("p", "grp-h wide", esc(t)); grid.appendChild(h); };
    if (hasCtl("bg")) {
      var bgw = el("div", "wide"); bgw.appendChild(el("p", "label", "Background"));
      bgw.appendChild(swatchRow(logoBgs(), L.bg || "white", function (v, keep) { L.bg = v; if (keep) changedSoon(); else { changed(); renderCustom(); } }, "Background"));
      grid.appendChild(bgw);
    }
    if (hasCtl("lines") || hasCtl("wpl") || hasCtl("size") || hasCtl("position") || hasCtl("align")) grpH("Layout");
    if (hasCtl("lines")) grid.appendChild(seg3("Lines", [[1, "1 line"], [2, "2 lines"]], L.lines || 1, function (v) { L.lines = v; changed(); renderCustom(); }));
    if (hasCtl("wpl")) grid.appendChild(seg3("Words per line", [[0, "Auto"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]], +L.wpl || 0, function (v) { L.wpl = v; changed(); renderCustom(); }));
    if (hasCtl("align")) grid.appendChild(seg3("Align", [["left", "Left"], ["centre", "Centre"]], L.align || "left", function (v) { L.align = v; changed(); renderCustom(); }));
    if (hasCtl("size")) {
      var r = s.size_range, sb = el("div");
      sb.innerHTML = '<p class="label"><label for="ctl-size">Size</label><output id="out-size">' + L.size + ' px</output></p><input type="range" id="ctl-size" min="' + r[0] + '" max="' + r[1] + '" step="2" value="' + L.size + '">';
      grid.appendChild(sb);
      var cs = sb.querySelector("input"); paintRange(cs);
      cs.addEventListener("input", function () { L.size = +cs.value; $("out-size").textContent = L.size + " px"; paintRange(cs); changedSoon(); });
    }
    if (hasCtl("position") && !st.no_position) {
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
      pb.appendChild(el("p", "hint", "Or drag the words in the preview. They snap to these heights and always stay centred."));
      grid.appendChild(pb);
      rg.addEventListener("input", function () { var rr = yRange(); L.y = Math.round(rr[0] + (rr[1] - rr[0]) * (+rg.value / 100)); var sn = snapY(L.y); L.y = sn.y; place(); syncPosSlider(); markDirty(); save(); });
    }
    if (hasCtl("colour") || hasCtl("highlight") || hasCtl("outline") || hasCtl("backing")) grpH("Colour");
    if (hasCtl("colour")) {
      var role = colourRole(L.style);
      var cb = el("div", "wide"); cb.appendChild(el("p", "label", role[0]));
      cb.appendChild(swatchRow(B.brand.swatches, L.colour, function (v, keep) { L.colour = v; if (keep) changedSoon(); else { changed(); renderCustom(); } }, role[0]));
      grid.appendChild(cb);
      if (role[1]) {
        var cb2 = el("div", "wide"); cb2.appendChild(el("p", "label", role[1]));
        cb2.appendChild(swatchRow(B.brand.swatches, colour2Of(L), function (v, keep) { L.colour2 = v; if (keep) changedSoon(); else { changed(); renderCustom(); } }, role[1]));
        grid.appendChild(cb2);
      }
    }
    if (hasCtl("highlight")) {
      var hw = el("div", "wide"); hw.appendChild(seg3("Active word highlight", [[false, "Off"], [true, "On"]], !!L.hl, function (v) { L.hl = v; if (v && !L.hlColour) L.hlColour = "primary"; changed(); renderCustom(); }));
      if (L.hl) {
        var hs = seg3("Highlight style", [["colour", "Colour change"], ["box", "Box behind word"], ["scale", "Scale up"]], L.hlStyle || "colour", function (v) { L.hlStyle = v; changed(); renderCustom(); }); hs.style.marginTop = "14px"; hw.appendChild(hs);
        var hcw = el("div"); hcw.style.marginTop = "14px"; hcw.appendChild(el("p", "label", "Highlight colour"));
        hcw.appendChild(swatchRow(B.brand.swatches, L.hlColour, function (v, keep) { L.hlColour = v; if (keep) changedSoon(); else { changed(); renderCustom(); } }, "Highlight colour"));
        hw.appendChild(hcw);
      }
      grid.appendChild(hw);
    }
    if (hasCtl("outline")) { var oe = seg3("Text edge", [["shadow", "Soft shadow"], ["hard", "Hard shadow"], ["stroke", "Outline"], ["none", "None"]], L.fx || "shadow", function (v) { L.fx = v; changed(); renderCustom(); }); oe.classList.add("wide"); grid.appendChild(oe); }
    if (hasCtl("backing")) grid.appendChild(seg3("Behind the text", [["none", "Nothing"], ["box", "Box"], ["blur", "Blur"]], L.backing || "none", function (v) { L.backing = v; changed(); renderCustom(); }));
    if (hasCtl("case") || hasCtl("punct")) grpH("Text");
    if (hasCtl("case")) { var cs3 = seg3("Case", [["spoken", "As spoken"], ["sentence", "Sentence"], ["upper", "UPPER"], ["lower", "lower"]], L.case, function (v) { L.case = v; changed(); renderCustom(); }); cs3.classList.add("wide"); grid.appendChild(cs3); }
    if (hasCtl("punct")) grid.appendChild(seg3("Punctuation", [[false, "Off"], [true, "On"]], !!L.punct, function (v) { L.punct = v; changed(); renderCustom(); }));
    if (hasCtl("anim") || hasCtl("motion") || hasCtl("speed")) grpH("Motion");
    if (hasCtl("speed")) grid.appendChild(seg3("Speed", [["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]], L.speed || "normal", function (v) { L.speed = v; changed(); renderCustom(); }));
    if (hasCtl("label")) grid.appendChild(seg3("Small label under the logo", [[false, "Off"], [true, "On"]], !!L.label, function (v) { L.label = v; changed(); renderCustom(); }));
    if (hasCtl("anim")) { var an = seg3("Animation", [["style", "Style"], ["none", "None"], ["pop", "Pop"], ["rise", "Rise"], ["fade", "Fade"], ["word", "Word by word"]], L.anim || "style", function (v) { L.anim = v; changed(); renderCustom(); }); an.classList.add("wide"); grid.appendChild(an); }
    if (hasCtl("motion")) grid.appendChild(seg3("Motion add-on", [["none", "None"], ["float", "Float"], ["grow", "Grow"], ["wobble", "Wobble"]], L.motion || "none", function (v) { L.motion = v; changed(); renderCustom(); }));
    if (hasCtl("flash") && st.id === "tr-lens") {
      grid.appendChild(seg3("Flash colour", [["white", "White"], ["warm", "Warm"], ["brand", "Brand"]], L.flash || "warm", function (v) { L.flash = v; changed(); renderCustom(); replay(); }));
      var rb2 = el("button", "btn ghost sm", "Replay the join"); rb2.type = "button"; rb2.addEventListener("click", replay); grid.appendChild(rb2);
    }
    var rs2 = el("button", "reset", "Reset to the VIDPOD default"); rs2.type = "button";
    rs2.addEventListener("click", function () { chooseStyle(L.style, true); });
    box.appendChild(rs2);
    syncPosSlider();
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
  var LOOK_KEYS = ["style", "font", "size", "y", "colour", "colour2", "case", "lines", "align", "flash", "wpl", "punct", "hl", "hlStyle", "hlColour", "fx", "anim", "backing", "motion", "bg", "speed", "label"];
  function sameLook(a, b) { return a && b && LOOK_KEYS.every(function (k) { return a[k] === b[k]; }); }
  function updateUse() {
    var ub = $("use-btn"); if (!ub) return;
    var p = S.picks[S.sec], L = look();
    ub.classList.remove("picked"); ub.disabled = false;
    if (multi()) {
      var has = (p || []).some(function (x) { return x.style === L.style; });
      ub.textContent = has ? "Picked. Tap to remove" : "Add to my picks"; if (has) ub.classList.add("picked");
    } else if (p && sameLook(p, L)) { ub.textContent = "In your picks"; ub.classList.add("picked"); }
    else if (p) { ub.textContent = "Swap my pick to this"; }
    else ub.textContent = "Use this look";
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
    markCards(); renderChosen(); renderCustom(); updateDock();
    if (!d.segment || newSeg[0] !== oldSeg[0] || newSeg[1] !== oldSeg[1] || S.sec === "transitions" || S.sec === "logo" || S.sec === "moves" || S.sec === "graphics") goSeg(true);
    $("t-end").textContent = fmt(seg()[1] - seg()[0]);
  }
  function usePick() {
    var L = look(), st = curStyle();
    if (multi()) {
      var arr = S.picks[S.sec] || [], i = arr.findIndex(function (x) { return x.style === L.style; });
      if (i >= 0) arr.splice(i, 1); else arr.push({ style: L.style });
      S.picks[S.sec] = arr;
    } else { S.picks[S.sec] = clone(L); delete S.picks[S.sec].fontTouched; if (S.sec === "hook") S.picks.hook.hookText = S.hookText == null ? B.base.hook_text : S.hookText; }
    save(); renderTabs(); updateUse(); updateFoot(); markCards();
  }
  function switchSec(id, scroll) {
    S.sec = id; if (CU.ok) setTimeout(cuSync, 0); renderVtype(); renderTabs(); renderHead(); renderLead(); renderRef(); renderCards(); renderChosen(); renderCustom(); goSeg(true); rebuild(); save();
    updateDock();
    if (scroll) { var stk = $("sticky"), r = stk.getBoundingClientRect(); if (r.top <= 0) window.scrollTo({ top: window.scrollY + $("panel-body").getBoundingClientRect().top - stk.offsetHeight - (document.body.classList.contains("pip-on") ? 140 : 0), behavior: "smooth" }); }
    setTimeout(showHint, 900);
  }
  function replay() { var s = seg(); if (isOwn()) { setClock(0, true); setPlayIcon(); updateDock(); return; } try { video.currentTime = s[0]; } catch (e) {} video.play().catch(function () {}); }

  /* ---- preview on: a board can carry several clips; words, timings, cards and matte follow the chosen clip ---- */
  function clipList() { return (B.clips || []).filter(function (c) { return c.base; }); }
  function applyClip(c) {
    B.base = c.base; var sg = c.segments || {};
    B.sections.forEach(function (s2) { if (sg.sections && sg.sections[s2.id]) s2.segment = sg.sections[s2.id]; s2.styles.forEach(function (st) { if (sg.styles && sg.styles[st.id]) st.segment = sg.styles[st.id]; }); });
  }
  function renderClips() {
    var row = $("clips-row"), box = $("clips"), list = clipList(); box.innerHTML = "";
    row.hidden = list.length < 2; if (list.length < 2) return;
    list.forEach(function (c) {
      var b = el("button", "", esc(c.label)); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(c.id === S.clip));
      b.addEventListener("click", function () { useClip(c.id); });
      box.appendChild(b);
    });
  }
  function useClip(id, quiet) {
    var c = clipList().filter(function (x) { return x.id === id; })[0]; if (!c) return;
    S.clip = id; applyClip(c); S.hookText = null;
    if (quiet) return;
    teardown(); dropDepth(); video.src = B.base.video; video.poster = B.base.poster; $("veil").style.display = "";
    video.addEventListener("loadeddata", function () { $("veil").style.display = "none"; }, { once: true });
    setTimeout(function () { $("veil").style.display = "none"; }, 6000);
    save(); renderClips(); renderLead(); renderCards(); renderChosen(); renderCustom(); goSeg(true); rebuild();
  }

  /* ---- match a look: a client drops a screenshot of a look they love (assets + db "references") ---- */
  var ASSETS = null;
  (function () { try { if (window.claude && typeof window.claude.use === "function") Promise.resolve(window.claude.use("assets")).then(function (a) { ASSETS = a || null; renderRef(); }).catch(function () {}); } catch (e) {} })();
  function renderRef() {
    var box = $("ref"); if (!box || !B) return; box.innerHTML = "";
    var show = (!!ASSETS || !!LOG_URL) && (S.sec === "subtitles" || S.sec === "hook"); box.hidden = !show; if (!show) return;
    var head = el("div", "ref-head", '<div><b>Seen a look you love?</b><small>Drop a screenshot and we will match it for you.</small></div>');
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
  function renderVtype() {
    var box = $("vtype"); box.innerHTML = "";
    var house = sec(S.sec) && sec(S.sec).scope === "any";
    $("vtype-l").textContent = house ? "House style" : "Making a";
    box.parentNode.classList.toggle("house", house);
    if (house) { box.appendChild(el("span", "house-note", esc((B.scope_notes || {}).any || "The same on every video."))); return; }
    (B.video_types || []).forEach(function (v) {
      var b = el("button", "", esc(v.label)); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(v.id === S.vtype));
      b.addEventListener("click", function () { S.vtype = v.id; save(); renderVtype(); renderTabs(); renderCards(); });
      box.appendChild(b);
    });
  }
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
    if (S.favOnly && !on) renderCards(); else cards.forEach(function (c) { if (c.st.id === st.id) { var b = c.btn.querySelector(".like"); b.innerHTML = on ? I.heartOn : I.heart; b.setAttribute("aria-pressed", String(on)); } });
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
  $("fav-toggle").addEventListener("click", function () { S.favOnly = !S.favOnly; renderCards(); });

  /* ---- picks bar + review ---- */
  function lookDetail(sid, p) {
    var s = sec(sid), d = styleDef(s, p.style), parts = [];
    if (s.controls.indexOf("font") >= 0) { var fo = B.fonts.filter(function (x) { return x.id === p.font; })[0] || B.fonts[0]; parts.push(fo.id === "brand" ? fo.sub : fo.label); }
    if (s.controls.indexOf("size") >= 0) parts.push((sid === "logo" ? "width " : "") + p.size + " px");
    if (s.controls.indexOf("position") >= 0) parts.push("y " + p.y);
    if (s.controls.indexOf("lines") >= 0) parts.push((p.lines || 1) + (p.lines === 2 ? " lines" : " line"));
    if (s.controls.indexOf("align") >= 0) parts.push(p.align === "centre" ? "centred" : "left");
    if (s.controls.indexOf("colour") >= 0) { var rl = colourRole(p.style); parts.push(rl[0].toLowerCase() + " " + swatch(p.colour).label); if (rl[1]) parts.push(rl[1].toLowerCase() + " " + swatch(colour2Of(p)).label); }
    if (s.controls.indexOf("case") >= 0) parts.push(p.case === "spoken" ? "as said" : p.case);
    if (p.flash && p.style === "tr-lens") parts.push(p.flash + " flash");
    if (s.controls.indexOf("wpl") >= 0 && +p.wpl) parts.push(p.wpl + " words per line");
    if (s.controls.indexOf("anim") >= 0 && p.anim && p.anim !== "style") parts.push(p.anim + " animation");
    if (s.controls.indexOf("highlight") >= 0 && p.hl) parts.push((p.hlStyle || "colour") + " highlight in " + swatch(p.hlColour || "primary").label);
    if (s.controls.indexOf("outline") >= 0 && p.fx && p.fx !== "shadow") parts.push(p.fx === "stroke" ? "outline" : "no shadow");
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
    var n = pickedCount(), codes = [];
    B.sections.forEach(function (s) { var p = S.picks[s.id]; if (!p) return; (multi(s.id) ? p : [p]).forEach(function (x) { var d = styleDef(s, x.style); if (d) codes.push(d.code); }); });
    $("count").innerHTML = n + " of " + B.sections.length + " tabs picked<small>" + (codes.length ? esc(codes.join(", ")) : "Tap a card, then Use this look") + "</small>";
    $("review-btn").disabled = n === 0;
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
      if (multi(s.id)) { picks[s.id] = p && p.length ? p.map(function (x) { var d = styleDef(s, x.style); return { style: d.id, code: d.code, label: d.label, registry: d.registry || null, source: d.source || null }; }) : null; return; }
      if (!p) { picks[s.id] = null; return; }
      var d = styleDef(s, p.style), o = { style: p.style, code: d.code, label: d.label, registry: d.registry || null, scope: s.scope === "any" ? "house-style" : "per-video-type" };
      if (s.controls.indexOf("font") >= 0) { var fo = fontDef(p.font); o.font = p.font; o.fontFamily = p.font === "brand" ? B.brand.font.sub : fo.family; }
      if (s.controls.indexOf("size") >= 0) o.sizePx = p.size;
      if (s.controls.indexOf("position") >= 0) o.yPx = p.y;
      if (s.controls.indexOf("lines") >= 0) o.lines = p.lines || 1;
      if (s.controls.indexOf("align") >= 0) o.align = p.align || "left";
      if (s.controls.indexOf("colour") >= 0) { var rl2 = colourRole(p.style); o.colour = p.colour; o.colourHex = swatch(p.colour).hex; o.colourIs = rl2[0]; if (rl2[1]) { o.colour2 = colour2Of(p); o.colour2Hex = swatch(o.colour2).hex; o.colour2Is = rl2[1]; } }
      if (s.controls.indexOf("case") >= 0) o.case = p.case;
      if (p.flash && p.style === "tr-lens") o.flash = p.flash;
      if (p.hookText) o.hookText = p.hookText;
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
    return Object.assign(baseFields(), { clip: S.clip || null, sfx: sfx, client: B.client.id, sentAt: new Date().toISOString(), viewer: S.viewer, accessCode: SIGN ? SIGN.code : null, note: $("viewer-note").value.trim(), canvas: "1080x1920", yIs: "centre of the text block, px on 1080x1920", picks: picks, likes: likes });
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
    var rows = [{ section: "all", optionCode: Object.keys(doc.picks).map(function (k) { var v = doc.picks[k]; return !v ? null : Array.isArray(v) ? v.map(function (x) { return x.code; }).join(" ") : v.code; }).filter(Boolean).join(", "), label: pickedCount() + " of " + B.sections.length + " tabs picked", settings: doc, note: doc.note }];
    B.sections.forEach(function (s2) { var v = doc.picks[s2.id]; if (!v) return; rows.push({ section: s2.id, optionCode: Array.isArray(v) ? v.map(function (x) { return x.code; }).join(", ") : v.code, label: Array.isArray(v) ? v.map(function (x) { return x.label; }).join(", ") : v.label, settings: v, note: "" }); });
    var toDb = dbReady.then(function (db) { if (!db) return false; return db.collection("picks").add(doc).then(function () { return true; }); }).catch(function () { return false; });
    Promise.all([post("Picks", rows), toDb]).then(function (r) {
      if (r[0] || r[1]) finish(true, "Sent to VIDPOD. Thanks " + name + ". Change anything and send again whenever you like.");
      else finish(false, fallback);
    }).then(function () { btn.disabled = false; btn.textContent = "Send picks"; });
  });
  $("sheet-cancel").addEventListener("click", closeReview);
  $("sheet-close").addEventListener("click", closeReview);
  $("review-btn").addEventListener("click", openReview);

  function save() { local("vidpod-studio-v3-" + B.client.id, JSON.stringify({ looks: S.looks, picks: S.picks, sec: S.sec, hookText: S.hookText, likes: S.likes, vtype: S.vtype, clip: S.clip })); }

  /* ---- buttons ---- */
  $("play").addEventListener("click", togglePlay);
  video.addEventListener("play", setPlayIcon); video.addEventListener("pause", setPlayIcon);
  function setMute() { $("mute").innerHTML = video.muted ? I.mute : I.sound; $("mute").setAttribute("aria-pressed", String(!video.muted)); $("mute").setAttribute("aria-label", video.muted ? "Turn sound on" : "Turn sound off"); }
  $("mute").addEventListener("click", function () { video.muted = !video.muted; setMute(); startPlay(); });
  $("full").innerHTML = I.full; $("close-full").innerHTML = I.close; $("replay").innerHTML = I.replay; $("dock-up").innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg>';
  $("replay").addEventListener("click", replay);
  function setFull(on) {
    $("stage").classList.toggle("full", on); if (on) unPip(); if (CU.ok) cuSync();
    requestAnimationFrame(function () { fit(); if (!on) { var r = $("screen-slot").getBoundingClientRect(); if (r.bottom < 0) setPip(true); } });
    if (on) startPlay();
  }
  $("full").addEventListener("click", function () { setFull(true); });
  $("close-full").addEventListener("click", function () { setFull(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setFull(false); });
  var scrub = $("scrub");
  scrub.addEventListener("input", function () { scrubbing = true; var s = seg(), t = s[0] + (s[1] - s[0]) * scrub.value / 1000; if (isOwn()) setClock(Math.min(t, s[1] - 0.01)); else video.currentTime = t; });
  scrub.addEventListener("change", function () { scrubbing = false; });
  scrub.addEventListener("pointerup", function () { scrubbing = false; });

  /* ---- small docked preview when the big one scrolls away on a phone ---- */
  function unPip() { screenEl.classList.remove("pip"); document.body.classList.remove("pip-on"); requestAnimationFrame(fit); }
  function setPip(on) {
    if (on && (window.innerWidth >= 980 || $("stage").classList.contains("full"))) on = false;
    if (on === screenEl.classList.contains("pip")) return;
    if (on) { screenEl.classList.add("pip"); document.body.classList.add("pip-on"); updateDock(); requestAnimationFrame(fit); }
    else unPip();
  }
  function updateDock() { var st = curStyle(); if (!st) return; $("dock-code").textContent = "Now playing " + st.code; $("dock-name").textContent = st.label; $("dock-play").innerHTML = playing() ? I.pause : I.play; }
  $("dock-play").addEventListener("click", togglePlay);
  video.addEventListener("play", updateDock); video.addEventListener("pause", updateDock);
  $("dock-up").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("dock-full").innerHTML = I.full; $("dock-full").addEventListener("click", function () { setFull(true); });
  // tapping the small docked preview opens it full screen right here, no scrolling back up
  screenEl.addEventListener("click", function (e) { if (Date.now() - pipGestureAt < 450 || (e.target && e.target.closest && e.target.closest(".pip-handle"))) return; if (screenEl.classList.contains("pip")) setFull(true); });

  /* ---- the docked preview can be resized: pinch it, or drag the corner handle. Snaps to small, medium (40 %) or large (55 %) ---- */
  var pipGestureAt = 0, pipSize = "small";
  function pipSizes() { var h = window.innerHeight || 800; return { small: 124, medium: Math.round(h * 0.40), large: Math.round(h * 0.55) }; }
  function setPipH(px) { document.body.style.setProperty("--pip-h", Math.round(px) + "px"); document.body.classList.toggle("pip-big", px > 170); }
  function snapPip(px, keep) {
    var z = pipSizes(), best = "small"; ["small", "medium", "large"].forEach(function (k) { if (Math.abs(z[k] - px) < Math.abs(z[best] - px)) best = k; });
    pipSize = best; setPipH(z[best]); if (keep !== false) local("vidpod-studio-pip", best);
    var h = $("dock-hint"); if (h) h.textContent = best === "small" ? "Pinch or drag the corner to make it bigger" : "Pinch or drag the corner to resize";
    requestAnimationFrame(fit);
  }
  function curPipH() { return parseFloat(getComputedStyle(document.body).getPropertyValue("--pip-h")) || 124; }
  function initDockSize() {
    var saved = local("vidpod-studio-pip"); snapPip(pipSizes()[saved] || 124, false); if (saved) pipSize = saved;
    window.addEventListener("resize", function () { setPipH(pipSizes()[pipSize] || 124); });
    var max = function () { return pipSizes().large; }, clampH = function (v) { return Math.max(100, Math.min(max(), v)); };
    // corner handle: drag down or right to grow
    var hd = $("pip-handle"), drag = null;
    hd.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); drag = { y: e.clientY, x: e.clientX, h: curPipH() }; try { hd.setPointerCapture(e.pointerId); } catch (x) {} });
    hd.addEventListener("pointermove", function (e) { if (!drag) return; var d = Math.max(e.clientY - drag.y, (e.clientX - drag.x) * 16 / 9); setPipH(clampH(drag.h + d)); fit(); });
    // after a resize, scroll by the change so what sat just under the dock is still just under it (nothing hides behind it)
    var keepView = function (h0) { var d = curPipH() - h0; if (d && window.scrollY > 0) window.scrollBy(0, -d); };
    var endDrag = function () { if (!drag) return; var h0 = drag.h; drag = null; pipGestureAt = Date.now(); snapPip(curPipH()); keepView(h0); };
    hd.addEventListener("pointerup", endDrag); hd.addEventListener("pointercancel", endDrag);
    hd.addEventListener("click", function (e) { e.stopPropagation(); });
    // pinch with two fingers on the docked preview
    var pin = null, dist = function (t) { var a = t[0], b = t[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };
    screenEl.addEventListener("touchstart", function (e) { if (!screenEl.classList.contains("pip") || e.touches.length !== 2) return; pin = { d: dist(e.touches), h: curPipH() }; e.preventDefault(); }, { passive: false });
    screenEl.addEventListener("touchmove", function (e) { if (!pin || e.touches.length !== 2) return; e.preventDefault(); setPipH(clampH(pin.h * dist(e.touches) / pin.d)); fit(); }, { passive: false });
    var endPin = function (e) { if (!pin || (e.touches && e.touches.length >= 2)) return; var h0 = pin.h; pin = null; pipGestureAt = Date.now(); snapPip(curPipH()); keepView(h0); };
    screenEl.addEventListener("touchend", endPin); screenEl.addEventListener("touchcancel", endPin);
    ["gesturestart", "gesturechange"].forEach(function (n) { screenEl.addEventListener(n, function (e) { if (screenEl.classList.contains("pip")) e.preventDefault(); }); });
  }

  /* ---- close-up: while Customise is on screen (phone), a 2x live view of the text block sits above the Send bar ---- */
  var CU = { want: local("vidpod-studio-closeup") !== "off", seen: false, last: 0, ok: false };
  var CU_SECS = ["subtitles", "hook", "name", "logo"];
  function cuShouldShow() { return CU.seen && CU_SECS.indexOf(S.sec) >= 0 && window.innerWidth < 980 && !$("stage").classList.contains("full") && !!live; }
  function cuSync() {
    var on = cuShouldShow(); document.body.classList.toggle("cu-show", on); document.body.classList.toggle("cu-off", !CU.want);
    $("cu-toggle").textContent = CU.want ? "Hide" : "Show close-up";
    var h = $("closeup").offsetHeight; if (on && h) document.body.style.setProperty("--cu-h", h + "px");
  }
  function initCloseup() {
    $("cu-toggle").addEventListener("click", function () { CU.want = !CU.want; local("vidpod-studio-closeup", CU.want ? "on" : "off"); cuSync(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (ents) { ents.forEach(function (en) { CU.seen = en.isIntersecting; }); cuSync(); }, { threshold: 0, rootMargin: "0px 0px -120px 0px" }).observe($("custom"));
    window.addEventListener("resize", cuSync);
    CU.ok = true; cuSync();
  }
  function cuRect() {
    // the text block, in 1080x1920 canvas units, measured on the live screen
    var sr = screenEl.getBoundingClientRect(), k = scale || 0.25, r = null;
    var add = function (q) { if (!q || q.width < 1 || q.height < 1) return; r = r ? { l: Math.min(r.l, q.left), t: Math.min(r.t, q.top), rr: Math.max(r.rr, q.right), b: Math.max(r.b, q.bottom) } : { l: q.left, t: q.top, rr: q.right, b: q.bottom }; };
    if (live && live.block) { var ins = live.block.querySelectorAll(".inner"); if (ins.length) Array.prototype.forEach.call(ins, function (n) { add(n.getBoundingClientRect()); }); else add(live.block.getBoundingClientRect()); }
    if (!r) return { x: 540, y: 960, w: 800, h: 300 };
    return { x: ((r.l + r.rr) / 2 - sr.left) / k, y: ((r.t + r.b) / 2 - sr.top) / k, w: (r.rr - r.l) / k, h: (r.b - r.t) / k };
  }
  // copy a layer as it is right now (inline styles carry the animation state); media and canvases are skipped so nothing reloads
  function cuClone(n) {
    if (n.nodeType !== 1) return n.cloneNode(false);
    var c = n.cloneNode(false); c.removeAttribute("id");
    for (var ch = n.firstChild; ch; ch = ch.nextSibling) { var t = ch.nodeName; if (t === "VIDEO" || t === "AUDIO" || t === "CANVAS" || t === "SCRIPT") continue; c.appendChild(cuClone(ch)); }
    return c;
  }
  function cuRender(now) {
    if (!CU.ok || !CU.want || !document.body.classList.contains("cu-show") || now - CU.last < 66) return;
    CU.last = now;
    var view = $("cu-view"), vw = view.clientWidth, vh = view.clientHeight; if (!vw || !vh) return;
    var big = ($("screen-slot").clientWidth || 260) / 1080, rc = cuRect();
    var z = Math.max(big, Math.min(big * 2, (vw - 16) / Math.max(rc.w, 1)));
    var ox = vw / 2 - rc.x * z, oy = vh / 2 - rc.y * z;
    var lay = $("cu-layers"); lay.style.transform = "translate(" + ox.toFixed(1) + "px," + oy.toFixed(1) + "px) scale(" + z.toFixed(4) + ")";
    var frag = document.createDocumentFragment();
    [backdrop, under, over].forEach(function (L0) { frag.appendChild(cuClone(L0)); });
    lay.replaceChildren(frag);
    var cv = $("cu-canvas"), dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(vw * dpr), ch = Math.round(vh * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    var g = cv.getContext("2d"); g.fillStyle = "#111"; g.fillRect(0, 0, cw, ch);
    if (!isOwn() && video.readyState >= 2 && video.videoWidth) {
      var kv = video.videoWidth / 1080, sx = -ox / z, sy = -oy / z;
      try { g.drawImage(video, sx * kv, sy * kv, (vw / z) * kv, (vh / z) * kv, 0, 0, cw, ch); } catch (e) {}
    }
  }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (ents) { ents.forEach(function (en) { setPip(!en.isIntersecting && en.boundingClientRect.top < 0); }); }, { threshold: 0 }).observe($("screen-slot"));
  window.addEventListener("resize", function () { if (window.innerWidth >= 980) unPip(); });

  /* ================= boot ================= */
  function boot(board) {
    B = board;
    R = window.VPLooks(K);
    var c = B.client;
    $("client-logo").src = c.logo; $("client-logo").alt = c.logo_alt; $("client-logo-dark").src = c.logo_on_dark;
    var css = B.brand.font.faces.map(function (fc) { return "@font-face{font-family:\"" + fc.family + "\";src:url(\"" + fc.src + "\");font-weight:" + fc.weight + ";font-display:block;}"; }).join("");
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var saved = {}; try { saved = JSON.parse(local("vidpod-studio-v3-" + c.id) || "{}") || {}; } catch (e) { saved = {}; }
    if (c.id === "vidpod") document.querySelector(".made-for").style.display = "none";
    if (B.clips && B.clips.length) { B.clips[0].base = B.clips[0].base || B.base; S.clip = B.clips[0].id; if (saved.clip && saved.clip !== S.clip) useClip(saved.clip, true); }
    S.viewer = (SIGN && SIGN.name) || local("vidpod-studio-viewer") || "";
    S.hookText = saved.hookText == null ? null : saved.hookText;
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
    whoLines(); initDockSize(); initCloseup(); initFeedback();
    var ob = $("our-picks"); if (ob) { ob.hidden = !B.vidpod_pick; ob.addEventListener("click", useOurPicks); }
    if (SIGN) post("Sign-ins", [{ section: "", optionCode: "", label: SIGN.fresh ? "Signed in" : "Came back", settings: { board: B.client.id, hash: location.hash || "", page: location.host || "claude", screen: window.innerWidth + "x" + window.innerHeight }, note: (navigator.userAgent || "").slice(0, 160) }]);
    window.__studio = { S: S, switchSec: switchSec, chooseStyle: chooseStyle, setApp: function (a) { S.app = a; renderCheck(); refreshUI(); }, seek: function (t) { if (isOwn()) { setClock(t, false); setPlayIcon(); return; } video.pause(); video.currentTime = t; }, look: look, useClip: useClip, setLook: function (o) { Object.assign(look(), o); changed(); renderCustom(); }, live: function () { return live; } };
  }
  /* ---- which board: #atpilates (or #atpilates/hook) opens that client's board; no hash opens the VIDPOD standard board ---- */
  var SECTION_IDS = ["subtitles", "hook", "name", "logo", "moves", "graphics", "transitions"];
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
  window.addEventListener("hashchange", function () { var r = route(); if (B && r.explicit && r.client !== B.client.id) location.reload(); else if (B && r.sec && r.sec !== S.sec && sec(r.sec)) switchSec(r.sec, false); });

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
    return gate(cfg).then(function (sg) {
      SIGN = sg;
      var r = route(), startClient = r.explicit ? r.client : (sg.board || "vidpod");
      return getBoard(startClient).catch(function () { return startClient === "vidpod" ? Promise.reject(new Error("no board")) : getBoard("vidpod"); }).then(loadMark).then(boot);
    });
  }).catch(function (e) {
    console.error(e); $("veil").textContent = "The studio could not load. Refresh to try again.";
  });
})();
