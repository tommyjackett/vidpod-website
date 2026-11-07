/* VIDPOD Style Studio v3: the looks, part 1 (helpers, subtitles, hooks, name cards).
   Every renderer takes ctx and returns { block?, tl, depth?, fixed?, blockUnder?, after?, teardown? }.
   Times are seconds on the base video. Positions are px on the 1080x1920 canvas.
   Nothing client-specific lives here: words, colours, fonts, logo and shapes come from board.json (ctx.B). */
window.VPLooks = function (K) {
  "use strict";
  var R = {}, el = K.el, esc = K.esc, W = K.W, wt = K.wt, textW = K.textW;

  /* ================= helpers ================= */
  var H = {};
  H.tl = function () { return gsap.timeline({ paused: true }); };
  H.fam = function (f, display) { return "\"" + (display ? f.display : f.family) + "\", system-ui, sans-serif"; };
  H.txt = function (node, ctx, weight, display, colour) {
    node.style.fontFamily = H.fam(ctx.f, display); node.style.fontWeight = weight; node.style.color = colour || ctx.hex;
    node.style.textShadow = (colour && !K.isLight(colour)) ? "none" : ctx.shadow; node.style.fontSynthesis = "none";
    if (ctx.L.fx === "stroke" && (!colour || K.isLight(colour))) { node.style.webkitTextStroke = "0.07em rgba(20,16,16,.9)"; node.style.paintOrder = "stroke fill"; node.style.textShadow = "none"; }
    if (ctx.L.fx === "none" && (!colour || K.isLight(colour))) node.style.textShadow = "none";
    if (ctx.L.fx === "hard" && (!colour || K.isLight(colour))) node.style.textShadow = "0 0.06em 0 rgba(20,16,16,.9)";
  };
  H.block = function () { return el("div"); };
  H.grp = function (block, align) {
    var g = el("div", "grp" + (align === "left" ? " left" : "")), inner = el("div", "inner");
    inner.style.cssText = "display:flex;flex-direction:column;align-items:" + (align === "left" ? "flex-start" : "center") + ";";
    g.appendChild(inner); block.appendChild(g); return { g: g, inner: inner };
  };
  H.abs = function (parent, css, html, cls) { var e = el("div", cls || "", html); e.style.cssText = "position:absolute;" + (css || ""); parent.appendChild(e); return e; };
  H.hero = function (ctx) { return ctx.colourId === "white" ? ctx.B.brand.accent : ctx.hex; };
  // emphasis on footage: same colour as the line, marked with a fine underline in the brand accent (reads on any background)
  H.emphTok = function (s, ctx, col) { s.style.textDecoration = "underline"; s.style.textDecorationColor = col || ctx.B.brand.accent; s.style.textDecorationThickness = "0.085em"; s.style.textUnderlineOffset = "0.14em"; s.style.textDecorationSkipInk = "none"; };
  H.inkOn = function (bg, ctx) { return K.isLight(bg) ? ctx.B.brand.ink : "#FFFFFF"; };
  H.clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  H.ss = function (a, b, x) { var t = H.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  H.maxW = function (ctx) { return (ctx.safe.x1 - ctx.safe.x0) - 40; };
  H.emph = function (i) { return (K.board().base.emphasis || []).indexOf(i) >= 0; };
  H.mediaFX = function (ctx) { // tween proxy for the footage itself (exposure, blur, scale, offset); works on the video and on card stills
    var m = ctx.media, p = { b: 1, c: 1, s: 1, blur: 0, sc: 1, x: 0, y: 0, ox: 50, oy: 50 };
    p.apply = function () {
      var f = "";
      if (p.b !== 1 || p.c !== 1 || p.s !== 1) f += "brightness(" + p.b.toFixed(3) + ") contrast(" + p.c.toFixed(3) + ") saturate(" + p.s.toFixed(3) + ") ";
      if (p.blur > 0.05) f += "blur(" + ctx.px(p.blur).toFixed(2) + "px)";
      m.style.filter = f;
      m.style.transformOrigin = p.ox + "% " + p.oy + "%";
      m.style.transform = (p.x || p.y ? "translate(" + (p.x / 10.8).toFixed(3) + "%," + (p.y / 19.2).toFixed(3) + "%) " : "") + (p.sc !== 1 ? "scale(" + p.sc.toFixed(4) + ")" : "");
    };
    p.up = { onUpdate: p.apply };
    return p;
  };
  // fit lines of tokens to the safe width: wrap long lines, return [{toks, size}]
  H.wrap = function (lines, size, weight, family, maxW, gapEm) {
    // keep the writer's own lines: shrink everything (down to 72 %) before breaking a line
    var widest = Math.max.apply(null, lines.map(function (l) { return H.lineW(l, weight, size, family, gapEm); }).concat([1]));
    if (widest > maxW) size = Math.floor(size * Math.max(0.72, maxW / widest));
    var out = [], g = (gapEm == null ? 0.26 : gapEm) * size;
    lines.forEach(function (toks) {
      // a line that must break is split into rows of even width (no one-word orphan on the last row)
      var tot = H.lineW(toks, weight, size, family, gapEm), rows = Math.max(1, Math.ceil(tot / maxW)), target = tot / rows + g;
      var cur = [], w = 0;
      toks.forEach(function (tk) {
        var tw = textW(tk.text, weight, size, family) * 1.04;
        if (cur.length && (w + g + tw > maxW || (rows > 1 && w + g + tw / 2 > target))) { out.push(cur); cur = []; w = 0; }
        w += (cur.length ? g : 0) + tw; cur.push(tk);
      });
      if (cur.length) out.push(cur);
    });
    return out.map(function (toks) {
      var w = toks.reduce(function (a, tk, k) { return a + textW(tk.text, weight, size, family) * 1.04 + (k ? g : 0); }, 0);
      return { toks: toks, size: w > maxW ? Math.floor(size * maxW / w) : size };
    });
  };
  H.lineW = function (toks, weight, size, family, gapEm) { var g = (gapEm == null ? 0.26 : gapEm) * size; return toks.reduce(function (a, tk, k) { return a + textW(tk.text, weight, size, family) * 1.04 + (k ? g : 0); }, 0); };
  H.allToks = function (lines) { return lines.reduce(function (a, l) { return a.concat(l); }, []); };
  // per-word-rise landing ease (registry: piecewise cubic with a settle tail)
  var LS = 0.78, LR = 0.07, LSEAM = ((1 - LR) / LS) * 0.5;
  H.landEase = function (p) {
    if (p <= 0) return 0; if (p >= 1) return 1;
    if (p < LS) { var x = p / LS, inv = 1 - x; return (1 - LR) * (0.5 * (1 - inv * inv * inv) + 0.5 * x); }
    var u = (p - LS) / (1 - LS), b = LSEAM * (1 - LS), c = 3 * LR - 2 * b, d = b - 2 * LR;
    return 1 - LR + b * u + c * u * u + d * u * u * u;
  };
  var kcb = null;
  H.kcbEase = function () { if (!kcb) { try { gsap.registerPlugin(CustomEase); kcb = CustomEase.create("kcb-entry-ease", "M0,0 C0.2,0.8 0.2,1 1,1"); } catch (e) { kcb = "expo.out"; } } return kcb; };
  H.shape = function (ctx, w, h) { // the brand's shape (an arch for @pilates), from board.json brand.shape
    var sh = ctx.B.brand.shape || { kind: "rounded" };
    if (sh.kind === "arch") return (w / 2) + "px " + (w / 2) + "px 0 0";
    if (sh.kind === "circle") return "50%";
    return (sh.radius || 28) + "px";
  };
  K.H = H;

  /* ================= SUBTITLES: one caption engine, many treatments ================= */
  // chunks: one line (default) packs words greedily to the safe width; two lines balances each phrase
  function chunks(ctx, weight, family, gapEm) {
    var L = ctx.L, size = L.size, maxW = H.maxW(ctx), out = [];
    var mw = function (idx, sz) { return H.lineW(idx.map(function (i) { return { text: wt(i) }; }), weight, sz, family, gapEm); };
    K.phrases(ctx.seg).forEach(function (g) {
      if (L.lines === 2 && g.length > 1 && (mw(g, size) > maxW * 0.62 || (+L.wpl && g.length > +L.wpl))) {
        var best = Math.ceil(g.length / 2), diff = Infinity;
        for (var s = 1; s < g.length; s++) { var a = mw(g.slice(0, s), size), b = mw(g.slice(s), size); if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = s; } }
        var lines = [g.slice(0, best), g.slice(best)], widest = Math.max(mw(lines[0], size), mw(lines[1], size));
        out.push({ lines: lines, fs: widest > maxW ? Math.floor(size * maxW / widest) : size });
      } else {
        var cur = [];
        var push = function () { var w = mw(cur, size); out.push({ lines: [cur], fs: w > maxW ? Math.floor(size * maxW / w) : size }); cur = []; };
        var wpl = +L.wpl || 0;
        g.forEach(function (i) { if (cur.length && (mw(cur.concat([i]), size) > maxW || (wpl && cur.length >= wpl))) push(); cur.push(i); });
        if (cur.length) push();
      }
    });
    return out;
  }
  function capBuild(ctx, o) {
    var f = ctx.f, weight = o.weight || f.w_bold, gapEm = o.gapEm == null ? 0.26 : o.gapEm;
    var block = H.block(), tl = H.tl(), ch = chunks(ctx, weight, f.family, gapEm), seg = ctx.seg;
    var starts = ch.map(function (c) { return Math.max(seg[0], W(c.lines[0][0]).t - 0.06); });
    ch.forEach(function (c, k) {
      var G = H.grp(block); G.g.style.visibility = "hidden";
      var spans = [], lineEls = [];
      c.lines.forEach(function (line, li) {
        var le = el("div"); le.style.cssText = "display:flex;justify-content:center;align-items:baseline;white-space:nowrap;column-gap:" + Math.round(c.fs * gapEm) + "px;line-height:" + (o.lh || 1.12) + ";font-size:" + c.fs + "px;" + (li ? "margin-top:" + Math.round(c.fs * 0.04) + "px;" : "");
        line.forEach(function (i) { var s = el("span", "", esc(wt(i))); s.style.display = "inline-block"; s.style.position = "relative"; o.word(s, i, H.emph(i), c); le.appendChild(s); spans.push({ s: s, i: i, w: W(i) }); });
        G.inner.appendChild(le); lineEls.push(le);
      });
      if (o.decorate) o.decorate(G, c);
      var st = starts[k], en = k < ch.length - 1 ? starts[k + 1] : seg[1] + 1;
      if (k < ch.length - 1) en = Math.min(en, Math.max(st + 0.4, W(c.lines[c.lines.length - 1].slice(-1)[0]).end + (o.linger || 0.6)));
      tl.set(G.g, { visibility: "visible" }, st);
      tl.set(G.g, { visibility: "hidden" }, en);
      if (ctx.L.case === "sentence" && spans.length && k === 0 || ctx.L.case === "sentence" && spans.length && /[.?!]$/.test(String(W(ch[k - 1].lines.slice(-1)[0].slice(-1)[0]).text))) { var fs0 = spans[0].s; fs0.textContent = fs0.textContent.charAt(0).toUpperCase() + fs0.textContent.slice(1); }
      var an = ctx.L.anim || "style";
      if (an === "style" && o.anim) o.anim(tl, G, spans, lineEls, c, st, en);
      else if (an === "pop") tl.fromTo(G.g, { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: "back.out(2)", immediateRender: false }, st);
      else if (an === "rise") tl.fromTo(G.g, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, ease: "power3.out", immediateRender: false }, st);
      else if (an === "fade") tl.fromTo(G.g, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: "power1.out", immediateRender: false }, st);
      else if (an === "word") spans.forEach(function (x) { tl.fromTo(x.s, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "none", immediateRender: false }, Math.max(st, x.w.t - 0.03)); tl.set(x.s, { opacity: 0 }, Math.max(ctx.seg[0], st - 0.001)); });
      if (an !== "style" && an !== "word") spans.forEach(function (x) { x.s.style.opacity = 1; x.s.style.fontWeight = o.weight || ctx.f.w_bold; });
      if (ctx.L.hl) {
        var hc = K.swatch(ctx.L.hlColour || "primary").hex, hs = ctx.L.hlStyle || "colour";
        spans.forEach(function (x, j) {
          var on = Math.max(st, x.w.t - 0.02), off = j < spans.length - 1 ? Math.max(on + 0.05, spans[j + 1].w.t - 0.02) : en;
          if (hs === "colour") { tl.to(x.s, { color: hc, duration: 0.06 }, on); tl.to(x.s, { color: x.s.style.color || ctx.hex, duration: 0.06 }, off); }
          else if (hs === "scale") { tl.to(x.s, { scale: 1.14, duration: 0.08, ease: "power2.out" }, on); tl.to(x.s, { scale: 1, duration: 0.08 }, off); }
          else { x.s.style.borderRadius = "0.16em"; x.s.style.padding = "0 0.12em"; x.s.style.margin = "0 -0.12em"; tl.to(x.s, { backgroundColor: hc, color: H.inkOn(hc, ctx), textShadow: "none", duration: 0.05 }, on); tl.to(x.s, { backgroundColor: "rgba(0,0,0,0)", color: ctx.hex, textShadow: ctx.shadow, duration: 0.05 }, off); }
        });
      }
    });
    return { block: block, tl: tl, chunks: ch };
  }
  // SUB-01 caption-weight-shift: words wait in the light weight and turn bold as she says them
  R["cap-weight-shift"] = function (ctx) {
    var f = ctx.f, lightA = f.light_alpha || 0.62;
    return capBuild(ctx, {
      word: function (s) { H.txt(s, ctx, f.w_light); s.style.opacity = lightA; },
      anim: function (tl, G, spans, lines, c, st) {
        tl.fromTo(G.g, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.12, ease: "power3.out", immediateRender: false }, st);
        spans.forEach(function (x) {
          tl.set(x.s, { fontWeight: f.w_light, opacity: lightA }, st);
          tl.to(x.s, { fontWeight: f.w_bold, opacity: 1, duration: 0.1, ease: "power2.out" }, Math.max(st, x.w.t - 0.03));
        });
      }
    });
  };
  // SUB-02 per-word-rise: each word rises blur to sharp and lands on the spoken word
  R["cap-per-word-rise"] = function (ctx) {
    var f = ctx.f;
    return capBuild(ctx, {
      word: function (s) { H.txt(s, ctx, f.w_bold); },
      anim: function (tl, G, spans, lines, c, st, en) {
        var D = en - st, sc = Math.min(1, D / 1.45), RISE = 0.74 * sc, travel = c.fs * 0.55, blur = c.fs * 0.24;
        tl.set(spans.map(function (x) { return x.s; }), { opacity: 0 }, Math.max(ctx.seg[0], st - 0.002));
        spans.forEach(function (x) {
          var landing = Math.max(st + 0.12, x.w.t + 0.12), startAt = Math.max(st, landing - RISE);
          tl.fromTo(x.s, { opacity: 0, y: travel, filter: "blur(" + blur + "px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: Math.max(0.08, landing - startAt), ease: H.landEase, immediateRender: false }, startAt);
        });
      }
    });
  };
  // SUB-03 highlight box (cap.highlight-box): a soft brand box slides from word to word
  R["cap-box-word"] = function (ctx) {
    var f = ctx.f, box = ctx.hex === "#FFFFFF" ? ctx.B.brand.accent : ctx.hex, ink = H.inkOn(box, ctx), boxes = [];
    var r = capBuild(ctx, {
      gapEm: 0.3,
      word: function (s) { H.txt(s, ctx, f.w_bold, false, "#FFFFFF"); s.style.textShadow = ctx.B.brand.shadow; s.style.zIndex = 1; },
      decorate: function (G, c) { var b = el("div"); b.style.cssText = "position:absolute;left:0;top:0;border-radius:" + Math.round(c.fs * 0.2) + "px;background:" + box + ";opacity:0;z-index:0;"; G.inner.style.position = "relative"; G.inner.insertBefore(b, G.inner.firstChild); G.box = b; },
      anim: function (tl, G, spans, lines, c, st, en) { boxes.push({ G: G, spans: spans, c: c, st: st, en: en }); tl.fromTo(G.g, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.14, ease: "power3.out", immediateRender: false }, st); }
    });
    r.after = function () {
      boxes.forEach(function (o) {
        var padX = o.c.fs * 0.16, padY = o.c.fs * 0.02;
        o.spans.forEach(function (x, j) {
          var s = x.s, le = s.parentNode, X = le.offsetLeft + s.offsetLeft - padX, Y = le.offsetTop + s.offsetTop - padY, w = s.offsetWidth + padX * 2, h = s.offsetHeight + padY * 2;
          var at = Math.max(o.st, x.w.t - 0.04);
          if (j === 0) r.tl.set(o.G.box, { x: X, y: Y, width: w, height: h, opacity: 1 }, at);
          else r.tl.to(o.G.box, { x: X, y: Y, width: w, height: h, duration: 0.12, ease: "power2.out" }, at);
          r.tl.set(s, { color: "#FFFFFF", textShadow: ctx.B.brand.shadow }, o.st);
          r.tl.set(s, { color: ink, textShadow: "none" }, at + 0.04);
          r.tl.set(s, { color: "#FFFFFF", textShadow: ctx.B.brand.shadow }, j < o.spans.length - 1 ? Math.max(at + 0.05, o.spans[j + 1].w.t - 0.04) : o.en);
        });
        r.tl.set(o.G.box, { opacity: 0 }, o.st - 0.001);
      });
    };
    return r;
  };
  // SUB-04 karaoke dim (cap.karaoke-fill): the line is up, unspoken words at 35 %
  R["cap-karaoke"] = function (ctx) {
    var f = ctx.f;
    return capBuild(ctx, {
      word: function (s) { H.txt(s, ctx, f.w_bold); },
      anim: function (tl, G, spans, lines, c, st) {
        tl.fromTo(G.g, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "power2.out", immediateRender: false }, st);
        spans.forEach(function (x) { tl.set(x.s, { opacity: 0.35 }, st); tl.to(x.s, { opacity: 1, duration: 0.08, ease: "none" }, Math.max(st, x.w.t - 0.02)); });
      }
    });
  };
  // SUB-05 editorial (caption-editorial-emphasis, centred): the key word switches to the display face
  R["cap-editorial"] = function (ctx) {
    var f = ctx.f;
    return capBuild(ctx, {
      weight: f.w_light,
      word: function (s, i, isE) {
        if (isE) { H.txt(s, ctx, f.w_display, true, H.hero(ctx)); s.style.fontSize = "1.32em"; s.style.lineHeight = "0.9"; s.style.textShadow = ctx.B.brand.shadow; }
        else H.txt(s, ctx, f.w_light);
      },
      anim: function (tl, G, spans, lines, c, st) {
        tl.set(G.g, { opacity: 1 }, st);
        spans.forEach(function (x) {
          var isE = H.emph(x.i);
          tl.set(x.s, { opacity: 0, scale: isE ? 1.25 : 1.1, y: isE ? 10 : 0 }, Math.max(ctx.seg[0], st - 0.001));
          tl.to(x.s, { opacity: 1, scale: 1, y: 0, duration: isE ? 0.3 : 0.1, ease: isE ? "expo.out" : "power2.out" }, Math.max(st, x.w.t - 0.03));
        });
      }
    });
  };
  // SUB-06 colour pop (cap.hormozi-pop, kept calm): the spoken word takes your colour and lifts 8 %
  R["cap-colour-pop"] = function (ctx) {
    var f = ctx.f, hero = H.hero(ctx);
    return capBuild(ctx, {
      word: function (s) { H.txt(s, ctx, f.w_bold, false, "#FFFFFF"); s.style.textShadow = ctx.B.brand.shadow; },
      anim: function (tl, G, spans, lines, c, st, en) {
        tl.fromTo(G.g, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.1, ease: "power3.out", immediateRender: false }, st);
        spans.forEach(function (x, j) {
          var on = Math.max(st, x.w.t - 0.02), off = j < spans.length - 1 ? Math.max(on + 0.05, spans[j + 1].w.t - 0.02) : en;
          tl.set(x.s, { color: "#FFFFFF", scale: 1 }, st);
          tl.to(x.s, { color: hero, scale: 1.08, duration: 0.08, ease: "power2.out" }, on);
          tl.to(x.s, { color: "#FFFFFF", scale: 1, duration: 0.08, ease: "power2.out" }, off);
        });
      }
    });
  };
  // SUB-07 caption-pill-karaoke: one soft pill per phrase, words fill in as they are spoken
  R["cap-pill-karaoke"] = function (ctx) {
    var f = ctx.f, pill = ctx.hex, ink = H.inkOn(pill, ctx);
    var mix = function (a, b, t) { var p = function (h, o) { return parseInt(h.replace("#", "").substr(o, 2), 16); }; var c = [0, 2, 4].map(function (o) { return Math.round(p(a, o) * (1 - t) + p(b, o) * t); }); return "rgb(" + c.join(",") + ")"; };
    var inactive = mix(ink === "#FFFFFF" ? "#FFFFFF" : ink, pill, 0.55);
    return capBuild(ctx, {
      lh: 1.16,
      word: function (s) { s.style.fontFamily = H.fam(f); s.style.fontWeight = f.w_bold; s.style.fontSynthesis = "none"; s.style.color = inactive; },
      decorate: function (G, c) { var k = c.fs / 72; G.inner.style.cssText += "padding:" + Math.round(16 * k) + "px " + Math.round(40 * k) + "px " + Math.round(18 * k) + "px;border-radius:" + Math.round(22 * k) + "px;background:" + pill + ";box-shadow:0 2px 8px rgba(0,0,0,.12);"; },
      anim: function (tl, G, spans, lines, c, st) {
        tl.fromTo(G.g, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out", immediateRender: false }, st);
        spans.forEach(function (x, j) { tl.set(x.s, { color: j === 0 ? ink : inactive }, st); if (j) tl.to(x.s, { color: ink, duration: 0.1, ease: "none" }, Math.max(st, x.w.t - 0.05)); });
      }
    });
  };
  // SUB-08 caption-clip-wipe: each word wipes in left to right, key words take your colour
  R["cap-clip-wipe"] = function (ctx) {
    var f = ctx.f, accent = H.hero(ctx) === ctx.hex && ctx.colourId !== "white" ? "#FFFFFF" : ctx.B.brand.accent;
    return capBuild(ctx, {
      gapEm: 0.3, lh: 1.05,
      word: function (s) { H.txt(s, ctx, f.w_bold); s.style.letterSpacing = "0.03em"; s.style.clipPath = "inset(0 100% 0 0)"; },
      anim: function (tl, G, spans, lines, c, st, en) {
        tl.set(spans.map(function (x) { return x.s; }), { clipPath: "inset(-10% 100% -10% 0)", color: ctx.hex, opacity: 1 }, Math.max(ctx.seg[0], st - 0.001));
        spans.forEach(function (x) {
          tl.to(x.s, { clipPath: "inset(-10% 0% -10% 0)", duration: 0.28, ease: "power2.out" }, Math.max(st, x.w.t));
          if (H.emph(x.i)) tl.to(x.s, { color: accent, duration: 0.05 }, x.w.t + 0.1);
        });
        if (en < ctx.seg[1]) tl.to(spans.map(function (x) { return x.s; }), { clipPath: "inset(-10% 0% -10% 100%)", duration: 0.22, stagger: 0.03, ease: "power2.in" }, Math.max(st + 0.3, en - 0.26));
      }
    });
  };

  /* ================= HOOKS: the whole opening line, from the editable hook text ================= */
  function hookTokens(ctx) { return ctx.hook(); }
  function heroTok(line) { var e = line.filter(function (t) { return t.emph; })[0]; if (e) return e; return line.slice().sort(function (a, b) { return b.text.length - a.text.length; })[0]; }
  function lastT(lines) { var a = H.allToks(lines); return a.length ? a[a.length - 1].t : 0; }
  function holdOut(tl, node, ctx) { tl.to(node, { opacity: 0, duration: 0.24, ease: "power2.in" }, ctx.seg[1] - 0.3); }

  // HOOK-01 behind her (H2): huge words between her and the wall, the full line in front as she says it
  R["hook-behind"] = function (ctx) {
    var L = ctx.L, f = ctx.f, lines = hookTokens(ctx), tl = H.tl();
    var big = []; lines.forEach(function (ln) { ln.forEach(function (t) { if (t.emph) big.push(t); }); });
    if (!big.length) big = lines.map(heroTok);
    big = big.slice(0, 2);
    var block = H.block(), G = H.grp(block);
    var maxBig = 1000, sz = L.size;
    big.forEach(function (t) { var w = textW(t.text, f.w_bold, sz, f.family) * 1.02; if (w > maxBig) sz = Math.floor(sz * maxBig / w); });
    // one giant word at a time, each on its spoken word, swapping on the next
    var stackBox = el("div"); stackBox.style.cssText = "position:relative;display:grid;place-items:center;";
    G.inner.appendChild(stackBox);
    var bigEls = big.map(function (t) {
      var d = el("div", "", esc(t.text)); d.style.cssText = "grid-area:1/1;white-space:nowrap;line-height:0.86;letter-spacing:-0.035em;font-size:" + sz + "px;";
      H.txt(d, ctx, f.w_bold); d.style.textShadow = "0 6px 40px rgba(0,0,0,.18)"; stackBox.appendChild(d); return d;
    });
    bigEls.forEach(function (d, k) {
      var at = Math.max(ctx.seg[0] + 0.05, big[k].t - 0.06);
      tl.fromTo(d, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.32, ease: "expo.out", immediateRender: true }, at);
      if (k < bigEls.length - 1) tl.to(d, { opacity: 0, scale: 0.98, duration: 0.2, ease: "power2.in" }, Math.max(at + 0.4, big[k + 1].t - 0.24));
    });
    tl.fromTo(G.inner, { scale: 1 }, { scale: 1.03, duration: ctx.seg[1] - ctx.seg[0], ease: "none" }, ctx.seg[0]);
    holdOut(tl, G.inner, ctx);
    // the whole line in front, small, at her chest: words light up as she says them
    var front = H.abs(ctx.over, "left:" + ctx.safe.x0 + "px;width:" + (ctx.safe.x1 - ctx.safe.x0) + "px;top:1180px;display:flex;flex-direction:column;align-items:center;gap:6px;");
    var fs = 50;
    H.wrap(lines, fs, f.w_bold, f.family, H.maxW(ctx)).forEach(function (ln) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(ln.size * 0.26) + "px;white-space:nowrap;font-size:" + ln.size + "px;line-height:1.15;";
      ln.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, tk.emph ? f.w_bold : f.w_light, false, "#FFFFFF"); s.style.textShadow = ctx.B.brand.shadow; s.style.opacity = 0.3; le.appendChild(s); tl.to(s, { opacity: 1, duration: 0.08 }, Math.max(ctx.seg[0], tk.t - 0.02)); });
      front.appendChild(le);
    });
    holdOut(tl, front, ctx);
    // sit HIGH: the word's bottom edge tucks 36 % of its height behind the top of her head (base.face.top), so it reads
    var face = ctx.B.base.face || { y: 480, r: 330 }, headTop = face.top || Math.round(face.y - face.r * 0.64), wh = Math.round(sz * 0.86);
    block.style.cssText = "left:0;width:1080px;height:" + wh + "px;top:" + Math.max(40, Math.round(headTop + wh * 0.36 - wh)) + "px;";
    return { block: block, tl: tl, depth: true, blockUnder: true, fixed: true };
  };
  // HOOK-02 highlight bars (H3, inline-highlight): a headline on bars that holds for the whole hook
  R["hook-bars"] = function (ctx) {
    var L = ctx.L, f = ctx.f, bar = ctx.hex, ink = H.inkOn(bar, ctx), tl = H.tl();
    var rows = H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, H.maxW(ctx) - L.size * 0.5);
    var block = H.block(), G = H.grp(block), t0 = ctx.seg[0] + 0.12;
    rows.forEach(function (r, k) {
      var row = el("div"); row.style.cssText = "position:relative;display:inline-flex;gap:" + Math.round(r.size * 0.24) + "px;padding:" + Math.round(r.size * 0.07) + "px " + Math.round(r.size * 0.22) + "px " + Math.round(r.size * 0.1) + "px;margin-top:" + (k ? Math.round(r.size * 0.06) : 0) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.05;";
      var bg = el("div"); bg.style.cssText = "position:absolute;inset:0;background:" + bar + ";border-radius:" + Math.round(r.size * 0.08) + "px;transform-origin:0% 50%;box-shadow:0 8px 26px rgba(0,0,0,.18);";
      var mask = el("div"); mask.style.cssText = "position:relative;overflow:hidden;display:flex;gap:inherit;";
      var inner = el("div"); inner.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;";
      r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_bold, false, ink); if (tk.emph) H.emphTok(s, ctx, bar === ctx.B.brand.accent ? ink : ctx.B.brand.accent); inner.appendChild(s); });
      mask.appendChild(inner); row.appendChild(bg); row.appendChild(mask); G.inner.appendChild(row);
      var at = t0 + k * 0.16;
      tl.fromTo(bg, { scaleX: 0 }, { scaleX: 1, duration: 0.28, ease: "power4.out", immediateRender: true }, at);
      tl.fromTo(inner, { yPercent: 105 }, { yPercent: 0, duration: 0.24, ease: "power3.out", immediateRender: true }, at + 0.1);
    });
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };
  // HOOK-03 quote box and stacked label (H4, testimonial-proof-card): cream card, her words type on, a small label above
  R["hook-quote"] = function (ctx) {
    var L = ctx.L, f = ctx.f, b = ctx.B.brand, paper = b.cream || "#FFFFFF", tl = H.tl(), hero = ctx.colourId === "white" ? b.accent : ctx.hex;
    var block = H.block(), G = H.grp(block), t0 = ctx.seg[0] + 0.1;
    var lab = el("div"); lab.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:" + Math.round(L.size * 0.34) + "px;";
    var rule = el("div"); rule.style.cssText = "width:64px;height:4px;border-radius:4px;background:" + b.accent + ";margin-bottom:6px;";
    lab.appendChild(rule);
    var labLines = String(ctx.B.base.hook_label || "").split(/,\s*/);
    labLines.forEach(function (t, k) { var d = el("div", "", esc(k ? t : t.toUpperCase())); d.style.cssText = "font-size:" + (k ? 34 : 40) + "px;letter-spacing:" + (k ? "0.02em" : "0.16em") + ";line-height:1.1;white-space:nowrap;"; H.txt(d, ctx, k ? f.w_light : f.w_bold, false, "#FFFFFF"); d.style.textShadow = b.shadow; lab.appendChild(d); });
    var card = el("div"); card.style.cssText = "background:" + paper + ";border-radius:" + Math.round(L.size * 0.3) + "px;padding:" + Math.round(L.size * 0.5) + "px " + Math.round(L.size * 0.55) + "px;box-shadow:0 18px 44px rgba(0,0,0,.18);max-width:" + (ctx.safe.x1 - ctx.safe.x0) + "px;display:flex;flex-direction:column;align-items:center;";
    var rows = H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, (ctx.safe.x1 - ctx.safe.x0) - L.size * 1.2), spans = [];
    rows.forEach(function (r) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.08;letter-spacing:-0.01em;";
      r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_bold, false, b.ink); if (tk.emph) H.emphTok(s, ctx, hero); le.appendChild(s); spans.push({ s: s, tk: tk }); });
      card.appendChild(le);
    });
    G.inner.appendChild(lab); G.inner.appendChild(card);
    tl.fromTo(card, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.24, ease: "power3.out", immediateRender: true }, t0);
    Array.prototype.forEach.call(lab.children, function (c, k) { tl.fromTo(c, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.24, ease: "power3.out", immediateRender: true }, t0 + 0.12 + k * 0.08); });
    spans.forEach(function (x) { tl.fromTo(x.s, { opacity: 0.18 }, { opacity: 1, duration: 0.1, ease: "none", immediateRender: true }, Math.max(t0 + 0.2, x.tk.t - 0.02)); });
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };
  // HOOK-04 mixed-scale stack (H1): small words hang off one huge word, line by line as she says it
  R["hook-mixed"] = function (ctx) {
    var L = ctx.L, f = ctx.f, hero = H.hero(ctx), lines = hookTokens(ctx), tl = H.tl();
    var block = H.block(), seg = ctx.seg, small = Math.round(L.size * 0.32), groups = [];
    lines.forEach(function (ln, k) {
      var G = H.grp(block); G.g.style.visibility = "hidden";
      var h = heroTok(ln), hi = ln.indexOf(h), lead = ln.slice(0, hi), follow = ln.slice(hi + 1);
      var hs = L.size, hw = textW(h.text, f.w_bold, hs, f.family) * 1.02; if (hw > 960) hs = Math.floor(hs * 960 / hw);
      var stack = el("div"); stack.style.cssText = "display:inline-flex;flex-direction:column;";
      var mk = function (toks, align) {
        var r = el("div"); r.style.cssText = "display:flex;gap:" + Math.round(small * 0.28) + "px;white-space:nowrap;font-size:" + small + "px;line-height:1.05;align-self:" + align + ";";
        toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_light || 400, false, "#FFFFFF"); s.style.textShadow = ctx.B.brand.shadow; r.appendChild(s); tl.fromTo(s, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out", immediateRender: true }, Math.max(seg[0], tk.t - 0.02)); });
        return r;
      };
      // a long lead-in breaks over two short rows so it hugs the hero word
      var rowsLead = H.wrap([lead], small, f.w_light, f.family, Math.max(hw, 300));
      rowsLead.forEach(function (r) { if (r.toks.length) stack.appendChild(mk(r.toks, "flex-start")); });
      var he = el("div", "", esc(h.text)); he.style.cssText = "font-size:" + hs + "px;line-height:0.9;letter-spacing:-0.03em;white-space:nowrap;margin:" + Math.round(small * 0.08) + "px 0;";
      H.txt(he, ctx, f.w_bold, false, ctx.hex); he.style.textShadow = "0 0 34px " + ctx.B.brand.accent + "99, " + ctx.B.brand.shadow;
      stack.appendChild(he);
      if (follow.length) H.wrap([follow], small, f.w_light, f.family, Math.max(hw, 300)).forEach(function (r) { stack.appendChild(mk(r.toks, "flex-end")); });
      G.inner.appendChild(stack);
      tl.fromTo(he, { opacity: 0, scale: 1.12, filter: "blur(8px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.2, ease: "expo.out", immediateRender: true }, Math.max(seg[0], h.t - 0.04));
      groups.push({ G: G, t: Math.max(seg[0], ln[0].t - 0.08) });
    });
    groups.forEach(function (g, k) { tl.set(g.G.g, { visibility: "visible" }, g.t); if (k < groups.length - 1) tl.set(g.G.g, { visibility: "hidden" }, groups[k + 1].t); });
    return { block: block, tl: tl };
  };
  // HOOK-05 word by word: the whole line builds as she says it and stays up
  R["hook-wordbyword"] = function (ctx) {
    var L = ctx.L, f = ctx.f, hero = H.hero(ctx), tl = H.tl(), seg = ctx.seg;
    var block = H.block(), G = H.grp(block);
    H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (r) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.04;letter-spacing:-0.015em;";
      r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); s.style.display = "inline-block"; H.txt(s, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(s, ctx); le.appendChild(s); tl.fromTo(s, { opacity: 0, y: 16, scale: tk.emph ? 1.15 : 1 }, { opacity: 1, y: 0, scale: 1, duration: tk.emph ? 0.26 : 0.14, ease: tk.emph ? "expo.out" : "power2.out", immediateRender: true }, Math.max(seg[0], tk.t - 0.03)); });
      G.inner.appendChild(le);
    });
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };
  // HOOK-06 calm title (titlecard-lockup timing): the display serif settles, a fine rule draws under it
  R["hook-serif"] = function (ctx) {
    var L = ctx.L, f = ctx.f, tl = H.tl(), t0 = ctx.seg[0] + 0.25, hero = H.hero(ctx);
    var block = H.block(), G = H.grp(block);
    H.wrap(hookTokens(ctx), L.size, f.w_display, f.display, H.maxW(ctx), 0.22).forEach(function (r, k) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.22) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.02;";
      r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_display, true, ctx.hex); if (tk.emph) H.emphTok(s, ctx); le.appendChild(s); });
      G.inner.appendChild(le);
      tl.fromTo(le, { opacity: 0, y: 22, letterSpacing: "0.06em", filter: "blur(10px)" }, { opacity: 1, y: 0, letterSpacing: "0em", filter: "blur(0px)", duration: 1.1, ease: "power2.out", immediateRender: true }, t0 + k * 0.28);
    });
    var rule = el("div"); rule.style.cssText = "width:140px;height:3px;border-radius:3px;margin-top:" + Math.round(L.size * 0.22) + "px;background:" + ctx.B.brand.accent + ";transform-origin:50% 50%;";
    G.inner.appendChild(rule);
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.out", immediateRender: true }, t0 + 0.7);
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };
  // HOOK-07 holding headline (H5, title-card-fade): the line rises out of a mask under a soft top scrim and holds
  R["hook-holding"] = function (ctx) {
    var L = ctx.L, f = ctx.f, tl = H.tl(), t0 = ctx.seg[0] + 0.1, hero = H.hero(ctx);
    var top = ctx.L.y < 900, scrim = H.abs(ctx.under, "left:0;top:" + (top ? 0 : 760) + "px;width:1080px;height:" + (top ? 900 : 1160) + "px;background:linear-gradient(" + (top ? "180deg" : "0deg") + ",rgba(0,0,0,.5),rgba(0,0,0,.28) 55%,rgba(0,0,0,0));opacity:0;");
    tl.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "sine.out", immediateRender: true }, ctx.seg[0]);
    var block = H.block(), G = H.grp(block);
    H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (r, k) {
      var m = el("div"); m.style.cssText = "overflow:hidden;padding:0 4px " + Math.round(r.size * 0.08) + "px;";
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.06;letter-spacing:-0.015em;";
      r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(s, ctx); le.appendChild(s); });
      m.appendChild(le); G.inner.appendChild(m);
      tl.fromTo(le, { yPercent: 105 }, { yPercent: 0, duration: 0.32, ease: "power4.out", immediateRender: true }, t0 + k * 0.2);
    });
    tl.to(G.inner, { yPercent: -12, opacity: 0, duration: 0.24, ease: "power2.in" }, ctx.seg[1] - 0.3);
    tl.to(scrim, { opacity: 0, duration: 0.3 }, ctx.seg[1] - 0.3);
    return { block: block, tl: tl };
  };
  // HOOK-08 word slam (H6, caption-kinetic-slam): one or two words at a time, very large, dead centre
  R["hook-slam"] = function (ctx) {
    var L = ctx.L, f = ctx.f, hero = H.hero(ctx), tl = H.tl(), seg = ctx.seg, toks = H.allToks(hookTokens(ctx));
    var beats = [], cur = null;
    toks.forEach(function (tk) { if (cur && (cur.length < 2 && (cur[0].text.length <= 3 || tk.text.length <= 2)) && !tk.emph && !cur[0].emph) cur.push(tk); else { cur = [tk]; beats.push(cur); } });
    var block = H.block();
    beats.forEach(function (b, k) {
      var G = H.grp(block); G.g.style.visibility = "hidden";
      var text = b.map(function (t) { return t.text; }).join(" "), sz = L.size, w = textW(text, f.w_bold, sz, f.family) * 1.03, maxW = 940;
      if (w > maxW) sz = Math.floor(sz * maxW / w);
      var d = el("div", "", esc(text)); d.style.cssText = "white-space:nowrap;line-height:0.95;letter-spacing:-0.03em;font-size:" + sz + "px;";
      H.txt(d, ctx, f.w_bold, false, ctx.hex); if (b.some(function (t) { return t.emph; })) H.emphTok(d, ctx);
      G.inner.appendChild(d);
      var at = Math.max(seg[0], b[0].t - 0.03), nx = k < beats.length - 1 ? Math.max(at + 0.12, beats[k + 1][0].t - 0.03) : seg[1] - 0.25;
      tl.set(G.g, { visibility: "visible" }, at); tl.set(G.g, { visibility: "hidden" }, nx);
      tl.fromTo(d, { scale: 1.35, x: 0 }, { scale: 1, duration: 0.12, ease: "power4.out", immediateRender: true }, at);
      tl.to(d, { x: 4, duration: 0.02 }, at + 0.12); tl.to(d, { x: 0, duration: 0.02 }, at + 0.14);
    });
    return { block: block, tl: tl };
  };
  // HOOK-09 focus ring (H8): a fine ring draws round her head, the line sits under it
  R["hook-ring"] = function (ctx) {
    var L = ctx.L, f = ctx.f, b = ctx.B.brand, face = ctx.B.base.face || { x: 540, y: 480, r: 330 }, tl = H.tl(), t0 = ctx.seg[0] + 0.1, hero = H.hero(ctx);
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 1080 1920"); svg.style.cssText = "position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible;filter:drop-shadow(0 0 12px " + b.accent + "AA) drop-shadow(0 0 30px " + b.accent + "66);";
    var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", face.x); c.setAttribute("cy", face.y); c.setAttribute("r", face.r);
    c.setAttribute("fill", "none"); c.setAttribute("stroke", b.cream || "#FFFFFF"); c.setAttribute("stroke-width", "7"); c.setAttribute("pathLength", "1"); c.setAttribute("stroke-dasharray", "1"); c.setAttribute("stroke-dashoffset", "1"); c.setAttribute("transform", "rotate(-90 " + face.x + " " + face.y + ")");
    svg.appendChild(c); ctx.over.appendChild(svg);
    tl.fromTo(c, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.5, ease: "power2.inOut", immediateRender: true }, t0);
    tl.fromTo(svg, { scale: 1.04, transformOrigin: face.x + "px " + face.y + "px" }, { scale: 1, duration: 0.5, ease: "power2.out", immediateRender: true }, t0);
    var tag = H.abs(ctx.over, "left:" + Math.round(face.x + face.r * 0.55) + "px;top:" + Math.round(face.y - face.r * 0.95) + "px;padding:12px 22px;border-radius:100px;background:" + b.accent + ";white-space:nowrap;font-size:30px;line-height:1;transform-origin:0% 100%;", esc(String(ctx.B.base.hook_label || "").split(/,\s*/)[0]));
    H.txt(tag, ctx, f.w_bold, false, H.inkOn(b.accent, ctx)); tag.style.textShadow = "none";
    tl.fromTo(tag, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: "back.out(1.6)", immediateRender: true }, t0 + 0.4);
    var block = H.block(), G = H.grp(block);
    H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (r) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.06;";
      r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(s, ctx); le.appendChild(s); tl.fromTo(s, { opacity: 0.25 }, { opacity: 1, duration: 0.08, immediateRender: true }, Math.max(t0, tk.t - 0.02)); });
      G.inner.appendChild(le);
    });
    tl.fromTo(G.inner, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out", immediateRender: true }, t0 + 0.2);
    [svg, tag, G.inner].forEach(function (n) { holdOut(tl, n, ctx); });
    return { block: block, tl: tl };
  };
  // HOOK-10 kinetic-center-build, one build per line: words enter from the right and push the line, staying centred
  R["hook-center-build"] = function (ctx) {
    var L = ctx.L, f = ctx.f, seg = ctx.seg, tl = H.tl(), ease = H.kcbEase(), hero = H.hero(ctx);
    var block = H.block(), G = H.grp(block);
    H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (ln) {
      var fs = ln.size, gap = fs * 10 / 72, words = ln.toks.map(function (t) { return t.text; });
      var widths = words.map(function (w) { return textW(w, f.w_bold, fs, f.family); });
      var row = el("div"); row.style.cssText = "position:relative;width:" + (ctx.safe.x1 - ctx.safe.x0) + "px;height:" + Math.round(fs * 1.1) + "px;";
      G.inner.appendChild(row);
      var pos = []; for (var c = 1; c <= words.length; c++) { var tot = gap * (c - 1); for (var q = 0; q < c; q++) tot += widths[q]; var cur = -tot / 2, p = []; for (var r = 0; r < c; r++) { p.push(cur + widths[r] / 2); cur += widths[r] + gap; } pos.push(p); }
      var els = ln.toks.map(function (tk) { var w = el("span", "", esc(tk.text)); w.style.cssText = "position:absolute;left:50%;top:50%;line-height:1;white-space:nowrap;letter-spacing:-0.01em;font-size:" + fs + "px;"; H.txt(w, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(w, ctx); row.appendChild(w); return w; });
      var push = 13 / 30, off = 88 * fs / 72, blur = 3.5 * fs / 72;
      els.forEach(function (e, idx) {
        var start = Math.max(seg[0], ln.toks[idx].t - 0.05), dur = idx === 0 ? 10 / 30 : push, tx = pos[idx][idx];
        tl.fromTo(e, { x: idx === 0 ? tx : tx + off, xPercent: -50, yPercent: -50, opacity: 0, filter: "blur(" + blur + "px)" }, { x: tx, xPercent: -50, yPercent: -50, opacity: 1, filter: "blur(0px)", duration: dur, ease: ease, immediateRender: true }, start);
        for (var pi = 0; pi < idx; pi++) tl.to(els[pi], { x: pos[idx][pi], duration: dur, ease: ease }, start);
      });
    });
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };
  // HOOK-11 per-word-rise, stacked: each word rises blur to sharp and lands on the spoken word
  R["hook-per-word-rise"] = function (ctx) {
    var L = ctx.L, f = ctx.f, seg = ctx.seg, tl = H.tl(), hero = H.hero(ctx), block = H.block(), G = H.grp(block);
    H.wrap(hookTokens(ctx), L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (r) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.26) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.04;letter-spacing:-0.01em;";
      r.toks.forEach(function (tk) {
        var s = el("span", "", esc(tk.text)); s.style.display = "inline-block"; H.txt(s, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(s, ctx); le.appendChild(s);
        var landing = tk.t + 0.22, startAt = Math.max(seg[0], landing - 0.74);
        tl.fromTo(s, { opacity: 0, y: 150, filter: "blur(26px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: Math.max(0.08, landing - startAt), ease: H.landEase, immediateRender: true }, startAt);
      });
      G.inner.appendChild(le);
    });
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };
  // HOOK-12 text-state-swap: line one lifts in, then line two takes its place
  R["hook-state-swap"] = function (ctx) {
    var L = ctx.L, f = ctx.f, seg = ctx.seg, tl = H.tl(), hero = H.hero(ctx), lines = hookTokens(ctx), block = H.block(), prev = null;
    lines.forEach(function (ln, k) {
      var G = H.grp(block);
      H.wrap([ln], L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (r) {
        var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.04;";
        r.toks.forEach(function (tk) { var s = el("span", "", esc(tk.text)); H.txt(s, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(s, ctx); le.appendChild(s); });
        G.inner.appendChild(le);
      });
      var at = Math.max(seg[0] + 0.05, ln[0].t - 0.1);
      if (prev) tl.to(prev, { opacity: 0, y: -40, filter: "blur(14px)", duration: 0.18, ease: "power2.in" }, at - 0.12);
      tl.fromTo(G.inner, { opacity: 0, y: 40, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.26, ease: "power2.out", immediateRender: true }, at + (prev ? 0.06 : 0));
      prev = G.inner;
    });
    if (prev) holdOut(tl, prev, ctx);
    return { block: block, tl: tl };
  };

  // HOOK-13 blur to sharp, line by line (trailer playbook TRL-02): each line arrives soft and sharpens, then holds
  R["hook-sharpen"] = function (ctx) {
    var L = ctx.L, f = ctx.f, tl = H.tl(), seg = ctx.seg, block = H.block(), G = H.grp(block), lines = hookTokens(ctx);
    H.wrap(lines, L.size, f.w_bold, f.family, H.maxW(ctx)).forEach(function (r, k) {
      var le = el("div"); le.style.cssText = "display:flex;gap:" + Math.round(r.size * 0.24) + "px;white-space:nowrap;font-size:" + r.size + "px;line-height:1.08;letter-spacing:-0.015em;";
      r.toks.forEach(function (tk) { var s2 = el("span", "", esc(tk.text)); H.txt(s2, ctx, f.w_bold, false, ctx.hex); if (tk.emph) H.emphTok(s2, ctx); le.appendChild(s2); });
      G.inner.appendChild(le);
      var at = Math.max(seg[0] + 0.1 + k * 0.5, r.toks[0].t - 0.15);
      tl.fromTo(le, { opacity: 0, filter: "blur(28px)", scale: 1.04 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.7, ease: "power2.out", immediateRender: true }, at);
    });
    holdOut(tl, G.inner, ctx);
    return { block: block, tl: tl };
  };

  /* ================= NAME CARDS (lower thirds; the only things that may sit left) ================= */
  function nameText(ctx) { return K.caseText(ctx.B.base.name, ctx.L.case); }
  function ltT(ctx) { return { t0: Math.max(ctx.seg[0], ctx.B.base.name_at), out: ctx.seg[1] - 0.75 }; }
  function ltGrp(ctx) { var block = H.block(), G = H.grp(block, ctx.L.align === "centre" ? "centre" : "left"); return { block: block, G: G, left: ctx.L.align !== "centre" }; }
  // NAME-01 lt-accent-underline: name rises, an accent rule draws, role fades up
  R["lt-accent-underline"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), tl = H.tl();
    var wrap = el("div"); wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (o.left ? "flex-start" : "center") + ";gap:" + Math.round(L.size * 0.19) + "px;";
    var nm = el("div", "", esc(nameText(ctx))); nm.style.cssText = "font-size:" + L.size + "px;line-height:0.96;letter-spacing:0.005em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold, false, "#FFFFFF"); nm.style.textShadow = ctx.B.brand.shadow;
    var rule = el("div"); rule.style.cssText = "height:" + Math.max(3, Math.round(L.size * 0.055)) + "px;width:" + Math.round(L.size * 2.2) + "px;border-radius:3px;transform-origin:" + (o.left ? "0%" : "50%") + " 50%;background:" + ltAcc(ctx, false) + ";";
    var role = el("div", "", esc(ctx.B.base.role)); role.style.cssText = "font-size:" + Math.round(L.size * 0.46) + "px;line-height:1.2;letter-spacing:0.01em;white-space:nowrap;"; H.txt(role, ctx, f.w_light, false, "#FFFFFF"); role.style.textShadow = ctx.B.brand.shadow;
    wrap.appendChild(nm); wrap.appendChild(rule); wrap.appendChild(role); o.G.inner.appendChild(wrap);
    tl.set(nm, { y: 28, opacity: 0 }, ctx.seg[0]); tl.set(rule, { scaleX: 0 }, ctx.seg[0]); tl.set(role, { y: 16, opacity: 0 }, ctx.seg[0]);
    tl.to(nm, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, T.t0 + 0.1);
    tl.to(rule, { scaleX: 1, duration: 0.5, ease: "power4.out" }, T.t0 + 0.3);
    tl.to(role, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.46);
    tl.to(role, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.out);
    tl.to(rule, { scaleX: 0, duration: 0.3, ease: "power2.in" }, T.out + 0.05);
    tl.to(nm, { y: -16, opacity: 0, duration: 0.32, ease: "power2.in" }, T.out + 0.1);
    return { block: o.block, tl: tl };
  };
  // NAME-02 lt-side-rule: an upright accent bar grows, name and role slide in beside it
  R["lt-side-rule"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), tl = H.tl();
    var wrap = el("div"); wrap.style.cssText = "display:flex;align-items:stretch;gap:" + Math.round(L.size * 0.3) + "px;";
    var bar = el("div"); bar.style.cssText = "width:" + Math.max(4, Math.round(L.size * 0.075)) + "px;border-radius:4px;flex-shrink:0;transform-origin:50% 0%;background:" + ctx.B.brand.accent + ";";
    var tx = el("div"); tx.style.cssText = "display:flex;flex-direction:column;justify-content:center;gap:" + Math.round(L.size * 0.14) + "px;padding:" + Math.round(L.size * 0.06) + "px 0;";
    var nm = el("div", "", esc(nameText(ctx))); nm.style.cssText = "font-size:" + L.size + "px;line-height:0.9;letter-spacing:0.01em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold);
    var role = el("div", "", esc(ctx.B.base.role)); role.style.cssText = "font-size:" + Math.round(L.size * 0.42) + "px;line-height:1.2;letter-spacing:0.02em;white-space:nowrap;"; H.txt(role, ctx, f.w_light);
    tx.appendChild(nm); tx.appendChild(role); wrap.appendChild(bar); wrap.appendChild(tx); o.G.inner.appendChild(wrap);
    tl.set(bar, { scaleY: 0 }, ctx.seg[0]); tl.set([nm, role], { x: -24, opacity: 0 }, ctx.seg[0]);
    tl.to(bar, { scaleY: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.1);
    tl.to(nm, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.26);
    tl.to(role, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.38);
    tl.to(role, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.out);
    tl.to(nm, { y: -14, opacity: 0, duration: 0.32, ease: "power2.in" }, T.out + 0.05);
    tl.to(bar, { scaleY: 0, duration: 0.32, ease: "power2.in" }, T.out + 0.07);
    return { block: o.block, tl: tl };
  };
  // NAME-03 lt-clean-bar: a white card wipes open, the colour tab grows, name and role rise
  R["lt-clean-bar"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), k = L.size / 52, tl = H.tl(), b = ctx.B.brand;
    var card = el("div"); card.style.cssText = "display:flex;align-items:stretch;border-radius:" + Math.round(16 * k) + "px;overflow:hidden;box-shadow:0 14px 44px rgba(15,17,21,.18);";
    var tab = el("div"); tab.style.cssText = "width:" + Math.round(12 * k) + "px;flex-shrink:0;transform-origin:50% 0%;background:" + ltAcc(ctx, true) + ";";
    var body = el("div"); body.style.cssText = "background:" + (b.ground || "#FFFFFF") + ";padding:" + Math.round(22 * k) + "px " + Math.round(40 * k) + "px " + Math.round(24 * k) + "px " + Math.round(30 * k) + "px;display:flex;flex-direction:column;gap:" + Math.round(7 * k) + "px;align-items:" + (o.left ? "flex-start" : "center") + ";";
    var nm = el("div", "", esc(nameText(ctx))); nm.style.cssText = "font-size:" + L.size + "px;line-height:1.06;letter-spacing:-0.015em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold, false, b.ink);
    var role = el("div", "", esc(ctx.B.base.role)); role.style.cssText = "font-size:" + Math.round(27 * k) + "px;line-height:1.2;letter-spacing:0.01em;white-space:nowrap;"; H.txt(role, ctx, f.w_light, false, b.taupe);
    body.appendChild(nm); body.appendChild(role); card.appendChild(tab); card.appendChild(body); o.G.inner.appendChild(card);
    tl.set(card, { clipPath: "inset(0 100% 0 0)", y: 0, opacity: 1 }, ctx.seg[0]); tl.set(tab, { scaleY: 0 }, ctx.seg[0]); tl.set([nm, role], { y: 22, opacity: 0 }, ctx.seg[0]);
    tl.to(card, { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power3.out" }, T.t0 + 0.1);
    tl.to(tab, { scaleY: 1, duration: 0.45, ease: "power2.out" }, T.t0 + 0.28);
    tl.to(nm, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.34);
    tl.to(role, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.44);
    tl.to(card, { y: 18, opacity: 0, duration: 0.35, ease: "power2.in" }, T.out + 0.05);
    return { block: o.block, tl: tl };
  };
  // NAME-04 serif signature: her name in the display face, the role spaced out under it
  R["lt-serif"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), tl = H.tl();
    var wrap = el("div"); wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (o.left ? "flex-start" : "center") + ";gap:" + Math.round(L.size * 0.12) + "px;";
    var nm = el("div", "", esc(K.caseText(ctx.B.base.name, "spoken"))); nm.style.cssText = "font-size:" + L.size + "px;line-height:0.95;white-space:nowrap;"; H.txt(nm, ctx, f.w_display, true);
    var role = el("div", "", esc(K.caseText(String(ctx.B.base.role), "upper"))); role.style.cssText = "font-size:" + Math.round(L.size * 0.24) + "px;line-height:1.3;letter-spacing:0.3em;white-space:nowrap;" + (o.left ? "" : "text-indent:0.3em;"); H.txt(role, ctx, f.w_light);
    wrap.appendChild(nm); wrap.appendChild(role); o.G.inner.appendChild(wrap);
    tl.set(nm, { opacity: 0, y: 18, filter: "blur(10px)" }, ctx.seg[0]); tl.set(role, { opacity: 0, letterSpacing: "0.5em" }, ctx.seg[0]);
    tl.to(nm, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power2.out" }, T.t0 + 0.1);
    tl.to(role, { opacity: 1, letterSpacing: "0.3em", duration: 1.0, ease: "power2.out" }, T.t0 + 0.45);
    tl.to([nm, role], { opacity: 0, duration: 0.35, ease: "power2.in" }, T.out + 0.05);
    return { block: o.block, tl: tl };
  };

  /* ---- v4 name cards from the HyperFrames registry (lt-soft-pill, lt-dark-card, lt-mask-reveal, lt-stack-bars),
     same timings as the registry blocks, skinned with board.json brand colours and fonts. The colour pick is the
     accent (dot, tab, rule, sweep, role bar); on a white card a white accent falls back to the brand accent. ---- */
  function ltAcc(ctx, onLight) { return onLight && ctx.colourId === "white" ? ctx.B.brand.accent : ctx.hex; }
  function px(n) { return Math.round(n) + "px"; }
  R["lt-soft-pill"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), k = L.size / 46, tl = H.tl(), b = ctx.B.brand;
    var pill = el("div"); pill.style.cssText = "display:flex;align-items:center;gap:" + px(22 * k) + ";background:" + (b.ground || "#FFFFFF") + ";border-radius:999px;padding:" + px(20 * k) + " " + px(40 * k) + " " + px(20 * k) + " " + px(26 * k) + ";box-shadow:0 16px 46px rgba(15,17,21,.2);transform-origin:" + (o.left ? "0% 100%" : "50% 100%") + ";";
    var dot = el("div"); dot.style.cssText = "width:" + px(18 * k) + ";height:" + px(18 * k) + ";border-radius:50%;flex-shrink:0;background:" + ltAcc(ctx, true) + ";";
    var tx = el("div"); tx.style.cssText = "display:flex;flex-direction:column;gap:" + px(4 * k) + ";";
    var nm = el("div", "", esc(nameText(ctx))); nm.style.cssText = "font-size:" + L.size + "px;line-height:1.04;letter-spacing:-0.015em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold, false, b.ink);
    var role = el("div", "", esc(ctx.B.base.role)); role.style.cssText = "font-size:" + px(25 * k) + ";line-height:1.2;letter-spacing:0.01em;white-space:nowrap;"; H.txt(role, ctx, f.w_light, false, b.taupe || b.ink);
    tx.appendChild(nm); tx.appendChild(role); pill.appendChild(dot); pill.appendChild(tx); o.G.inner.appendChild(pill);
    tl.set(pill, { scale: 0.88, y: 18, opacity: 0 }, ctx.seg[0]); tl.set(dot, { scale: 0 }, ctx.seg[0]); tl.set([nm, role], { opacity: 0, x: -10 }, ctx.seg[0]);
    tl.to(pill, { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: "back.out(1.7)" }, T.t0 + 0.1);
    tl.to(dot, { scale: 1, duration: 0.4, ease: "back.out(3)" }, T.t0 + 0.4);
    tl.to(nm, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, T.t0 + 0.42);
    tl.to(role, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, T.t0 + 0.5);
    tl.to(pill, { scale: 0.94, y: 14, opacity: 0, duration: 0.35, ease: "power2.in" }, T.out + 0.05);
    return { block: o.block, tl: tl };
  };
  R["lt-dark-card"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), k = L.size / 48, tl = H.tl(), b = ctx.B.brand;
    var card = el("div"); card.style.cssText = "background:" + (b.ink || "#16181D") + ";border-radius:" + px(14 * k) + ";padding:" + px(24 * k) + " " + px(38 * k) + " " + px(26 * k) + " " + px(32 * k) + ";box-shadow:0 18px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:" + px(12 * k) + ";align-items:" + (o.left ? "flex-start" : "center") + ";";
    var nm = el("div", "", esc(nameText(ctx))); nm.style.cssText = "font-size:" + L.size + "px;line-height:1.02;letter-spacing:-0.015em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold, false, "#FFFFFF"); nm.style.textShadow = "none";
    var ul = el("div"); ul.style.cssText = "height:" + px(Math.max(3, 4 * k)) + ";align-self:stretch;border-radius:2px;transform-origin:" + (o.left ? "0%" : "50%") + " 50%;background:" + ltAcc(ctx, false) + ";";
    var role = el("div", "", esc(ctx.B.base.role)); role.style.cssText = "font-size:" + px(25 * k) + ";line-height:1.2;letter-spacing:0.02em;white-space:nowrap;"; H.txt(role, ctx, f.w_light, false, "rgba(255,255,255,.74)"); role.style.textShadow = "none";
    card.appendChild(nm); card.appendChild(ul); card.appendChild(role); o.G.inner.appendChild(card);
    tl.set(card, { y: 60, opacity: 0 }, ctx.seg[0]); tl.set(nm, { y: 14, opacity: 0 }, ctx.seg[0]); tl.set(ul, { scaleX: 0 }, ctx.seg[0]); tl.set(role, { opacity: 0 }, ctx.seg[0]);
    tl.to(card, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.1);
    tl.to(nm, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, T.t0 + 0.26);
    tl.to(ul, { scaleX: 1, duration: 0.5, ease: "power4.out" }, T.t0 + 0.42);
    tl.to(role, { opacity: 1, duration: 0.45, ease: "power2.out" }, T.t0 + 0.56);
    tl.to(card, { y: 24, opacity: 0, duration: 0.35, ease: "power2.in" }, T.out + 0.05);
    return { block: o.block, tl: tl };
  };
  R["lt-mask-reveal"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), k = L.size / 72, tl = H.tl(), b = ctx.B.brand, name = nameText(ctx);
    var wrap = el("div"); wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (o.left ? "flex-start" : "center") + ";gap:" + px(14 * k) + ";";
    var nw = el("div"); nw.style.cssText = "position:relative;overflow:hidden;padding:" + px(2 * k) + " 0;";
    var nm = el("div", "", esc(name)); nm.style.cssText = "font-size:" + L.size + "px;line-height:0.98;letter-spacing:-0.02em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold, false, "#FFFFFF"); nm.style.textShadow = b.shadow;
    var sweep = el("div"); sweep.style.cssText = "position:absolute;top:0;bottom:0;left:0;width:" + px(Math.max(5, 8 * k)) + ";background:" + ltAcc(ctx, false) + ";";
    var role = el("div", "", esc(ctx.B.base.role)); role.style.cssText = "font-size:" + px(28 * k) + ";line-height:1.2;letter-spacing:0.02em;white-space:nowrap;"; H.txt(role, ctx, f.w_light, false, "#FFFFFF"); role.style.textShadow = b.shadow;
    nw.appendChild(nm); nw.appendChild(sweep); wrap.appendChild(nw); wrap.appendChild(role); o.G.inner.appendChild(wrap);
    var travel = textW(name, f.w_bold, L.size, f.family) * 1.0;
    tl.set(nm, { clipPath: "inset(0 100% 0 0)" }, ctx.seg[0]); tl.set(sweep, { x: 0, opacity: 0 }, ctx.seg[0]); tl.set(role, { y: 14, opacity: 0 }, ctx.seg[0]);
    tl.to(sweep, { opacity: 1, duration: 0.12, ease: "none" }, T.t0 + 0.1);
    tl.to(sweep, { x: travel, duration: 0.55, ease: "power2.inOut" }, T.t0 + 0.12);
    tl.to(nm, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.inOut" }, T.t0 + 0.16);
    tl.to(sweep, { opacity: 0, duration: 0.15, ease: "none" }, T.t0 + 0.6);
    tl.to(role, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.t0 + 0.55);
    tl.to(role, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.out);
    tl.to(nm, { clipPath: "inset(0 0 0 100%)", duration: 0.4, ease: "power2.in" }, T.out + 0.05);
    return { block: o.block, tl: tl };
  };
  R["lt-stack-bars"] = function (ctx) {
    var L = ctx.L, f = ctx.f, T = ltT(ctx), o = ltGrp(ctx), k = L.size / 52, tl = H.tl(), b = ctx.B.brand, acc = ltAcc(ctx, false);
    var wrap = el("div"); wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (o.left ? "flex-start" : "center") + ";gap:" + px(8 * k) + ";";
    var nb = el("div"); nb.style.cssText = "background:" + (b.ink || "#141518") + ";padding:" + px(14 * k) + " " + px(30 * k) + ";";
    var nm = el("div", "", esc(nameText(ctx))); nm.style.cssText = "font-size:" + L.size + "px;line-height:1;letter-spacing:-0.005em;white-space:nowrap;"; H.txt(nm, ctx, f.w_bold, false, "#FFFFFF"); nm.style.textShadow = "none";
    var rb = el("div"); rb.style.cssText = "background:" + acc + ";padding:" + px(9 * k) + " " + px(22 * k) + ";" + (o.left ? "margin-left:" + px(14 * k) + ";" : "");
    var role = el("div", "", esc(K.caseText(String(ctx.B.base.role), "upper"))); role.style.cssText = "font-size:" + px(23 * k) + ";line-height:1;letter-spacing:0.06em;white-space:nowrap;"; H.txt(role, ctx, f.w_bold, false, H.inkOn(acc, ctx)); role.style.textShadow = "none";
    nb.appendChild(nm); rb.appendChild(role); wrap.appendChild(nb); wrap.appendChild(rb); o.G.inner.appendChild(wrap);
    tl.set(nb, { clipPath: "inset(0 100% 0 0)" }, ctx.seg[0]); tl.set(rb, { clipPath: "inset(0 0 0 100%)" }, ctx.seg[0]);
    tl.to(nb, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power4.out" }, T.t0 + 0.1);
    tl.to(rb, { clipPath: "inset(0 0% 0 0%)", duration: 0.5, ease: "power4.out" }, T.t0 + 0.34);
    tl.to(rb, { clipPath: "inset(0 0 0 100%)", duration: 0.32, ease: "power3.in" }, T.out);
    tl.to(nb, { clipPath: "inset(0 100% 0 0)", duration: 0.36, ease: "power3.in" }, T.out + 0.07);
    return { block: o.block, tl: tl };
  };

  (window.VPLooksMore || []).forEach(function (fn) { fn(K, R, H); });
  return R;
};
