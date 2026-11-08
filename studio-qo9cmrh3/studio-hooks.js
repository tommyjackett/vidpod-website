/* VidPod Studio: the HOOK looks, rebuilt from the reference frames (7 Nov 2026).
   Loaded after studio-looks.js; plugs in through window.VPLooksMore like studio-looks-2.js.
   Every hook copies one reference family (see hooks.json "source" and REFERENCE-SPEC.md):
     hk-behind-head    Word behind head            (Pinterest "AREN'T BORING", Pin 4.8 s "content")
     hk-quote-box      Quote box, speaker in front (podcast reel "Addictions are an effort to kill hope")
     hk-mixed-stack    Mixed-scale stack           (Pin 0-1.7 s "If the / Prospects / have to / meet you")
     hk-highlight-bars Highlight bars              (The Numbers Game reels)
     hk-serif-keyword  Serif keyword               (editorial sans + serif pair, "THE HARDEST ... posting...")
     hk-headline-band  Headline band, head pops out (white band headline, speaker breaking out of it)
     hk-strike         Strike and correct          (Pin 3.5 s "your Content is failing", "Quality / Quantity")
   Layout keys off the measured glyphs (cap height, x-height, ascenders) and the head position in
   board.json base.face {x, y, r, top}. When a clip is framed too tight for a head-relative layout,
   the plate and its matte move down together (headroom) and the gap above is filled from the
   plate's own top rows, stretched; it eases back as the hook hands over. */
