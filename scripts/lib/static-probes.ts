// Synthetic geometry only. These fixtures are not Bangla signs or human ground truth.
export function syntheticHand(fold = 0, spread = 1, depth = 0.03) {
  const points = [{ x: 0.5, y: 0.85, z: 0 }];
  for (let finger = 0; finger < 5; finger++) {
    for (let joint = 1; joint <= 4; joint++) {
      points.push({ x: 0.5 + (finger - 2) * 0.07 * spread + joint * (finger - 2) * 0.008, y: 0.85 - 0.05 - joint * (0.1 - fold * 0.018 * (finger + 1)), z: -joint * depth * (1 + fold) });
    }
  }
  return points;
}
export function randomGenerator(seed = 410) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
