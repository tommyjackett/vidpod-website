/* VidPod Studio: MOTION GRAPHICS STYLES (MG) and the OPENER HANDOVER (OPEN-01). 7 Nov 2026.
   Catalogue: mograph.json (styles, needs, creates, build path, motion rules, Ranch example frames).
   Every demo is the Jackett Ranch method re-skinned to the client's brand from board.json, playing on the client's clip:
     box-style    Box style (MG-01)   usa-property-pt2/gen_gfx.py strip/slam/slide/pop/out + gfx/OPEN_dad (freeze, cut-out, drop-away, payoff)
     board        The board (MG-02)   usa-property-shared/engine.py + template.tpl (one world, camera {cx,cy,z,r}, taped footage, note paper)
     map-moment   Map moment (MG-03)  usa-property-pt2/gfx/DRIVE_fifty (map rises, route draws, pin, label slam, drop away)
     world        The world (MG-04)   usa-property-pt2/gfx/TITLE_ranch (cloud roll-in, sun behind a cut-out sign, layered push in)
     opener-handover (OPEN-01)        a studio hook (studio-hooks.js hk-highlight-bars) hands over to the house subtitles
   Public API (contract in MECHANISMS.md, "Motion graphics (MG) and openers"):
     VidPodMograph.mount(containerEl, {board, clip, words, ...})        the "Motion graphics" area, one card per style
     VidPodMograph.mountOpener(containerEl, {board, clip, words, ...})  the OPEN-01 card for the Openers section
   Self-contained: needs only gsap (already on the page). Uses studio-looks.js / studio-hooks.js renderers when loaded (window.VPLooks),
   else a built-in fallback. Never edits the studio's own state; picks and hearts go out through opts.onPick / opts.onHeart,
   window.__studio.mograph.{pick,heart} if the core exposes it, else this device plus a "vidpod:mograph" DOM event. */
