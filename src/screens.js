// Procedural screen artwork for the iPhone Duo model.
// Everything is painted on <canvas> so the model stays a single self-contained folder.

import * as THREE from 'three';

const FONT = "'SF Pro Display','SF Pro Text',-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif";

const APPLE_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 ' +
  '3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 ' +
  '3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 ' +
  '1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 ' +
  '2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 ' +
  '3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 ' +
  '2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

function rrPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  rrPath(ctx, x, y, w, h, r);
}

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function grain(ctx, w, h, amount, alpha, seed = 7) {
  const rnd = seeded(seed);
  ctx.save();
  for (let i = 0; i < amount; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const v = rnd() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * (0.4 + rnd() * 0.6)})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function dunes(ctx, w, h, opt) {
  const { sky, sun, layers, horizon = 0.62, glow = 0.9 } = opt;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  sky.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (sun) {
    const sx = w * sun.x;
    const sy = h * sun.y;
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * (sun.r || 0.55));
    rg.addColorStop(0, `rgba(${sun.color},${glow})`);
    rg.addColorStop(0.35, `rgba(${sun.color},${glow * 0.35})`);
    rg.addColorStop(1, `rgba(${sun.color},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
    if (sun.disc !== false) {
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(w, h) * (sun.discR || 0.035), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${sun.core || '255,244,214'},0.95)`;
      ctx.fill();
    }
  }

  layers.forEach((L, i) => {
    const baseY = h * L.y;
    ctx.beginPath();
    ctx.moveTo(-w * 0.05, baseY);
    const segs = L.segs || 3;
    for (let s = 0; s < segs; s++) {
      const x0 = -w * 0.05 + (w * 1.1 * s) / segs;
      const x3 = -w * 0.05 + (w * 1.1 * (s + 1)) / segs;
      const cx1 = x0 + (x3 - x0) * 0.35;
      const cx2 = x0 + (x3 - x0) * 0.7;
      const y1 = baseY - h * L.amp * (L.wave ? L.wave[s % L.wave.length] : 1);
      const y2 = baseY + h * L.amp * 0.35;
      ctx.bezierCurveTo(cx1, y1, cx2, y2, x3, baseY + h * L.amp * 0.12);
    }
    ctx.lineTo(w * 1.05, h * 1.1);
    ctx.lineTo(-w * 0.05, h * 1.1);
    ctx.closePath();
    const lg = ctx.createLinearGradient(0, baseY - h * L.amp, 0, h);
    lg.addColorStop(0, L.c1);
    lg.addColorStop(1, L.c2);
    ctx.fillStyle = lg;
    ctx.fill();

    // sun-lit crest
    ctx.strokeStyle = `rgba(${L.rim || '255,236,200'},${L.rimA ?? 0.28})`;
    ctx.lineWidth = Math.max(1.5, h * 0.0022);
    ctx.stroke();
  });

  // atmospheric haze near the horizon
  const hz = ctx.createLinearGradient(0, h * horizon - h * 0.12, 0, h * horizon + h * 0.1);
  hz.addColorStop(0, 'rgba(255,220,170,0)');
  hz.addColorStop(0.5, 'rgba(255,220,170,0.12)');
  hz.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, w, h);
}

function cornerMask(ctx, w, h, r) {
  // screens have rounded corners: paint everything outside the rounded rect black,
  // matching the black bezel that sits behind the display.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  rrPath(ctx, 0, 0, w, h, r);
  ctx.fillStyle = '#000';
  ctx.fill('evenodd');
  ctx.restore();
}

