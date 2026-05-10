import { useEffect, useRef, useMemo } from "react";
import isMobile from "../../utils/isMobile";

function RetroGrid({
  showScanlines = true,
  glowEffect = true,
  className = "",
  style,
}) {
  const canvasRef = useRef(null);

  // Palette from home screen
  const palette = useMemo(() => [
    "#ff2d78", // Pink
    "#cc00ff", // Purple
    "#00ffcc", // Teal
    "#ffb852", // Orange
    "#00b4ff", // Blue
    "#ff8c00", // Dark Orange
    "#00e5ff", // Cyan
  ], []);

  useEffect(() => {
    if (isMobile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 255, g: 0, b: 255 };
    };

    const lerp = (a, b, t) => a + (b - a) * t;
    
    const lerpColor = (c1, c2, t) => ({
      r: Math.round(lerp(c1.r, c2.r, t)),
      g: Math.round(lerp(c1.g, c2.g, t)),
      b: Math.round(lerp(c1.b, c2.b, t)),
    });

    const rgbToHex = ({ r, g, b }) => 
      `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    const cellWidth = 120;
    const cellDepth = 80;
    const numCellsWide = 16;
    const numCellsDeep = 20;
    const cameraX = 0;
    const cameraY = 60;
    const cameraZ = 400;
    const focalLength = 500;

    let offset = 0;
    const speed = 1.5;
    let animationId;

    // Color cycling state
    let colorIndex = 0;
    let colorT = 0;
    const colorSpeed = 0.002; // Slower transitions

    const project3DTo2D = (x, y, z) => {
      const relX = x - cameraX;
      const relY = y - cameraY;
      const relZ = z - cameraZ;
      if (relZ <= 10) return null;
      const scale = focalLength / relZ;
      return {
        x: canvas.width / 2 + relX * scale,
        y: canvas.height * 0.5 - relY * scale,
        scale,
        z: relZ,
      };
    };

    const drawCell = (x, z, zOffset, gridColor) => {
      const actualZ = z - zOffset;
      if (actualZ < -cellDepth || actualZ > numCellsDeep * cellDepth) return;

      const tl = project3DTo2D(x - cellWidth / 2, 0, actualZ);
      const tr = project3DTo2D(x + cellWidth / 2, 0, actualZ);
      const bl = project3DTo2D(x - cellWidth / 2, 0, actualZ + cellDepth);
      const br = project3DTo2D(x + cellWidth / 2, 0, actualZ + cellDepth);

      if (!tl || !tr || !bl || !br || actualZ < 0) return;

      const distanceFactor = Math.min(1, actualZ / (numCellsDeep * cellDepth));
      const alpha = Math.max(0.3, 1 - distanceFactor * 0.7);
      const lineWidth = Math.max(1, 2.5 * (1 - distanceFactor * 0.5));

      if (glowEffect) {
        ctx.shadowBlur = 10 * (1 - distanceFactor);
        ctx.shadowColor = gridColor;
      }
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(tl.x, tl.y);
      ctx.closePath();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    const drawScanlines = () => {
      if (!showScanlines) return;
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#000000";
      for (let y = 0; y < canvas.height; y += 4) ctx.fillRect(0, y, canvas.width, 2);
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update color cycling
      colorT += colorSpeed;
      if (colorT >= 1) {
        colorT = 0;
        colorIndex = (colorIndex + 1) % palette.length;
      }
      
      const c1 = hexToRgb(palette[colorIndex]);
      const c2 = hexToRgb(palette[(colorIndex + 1) % palette.length]);
      const currentRgb = lerpColor(c1, c2, colorT);
      const gridColor = rgbToHex(currentRgb);

      const r = (f) => Math.round(currentRgb.r * f);
      const g = (f) => Math.round(currentRgb.g * f);
      const b = (f) => Math.round(currentRgb.b * f);

      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.55);
      sky.addColorStop(0,    `rgba(${r(0.05)}, ${g(0.05)}, ${b(0.15)}, 1)`);
      sky.addColorStop(0.3,  `rgba(${r(0.10)}, ${g(0.08)}, ${b(0.20)}, 1)`);
      sky.addColorStop(0.5,  `rgba(${r(0.20)}, ${g(0.15)}, ${b(0.30)}, 1)`);
      sky.addColorStop(0.7,  `rgba(${r(0.35)}, ${g(0.25)}, ${b(0.40)}, 1)`);
      sky.addColorStop(0.85, `rgba(${r(0.55)}, ${g(0.40)}, ${b(0.60)}, 1)`);
      sky.addColorStop(1,    `rgba(${r(0.70)}, ${g(0.50)}, ${b(0.75)}, 1)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.55);

      const ground = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
      ground.addColorStop(0,   `rgba(${r(0.10)}, ${g(0.08)}, ${b(0.15)}, 1)`);
      ground.addColorStop(0.3, `rgba(${r(0.05)}, ${g(0.03)}, ${b(0.08)}, 1)`);
      ground.addColorStop(1,   "#000000");
      ctx.fillStyle = ground;
      ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);

      offset += speed;
      if (offset >= cellDepth) offset = 0;

      for (let row = -5; row < numCellsDeep + 5; row++) {
        const z = row * cellDepth;
        for (let col = -Math.floor(numCellsWide / 2); col <= Math.floor(numCellsWide / 2); col++) {
          drawCell(col * cellWidth, z, offset, gridColor);
        }
      }

      drawScanlines();

      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.8,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [palette, showScanlines, glowEffect]);

  if (isMobile) {
    return (
      <div
        className={className}
        style={{ display: "block", width: "100%", height: "100%", background: "#000000", ...style }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", background: "#000000", ...style }}
    />
  );
}

export default RetroGrid;
