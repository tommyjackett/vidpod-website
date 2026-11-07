/* VIDPOD Style Studio v3: the looks, part 2 (logo reveals, transitions, moves, graphics).
   Camera pieces are pure functions of time (render(t)), like the Jackett Ranch engine and the
   Alisha vertical v2 build, so the preview scrubs and loops exactly. See MECHANISMS.md. */
(window.VPLooksMore = window.VPLooksMore || []).push(function (K, R, H) {
  "use strict";
  var el = K.el, esc = K.esc;
  var E = function (name) { return gsap.parseEase(name); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var seg01 = function (t, a, b) { return H.clamp((t - a) / (b - a), 0, 1); };
  function clock(tl, ctx, fn) {
    var o = { t: ctx.seg[0] };
    tl.fromTo(o, { t: ctx.seg[0] }, { t: ctx.seg[1], duration: ctx.seg[1] - ctx.seg[0], ease: "none", immediateRender: true, onUpdate: function () { fn(o.t); } }, ctx.seg[0]);
    fn(ctx.seg[0]);
  }
  function hexRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (o) { return parseInt(h.substr(o, 2), 16); }); }
  function mixHex(a, b, t) { var A = hexRgb(a), B2 = hexRgb(b); return "rgb(" + A.map(function (v, i) { return Math.round(v + (B2[i] - v) * t); }).join(",") + ")"; }
  function rgba(h, a) { var c = hexRgb(h); return "rgba(" + c.join(",") + "," + a + ")"; }
  function fullDiv(parent, css) { return H.abs(parent, "left:0;top:0;width:1080px;height:1920px;" + (css || "")); }
  function sans(ctx, node, weight, colour, display) { H.txt(node, ctx, weight, display, colour); node.style.textShadow = "none"; }

  /* ================= LOGO REVEALS ================= */
  // VIDPOD lead-in: her last line ends, the picture softens and pushes 3.5 % while the brand ground fades up
  function logoLead(ctx, tl) {
    var b = ctx.B.brand, ground = fullDiv(ctx.over, "background:" + (b.ground || "#FFFFFF") + ";opacity:0;");
    var fx = H.mediaFX(ctx), at = ctx.seg[0] + 1.75;
    tl.fromTo(fx, { blur: 0, sc: 1 }, { blur: 22, sc: 1.035, duration: 1.2, ease: "sine.inOut", onUpdate: fx.apply, immediateRender: false }, at);
    tl.set(fx, { blur: 0, sc: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.fromTo(ground, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "sine.inOut", immediateRender: true }, at + 0.15);
    return at + 0.8; // the moment the logo move starts
  }
  function logoBlock(ctx, opts) {
    opts = opts || {};
    var L = ctx.L, f = ctx.f, b = ctx.B.brand, k = L.size / 560;
    var block = H.block(), G = H.grp(block);
    var wrap = el("div"); wrap.style.cssText = "position:relative;width:" + L.size + "px;height:" + Math.round(L.size / b.logo_aspect) + "px;";
    var img = el("img"); img.src = b.logo_file; img.alt = ctx.B.client.logo_alt; img.style.cssText = "display:block;width:100%;height:100%;";
    wrap.appendChild(img); G.inner.appendChild(wrap);
    var rule = el("div"); rule.style.cssText = "width:" + Math.round(260 * k) + "px;height:2px;margin-top:" + Math.round(56 * k) + "px;background:" + ctx.hex + ";opacity:.75;transform-origin:50% 50%;";
    G.inner.appendChild(rule);
    var label = el("div", "", esc(ctx.B.base.logo_label)); label.style.cssText = "margin-top:" + Math.round(30 * k) + "px;font-size:" + Math.max(20, Math.round(27 * k)) + "px;line-height:1.4;letter-spacing:0.34em;text-indent:0.34em;text-transform:uppercase;white-space:nowrap;";
    sans(ctx, label, f.w_light, ctx.hex);
    G.inner.appendChild(label);
    return { block: block, G: G, wrap: wrap, img: img, rule: rule, label: label };
  }
  function logoTail(tl, lb, at) { // the one secondary element: hairline then label, then a clean hold
    tl.fromTo(lb.rule, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.inOut", immediateRender: true }, at);
    tl.fromTo(lb.label, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", immediateRender: true }, at + 0.25);
  }
  // LOGO-01 soft pop (L1): lands with a 4 % overshoot and a settling shadow
  R["logo-pop"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx);
    tl.fromTo(lb.wrap, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "none", immediateRender: true }, at);
    tl.fromTo(lb.wrap, { scale: 0.85 }, { scale: 1, duration: 0.48, ease: "back.out(1.4)", immediateRender: true }, at);
    tl.fromTo(lb.img, { filter: "blur(6px) drop-shadow(0 18px 30px rgba(0,0,0,.22))" }, { filter: "blur(0px) drop-shadow(0 6px 12px rgba(0,0,0,.10))", duration: 0.5, ease: "power2.out", immediateRender: true }, at);
    logoTail(tl, lb, at + 0.5);
    return { block: lb.block, tl: tl };
  };
  // LOGO-02 spin in: the brand mark spins in on its own, then the wordmark slides out from behind it
  R["logo-spin"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx), b = ctx.B.brand;
    var mark = el("img"); mark.src = b.twin_circle; mark.alt = ""; var mh = Math.round(ctx.L.size * 0.36);
    mark.style.cssText = "position:absolute;left:50%;top:50%;height:" + mh + "px;width:auto;transform:translate(-50%,-50%);";
    lb.wrap.appendChild(mark);
    tl.fromTo(mark, { rotation: -200, scale: 0.4, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 0.8, ease: "power3.out", immediateRender: true }, at);
    tl.to(mark, { scale: 1.6, opacity: 0, duration: 0.4, ease: "power2.in" }, at + 0.75);
    tl.fromTo(lb.img, { clipPath: "inset(0 50% 0 50%)", opacity: 0, scale: 0.94 }, { clipPath: "inset(0 0% 0 0%)", opacity: 1, scale: 1, duration: 0.6, ease: "power3.inOut", immediateRender: true }, at + 0.8);
    logoTail(tl, lb, at + 1.25);
    return { block: lb.block, tl: tl };
  };
  // LOGO-03 scale-through (L3, cinematic-zoom): arrives from in front of the lens, out of focus
  R["logo-through"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx);
    tl.fromTo(lb.wrap, { scale: 2.6, filter: "blur(18px)" }, { scale: 1, filter: "blur(0px)", duration: 0.68, ease: "expo.out", immediateRender: true }, at);
    tl.fromTo(lb.wrap, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none", immediateRender: true }, at);
    logoTail(tl, lb, at + 0.6);
    return { block: lb.block, tl: tl };
  };
  // LOGO-04 mask wipe (L2 hairline rise timing): a hairline draws, then a clean wipe reveals the logo
  R["logo-wipe"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx);
    var line = el("div"); line.style.cssText = "position:absolute;left:0;right:0;bottom:-14px;height:3px;background:" + ctx.B.brand.accent + ";transform-origin:0% 50%;";
    lb.wrap.appendChild(line);
    tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "expo.inOut", immediateRender: true }, at);
    tl.fromTo(lb.img, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power3.inOut", immediateRender: true }, at + 0.25);
    tl.to(line, { opacity: 0, duration: 0.32 }, at + 1.0);
    logoTail(tl, lb, at + 0.95);
    return { block: lb.block, tl: tl };
  };
  // LOGO-05 twin circle draw-on (L5): the two circles draw in opposite directions, fill, then the wordmark rises
  R["logo-twin"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx), b = ctx.B.brand, g = b.twin_geom;
    var NS = "http://www.w3.org/2000/svg", mw = Math.round(ctx.L.size * 0.62), mhh = Math.round(mw * g.vb[1] / g.vb[0]);
    var markBox = el("div"); markBox.style.cssText = "position:relative;width:" + mw + "px;height:" + mhh + "px;margin-bottom:" + Math.round(ctx.L.size * 0.08) + "px;";
    var fill = el("img"); fill.src = b.twin_circle; fill.alt = ""; fill.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + g.vb[0] + " " + g.vb[1]); svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;";
    var circles = g.circles.map(function (c, k) {
      var e = document.createElementNS(NS, "circle"); e.setAttribute("cx", c[0]); e.setAttribute("cy", c[1]); e.setAttribute("r", c[2] - 20);
      e.setAttribute("fill", "none"); e.setAttribute("stroke", b.ink); e.setAttribute("stroke-width", "44"); e.setAttribute("pathLength", "1"); e.setAttribute("stroke-dasharray", "1"); e.setAttribute("stroke-dashoffset", "1");
      e.setAttribute("transform", "rotate(-90 " + c[0] + " " + c[1] + ")" + (k ? " translate(" + (2 * c[1]) + " 0) scale(1 1)" : ""));
      if (k) e.setAttribute("transform", "rotate(-90 " + c[0] + " " + c[1] + ") scale(1,-1) translate(0," + (-2 * c[1]) + ")");
      svg.appendChild(e); return e;
    });
    markBox.appendChild(fill); markBox.appendChild(svg);
    lb.G.inner.insertBefore(markBox, lb.wrap);
    tl.fromTo(circles[0], { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.8, ease: "power2.inOut", immediateRender: true }, at);
    tl.fromTo(circles[1], { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.8, ease: "power2.inOut", immediateRender: true }, at + 0.16);
    tl.fromTo(markBox, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: "power2.out", immediateRender: true }, at + 0.36);
    tl.fromTo(fill, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: true }, at + 0.96);
    tl.to(svg, { opacity: 0, duration: 0.2 }, at + 1.0);
    var m = el("div"); m.style.cssText = "overflow:hidden;"; lb.wrap.parentNode.insertBefore(m, lb.wrap); m.appendChild(lb.wrap);
    tl.fromTo(lb.wrap, { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: "power4.out", immediateRender: true }, at + 1.1);
    logoTail(tl, lb, at + 1.45);
    return { block: lb.block, tl: tl };
  };
  // LOGO-06 focus pull and shine (L6, soft-blur-in + shimmer-sweep): lifts out of blur, one light pass
  R["logo-blur"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx);
    tl.fromTo(lb.wrap, { opacity: 0, scale: 1.06, filter: "blur(24px)", y: 20 }, { opacity: 1, scale: 1, filter: "blur(0px)", y: 0, duration: 0.88, ease: "power3.out", immediateRender: true }, at);
    var shine = el("div"); shine.style.cssText = "position:absolute;inset:-10% 0;background:linear-gradient(110deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.75) 50%,rgba(255,255,255,0) 60%);mix-blend-mode:screen;-webkit-mask:url(" + ctx.B.brand.logo_file + ") center/100% 100% no-repeat;mask:url(" + ctx.B.brand.logo_file + ") center/100% 100% no-repeat;";
    var sh = el("div"); sh.style.cssText = "position:absolute;inset:0;overflow:hidden;"; sh.appendChild(shine); lb.wrap.appendChild(sh);
    shine.style.webkitMaskSize = shine.style.maskSize = "100% 83%";
    tl.fromTo(shine, { xPercent: -120 }, { xPercent: 120, duration: 0.8, ease: "power2.inOut", immediateRender: true }, at + 1.2);
    logoTail(tl, lb, at + 0.8);
    return { block: lb.block, tl: tl };
  };
  // LOGO-07 split reveal (L4): two halves slide together and lock
  R["logo-split"] = function (ctx) {
    var tl = H.tl(), at = logoLead(ctx, tl), lb = logoBlock(ctx);
    var top = lb.img, bot = lb.img.cloneNode(); lb.wrap.appendChild(bot);
    top.style.position = bot.style.position = "absolute"; top.style.inset = bot.style.inset = "0";
    top.style.clipPath = "inset(0 0 50% 0)"; bot.style.clipPath = "inset(50% 0 0 0)";
    tl.fromTo(top, { x: -110, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, at);
    tl.fromTo(bot, { x: 110, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out", immediateRender: true }, at + 0.04);
    tl.fromTo(lb.wrap, { filter: "brightness(1)" }, { filter: "brightness(1.08)", duration: 0.04, yoyo: true, repeat: 1, immediateRender: true }, at + 0.62);
    logoTail(tl, lb, at + 0.7);
    return { block: lb.block, tl: tl };
  };

  /* ================= LOGO v4: the logo alone on a plain background, on its own loop clock =================
     Tommy, 7 Nov 2026: no footage, "someone's brand colour at the back or white, and how the logo's motion
     is working is the focus". Times start at 0; the move, a 1 s hold, a short fade out, then the page replays.
     L.bg is a background id from brand.logo_backgrounds or a custom #RRGGBB; L.speed scales every move. */
  var LOGO_SPEED = { slow: 1.5, normal: 1, fast: 0.62 };
  function logoBgHex(ctx) {
    var b = ctx.B.brand, id = ctx.L.bg || "white", list = b.logo_backgrounds || [{ id: "white", key: "ground" }];
    if (/^#[0-9a-f]{6}$/i.test(id)) return id;
    var d = list.filter(function (x) { return x.id === id; })[0] || list[0];
    return d.hex || b[d.key] || "#FFFFFF";
  }
  function logoStage(ctx) {
    var L = ctx.L, b = ctx.B.brand, c = ctx.B.client, bg = logoBgHex(ctx), light = K.isLight(bg);
    var ink = light ? (b.ink || "#222222") : (b.cream || "#FFFFFF");
    ctx.media.style.opacity = "0";                       // no footage on this tab
    fullDiv(ctx.backdrop, "background:" + bg + ";");
    var col = fullDiv(ctx.over, "display:flex;flex-direction:column;align-items:center;justify-content:center;");
    var W = L.size || 600, Hh = Math.round(W / (b.logo_aspect || 3));
    var m = el("div"); m.style.cssText = "position:relative;width:" + W + "px;height:" + Hh + "px;";
    var img = el("img"); img.alt = c.logo_alt || ""; img.src = light ? b.logo_file : (c.logo_on_dark || b.logo_file);
    img.style.cssText = "display:block;width:100%;height:100%;" + (!light && !c.logo_on_dark ? "filter:brightness(0) invert(1);" : "");
    m.appendChild(img); col.appendChild(m);
    var lab = null;
    if (L.label && ctx.B.base.logo_label) {
      lab = el("div", "", esc(ctx.B.base.logo_label));
      lab.style.cssText = "margin-top:" + Math.round(W * 0.08) + "px;font-size:" + Math.max(24, Math.round(W * 0.05)) + "px;line-height:1.3;letter-spacing:0.3em;text-indent:0.3em;text-transform:uppercase;white-space:nowrap;";
      sans(ctx, lab, ctx.f.w_light, light ? (b.taupe || ink) : ink);
      col.appendChild(lab);
    }
    return { tl: H.tl(), f: LOGO_SPEED[L.speed] || 1, at: 0.2, col: col, m: m, img: img, lab: lab, W: W, H: Hh, light: light, ink: ink, b: b };
  }
  function logoFinish(s, land, sfx) {
    var tl = s.tl, t = land;
    if (s.lab) { tl.fromTo(s.lab, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", immediateRender: true }, t); t += 0.35; }
    var hold = t + 1.0;
    tl.to(s.col, { opacity: 0, duration: 0.3, ease: "power1.in" }, hold);
    return { tl: tl, loop: hold + 0.35, fixed: true, sfx: sfx || [] };
  }
  R["logo-pop-bounce"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f;
    s.tl.fromTo(s.m, { scale: 0.12 }, { scale: 1, duration: 0.8 * f, ease: "back.out(2.6)", immediateRender: true }, a);
    s.tl.fromTo(s.img, { opacity: 0 }, { opacity: 1, duration: 0.12 * f, ease: "none", immediateRender: true }, a);
    return logoFinish(s, a + 0.8 * f, [{ name: "pop", at: a + 0.12 * f }]);
  };
  R["logo-scale-up"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f;
    s.tl.fromTo(s.m, { scale: 0.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.3 * f, ease: "power3.out", immediateRender: true }, a);
    return logoFinish(s, a + 1.0 * f, [{ name: "shimmer", at: a + 0.7 * f }]);
  };
  function logoSlide(dir) {
    return function (ctx) {
      var s = logoStage(ctx), a = s.at, f = s.f, from = {};
      if (dir === "left") from.x = -(540 + s.W / 2 + 40);
      if (dir === "right") from.x = 540 + s.W / 2 + 40;
      if (dir === "top") from.y = -(960 + s.H / 2 + 40);
      if (dir === "bottom") from.y = 960 + s.H / 2 + 40;
      var to = { x: 0, y: 0, duration: 1.1 * f, ease: "expo.out", immediateRender: true };
      s.tl.fromTo(s.m, Object.assign({ x: 0, y: 0 }, from), to, a);
      return logoFinish(s, a + 0.9 * f, [{ name: "whoosh", at: a + 0.18 * f }]);
    };
  }
  R["logo-slide-left"] = logoSlide("left");
  R["logo-slide-right"] = logoSlide("right");
  R["logo-slide-down"] = logoSlide("top");
  R["logo-slide-up"] = logoSlide("bottom");
  R["logo-fade"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f;
    s.tl.fromTo(s.m, { opacity: 0 }, { opacity: 1, duration: 1.4 * f, ease: "sine.inOut", immediateRender: true }, a);
    return logoFinish(s, a + 1.2 * f);
  };
  R["logo-blur-in"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f;
    s.tl.fromTo(s.m, { opacity: 0, scale: 1.06, filter: "blur(36px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.4 * f, ease: "power2.out", immediateRender: true }, a);
    return logoFinish(s, a + 1.2 * f, [{ name: "shimmer", at: a + 0.8 * f }]);
  };
  R["logo-spin-in"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f;
    s.tl.fromTo(s.m, { rotation: -270, scale: 0.2, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 1.3 * f, ease: "power3.out", immediateRender: true }, a);
    return logoFinish(s, a + 1.1 * f, [{ name: "whoosh", at: a + 0.3 * f }]);
  };
  // LOGO draw-on: the vector mark (brand.twin_circle, parsed at boot into B._mark) traces as a line, then fills.
  // A PNG-only logo falls back to a left-to-right wipe with a thin leading line.
  R["logo-draw-on"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f, mk = ctx.B._mark, tl = s.tl;
    if (mk && mk.paths && mk.paths.length) {
      var NS = "http://www.w3.org/2000/svg", vb = mk.vb, mw = Math.min(900, Math.round(s.W * 0.8)), mh = Math.round(mw * vb[3] / vb[2]);
      var col = s.light ? (mk.fill || s.ink) : s.ink, sw = (vb[2] / mw) * 7;
      s.m.style.width = mw + "px"; s.m.style.height = mh + "px"; s.img.style.display = "none";
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", vb.join(" ")); svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;";
      var ps = mk.paths.map(function (d) {
        var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("fill", col); p.setAttribute("fill-opacity", "0");
        p.setAttribute("stroke", col); p.setAttribute("stroke-width", sw.toFixed(1)); p.setAttribute("stroke-linejoin", "round"); p.setAttribute("stroke-linecap", "round");
        p.setAttribute("pathLength", "1"); p.setAttribute("stroke-dasharray", "1"); p.setAttribute("stroke-dashoffset", "1");
        svg.appendChild(p); return p;
      });
      s.m.appendChild(svg);
      ps.forEach(function (p, k) { tl.fromTo(p, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.8 * f, ease: "power1.inOut", immediateRender: true }, a + k * 0.08 * f); });
      tl.fromTo(ps, { attr: { "fill-opacity": 0 } }, { attr: { "fill-opacity": 1 }, duration: 0.5 * f, ease: "power1.out", immediateRender: true }, a + 1.6 * f);
      tl.fromTo(ps, { attr: { "stroke-opacity": 1 } }, { attr: { "stroke-opacity": 0 }, duration: 0.3 * f, ease: "none", immediateRender: true }, a + 1.9 * f);
      return logoFinish(s, a + 2.1 * f, [{ name: "shimmer", at: a + 1.7 * f }]);
    }
    var line = el("div"); line.style.cssText = "position:absolute;left:0;top:-8%;height:116%;width:" + Math.max(3, Math.round(s.W / 160)) + "px;background:" + s.ink + ";";
    s.m.appendChild(line);
    tl.fromTo(s.img, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.6 * f, ease: "power2.inOut", immediateRender: true }, a);
    tl.fromTo(line, { x: 0, opacity: 1 }, { x: s.W, duration: 1.6 * f, ease: "power2.inOut", immediateRender: true }, a);
    tl.to(line, { opacity: 0, duration: 0.25 * f }, a + 1.6 * f);
    return logoFinish(s, a + 1.7 * f);
  };
  R["logo-mask-wipe"] = function (ctx) {
    var s = logoStage(ctx), a = s.at, f = s.f, im = s.img, p = { v: 100 };
    var g = "linear-gradient(100deg,#000 0%,#000 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,0) 100%)";
    im.style.webkitMaskImage = im.style.maskImage = g; im.style.webkitMaskSize = im.style.maskSize = "300% 100%"; im.style.webkitMaskRepeat = im.style.maskRepeat = "no-repeat";
    var set = function () { im.style.webkitMaskPosition = im.style.maskPosition = p.v.toFixed(2) + "% 0"; };
    set();
    s.tl.fromTo(p, { v: 100 }, { v: 0, duration: 1.3 * f, ease: "power2.inOut", immediateRender: true, onUpdate: set }, a);
    s.tl.fromTo(s.m, { x: 30 }, { x: 0, duration: 1.3 * f, ease: "power2.out", immediateRender: true }, a);
    return logoFinish(s, a + 1.2 * f, [{ name: "swish", at: a + 0.3 * f }]);
  };

  /* ================= TRANSITIONS (all on the join between her opening line and her name) ================= */
  function cutAt(ctx) { return ctx.B.base.cuts[0]; }
  R["tr-cut"] = function () { return { tl: H.tl() }; };
  var FLASH = {
    white: { core: "#F7FBFF", halo: "#CFE4FF", wash: "#F3F6FA", ghost: ["#BFD9FF", "#E6D3FF", "#CFF5E8"] },
    warm: { core: "#FFF4E0", halo: "#FFB46B", wash: "#FFE9C8", ghost: ["#FFC27A", "#FF9FB0", "#C8F0B0"] }
  };
  // TR-02 lens flash (T1): the footage over-exposes, an anamorphic streak blooms, the new shot comes out of the glare
  R["tr-lens"] = function (ctx) {
    var b = ctx.B.brand, P = FLASH[ctx.L.flash] || (ctx.L.flash === "brand" ? { core: b.cream || "#FFFFFF", halo: b.accent, wash: b.warm || b.accent, ghost: [b.accent, b.warm || b.accent, b.cream || "#FFFFFF"] } : FLASH.warm);
    var C = cutAt(ctx), F = 0.04, s = C - 4 * F, tl = H.tl(), fx = H.mediaFX(ctx), hx = 690, hy = 760;
    var wash = fullDiv(ctx.over, "background:" + P.wash + ";mix-blend-mode:screen;opacity:0;");
    var streak = H.abs(ctx.over, "left:" + hx + "px;top:" + hy + "px;width:0;height:0;mix-blend-mode:screen;");
    var halo = H.abs(streak, "left:-1300px;top:-40px;width:2600px;height:80px;background:radial-gradient(50% 50% at 50% 50%," + rgba(P.halo, 0.55) + " 0%," + rgba(P.halo, 0.22) + " 45%,rgba(0,0,0,0) 72%);");
    var core = H.abs(streak, "left:-1200px;top:-7px;width:2400px;height:14px;background:radial-gradient(50% 50% at 50% 50%,#FFFFFF 0%," + P.core + " 35%,rgba(255,255,255,0) 72%);");
    var hot = H.abs(streak, "left:-180px;top:-180px;width:360px;height:360px;border-radius:50%;background:radial-gradient(closest-side,#FFFFFF 0%," + rgba(P.core.length === 7 ? P.core : "#FFFFFF", 0.85) + " 28%," + rgba(P.halo, 0.25) + " 60%,rgba(0,0,0,0) 100%);");
    var dx = hx - 540, dy = hy - 960, ghosts = [-0.4, -0.8, 0.5, 1.2].map(function (m, k) {
      var r = [70, 120, 46, 160][k];
      return H.abs(ctx.over, "left:" + Math.round(540 + dx * m - r) + "px;top:" + Math.round(960 + dy * m - r) + "px;width:" + (2 * r) + "px;height:" + (2 * r) + "px;border-radius:50%;mix-blend-mode:screen;opacity:0;background:radial-gradient(closest-side," + rgba(P.ghost[k % 3], 0.9) + "," + rgba(P.ghost[k % 3], 0.35) + " 70%,rgba(0,0,0,0));");
    });
    tl.set(streak, { opacity: 0, scaleX: 0.15 }, ctx.seg[0]);
    tl.set(fx, { b: 1, c: 1, s: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { b: 3.2, c: 0.78, s: 0.6, duration: 4 * F, ease: "power2.in", onUpdate: fx.apply }, s);
    tl.set(fx, { b: 3.0, c: 0.8, s: 0.65, onComplete: fx.apply }, C);
    tl.to(fx, { b: 1, c: 1, s: 1, duration: 10 * F, ease: "expo.out", onUpdate: fx.apply }, C);
    tl.to(streak, { opacity: 1, scaleX: 1.1, duration: 3 * F, ease: "power2.out" }, s);
    tl.to(streak, { opacity: 0, scaleX: 1.25, x: 80, duration: 10 * F, ease: "power1.out" }, C + F);
    tl.to(wash, { opacity: 0.55, duration: 3 * F, ease: "power2.in" }, s + F);
    tl.to(wash, { opacity: 0, duration: 7 * F, ease: "sine.out" }, C);
    tl.to(ghosts, { opacity: 0.14, duration: 3 * F, ease: "none" }, s + F);
    tl.to(ghosts, { opacity: 0, duration: 9 * F, ease: "sine.out" }, C + F);
    return { tl: tl, fixed: true };
  };
  // TR-03 warm flare (ported from the approved Alisha vertical option 1): a warm wash plus a wide light band crossing the frame
  R["tr-flare"] = function (ctx) { var tl = H.tl(); flare(ctx, tl, cutAt(ctx)); return { tl: tl }; };
  function flare(ctx, tl, C) {
    var fl = ctx.B.brand.flare || { wash: "#F8E9DA", band: "255,241,226" };
    var wash = fullDiv(ctx.over, "background:" + fl.wash + ";opacity:0;");
    var band = H.abs(ctx.over, "left:0;top:0;width:3240px;height:1920px;opacity:0;background:linear-gradient(100deg,rgba(" + fl.band + ",0) 36%,rgba(" + fl.band + ",.8) 50%,rgba(" + fl.band + ",0) 64%);");
    tl.fromTo(wash, { opacity: 0 }, { opacity: 0.5, duration: 0.28, ease: "sine.in", immediateRender: false }, C - 0.28);
    tl.to(wash, { opacity: 0, duration: 0.5, ease: "sine.out" }, C);
    tl.fromTo(band, { x: -2020 }, { x: -140, duration: 0.76, ease: "sine.inOut", immediateRender: false }, C - 0.38);
    tl.fromTo(band, { opacity: 0 }, { opacity: 0.55, duration: 0.3, ease: "sine.in", immediateRender: false }, C - 0.38);
    tl.to(band, { opacity: 0, duration: 0.42, ease: "sine.out" }, C);
    tl.set([wash, band], { opacity: 0 }, ctx.seg[0]);
  }
  // TR-04 flash frame (T3, flash-through-white retimed): two quick frames of warm white and an exposure push
  R["tr-white"] = function (ctx) {
    var C = cutAt(ctx), F = 0.04, tl = H.tl(), fx = H.mediaFX(ctx);
    var w = fullDiv(ctx.over, "background:#FFF6E8;opacity:0;mix-blend-mode:screen;");
    tl.set(fx, { b: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { b: 2.2, duration: 2 * F, ease: "power2.in", onUpdate: fx.apply }, C - 2 * F);
    tl.to(fx, { b: 1, duration: 9 * F, ease: "expo.out", onUpdate: fx.apply }, C + F);
    tl.to(w, { opacity: 0.92, duration: 2 * F, ease: "power2.in" }, C - 2 * F);
    tl.to(w, { opacity: 0, duration: 9 * F, ease: "expo.out" }, C + F);
    return { tl: tl };
  };
  // TR-05 light leak (T2): layered warm light rolls in from a corner, drifts, carries the cut
  R["tr-leak"] = function (ctx) {
    var C = cutAt(ctx), F = 0.04, s = C - 12 * F, tl = H.tl(), fx = H.mediaFX(ctx), cols = ctx.B.brand.leak || ["#FFC9A0", "#FFB07A", "#FFE2BF"];
    var blobs = [[1500, 1500, 980, -260], [1200, 1200, 1060, 340], [900, 900, 700, -120]].map(function (g, k) {
      return H.abs(ctx.over, "left:" + (g[2] - g[0] / 2) + "px;top:" + (g[3] - g[1] / 2) + "px;width:" + g[0] + "px;height:" + g[1] + "px;border-radius:50%;mix-blend-mode:screen;opacity:0;background:radial-gradient(closest-side," + rgba(cols[k % cols.length], 0.95) + " 0%," + rgba(cols[k % cols.length], 0.45) + " 45%,rgba(0,0,0,0) 100%);");
    });
    tl.set(fx, { b: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { b: 1.5, duration: 12 * F, ease: "sine.in", onUpdate: fx.apply }, s);
    tl.to(fx, { b: 1, duration: 18 * F, ease: "sine.out", onUpdate: fx.apply }, C);
    blobs.forEach(function (bl, k) {
      tl.fromTo(bl, { x: 380 - k * 60, y: -260 + k * 90, scale: 0.8 }, { x: -420 + k * 120, y: 380 - k * 40, scale: 1.25, duration: 30 * F, ease: "sine.inOut", immediateRender: true }, s - k * 2 * F);
      tl.fromTo(bl, { opacity: 0 }, { opacity: [1, 0.9, 0.95][k], duration: 12 * F, ease: "sine.in", immediateRender: true }, s - k * 2 * F);
      tl.to(bl, { opacity: 0, duration: 16 * F, ease: "sine.out" }, C + k * F);
    });
    return { tl: tl };
  };
  // TR-06 zoom-through (T5, cut-the-curve velocity match): push in with blur into the cut, settle out of it
  R["tr-zoom"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), fx = H.mediaFX(ctx); fx.oy = 32;
    tl.set(fx, { sc: 1, blur: 0, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { sc: 1.25, blur: 12, duration: 0.22, ease: "power4.in", onUpdate: fx.apply }, C - 0.22);
    tl.set(fx, { sc: 1.25, blur: 12, onComplete: fx.apply }, C);
    tl.to(fx, { sc: 1, blur: 0, duration: 0.3, ease: "power4.out", onUpdate: fx.apply }, C);
    return { tl: tl };
  };
  // TR-07 blur cut (rack-focus): a quick focus pull across the join
  R["tr-blur"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), fx = H.mediaFX(ctx);
    tl.set(fx, { blur: 0, b: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { blur: 26, b: 1.08, duration: 0.26, ease: "power2.in", onUpdate: fx.apply }, C - 0.26);
    tl.to(fx, { blur: 0, b: 1, duration: 0.38, ease: "power2.out", onUpdate: fx.apply }, C);
    return { tl: tl };
  };
  // TR-08 slat wipe (T4): thin slats close like blinds, the cut lands behind them, they open on the new shot
  R["tr-slats"] = function (ctx) {
    var C = cutAt(ctx), F = 0.04, tl = H.tl(), fx = H.mediaFX(ctx), n = 40, pitch = 1080 / n, col = ctx.B.brand.cream || "#FFFFFF";
    var slats = []; for (var i = 0; i < n; i++) slats.push(H.abs(ctx.over, "left:" + (i * pitch).toFixed(1) + "px;top:0;width:" + (pitch + 0.6).toFixed(1) + "px;height:1920px;background:" + col + ";transform:scaleX(0);transform-origin:0% 50%;"));
    tl.set(fx, { b: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { b: 0.6, duration: 6 * F, ease: "power2.in", onUpdate: fx.apply }, C - 6 * F);
    tl.set(fx, { b: 1, onComplete: fx.apply }, C);
    tl.set(slats, { transformOrigin: "0% 50%", scaleX: 0 }, ctx.seg[0]);
    tl.to(slats, { scaleX: 1, duration: 4 * F, ease: "power3.inOut", stagger: 0.3 * F / 4 }, C - 7 * F);
    tl.set(slats, { transformOrigin: "100% 50%" }, C);
    tl.to(slats, { scaleX: 0, duration: 4 * F, ease: "power3.inOut", stagger: 0.3 * F / 4 }, C + 0.02);
    return { tl: tl };
  };
  // TR-09 whip pan (T6): a fast sideways whip with motion blur, matched speed either side of the cut
  R["tr-whip"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), fx = H.mediaFX(ctx);
    tl.set(fx, { x: 0, sc: 1, blur: 0, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { x: -200, sc: 1.4, blur: 22, duration: 0.16, ease: "power3.in", onUpdate: fx.apply }, C - 0.16);
    tl.set(fx, { x: 200, sc: 1.4, blur: 22, onComplete: fx.apply }, C);
    tl.to(fx, { x: 0, sc: 1, blur: 0, duration: 0.2, ease: "power3.out", onUpdate: fx.apply }, C);
    return { tl: tl };
  };


  /* ---- more transitions: push, brand wipe, blur dissolve, dip to brand ---- */
  // TR push (directional): the last frame before the cut is pushed off left as the new shot pushes in
  R["tr-push"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), fx = H.mediaFX(ctx), D = 0.42, e = E("power3.inOut");
    var frz = ctx.freeze(ctx.over, "left:0;top:0;width:1080px;height:1920px;visibility:hidden;");
    var edge = H.abs(ctx.over, "left:0;top:0;width:10px;height:1920px;background:" + (ctx.B.brand.cream || "#FFFFFF") + ";visibility:hidden;");
    clock(tl, ctx, function (t) {
      if (t < C) { if (t > C - 0.4) frz.grab(); frz.el.style.visibility = edge.style.visibility = "hidden"; fx.x = 0; fx.apply(); return; }
      var u = e(seg01(t, C, C + D)), vis = u < 1 ? "visible" : "hidden";
      frz.el.style.visibility = edge.style.visibility = vis;
      frz.el.style.transform = "translateX(" + (-1080 * u).toFixed(1) + "px)";
      edge.style.transform = "translateX(" + (1075 - 1080 * u).toFixed(1) + "px)";
      fx.x = 1080 * (1 - u); fx.apply();
    });
    return { tl: tl };
  };
  // TR brand wipe: a band in the client's accent colour sweeps across and carries the cut
  R["tr-brandwipe"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), b = ctx.B.brand;
    var band = H.abs(ctx.over, "left:0;top:-200px;width:1700px;height:2320px;background:" + b.accent + ";transform:skewX(-14deg);box-shadow:-24px 0 0 " + (b.cream || "#FFFFFF") + ", 24px 0 0 " + (b.cream || "#FFFFFF") + ";");
    tl.fromTo(band, { x: -2200 }, { x: -320, duration: 0.3, ease: "power3.in", immediateRender: true }, C - 0.3);
    tl.to(band, { x: 1700, duration: 0.38, ease: "power3.out" }, C + 0.04);
    return { tl: tl };
  };
  // TR blur dissolve: the old shot softens and dissolves into the new one coming out of focus
  R["tr-dissolve"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), fx = H.mediaFX(ctx), D = 0.55;
    var frz = ctx.freeze(ctx.over, "left:0;top:0;width:1080px;height:1920px;opacity:0;");
    clock(tl, ctx, function (t) {
      if (t < C) { if (t > C - 0.4) frz.grab(); var p0 = seg01(t, C - 0.2, C); frz.el.style.opacity = 0; fx.blur = 8 * p0; fx.apply(); return; }
      var u = E("sine.inOut")(seg01(t, C, C + D));
      frz.el.style.opacity = (1 - u).toFixed(3); frz.el.style.filter = "blur(" + (8 + 14 * u).toFixed(1) + "px)";
      fx.blur = 16 * (1 - u); fx.apply();
    });
    return { tl: tl };
  };
  // TR dip to brand: the frame dips to the brand colour on the cut and comes back
  R["tr-dip"] = function (ctx) {
    var C = cutAt(ctx), tl = H.tl(), b = ctx.B.brand;
    var dip = fullDiv(ctx.over, "background:" + b.accent + ";opacity:0;");
    var mark = H.abs(ctx.over, "left:390px;top:860px;width:300px;height:200px;opacity:0;background:url(" + (ctx.B.client.logo_on_dark || "") + ") center/contain no-repeat;");
    tl.to(dip, { opacity: 1, duration: 0.26, ease: "sine.in" }, C - 0.26);
    tl.to(mark, { opacity: 0.9, duration: 0.12 }, C - 0.12);
    tl.to(mark, { opacity: 0, duration: 0.16 }, C + 0.12);
    tl.to(dip, { opacity: 0, duration: 0.34, ease: "sine.out" }, C + 0.1);
    return { tl: tl };
  };

  /* ---- quote cards and a progress bar (podcast snippets and trailers) ---- */
  function quoteCard(ctx, ground) {
    var b = ctx.B.brand, f = ctx.f, q = ctx.B.base.words_extra.quote_card, tl = H.tl(), t0 = ctx.seg[0] + 0.4, tout = ctx.seg[1] - 0.55;
    var ink = ground ? (b.cream || "#FFFFFF") : "#FFFFFF";
    if (ground) {
      var g = fullDiv(ctx.over, "background:" + b.ink + ";");
      tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "sine.inOut", immediateRender: true }, t0 - 0.3);
      tl.to(g, { opacity: 0, duration: 0.4 }, tout + 0.1);
    } else {
      var fx = H.mediaFX(ctx);
      tl.set(fx, { b: 1, blur: 0, onComplete: fx.apply }, ctx.seg[0]);
      tl.to(fx, { b: 0.5, blur: 16, duration: 0.5, ease: "sine.inOut", onUpdate: fx.apply }, t0 - 0.3);
      tl.to(fx, { b: 1, blur: 0, duration: 0.45, ease: "sine.inOut", onUpdate: fx.apply }, tout + 0.1);
    }
    var box = H.abs(ctx.over, "left:" + ctx.safe.x0 + "px;width:" + (ctx.safe.x1 - ctx.safe.x0) + "px;top:0;height:1920px;display:flex;flex-direction:column;align-items:center;justify-content:center;");
    var open = el("div"); open.textContent = String.fromCharCode(8220); open.style.cssText = "font-size:260px;line-height:0.55;height:120px;"; sans(ctx, open, f.w_display, b.accent, true);
    box.appendChild(open);
    var toks = q.text.split(/\s+/).map(function (w) { return { text: w }; });
    var rows = H.wrap([toks], 70, f.w_bold, f.family, (ctx.safe.x1 - ctx.safe.x0) - 60);
    var lines = rows.map(function (r) {
      var m = el("div"); m.style.cssText = "overflow:hidden;";
      var le = el("div", "", esc(r.toks.map(function (x) { return x.text; }).join(" "))); le.style.cssText = "font-size:" + r.size + "px;line-height:1.16;letter-spacing:-0.01em;white-space:nowrap;text-align:center;"; sans(ctx, le, f.w_bold, ink);
      m.appendChild(le); box.appendChild(m); return le;
    });
    var close = el("div"); close.textContent = String.fromCharCode(8221); close.style.cssText = "font-size:260px;line-height:0.55;height:110px;margin-top:40px;"; sans(ctx, close, f.w_display, b.accent, true);
    box.appendChild(close);
    var rule = el("div"); rule.style.cssText = "width:80px;height:3px;background:" + b.accent + ";margin:26px 0 22px;";
    var nm = el("div", "", esc(q.name)); nm.style.cssText = "font-size:46px;line-height:1.1;"; sans(ctx, nm, f.w_bold, ink);
    var role = el("div", "", esc(q.role)); role.style.cssText = "font-size:28px;line-height:1.4;letter-spacing:.2em;text-transform:uppercase;margin-top:6px;"; sans(ctx, role, f.w_light, ink); role.style.opacity = 0.8;
    box.appendChild(rule); box.appendChild(nm); box.appendChild(role);
    tl.fromTo(open, { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", immediateRender: true }, t0);
    lines.forEach(function (le, k) { tl.fromTo(le, { yPercent: 105 }, { yPercent: 0, duration: 0.5, ease: "power4.out", immediateRender: true }, t0 + 0.25 + k * 0.32); });
    var after = t0 + 0.25 + lines.length * 0.32;
    tl.fromTo(close, { opacity: 0, y: -20, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out", immediateRender: true }, after);
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: "expo.inOut", immediateRender: true }, after + 0.15);
    tl.fromTo([nm, role], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out", immediateRender: true }, after + 0.3);
    tl.to(box, { opacity: 0, duration: 0.35 }, tout);
    return { tl: tl };
  }
  // GFX quote pull on her clip: the picture darkens and softens so the quote pops
  R["gfx-quotecard"] = function (ctx) { return quoteCard(ctx, false); };
  // GFX quote on a brand ground
  R["gfx-quoteground"] = function (ctx) { return quoteCard(ctx, true); };
  // GFX progress bar: a fine bar fills across the clip, just above the caption area
  R["gfx-progress"] = function (ctx) {
    var b = ctx.B.brand, tl = H.tl(), y = ctx.safe.y1 - 14;
    var track = H.abs(ctx.over, "left:" + ctx.safe.x0 + "px;top:" + y + "px;width:" + (ctx.safe.x1 - ctx.safe.x0) + "px;height:10px;border-radius:10px;background:rgba(255,255,255,.28);overflow:hidden;");
    var fill = H.abs(track, "left:0;top:0;width:100%;height:100%;border-radius:10px;background:" + b.accent + ";transform-origin:0% 50%;");
    tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: ctx.seg[1] - ctx.seg[0], ease: "none", immediateRender: true }, ctx.seg[0]);
    return { tl: tl };
  };

  /* ================= MOVES (layout and camera mechanisms on her clip) ================= */
  function bigWord(ctx, parent, front) {
    var m = ctx.B.base.moves, f = ctx.f, tl = H.tl(), at = m.at;
    var box = H.abs(parent, "left:0;top:" + (m.word_y - 200) + "px;width:1080px;height:400px;display:flex;align-items:center;justify-content:center;");
    var w = el("div", "", esc(m.word.toUpperCase())); w.style.cssText = "font-size:" + m.word_size + "px;line-height:0.8;letter-spacing:-0.04em;white-space:nowrap;";
    sans(ctx, w, f.w_bold, ctx.B.brand.cream || "#FFFFFF"); w.style.textShadow = front ? ctx.B.brand.shadow : "0 10px 50px rgba(0,0,0,.15)";
    box.appendChild(w);
    var sm = H.abs(ctx.over, "left:0;width:1080px;top:" + (m.word_y + 190) + "px;text-align:center;font-size:54px;line-height:1;white-space:nowrap;", esc(m.small));
    sans(ctx, sm, f.w_bold, "#FFFFFF"); sm.style.textShadow = ctx.B.brand.shadow;
    tl.fromTo(w, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.32, ease: "expo.out", immediateRender: true }, at - 0.04);
    tl.fromTo(box, { scale: 1 }, { scale: 1.03, duration: ctx.seg[1] - at, ease: "none", immediateRender: true }, at);
    tl.fromTo(sm, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", immediateRender: true }, ctx.B.base.moves.small_at || at - 0.6);
    tl.to([box, sm], { opacity: 0, duration: 0.24 }, ctx.seg[1] - 0.3);
    return tl;
  }
  // MOVE-01 text behind her (layout A): the word sits between her and the wall, from the person matte
  R["move-behind"] = function (ctx) { return { tl: bigWord(ctx, ctx.under, false), depth: true }; };
  // MOVE-02 text in front (layout B): the same word over her, to compare
  R["move-front"] = function (ctx) { return { tl: bigWord(ctx, ctx.over, true) }; };
  // MOVE-03 side panel (layout D, left-glass-popout reframe): she slides left and scales, studio footage comes in beside her
  R["move-side"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, tl = H.tl(), fx = H.mediaFX(ctx), tin = ctx.seg[0] + 0.5, tout = ctx.seg[1] - 1.05;
    ctx.backdrop.style.background = b.light || b.cream;
    fx.ox = 50; fx.oy = 45;
    var m = ctx.media;
    tl.set(fx, { x: 0, sc: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { x: -250, sc: 0.7, duration: 0.6, ease: "power3.inOut", onUpdate: fx.apply }, tin);
    tl.fromTo(m, { clipPath: "inset(0% 0% 0% 0% round 0px)" }, { clipPath: "inset(0% 15% 0% 15% round " + ctx.px(40).toFixed(1) + "px)", duration: 0.6, ease: "power3.inOut", immediateRender: true }, tin);
    tl.to(fx, { x: 0, sc: 1, duration: 0.6, ease: "power3.inOut", onUpdate: fx.apply }, tout);
    tl.to(m, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 0.6, ease: "power3.inOut" }, tout);
    var win = H.abs(ctx.over, "left:600px;top:470px;width:330px;height:587px;border-radius:26px;overflow:hidden;box-shadow:" + (b.card_shadow || "0 18px 44px rgba(35,31,32,.16)") + ";background:#000;");
    var st = ctx.studio(win, "inset:0;width:100%;height:100%;"); st.from(tin);
    var cap = H.abs(ctx.over, "left:585px;width:360px;top:1090px;text-align:center;display:flex;flex-direction:column;gap:6px;");
    var n1 = el("div", "", esc(ctx.B.base.studio.label)); n1.style.cssText = "font-size:40px;line-height:1.1;white-space:nowrap;"; sans(ctx, n1, f.w_bold, b.ink);
    var n2 = el("div", "", esc(ctx.B.base.studio.sub || "")); n2.style.cssText = "font-size:28px;line-height:1.2;letter-spacing:.16em;text-transform:uppercase;"; sans(ctx, n2, f.w_light, b.taupe);
    cap.appendChild(n1); cap.appendChild(n2);
    tl.fromTo(win, { x: 140, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: "power3.out", immediateRender: true }, tin + 0.25);
    tl.fromTo(cap, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out", immediateRender: true }, tin + 0.45);
    tl.to([win, cap], { x: 140, opacity: 0, duration: 0.35, ease: "power2.in" }, tout - 0.15);
    return { tl: tl };
  };
  // MOVE-04 punch-in (layout F, the Jackett engine's 1.0 / 1.08 alternation): an instant 108 % at the jump cut, a slow push either side
  R["move-punch"] = function (ctx) {
    var C = ctx.B.base.cuts[0], tl = H.tl(), fx = H.mediaFX(ctx); fx.oy = 28;
    tl.fromTo(fx, { sc: 1 }, { sc: 1.03, duration: C - ctx.seg[0], ease: "none", onUpdate: fx.apply, immediateRender: true }, ctx.seg[0]);
    tl.set(fx, { sc: 1.08, onComplete: fx.apply }, C);
    tl.to(fx, { sc: 1.11, duration: ctx.seg[1] - C, ease: "none", onUpdate: fx.apply }, C);
    return { tl: tl };
  };
  // MOVE-05 zoom through into the studio (T5 + cut-the-curve): push through her, land in the studio, come back the same way
  R["move-zoom"] = function (ctx) {
    var C = ctx.B.base.cuts[0], back = C + 2.8, tl = H.tl(), fx = H.mediaFX(ctx); fx.oy = 27;
    var win = fullDiv(ctx.over, "overflow:hidden;opacity:0;background:#000;");
    var st = ctx.studio(win, "inset:0;width:100%;height:100%;"); st.from(C);
    tl.set(fx, { sc: 1, blur: 0, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { sc: 2.4, blur: 14, duration: 0.6, ease: "power3.in", onUpdate: fx.apply }, C - 0.6);
    tl.set(win, { opacity: 1 }, C);
    tl.fromTo(win, { scale: 1.6, filter: "blur(14px)" }, { scale: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.out", immediateRender: false }, C);
    tl.set(fx, { sc: 1, blur: 0, onComplete: fx.apply }, C + 0.1);
    tl.to(win, { scale: 2.0, filter: "blur(14px)", duration: 0.45, ease: "power3.in" }, back - 0.45);
    tl.set(win, { opacity: 0 }, back);
    tl.fromTo(fx, { sc: 1.5, blur: 14 }, { sc: 1, blur: 0, duration: 0.55, ease: "power3.out", onUpdate: fx.apply, immediateRender: false }, back);
    return { tl: tl };
  };
  // MOVE-06 split screen (layout E): her on top, the studio below, a fine divider wipes across
  R["move-split"] = function (ctx) {
    var b = ctx.B.brand, tl = H.tl(), tin = ctx.seg[0] + 0.5, tout = ctx.seg[1] - 0.8;
    var low = H.abs(ctx.over, "left:0;top:960px;width:1080px;height:960px;overflow:hidden;background:#000;");
    var st = ctx.studio(low, "inset:0;width:100%;height:100%;object-position:50% 45%;"); st.from(tin);
    var line = H.abs(ctx.over, "left:0;top:956px;width:1080px;height:8px;background:" + (b.cream || "#FFFFFF") + ";transform-origin:0% 50%;");
    tl.fromTo(low, { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: "power3.out", immediateRender: true }, tin);
    tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power3.out", immediateRender: true }, tin + 0.05);
    tl.to(low, { yPercent: 100, duration: 0.45, ease: "power3.in" }, tout);
    tl.to(line, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.35, ease: "power3.in" }, tout);
    return { tl: tl };
  };
  // MOVE-08 reframe and side text (layout F reframe + C): she slides right, her words take the open side
  R["move-reframe"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, m = ctx.B.base.moves.side, tl = H.tl(), fx = H.mediaFX(ctx), tin = ctx.seg[0] + 0.5, tout = ctx.seg[1] - 0.9;
    fx.oy = 40;
    tl.set(fx, { x: 0, sc: 1, onComplete: fx.apply }, ctx.seg[0]);
    tl.to(fx, { x: 170, sc: 1.34, duration: 0.64, ease: "power3.inOut", onUpdate: fx.apply }, tin);
    tl.to(fx, { x: 0, sc: 1, duration: 0.64, ease: "power3.inOut", onUpdate: fx.apply }, tout);
    var box = H.abs(ctx.over, "left:90px;top:760px;width:520px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;");
    var a = el("div", "", esc(m.lead)); a.style.cssText = "font-size:48px;line-height:1.1;white-space:nowrap;"; sans(ctx, a, f.w_light, "#FFFFFF"); a.style.textShadow = b.shadow;
    var c = el("div", "", esc(m.big)); c.style.cssText = "font-size:" + Math.min(150, Math.floor(150 * 470 / K.textW(m.big, f.w_bold, 150, f.family))) + "px;line-height:1.05;letter-spacing:-0.03em;white-space:nowrap;"; sans(ctx, c, f.w_bold, "#FFFFFF"); c.style.textShadow = b.shadow; H.emphTok(c, ctx);
    var d = el("div", "", esc(m.small)); d.style.cssText = "font-size:48px;line-height:1.1;white-space:nowrap;"; sans(ctx, d, f.w_light, "#FFFFFF"); d.style.textShadow = b.shadow;
    box.appendChild(a); box.appendChild(c); box.appendChild(d);
    [a, c, d].forEach(function (n, k) { tl.fromTo(n, { x: -90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: "power3.out", immediateRender: true }, tin + 0.35 + k * 0.13); });
    tl.to(box, { opacity: 0, x: -40, duration: 0.3, ease: "power2.in" }, tout - 0.1);
    return { tl: tl };
  };
  // MOVE-07 into the world (Alisha vertical v2 arch push + 8-arch travel): she is framed in the brand arch,
  // the camera pushes through a run of arches into a studio window, on into a stat, then a warm flare cuts back to her
  R["move-world"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, s0 = ctx.seg[0], tl = H.tl(), fx = H.mediaFX(ctx), N = 8, DEP = 0.55;
    var A = { l: 150, t: 170, w: 780, h: 1950 }, OX = 540, OY = 640;
    var T = { rise: s0 + 0.5, travel: s0 + 2.2, travelD: 2.75, push: s0 + 7.3, pushD: 1.1, back: s0 + 10.6 };
    var ZEND = 4.75, WIN = 4.83, CARD = 5.83;
    var cream = b.cream || "#F7F7F5", warm = b.warm || "#E5E2DD", radius = H.shape(ctx, A.w, A.h);
    ctx.backdrop.style.background = warm;
    var deep = el("div"); deep.style.cssText = "position:absolute;left:0;top:0;width:1080px;height:1920px;"; ctx.backdrop.appendChild(deep);
    var card = H.abs(deep, "left:0;top:0;width:1080px;height:1920px;background:" + cream + ";display:flex;flex-direction:column;align-items:center;justify-content:center;transform-origin:540px 640px;");
    var sx = ctx.B.base.words_extra.roll, num = el("div"); num.style.cssText = "display:flex;font-size:330px;line-height:1;"; sans(ctx, num, f.w_display, b.ink, true);
    var digits = String(sx.to).split(""), from = String(sx.from).split(""), strips = [];
    digits.forEach(function (d, k) {
      if (d === from[k]) { var s = el("span", "", d); s.style.cssText = "display:inline-block;width:0.6em;text-align:center;"; num.appendChild(s); return; }
      var win = el("span"); win.style.cssText = "display:inline-block;width:0.6em;text-align:center;height:1em;overflow:hidden;";
      var col = el("span"); col.style.cssText = "display:flex;flex-direction:column;align-items:center;";
      for (var v = +from[k]; v <= +d; v++) { var q = el("span", "", String(v)); q.style.cssText = "height:1em;line-height:1;"; col.appendChild(q); }
      win.appendChild(col); num.appendChild(win); strips.push({ col: col, steps: (+d) - (+from[k]) });
    });
    var lab = el("div", "", esc(sx.after)); lab.style.cssText = "font-size:44px;letter-spacing:.04em;margin-top:24px;"; sans(ctx, lab, f.w_light, b.taupe);
    var rule = el("div"); rule.style.cssText = "width:120px;height:3px;background:" + b.accent + ";margin-top:30px;";
    card.appendChild(num); card.appendChild(lab); card.appendChild(rule);
    var win = H.abs(deep, "left:190px;top:292px;width:700px;height:1300px;border-radius:350px 350px 0 0;overflow:hidden;background:#000;box-shadow:0 0 0 14px " + rgba(warm, 0.9) + ", 0 30px 70px rgba(35,31,32,.22);transform-origin:350px 348px;");
    var st = ctx.studio(win, "inset:0;width:100%;height:100%;"); st.from(T.travel + 1.2);
    var walls = [];
    for (var j = N - 1; j >= 1; j--) {
      var c = mixHex(cream, warm, j / (N - 1));
      walls[j] = H.abs(deep, "left:" + A.l + "px;top:" + A.t + "px;width:" + A.w + "px;height:" + A.h + "px;border-radius:" + radius + ";box-shadow:0 0 0 9000px " + c + ", 0 0 70px 9012px rgba(35,31,32,.10), inset 0 0 0 10px " + rgba(warm, 0.55) + ";transform-origin:" + (OX - A.l) + "px " + (OY - A.t) + "px;");
    }
    var front = H.abs(ctx.over, "left:" + A.l + "px;top:" + A.t + "px;width:" + A.w + "px;height:" + A.h + "px;border-radius:" + radius + ";box-shadow:0 0 0 9000px " + cream + ", 0 30px 70px 9000px rgba(35,31,32,.08), inset 0 0 0 10px " + rgba(warm, 0.55) + ";transform-origin:" + (OX - A.l) + "px " + (OY - A.t) + "px;");
    var eRise = E("power3.out"), eTr = E("sine.inOut"), eIn = E("power2.in"), ePush = E("power2.inOut"), eFr = E("sine.inOut");
    function sc(dep, z) { var d = 1 + dep - z; return d <= 0.02 ? 99 : 1 / d; }
    function render(t) {
      var z = 0;
      if (t >= T.travel) z = ZEND * eTr(seg01(t, T.travel, T.travel + T.travelD));
      if (t >= T.travel + T.travelD) z = ZEND + 0.05 * seg01(t, T.travel + T.travelD, T.push);
      if (t >= T.push) z = lerp(ZEND + 0.05, CARD, ePush(seg01(t, T.push, T.push + T.pushD)));
      var done = t >= T.back;
      // her: framed at 0.86 about the bottom centre, then rides the push and leaves left
      var frame = eFr(seg01(t, T.rise - 0.3, T.rise + 0.9)), k0 = sc(0, z), herS = lerp(1, 0.86, frame), herY = lerp(0, 179.2, frame);
      var out = eIn(seg01(t, T.travel, T.travel + 0.6));
      fx.ox = 50; fx.oy = 33.33;
      if (done) { fx.sc = 1; fx.x = 0; fx.y = 0; } else { var kk = Math.min(k0, 6); fx.sc = herS * kk; fx.y = herY * kk; fx.x = -1300 * out; }
      fx.apply();
      ctx.media.style.visibility = (!done && out >= 1) ? "hidden" : "visible";
      // the front arch rises, then the camera passes through it
      var rise = eRise(seg01(t, T.rise, T.rise + 1.15));
      front.style.visibility = done || k0 > 7 ? "hidden" : "visible";
      front.style.transform = "translateY(" + ((1 - rise) * 1500).toFixed(1) + "px) scale(" + Math.min(k0, 40).toFixed(4) + ")";
      deep.style.visibility = done ? "hidden" : "visible";
      for (var j = 1; j < N; j++) { var s = sc(DEP * j, z); walls[j].style.visibility = s > 7 ? "hidden" : "visible"; walls[j].style.transform = "scale(" + Math.min(s, 40).toFixed(4) + ")"; }
      var sw = sc(WIN, z); win.style.visibility = sw > 7 ? "hidden" : "visible"; win.style.transform = "scale(" + Math.min(sw, 40).toFixed(4) + ")";
      var scard = sc(CARD, z); card.style.transform = "scale(" + Math.min(scard, 2).toFixed(4) + ")"; card.style.visibility = sw > 1.6 || t >= T.push + T.pushD ? "visible" : "hidden";
      var roll = E("power2.inOut")(seg01(t, T.push + T.pushD + 0.4, T.push + T.pushD + 1.3));
      strips.forEach(function (s) { s.col.style.transform = "translateY(" + (-roll * s.steps * 100 / (s.steps + 1)).toFixed(2) + "%)"; });
      lab.style.opacity = seg01(t, T.push + T.pushD + 0.9, T.push + T.pushD + 1.4).toFixed(3);
    }
    clock(tl, ctx, render);
    flare(ctx, tl, T.back);
    return { tl: tl };
  };

  /* ================= GRAPHICS (style-library cards and Jackett Ranch board mechanisms, in the client's tokens) ================= */
  function paper(ctx) { return ctx.B.brand.cream || "#FFFFFF"; }
  function cardShadow(ctx) { return ctx.B.brand.card_shadow || "0 18px 44px rgba(35,31,32,.16), 0 2px 6px rgba(35,31,32,.08)"; }
  function inOut(ctx) { return { tin: ctx.seg[0] + 0.45, tout: ctx.seg[1] - 0.7 }; }
  // GFX-01 big stat (03-atpilates t2-stat-card): a tilted card, the number in the display face, the line under it
  R["gfx-stat"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, sx = ctx.B.base.words_extra.stat, T = inOut(ctx), tl = H.tl();
    var cardEl = H.abs(ctx.over, "left:150px;top:820px;width:780px;padding:56px 48px 60px;border-radius:" + (b.radius_card || 28) + "px;background:" + paper(ctx) + ";box-shadow:" + cardShadow(ctx) + ";display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%;");
    var parts = sx.big.split(" "), num = el("div"); num.style.cssText = "display:flex;gap:24px;align-items:baseline;font-size:" + Math.min(190, Math.floor(190 * 640 / Math.max(1, K.textW(sx.big, f.w_display, 190, f.display)))) + "px;line-height:0.9;white-space:nowrap;";
    var spans = parts.map(function (p, k) { var s = el("span", "", esc(p)); sans(ctx, s, f.w_display, k === 1 ? b.taupe : b.ink, true); if (k === 1) s.style.fontSize = "0.45em"; num.appendChild(s); return s; });
    var line = el("div", "", esc(sx.line)); line.style.cssText = "font-size:38px;line-height:1.25;text-align:center;margin-top:22px;max-width:620px;"; sans(ctx, line, f.w_light, b.ink);
    var rule = el("div"); rule.style.cssText = "width:56px;height:3px;background:" + b.accent + ";margin-top:26px;";
    cardEl.appendChild(num); cardEl.appendChild(line); cardEl.appendChild(rule);
    tl.fromTo(cardEl, { y: 420, rotation: -6, opacity: 0 }, { y: 0, rotation: -2, opacity: 1, duration: 0.7, ease: "power3.out", immediateRender: true }, T.tin);
    spans.forEach(function (s, k) { tl.fromTo(s, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.5)", immediateRender: true }, T.tin + 0.35 + k * 0.28); });
    tl.fromTo([line, rule], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", immediateRender: true }, T.tin + 1.2);
    tl.to(cardEl, { y: 120, opacity: 0, duration: 0.4, ease: "power2.in" }, T.tout);
    return { tl: tl };
  };
  // GFX-02 rolling number (t1-stat-odometer, the v2 200 to 220 roll): the tens digit rolls as the line swaps
  R["gfx-roll"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, sx = ctx.B.base.words_extra.roll, T = inOut(ctx), tl = H.tl();
    var box = H.abs(ctx.over, "left:0;width:1080px;top:960px;display:flex;flex-direction:column;align-items:center;");
    var num = el("div"); num.style.cssText = "display:flex;font-size:300px;line-height:1;"; sans(ctx, num, f.w_display, b.cream || "#FFFFFF", true); num.style.textShadow = "0 6px 40px rgba(24,14,10,.45)";
    var to = String(sx.to).split(""), from = String(sx.from).split(""), strips = [];
    to.forEach(function (d, k) {
      if (d === from[k]) { var sp = el("span", "", d); sp.style.cssText = "display:inline-block;width:0.6em;text-align:center;"; num.appendChild(sp); return; }
      var w = el("span"); w.style.cssText = "display:inline-block;width:0.6em;text-align:center;height:1em;overflow:hidden;"; var col = el("span"); col.style.cssText = "display:flex;flex-direction:column;align-items:center;";
      for (var v = +from[k]; v <= +d; v++) { var q = el("span", "", String(v)); q.style.cssText = "height:1em;line-height:1;"; col.appendChild(q); }
      w.appendChild(col); num.appendChild(w); strips.push({ col: col, n: (+d) - (+from[k]) });
    });
    var l1 = el("div", "", esc(sx.before)), l2 = el("div", "", esc(sx.after));
    var labs = el("div"); labs.style.cssText = "position:relative;height:60px;width:1080px;margin-top:6px;";
    [l1, l2].forEach(function (l) { l.style.cssText = "position:absolute;left:0;right:0;text-align:center;font-size:46px;letter-spacing:.02em;white-space:nowrap;"; sans(ctx, l, f.w_light, "#FFFFFF"); l.style.textShadow = b.shadow; labs.appendChild(l); });
    var rule = el("div"); rule.style.cssText = "width:120px;height:3px;background:" + b.accent + ";margin-bottom:22px;transform-origin:50% 50%;";
    box.appendChild(rule); box.appendChild(num); box.appendChild(labs);
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.out", immediateRender: true }, T.tin);
    tl.fromTo(num, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", immediateRender: true }, T.tin + 0.1);
    tl.fromTo(l1, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: true }, T.tin + 0.4);
    var rollAt = T.tin + 2.1;
    strips.forEach(function (s) { tl.fromTo(s.col, { yPercent: 0 }, { yPercent: -100 * s.n / (s.n + 1), duration: 0.9, ease: "power2.inOut", immediateRender: true }, rollAt); });
    tl.to(l1, { opacity: 0, y: -14, duration: 0.25 }, rollAt + 0.2);
    tl.fromTo(l2, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, immediateRender: true }, rollAt + 0.45);
    tl.to(box, { opacity: 0, duration: 0.35 }, T.tout + 0.2);
    return { tl: tl };
  };
  // GFX-03 arch quote (t2-lb-pullquote in the brand shape): a cream arch rises from below holding her line
  R["gfx-quote"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, T = inOut(ctx), tl = H.tl(), q = ctx.B.base.words_extra.quote || { text: "There was going to be a demand.", label: ctx.B.base.hook_label };
    var arch = H.abs(ctx.over, "left:150px;top:820px;width:780px;height:1200px;border-radius:" + H.shape(ctx, 780, 1200) + ";background:" + paper(ctx) + ";box-shadow:" + (b.arch_shadow || "0 30px 70px rgba(35,31,32,.22)") + ", inset 0 0 0 10px " + rgba(b.warm || "#E5E2DD", 0.55) + ";display:flex;flex-direction:column;align-items:center;padding:150px 80px 0;");
    var mark = el("div"); mark.textContent = String.fromCharCode(8220); mark.style.cssText = "font-size:200px;line-height:0.6;height:90px;"; sans(ctx, mark, f.w_display, b.accent, true);
    var txt = el("div", "", esc(q.text)); txt.style.cssText = "font-size:64px;line-height:1.12;text-align:center;letter-spacing:-0.01em;margin-top:10px;"; sans(ctx, txt, f.w_bold, b.ink);
    var lab = el("div", "", esc(q.label)); lab.style.cssText = "font-size:28px;line-height:1.3;text-align:center;margin-top:30px;letter-spacing:.14em;text-transform:uppercase;"; sans(ctx, lab, f.w_light, b.taupe);
    arch.appendChild(mark); arch.appendChild(txt); arch.appendChild(lab);
    tl.fromTo(arch, { y: 1100 }, { y: 0, duration: 1.25, ease: "power3.out", immediateRender: true }, T.tin);
    tl.fromTo([mark, txt, lab], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.14, immediateRender: true }, T.tin + 0.75);
    tl.to(arch, { y: 1100, duration: 0.6, ease: "power3.in" }, T.tout - 0.1);
    return { tl: tl };
  };
  // GFX-04 section marker (t1-section-numeral): a ghost numeral drifts behind a clean chapter title
  R["gfx-section"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, sx = ctx.B.base.words_extra.section, T = inOut(ctx), tl = H.tl();
    var pane = fullDiv(ctx.over, "background:" + (b.light || paper(ctx)) + ";overflow:hidden;");
    var ghost = H.abs(pane, "left:0;width:1080px;top:380px;text-align:center;font-size:900px;line-height:1;color:transparent;-webkit-text-stroke:4px " + mixHex(b.warm || "#E5E2DD", b.taupe || "#6B6B6B", 0.45) + ";", esc(sx.num));
    ghost.style.fontFamily = H.fam(f, true); ghost.style.fontWeight = f.w_display;
    var kick = H.abs(pane, "left:0;width:1080px;top:860px;text-align:center;font-size:30px;letter-spacing:.34em;text-indent:.34em;text-transform:uppercase;", esc(sx.kicker || "Part " + sx.num)); sans(ctx, kick, f.w_light, b.taupe);
    var m = H.abs(pane, "left:0;width:1080px;top:920px;overflow:hidden;text-align:center;");
    var title = el("div", "", esc(sx.title)); title.style.cssText = "font-size:120px;line-height:1.1;letter-spacing:-0.02em;"; sans(ctx, title, f.w_bold, b.ink); m.appendChild(title);
    var rule = H.abs(pane, "left:480px;top:1090px;width:120px;height:3px;background:" + b.accent + ";transform-origin:50% 50%;");
    tl.fromTo(pane, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 0.6, ease: "power3.inOut", immediateRender: true }, T.tin);
    tl.fromTo(ghost, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.4, ease: "power2.out", immediateRender: true }, T.tin + 0.2);
    tl.fromTo(kick, { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.34em", duration: 0.8, ease: "power2.out", immediateRender: true }, T.tin + 0.45);
    tl.fromTo(title, { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: "power4.out", immediateRender: true }, T.tin + 0.55);
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.inOut", immediateRender: true }, T.tin + 0.9);
    tl.to(pane, { clipPath: "inset(0 0 100% 0)", duration: 0.55, ease: "power3.inOut" }, T.tout);
    return { tl: tl };
  };
  // GFX-05 photo board (Jackett Ranch board + OPEN_dad pushpins): photos pin up while one camera drifts across the board
  R["gfx-board"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, T = inOut(ctx), tl = H.tl(), photos = ctx.B.base.photos.slice(0, 4);
    var pane = fullDiv(ctx.over, "overflow:hidden;background:" + (b.warm || "#E5E2DD") + ";");
    var world = H.abs(pane, "left:0;top:0;width:2300px;height:2700px;transform-origin:0 0;background:" + (b.light || paper(ctx)) + ";box-shadow:inset 0 0 0 40px " + rgba(b.warm || "#E5E2DD", 0.5) + ";");
    var spots = [[600, 760, -4], [1660, 700, 3], [640, 1900, 2.5], [1680, 1960, -3]];
    var items = photos.map(function (p, k) {
      var s = spots[k], w = 820, h = 640;
      var it = H.abs(world, "left:" + (s[0] - w / 2) + "px;top:" + (s[1] - h / 2) + "px;width:" + w + "px;padding:26px 26px 0;background:#FFFFFF;box-shadow:16px 26px 40px rgba(35,31,32,.28);transform-origin:50% 6%;");
      var im = el("img"); im.src = p.src; im.alt = ""; im.style.cssText = "display:block;width:100%;height:" + h + "px;object-fit:cover;"; it.appendChild(im);
      var cap = el("div", "", esc(p.caption)); cap.style.cssText = "font-size:40px;line-height:1;padding:22px 0 26px;text-align:center;"; sans(ctx, cap, f.w_light, b.ink); it.appendChild(cap);
      var pin = H.abs(it, "left:50%;top:-18px;width:44px;height:44px;margin-left:-22px;border-radius:50%;background:radial-gradient(circle at 35% 30%," + mixHex(b.accent, "#FFFFFF", 0.45) + "," + b.accent + " 55%," + mixHex(b.accent, "#000000", 0.35) + ");box-shadow:6px 10px 8px rgba(0,0,0,.35);");
      return { it: it, s: s };
    });
    var cam = { cx: 1150, cy: 1350, z: 0.4, r: 0 }, apply = function () { world.style.transform = "translate(540px,960px) rotate(" + cam.r + "deg) scale(" + cam.z + ") translate(" + (-cam.cx) + "px," + (-cam.cy) + "px)"; };
    apply();
    tl.fromTo(pane, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out", immediateRender: true }, T.tin);
    tl.set(cam, { cx: 1150, cy: 1350, z: 0.4, r: 0, onComplete: apply }, ctx.seg[0]);
    var t = T.tin + 0.15, stop = 1.05;
    items.forEach(function (o, k) {
      tl.to(cam, { cx: o.s[0], cy: o.s[1] + 40, z: 1.0, r: -o.s[2] * 0.6, duration: 0.7, ease: "power2.inOut", onUpdate: apply }, t);
      tl.fromTo(o.it, { scale: 1.7, rotation: o.s[2] + 10, opacity: 0 }, { scale: 1, rotation: o.s[2], opacity: 1, duration: 0.22, ease: "power4.in", immediateRender: true }, t + 0.42);
      tl.to(cam, { z: 1.035, cy: o.s[1] - 10, duration: stop - 0.7, ease: "none", onUpdate: apply }, t + 0.7);
      t += stop;
    });
    tl.to(cam, { cx: 1150, cy: 1350, z: 0.4, r: 0, duration: 0.8, ease: "power2.inOut", onUpdate: apply }, t);
    tl.to(pane, { opacity: 0, duration: 0.35 }, Math.max(t + 0.9, T.tout));
    return { tl: tl };
  };
  // GFX-06 studio card (live footage in a window, Jackett WIDE_B window + card tilt): a studio clip card beside her
  R["gfx-studio"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, T = inOut(ctx), tl = H.tl();
    var cardEl = H.abs(ctx.over, "left:560px;top:820px;width:360px;height:640px;border-radius:" + (b.radius_card || 28) + "px;overflow:hidden;border:10px solid " + paper(ctx) + ";box-shadow:" + cardShadow(ctx) + ";background:#000;transform-origin:50% 100%;");
    var st = ctx.studio(cardEl, "inset:0;width:100%;height:100%;"); st.from(T.tin);
    var pill = H.abs(ctx.over, "left:570px;top:1478px;width:340px;text-align:center;", "<span>" + esc(ctx.B.base.studio.label) + "</span>");
    var sp = pill.firstChild; sp.style.cssText = "display:inline-block;padding:12px 22px;border-radius:100px;background:" + paper(ctx) + ";font-size:30px;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.15);"; sans(ctx, sp, f.w_bold, b.ink);
    tl.fromTo(cardEl, { scale: 0.6, y: 80, rotation: 4, opacity: 0 }, { scale: 1, y: 0, rotation: -3, opacity: 1, duration: 0.6, ease: "back.out(1.4)", immediateRender: true }, T.tin);
    tl.fromTo(pill, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: true }, T.tin + 0.4);
    tl.fromTo(cardEl, { scale: 1 }, { scale: 1.02, duration: T.tout - T.tin - 0.6, ease: "none", immediateRender: false }, T.tin + 0.6);
    tl.to([cardEl, pill], { opacity: 0, scale: 0.92, duration: 0.35, ease: "power2.in" }, T.tout);
    return { tl: tl };
  };
  // GFX-07 list card (t1-overview-checklist): three of her points tick on, one by one
  R["gfx-list"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, T = inOut(ctx), tl = H.tl(), items = ctx.B.base.words_extra.list;
    var cardEl = H.abs(ctx.over, "left:150px;top:860px;width:780px;padding:44px 50px;border-radius:" + (b.radius_card || 28) + "px;background:" + paper(ctx) + ";box-shadow:" + cardShadow(ctx) + ";display:flex;flex-direction:column;gap:30px;transform-origin:50% 0%;");
    var NS = "http://www.w3.org/2000/svg";
    var rows = items.map(function (txt) {
      var row = el("div"); row.style.cssText = "display:flex;align-items:center;gap:26px;";
      var dot = el("div"); dot.style.cssText = "flex:0 0 auto;width:58px;height:58px;border-radius:50%;background:" + b.accent + ";display:grid;place-items:center;";
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.style.cssText = "width:34px;height:34px;";
      var p = document.createElementNS(NS, "path"); p.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#FFFFFF"); p.setAttribute("stroke-width", "3.2"); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round"); p.setAttribute("pathLength", "1"); p.setAttribute("stroke-dasharray", "1"); p.setAttribute("stroke-dashoffset", "1");
      svg.appendChild(p); dot.appendChild(svg);
      var tx = el("div", "", esc(txt)); tx.style.cssText = "font-size:44px;line-height:1.15;"; sans(ctx, tx, f.w_bold, b.ink);
      row.appendChild(dot); row.appendChild(tx); cardEl.appendChild(row);
      return { row: row, dot: dot, p: p };
    });
    tl.fromTo(cardEl, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.45, ease: "power3.out", immediateRender: true }, T.tin);
    rows.forEach(function (r, k) {
      var at = T.tin + 0.5 + k * 0.7;
      tl.fromTo(r.row, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out", immediateRender: true }, at);
      tl.fromTo(r.dot, { scale: 0.4 }, { scale: 1, duration: 0.3, ease: "back.out(1.6)", immediateRender: true }, at + 0.1);
      tl.fromTo(r.p, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.3, ease: "power2.out", immediateRender: true }, at + 0.25);
    });
    tl.to(cardEl, { opacity: 0, y: 40, duration: 0.35, ease: "power2.in" }, T.tout);
    return { tl: tl };
  };
  // GFX-08 map pin (t2-lt-geopin + Jackett route map): streets draw on, a route runs to the pin, the pin drops, the camera leans in
  R["gfx-map"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, T = inOut(ctx), tl = H.tl(), pl = ctx.B.base.words_extra.place, NS = "http://www.w3.org/2000/svg";
    var cardEl = H.abs(ctx.over, "left:140px;top:770px;width:800px;height:720px;border-radius:" + (b.radius_card || 28) + "px;overflow:hidden;background:" + paper(ctx) + ";box-shadow:" + cardShadow(ctx) + ";");
    var mapBox = H.abs(cardEl, "left:0;top:-90px;width:800px;height:700px;transform-origin:520px 330px;");
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 800 700"); svg.style.cssText = "position:absolute;inset:0;width:800px;height:700px;";
    mapBox.appendChild(svg);
    var roads = ["M-20 160 C 200 140 420 220 820 180", "M-20 470 C 220 430 520 520 820 440", "M160 -20 C 190 220 120 460 210 720", "M560 -20 C 520 200 600 470 540 720", "M-20 620 L 820 300", "M300 -20 C 360 300 420 420 380 720"];
    var paths = roads.map(function (d, k) { var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", k < 2 ? (b.warm || "#E5E2DD") : mixHex(b.warm || "#E5E2DD", b.ink, 0.12)); p.setAttribute("stroke-width", k < 2 ? 26 : 14); p.setAttribute("stroke-linecap", "round"); p.setAttribute("pathLength", "1"); p.setAttribute("stroke-dasharray", "1"); p.setAttribute("stroke-dashoffset", "1"); svg.appendChild(p); return p; });
    var route = document.createElementNS(NS, "path"); route.setAttribute("d", "M90 640 C 220 560 300 420 420 400 S 500 340 520 330"); route.setAttribute("fill", "none"); route.setAttribute("stroke", b.accent); route.setAttribute("stroke-width", 9); route.setAttribute("stroke-linecap", "round"); route.setAttribute("stroke-dasharray", "2 0"); route.setAttribute("pathLength", "1"); route.setAttribute("stroke-dashoffset", "1"); route.setAttribute("stroke-dasharray", "1"); svg.appendChild(route);
    var ring = H.abs(mapBox, "left:460px;top:270px;width:120px;height:120px;border-radius:50%;border:4px solid " + b.accent + ";opacity:0;");
    var pin = H.abs(mapBox, "left:488px;top:226px;width:64px;height:100px;");
    pin.innerHTML = '<svg viewBox="0 0 64 100" width="64" height="100"><path d="M32 98C32 98 4 58 4 32a28 28 0 1 1 56 0c0 26-28 66-28 66z" fill="' + b.ink + '"/><circle cx="32" cy="32" r="11" fill="' + paper(ctx) + '"/></svg>';
    var lab = H.abs(cardEl, "left:0;top:540px;width:800px;height:180px;background:" + paper(ctx) + ";display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-top:1px solid " + rgba(b.warm || "#E5E2DD", 1) + ";");
    var n1 = el("div", "", esc(pl.name)); n1.style.cssText = "font-size:54px;line-height:1.1;"; sans(ctx, n1, f.w_bold, b.ink);
    var n2 = el("div", "", esc(pl.sub)); n2.style.cssText = "font-size:30px;letter-spacing:.24em;text-transform:uppercase;"; sans(ctx, n2, f.w_light, b.taupe);
    lab.appendChild(n1); lab.appendChild(n2);
    tl.fromTo(cardEl, { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", immediateRender: true }, T.tin);
    paths.forEach(function (p, k) { tl.fromTo(p, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.8, ease: "power2.out", immediateRender: true }, T.tin + 0.2 + k * 0.06); });
    tl.fromTo(route, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.0, ease: "none", immediateRender: true }, T.tin + 0.8);
    tl.fromTo(pin, { y: -140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.3)", immediateRender: true }, T.tin + 1.75);
    tl.fromTo(ring, { scale: 0.3, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.9, ease: "power2.out", immediateRender: true }, T.tin + 2.15);
    tl.fromTo(mapBox, { scale: 1 }, { scale: 1.18, duration: 2.2, ease: "power2.inOut", immediateRender: true }, T.tin + 1.9);
    tl.fromTo([n1, n2], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "power2.out", immediateRender: true }, T.tin + 2.0);
    tl.to(cardEl, { opacity: 0, y: 40, duration: 0.35, ease: "power2.in" }, T.tout);
    return { tl: tl };
  };
  // GFX-09 taped photos (Jackett Ranch tape + slam): photos slam onto the frame and get taped at the corners
  R["gfx-taped"] = function (ctx) {
    var b = ctx.B.brand, T = inOut(ctx), tl = H.tl(), photos = ctx.B.base.photos, f = ctx.f;
    var spots = [[340, 560, -4, 1], [740, 760, 5, 2], [420, 1080, 2, 0]];
    spots.forEach(function (s, k) {
      var p = photos[s[3]] || photos[0], w = 470, h = 360;
      var it = H.abs(ctx.over, "left:" + (s[0] - w / 2) + "px;top:" + (s[1] - h / 2) + "px;width:" + w + "px;height:" + h + "px;outline:18px solid #FFFFFF;box-shadow:0 0 0 19px rgba(0,0,0,.10),18px 30px 50px rgba(0,0,0,.35);");
      var im = el("img"); im.src = p.src; im.alt = ""; im.style.cssText = "display:block;width:100%;height:100%;object-fit:cover;"; it.appendChild(im);
      var tape = "position:absolute;width:170px;height:52px;background:" + rgba(b.warm || "#E5E2DD", 0.82) + ";box-shadow:0 2px 6px rgba(0,0,0,.12);";
      H.abs(it, tape + "left:-80px;top:-46px;transform:rotate(-38deg);"); H.abs(it, tape + "right:-80px;bottom:-46px;transform:rotate(-38deg);");
      var at = T.tin + k * 0.55;
      tl.fromTo(it, { scale: 2.0, rotation: s[2] - 8, opacity: 0 }, { scale: 1, rotation: s[2], opacity: 1, duration: 0.18, ease: "power4.in", immediateRender: true }, at);
      tl.to(it, { y: 1900, rotation: s[2] + (k % 2 ? 12 : -14), duration: 0.5, ease: "power2.in" }, T.tout + k * 0.05);
    });
    return { tl: tl };
  };
  // GFX-10 board travel (Jackett Ranch usa-property-shared engine): she becomes one slot on a board, the camera travels slot to slot and back to her
  R["gfx-travel"] = function (ctx) {
    var b = ctx.B.brand, f = ctx.f, s0 = ctx.seg[0], tl = H.tl(), fx = H.mediaFX(ctx);
    var slots = [{ cx: 900, cy: 1300, tilt: -1.5 }, { cx: 2350, cy: 1300, tilt: 1 }, { cx: 3800, cy: 1300, tilt: -2 }];
    var world = H.abs(ctx.backdrop, "left:0;top:0;width:5300px;height:2900px;transform-origin:0 0;background:" + (b.light || paper(ctx)) + ";");
    ctx.backdrop.style.background = b.warm || "#E5E2DD";
    var mk = function (s) { return H.abs(world, "left:" + (s.cx - 540) + "px;top:" + (s.cy - 960) + "px;width:1080px;height:1920px;transform:rotate(" + s.tilt + "deg);box-shadow:0 0 0 22px #FFFFFF,30px 50px 90px 30px rgba(0,0,0,.30);overflow:hidden;"); };
    var shadow0 = mk(slots[0]); shadow0.style.background = "#000";
    var s1 = mk(slots[1]); var st = ctx.studio(s1, "inset:0;width:100%;height:100%;"); st.from(s0);
    var s2 = mk(slots[2]); s2.style.background = paper(ctx); s2.style.display = "flex"; s2.style.flexDirection = "column"; s2.style.alignItems = "center"; s2.style.justifyContent = "center";
    var sx = ctx.B.base.words_extra.stat, n = el("div", "", esc(sx.big)); n.style.cssText = "font-size:" + Math.min(230, Math.floor(230 * 900 / Math.max(1, K.textW(sx.big, f.w_display, 230, f.display)))) + "px;line-height:1;white-space:nowrap;"; sans(ctx, n, f.w_display, b.ink, true);
    var ln = el("div", "", esc(sx.line)); ln.style.cssText = "font-size:46px;line-height:1.25;text-align:center;max-width:760px;margin-top:30px;"; sans(ctx, ln, f.w_light, b.ink);
    s2.appendChild(n); s2.appendChild(ln);
    var Tm = [s0 + 0.6, s0 + 1.4, s0 + 2.9, s0 + 3.7, s0 + 5.0, s0 + 5.8, s0 + 6.4];
    var eIO = E("power2.inOut"), eO = E("power2.out");
    function camAt(t) {
      var A = slots[0], Bs = slots[1], Cs = slots[2], c = { cx: A.cx, cy: A.cy, z: 1, r: -A.tilt };
      var mv = function (P, Q, zP, zQ, a, d) { var u = eIO(seg01(t, a, a + d)); return { cx: lerp(P.cx, Q.cx, u), cy: lerp(P.cy, Q.cy, u), z: lerp(zP, zQ, u), r: lerp(-P.tilt, -Q.tilt, u) }; };
      if (t < Tm[0]) return c;
      if (t < Tm[1]) return mv(A, Bs, 1, 0.84, Tm[0], 0.8);
      if (t < Tm[2]) { var h = seg01(t, Tm[1], Tm[2]); return { cx: Bs.cx, cy: Bs.cy - 120 * h, z: 0.84 + 0.035 * h, r: -Bs.tilt }; }
      if (t < Tm[3]) return mv({ cx: Bs.cx, cy: Bs.cy - 120, tilt: Bs.tilt }, Cs, 0.875, 0.84, Tm[2], 0.8);
      if (t < Tm[4]) { var h2 = seg01(t, Tm[3], Tm[4]); return { cx: Cs.cx, cy: Cs.cy - 100 * h2, z: 0.84 + 0.03 * h2, r: -Cs.tilt }; }
      if (t < Tm[5]) return mv({ cx: Cs.cx, cy: Cs.cy - 100, tilt: Cs.tilt }, A, 0.87, 0.84, Tm[4], 0.8);
      var u = eO(seg01(t, Tm[5], Tm[6])); return { cx: A.cx, cy: A.cy, z: lerp(0.84, 1, u), r: -A.tilt };
    }
    function render(t) {
      var c = camAt(t), A = slots[0];
      world.style.transform = "translate(540px,960px) rotate(" + c.r + "deg) scale(" + c.z + ") translate(" + (-c.cx) + "px," + (-c.cy) + "px)";
      // her video is slot 0: same camera, so the board and her frame move as one
      var dx = A.cx - c.cx, dy = A.cy - c.cy, rr = c.r * Math.PI / 180, tx = c.z * (dx * Math.cos(rr) - dy * Math.sin(rr)), ty = c.z * (dx * Math.sin(rr) + dy * Math.cos(rr));
      var rot = c.r + A.tilt;
      ctx.media.style.transformOrigin = "50% 50%";
      ctx.media.style.transform = Math.abs(c.z - 1) < 1e-4 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01 && Math.abs(rot) < 1e-4 ? "" : "translate(" + (tx / 10.8).toFixed(3) + "%," + (ty / 19.2).toFixed(3) + "%) rotate(" + rot.toFixed(3) + "deg) scale(" + c.z.toFixed(4) + ")";
      ctx.media.style.boxShadow = c.z < 0.999 ? "0 0 0 " + ctx.px(22 * c.z).toFixed(1) + "px #FFFFFF" : "";
    }
    clock(tl, ctx, render);
    return { tl: tl, teardown: function () { ctx.media.style.boxShadow = ""; } };
  };
});
