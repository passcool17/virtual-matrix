// Pluie de glyphes en canvas 2D (menu, fin).
const T = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01λΣΩΔ';
export function startRain(cv, density = 1) {
  const c = cv.getContext('2d'); let drops = [], raf = 0, on = true;
  const fit = () => { const d = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.max(1, w * d | 0); cv.height = Math.max(1, h * d | 0); c.setTransform(d, 0, 0, d, 0, 0); drops = Array.from({ length: Math.max(1, w / 16 | 0) }, () => Math.random() * -50); };
  fit(); const ro = new ResizeObserver(fit); ro.observe(cv);
  const g = () => T[Math.random() * T.length | 0];
  const frame = () => { if (!on) return; const w = cv.clientWidth, h = cv.clientHeight; c.fillStyle = 'rgba(4,8,6,0.14)'; c.fillRect(0, 0, w, h); c.font = '16px "Share Tech Mono", ui-monospace, monospace';
    for (let i = 0; i < drops.length; i++) { const x = i * 16, y = drops[i] * 16; c.fillStyle = '#c8ffd4'; c.fillText(g(), x, y); c.fillStyle = '#1aff6a'; c.fillText(g(), x, y - 16); drops[i] += density * (0.32 + Math.random() * 0.55); if (y > h && Math.random() > 0.975) drops[i] = -Math.random() * 24; }
    raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  return () => { on = false; cancelAnimationFrame(raf); ro.disconnect(); };
}