function vignette(ctx, w, h, strength = 0.35) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function statusIcons(ctx, x, y, scale, color = 'rgba(255,255,255,0.92)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';

  // signal bars
  for (let i = 0; i < 4; i++) {
    const bh = 4 + i * 2.6;
    rr(ctx, -92 + i * 7, -bh, 4.4, bh, 1.4);
    ctx.fill();
  }
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('5G', -58, 0);

  // wifi
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, -1, 4 + i * 4.4, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // battery
  ctx.lineWidth = 1.6;
  rr(ctx, 24, -10, 27, 12, 3.6);
  ctx.stroke();
  rr(ctx, 27, -7, 18, 6, 1.8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(53.6, -6.5);
  ctx.lineTo(53.6, -1.5);
  ctx.stroke();
  ctx.restore();
}

function widgetBase(ctx, x, y, w, h, r = 34, alpha = 0.24) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, `rgba(255,255,255,${alpha + 0.1})`);
  g.addColorStop(1, `rgba(255,255,255,${alpha * 0.7})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawWeatherWidget(ctx, x, y, w, h) {
  widgetBase(ctx, x, y, w, h, 36, 0.20);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('San Francisco', x + 34, y + 52);
  ctx.font = `300 96px ${FONT}`;
  ctx.fillText('54°', x + 32, y + 152);
  ctx.font = `500 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText('Partly Cloudy', x + 36, y + 196);
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText('H:57°  L:49°', x + 36, y + 236);

  // little sun + cloud
  const cx = x + w - 96;
  const cy = y + 92;
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
  g.addColorStop(0, 'rgba(255,236,180,1)');
  g.addColorStop(1, 'rgba(255,196,92,0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx + 6, cy + 22, 20, 0, Math.PI * 2);
  ctx.arc(cx + 30, cy + 24, 15, 0, Math.PI * 2);
  ctx.arc(cx - 16, cy + 26, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCalendarWidget(ctx, x, y, w, h) {
  widgetBase(ctx, x, y, w, h, 36, 0.26);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText('WED', x + 30, y + 54);

  // crescent moon
  ctx.save();
  ctx.translate(x + w - 46, y + 46);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 13, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(5, 0, 11, Math.PI * 1.5, Math.PI * 0.5, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = 'rgba(18,24,44,0.30)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.font = `300 132px ${FONT}`;
  ctx.fillText('1', x + w / 2, y + 196);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.74)';
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('APRIL 2026', x + w / 2, y + 240);

  ctx.textAlign = 'left';
  ctx.restore();
}

function drawBatteryWidget(ctx, x, y, w, h) {
  widgetBase(ctx, x, y, w, h, 36, 0.2);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('Duo', x + 30, y + 48);
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  const rows = [
    ['Inner', '100%'],
    ['Outer', '100%'],
  ];
  rows.forEach(([label, val], i) => {
    const ry = y + 104 + i * 78;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(label, x + 30, ry);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    rr(ctx, x + 30, ry + 14, w - 60, 18, 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(126,242,142,0.95)';
    rr(ctx, x + 34, ry + 18, w - 68, 10, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(val, x + w - 86, ry);
  });
  ctx.restore();
}

const ICONS = {
  phone: ['#63e37c', '#20b64a'],
  messages: ['#6fe96f', '#2ec24f'],
  safari: ['#4cb8ff', '#0a6bff'],
  camera: ['#e2e2e7', '#9c9ca5'],
  photos: ['#ffffff', '#f2f2f5'],
  music: ['#ff6a76', '#e5253f'],
  maps: ['#f7f7f2', '#e3e7df'],
  mail: ['#57b2ff', '#1668f0'],
  clock: ['#3a3a3c', '#111113'],
  notes: ['#ffe27a', '#ffcf3f'],
  settings: ['#b9bcc2', '#787c85'],
  weather: ['#5cb6ff', '#1f7ae0'],
  appstore: ['#3ec8ff', '#0a5cf0'],
  reminders: ['#ffffff', '#eef0f3'],
  health: ['#ffffff', '#f3f5f8'],
};

function glyph(ctx, kind, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const white = '#ffffff';

  if (kind === 'phone') {
    ctx.strokeStyle = white;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(28, 24);
    ctx.bezierCurveTo(22, 44, 40, 70, 64, 82);
    ctx.stroke();
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.ellipse(24, 22, 11, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(68, 86, 11, 7, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'messages') {
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.moveTo(50, 22);
    ctx.bezierCurveTo(26, 22, 16, 38, 16, 50);
    ctx.bezierCurveTo(16, 62, 28, 72, 44, 72);
    ctx.lineTo(40, 84);
    ctx.lineTo(56, 73);
    ctx.bezierCurveTo(72, 72, 84, 62, 84, 50);
    ctx.bezierCurveTo(84, 36, 72, 22, 50, 22);
    ctx.fill();
  } else if (kind === 'safari') {
    ctx.strokeStyle = white;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(50, 50, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.translate(50, 50);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(0, 28);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (kind === 'camera') {
    ctx.fillStyle = '#3a3a3c';
    rr(ctx, 20, 34, 60, 42, 10);
    ctx.fill();
    ctx.fillStyle = '#f4f4f6';
    ctx.beginPath();
    ctx.arc(50, 55, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2c';
    ctx.beginPath();
    ctx.arc(50, 55, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aab4c0';
    ctx.beginPath();
    ctx.arc(46, 51, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a3c';
    rr(ctx, 26, 26, 20, 8, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(76, 40, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'photos') {
    const cols = ['#ffd60a', '#ff9f0a', '#ff453a', '#ff2d92', '#bf5af2', '#5e5ce6', '#0a84ff', '#30d158'];
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.translate(50, 50);
      ctx.rotate((i * Math.PI) / 4);
      ctx.fillStyle = cols[i];
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, -24, 10, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(50, 50, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'music') {
    ctx.fillStyle = white;
    ctx.beginPath();
    ctx.ellipse(36, 74, 12, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(68, 66, 12, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(44, 30, 7, 45);
    ctx.fillRect(76, 24, 7, 42);
    ctx.beginPath();
    ctx.moveTo(44, 30);
    ctx.lineTo(83, 22);
    ctx.lineTo(83, 34);
    ctx.lineTo(44, 42);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'maps') {
    ctx.fillStyle = '#b8e2a8';
    ctx.beginPath();
    ctx.moveTo(18, 74);
    ctx.bezierCurveTo(40, 60, 60, 78, 84, 58);
    ctx.lineTo(84, 88);
    ctx.lineTo(18, 88);
    ctx.fill();
    ctx.strokeStyle = '#4a9fe8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(30, 90);
    ctx.bezierCurveTo(44, 60, 58, 62, 70, 30);
    ctx.stroke();
    ctx.fillStyle = '#ff453a';
    ctx.beginPath();
    ctx.arc(30, 80, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'mail') {
    ctx.strokeStyle = white;
    ctx.lineWidth = 6;
    rr(ctx, 20, 32, 60, 38, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(23, 38);
    ctx.lineTo(50, 57);
    ctx.lineTo(77, 38);
    ctx.stroke();
  } else if (kind === 'clock') {
    ctx.strokeStyle = white;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.arc(50, 50, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(50, 32);
    ctx.moveTo(50, 50);
    ctx.lineTo(64, 58);
    ctx.stroke();
  } else if (kind === 'notes') {
    ctx.fillStyle = '#8a6a1f';
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.55;
      rr(ctx, 26, 40 + i * 12, 48 - (i % 2) * 10, 4, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'settings') {
    ctx.save();
    ctx.translate(50, 50);
    ctx.fillStyle = '#f4f4f6';
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 5);
      rr(ctx, -4, -32, 8, 14, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#787c85';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (kind === 'appstore') {
    ctx.strokeStyle = white;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(50, 19);
    ctx.lineTo(23, 82);
    ctx.moveTo(50, 19);
    ctx.lineTo(77, 82);
    ctx.moveTo(33, 60);
    ctx.lineTo(67, 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 82);
    ctx.lineTo(29, 82);
    ctx.moveTo(71, 82);
    ctx.lineTo(88, 82);
    ctx.stroke();
  } else if (kind === 'reminders') {
    const dot = ['#ff453a', '#ff9f0a', '#0a84ff'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = dot[i];
      ctx.beginPath();
      ctx.arc(26, 30 + i * 20, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c7cbd2';
      rr(ctx, 40, 26 + i * 20, 40 - (i % 2) * 9, 8, 4);
      ctx.fill();
    }
  } else if (kind === 'health') {
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.moveTo(50, 80);
    ctx.bezierCurveTo(20, 61, 18, 34, 34, 30);
    ctx.bezierCurveTo(44, 27, 50, 35, 50, 42);
    ctx.bezierCurveTo(50, 35, 56, 27, 66, 30);
    ctx.bezierCurveTo(82, 34, 80, 61, 50, 80);
    ctx.fill();
  } else if (kind === 'weather') {
    const g = ctx.createRadialGradient(40, 40, 3, 40, 40, 24);
    g.addColorStop(0, '#fff6c9');
    g.addColorStop(1, '#ffd35c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(42, 42, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.arc(58, 60, 16, 0, Math.PI * 2);
    ctx.arc(74, 62, 11, 0, Math.PI * 2);
    ctx.arc(42, 64, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawIcon(ctx, kind, x, y, s) {
  const cols = ICONS[kind] || ['#ddd', '#aaa'];
  ctx.save();
  rr(ctx, x, y, s, s, s * 0.225);
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, cols[0]);
  g.addColorStop(1, cols[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  glyph(ctx, kind, x, y, s);
  ctx.restore();
  // top highlight
  ctx.save();
  rr(ctx, x, y, s, s, s * 0.225);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function lockScreen(ctx, w, h) {
  dunes(ctx, w, h, {
    sky: [
      [0, '#0d1330'],
      [0.34, '#2c2a55'],
      [0.58, '#6d3d66'],
      [0.76, '#c86b62'],
      [1, '#f2a35f'],
    ],
    sun: { x: 0.52, y: 0.71, r: 0.5, color: '255,170,110', core: '255,214,160', discR: 0.002 },
    horizon: 0.72,
    layers: [
      { y: 0.735, amp: 0.05, segs: 3, wave: [1.1, 0.4, 1.35], c1: '#8c5b60', c2: '#5d3b4b', rim: '255,190,150', rimA: 0.5 },
      { y: 0.82, amp: 0.07, segs: 4, wave: [0.8, 1.2, 0.5, 1.0], c1: '#6b4152', c2: '#3d2636', rim: '255,170,130', rimA: 0.38 },
      { y: 0.93, amp: 0.06, segs: 3, wave: [1.2, 0.6, 1.0], c1: '#482a3d', c2: '#221425', rim: '255,150,120', rimA: 0.25 },
    ],
  });
  // stars
  const rnd = seeded(31);
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.42;
    const a = 0.15 + rnd() * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, rnd() * 1.3 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  grain(ctx, w, h, 5000, 0.028, 11);
  vignette(ctx, w, h, 0.42);

  // status
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `600 27px ${FONT}`;
  ctx.fillText('9:41', 70, 92);
  statusIcons(ctx, w - 262, 84, 1.15);

  // date + clock
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `600 33px ${FONT}`;
  ctx.fillText('Wednesday, April 1', w / 2, h * 0.285);
  ctx.font = `250 250px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.fillText('9:41', w / 2, h * 0.455);
  ctx.font = `500 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('54°  ·  Partly Cloudy', w / 2, h * 0.505);

  // widget stack
  const wx = 74;
  const ww = w - 148;
  widgetBase(ctx, wx, h * 0.60, ww, h * 0.14, 40, 0.18);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('Up Next', wx + 36, h * 0.60 + 52);
  ctx.font = `500 27px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Design review · 10:00', wx + 36, h * 0.60 + 100);
  ctx.fillStyle = 'rgba(126,242,142,0.95)';
  ctx.beginPath();
  ctx.arc(wx + ww - 54, h * 0.60 + 72, 15, 0, Math.PI * 2);
  ctx.fill();

  // flashlight / camera
  const by = h - 168;
  [['flashlight', 108], ['camera', w - 108]].forEach(([kind, x]) => {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(x, by, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    if (kind === 'flashlight') {
      ctx.beginPath();
      ctx.moveTo(x - 12, by - 22);
      ctx.lineTo(x + 12, by - 22);
      ctx.lineTo(x + 6, by - 2);
      ctx.lineTo(x + 6, by + 20);
      ctx.lineTo(x - 6, by + 20);
      ctx.lineTo(x - 6, by - 2);
      ctx.closePath();
      ctx.fill();
    } else {
      rr(ctx, x - 22, by - 14, 44, 30, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, by + 1, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 14, by - 8, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // front camera punch-hole (top-right)
  const px = w * 0.902;
  const py = h * 0.052;
  const pr = Math.min(w, h) * 0.028;
  ctx.save();
  const ring = ctx.createRadialGradient(px, py, pr * 0.2, px, py, pr);
  ring.addColorStop(0, '#0a0a0d');
  ring.addColorStop(0.75, '#08080a');
  ring.addColorStop(1, '#1b1b22');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  // lens glint
  ctx.beginPath();
  ctx.arc(px - pr * 0.22, py - pr * 0.18, pr * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(60,80,140,0.55)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px - pr * 0.28, py - pr * 0.26, pr * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(190,210,255,0.55)';
  ctx.fill();
  ctx.restore();

  cornerMask(ctx, w, h, 115);
}

function homeScreen(ctx, w, h) {
  dunes(ctx, w, h, {
    sky: [
      [0, '#22375f'],
      [0.34, '#4c5f88'],
      [0.58, '#b8786a'],
      [0.76, '#e2a97f'],
      [1, '#8a5a4f'],
    ],
    sun: { x: 0.86, y: 0.46, r: 0.5, color: '255,206,150', disc: false },
    horizon: 0.62,
    glow: 0.5,
    layers: [
      { y: 0.64, amp: 0.06, segs: 3, wave: [1.0, 0.35, 1.25], c1: '#b07a60', c2: '#8a5548', rim: '255,232,200', rimA: 0.5 },
      { y: 0.76, amp: 0.08, segs: 4, wave: [0.7, 1.15, 0.45, 1.0], c1: '#84504a', c2: '#5c343c', rim: '255,215,180', rimA: 0.32 },
      { y: 0.89, amp: 0.07, segs: 3, wave: [1.2, 0.6, 1.0], c1: '#4e2d38', c2: '#2a1a26', rim: '255,200,165', rimA: 0.2 },
    ],
  });
  grain(ctx, w, h, 6000, 0.022, 5);
  vignette(ctx, w, h, 0.26);

  // status bar
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `600 52px ${FONT}`;
  ctx.fillText('9:41', 66, 120);
  statusIcons(ctx, w - 170, 108, 2.0);
  ctx.restore();

  // left "On This Day" card — a night landscape
  const cardX = 64;
  const cardY = 150;
  const cardW = 560;
  const cardH = 900;
  ctx.save();
  rr(ctx, cardX, cardY, cardW, cardH, 46);
  ctx.clip();
  ctx.translate(cardX, cardY);
  dunes(ctx, cardW, cardH, {
    sky: [
      [0, '#060a1c'],
      [0.40, '#16224a'],
      [0.68, '#3b3f66'],
      [0.86, '#6b4a5e'],
      [1, '#2a1a2c'],
    ],
    horizon: 0.72,
    layers: [
      { y: 0.70, amp: 0.10, segs: 3, wave: [1.2, 0.4, 1.3], c1: '#2a2a4a', c2: '#1a1a30', rim: '180,190,230', rimA: 0.35 },
      { y: 0.82, amp: 0.09, segs: 4, wave: [0.8, 1.2, 0.5, 1.0], c1: '#171a2e', c2: '#0c0e1c', rim: '150,170,220', rimA: 0.25 },
      { y: 0.93, amp: 0.06, segs: 3, wave: [1.1, 0.6, 1.0], c1: '#0b0d18', c2: '#05060c', rim: '120,140,190', rimA: 0.15 },
    ],
  });
  // crescent moon over the night dunes
  ctx.save();
  ctx.translate(cardW * 0.62, cardH * 0.30);
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 96);
  halo.addColorStop(0, 'rgba(190,205,255,0.20)');
  halo.addColorStop(0.5, 'rgba(170,190,255,0.07)');
  halo.addColorStop(1, 'rgba(170,190,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-96, -96, 192, 192);
  ctx.fillStyle = 'rgba(246,246,255,0.96)';
  ctx.beginPath();
  ctx.arc(0, 0, 26, Math.PI * 0.42, Math.PI * 1.66);
  ctx.arc(9, -2, 23, Math.PI * 1.62, Math.PI * 0.4, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // stars
  const rnd = seeded(77);
  for (let i = 0; i < 70; i++) {
    const sx = rnd() * cardW;
    const sy = rnd() * cardH * 0.52;
    ctx.fillStyle = `rgba(220,230,255,${0.15 + rnd() * 0.55})`;
    ctx.beginPath();
    ctx.arc(sx, sy, rnd() * 1.4 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const shade = ctx.createLinearGradient(0, cardH * 0.55, 0, cardH);
  shade.addColorStop(0, 'rgba(8,8,18,0)');
  shade.addColorStop(1, 'rgba(8,8,18,0.72)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, cardW, cardH);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `600 40px ${FONT}`;
  ctx.fillText('On This Day', cardX + 40, cardY + cardH - 84);
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText('APRIL 1, 2026', cardX + 42, cardY + cardH - 46);
  // play
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(cardX + cardW - 76, cardY + cardH - 82, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - 85, cardY + cardH - 96);
  ctx.lineTo(cardX + cardW - 65, cardY + cardH - 82);
  ctx.lineTo(cardX + cardW - 85, cardY + cardH - 68);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // right side widgets
  const rx = 812;
  const wy = 150;
  drawWeatherWidget(ctx, rx, wy, 470, 300);
  drawCalendarWidget(ctx, rx + 496, wy, 300, 300);
  drawBatteryWidget(ctx, rx + 822, wy, 300, 300);

  // app grid
  const apps = [
    'phone', 'messages', 'safari', 'camera', 'photos',
    'music', 'maps', 'mail', 'clock', 'notes',
    'settings', 'weather', 'appstore', 'reminders', 'health',
  ];
  const APP_NAMES = {
    phone: 'Phone', messages: 'Messages', safari: 'Safari', camera: 'Camera',
    photos: 'Photos', music: 'Music', maps: 'Maps', mail: 'Mail',
    clock: 'Clock', notes: 'Notes', settings: 'Settings', weather: 'Weather',
    appstore: 'App Store', reminders: 'Reminders', health: 'Health',
  };
  const size = 148;
  const gapX = 79;
  const gapY = 80;
  const gx = 875;
  const gy = 500;
  apps.forEach((kind, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = gx + col * (size + gapX);
    const y = gy + row * (size + gapY);
    drawIcon(ctx, kind, x, y, size);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `500 23px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.shadowColor = 'rgba(8,12,24,0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText(APP_NAMES[kind], x + size / 2, y + size + 31);
    ctx.restore();
  });

  // dock
  const dockW = 1320;
  const dockH = 168;
  const dockX = (w - dockW) / 2;
  const dockY = h - 222;
  ctx.save();
  rr(ctx, dockX, dockY, dockW, dockH, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  const dockApps = ['phone', 'safari', 'messages', 'music', 'photos'];
  const dockIconGap = 56;
  const dockStart = dockX + (dockW - (dockApps.length * size + (dockApps.length - 1) * dockIconGap)) / 2;
  dockApps.forEach((kind, i) => {
    drawIcon(ctx, kind, dockStart + i * (size + dockIconGap), dockY + 10, size);
  });

  // page dots
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(w / 2 - 22 + i * 22, h - 26, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  cornerMask(ctx, w, h, 88);
}


/* Soft valley + highlight where the flexible panel bends over the hinge. */
function foldCrease(ctx, w, h) {
  const cx = w / 2;
  ctx.save();
  // broad, very light shading across the hinge
  const broad = ctx.createLinearGradient(cx - 96, 0, cx + 96, 0);
  broad.addColorStop(0, 'rgba(10,12,22,0)');
  broad.addColorStop(0.45, 'rgba(10,12,22,0.035)');
  broad.addColorStop(0.5, 'rgba(10,12,22,0.05)');
  broad.addColorStop(0.55, 'rgba(10,12,22,0.035)');
  broad.addColorStop(1, 'rgba(10,12,22,0)');
  ctx.fillStyle = broad;
  ctx.fillRect(cx - 96, 0, 192, h);
  // tight crease: dark valley with a thin specular core
  const g = ctx.createLinearGradient(cx - 15, 0, cx + 15, 0);
  g.addColorStop(0, 'rgba(6,8,16,0)');
  g.addColorStop(0.32, 'rgba(6,8,16,0.09)');
  g.addColorStop(0.47, 'rgba(6,8,16,0.15)');
  g.addColorStop(0.5, 'rgba(235,240,255,0.06)');
  g.addColorStop(0.53, 'rgba(6,8,16,0.13)');
  g.addColorStop(0.68, 'rgba(6,8,16,0.08)');
  g.addColorStop(1, 'rgba(6,8,16,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 15, 0, 30, h);
  ctx.restore();
}

export function createInnerTexture(renderer) {
  const w = 2048;
  const h = 1440;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  homeScreen(ctx, w, h);
  foldCrease(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  return tex;
}

export function createOuterTexture(renderer) {
  const w = 1080;
  const h = 1571;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  lockScreen(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  return tex;
}

export function createLogoTexture(renderer) {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s * 0.13, s * 0.1);
  ctx.scale(s / 30, s / 30);
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(APPLE_PATH));
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}