(window.VPLooksMore = window.VPLooksMore || []).push(function (K, R, H) {
  "use strict";
  var el = K.el, esc = K.esc;
  var HEAVY = /archivo black|anton|bebas|black|heavy|ultra|druk/i, SCRIPT = /script|hand|signature|brush/i;
  var SERIF_FALLBACK = { family: "DM Serif Display", weight: 400 };
  try { if (document.fonts) ["400 64px \"DM Serif Display\"", "400 64px \"Archivo Black\""].forEach(function (q) { document.fonts.load(q).catch(function () {}); }); } catch (e) {}

  /* ---------- type ---------- */
  var cv = document.createElement("canvas").getContext("2d");
  function fstr(fo, size) { return (fo.style || "normal") + " " + fo.weight + " " + size + "px \"" + fo.family + "\""; }
  function tw(text, fo, size, ls) { cv.font = fstr(fo, size); return cv.measureText(text).width + (ls || 0) * size * Math.max(0, String(text).length - 1); }
  var MC = {};
  function met(fo, size) { // cap height, x-height, descender, measured on the real font
    var key = fstr(fo, 100);
    if (!MC[key]) { cv.font = key; var c = cv.measureText("H"), x = cv.measureText("x"), p = cv.measureText("p"), a = cv.measureText("bdhkl"); MC[key] = { cap: c.actualBoundingBoxAscent || 72, xh: x.actualBoundingBoxAscent || 52, desc: p.actualBoundingBoxDescent || 21, asc: a.actualBoundingBoxAscent || 74 }; }
    var m = MC[key], k = size / 100; return { cap: m.cap * k, xh: m.xh * k, desc: m.desc * k, asc: m.asc * k };
  }
  // distance from the top of a line box (line-height lh px) to the cap top: CSS centres ascent+descent in the box
  function capOff(fo, size, lh) {
    cv.font = fstr(fo, size); var mm = cv.measureText("Hg"), A = mm.fontBoundingBoxAscent || size * 0.92, Dn = mm.fontBoundingBoxDescent || size * 0.24;
    return (lh - (A + Dn)) / 2 + A - met(fo, size).cap;
  }
  function brandFont(ctx) { return ctx.f.id === "brand" || !ctx.f.id ? ctx.B.brand.font : null; }
  // heavy: the hero face (Archivo Black on VIDPOD, the bold brand face where the display face is a script)
  function heavy(ctx) {
    var bf = brandFont(ctx), f = ctx.f;
    if (bf) { if (bf.hero) return { family: bf.hero.family, weight: bf.hero.weight }; if (bf.display && HEAVY.test(bf.display)) return { family: bf.display, weight: bf.w_display }; return { family: bf.family, weight: bf.w_bold }; }
    return { family: f.display || f.family, weight: f.w_display || f.w_bold };
  }
  function bold(ctx) { return { family: ctx.f.family, weight: ctx.f.w_bold }; }
  function serif(ctx) { // the accent face: the brand's script/serif display (Tangerine on @pilates), else DM Serif Display
    var bf = brandFont(ctx), f = ctx.f;
    if (bf) { if (bf.serif) return { family: bf.serif.family, weight: bf.serif.weight, script: SCRIPT.test(bf.serif.family) }; if (bf.display && !HEAVY.test(bf.display)) return { family: bf.display, weight: bf.w_display, script: SCRIPT.test(bf.display) }; return SERIF_FALLBACK; }
    if (/serif|playfair|garamond|didot|caslon/i.test(f.family)) return { family: f.display || f.family, weight: f.w_display || f.w_bold };
    return SERIF_FALLBACK;
  }
  function setF(node, fo, size, colour) { node.style.fontFamily = "\"" + fo.family + "\", system-ui, sans-serif"; node.style.fontWeight = fo.weight; node.style.fontStyle = fo.style || "normal"; node.style.fontSynthesis = "none"; if (size) node.style.fontSize = size + "px"; if (colour) node.style.color = colour; }
  function hexRgb(h) { h = String(h).replace("#", ""); return [0, 2, 4].map(function (o) { return parseInt(h.substr(o, 2), 16); }); }
  function rgba(h, a) { return "rgba(" + hexRgb(h).join(",") + "," + a + ")"; }
  function upper(s) { return K.caseText(String(s), "upper"); }
  function txt(tok) { return typeof tok === "string" ? tok : tok.text; }
  function joinT(toks) { return toks.map(txt).join(" "); }

  /* ---------- the person ---------- */
  function face(ctx) { var f = ctx.B.base.face || { x: 540, y: 480, r: 330 }; return { x: f.x, y: f.y, r: f.r, top: f.hook_top || f.top || Math.round(f.y - f.r * 0.64) }; }

  /* ---------- headroom: move plate + matte down together, fill the gap from the plate's top rows ---------- */
  function plate(ctx) {
    var m = ctx.media, par = m.parentNode, list = [m], fc = face(ctx), cvs = null, g = null, cur = -1;
    if (par) Array.prototype.forEach.call(par.querySelectorAll(".depth-bg, .depth-fg, img.cut"), function (e) { list.push(e); });
    function src() { var w = m.videoWidth || m.naturalWidth, h = m.videoHeight || m.naturalHeight; return w && h ? { w: w, h: h } : null; }
    function draw() {
      if (!cvs || cur < 1) return;
      var s = src(); if (!s) return;
      var strip = Math.max(24, Math.min(140, fc.top - 18)) / 1920 * s.h; // rows above the head only
      try { g.setTransform(1, 0, 0, -1, 0, cvs.height); g.drawImage(m, 0, 0, s.w, strip, 0, 0, cvs.width, cvs.height); } catch (e) {}
    }
    var P = {
      set: function (d) {
        d = Math.max(0, d); if (Math.abs(d - cur) < 0.05 && d > 0) { draw(); return; }
        cur = d;
        var tr = d > 0.5 ? "translateY(" + (d / 19.2).toFixed(3) + "%)" : "";
        list.forEach(function (e) { e.style.transform = tr; });
        if (d > 0.5 && !cvs) {
          cvs = document.createElement("canvas"); cvs.width = 540; cvs.height = 200; g = cvs.getContext("2d");
          cvs.style.cssText = "position:absolute;left:0;top:0;width:1080px;filter:blur(3px);transform:scaleX(1.01);transform-origin:50% 0;background:" + (ctx.B.base.plate_top || "#2a2622") + ";";
          ctx.backdrop.appendChild(cvs);
          if (m.tagName === "IMG") m.addEventListener("load", draw);
        }
        if (cvs) { cvs.style.height = Math.ceil(d + 2) + "px"; cvs.style.display = d > 0.5 ? "" : "none"; }
        draw();
      },
      reset: function () { list.forEach(function (e) { e.style.transform = ""; }); if (cvs && cvs.parentNode) cvs.parentNode.removeChild(cvs); cvs = null; cur = -1; }
    };
    return P;
  }
  // a pure function of clip time drives the plate (in, hold, out), so scrubbing and loops match
  function plateDrive(ctx, tl, D, tIn, durIn, tOut, durOut) {
    if (D < 1) return null;
    var P = plate(ctx), o = { t: ctx.seg[0] }, eIn = gsap.parseEase("power3.out"), eOut = gsap.parseEase("power2.inOut");
    var at = function (t) { var a = durIn > 0 ? eIn(H.clamp((t - tIn) / durIn, 0, 1)) : (t >= tIn ? 1 : 0); var b = eOut(H.clamp((t - tOut) / durOut, 0, 1)); return D * a * (1 - b); };
    tl.fromTo(o, { t: ctx.seg[0] }, { t: ctx.seg[1], duration: ctx.seg[1] - ctx.seg[0], ease: "none", immediateRender: true, onUpdate: function () { P.set(at(o.t)); } }, ctx.seg[0]);
    P.set(at(ctx.seg[0]));
    return P;
  }

  /* ---------- the hook text ---------- */
  // star groups: consecutive *starred* tokens make one keyword; returns per line {lead, key, follow, line}
  function keyGroups(ctx) {
    var lines = ctx.hook(), out = [], carry = [];
    var any = lines.some(function (l) { return l.some(function (t) { return t.emph; }); });
    lines.forEach(function (ln, li) {
      var a = -1, b = -1;
      ln.forEach(function (t, k) { if (t.emph) { if (a < 0) a = k; if (b < 0 || b === k - 1) b = k; } });
      if (!any) { var best = ln.slice().sort(function (x, y) { return y.text.length - x.text.length; })[0]; a = b = ln.indexOf(best); }
      if (a < 0) { carry = carry.concat(ln); return; }
      out.push({ lead: carry.concat(ln.slice(0, a)), key: ln.slice(a, b + 1), follow: ln.slice(b + 1), line: li });
      carry = [];
    });
    if (carry.length) { if (out.length) out[out.length - 1].follow = out[out.length - 1].follow.concat(carry); else out.push({ lead: [], key: carry.slice(-1), follow: [], line: 0 }); }
    // timing guard: hook words that are not found in the transcript get guessed times; a stack never shows more than
    // 1.8 s before its keyword, nor before the previous keyword has landed; its words never show before the stack
    var prevEnd = ctx.seg[0];
    out.forEach(function (g) {
      var kt = g.key[0].t, t0 = Math.max(firstT(g.lead, kt), kt - 1.8, prevEnd + 0.35, ctx.seg[0]);
      g.t0 = Math.min(t0, kt);
      g.lead.concat(g.follow).forEach(function (t) { t.show = Math.max(t.t, g.t0); });
      g.key.forEach(function (t) { t.show = Math.max(t.t, g.t0); });
      prevEnd = g.key[g.key.length - 1].end || kt + 0.3;
    });
    // "From the first frame" (the default): the first stack is up, finished, on frame 1; later stacks still land on their words
    if (ctx.frame1 && out[0]) { out[0].t0 = ctx.seg[0]; out[0].lead.concat(out[0].key, out[0].follow).forEach(function (t) { t.show = ctx.seg[0]; }); }
    return out;
  }
  // balanced rows: split tokens into n rows of near-even width
  function rows(toks, n, fo, size) {
    if (n <= 1 || toks.length <= 1) return [toks];
    var best = null;
    (function rec(start, left, acc) {
      if (left === 1) { var r = acc.concat([toks.slice(start)]); var ws = r.map(function (x) { return tw(joinT(x), fo, size); }); var sc = Math.max.apply(null, ws); if (!best || sc < best.sc) best = { sc: sc, r: r }; return; }
      for (var k = start + 1; k <= toks.length - left + 1; k++) rec(k, left - 1, acc.concat([toks.slice(start, k)]));
    })(0, Math.min(n, toks.length), []);
    return best.r;
  }
  function firstT(toks, fb) { return toks.length ? toks[0].t : fb; }
  function fadeOut(tl, nodes, ctx) { tl.to(nodes, { opacity: 0, duration: 0.2, ease: "power2.in" }, ctx.seg[1] - 0.22); }
  function shadowSoft(a) { return "0 2px 12px rgba(0,0,0," + (a || 0.45) + "), 0 1px 2px rgba(0,0,0,.3)"; }
  function glow(hex, k) { k = k || 1; return "0 0 0.05em " + rgba(hex, 0.9 * k) + ", 0 0 0.2em " + rgba(hex, 0.55 * k) + ", 0 0 0.55em " + rgba(hex, 0.28 * k); }
  function lum(hex) { return H.lum(hex); }

  /* ==================== HOOK: Word behind head ====================
     Ref: two huge caps lines with a glowing fill; the head covers the lower half of the last line;
     plain lowercase captions play lower down. Tight frames build one word at a time (Pin "content"). */
  R["hk-behind-head"] = function (ctx) {
    var L = ctx.L, tl = H.tl(), fo = heavy(ctx), fc = face(ctx), col = ctx.hex, seg = ctx.seg;
    var groups = keyGroups(ctx), wmax = 920, top0 = 64;
    var under = H.abs(ctx.under, "left:0;top:0;width:1080px;height:1920px;");
    var maxD = 0, built = [];
    groups.forEach(function (gp) {
      var words = gp.key.map(function (t) { return upper(t.text); });
      // one line per keyword word (the "AREN'T / BORING" stack), never more than two lines
      var lines = words.length <= 2 ? words.map(function (w, i) { return { text: w, toks: [gp.key[i]] }; }) : rows(gp.key, 2, fo, 100).map(function (r) { return { text: upper(joinT(r)), toks: r }; });
      var S = L.size || 250; lines.forEach(function (l) { var w = tw(l.text, fo, S, -0.02); if (w > wmax) S = Math.floor(S * wmax / w); });
      var m = met(fo, S), pitch = m.cap * 1.3;
      // the head covers the lower 55 % of the last line's caps
      var lastTop = fc.top - m.cap * 0.45, firstTop = lastTop - pitch * (lines.length - 1);
      var need = Math.max(0, top0 - firstTop);
      built.push({ gp: gp, lines: lines, S: S, m: m, pitch: pitch, need: need });
      maxD = Math.max(maxD, need);
    });
    var D = Math.min(maxD, 420);
    built.forEach(function (b, gi) {
      var lastTop = fc.top + D - b.m.cap * 0.45, grp = H.abs(under, "left:0;top:0;width:1080px;height:1920px;visibility:hidden;transform-origin:540px " + Math.round(lastTop) + "px;");
      b.lines.forEach(function (l, k) {
        var capTop = lastTop - b.pitch * (b.lines.length - 1 - k);
        var d = el("div", "", esc(l.text)); setF(d, fo, b.S, col);
        // the line box: place the cap top exactly (ascent above cap comes from the font's own metrics)
        d.style.cssText += "position:absolute;left:0;width:1080px;text-align:center;white-space:nowrap;line-height:" + b.S + "px;letter-spacing:-0.02em;top:" + Math.round(capTop - capOff(fo, b.S, b.S)) + "px;";
        d.style.textShadow = lum(col) > 0.08 ? glow(col, 0.9) + ", 0 0.03em 0.18em rgba(0,0,0,.16)" : "0 4px 30px rgba(0,0,0,.25)";
        grp.appendChild(d);
        var at = Math.max(seg[0] + 0.04, l.toks[0].show - 0.05);
        if (!(ctx.frame1 && gi === 0)) tl.fromTo(d, { opacity: 0, scale: 1.07, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.32, ease: "expo.out", immediateRender: true }, at);
      });
      var tIn = Math.max(seg[0], b.gp.t0 - 0.06), next = built[gi + 1];
      if (ctx.frame1 && gi === 0) grp.style.visibility = "visible";
      tl.set(grp, { visibility: "visible" }, tIn);
      tl.fromTo(grp, { scale: 1 }, { scale: 1.03, duration: Math.max(0.5, (next ? next.gp.t0 : seg[1]) - tIn), ease: "none", immediateRender: false }, tIn);
      if (next) tl.to(grp, { opacity: 0, duration: 0.14, ease: "power2.in" }, Math.max(tIn + 0.3, next.gp.t0 - 0.16));
    });
    fadeOut(tl, under, ctx);
    // plain lowercase captions in front, lower third (ref "they're just"): the measured caption rules (1 to 2 words, hard cut on the word)
    var capF = bold(ctx), cs = 84, capBox = H.abs(ctx.over, "left:0;width:1080px;top:1330px;");
    H.beats({ seg: [seg[0], seg[1] - 0.25], L: {} }).forEach(function (bt) {
      var line = el("div", "", esc(bt.idx.map(function (i) { return K.caseText(String(K.W(i).text), "lower").replace(/[,.;:]+(?=["\u201d\u2019]?$)/, ""); }).join(" ")));
      line.style.cssText = "position:absolute;left:0;width:1080px;text-align:center;white-space:nowrap;line-height:1;letter-spacing:-0.01em;visibility:hidden;";
      setF(line, capF, cs, "#FFFFFF"); line.style.textShadow = ctx.L.shadow != null ? ctx.B.brand.shadow : shadowSoft(0.5);
      capBox.appendChild(line);
      tl.set(line, { visibility: "visible" }, bt.st); tl.set(line, { visibility: "hidden" }, Math.min(bt.en, seg[1] - 0.25));
    });
    fadeOut(tl, capBox, ctx);
    var P = plateDrive(ctx, tl, D, seg[0], 0, seg[1] - 0.55, 0.5);
    return { tl: tl, depth: true, fixed: true, teardown: function () { if (P) P.reset(); } };
  };

  /* ==================== HOOK: Quote box, speaker in front ====================
     Ref: a pale box with a heavy black two-line quote, left aligned near the frame edge; the speaker's
     head comes up in front of the box's lower edge; a big white stacked label sits beside the head. */
  R["hk-quote-box"] = function (ctx) {
    var L = ctx.L, tl = H.tl(), b = ctx.B.brand, fo = bold(ctx), fc = face(ctx), seg = ctx.seg;
    var paper = ctx.colourId === "white" ? (b.light || b.cream || "#F5F5F2") : ctx.hex;
    var ink = H.on(paper, ctx.hex2 || b.ink, ctx);
    var toks = H.allToks(ctx.hook()), left = 54, maxW = 1080 - left - 54;
    var padX = 0.3, padT = 0.2, padB = 0.24, lh = 1.06;
    // fill the box: two lines if the type stays big, else three
    var S = L.size || 92, R2 = rows(toks, 2, fo, 100), w2 = Math.max.apply(null, R2.map(function (r) { return tw(joinT(r), fo, 100, -0.01); })) / 100;
    var s2 = Math.min(S, Math.floor(maxW / (w2 + padX * 2))), rr = R2, sz = s2;
    if (s2 < Math.min(S, 78) && toks.length > 4) { var R3 = rows(toks, 3, fo, 100), w3 = Math.max.apply(null, R3.map(function (r) { return tw(joinT(r), fo, 100, -0.01); })) / 100; var s3 = Math.min(S, Math.floor(maxW / (w3 + padX * 2))); if (s3 > s2 * 1.12) { rr = R3; sz = s3; } }
    var m = met(fo, sz), boxH = Math.round(sz * (padT + padB + lh * rr.length));
    // the head breaks over the lowest quarter of the box
    var boxTopWant = fc.top + boxH * 0.24 - boxH, minTop = 150, D = Math.min(420, Math.max(0, minTop - boxTopWant)), boxTop = Math.round(boxTopWant + D);
    var wrap = H.abs(ctx.under, "left:" + left + "px;top:" + boxTop + "px;");
    var box = el("div"); box.style.cssText = "background:" + paper + ";border-radius:" + Math.round(sz * 0.07) + "px;padding:" + Math.round(sz * padT) + "px " + Math.round(sz * padX) + "px " + Math.round(sz * padB) + "px;box-shadow:0 14px 40px rgba(0,0,0,.18);transform-origin:50% 0%;";
    var lineEls = [];
    rr.forEach(function (r) {
      var mk = el("div"); mk.style.cssText = "overflow:hidden;";
      var ln = el("div", "", esc(joinT(r))); setF(ln, fo, sz, ink); ln.style.cssText += "white-space:nowrap;line-height:" + lh + ";letter-spacing:-0.01em;";
      mk.appendChild(ln); box.appendChild(mk); lineEls.push(ln);
    });
    wrap.appendChild(box);
    var t0 = seg[0] + 0.06;
    if (!ctx.frame1) tl.fromTo(box, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.3, ease: "power3.out", immediateRender: true }, t0);
    if (!ctx.frame1) lineEls.forEach(function (ln, k) { tl.fromTo(ln, { yPercent: 105 }, { yPercent: 0, duration: 0.32, ease: "power3.out", immediateRender: true }, t0 + 0.1 + k * 0.06); });
    fadeOut(tl, wrap, ctx);
    // the stacked label: the role half of hook_label ("founder of VIDPOD"), white, as big as the quote, beside the head
    var raw = String(ctx.B.base.hook_label || ctx.B.base.role || ""), part = raw.indexOf(",") > 0 ? raw.slice(raw.indexOf(",") + 1).trim() : raw;
    part = part.charAt(0).toUpperCase() + part.slice(1);
    var lw = part.split(/\s+/), labF = bold(ctx), rightLim = fc.x - fc.r * 0.36, lx = left + 6, avail = rightLim - lx;
    // stack it in 1 to 3 rows, whichever lets the type run biggest (ref: "Sexual / behavior / expert")
    var labRows = [lw], ls = 0;
    for (var nr = 1; nr <= Math.min(3, lw.length); nr++) {
      var rr2 = rows(lw, nr, labF, 100), sz2 = Math.min(sz * 1.05, Math.min.apply(null, rr2.map(function (r) { return avail / tw(joinT(r), labF, 100, -0.015) * 100; })));
      var orphan = rr2.some(function (r) { return r.length === 1 && String(r[0]).length <= 3; });
      if (!orphan && sz2 > ls * 1.06) { ls = sz2; labRows = rr2; }
    }
    ls = Math.max(44, Math.floor(ls));
    var lab = H.abs(ctx.over, "left:" + lx + "px;top:" + Math.round(boxTop + boxH + sz * 0.22) + "px;");
    labRows.forEach(function (r, k) {
      var d = el("div", "", esc(joinT(r))); setF(d, labF, ls, "#FFFFFF"); d.style.cssText += "white-space:nowrap;line-height:1.0;letter-spacing:-0.015em;"; d.style.textShadow = ctx.L.shadow != null ? ctx.B.brand.shadow : shadowSoft(0.55);
      lab.appendChild(d);
      if (!ctx.frame1) tl.fromTo(d, { x: -26, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power3.out", immediateRender: true }, t0 + 0.24 + k * 0.07);
    });
    fadeOut(tl, lab, ctx);
    var P = plateDrive(ctx, tl, D, seg[0], 0, seg[1] - 0.55, 0.5);
    return { tl: tl, depth: true, fixed: true, teardown: function () { if (P) P.reset(); } };
  };

  /* ==================== HOOK: Mixed-scale stack ====================
     Ref: one huge glowing word over the chest; the small words tuck into its gaps: lead words sit
     down over the x-height letters after the capital, more small words top right, the rest under the
     right end where there are no descenders. Built word by word as spoken; stacks hard cut. */
  R["hk-mixed-stack"] = function (ctx) {
    var L = ctx.L, tl = H.tl(), seg = ctx.seg, col = ctx.hex, small = ctx.hex2 || "#FFFFFF";
    var hf = bold(ctx), sf = bold(ctx), block = H.block(), G = H.grp(block), stacks = [];
    var boxEl = el("div"); boxEl.style.cssText = "position:relative;"; G.inner.appendChild(boxEl);
    var W0 = 0, H0 = 0;
    keyGroups(ctx).forEach(function (gp, gi) {
      var F1 = ctx.frame1 && gi === 0, heroText = joinT(gp.key), S = L.size || 230, wmax = 900;
      var hw = tw(heroText, hf, S, -0.03); if (hw > wmax) { S = Math.floor(S * wmax / hw); hw = tw(heroText, hf, S, -0.03); }
      var m = met(hf, S), s = Math.round(S * 0.36), sm = met(sf, s);
      // glyph map of the hero: which x spans are short letters (room above), which have no descenders (room below)
      var chars = [], acc = 0, ls = -0.03 * S;
      for (var i = 0; i < heroText.length; i++) { var c = heroText[i], w = tw(c, hf, S) + ls; chars.push({ c: c, x0: acc, x1: acc + w, tall: /[A-Z0-9bdfhklt'"!?&@#%ij]/.test(c), desc: /[gjpqy,;]/.test(c) }); acc += w; }
      hw = acc - ls;
      function clearOver(x0, x1, key) { return chars.every(function (ch) { return ch.x1 <= x0 + 4 || ch.x0 >= x1 - 4 || ch.c === " " || !ch[key]; }); }
      function findSpan(wid, key, fromRight) { // a gap wide enough, searched from the left (or right)
        var step = 6, best = null;
        for (var x = 0; x + wid <= hw + 2; x += step) { if (clearOver(x, x + wid, key)) { if (!fromRight) return x; best = x; } }
        return best;
      }
      // rows: lead words above (left, then right), follow words below right
      var leadRows = gp.lead.length ? (gp.lead.length > 3 ? rows(gp.lead, 2, sf, s) : [gp.lead]) : [];
      var folRows = gp.follow.length ? (gp.follow.length > 3 ? rows(gp.follow, 2, sf, s) : [gp.follow]) : [];
      var capTop = 0, base = m.cap, tuckUp = (m.cap - m.xh) * 0.9, kiss = (m.cap - m.xh) * 0.1, items = [];
      var place = function (toks, x, baseY) { items.push({ toks: toks, x: x, base: baseY }); };
      var rw = function (r) { return tw(joinT(r), sf, s, -0.01); };
      if (leadRows[0]) {
        var w1 = rw(leadRows[0]), x1 = findSpan(w1 + 8, "tall", false), ok1 = x1 != null && x1 < hw * 0.5;
        place(leadRows[0], ok1 ? x1 + 4 : 0, ok1 ? capTop + tuckUp : capTop + kiss);
      }
      var topRight = leadRows[1] || (folRows.length > 1 || (folRows[0] && folRows[0].length > 2) ? folRows.shift() : null);
      if (topRight) {
        var w2 = rw(topRight), x2 = findSpan(w2 + 8, "tall", true), ok2 = x2 != null && x2 > hw * 0.35 && (!items[0] || x2 > items[0].x + rw(items[0].toks) + 20);
        place(topRight, ok2 ? x2 + 4 : hw - w2, ok2 ? capTop + tuckUp : capTop + kiss);
      }
      folRows.forEach(function (r, k) {
        var w3 = rw(r), x3 = findSpan(w3 + 8, "desc", true), ok3 = x3 != null && x3 > hw * 0.25;
        var below = base + (ok3 ? S * 0.07 : m.desc + S * 0.04) + sm.cap + k * s * 1.05;
        place(r, ok3 ? Math.min(x3 + 4, hw - w3) : hw - w3, below);
      });
      // rows that would touch: above the hero the earlier row steps up a line, below it the later row steps down
      items.forEach(function (a, i) { items.slice(i + 1).forEach(function (b2) {
        var ax = [a.x, a.x + rw(a.toks)], bx = [b2.x, b2.x + rw(b2.toks)];
        if (Math.abs(a.base - b2.base) < s * 0.9 && ax[0] < bx[1] + s * 0.4 && bx[0] < ax[1] + s * 0.4) { if (a.base < m.cap * 0.5) a.base = b2.base - s * 1.02; else b2.base = a.base + s * 1.02; }
      }); });
      // build the stack as absolutely placed spans in a box the size of the hero
      var st = el("div"); st.style.cssText = "position:absolute;left:0;top:0;width:" + Math.round(hw) + "px;height:" + Math.round(m.cap) + "px;visibility:hidden;";
      var shade = el("div"); shade.style.cssText = "position:absolute;left:" + Math.round(-S * 0.35) + "px;top:" + Math.round(-S * 0.55) + "px;width:" + Math.round(hw + S * 0.7) + "px;height:" + Math.round(m.cap + S * 1.1) + "px;border-radius:50%;background:radial-gradient(closest-side, rgba(0,0,0,.34), rgba(0,0,0,.16) 55%, rgba(0,0,0,0));";
      st.appendChild(shade);

      var gl = el("div", "", esc(heroText)), he = el("div", "", esc(heroText));
      [gl, he].forEach(function (d) { setF(d, hf, S, col); d.style.cssText += "position:absolute;left:0;top:" + Math.round(-capOff(hf, S, S * 1.2)) + "px;white-space:nowrap;line-height:" + Math.round(S * 1.2) + "px;letter-spacing:-0.03em;"; });
      gl.style.filter = "blur(" + Math.round(S * 0.09) + "px)"; gl.style.opacity = 0.75; gl.style.color = col;
      he.style.textShadow = "0 0 0.12em " + rgba(col, 0.45) + ", 0 0.03em 0.16em rgba(0,0,0,.35)";
      st.appendChild(gl); st.appendChild(he);

      var minY = 0, maxY = m.cap + m.desc;
      items.forEach(function (it) {
        var r = el("div"); r.style.cssText = "position:absolute;white-space:nowrap;left:" + Math.round(it.x) + "px;top:" + Math.round(it.base - sm.cap - capOff(sf, s, s * 1.2)) + "px;line-height:" + Math.round(s * 1.2) + "px;letter-spacing:-0.01em;";
        setF(r, sf, s, small); r.style.textShadow = lum(small) > 0.3 ? "0 2px 10px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.35)" : "none";
        it.toks.forEach(function (t, j) { var sp = el("span", "", esc(t.text) + (j < it.toks.length - 1 ? " " : "")); sp.style.display = "inline-block"; sp.style.whiteSpace = "pre"; r.appendChild(sp); if (!F1) tl.fromTo(sp, { opacity: 0, y: 10 }, { opacity: 0.94, y: 0, duration: 0.14, ease: "power2.out", immediateRender: true }, Math.max(seg[0], t.show - 0.03)); });
        st.appendChild(r);
        minY = Math.min(minY, it.base - sm.cap - 6); maxY = Math.max(maxY, it.base + sm.desc);
      });
      var at = Math.max(seg[0], gp.key[0].show - 0.04);
      if (F1) { gl.style.opacity = 0.6; st.style.visibility = "visible"; }
      else {
        tl.fromTo(he, { opacity: 0, scale: 1.12, filter: "blur(8px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out", immediateRender: true }, at);
        tl.fromTo(gl, { opacity: 0 }, { opacity: 0.95, duration: 0.12, ease: "power2.out", immediateRender: true }, at);
        tl.fromTo(shade, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: true }, Math.max(seg[0], at - 0.1));
        tl.to(gl, { opacity: 0.6, duration: 0.45, ease: "power2.inOut" }, at + 0.14);
      }
      boxEl.appendChild(st);
      stacks.push({ st: st, t: Math.max(seg[0], gp.t0 - 0.06), w: hw, minY: minY, maxY: maxY });
      W0 = Math.max(W0, hw); H0 = Math.max(H0, maxY - minY);
    });
    // every stack centred in one box; the engine places the box (position control)
    boxEl.style.width = Math.round(W0) + "px"; boxEl.style.height = Math.round(H0) + "px"; boxEl.style.flex = "none";
    G.inner.style.width = Math.round(W0) + "px"; G.inner.style.flex = "none";
    stacks.forEach(function (s, k) {
      s.st.style.left = Math.round((W0 - s.w) / 2) + "px"; s.st.style.top = Math.round((H0 - (s.maxY - s.minY)) / 2 - s.minY) + "px";
      tl.set(s.st, { visibility: "visible" }, s.t);
      if (k < stacks.length - 1) tl.set(s.st, { visibility: "hidden" }, stacks[k + 1].t);
    });
    fadeOut(tl, boxEl, ctx);
    return { block: block, tl: tl };
  };

  /* ==================== HOOK: Highlight bars ====================
     Ref (The Numbers Game): 2 to 4 short centred lines in a heavy sans, white with a dark edge; a flat
     bar sits behind the lower half of each line (x-height to just under the baseline); top lines in
     the first colour, bottom lines in the second. Over the lower middle of the frame. */
  R["hk-highlight-bars"] = function (ctx) {
    var L = ctx.L, tl = H.tl(), seg = ctx.seg, b = ctx.B.brand, fo = bold(ctx);
    var c1 = ctx.hex, c2 = ctx.hex2 || (ctx.colourId === "primary" ? b.ink : b.accent);
    var toks = H.allToks(ctx.hook()), S = L.size || 128, maxW = 920;
    // lines of at most ~16 characters (TNG), balanced
    var n = Math.max(2, Math.min(4, Math.ceil(joinT(toks).length / 16))), rr = rows(toks, n, fo, S);
    var widest = Math.max.apply(null, rr.map(function (r) { return tw(joinT(r), fo, S, -0.01); }));
    if (widest > maxW) S = Math.floor(S * maxW / widest);
    var m = met(fo, S), pitch = Math.round(S * 1.02), block = H.block(), G = H.grp(block);
    var n1 = Math.max(1, Math.floor(rr.length / 2));
    var light = function (h) { return lum(h) > 0.55; };
    var stack = el("div"); stack.style.cssText = "position:relative;width:" + Math.round(maxW + 120) + "px;height:" + Math.round(pitch * (rr.length - 1) + m.cap + S * 0.3) + "px;";
    rr.forEach(function (r, k) {
      var text = joinT(r), w = tw(text, fo, S, -0.01), bar = k < n1 ? c1 : c2, x = Math.round((maxW + 120 - w) / 2), capTop = k * pitch;
      var bt = capTop + m.cap - m.xh * 0.86, bb = capTop + m.cap + S * 0.25;
      var bg = el("div"); bg.style.cssText = "position:absolute;left:" + Math.round(x - S * 0.12) + "px;width:" + Math.round(w + S * 0.26) + "px;top:" + Math.round(bt) + "px;height:" + Math.round(bb - bt) + "px;background:" + bar + ";transform-origin:0% 50%;";
      var ink = b.ink && H.contrast(bar, b.ink) > H.contrast(bar, "#FFFFFF") ? b.ink : "#FFFFFF";   // dark words on light bars (TNG: black on mint), 8 Nov 2026
      var t = el("div", "", esc(text)); setF(t, fo, S, ink);
      t.style.cssText += "position:absolute;left:" + x + "px;top:" + Math.round(capTop - capOff(fo, S, S * 1.2)) + "px;white-space:nowrap;line-height:" + Math.round(S * 1.2) + "px;letter-spacing:-0.01em;";
      t.style.textShadow = ink === "#FFFFFF" ? "0 0.035em 0 rgba(10,8,30,.6), 0 0 0.04em rgba(10,8,30,.6), 0 0 0.08em rgba(10,8,30,.35), 0 0.05em 0.16em rgba(0,0,0,.3)" : "none";
      stack.appendChild(bg); stack.appendChild(t);
      var at = seg[0] + 0.08 + k * 0.1;
      if (!ctx.frame1) tl.fromTo(bg, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power4.out", immediateRender: true }, at);
      if (!ctx.frame1) tl.fromTo(t, { opacity: 0, y: S * 0.18 }, { opacity: 1, y: 0, duration: 0.26, ease: "power3.out", immediateRender: true }, at + 0.06);
    });
    G.inner.appendChild(stack);
    fadeOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };

  /* ==================== HOOK: Serif keyword ====================
     Ref (editorial pair): the lead words in heavy caps, white, centred near the top; the keyword huge in
     a serif (the brand's script on @pilates) in the brand colour, its top tucked into the caps line,
     sitting behind the head so the hair clips it. */
  R["hk-serif-keyword"] = function (ctx) {
    var L = ctx.L, tl = H.tl(), seg = ctx.seg, fc = face(ctx), col = ctx.hex, sansCol = ctx.hex2 || "#FFFFFF";
    var sf = heavy(ctx), kf = serif(ctx), groups = keyGroups(ctx), wmax = 960, maxD = 0, built = [];
    groups.forEach(function (gp) {
      var kt = joinT(gp.key), KS = L.size || (kf.script ? 330 : 260), kw = tw(kt, kf, KS, -0.02); if (kw > wmax) KS = Math.floor(KS * wmax / kw);
      var km = met(kf, KS), lead = gp.lead.map(function (t) { return { text: upper(t.text), t: t.t, show: t.show }; });
      var ss = Math.round(Math.min(124, Math.max(64, KS * 0.46))), lr = lead.length ? rows(lead, lead.length > 3 ? 2 : 1, sf, ss) : [];
      lr.forEach(function (r) { var w = tw(joinT(r), sf, ss, -0.01); if (w > wmax) ss = Math.floor(ss * wmax / w); });
      var sm = met(sf, ss), spitch = sm.cap * 1.22, sansH = lr.length ? spitch * (lr.length - 1) + sm.cap : 0;
      // keyword: its x-height top overlaps the last caps line a little; the head covers the bottom 35 % of its x-height
      var tuck = kf.script ? km.xh * 0.1 : km.xh * 0.18;
      var kBase = fc.top + km.xh * 0.24, sansTop = kBase - km.asc + (km.asc - km.xh) * 0.12 - sm.cap * 0.22 - sansH;
      var need = Math.max(0, ((ctx.B.safe && ctx.B.safe.y0) ? ctx.B.safe.y0 + 20 : 150) - sansTop);   // keep the caps under the app's top bar (board safe area; was a fixed 150, found by the QA on Alisha V1, 7 Nov 2026)
      built.push({ gp: gp, kt: kt, KS: KS, km: km, lr: lr, ss: ss, sm: sm, spitch: spitch, sansH: sansH, tuck: tuck });
      maxD = Math.max(maxD, need);
    });
    var D = Math.min(maxD, 420), under = H.abs(ctx.under, "left:0;top:0;width:1080px;height:1920px;"), over = H.abs(ctx.over, "left:0;top:0;width:1080px;height:1920px;");
    built.forEach(function (bd, gi) {
      var kBase = fc.top + D + bd.km.xh * 0.24, sansTop = kBase - bd.km.asc + (bd.km.asc - bd.km.xh) * 0.12 - bd.sm.cap * 0.22 - bd.sansH;
      var gU = H.abs(under, "left:0;top:0;width:1080px;height:1920px;visibility:hidden;"), gO = H.abs(over, "left:0;top:0;width:1080px;height:1920px;visibility:hidden;");
      // keyword (behind the head)
      var kd = el("div", "", esc(bd.kt)); setF(kd, kf, bd.KS, col);
      kd.style.cssText += "position:absolute;left:0;width:1080px;text-align:center;white-space:nowrap;letter-spacing:-0.02em;line-height:" + Math.round(bd.KS * 1.3) + "px;top:" + Math.round(kBase - bd.km.cap - capOff(kf, bd.KS, bd.KS * 1.3)) + "px;";
      kd.style.textShadow = "0 0.02em 0.2em rgba(0,0,0,.22)";
      gU.appendChild(kd);
      // caps lines (in front)
      var slh = Math.round(bd.ss * 1.1), soff = capOff(sf, bd.ss, slh);
      bd.lr.forEach(function (r, k) {
        var mk = el("div"); mk.style.cssText = "position:absolute;left:0;width:1080px;overflow:hidden;top:" + Math.round(sansTop + k * bd.spitch - soff) + "px;height:" + slh + "px;";
        var ln = el("div", "", esc(joinT(r))); setF(ln, sf, bd.ss, sansCol); ln.style.cssText += "text-align:center;white-space:nowrap;letter-spacing:-0.01em;line-height:" + slh + "px;"; ln.style.textShadow = lum(sansCol) > 0.3 ? "0 2px 14px rgba(0,0,0,.35)" : "none";
        mk.appendChild(ln); gO.appendChild(mk);
        if (!(ctx.frame1 && gi === 0)) tl.fromTo(ln, { yPercent: 105 }, { yPercent: 0, duration: 0.42, ease: "expo.out", immediateRender: true }, Math.max(seg[0] + 0.04 + k * 0.07, r[0].show - 0.06));
      });
      var at = Math.max(seg[0] + 0.1, bd.gp.key[0].show - 0.08);
      if (ctx.frame1 && gi === 0) { gU.style.visibility = gO.style.visibility = "visible"; }
      else tl.fromTo(kd, { opacity: 0, filter: "blur(14px)", letterSpacing: "0.03em" }, { opacity: 1, filter: "blur(0px)", letterSpacing: "-0.02em", duration: 0.45, ease: "power2.out", immediateRender: true }, at);
      var tIn = Math.max(seg[0], bd.gp.t0 - 0.08), next = built[gi + 1];
      tl.set([gU, gO], { visibility: "visible" }, tIn);
      if (next) tl.to([gU, gO], { opacity: 0, duration: 0.16, ease: "power2.in" }, Math.max(tIn + 0.3, next.gp.t0 - 0.24));
    });
    fadeOut(tl, [under, over], ctx);
    var P = plateDrive(ctx, tl, D, seg[0], 0, seg[1] - 0.55, 0.5);
    return { tl: tl, depth: true, fixed: true, teardown: function () { if (P) P.reset(); } };
  };

  /* ==================== HOOK: Headline band, head pops out ====================
     Ref (crystfilm pin, compare sheet compare_headline-band.jpg, left): a solid band holds a rounded window of the
     footage; the heavy caps headline sits in the window, behind the speaker; the speaker's head breaks out over the
     window's top edge onto the band. Here: the band (second colour) covers the top of the frame with a rounded window
     cut into it; band and headline sit in the under layer, so the person matte (cut-out) is drawn in front of both.
     The window's top edge is set just under the top of the head (base.face.hook_top), so the head pops out of it. */
  R["hk-headline-band"] = function (ctx) {
    // Fix 7 Nov (make-a-look proof on Alisha: the head hid the middle of the words): the words sit ON the band, above the
    // head, never behind the face. The window's top edge sits just under the top of the head, so the head still pops out
    // over it, and only that edge is overlapped. The plate (footage + matte) moves down to make the room; the gap it
    // leaves is behind the solid band, so it never shows.
    var L = ctx.L, tl = H.tl(), seg = ctx.seg, b = ctx.B.brand, fc = face(ctx), fo = heavy(ctx), F1 = !!ctx.frame1;
    var band = ctx.hex2 || b.ink || "#0A0A0A", ink = ctx.hex || "#FFFFFF";
    var toks = H.allToks(ctx.hook()).map(function (t) { return { text: upper(t.text), t: t.t }; });
    var M = 40, R0 = 30, pad = 46, left = M + pad, maxW = 1080 - left * 2, Smax = L.size || 150;
    var chars = joinT(toks).length, n = Math.max(1, Math.min(4, Math.ceil(chars / 16))), rr = rows(toks, n, fo, Smax);
    var lines = rr.map(function (r) { var t = joinT(r), s2 = Math.min(Smax, Math.floor(Smax * maxW / tw(t, fo, Smax, -0.02))); return { r: r, text: t, s: s2 }; });
    var sMin = Math.min.apply(null, lines.map(function (l) { return l.s; }));
    lines.forEach(function (l) { l.s = Math.min(l.s, Math.round(sMin * 1.25)); l.m = met(fo, l.s); });
    var gap = function (l) { return l.m.cap * 0.26; }, y = 0; lines.forEach(function (l) { l.capTop = y; y += l.m.cap + gap(l); });
    var textH = y - gap(lines[lines.length - 1]);
    var textTop = 200, textBot = textTop + textH;
    // the head top must sit 28 px under the words; the window's top edge 60 px under the head top
    var D = Math.min(420, Math.max(0, textBot + 28 - fc.top)), headTop = fc.top + D;
    // 8 Nov 2026 (Tommy: "why is there some sort of random hole, rectangle hole?"): the window now runs to the bottom of
    // the frame, so it reads as the video in a frame under the headline, not a slot cut in the band.
    var winTop = Math.round(headTop + 60), winBot = 1920 - M, bandBot = 1920;
    var strip = H.abs(ctx.under, "left:0;top:0;width:1080px;height:" + bandBot + "px;overflow:hidden;");
    H.abs(strip, "left:" + M + "px;top:" + winTop + "px;width:" + (1080 - 2 * M) + "px;height:" + (winBot - winTop) + "px;border-radius:" + R0 + "px;box-shadow:0 0 0 2400px " + band + ";");
    var txtBox = H.abs(ctx.under, "left:0;top:0;width:1080px;height:" + winTop + "px;");
    lines.forEach(function (l, k) {
      var blh = Math.round(l.s * 1.0), boff = capOff(fo, l.s, blh);
      var mk = el("div"); mk.style.cssText = "position:absolute;left:" + left + "px;width:" + maxW + "px;overflow:hidden;top:" + Math.round(textTop + l.capTop - boff) + "px;height:" + blh + "px;";
      var d = el("div", "", esc(l.text)); setF(d, fo, l.s, ink); d.style.cssText += "white-space:nowrap;letter-spacing:-0.02em;line-height:" + blh + "px;";
      if (ctx.L.shadow != null) d.style.textShadow = ctx.B.brand.shadow;
      mk.appendChild(d); txtBox.appendChild(mk);
      if (!F1) tl.fromTo(d, { yPercent: 108 }, { yPercent: 0, duration: 0.4, ease: "expo.out", immediateRender: true }, Math.max(seg[0] + 0.3 + k * 0.09, l.r[0].t - 0.05));
    });
    var tIn = seg[0] + 0.02, dIn = F1 ? 0 : 0.5;
    if (!F1) tl.fromTo(strip, { yPercent: -101 }, { yPercent: 0, duration: dIn, ease: "power3.out", immediateRender: true }, tIn);
    tl.to([strip, txtBox], { yPercent: -101, duration: 0.36, ease: "power2.in" }, seg[1] - 0.38);
    var P = plateDrive(ctx, tl, D, F1 ? seg[0] : tIn, dIn, seg[1] - 0.38, 0.36);
    return { tl: tl, depth: true, fixed: true, teardown: function () { if (P) P.reset(); } };
  };

  /* ==================== HOOK: Glow title, pull-back ====================
     Ported from the measured reference (MECHANISMS.md "Caption rules, from the measured reference", Glow title): a white
     setup line over a punch line in the brand colour, heavy caps, a tight bloom plus two wide hazes. The whole frame
     (footage and title) opens punched in 25 % and pulls back on one double-exponential curve around a point a third of the
     way down; the title fades up as 1 - e^(-t/0.17 s) and holds 3 to 5 s (default 4) over a soft dark grade, then the
     house subtitles take over. On screen from the first frame. The words are a headline, not a quote. */
  var GZ = { fa: 0.0463, fs: 0.07, sa: 0.2038, ss: 1.11, win: 6, oy: 0.316 };
  function gEx(t) { return GZ.fa * Math.exp(-t / GZ.fs) + GZ.sa * Math.exp(-t / GZ.ss); }
  var GZ0 = 1 + GZ.fa + GZ.sa;
  function gEase(p) { return (GZ0 - 1 - gEx(p * GZ.win)) / (GZ0 - 1 - gEx(GZ.win)); }
  function gScale(t) { return t <= 0 ? GZ0 : t >= GZ.win ? 1 : GZ0 - (GZ0 - 1) * gEase(t / GZ.win); }
  H.glowScale = gScale;
  R["hk-glow-intro"] = function (ctx) {
    var L = ctx.L, tl = H.tl(), seg = ctx.seg, fo = heavy(ctx), acc = ctx.hex;
    if (/^montserrat$/i.test(fo.family)) fo = { family: fo.family, weight: 900 };   // the measured face: Montserrat Black
    var hk = ctx.hook(), l1 = "", l2 = "";
    if (hk.length >= 2) { l1 = joinT(hk[0]); l2 = joinT(H.allToks(hk.slice(1))); }
    else if (hk.length) { var all = hk[0], k0 = -1; all.forEach(function (t, i) { if (t.emph && k0 < 0) k0 = i; }); if (k0 > 0) { l1 = joinT(all.slice(0, k0)); l2 = joinT(all.slice(k0)); } else l2 = joinT(all); }
    l1 = upper(l1); l2 = upper(l2);
    var Wd = 1080, ts = (L.size || 100) / 100.2, S1 = 0.0802 * Wd * ts, S2n = 0.0928 * Wd * ts, S2 = S2n, maxW = 0.8 * Wd;
    if (l1 && tw(l1, fo, S1) > maxW) S1 *= maxW / tw(l1, fo, S1);
    if (l2 && tw(l2, fo, S2) > maxW) S2 *= maxW / tw(l2, fo, S2);
    var m1 = met(fo, S1), m2 = met(fo, S2), gap = 0.07 * S2n, cy = L.y || 1114;
    var tot = (l1 ? m1.cap + gap : 0) + m2.cap, y1 = cy - tot / 2, y2 = y1 + (l1 ? m1.cap + gap : 0);
    var top2 = ctx.hex2 && ctx.colour2Id !== "white" ? ctx.hex2 : null;
    var setupFill = top2 || "linear-gradient(180deg," + H.mixHex("#FFFFFF", acc, 0.03) + " 21%," + H.mixHex("#FFFFFF", acc, 0.06) + " 50%," + H.mixHex("#FFFFFF", acc, 0.087) + " 79%)";
    var punchFill = "linear-gradient(180deg," + H.mixHex(acc, "#FFFFFF", 0.03) + " 21%," + acc + " 50%," + H.mixHex(acc, "#000000", 0.06) + " 68%," + H.mixHex(acc, "#000000", 0.13) + " 79%)";
    // 8 Nov 2026 (Tommy: "I can't change that sort of drop shadow that you're using behind"): Glow and Dark shade are adjustable
    var gk = L.glow == null ? 1 : Math.max(0, +L.glow) / 100, gradeK = L.grade == null ? 0.8 : Math.max(0, +L.grade) / 100;
    var glowSh = function (rgb, widest) { if (!gk) return "none"; return "0 0 0.15em rgba(" + rgb + "," + (0.2 * gk).toFixed(3) + "), 0 0 1.1em rgba(" + rgb + "," + Math.min(1, 0.6 * gk).toFixed(3) + "), 0 0 2.2em rgba(" + rgb + "," + Math.min(1, widest * gk).toFixed(3) + ")"; };
    var lineSpec = [];
    if (l1) lineSpec.push({ text: l1, S: S1, m: m1, top: y1, fill: setupFill, solid: top2 || H.mixHex("#FFFFFF", acc, 0.06), glow: H.rgbOf(H.mixHex(top2 || acc, "#FFFFFF", 0.9)), widest: 0.6 });
    if (l2) lineSpec.push({ text: l2, S: S2, m: m2, top: y2, fill: punchFill, solid: acc, glow: H.rgbOf(H.mixHex(acc, "#FFFFFF", 0.15)), widest: 0.25 });
    // dark grade under the title so the glow reads on bright footage (x 0.8)
    var grade = H.abs(ctx.over, "left:0;top:0;width:1080px;height:1920px;opacity:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.6) 48%,rgba(0,0,0,.82) 62%,rgba(0,0,0,.92) 100%);");
    var title = H.abs(ctx.over, "left:0;top:0;width:1080px;height:1920px;transform-origin:540px " + Math.round(1920 * GZ.oy) + "px;opacity:0;");
    var spans = [];
    ["glow", "face"].forEach(function (pass) {
      lineSpec.forEach(function (l) {
        var lh = Math.round(l.S), off = capOff(fo, l.S, lh);
        var row = el("div"); row.style.cssText = "position:absolute;left:0;width:1080px;text-align:center;white-space:nowrap;top:" + Math.round(l.top - off) + "px;height:" + lh + "px;line-height:" + lh + "px;";
        var sp = el("span", "", esc(l.text)); setF(sp, fo, Math.round(l.S * 100) / 100);
        if (pass === "glow") { sp.style.color = l.solid; sp.style.textShadow = glowSh(l.glow, l.widest); }
        else { sp.style.cssText += "padding:0.25em 0.1em;margin:-0.25em -0.1em;color:transparent;-webkit-text-fill-color:transparent;background-image:" + (/gradient/.test(l.fill) ? l.fill : "linear-gradient(" + l.fill + "," + l.fill + ")") + ";-webkit-background-clip:text;background-clip:text;"; }
        row.appendChild(sp); title.appendChild(row); spans.push(sp);
      });
    });
    // one clock drives the camera (footage + title), the tracking, the fade and the grade, so scrubbing and renders match
    var m = ctx.media, d = seg[1] - seg[0], end = seg[0] + Math.max(d, GZ.win);
    var o = { t: seg[0] };
    var apply = function () {
      var t = o.t - seg[0], sc = gScale(t), sPrev = gScale(Math.max(0, t - 0.02)), share = (sPrev - sc) / sc;
      title.style.transform = "scale(" + sc.toFixed(5) + ")";
      var ls = (0.035 * (1 - gEase(Math.min(1, Math.max(0, t / GZ.win))))).toFixed(4) + "em";
      spans.forEach(function (sp) { sp.style.letterSpacing = ls; });
      var fin = t >= 0.8 ? 1 : (1 - Math.exp(-t / 0.17)) / (1 - Math.exp(-0.8 / 0.17)), u = Math.max(0, Math.min(1, (seg[1] - o.t) / 0.25)), fout = 1 - (1 - u) * (1 - u);
      title.style.opacity = (o.t >= seg[1] ? 0 : fin * fout).toFixed(3);
      var gi = Math.min(1, t / 0.3), gIn = 1 - (1 - gi) * (1 - gi), gu = Math.max(0, Math.min(1, (seg[1] - o.t) / 0.3)), gOut = 1 - (1 - gu) * (1 - gu);
      grade.style.opacity = (o.t >= seg[1] ? 0 : gradeK * gIn * gOut).toFixed(3);
      if (m && !ctx.card) { m.style.transformOrigin = "50% " + (GZ.oy * 100) + "%"; m.style.transform = sc > 1.0001 ? "scale(" + sc.toFixed(5) + ")" : ""; var bl = 1080 * share * 0.2; m.style.filter = bl > 0.3 ? "blur(" + bl.toFixed(2) + "px)" : ""; }
    };
    tl.fromTo(o, { t: seg[0] }, { t: end, duration: end - seg[0], ease: "none", immediateRender: true, onUpdate: apply }, seg[0]);
    apply();
    return { tl: tl, fixed: true, moves: true, teardown: function () { if (m) { m.style.transform = ""; m.style.filter = ""; m.style.transformOrigin = ""; } } };
  };
});
