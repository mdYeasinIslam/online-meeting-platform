  // 1. Helper function: Normalize Landmarks (Must match Python logic exactly)
  export function normalizeLandmarks(
    landmarks: Array<{ x: number; y: number; z: number }>,
  ): number[] {
    const wrist = landmarks[0];

    // Subtract wrist position (Center at origin)
    const centered = landmarks.map((lm) => [
      lm.x - wrist.x,
      lm.y - wrist.y,
      lm.z - wrist.z,
    ]);

    // Find maximum absolute coordinate value for scaling
    let maxVal = 0;
    for (const point of centered) {
      for (const val of point) {
        if (Math.abs(val) > maxVal) {
          maxVal = Math.abs(val);
        }
      }
    }

    // Scale coordinates between -1 and 1
    const normalized: number[] = [];
    for (const point of centered) {
      for (const val of point) {
        normalized.push(maxVal !== 0 ? val / maxVal : val);
      }
    }

    return normalized; // Output array of 63 elements
  }
  // Simple canvas drawing helper functions
  export function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    style: any,
  ) {
    for (const lm of landmarks) {
      const x = lm.x * ctx.canvas.width;
      const y = lm.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = style.color;
      ctx.fill();
    }
  }

  export function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    connections: any[],
    style: any,
  ) {
    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
        ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.lineWidth;
        ctx.stroke();
      }
    }
  }