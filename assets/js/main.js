/* Progressive enhancement only — the page is fully readable without this file. */
(() => {
  "use strict";

  document.documentElement.classList.remove("no-js");

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover: hover)").matches;

  /* --- nav: border appears once you leave the hero --- */
  const nav = document.querySelector(".nav");
  if (nav) {
    const sentinel = document.createElement("div");
    document.body.prepend(sentinel);
    new IntersectionObserver(
      ([e]) => nav.setAttribute("data-scrolled", String(!e.isIntersecting)),
      { rootMargin: "0px" }
    ).observe(sentinel);
  }

  /* --- reading progress --- */
  const progress = document.querySelector(".progress");
  if (progress) {
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.setProperty("--p", max > 0 ? scrollY / max : 0);
      ticking = false;
    };
    addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* --- scrollspy --- */
  const links = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) =>
            a.setAttribute(
              "aria-current",
              String(a.getAttribute("href") === `#${entry.target.id}`)
            )
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* --- headline: split into words for a staggered reveal.
         Walks text nodes so inline markup like <em> survives. --- */
  if (!reduced) {
    document.querySelectorAll("[data-split]").forEach((el) => {
      let i = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((tok) => {
              if (!tok.trim()) return frag.appendChild(document.createTextNode(tok));
              const span = document.createElement("span");
              span.className = "word";
              span.style.setProperty("--i", i++);
              span.textContent = tok;
              frag.appendChild(span);
            });
            child.replaceWith(frag);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            walk(child);
          }
        });
      };
      walk(el);
    });
  }

  /* --- stat count-up, once, when scrolled into view --- */
  const stats = [...document.querySelectorAll("[data-count]")];
  if (stats.length) {
    const run = (el) => {
      const target = Number(el.dataset.count) || 0;
      if (reduced || !target) return (el.textContent = String(target));
      const dur = 1400;
      let t0;
      const tick = (t) => {
        t0 ??= t;
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          run(e.target);
          obs.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );
    stats.forEach((s) => io.observe(s));
  }

  /* --- reveal fallback where scroll-driven animations are unsupported --- */
  if (!CSS.supports("animation-timeline: view()") && !reduced) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
  }

  /* --- magnetic buttons --- */
  if (!reduced && canHover) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });

    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* --- case modal: open a project in place instead of leaving the page --- */
  const modal = document.getElementById("case-modal");
  if (modal) {
    const panel = modal.querySelector(".modal__panel");
    const elMeta = document.getElementById("case-modal-meta");
    const elTitle = document.getElementById("case-modal-title");
    const elHero = document.getElementById("case-modal-hero");
    const elBody = document.getElementById("case-modal-body");
    const thumbs = document.getElementById("case-modal-thumbs");
    let lastFocus = null;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

    const open = (card) => {
      const item = card.closest(".folio__item");
      const full = item.querySelector(".folio__full");
      const img = card.querySelector(".folio__media img");

      elMeta.textContent = card.querySelector(".folio__meta").textContent;
      elTitle.textContent = card.querySelector(".folio__title").textContent;

      // gallery: first shot is the main image, the rest become thumbnails
      const shots = [...full.querySelectorAll(".folio__shots img")];
      elHero.src = shots.length ? shots[0].src : img.src;
      elHero.alt = shots.length ? shots[0].alt : img.alt;

      thumbs.replaceChildren();
      thumbs.hidden = shots.length < 2;
      shots.forEach((shot, i) => {
        const t = document.createElement("button");
        t.type = "button";
        t.className = "modal__thumb";
        t.setAttribute("aria-current", String(i === 0));
        t.setAttribute("aria-label", `Show image ${i + 1}: ${shot.alt}`);
        const ti = document.createElement("img");
        ti.src = shot.src;
        ti.alt = "";
        ti.loading = "lazy";
        t.appendChild(ti);
        t.addEventListener("click", () => {
          elHero.src = shot.src;
          elHero.alt = shot.alt;
          thumbs.querySelectorAll(".modal__thumb").forEach((o) =>
            o.setAttribute("aria-current", String(o === t))
          );
        });
        thumbs.appendChild(t);
      });

      elBody.replaceChildren();
      // copy the case copy, then the card's own tag list, then the source link
      [...full.children].forEach((n) => {
        if (n.classList.contains("folio__src")) return;
        if (n.classList.contains("folio__shots")) return;
        elBody.appendChild(n.cloneNode(true));
      });
      const tags = item.querySelector(".card__tags");
      if (tags) elBody.appendChild(tags.cloneNode(true));
      const src = full.querySelector(".folio__src");
      if (src) elBody.appendChild(src.cloneNode(true));

      lastFocus = card;
      modal.hidden = false;
      document.body.classList.add("is-locked");
      panel.querySelector(".modal__close").focus();
    };

    const close = () => {
      modal.hidden = true;
      document.body.classList.remove("is-locked");
      if (lastFocus) lastFocus.focus();
    };

    document.querySelectorAll(".folio__open").forEach((btn) =>
      btn.addEventListener("click", () => open(btn))
    );

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      // keep focus inside the dialog while it is open
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* --- hero: a live event pipeline. The page's signature object.
         Top-to-bottom flow, symmetric fan-out off the broker, orthogonal
         connectors and distinct shapes per component type — the conventions
         that make a diagram read as architecture rather than as a graph. --- */
  const pcanvas = document.querySelector(".pipeline__canvas");
  if (pcanvas && pcanvas.getContext) {
    const ctx = pcanvas.getContext("2d");
    const css = getComputedStyle(document.documentElement);
    const tok = (n, f) => css.getPropertyValue(n).trim() || f;
    const ACCENT = tok("--accent", "#7dd3a0");
    const DIM = tok("--accent-dim", "#4c9c72");
    const LINE = tok("--border-strong", "#2c323b");
    const TEXT = tok("--text-muted", "#9aa2ad");
    const FILL = "#0b0d11";

    const rgb = (hex) => {
      const m = hex.match(/^#?([\da-f]{6})$/i);
      if (!m) return "125,211,160";
      const n = parseInt(m[1], 16);
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    };
    const A = rgb(ACCENT);

    // x/y are centres in 0..1; w/h are design px at a 440-wide panel
    const NODES = {
      client: { x: 0.50, y: 0.10, w: 74, h: 26, label: "client",     type: "box" },
      api:    { x: 0.50, y: 0.25, w: 92, h: 32, label: "api",        type: "svc" },
      cache:  { x: 0.16, y: 0.25, w: 62, h: 34, label: "cache",      type: "cyl" },
      broker: { x: 0.50, y: 0.45, w: 96, h: 34, label: "broker",     type: "queue" },
      c1:     { x: 0.27, y: 0.66, w: 88, h: 28, label: "consumer",   type: "svc" },
      c2:     { x: 0.73, y: 0.66, w: 88, h: 28, label: "consumer",   type: "svc" },
      pg:     { x: 0.27, y: 0.845, w: 70, h: 34, label: "db",         type: "cyl" },
      wh:     { x: 0.73, y: 0.845, w: 84, h: 34, label: "warehouse",  type: "cyl" },
    };

    // Straight where the flow is straight, elbowed where it branches.
    // Nothing bypasses the broker; consumers never call each other.
    const EDGES = [
      { a: "client", b: "api",  kind: "v" },
      { a: "api",    b: "cache", kind: "h", both: true },   // cache-aside read path
      { a: "api",    b: "broker", kind: "v" },
      { a: "broker", b: "c1",   kind: "elbow" },            // fan-out to the
      { a: "broker", b: "c2",   kind: "elbow" },            // consumer group
      { a: "c1",     b: "pg",   kind: "v" },
      { a: "c2",     b: "wh",   kind: "v" },
    ];

    const ROUTES = [
      ["client", "api", "broker", "c1", "pg"],
      ["client", "api", "broker", "c2", "wh"],
      ["client", "api", "cache"],
    ];

    let W = 0, H = 0, S = 1, raf = null, t = 0;
    const pointer = { x: -1, y: -1, on: false };

    const packets = [];
    ROUTES.forEach((route, i) => {
      packets.push({ route, seg: 0, p: (i * 0.33) % 1, speed: 0.010 + i * 0.0015 });
      packets.push({ route, seg: 0, p: (i * 0.33 + 0.5) % 1, speed: 0.009 + i * 0.0012 });
    });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = pcanvas.getBoundingClientRect();
      W = r.width; H = r.height; S = Math.min(W, H) / 440;
      pcanvas.width = Math.round(W * dpr);
      pcanvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const box = (n) => {
      const cx = n.x * W, cy = n.y * H, w = n.w * S, h = n.h * S;
      return { cx, cy, w, h, l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
    };

    // polyline for an edge, so packets and the drawn line always agree
    const path = (e) => {
      const A1 = box(NODES[e.a]), B1 = box(NODES[e.b]);
      if (e.kind === "v") return [{ x: A1.cx, y: A1.b }, { x: B1.cx, y: B1.t }];
      if (e.kind === "h") {
        return A1.cx < B1.cx
          ? [{ x: A1.r, y: A1.cy }, { x: B1.l, y: B1.cy }]
          : [{ x: A1.l, y: A1.cy }, { x: B1.r, y: B1.cy }];
      }
      const midY = A1.b + (B1.t - A1.b) * 0.45;
      return [
        { x: A1.cx, y: A1.b },
        { x: A1.cx, y: midY },
        { x: B1.cx, y: midY },
        { x: B1.cx, y: B1.t },
      ];
    };

    const lengths = (pts) => {
      const segs = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        segs.push(d); total += d;
      }
      return { segs, total };
    };

    const along = (pts, f) => {
      const { segs, total } = lengths(pts);
      let d = f * total;
      for (let i = 0; i < segs.length; i++) {
        if (d <= segs[i] || i === segs.length - 1) {
          const k = segs[i] ? d / segs[i] : 0;
          return {
            x: pts[i].x + (pts[i + 1].x - pts[i].x) * k,
            y: pts[i].y + (pts[i + 1].y - pts[i].y) * k,
          };
        }
        d -= segs[i];
      }
      return pts[pts.length - 1];
    };

    const arrow = (x, y, ang, on) => {
      const s = 5 * S;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(ang - 0.45) * s, y - Math.sin(ang - 0.45) * s);
      ctx.lineTo(x - Math.cos(ang + 0.45) * s, y - Math.sin(ang + 0.45) * s);
      ctx.closePath();
      ctx.fillStyle = on ? ACCENT : LINE;
      ctx.fill();
    };

    const roundRect = (l, t2, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(l + r, t2);
      ctx.arcTo(l + w, t2, l + w, t2 + h, r);
      ctx.arcTo(l + w, t2 + h, l, t2 + h, r);
      ctx.arcTo(l, t2 + h, l, t2, r);
      ctx.arcTo(l, t2, l + w, t2, r);
      ctx.closePath();
    };

    const drawNode = (key, n) => {
      const b = box(n);
      const hot = pointer.on &&
        pointer.x > b.l - 8 && pointer.x < b.r + 8 &&
        pointer.y > b.t - 8 && pointer.y < b.b + 8;
      const stroke = hot ? ACCENT : DIM;

      if (hot) {
        ctx.save();
        ctx.shadowColor = `rgba(${A},0.55)`;
        ctx.shadowBlur = 18 * S;
      }

      if (n.type === "cyl") {
        // datastore: cylinder
        const ry = 5 * S;
        ctx.beginPath();
        ctx.moveTo(b.l, b.t + ry);
        ctx.lineTo(b.l, b.b - ry);
        ctx.ellipse(b.cx, b.b - ry, b.w / 2, ry, 0, Math.PI, 0, true);
        ctx.lineTo(b.r, b.t + ry);
        ctx.closePath();
        ctx.fillStyle = FILL; ctx.fill();
        ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(b.cx, b.t + ry, b.w / 2, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = FILL; ctx.fill();
        ctx.strokeStyle = stroke; ctx.stroke();
      } else if (n.type === "queue") {
        // broker: partitions drawn as stacked bars
        roundRect(b.l, b.t, b.w, b.h, 4 * S);
        ctx.fillStyle = FILL; ctx.fill();
        ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const y = b.t + b.h * (0.28 + i * 0.22);
          ctx.beginPath();
          ctx.moveTo(b.l + 8 * S, y);
          ctx.lineTo(b.r - 8 * S, y);
          ctx.strokeStyle = `rgba(${A},${0.20 + 0.12 * Math.sin(t * 2 + i)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        roundRect(b.l, b.t, b.w, b.h, (n.type === "svc" ? 6 : 4) * S);
        ctx.fillStyle = FILL; ctx.fill();
        ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke();
      }
      if (hot) ctx.restore();

      // label sits inside the shape, except on cylinders where it sits under
      ctx.font = `${Math.round(10.5 * Math.max(S, 0.8))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = hot ? ACCENT : TEXT;
      if (n.type === "cyl") {
        ctx.fillText(n.label, b.cx, b.b + 12 * S);
      } else {
        ctx.fillText(n.label, b.cx, b.cy + (n.type === "queue" ? -b.h * 0.12 : 0));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      EDGES.forEach((e) => {
        const pts = path(e);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1;
        ctx.lineJoin = "round";
        ctx.stroke();

        const last = pts[pts.length - 1], prev = pts[pts.length - 2];
        arrow(last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x), false);
        if (e.both) {
          const f = pts[0], nx = pts[1];
          arrow(f.x, f.y, Math.atan2(f.y - nx.y, f.x - nx.x), false);
        }
      });

      packets.forEach((pk) => {
        const a = pk.route[pk.seg], b = pk.route[pk.seg + 1];
        if (!b) return;
        const e = EDGES.find(
          (ed) => (ed.a === a && ed.b === b) || (ed.both && ed.a === b && ed.b === a)
        );
        if (!e) return;
        const pts = e.a === a ? path(e) : path(e).slice().reverse();
        const head = along(pts, pk.p);
        const tail = along(pts, Math.max(0, pk.p - 0.22));
        const g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        g.addColorStop(0, `rgba(${A},0)`);
        g.addColorStop(1, `rgba(${A},0.9)`);
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.2 * S;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.6 * S, 0, Math.PI * 2);
        ctx.fillStyle = ACCENT;
        ctx.fill();
      });

      Object.entries(NODES).forEach(([k, n]) => drawNode(k, n));
    };

    const step = () => {
      t += 0.016;
      packets.forEach((pk) => {
        pk.p += pk.speed * (pointer.on ? 1.6 : 1);
        if (pk.p >= 1) {
          pk.p = 0;
          pk.seg += 1;
          if (pk.seg >= pk.route.length - 1) pk.seg = 0;
        }
      });
      draw();
      raf = requestAnimationFrame(step);
    };

    const start = () => { if (raf === null && !reduced) raf = requestAnimationFrame(step); };
    const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; };

    resize();
    reduced ? draw() : start();

    addEventListener("resize", () => { resize(); draw(); }, { passive: true });
    pcanvas.addEventListener("pointermove", (e) => {
      const r = pcanvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = true;
    });
    pcanvas.addEventListener("pointerleave", () => (pointer.on = false));
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(pcanvas);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }

})();