(function () {
  "use strict";
  var VERSION = "1 (7 Nov 2026)";
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";

  /* ================= small utils ================= */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function hexRgb(h) { h = String(h || "#000000").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [0, 2, 4].map(function (o) { return parseInt(h.substr(o, 2), 16) || 0; }); }
  function rgbHex(c) { return "#" + c.map(function (v) { return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(""); }
  function mix(a, b, k) { var x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map(function (v, i) { return v + (y[i] - v) * k; })); }
  function rgba(h, a) { return "rgba(" + hexRgb(h).join(",") + "," + a + ")"; }
  function lum(hex) { var c = hexRgb(hex).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function isLight(hex) { return lum(hex) > 0.4; }
  function fmt(t) { t = Math.max(0, t || 0); return Math.floor(t / 60) + ":" + ("0" + Math.floor(t % 60)).slice(-2); }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9@']/g, ""); }
  var _cv = document.createElement("canvas").getContext("2d");
  function textW(text, weight, size, family) { _cv.font = weight + " " + size + "px \"" + family + "\""; return _cv.measureText(text).width; }
  function local(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }
  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); }); }
  function ease(name) { try { return gsap.parseEase(name); } catch (e) { return function (p) { return p; }; } }

  /* ================= styles (scoped .vpm; picks up the studio's CSS tokens when present) ================= */
  var CSS = [
    ".vpm{--vpm-fg:var(--fg,#0A0A0A);--vpm-bg:var(--card,#FFFFFF);--vpm-bg2:var(--bg-2,#F5F5F2);--vpm-line:var(--line,#EAEAE5);--vpm-muted:var(--muted,#6B6B6B);--vpm-acc:var(--green,#00FFAA);--vpm-on-acc:var(--on-green,#000);color:var(--vpm-fg);font-family:var(--font-body,Inter,system-ui,sans-serif);}",
    ".vpm *{box-sizing:border-box;}",
    ".vpm-head{margin:4px 0 14px;} .vpm-head h2{margin:0 0 4px;font-size:20px;line-height:1.2;letter-spacing:-.01em;} .vpm-head p{margin:0;color:var(--vpm-muted);font-size:14px;line-height:1.45;max-width:60ch;}",
    ".vpm-list{display:grid;grid-template-columns:1fr;gap:16px;} @media (min-width:900px){.vpm-list{grid-template-columns:1fr 1fr;}}",
    ".vpm-card{background:var(--vpm-bg);border:1px solid var(--vpm-line);border-radius:16px;padding:14px;min-width:0;}",
    ".vpm-top{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:2px;} .vpm-code{font:800 11px/1 var(--font-body,Inter,sans-serif);letter-spacing:.08em;background:var(--vpm-fg);color:var(--vpm-bg);padding:4px 6px;border-radius:5px;}",
    ".vpm-top h3{margin:0;font-size:18px;line-height:1.2;} .vpm-tag{margin:2px 0 10px;color:var(--vpm-muted);font-size:13.5px;line-height:1.4;}",
    ".vpm-stagewrap{display:flex;justify-content:center;background:var(--vpm-bg2);border-radius:12px;padding:10px 0;}",
    ".vpm-screen{position:relative;width:min(100%,280px);aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:#111;contain:layout paint;}",
    ".vpm-inner{position:absolute;left:0;top:0;width:1080px;height:1920px;transform-origin:0 0;overflow:hidden;}",
    ".vpm-inner>video,.vpm-inner>img.vpm-poster{position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover;display:block;}",
    ".vpm-layer{position:absolute;left:0;top:0;width:1080px;height:1920px;pointer-events:none;}",
    ".vpm-layer .block{position:absolute;} .vpm-layer .grp{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;} .vpm-layer .grp.left{align-items:flex-start;}",
    ".vpm-big{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:transparent;border:0;cursor:pointer;padding:0;}",
    ".vpm-big span{width:62px;height:62px;border-radius:50%;background:rgba(10,10,10,.62);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 18px rgba(0,0,0,.3);}",
    ".vpm-big svg{width:26px;height:26px;margin-left:3px;} .vpm-screen.playing .vpm-big span{opacity:0;}",
    ".vpm-ctrl{display:flex;align-items:center;gap:8px;margin:10px 0 2px;} .vpm-ctrl input[type=range]{flex:1;min-width:0;accent-color:var(--vpm-fg);}",
    ".vpm-ib{width:36px;height:36px;flex:0 0 36px;border-radius:50%;border:1px solid var(--vpm-line);background:var(--vpm-bg);color:var(--vpm-fg);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;}",
    ".vpm-ib svg{width:17px;height:17px;} .vpm-ib[aria-pressed=true]{background:var(--vpm-fg);color:var(--vpm-bg);border-color:var(--vpm-fg);}",
    ".vpm-time{font:600 12px/1 var(--font-body,Inter,sans-serif);color:var(--vpm-muted);font-variant-numeric:tabular-nums;min-width:66px;text-align:right;}",
    ".vpm-chips{display:flex;gap:6px;overflow-x:auto;padding:6px 0 4px;scrollbar-width:none;} .vpm-chips::-webkit-scrollbar{display:none;}",
    ".vpm-chip{flex:0 0 auto;border:1px solid var(--vpm-line);background:var(--vpm-bg);color:var(--vpm-fg);border-radius:100px;padding:7px 11px;font:600 12.5px/1 var(--font-body,Inter,sans-serif);cursor:pointer;white-space:nowrap;}",
    ".vpm-chip.on{background:var(--vpm-fg);color:var(--vpm-bg);border-color:var(--vpm-fg);} .vpm-chip small{color:var(--vpm-muted);font-weight:700;margin-right:4px;} .vpm-chip.on small{color:inherit;opacity:.7;}",
    ".vpm-acts{display:flex;gap:8px;margin:8px 0 10px;} .vpm-pick{flex:1;height:42px;border-radius:100px;border:1px solid var(--vpm-fg);background:var(--vpm-bg);color:var(--vpm-fg);font:700 14px/1 var(--font-body,Inter,sans-serif);cursor:pointer;}",
    ".vpm-pick[aria-pressed=true]{background:var(--vpm-acc);color:var(--vpm-on-acc);border-color:var(--vpm-acc);} .vpm-heart{width:42px;height:42px;flex:0 0 42px;} .vpm-heart[aria-pressed=true]{color:#E0245E;background:var(--vpm-bg);border-color:#E0245E;}",
    ".vpm-cols{display:grid;grid-template-columns:1fr;gap:10px;} @media (min-width:520px){.vpm-cols{grid-template-columns:1fr 1fr;}}",
    ".vpm h4{margin:4px 0 6px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--vpm-muted);}",
    ".vpm ul.vpm-ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;} .vpm-ul li{font-size:13.5px;line-height:1.38;}",
    ".vpm-ul li b{font-weight:700;} .vpm-ul li span{display:block;color:var(--vpm-muted);font-size:12.5px;} .vpm-ul li i{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.06em;color:var(--vpm-muted);border:1px solid var(--vpm-line);border-radius:4px;padding:1px 4px;margin-left:5px;vertical-align:1px;}",
    ".vpm-ul li code{font:600 11px/1 ui-monospace,Menlo,monospace;color:var(--vpm-muted);margin-right:5px;}",
    ".vpm-jobs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px;} .vpm-job{font-size:12px;border-radius:100px;padding:5px 9px;background:var(--vpm-bg2);border:1px solid var(--vpm-line);} .vpm-job b{font-weight:800;} .vpm-job.strong{border-color:var(--vpm-fg);}",
    ".vpm-ex{display:flex;gap:8px;overflow-x:auto;padding:4px 0 6px;scrollbar-width:thin;} .vpm-ex figure{margin:0;flex:0 0 96px;} .vpm-ex img{width:96px;height:171px;object-fit:cover;border-radius:8px;display:block;background:#16284a;}",
    ".vpm-ex figcaption{font-size:11px;line-height:1.3;color:var(--vpm-muted);margin-top:4px;}",
    ".vpm details{margin-top:8px;border-top:1px solid var(--vpm-line);padding-top:8px;} .vpm summary{cursor:pointer;font-weight:700;font-size:13.5px;}",
    ".vpm details p,.vpm details li{font-size:12.5px;line-height:1.45;} .vpm details ul{padding-left:18px;margin:6px 0;}",
    ".vpm-mo{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;} .vpm-mo td{border-top:1px solid var(--vpm-line);padding:5px 4px;vertical-align:top;} .vpm-mo td:first-child{font-weight:700;width:34%;}",
    ".vpm-hand{position:relative;height:30px;border-radius:8px;overflow:hidden;display:flex;margin:8px 0 2px;font:700 11.5px/30px var(--font-body,Inter,sans-serif);}",
    ".vpm-hand div{white-space:nowrap;overflow:hidden;padding:0 8px;} .vpm-hand .h{background:var(--vpm-fg);color:var(--vpm-bg);} .vpm-hand .s{background:var(--vpm-bg2);flex:1;}",
    ".vpm-hand .now{position:absolute;top:0;bottom:0;width:2px;background:var(--vpm-acc);left:0;}",
    ".vpm-note{font-size:12px;color:var(--vpm-muted);margin:4px 0 0;line-height:1.4;}",
    /* graphics (inside the 1080x1920 frame) */
    ".vpm-strip{position:relative;display:block;width:max-content;white-space:nowrap;text-transform:uppercase;line-height:1;}",
    ".vpm-stack{position:absolute;display:flex;flex-direction:column;align-items:flex-start;}",
    ".vpm-board{position:absolute;inset:0;}",
    ".vpm-abs{position:absolute;}"
  ].join("\n");
  function injectCss() { if (document.getElementById("vpm-css")) return; var s = el("style"); s.id = "vpm-css"; s.textContent = CSS; document.head.appendChild(s); }

  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.5a8 8 0 0 1 0 11"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>',
    heartOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>'
  };

  /* ================= board, clip, words ================= */
  function resolveContext(opts) {
    opts = opts || {};
    var root = opts.root != null ? opts.root : "";
    var pBoard = opts.board && typeof opts.board === "object" ? Promise.resolve(opts.board) : getJSON(root + (opts.board || "clients/vidpod/board.json"));
    var pCat = opts.catalogue && typeof opts.catalogue === "object" ? Promise.resolve(opts.catalogue) : getJSON(root + (opts.catalogue || "mograph.json"));
    return Promise.all([pBoard, pCat]).then(function (r) {
      var B = r[0], cat = r[1], clipId = opts.clip || (B.base && B.base.clip_id) || "seated";
      var c = opts.clip ? (B.clips || []).filter(function (x) { return x.id === clipId; })[0] : null;
      var base = c && c.base ? c.base : B.base;   // no clip asked for: the board's current base (the studio swaps B.base when the clip changes)
      if (opts.words && opts.words.length) base = Object.assign({}, base, { words: opts.words });
      return { B: B, base: base, cat: cat, clipId: base.clip_id || clipId, root: root, opts: opts, sk: skin(B) };
    });
  }

  /* ================= the skin: Ranch roles -> client brand (see mograph.json skin.roles) ================= */
  function skin(B) {
    var b = B.brand || {}, o = b.mograph || {}, f = b.font || {};
    var ink = b.ink || "#0A0A0A", light = b.light || b.cream || "#F5F5F2", accent = b.accent || "#00FFAA";
    var ground = o.ground || ink, mark = o.mark || accent, hot = o.hot || accent;
    return {
      ground: ground, ground2: o.ground2 || mix(ground, "#000000", 0.35), mid: o.mid || mix(ground, light, 0.16), grid: o.grid || light,
      strip: o.strip || light, stripInk: o.stripInk || ink,
      hot: hot, hotInk: o.hotInk || (isLight(hot) ? ink : light),
      inkstrip: o.inkstrip || ink, inkstripInk: o.inkstripInk || light,
      mark: mark, markInk: isLight(mark) ? ink : light,
      display: o.display || f.display || f.family || "Anton", displayW: o.displayW || f.w_display || 400,
      body: f.family || "Inter", bodyW: f.w_bold || 700,
      hand: o.hand || null,
      light: light, ink: ink, accent: accent,
      shadow: "10px 12px 0 rgba(0,0,0,.45)", shadowSm: "8px 10px 0 rgba(0,0,0,.4)"
    };
  }
  function boardBg(sk) {
    var dark = lum(sk.ground) < 0.02, g = rgba(sk.grid, dark ? 0.1 : 0.07), g2 = rgba(sk.grid, dark ? 0.05 : 0.035);   // a near-black ground needs a touch more grid to read as a board
    return "background-color:" + sk.ground + ";background-image:linear-gradient(" + g + " 1px,transparent 1px),linear-gradient(90deg," + g + " 1px,transparent 1px),linear-gradient(" + g2 + " 1px,transparent 1px),linear-gradient(90deg," + g2 + " 1px,transparent 1px);background-size:240px 240px,240px 240px,48px 48px,48px 48px;";
  }

  /* ================= Ranch helpers, 1:1 with gen_gfx.py / OPEN_dad (times in seconds on the clip) ================= */
  // a strip: heavy capitals in a flat box with the hard offset shadow; kind = light | hot | ink | mark
  function strip(sk, text, kind, o) {
    o = o || {};
    var size = o.size || 76, maxW = o.maxW || 940, T = String(text).toUpperCase();
    var w = textW(T, sk.displayW, size, sk.display) * 1.02 + size * 0.6;
    if (w > maxW) size = Math.floor(size * maxW / w);
    var bg = kind === "hot" ? sk.hot : kind === "ink" ? sk.inkstrip : kind === "mark" ? sk.mark : sk.strip;
    var fg = kind === "hot" ? sk.hotInk : kind === "ink" ? sk.inkstripInk : kind === "mark" ? sk.markInk : sk.stripInk;
    var d = el("div", "vpm-strip"); d.textContent = T;
    d.style.cssText += "font:" + sk.displayW + " " + size + "px/1 \"" + sk.display + "\",Anton,Impact,sans-serif;background:" + bg + ";color:" + fg + ";padding:" + Math.round(size * 0.17) + "px " + Math.round(size * 0.3) + "px " + Math.round(size * 0.12) + "px;box-shadow:" + (o.shadow || sk.shadow) + ";margin-bottom:" + (o.gap == null ? 14 : o.gap) + "px;" + (o.indent ? "margin-left:" + o.indent + "px;" : "");
    if (kind === "ink") d.style.outline = Math.max(3, Math.round(size * 0.06)) + "px solid " + sk.strip;
    if (o.rot) d.style.transform = "rotate(" + o.rot + "deg)";
    return d;
  }
  function stack(parent, x, y) { var s = el("div", "vpm-stack"); s.style.left = x + "px"; s.style.top = y + "px"; parent.appendChild(s); return s; }
  function moves(tl) {
    function hide(n) { gsap.set(n, { autoAlpha: 0 }); }
    return {
      slide: function (n, t) { hide(n); tl.fromTo(n, { autoAlpha: 0, x: -140 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, t); },
      line: function (n, t) { hide(n); tl.fromTo(n, { autoAlpha: 0, x: -90 }, { autoAlpha: 1, x: 0, duration: 0.22, ease: "power3.out", immediateRender: false }, t); },
      slam: function (n, t, rot, s) { hide(n); tl.fromTo(n, { autoAlpha: 0, scale: s || 2.0, rotation: rot || 0 }, { autoAlpha: 1, scale: 1, rotation: rot || 0, duration: 0.18, ease: "power4.in", immediateRender: false }, t); },
      pop: function (n, t, rot) { hide(n); tl.fromTo(n, { autoAlpha: 0, scale: 0.55, rotation: (rot || 0) - 4 }, { autoAlpha: 1, scale: 1, rotation: rot || 0, duration: 0.22, ease: "back.out(2)", immediateRender: false }, t); },
      out: function (n, t) { tl.to(n, { autoAlpha: 0, y: 40, duration: 0.2, ease: "power2.in" }, t); },
      drop: function (nodes, t) { nodes.forEach(function (n, k) { tl.to(n, { y: 1900, rotation: k % 2 ? 14 : -12, duration: 0.5, ease: "power2.in" }, t + k * 0.05); }); }
    };
  }
  function W(ctx, i) { return ctx.base.words[i] || { t: 0, end: 0, text: "" }; }
  function wtext(ctx, a, b) { var out = []; for (var i = a; i <= b; i++) out.push(W(ctx, i).text); return out.join(" "); }
  function findWord(ctx, token, from) { var n = norm(token); for (var i = from || 0; i < ctx.base.words.length; i++) if (norm(ctx.base.words[i].text) === n || (n.length > 3 && norm(ctx.base.words[i].text).indexOf(n) === 0)) return i; return -1; }
  // the soft flash on cuts between footage and graphics (Tommy kept it: "I really like that flash")
  function flash(ctx, tl, t) {
    var f = el("div", "vpm-abs"); f.style.cssText = "inset:0;background:" + mix(ctx.sk.light, "#FFFFFF", 0.5) + ";opacity:0;"; ctx.stage.over.appendChild(f);
    tl.fromTo(f, { opacity: 0 }, { opacity: 0.38, duration: 0.12, ease: "power2.in", immediateRender: false }, t - 0.12);
    tl.to(f, { opacity: 0, duration: 0.4, ease: "power2.out" }, t);
  }

  /* ================= renderers: each returns { tls: [paused timelines on clip time], teardown? } ================= */
  var R = {};

  /* ---------- MG-01 Box style ---------- */
  // The seated VIDPOD clip has a hand-set script (word indices) in mograph.json styles[box].demo.scripts[clip];
  // any other clip gets the generic script: sentences as strip stacks, the hot line on the emphasised word, the last sentence as a payoff.
  function boxScript(ctx) {
    var d = ctx.style.demo || {}, s = d.scripts && d.scripts[ctx.clipId];
    if (s) return s;
    var ws = ctx.base.words, emph = ctx.base.emphasis || [], sents = [], cur = [];
    ws.forEach(function (w, i) { cur.push(i); if (/[.!?]$/.test(w.text)) { sents.push(cur); cur = []; } });
    if (cur.length) sents.push(cur);
    var out = [];
    sents.forEach(function (idx, k) {
      var last = k === sents.length - 1 && sents.length > 1;
      if (last) { var tail = idx.slice(-3); out.push({ piece: "stacked-payoff", words: tail }); return; }
      var lines = [], ln = [];
      idx.forEach(function (i) { ln.push(i); if (ln.length >= 3 || wtext(ctx, ln[0], i).length >= 13) { lines.push(ln); ln = []; } });
      if (ln.length) lines.push(ln);
      lines = lines.slice(-3).map(function (l) { var hot = l.some(function (i) { return emph.indexOf(i) >= 0; }); return [l[0], l[l.length - 1], hot ? "hot" : "light"]; });
      if (!lines.some(function (l) { return l[2] === "hot"; })) lines[lines.length - 1][2] = "hot";
      out.push({ piece: "strip-stack", lines: lines });
    });
    return out;
  }
  R["box-style"] = function (ctx) {
    var tl = gsap.timeline({ paused: true }), M = moves(tl), sk = ctx.sk, over = ctx.stage.over, script = boxScript(ctx), words = ctx.base.words;
    var endOf = function (k) { var nxt = script[k + 1]; return nxt ? W(ctx, firstIdx(nxt)).t - 0.35 : ctx.seg[1] - 0.3; };
    function firstIdx(p) { return p.lines ? p.lines[0][0] : p.tag ? p.tag[0] : p.words ? p.words[0] : 0; }
    function lastIdx(p) { if (p.lines) return p.lines[p.lines.length - 1][1]; if (p.strips) return p.strips[p.strips.length - 1][1]; if (p.words) return p.words[p.words.length - 1]; return p.tag ? p.tag[p.tag.length - 1] : 0; }
    function leave(p, k) { return p.out != null ? p.out : Math.min(endOf(k), W(ctx, lastIdx(p)).end + 0.6); }
    script.forEach(function (p, k) {
      if (p.piece === "strip-stack") {           // MG-01.1: lines slide in on their words, the hot line slams; stack drops away together
        var st = stack(over, 60, p.y || 1110), nodes = [];
        p.lines.forEach(function (L) {
          var n = strip(sk, wtext(ctx, L[0], L[1]), L[2] || "light", { size: 76 }); st.appendChild(n); nodes.push(n);
          var t = W(ctx, L[0]).t;
          if (L[2] === "hot") { n.style.transform = "rotate(-2deg)"; M.slam(n, t - 0.18, -2); } else M.slide(n, t - 0.06);
        });
        M.drop(nodes.slice().reverse(), leave(p, k));
      } else if (p.piece === "small-tag") {      // MG-01.2: a small tag stamps on beside a strip that slides in
        var st2 = stack(over, 60, p.y || 1150), tg = strip(sk, wtext(ctx, p.tag[0], p.tag[p.tag.length - 1]), "mark", { size: 58, rot: -3, shadow: sk.shadowSm });
        st2.appendChild(tg); M.slam(tg, W(ctx, p.tag[0]).t - 0.18, -3, 2.0);
        var s2 = [];
        (p.strips || []).forEach(function (L) { var n = strip(sk, wtext(ctx, L[0], L[1]), L[2] || "light", { size: 76 }); st2.appendChild(n); s2.push(n); M.slide(n, W(ctx, L[0]).t - 0.06); });
        [tg].concat(s2).forEach(function (n) { M.out(n, leave(p, k)); });
      } else if (p.piece === "cutout-freeze") {  // MG-01.3: OPEN_dad on the client's clip
        var F = p.at, A = ctx.style.demo.assets || {}, fz = el("div", "vpm-abs");
        fz.style.cssText = "inset:0;visibility:hidden;" + boardBg(sk); over.appendChild(fz);
        var still = el("img", "vpm-abs"); still.alt = ""; still.src = ctx.root + A.freeze; still.style.cssText = "left:0;top:0;width:1080px;height:1920px;object-fit:cover;";
        var dc = el("div", "vpm-abs"); dc.style.cssText = "left:0;top:0;width:1080px;height:1920px;transform-origin:50% 60%;";
        var sh = el("img", "vpm-abs"); sh.alt = ""; sh.src = ctx.root + A.cutout; sh.style.cssText = "left:46px;top:52px;width:1080px;height:1920px;filter:brightness(0);opacity:0;";
        var cut = el("img", "vpm-abs"); cut.alt = ""; cut.src = ctx.root + A.cutout; cut.style.cssText = "left:0;top:0;width:1080px;height:1920px;";
        dc.appendChild(sh); dc.appendChild(cut); fz.appendChild(dc); fz.appendChild(still);
        tl.set(fz, { visibility: "visible" }, F);
        tl.fromTo(still, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power2.out", immediateRender: false }, F + 0.04);
        tl.fromTo(sh, { opacity: 0 }, { opacity: 0.6, duration: 0.3, immediateRender: false }, F + 0.04);
        tl.fromTo(dc, { scale: 1 }, { scale: 1.08, duration: 0.3, ease: "back.out(1.8)", immediateRender: false }, F + 0.04);
        var step = p.step != null ? W(ctx, p.step).t - 0.1 : F + 0.5;
        tl.to(dc, { scale: 0.68, x: 235, y: 400, duration: 0.45, ease: "power3.inOut" }, step);
        var st3 = stack(fz, 60, 262), n3 = [];
        p.lines.forEach(function (L) {
          var n = strip(sk, wtext(ctx, L[0], L[1]).replace(/[,]$/, ""), L[2] || "light", { size: L[2] === "hot" ? 120 : 72 }); st3.appendChild(n); n3.push(n);
          var t = W(ctx, L[0]).t;
          if (L[2] === "hot") { n.style.transform = "rotate(-3deg)"; M.slam(n, t - 0.18, -3, 2.2); } else M.slide(n, t - 0.06);
        });
        var dropT = p.drop != null ? p.drop : (p.cut != null ? p.cut - 0.6 : leave(p, k));
        M.drop(n3.slice().reverse(), dropT);
        tl.to(dc, { y: 2300, duration: 0.45, ease: "power2.in" }, dropT + 0.12);
        var cutT = p.cut != null ? p.cut : dropT + 0.6;
        tl.set(fz, { visibility: "hidden" }, cutT); flash(ctx, tl, cutT);
      } else if (p.piece === "stamp-tag") {      // MG-01.5: one word slams on in the mark colour
        var st4 = stack(over, 60, p.y || 1200), sn = strip(sk, wtext(ctx, p.words[0], p.words[p.words.length - 1]), "mark", { size: 110, rot: -5 });
        st4.appendChild(sn); M.slam(sn, W(ctx, p.words[0]).t - 0.18, -5, 2.4); M.out(sn, leave(p, k));
      } else if (p.piece === "stacked-payoff") { // MG-01.6: three boxes slam, -3 / +2 / -2 deg
        var st5 = stack(over, 60, p.y || 1060), n5 = [], rots = [-3, 2, -2], kinds = ["light", "light", "hot"];
        p.words.forEach(function (i, j) {
          var n = strip(sk, W(ctx, i).text, kinds[j] || "light", { size: 118, rot: rots[j % 3], gap: 16 }); st5.appendChild(n); n5.push(n);
          M.slam(n, W(ctx, i).t - 0.18, rots[j % 3], 2.2);
        });
        M.drop(n5.slice().reverse(), p.out != null ? p.out : ctx.seg[1] - 0.6);
      }
    });
    return { tls: [tl] };
  };

  /* ---------- camera as a pure function of time (engine.py / template.tpl) ---------- */
  function camera(keys, start) {
    var segs = [], s = start;
    keys.forEach(function (k) { var e = ease(k.e || "power2.inOut"); segs.push({ t: k.t, d: Math.max(0.001, k.d), a: s, b: { cx: k.cx == null ? s.cx : k.cx, cy: k.cy == null ? s.cy : k.cy, z: k.z == null ? s.z : k.z, r: k.r == null ? s.r : k.r }, e: e }); s = segs[segs.length - 1].b; });
    return function (t) {
      var c = start;
      for (var i = 0; i < segs.length; i++) {
        var g = segs[i]; if (t < g.t) break;
        var p = g.e(clamp((t - g.t) / g.d, 0, 1));
        c = { cx: g.a.cx + (g.b.cx - g.a.cx) * p, cy: g.a.cy + (g.b.cy - g.a.cy) * p, z: g.a.z + (g.b.z - g.a.z) * p, r: g.a.r + (g.b.r - g.a.r) * p };
      }
      return c;
    };
  }
  function drive(tl, seg, fn) { var o = { t: seg[0] }; tl.fromTo(o, { t: seg[0] }, { t: seg[1], duration: seg[1] - seg[0], ease: "none", immediateRender: true, onUpdate: function () { fn(o.t); } }, seg[0]); fn(seg[0]); }
  function tape(sk, css) { var t = el("i", "vpm-abs"); t.style.cssText = "width:230px;height:70px;background:" + rgba(sk.mark, 0.82) + ";transform:rotate(-38deg);" + css; return t; }

  /* ---------- MG-02 The board ---------- */
  R["board"] = function (ctx) {
    var tl = gsap.timeline({ paused: true }), M = moves(tl), sk = ctx.sk, base = ctx.base, X = base.words_extra || {}, cuts = base.cuts || [];
    var stage = ctx.stage, world = el("div", "vpm-abs");
    world.style.cssText = "left:0;top:0;width:5200px;height:5200px;transform-origin:0 0;";
    var pad = el("div", "vpm-abs"); pad.style.cssText = "left:-3120px;top:-3120px;width:11520px;height:11520px;" + boardBg(sk); world.appendChild(pad);   // the board runs far past every edge, so no camera view shows an edge
    stage.backdrop.appendChild(world);
    var ST = { foot: [900, 1300, -1.5], note: [2350, 1300, 1.5] };
    // footage as a taped photo: the live clip moves into the station
    var ph = el("div", "vpm-abs"); ph.style.cssText = "left:" + (ST.foot[0] - 540) + "px;top:" + (ST.foot[1] - 960) + "px;width:1080px;height:1920px;transform:rotate(" + ST.foot[2] + "deg);background:#111;outline:36px solid " + sk.light + ";box-shadow:0 0 0 37px rgba(0,0,0,.25),30px 50px 90px 30px rgba(0,0,0,.55);";
    world.appendChild(ph); stage.adopt(ph);
    ph.appendChild(tape(sk, "left:-150px;top:-96px;")); ph.appendChild(tape(sk, "right:-150px;bottom:-96px;"));
    // note paper: lined, pinned, lines write on as said
    var nw = 880, nh = 1180, paper = el("div", "vpm-abs");
    paper.style.cssText = "left:" + (ST.note[0] - nw / 2) + "px;top:" + (ST.note[1] - nh / 2) + "px;width:" + nw + "px;height:" + nh + "px;transform:rotate(" + ST.note[2] + "deg);background-color:" + mix(sk.light, "#FFFFFF", 0.4) + ";background-image:linear-gradient(90deg,transparent 108px," + rgba(sk.hot, 0.55) + " 108px," + rgba(sk.hot, 0.55) + " 112px,transparent 112px),repeating-linear-gradient(180deg,transparent 0 98px," + rgba(sk.ink, 0.12) + " 98px 100px);background-position:0 0,0 230px;box-shadow:14px 22px 26px rgba(0,0,0,.5);";
    world.appendChild(paper); paper.appendChild(tape(sk, "left:" + (nw / 2 - 115) + "px;top:-30px;transform:rotate(-3deg);"));
    var heading = strip(sk, (X.section && X.section.title) || "Notes", "hot", { size: 84, rot: -2 }); heading.style.position = "absolute"; heading.style.left = "84px"; heading.style.top = "70px"; paper.appendChild(heading);
    var notes = (X.list || []).slice(0, 3), noteEls = [];
    var fsz = Math.min.apply(null, [62].concat(notes.map(function (txt) { return Math.floor(62 * (nw - 190) / Math.max(1, textW(txt, sk.bodyW, 62, sk.hand || sk.body) * 1.08)); })));   // one size for every line
    notes.forEach(function (txt, k) {
      var ln = el("div", "vpm-abs"); ln.style.cssText = "left:140px;top:" + (290 + k * 200) + "px;white-space:nowrap;font:italic " + sk.bodyW + " " + fsz + "px/1.15 \"" + (sk.hand || sk.body) + "\",sans-serif;color:" + sk.stripInk + ";clip-path:inset(0 100% 0 0);";
      ln.textContent = txt; paper.appendChild(ln); noteEls.push(ln);
    });
    // anchors: the first emphasised word that belongs to each note line (fallback: spread across the clip)
    var used = -1, anchors = notes.map(function (txt, k) {
      var toks = txt.split(/\s+/).map(norm), emph = base.emphasis || [];
      for (var e = 0; e < emph.length; e++) if (emph[e] > used && toks.indexOf(norm(W(ctx, emph[e]).text)) >= 0) { used = emph[e]; return W(ctx, emph[e]).t; }
      return ctx.seg[0] + (k + 1) * (ctx.seg[1] - ctx.seg[0]) / (notes.length + 1);
    });
    // a highlighter over the emphasised word of the middle line (mark colour, multiply)
    var hlWord = null;
    if (noteEls[1]) {
      var t1 = notes[1].split(/\s+/), hi = -1; (base.emphasis || []).forEach(function (e) { var j = t1.map(norm).indexOf(norm(W(ctx, e).text)); if (j >= 0 && hi < 0) hi = j; });
      if (hi >= 0) { noteEls[1].innerHTML = t1.map(function (w, j) { return j === hi ? '<span style="position:relative;display:inline-block"><b style="position:absolute;left:-6px;right:-6px;top:12%;bottom:6%;background:' + rgba(sk.mark, 0.62) + ';mix-blend-mode:multiply;transform-origin:0 50%;transform:scaleX(0);display:block" class="vpm-hl"></b>' + esc(w) + "</span>" : esc(w); }).join(" "); hlWord = noteEls[1].querySelector(".vpm-hl"); }
    }
    // pinned photos (the clip's own stills from board.json base.photos), below the note
    var photos = (base.photos || []).slice(0, 2), phEls = [];
    photos.forEach(function (p, k) {
      var f = el("div", "vpm-abs"); f.style.cssText = "left:" + (ST.note[0] - 420 + k * 470) + "px;top:2020px;width:360px;height:640px;background:#111 url(\"" + ctx.root + p.src + "\") center/cover;outline:22px solid " + sk.light + ";box-shadow:16px 26px 40px rgba(0,0,0,.55);";
      var pin = el("i", "vpm-abs"); pin.style.cssText = "left:160px;top:-30px;width:44px;height:44px;border-radius:50%;background:" + sk.hot + ";box-shadow:0 6px 10px rgba(0,0,0,.5);"; f.appendChild(pin);
      world.appendChild(f); phEls.push(f);
    });
    // camera plan: footage z 1.0, graphics z 0.84, moves 0.6 s power2.inOut, hold drift +0.035, travel centred on a clip cut when one is near
    var foot = { cx: ST.foot[0], cy: ST.foot[1], r: -ST.foot[2] }, note = { cx: ST.note[0], cy: ST.note[1] + 40, r: -ST.note[2] };
    var keys = [{ t: ctx.seg[0], d: 0.7, z: 1.0, e: "power2.out" }], WRITE = 0.95, MOVE = 0.6, at = ctx.seg[0] + 0.7;
    function hold(t1, z) { if (t1 - at > 0.05) keys.push({ t: at, d: t1 - at, z: z, e: "none" }); }
    anchors.forEach(function (a, k) {
      var arrive = Math.max(at + 0.4, a - 0.45);
      hold(arrive - MOVE, 1.03); keys.push(Object.assign({ t: arrive - MOVE, d: MOVE, z: 0.84, e: "power2.inOut" }, note)); at = arrive;
      if (k < anchors.length - 1) {
        var lv = a + WRITE + 0.45, near = cuts.filter(function (c) { return c > a + WRITE && c < a + WRITE + 1.4; })[0];
        if (near != null) lv = near - MOVE / 2;
        hold(lv, 0.875); keys.push(Object.assign({ t: lv, d: MOVE, z: 1.0, e: "power2.inOut" }, foot)); at = lv + MOVE;
      }
    });
    var pull = Math.min(ctx.seg[1] - 1.05, (anchors[anchors.length - 1] || ctx.seg[0]) + WRITE + 0.3);
    hold(pull, 0.875); keys.push({ t: pull, d: 1.0, cx: (ST.foot[0] + ST.note[0]) / 2, cy: 1700, z: 0.42, r: 0, e: "power2.inOut" });
    var cam = camera(keys, { cx: foot.cx, cy: foot.cy, z: 1.1, r: foot.r });
    drive(tl, ctx.seg, function (t) { var c = cam(t); world.style.transform = "translate(540px,960px) rotate(" + c.r.toFixed(3) + "deg) scale(" + c.z.toFixed(4) + ") translate(" + (-c.cx).toFixed(1) + "px," + (-c.cy).toFixed(1) + "px)"; });
    // things arrive on their words, then stay put
    M.slam(heading, anchors[0] - 0.3, -2, 2.0);
    noteEls.forEach(function (n, k) { tl.fromTo(n, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: WRITE, ease: "none", immediateRender: false }, anchors[k]); });
    if (hlWord) tl.fromTo(hlWord, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.inOut", immediateRender: false }, anchors[1] + WRITE + 0.05);
    phEls.forEach(function (f, k) { gsap.set(f, { autoAlpha: 0 }); tl.fromTo(f, { autoAlpha: 0, scale: 1.7, rotation: k ? -8 : 8 }, { autoAlpha: 1, scale: 1, rotation: k ? 3 : -4, duration: 0.2, ease: "power4.in", immediateRender: false }, anchors[anchors.length - 1] + 0.35 + k * 0.3); });
    return { tls: [tl] };
  };

  /* ---------- MG-03 Map moment ---------- */
  R["map-moment"] = function (ctx) {
    var tl = gsap.timeline({ paused: true }), M = moves(tl), sk = ctx.sk, over = ctx.stage.over, base = ctx.base, X = base.words_extra || {};
    // a clip with no base.words_extra.place gets an honest placeholder
    var place = X.place || { name: "Your place", sub: "Real map here" }, toks = place.name.split(/\s+/).filter(function (w) { return !/^(the|a|an)$/i.test(w); });
    var ai = findWord(ctx, toks[0] || place.name), anchor = ai >= 0 ? W(ctx, ai).t : (ctx.seg[0] + ctx.seg[1]) / 2;
    var tIn = Math.max(ctx.seg[0] + 0.2, anchor - 1.4), tOut = anchor + 1.6;
    var bd = el("div", "vpm-abs"); bd.style.cssText = "inset:0;opacity:0;" + boardBg(sk); over.appendChild(bd);
    // the map card (placeholder drawing in real-map tones; a real map image replaces the svg: see mograph.json needs)
    var wrap = el("div", "vpm-abs"); wrap.style.cssText = "left:90px;top:330px;width:900px;height:1180px;transform-origin:50% 50%;"; over.appendChild(wrap);
    var card = el("div", "vpm-abs"); card.style.cssText = "inset:0;outline:30px solid " + sk.light + ";box-shadow:0 0 0 31px rgba(0,0,0,.2),30px 50px 90px 20px rgba(0,0,0,.55);transform:rotate(-1.2deg);overflow:visible;background:#ECE9E1;";
    wrap.appendChild(card);
    var river = "M905,120 C820,170 780,120 720,190 C660,260 740,330 650,380 C560,430 520,360 470,450 C430,520 520,580 470,650 C430,710 360,700 330,780 C300,860 360,900 300,980";
    card.innerHTML = '<svg width="900" height="1180" viewBox="0 0 900 1180" style="position:absolute;left:0;top:0;display:block">' +
      '<rect width="900" height="1180" fill="#ECE9E1"/>' +
      '<g stroke="#FFFFFF" stroke-width="16" fill="none" opacity=".95">' + [140, 300, 460, 620, 780].map(function (y) { return '<path d="M0 ' + y + ' L900 ' + (y + 40) + '"/>'; }).join("") + [120, 330, 560, 760].map(function (x) { return '<path d="M' + x + ' 0 L' + (x - 60) + ' 1180"/>'; }).join("") + '</g>' +
      '<g stroke="#D8D2C4" stroke-width="3" fill="none">' + [140, 300, 460, 620, 780].map(function (y) { return '<path d="M0 ' + (y + 9) + ' L900 ' + (y + 49) + '"/>'; }).join("") + '</g>' +
      '<path d="M560 150 C640 140 700 230 640 300 C590 350 520 300 520 240 C520 190 530 155 560 150Z" fill="#CFE0C3"/><path d="M120 520 C200 500 260 560 230 620 C200 670 120 660 100 610 C90 570 90 530 120 520Z" fill="#CFE0C3"/>' +
      '<path d="M0 960 C120 930 220 1010 330 990 C470 960 560 1040 700 1020 C800 1005 860 1040 900 1060 L900 1180 L0 1180Z" fill="#A9C4D3"/>' +
      '<path d="' + river + '" stroke="#A9C4D3" stroke-width="26" fill="none" stroke-linecap="round"/>' +
      '<path id="vpm-route" d="' + river + '" stroke="' + sk.hot + '" stroke-width="20" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + river + '" stroke="' + rgba(sk.ink, 0.28) + '" stroke-width="8" fill="none" stroke-dasharray="4 22" stroke-linecap="round"/>' +
      '</svg>';
    var route = card.querySelector("#vpm-route"), RL = 1500; try { RL = route.getTotalLength(); } catch (e) {}
    route.style.strokeDasharray = RL; route.style.strokeDashoffset = RL;
    card.appendChild(tape(sk, "left:-120px;top:-70px;")); card.appendChild(tape(sk, "right:-120px;bottom:-70px;"));
    var pinP = { x: 470, y: 650 }; try { var pp = route.getPointAtLength(RL * 0.66); pinP = { x: pp.x, y: pp.y }; } catch (e) {}
    var pin = el("i", "vpm-abs"); pin.style.cssText = "left:" + (pinP.x - 36) + "px;top:" + (pinP.y - 36) + "px;width:72px;height:72px;border-radius:50%;background:" + sk.hot + ";border:12px solid #fff;box-shadow:0 6px 12px rgba(0,0,0,.5);"; card.appendChild(pin);
    var lab = stack(card, Math.min(pinP.x + 30, 330), pinP.y + 70);
    var l1 = strip(sk, place.name, "hot", { size: 74, rot: -2, maxW: 560 }); lab.appendChild(l1);
    var l2 = place.sub ? strip(sk, place.sub, "light", { size: 46, shadow: sk.shadowSm }) : null; if (l2) lab.appendChild(l2);
    // in: board up behind, map rises; route draws to the pin as the place is said; pin pops, label slams; lean in; drop away
    tl.fromTo(bd, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, tIn);
    gsap.set(wrap, { y: 1950 }); tl.fromTo(wrap, { y: 1950 }, { y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }, tIn);
    var o = { p: 0 }; tl.fromTo(o, { p: 0 }, { p: 0.66, duration: Math.max(0.4, anchor - tIn - 0.55), ease: "power1.inOut", immediateRender: false, onUpdate: function () { route.style.strokeDashoffset = RL * (1 - o.p); } }, tIn + 0.5);
    tl.to(o, { p: 1, duration: 0.9, ease: "power1.out", onUpdate: function () { route.style.strokeDashoffset = RL * (1 - o.p); } }, anchor + 0.05);
    gsap.set(pin, { autoAlpha: 0 }); tl.fromTo(pin, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.28, ease: "back.out(2.4)", immediateRender: false }, anchor - 0.1);
    M.slam(l1, anchor - 0.18, -2, 2.4); if (l2) M.slide(l2, anchor + 0.3);
    tl.fromTo(wrap, { scale: 1 }, { scale: 1.12, transformOrigin: (90 + pinP.x) / 1080 * 100 + "% " + (330 + pinP.y) / 1920 * 100 + "%", duration: 2.2, ease: "power2.inOut", immediateRender: false }, tIn + 0.5);
    tl.to(wrap, { y: 1900, rotation: -8, duration: 0.45, ease: "power2.in" }, tOut);
    tl.to(bd, { opacity: 0, duration: 0.25, ease: "power2.in" }, tOut + 0.3);
    flash(ctx, tl, tOut + 0.55);
    return { tls: [tl], seg: [Math.max(0, tIn - 0.4), Math.min(base.duration || tOut + 1.2, tOut + 1.2)] };
  };

  /* ---------- MG-04 The world (own loop clock, no footage) ---------- */
  R["world"] = function (ctx) {
    var tl = gsap.timeline({ paused: true }), sk = ctx.sk, B = ctx.B, L = (ctx.style.demo && ctx.style.demo.loop) || 6;
    var name = ((B.brand.mograph && B.brand.mograph.world_name) || B.client.name || "Studio").toUpperCase();
    var g = sk.ground, far = mix(g, sk.light, 0.22), near = mix(g, sk.light, 0.12), h1 = mix(g, sk.light, 0.09), h2 = mix(g, sk.light, 0.06), h3 = mix(g, sk.light, 0.035);
    var bg = el("div", "vpm-abs"); bg.style.cssText = "inset:0;" + boardBg(sk); ctx.stage.backdrop.appendChild(bg);
    var scene = el("div", "vpm-abs"); scene.style.cssText = "inset:0;"; ctx.stage.backdrop.appendChild(scene);
    var fs = Math.round(250 * Math.min(1, 4 / Math.max(4, name.length)));
    scene.innerHTML = '<svg width="1080" height="1920" viewBox="0 0 1080 1920" style="position:absolute;inset:0">' +
      '<defs><mask id="vpm-cut"><rect x="150" y="560" width="780" height="360" fill="#fff"/><text x="540" y="' + (740 + fs * 0.36) + '" text-anchor="middle" font-family="' + esc(sk.display) + ',Anton,sans-serif" font-weight="' + sk.displayW + '" font-size="' + fs + '" fill="#000" letter-spacing="2">' + esc(name) + '</text></mask>' +
      '<radialGradient id="vpm-glow"><stop offset="0" stop-color="' + sk.mark + '" stop-opacity=".35"/><stop offset="1" stop-color="' + sk.mark + '" stop-opacity="0"/></radialGradient></defs>' +
      '<g id="vpm-sun"><circle cx="540" cy="760" r="520" fill="url(#vpm-glow)"/><circle cx="540" cy="760" r="330" fill="none" stroke="' + rgba(sk.light, 0.08) + '" stroke-width="40"/><circle cx="540" cy="760" r="280" fill="none" stroke="' + rgba(sk.light, 0.1) + '" stroke-width="22"/><circle id="vpm-disc" cx="540" cy="760" r="230" fill="' + sk.mark + '"/></g>' +
      '<g id="vpm-far"><path d="M0 1180 L170 930 L300 1060 L470 820 L610 1010 L760 860 L900 1020 L1080 900 L1080 1920 L0 1920Z" fill="' + far + '"/><path d="M470 820 L520 890 L495 880 L470 905 L445 880 L420 890Z M760 860 L800 915 L780 908 L760 925 L740 908 L720 915Z" fill="' + rgba(sk.light, 0.85) + '"/></g>' +
      '<g id="vpm-mid"><path d="M0 1290 L210 1080 L380 1220 L560 1040 L760 1230 L930 1100 L1080 1200 L1080 1920 L0 1920Z" fill="' + near + '"/><path d="M560 1040 L610 1095 L585 1088 L560 1110 L535 1088 L510 1095Z" fill="' + rgba(sk.light, 0.85) + '"/></g>' +
      '<g id="vpm-gate"><rect x="208" y="470" width="22" height="760" fill="' + mix(g, sk.light, 0.3) + '"/><rect x="850" y="470" width="22" height="760" fill="' + mix(g, sk.light, 0.3) + '"/><rect x="190" y="455" width="700" height="26" fill="' + mix(g, sk.light, 0.3) + '"/>' +
      '<g id="vpm-sign"><path d="M330 481 L330 560 M750 481 L750 560" stroke="' + mix(g, sk.light, 0.4) + '" stroke-width="6"/><rect x="150" y="560" width="780" height="360" rx="10" fill="' + mix(g, "#000000", 0.25) + '" stroke="' + rgba(sk.light, 0.22) + '" stroke-width="6" mask="url(#vpm-cut)"/></g></g>' +
      '<g id="vpm-front"><path d="M0 1380 C200 1330 380 1400 540 1360 C720 1320 900 1390 1080 1350 L1080 1920 L0 1920Z" fill="' + h1 + '"/><path d="M0 1380 C200 1330 380 1400 540 1360 C720 1320 900 1390 1080 1350" stroke="' + rgba(sk.light, 0.12) + '" stroke-width="3" fill="none"/>' +
      '<path d="M0 1520 C240 1470 420 1550 600 1500 C780 1455 930 1520 1080 1490 L1080 1920 L0 1920Z" fill="' + h2 + '"/><path d="M0 1680 C260 1620 460 1700 640 1650 C820 1610 960 1670 1080 1640 L1080 1920 L0 1920Z" fill="' + h3 + '"/>' +
      '<path d="M510 1365 L570 1365 L700 1920 L380 1920Z" fill="' + mix(g, sk.light, 0.14) + '"/><path d="M540 1380 L540 1920" stroke="' + rgba(sk.light, 0.35) + '" stroke-width="6" stroke-dasharray="40 50"/></g></svg>';
    var $ = function (s) { return scene.querySelector(s); };
    // cloud roll-in: soft ground-colour blobs from both sides, then the scene fades up through them
    var mist = el("div", "vpm-abs"); mist.style.cssText = "inset:0;"; ctx.stage.over.appendChild(mist);
    [[-200, 300, 0], [600, 520, 0.08], [-260, 1100, 0.14], [640, 1350, 0.05], [120, 1650, 0.18], [500, 80, 0.12]].forEach(function (b) {
      var i = el("i", "vpm-abs"); i.style.cssText = "left:" + b[0] + "px;top:" + b[1] + "px;width:760px;height:620px;border-radius:50%;background:radial-gradient(closest-side," + sk.ground + " 55%," + rgba(sk.ground, 0) + ");";
      mist.appendChild(i); var fromLeft = b[0] + 380 < 540;
      tl.fromTo(i, { x: fromLeft ? -260 : 260, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power2.out", immediateRender: true }, b[2]);
      tl.to(i, { opacity: 0, x: fromLeft ? -200 : 200, duration: 0.8, ease: "power1.inOut" }, 0.7 + b[2]);
    });
    tl.fromTo(scene, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: "power1.inOut", immediateRender: true }, 0.42);
    var O = "540px 1230px";
    [["#vpm-far", 1.04], ["#vpm-mid", 1.1], ["#vpm-front", 1.2]].forEach(function (a) { tl.fromTo($(a[0]), { scale: 1, transformOrigin: O }, { scale: a[1], transformOrigin: O, duration: L - 1.4, ease: "none", immediateRender: true }, 0); });
    tl.fromTo($("#vpm-gate"), { scale: 1, transformOrigin: "540px 1230px" }, { scale: 1.12, transformOrigin: "540px 1230px", duration: L - 1.4, ease: "none", immediateRender: true }, 0);
    tl.fromTo($("#vpm-sun"), { y: 420 }, { y: 0, duration: L - 1.6, ease: "power2.out", immediateRender: true }, 0);
    tl.fromTo($("#vpm-disc"), { scale: 1, svgOrigin: "540 760" }, { scale: 1.04, svgOrigin: "540 760", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 3, immediateRender: true }, 0.8);
    tl.fromTo($("#vpm-sign"), { rotation: -2.4, svgOrigin: "540 481" }, { rotation: 2.4, svgOrigin: "540 481", duration: 1.15, ease: "sine.inOut", yoyo: true, repeat: 4, immediateRender: true }, 0);
    tl.to(scene, { autoAlpha: 0, duration: 0.4, ease: "power1.in" }, L - 0.45);
    tl.to({}, { duration: 0.01 }, L - 0.01);
    return { tls: [tl], loop: L };
  };

  /* ---------- OPEN-01 Opener into subtitles ---------- */
  // studio looks run here through their own renderer set: window.VPLooks(K) with this small K (same shape as studio-core's)
  function looksFor(ctx) {
    if (typeof window.VPLooks !== "function") return null;
    var B = ctx.Bx, CASE = "spoken";
    function caseText(str, c) {
      var out = c === "upper" ? str.toUpperCase() : (c === "lower" || c === "sentence") ? str.toLowerCase() : str;
      (B.base.protect_case || []).forEach(function (tok) { out = out.replace(new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), tok); });
      return out;
    }
    function Wd(i) { return B.base.words[i]; }
    var K = {
      el: el, esc: esc, W: Wd, textW: textW, isLight: isLight, caseText: caseText,
      wt: function (i) { return caseText(String(Wd(i).text).replace(/[,.!?]$/, ""), CASE); },
      swatch: function (id) { if (/^#[0-9a-f]{6}$/i.test(String(id))) return { id: id, label: id, hex: id }; return (B.brand.swatches || []).filter(function (s) { return s.id === id; })[0] || (B.brand.swatches || [{ id: "white", hex: "#FFFFFF" }])[0]; },
      getCase: function () { return CASE; }, board: function () { return B; },
      phrases: function (seg) { // as studio-core, plus words before seg[0] are left out (they belong to the opener)
        var p = B.base.phrases || [0], out = [];
        for (var k = 0; k < p.length; k++) { var end = k + 1 < p.length ? p[k + 1] : B.base.words.length, idx = []; for (var i = p[k]; i < end; i++) if (Wd(i).t < seg[1] && Wd(i).t >= seg[0] - 0.01) idx.push(i); if (idx.length) out.push(idx); }
        return out;
      }
    };
    try { return { R: window.VPLooks(K), K: K }; } catch (e) { console.error(e); return null; }
  }
  function lookCtx(ctx, L, seg) {
    var B = ctx.Bx, f0 = (B.fonts || []).filter(function (x) { return x.id === (L.font || "brand"); })[0] || { id: "brand" };
    var f = f0.id === "brand" ? Object.assign({ id: "brand", label: f0.label, sub: f0.sub }, B.brand.font) : f0;
    var sw = function (id) { if (/^#[0-9a-f]{6}$/i.test(String(id))) return { id: id, hex: id }; return (B.brand.swatches || []).filter(function (s) { return s.id === id; })[0] || { id: "white", hex: "#FFFFFF" }; };
    var c1 = sw(L.colour || "white"), c2 = L.colour2 ? sw(L.colour2) : null, segm = seg;
    return {
      L: L, f: f, hex: c1.hex, colourId: c1.id, hex2: c2 ? c2.hex : null, colour2Id: c2 ? c2.id : null, shadow: isLight(c1.hex) ? B.brand.shadow : "none", seg: segm, card: false, B: B,
      media: ctx.stage.video, backdrop: ctx.stage.backdrop, under: ctx.stage.under, over: ctx.stage.over, safe: B.safe || { x0: 135, x1: 945, y0: 250, y1: 1500 },
      px: function (n) { return n; }, hook: function () { return parseHook(B, B.base.hook_text, segm); },
      freeze: function () { return { el: el("div"), grab: function () {} }; }, studio: function (p) { var e = el("div"); p.appendChild(e); return { el: e, from: function () {} }; }
    };
  }
  // same rule as studio-core parseHook: each hook token is matched to the next transcript word inside the segment
  function parseHook(B, txt, seg) {
    var lines = String(txt || "").split(/\n|\s\/\s/).map(function (l) { return l.trim(); }).filter(Boolean);
    var words = B.base.words.filter(function (w) { return w.t >= seg[0] - 0.05 && w.t < seg[1]; }), p = 0, prevEnd = seg[0] + 0.1, out = [];
    lines.forEach(function (line) {
      var toks = [];
      line.split(/\s+/).forEach(function (raw) {
        var emph = /\*/.test(raw), text = raw.replace(/\*/g, ""); if (!text) return;
        var n = norm(text), hit = -1;
        for (var k = p; k < Math.min(words.length, p + 9); k++) { if (norm(words[k].text) === n || (norm(words[k].text).indexOf(n) === 0 && n.length > 2)) { hit = k; break; } }
        var t, end; if (hit >= 0) { t = words[hit].t; end = words[hit].end; p = hit + 1; } else { t = prevEnd + 0.08; end = t + 0.25; }
        prevEnd = end; toks.push({ text: text, emph: emph, t: t, end: end });
      });
      if (toks.length) out.push(toks);
    });
    return out;
  }
  // the handover rule (documented in MECHANISMS.md OPEN-01)
  function handover(B, hookSeg) {
    var toks = parseHook(B, B.base.hook_text, hookSeg), all = [].concat.apply([], toks), last = all[all.length - 1];
    var lastEnd = last ? last.end : hookSeg[1], next = B.base.words.filter(function (w) { return w.t >= lastEnd - 0.01; })[0];
    var H = Math.min(next ? next.t : lastEnd + 0.6, lastEnd + 0.6);
    H = Math.max(H, lastEnd + 0.2);
    return { H: Math.round(H * 1000) / 1000, lastEnd: lastEnd, next: next ? next.t : null };
  }
  function placeBlock(r, ctx, y) {
    if (!r.block) return;
    var z = ctx.Bx.safe || { x0: 135, x1: 945 };
    r.block.classList.add("block"); (r.blockUnder ? ctx.stage.under : ctx.stage.over).appendChild(r.block);
    var h = 0; Array.prototype.forEach.call(r.block.querySelectorAll(".inner"), function (c) { h = Math.max(h, c.offsetHeight); }); if (!h) h = r.block.offsetHeight || 300;
    r.block.style.left = z.x0 + "px"; r.block.style.width = (z.x1 - z.x0) + "px"; r.block.style.height = h + "px"; r.block.style.top = Math.round(y - h / 2) + "px";
    if (r.after) r.after();
  }
  // built-in fallback when studio-looks.js is not on the page: TNG bars hook + a box-behind-the-word subtitle
  function fallbackHook(ctx, seg, y) {
    var tl = gsap.timeline({ paused: true }), sk = ctx.sk, lines = parseHook(ctx.Bx, ctx.Bx.base.hook_text, seg), blk = el("div", "vpm-abs");
    blk.style.cssText = "left:0;width:1080px;top:" + (y - 200) + "px;height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;";
    lines.forEach(function (ln, k) {
      var d = el("div"); d.textContent = ln.map(function (t) { return t.text; }).join(" ");
      d.style.cssText = "font:800 104px/1.1 \"" + sk.body + "\",sans-serif;color:#fff;padding:0 18px;background:linear-gradient(transparent 42%," + (k ? sk.ink : sk.accent) + " 42%," + (k ? sk.ink : sk.accent) + " 96%,transparent 96%);" + (k ? "" : "color:" + sk.ink + ";");
      blk.appendChild(d); gsap.set(d, { opacity: 0 }); tl.fromTo(d, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.26, ease: "power3.out", immediateRender: false }, seg[0] + 0.08 + k * 0.1);
    });
    ctx.stage.over.appendChild(blk); tl.to(blk, { opacity: 0, duration: 0.2 }, seg[1] - 0.22);
    return { block: null, el: blk, tl: tl };
  }
  function fallbackSubs(ctx, seg, y) {
    var tl = gsap.timeline({ paused: true }), sk = ctx.sk, ws = ctx.base.words, chunks = [], cur = [];
    ws.forEach(function (w, i) { if (w.t < seg[0] - 0.01 || w.t >= seg[1]) return; cur.push(i); if (cur.length >= 3 || /[.!?,]$/.test(w.text)) { chunks.push(cur); cur = []; } });
    if (cur.length) chunks.push(cur);
    chunks.forEach(function (c, k) {
      var d = el("div", "vpm-abs"); d.style.cssText = "left:0;width:1080px;top:" + (y - 40) + "px;text-align:center;font:800 62px/1.2 \"" + sk.body + "\",sans-serif;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.5);visibility:hidden;";
      d.innerHTML = c.map(function (i) { return '<span style="padding:0 .14em;border-radius:12px">' + esc(ws[i].text.replace(/[,.!?]$/, "")) + "</span>"; }).join(" ");
      ctx.stage.over.appendChild(d);
      var st = Math.max(seg[0], ws[c[0]].t - 0.06), en = k < chunks.length - 1 ? Math.max(st + 0.4, ws[chunks[k + 1][0]].t - 0.06) : seg[1];
      tl.set(d, { visibility: "visible" }, st); tl.set(d, { visibility: "hidden" }, en);
      Array.prototype.forEach.call(d.children, function (s, j) { var at = Math.max(st, ws[c[j]].t - 0.04); tl.set(s, { backgroundColor: sk.accent, color: sk.ink, textShadow: "none" }, at); tl.set(s, { backgroundColor: "rgba(0,0,0,0)", color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.5)" }, j < c.length - 1 ? Math.max(at + 0.05, ws[c[j + 1]].t - 0.04) : en); });
    });
    return { tl: tl };
  }
  R["opener-handover"] = function (ctx) {
    var B = ctx.Bx, pick = B.vidpod_pick || {}, segs = (((B.clips || []).filter(function (c) { return c.id === ctx.clipId; })[0] || {}).segments || {}).sections || {};
    var hookSeg = segs.hook || [0, 2.91], end = Math.min(ctx.base.duration || 99, Math.max(ctx.seg[1], 0));
    var ho = handover(B, hookSeg), H = ho.H;
    var hp = Object.assign({ size: 110, y: 1150, colour: "primary", case: "spoken", font: "brand" }, pick.hook || {}), sp = Object.assign({ style: "cap-box-word", size: 62, y: 1400, colour: "primary", case: "spoken", lines: 1, font: "brand" }, pick.subtitles || {});
    var hookStyle = (ctx.style.hook && ctx.style.hook.renderer) || "hk-highlight-bars", hookFb = (ctx.style.hook && ctx.style.hook.fallback) || "hook-bars";
    var looks = looksFor(ctx), tls = [], hr, sr, used = { hook: "built-in", subs: "built-in" };
    var hookY = hp.y, subY = sp.y;
    if (looks && (looks.R[hookStyle] || looks.R[hookFb])) {
      var hs = looks.R[hookStyle] ? hookStyle : hookFb;
      hr = looks.R[hs](lookCtx(ctx, Object.assign({}, hp, { style: hs, size: Math.max(hp.size, 104) }), [hookSeg[0], H]));
      placeBlock(hr, ctx, hookY); used.hook = hs;
    } else { hr = fallbackHook(ctx, [hookSeg[0], H], hookY); }
    if (looks && looks.R[sp.style]) { sr = looks.R[sp.style](lookCtx(ctx, sp, [H, end])); placeBlock(sr, ctx, subY); used.subs = sp.style; }
    else sr = fallbackSubs(ctx, [H, end], subY);
    tls.push(hr.tl, sr.tl);
    // the handover: the hook settles towards the subtitle line and fades in the 6 frames before H; subtitles own the screen from H
    var hb = hr.block || hr.el, ht = gsap.timeline({ paused: true });
    if (hb) { ht.fromTo(hb, { y: 0, scale: 1, opacity: 1 }, { y: (subY - hookY) * 0.22, scale: 0.86, opacity: 0, duration: 0.24, ease: "power2.in", immediateRender: false }, H - 0.24); tls.push(ht); }
    ctx.info = { H: H, hookEnd: ho.lastEnd, next: ho.next, hookStyle: used.hook, subStyle: used.subs };
    // the demo runs from the hook's start to 6 s past the handover (clips whose hook sits late still show the handover)
    var dur = ctx.base.duration || end;
    return { tls: tls, info: ctx.info, seg: [hookSeg[0], Math.min(dur, Math.max(end, H + 6))] };
  };

  /* ================= stage + player ================= */
  var players = [], rafOn = false;
  // one frame loop for every card; a 40 ms timer backs up requestAnimationFrame (some embedded panes stop rAF while still visible)
  var frameId = 0;
  function schedule() {
    var id = ++frameId, done = false, go = function () { if (done || id !== frameId) return; done = true; tick(); };
    requestAnimationFrame(go); setTimeout(go, 40);
  }
  function tick() {
    rafOn = false;
    players.forEach(function (p) { if (p.playing) p.frame(); });
    if (players.some(function (p) { return p.playing; })) { rafOn = true; schedule(); }
  }
  function kick() { if (!rafOn) { rafOn = true; schedule(); } }
  function makeStage(host, ctx, clock) {
    var screen = el("div", "vpm-screen"), inner = el("div", "vpm-inner");
    var backdrop = el("div", "vpm-layer"), under = el("div", "vpm-layer"), over = el("div", "vpm-layer");
    screen.appendChild(inner); host.appendChild(screen);
    inner.appendChild(backdrop);
    var video = null;
    if (clock !== "loop") {
      // the file loads only while this demo plays (phones: one video at a time); until then the poster shows
      video = el("video"); video.muted = true; video.playsInline = true; video.setAttribute("playsinline", ""); video.preload = "none";
      video.dataset.src = ctx.root + ctx.base.video; if (ctx.base.poster) video.poster = ctx.root + ctx.base.poster;
      inner.appendChild(video);
    } else { inner.style.background = ctx.sk.ground; }
    inner.appendChild(under); inner.appendChild(over);
    backdrop.style.zIndex = 0; if (video) video.style.zIndex = 1; under.style.zIndex = 3; over.style.zIndex = 5;
    function fit() { var w = screen.clientWidth || 280; inner.style.transform = "scale(" + (w / 1080) + ")"; }
    var ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null; if (ro) ro.observe(screen); fit();
    return {
      screen: screen, inner: inner, video: video, backdrop: backdrop, under: under, over: over, fit: fit,
      // a renderer may move the clip into its own element (the board puts it in a taped photo)
      adopt: function (parent) { if (video) { video.style.zIndex = ""; parent.appendChild(video); } },
      ensure: function () { if (video && !video.getAttribute("src")) video.src = video.dataset.src; },
      release: function () { if (video) { video.pause(); if (video.getAttribute("src")) { video.removeAttribute("src"); video.load(); } } },
      destroy: function () { if (ro) ro.disconnect(); if (video) { video.pause(); video.removeAttribute("src"); video.load(); } }
    };
  }
  function Player(ctx, host, renderer, seg, clock, posterT) {
    var P = { playing: false, built: false, tls: [], seg: seg, clock: clock, loop: seg[1] - seg[0], t0: 0, at: posterT, onTime: null };
    var stage = makeStage(host, ctx, clock); ctx.stage = stage; P.stage = stage;
    if (stage.video) {
      // another video starting (the studio's one-video rule) or this demo leaving the screen: stop and let go of the file
      stage.video.vpRelease = function () { if (P.playing) P.pause(); stage.release(); };
      if (typeof IntersectionObserver === "function") new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) stage.video.vpRelease(); }); }).observe(stage.screen);
    }
    function build() {
      if (P.built) return; P.built = true;
      var fam = [ctx.sk.display, ctx.sk.body].map(function (f) { return ctx.sk.displayW + " 80px \"" + f + "\""; }).concat(["800 80px \"" + ctx.sk.body + "\""]);
      var fonts = document.fonts ? Promise.all(fam.map(function (q) { return document.fonts.load(q).catch(function () {}); })) : Promise.resolve();
      return fonts.then(function () {
        try { var r = R[renderer](ctx); P.tls = (r.tls || []).filter(Boolean); if (r.loop) { P.loop = r.loop; P.seg = [0, r.loop]; } if (r.seg) P.seg = r.seg; P.info = r.info || null; }
        catch (e) { console.error("[VidPodMograph]", renderer, e); P.tls = []; }
        P.seek(P.at);
        if (P.onBuilt) P.onBuilt();
      });
    }
    P.build = build;
    P.time = function () {
      if (P.clock === "loop") return P.playing ? ((performance.now() / 1000 - P.t0) % P.loop + P.loop) % P.loop : P.at;
      return stage.video ? stage.video.currentTime : P.at;
    };
    P.render = function (t) { P.tls.forEach(function (tl) { tl.seek(t, false); }); if (P.onTime) P.onTime(t); };
    P.frame = function () {
      var t = P.time();
      if (P.clock !== "loop" && (t >= P.seg[1] - 0.02 || t < P.seg[0] - 0.3)) { t = P.seg[0]; stage.video.currentTime = t; }
      P.render(t);
    };
    P.seek = function (t) {
      t = clamp(t, P.seg[0], P.seg[1] - 0.04); P.at = t;
      if (P.clock === "loop") { P.t0 = performance.now() / 1000 - t; }
      else if (stage.video) { try { stage.video.currentTime = t; } catch (e) {} }
      P.render(t);
    };
    P.play = function () {
      players.forEach(function (o) { if (o !== P && o.playing) o.pause(); });
      Promise.resolve(build()).then(function () {
        P.playing = true; stage.screen.classList.add("playing");
        if (P.clock === "loop") P.t0 = performance.now() / 1000 - P.at;
        else { var fresh = !stage.video.getAttribute("src"); stage.ensure(); if (fresh) { try { stage.video.currentTime = P.at; } catch (e) {} } var t = fresh ? P.at : stage.video.currentTime; if (t < P.seg[0] || t >= P.seg[1] - 0.05) stage.video.currentTime = P.seg[0]; stage.video.play().catch(function () {}); }
        if (P.onState) P.onState(); kick();
      });
    };
    P.pause = function () { P.at = P.time(); P.playing = false; stage.screen.classList.remove("playing"); if (stage.video) stage.video.pause(); if (P.onState) P.onState(); };
    P.toggle = function () { if (P.playing) P.pause(); else P.play(); };
    P.destroy = function () { P.pause(); P.tls.forEach(function (tl) { tl.kill(); }); stage.destroy(); players = players.filter(function (o) { return o !== P; }); };
    players.push(P);
    return P;
  }

  /* ================= picks and hearts ================= */
  function store(ctx) { var k = "vidpod-mograph-" + (ctx.B.client && ctx.B.client.id || "client"); var s; try { s = JSON.parse(local(k) || "{}"); } catch (e) { s = {}; } s.picks = s.picks || {}; s.hearts = s.hearts || {}; return { k: k, s: s, save: function () { local(k, JSON.stringify(s)); } }; }
  function emit(ctx, kind, rec, on) {
    var B = ctx.B, row = Object.assign({ section: rec.section || "mograph", code: rec.code, label: rec.name, style: rec.id, on: on, clip: ctx.clipId, clientId: B.client && B.client.id, clientName: B.client && B.client.name, settings: { clip: ctx.clipId, kind: rec.kind || "style", catalogue: "mograph.json " + (ctx.cat.version || "") }, at: new Date().toISOString() });
    var o = ctx.opts || {};
    try {
      if (kind === "pick" && typeof o.onPick === "function") return o.onPick(row, on);
      if (kind === "heart" && typeof o.onHeart === "function") return o.onHeart(row, on);
      var api = window.__studio && window.__studio.mograph;
      if (api && typeof api[kind] === "function") return api[kind](row, on);
      var sa = o.api;   // the studio's openBox api (studio-core): post(tab, rows) to the VIDPOD log + toast
      if (sa && typeof sa.post === "function") {
        Promise.resolve(sa.post(kind === "pick" ? "Picks" : "Likes", [{ section: row.section, optionCode: row.code, label: row.label, settings: Object.assign({ style: row.style, on: on }, row.settings), note: (on ? (kind === "pick" ? "picked" : "liked") : (kind === "pick" ? "unpicked" : "unliked")) + " (" + (row.section === "openers" ? "opener" : "motion graphics style") + ")" }]))
          .then(function (ok) { if (typeof sa.toast === "function") sa.toast(ok ? (on ? (kind === "pick" ? "Picked. Sent to VIDPOD" : "Liked. Sent to VIDPOD") : "Removed. Sent to VIDPOD") : "Saved on this device only"); });
      }
    } catch (e) { console.error(e); }
    try { document.dispatchEvent(new CustomEvent("vidpod:mograph", { detail: { kind: kind, row: row, on: on } })); } catch (e) {}
  }

  /* ================= cards ================= */
  function lazy(node, fn) {
    if (typeof IntersectionObserver !== "function") { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && node.offsetWidth > 0) { io.disconnect(); fn(); } }); }, { rootMargin: "200px" });
    io.observe(node);
  }
  function card(ctx, style, kind) {
    var c = el("article", "vpm-card"); c.id = "vpm-" + style.id;
    var demo = style.demo || {}, clock = demo.clock || "video", seg = demo.segment || [0, ctx.base.duration || 10];
    seg = [seg[0], Math.min(seg[1], ctx.base.duration || seg[1])];
    var pieces = (style.creates || []).filter(function (p) { return p.demo_at != null; });
    var posterT = demo.poster != null ? demo.poster : (pieces[0] ? pieces[0].demo_at + 1.6 : seg[0] + 1);
    c.innerHTML = '<div class="vpm-top"><span class="vpm-code">' + esc(style.code) + "</span><h3>" + esc(style.name) + '</h3></div><p class="vpm-tag">' + esc(style.tagline || "") + "</p>";
    var wrap = el("div", "vpm-stagewrap"); c.appendChild(wrap);
    var sctx = Object.assign({}, ctx, { style: style, seg: clock === "loop" ? [0, demo.loop || 6] : seg, Bx: Object.assign({}, ctx.B, { base: ctx.base }) });
    var P = Player(sctx, wrap, demo.renderer || style.id, sctx.seg, clock, posterT);
    var big = el("button", "vpm-big", "<span>" + I.play + "</span>"); big.type = "button"; big.setAttribute("aria-label", "Play " + style.name); P.stage.screen.appendChild(big);
    big.addEventListener("click", function () { P.toggle(); });
    // controls
    var ctl = el("div", "vpm-ctrl");
    var bp = el("button", "vpm-ib", I.play); bp.type = "button"; bp.setAttribute("aria-label", "Play or pause");
    var br = el("button", "vpm-ib", I.replay); br.type = "button"; br.setAttribute("aria-label", "Replay");
    var rng = el("input"); rng.type = "range"; rng.min = 0; rng.max = 1000; rng.value = 0; rng.setAttribute("aria-label", "Scrub");
    var tm = el("span", "vpm-time", "0:00 / " + fmt(P.seg[1]));
    var bs = null;
    ctl.appendChild(bp); ctl.appendChild(br); ctl.appendChild(rng); ctl.appendChild(tm);
    if (clock !== "loop") { bs = el("button", "vpm-ib", I.mute); bs.type = "button"; bs.setAttribute("aria-label", "Sound"); bs.setAttribute("aria-pressed", "false"); ctl.appendChild(bs); bs.addEventListener("click", function () { var v = P.stage.video; v.muted = !v.muted; bs.innerHTML = v.muted ? I.mute : I.sound; bs.setAttribute("aria-pressed", String(!v.muted)); }); }
    c.appendChild(ctl);
    bp.addEventListener("click", function () { P.toggle(); });
    br.addEventListener("click", function () { P.build(); P.seek(P.seg[0]); P.play(); });
    rng.addEventListener("input", function () { Promise.resolve(P.build()).then(function () { if (P.playing) P.pause(); P.seek(P.seg[0] + (P.seg[1] - P.seg[0]) * rng.value / 1000); }); });
    P.onState = function () { bp.innerHTML = P.playing ? I.pause : I.play; };
    var chipEls = [];
    P.onTime = function (t) {
      rng.value = Math.round((t - P.seg[0]) / (P.seg[1] - P.seg[0]) * 1000); tm.textContent = fmt(t) + " / " + fmt(P.seg[1]);
      var cur = null; pieces.forEach(function (p, k) { if (t >= p.demo_at - 0.05) cur = k; }); chipEls.forEach(function (ch, k) { ch.classList.toggle("on", k === cur); });
      if (P.onTimeExtra) P.onTimeExtra(t);
    };
    if (pieces.length) {
      var row = el("div", "vpm-chips"); row.setAttribute("aria-label", "Jump to a piece");
      pieces.forEach(function (p) {
        var ch = el("button", "vpm-chip", "<small>" + esc(p.code.replace(/^MG-\d+/, "")) + "</small>" + esc(p.name)); ch.type = "button";
        ch.addEventListener("click", function () { Promise.resolve(P.build()).then(function () { P.seek(p.demo_at); P.play(); }); });
        row.appendChild(ch); chipEls.push(ch);
      });
      c.appendChild(row);
    }
    // pick + heart
    var ST = store(ctx), acts = el("div", "vpm-acts");
    var pk = el("button", "vpm-pick"); pk.type = "button";
    var hb = el("button", "vpm-ib vpm-heart"); hb.type = "button"; hb.setAttribute("aria-label", "Heart " + style.name);
    function paint() { var on = !!ST.s.picks[style.id], h = !!ST.s.hearts[style.id]; pk.textContent = on ? "Picked " + style.code : "Pick this " + (kind === "opener" ? "opener" : "style"); pk.setAttribute("aria-pressed", String(on)); hb.innerHTML = h ? I.heartOn : I.heart; hb.setAttribute("aria-pressed", String(h)); }
    pk.addEventListener("click", function () { ST = store(ctx); var on = !ST.s.picks[style.id]; if (on) ST.s.picks[style.id] = { at: new Date().toISOString() }; else delete ST.s.picks[style.id]; ST.save(); paint(); emit(ctx, "pick", Object.assign({ kind: kind, section: kind === "opener" ? "openers" : "mograph" }, style), on); });
    hb.addEventListener("click", function () { ST = store(ctx); var on = !ST.s.hearts[style.id]; if (on) ST.s.hearts[style.id] = { at: new Date().toISOString() }; else delete ST.s.hearts[style.id]; ST.save(); paint(); emit(ctx, "heart", Object.assign({ kind: kind, section: kind === "opener" ? "openers" : "mograph" }, style), on); });
    // re-read on every toggle: several cards (and the opener) share this device's store
    (ctx.opts.picks || []).forEach(function (id) { if (id === style.id) ST.s.picks[id] = ST.s.picks[id] || { at: "" }; });
    (ctx.opts.likes || []).forEach(function (id) { if (id === style.id) ST.s.hearts[id] = ST.s.hearts[id] || { at: "" }; });
    paint(); acts.appendChild(pk); acts.appendChild(hb); c.appendChild(acts);
    P.card = c;
    lazy(c, function () { P.build(); });
    return { el: c, P: P };
  }
  function listHtml(items, kind) {
    return '<ul class="vpm-ul">' + items.map(function (n) {
      if (kind === "needs") return "<li><b>" + esc(n.item) + "</b>" + (n.required ? "" : "<i>OPTIONAL</i>") + "<span>" + esc(n.note || "") + "</span></li>";
      return "<li><code>" + esc(n.code) + "</code><b>" + esc(n.name) + "</b><span>" + esc(n.what) + "</span></li>";
    }).join("") + "</ul>";
  }
  function details(style, ctx) {
    var bp = style.build_path || {}, d = el("details");
    var mo = (style.motion || []).map(function (m) { return "<tr><td>" + esc(m.move) + "</td><td>" + esc(m.value) + (m.from ? ' <span style="color:var(--vpm-muted)">(' + esc(m.from) + ")</span>" : "") + "</td></tr>"; }).join("");
    d.innerHTML = "<summary>How it is built</summary>" +
      (bp.engine ? "<h4>Engine (reuse, never hand-rebuild)</h4><ul>" + bp.engine.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      (bp.registry ? "<h4>HyperFrames registry</h4><ul>" + bp.registry.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      (bp.studio ? "<h4>In the studio</h4><p>" + esc(bp.studio) + "</p>" : "") + (bp.render ? "<h4>Render</h4><p>" + esc(bp.render) + "</p>" : "") +
      (mo ? '<h4>Motion (25 fps)</h4><table class="vpm-mo">' + mo + "</table>" : "") +
      (style.rules ? "<h4>Rules</h4><ul>" + style.rules.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "");
    return d;
  }
  function styleCard(ctx, style) {
    var k = card(ctx, style, "style"), c = k.el, jobs = ctx.cat.jobs || {};
    var cols = el("div", "vpm-cols");
    cols.innerHTML = "<div><h4>What it needs</h4>" + listHtml(style.needs || [], "needs") + "</div><div><h4>What we can make with it</h4>" + listHtml(style.creates || [], "creates") + "</div>";
    c.appendChild(cols);
    if (style.when) { var jw = el("div", "vpm-jobs"); style.when.forEach(function (w) { var j = el("span", "vpm-job" + (w.fit === "strong" ? " strong" : ""), "<b>" + esc((w.job || "").replace(/-/g, " ")) + "</b> " + esc(w.fit)); j.title = (jobs[w.job] || "") + " " + (w.how || ""); jw.appendChild(j); }); c.appendChild(el("h4", "", "Best for")); c.appendChild(jw); }
    if (style.examples && style.examples.length) {
      c.appendChild(el("h4", "", "From The Jackett Ranch (published)"));
      var ex = el("div", "vpm-ex");
      style.examples.forEach(function (e) { var f = el("figure"); f.innerHTML = '<img loading="lazy" alt="' + esc(e.caption) + '" src="' + esc(ctx.root + e.src) + '"><figcaption>' + esc(e.caption) + "<br>" + esc(e.film + " " + e.at) + "</figcaption>"; ex.appendChild(f); });
      c.appendChild(ex);
    }
    c.appendChild(details(style, ctx));
    return k;
  }

  /* ================= public API ================= */
  function mount(container, opts) {
    injectCss(); opts = opts || {};
    if (typeof container === "string") container = document.querySelector(container);
    if (!container) return Promise.reject(new Error("VidPodMograph.mount: no container"));
    var root = el("section", "vpm"); container.appendChild(root);
    root.innerHTML = '<div class="vpm-head"><h2>' + esc(opts.title || "Motion graphics") + "</h2><p>" + esc(opts.intro || "Whole graphic styles, not single looks. Each one plays on your clip in your brand, with what it needs from you and what we can make with it. Built from The Jackett Ranch, which we made and published.") + "</p></div>";
    var list = el("div", "vpm-list"); root.appendChild(list);
    return resolveContext(opts).then(function (ctx) {
      var made = (ctx.cat.styles || []).filter(function (s) { return !opts.only || opts.only.indexOf(s.id) >= 0; }).map(function (s) { var k = styleCard(ctx, s); list.appendChild(k.el); return k; });
      return { root: root, ctx: ctx, cards: made, destroy: function () { made.forEach(function (k) { k.P.destroy(); }); root.remove(); } };
    }).catch(function (e) { root.appendChild(el("p", "vpm-note", "Motion graphics could not load (" + esc(e.message) + ").")); throw e; });
  }
  function mountOpener(container, opts) {
    injectCss(); opts = opts || {};
    if (typeof container === "string") container = document.querySelector(container);
    if (!container) return Promise.reject(new Error("VidPodMograph.mountOpener: no container"));
    var root = el("section", "vpm"); container.appendChild(root);
    return resolveContext(opts).then(function (ctx) {
      var op = (ctx.cat.openers || []).filter(function (o) { return o.id === (opts.id || "opener-handover"); })[0];
      if (!op) throw new Error("opener not in mograph.json");
      var k = card(ctx, op, "opener"), c = k.el, P = k.P;
      var bar = el("div", "vpm-hand"), hd = el("div", "h", "Hook"), sb = el("div", "s", "House subtitles"), now = el("i", "now");
      bar.appendChild(hd); bar.appendChild(sb); bar.appendChild(now);
      var note = el("p", "vpm-note", "");
      c.insertBefore(note, c.querySelector(".vpm-acts")); c.insertBefore(bar, note);
      P.onBuilt = function () {
        var i = P.info || {}, span = P.seg[1] - P.seg[0], H = i.H || 0;
        hd.style.width = ((H - P.seg[0]) / span * 100).toFixed(1) + "%";
        hd.textContent = "Hook " + fmt(P.seg[0]) + " to " + H.toFixed(2) + " s";
        sb.textContent = "Subtitles from " + H.toFixed(2) + " s";
        note.textContent = "Hook: " + (i.hookStyle || "") + ". Last hook word ends " + (i.hookEnd != null ? i.hookEnd.toFixed(2) : "?") + " s; next word " + (i.next != null ? i.next.toFixed(2) : "none") + " s; handover " + H.toFixed(2) + " s (the hook settles and fades over the 6 frames before it). Subtitles: " + (i.subStyle || "") + ".";
      };
      P.onTimeExtra = function (t) { now.style.left = ((t - P.seg[0]) / (P.seg[1] - P.seg[0]) * 100).toFixed(2) + "%"; };
      var w = el("p", "vpm-note", esc(op.what)); c.insertBefore(w, bar);
      root.appendChild(c);
      return { root: root, ctx: ctx, card: k, destroy: function () { P.destroy(); root.remove(); } };
    }).catch(function (e) { root.appendChild(el("p", "vpm-note", "Opener could not load (" + esc(e.message) + ").")); throw e; });
  }

  function picksOf(clientId) { try { return JSON.parse(local("vidpod-mograph-" + (clientId || "vidpod")) || "{}"); } catch (e) { return {}; } }
  // the studio-core hook (index.html #mograph, openBox): VPMograph.render(containerEl, api) with api = { board(), client(), el, esc, toast, post, signedIn() }
  function fromApi(api, extra) {
    api = api || {};
    var B = typeof api.board === "function" ? api.board() : api.board;
    var root = SCRIPT_SRC ? SCRIPT_SRC.replace(/[^/]*$/, "") : "";
    return Object.assign({ board: B || undefined, api: api, root: B ? "" : root }, extra || {});
  }
  window.VPMograph = {
    render: function (container, api) {
      if (typeof container === "string") container = document.querySelector(container);
      var ph = container && container.querySelector("#mograph-placeholder"); if (ph) ph.remove();
      return mount(container, fromApi(api));
    },
    renderOpener: function (container, api) { if (typeof container === "string") container = document.querySelector(container); return mountOpener(container, fromApi(api)); },
    picks: function (clientId) { return picksOf(clientId); }
  };
  window.VidPodMograph = {
    version: VERSION, mount: mount, mountOpener: mountOpener, renderers: R, skin: skin, handover: handover,
    players: function () { return players.slice(); },   // for checks: [{ seek(t), play(), pause(), info, seg }]
    // render one style or opener into any 9:16 host (no card chrome); returns the player
    render: function (host, opts) {
      injectCss(); opts = opts || {};
      return resolveContext(opts).then(function (ctx) {
        var all = (ctx.cat.styles || []).concat(ctx.cat.openers || []), style = all.filter(function (s) { return s.id === opts.id; })[0];
        var demo = style.demo || {}, clock = demo.clock || "video", seg = clock === "loop" ? [0, demo.loop || 6] : (opts.segment || demo.segment || [0, ctx.base.duration]);
        if (clock !== "loop" && ctx.base.duration) seg = [Math.min(seg[0], ctx.base.duration - 1), Math.min(seg[1], ctx.base.duration)];
        var sctx = Object.assign({}, ctx, { style: style, seg: seg, Bx: Object.assign({}, ctx.B, { base: ctx.base }) });
        var P = Player(sctx, host, demo.renderer || style.id, seg, clock, opts.at != null ? opts.at : seg[0]);
        return Promise.resolve(P.build()).then(function () { return P; });
      });
    }
  };
})();
