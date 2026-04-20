import { useEffect, useRef, useState } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  flash: number;
};

type Pulse = {
  cx: number;
  cy: number;
  startTime: number;
  maxRadius: number;
  duration: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticle(width: number, height: number, rand: () => number): Particle {
  return {
    x: rand() * width,
    y: rand() * height,
    vx: (rand() - 0.5) * 0.13,
    vy: (rand() - 0.5) * 0.13,
    baseAlpha: 0.25 + rand() * 0.55,
    flash: 0,
  };
}

function pickPulseOrigin(w: number, h: number, r: () => number) {
  const corners = [
    { x: -60, y: -60 },
    { x: w + 60, y: -60 },
    { x: -60, y: h + 60 },
    { x: w + 60, y: h + 60 },
    { x: w * 0.5, y: -80 },
    { x: w * 0.5, y: h + 80 },
    { x: -80, y: h * 0.5 },
    { x: w + 80, y: h * 0.5 },
  ];
  return corners[Math.floor(r() * corners.length)];
}

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let pulses: Pulse[] = [];
    const rand = mulberry32(0xfeedface);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const targetCount = Math.max(40, Math.min(95, Math.floor((width * height) / 13500)));
      if (particles.length === 0) {
        for (let i = 0; i < targetCount; i++) particles.push(makeParticle(width, height, rand));
      } else if (particles.length < targetCount) {
        for (let i = particles.length; i < targetCount; i++) particles.push(makeParticle(width, height, rand));
      } else if (particles.length > targetCount) {
        particles = particles.slice(0, targetCount);
      }
      for (const p of particles) {
        if (p.x > width + 20 || p.x < -20) p.x = rand() * width;
        if (p.y > height + 20 || p.y < -20) p.y = rand() * height;
      }
    };
    resize();

    const drawParticle = (p: Particle) => {
      const a = Math.min(1, p.baseAlpha + p.flash * 0.6);
      const isAccent = p.flash > 0.05;
      if (p.flash > 0.05) {
        const r = 3 + p.flash * 5;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        grad.addColorStop(0, `rgba(0, 255, 157, ${0.45 * p.flash})`);
        grad.addColorStop(1, "rgba(0, 255, 157, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = isAccent
        ? `rgba(0, 255, 157, ${Math.min(1, a + 0.2)})`
        : `rgba(225, 232, 240, ${a * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2 + p.flash * 1.6, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawMesh = () => {
      const MAX_DIST = 135;
      const MAX_DIST_SQ = MAX_DIST * MAX_DIST;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_DIST_SQ) {
            const t = 1 - Math.sqrt(d2) / MAX_DIST;
            const accent = particles[i].flash > 0.1 || particles[j].flash > 0.1;
            ctx.strokeStyle = accent
              ? `rgba(0, 255, 157, ${t * 0.22})`
              : `rgba(140, 160, 184, ${t * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const drawStaticFrame = () => {
      ctx.clearRect(0, 0, width, height);
      drawMesh();
      for (const p of particles) drawParticle(p);
    };

    if (reduced) {
      drawStaticFrame();
      const roStatic = new ResizeObserver(() => {
        resize();
        drawStaticFrame();
      });
      roStatic.observe(container);
      return () => roStatic.disconnect();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    let visible = !document.hidden;
    let inView = true;
    let lastTime = performance.now();
    let nextPulse = performance.now() + 2200;

    const onVis = () => {
      visible = !document.hidden;
      lastTime = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        lastTime = performance.now();
      },
      { threshold: 0.01 }
    );
    io.observe(container);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible || !inView) {
        lastTime = t;
        return;
      }
      const dt = Math.min(t - lastTime, 33);
      lastTime = t;

      ctx.clearRect(0, 0, width, height);

      if (t > nextPulse) {
        const origin = pickPulseOrigin(width, height, rand);
        pulses.push({
          cx: origin.x,
          cy: origin.y,
          startTime: t,
          maxRadius: Math.hypot(width, height) * 0.95,
          duration: 4800,
        });
        nextPulse = t + 6500 + rand() * 2500;
      }

      drawMesh();

      for (const p of particles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
        if (p.flash > 0) p.flash = Math.max(0, p.flash - dt / 900);
        for (const pulse of pulses) {
          const elapsed = t - pulse.startTime;
          const radius = (elapsed / pulse.duration) * pulse.maxRadius;
          const prev = Math.max(0, ((elapsed - dt) / pulse.duration) * pulse.maxRadius);
          const d = Math.hypot(p.x - pulse.cx, p.y - pulse.cy);
          if (d > prev && d <= radius) {
            p.flash = Math.max(p.flash, 0.85);
          }
        }
      }

      for (const p of particles) drawParticle(p);

      pulses = pulses.filter((p) => t - p.startTime < p.duration);
      for (const pulse of pulses) {
        const elapsed = t - pulse.startTime;
        const tt = elapsed / pulse.duration;
        const radius = tt * pulse.maxRadius;
        const fade = Math.sin(tt * Math.PI);
        const alpha = (1 - tt) * 0.16 * fade;
        ctx.strokeStyle = `rgba(0, 255, 157, ${alpha * 1.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pulse.cx, pulse.cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(0, 255, 157, ${alpha * 0.45})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(pulse.cx, pulse.cy, Math.max(0, radius - 6), 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      <div
        className="veil-aurora-a absolute"
        style={{
          top: "-25%",
          right: "-15%",
          width: "75%",
          height: "130%",
          background:
            "radial-gradient(ellipse at center, rgba(0,255,157,0.09) 0%, rgba(0,255,157,0) 62%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="veil-aurora-b absolute"
        style={{
          bottom: "-30%",
          left: "-20%",
          width: "75%",
          height: "130%",
          background:
            "radial-gradient(ellipse at center, rgba(0,200,255,0.06) 0%, rgba(0,200,255,0) 62%)",
          filter: "blur(50px)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div
        className="absolute inset-y-0 left-0 w-2/3"
        style={{
          background:
            "linear-gradient(to right, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.78) 28%, rgba(10,10,10,0.40) 55%, rgba(10,10,10,0) 82%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.7) 100%)",
        }}
      />
    </div>
  );
}
