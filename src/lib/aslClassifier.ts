/**
 * Rule-based ASL letter classifier.
 *
 * Input:  21 MediaPipe Hands landmarks (same format as the Python realTime.py)
 *         Each landmark: { x, y, z } normalised 0-1 relative to image size.
 *         y=0 is top, y=1 is bottom (screen coordinates).
 *
 * Output: { letter: string, confidence: number }
 *
 * Coverage (static signs only — J and Z require motion):
 *  A B C D E F G H I K L M N O R S T U V W X Y
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface ClassifyResult {
  letter: string;
  confidence: number;
}

// ── Landmark indices (MediaPipe Hands spec) ─────────────────────────────────
const IDX = {
  WRIST: 0,
  T_CMC: 1, T_MCP: 2, T_IP: 3, T_TIP: 4,     // thumb
  I_MCP: 5, I_PIP: 6, I_DIP: 7, I_TIP: 8,     // index
  M_MCP: 9, M_PIP: 10, M_DIP: 11, M_TIP: 12,  // middle
  R_MCP: 13, R_PIP: 14, R_DIP: 15, R_TIP: 16, // ring
  P_MCP: 17, P_PIP: 18, P_DIP: 19, P_TIP: 20, // pinky
} as const;

// ── Geometry helpers ─────────────────────────────────────────────────────────

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Finger is pointing up: tip is clearly above pip (smaller y = higher on screen). */
function isUp(lm: Landmark[], tip: number, pip: number): boolean {
  return lm[tip].y < lm[pip].y - 0.015;
}

/** Finger is curled: tip has fallen below its MCP joint. */
function isCurled(lm: Landmark[], tip: number, mcp: number): boolean {
  return lm[tip].y > lm[mcp].y - 0.02;
}

/** Thumb tip is far from index MCP — thumb is spread outward. */
function thumbExtended(lm: Landmark[]): boolean {
  return dist(lm[IDX.T_TIP], lm[IDX.I_MCP]) > 0.13;
}

/** Thumb tip is above its own MCP — thumb pointing up. */
function thumbUp(lm: Landmark[]): boolean {
  return lm[IDX.T_TIP].y < lm[IDX.T_MCP].y - 0.05;
}

function pinch(lm: Landmark[], a: number, b: number, t = 0.06): boolean {
  return dist(lm[a], lm[b]) < t;
}

// ── Classifier ───────────────────────────────────────────────────────────────

export function classifyASLLetter(lm: Landmark[]): ClassifyResult {
  if (!lm || lm.length < 21) return { letter: '?', confidence: 0 };

  const iUp = isUp(lm, IDX.I_TIP, IDX.I_PIP);
  const mUp = isUp(lm, IDX.M_TIP, IDX.M_PIP);
  const rUp = isUp(lm, IDX.R_TIP, IDX.R_PIP);
  const pUp = isUp(lm, IDX.P_TIP, IDX.P_PIP);

  const iCurl = isCurled(lm, IDX.I_TIP, IDX.I_MCP);
  const mCurl = isCurled(lm, IDX.M_TIP, IDX.M_MCP);
  const rCurl = isCurled(lm, IDX.R_TIP, IDX.R_MCP);
  const pCurl = isCurled(lm, IDX.P_TIP, IDX.P_MCP);

  const tExt = thumbExtended(lm);
  const tUp  = thumbUp(lm);

  const numUp   = [iUp, mUp, rUp, pUp].filter(Boolean).length;
  const numCurl = [iCurl, mCurl, rCurl, pCurl].filter(Boolean).length;

  const thumbIndexPinch = pinch(lm, IDX.T_TIP, IDX.I_TIP, 0.06);
  const indexMiddleDist = dist(lm[IDX.I_TIP], lm[IDX.M_TIP]);
  const isSpread        = indexMiddleDist > 0.065;

  // ── 4 fingers up ──────────────────────────────────────────────────────────
  if (numUp === 4) return { letter: 'B', confidence: 0.85 };

  // ── 3 fingers up ──────────────────────────────────────────────────────────
  if (iUp && mUp && rUp && !pUp) return { letter: 'W', confidence: 0.82 };

  // ── 2 fingers up ──────────────────────────────────────────────────────────
  if (iUp && mUp && !rUp && !pUp) {
    // K: thumb up between index and middle
    if (tExt && dist(lm[IDX.T_TIP], lm[IDX.M_TIP]) < 0.12)
      return { letter: 'K', confidence: 0.72 };
    // V: peace sign (spread)
    if (isSpread) return { letter: 'V', confidence: 0.87 };
    // U / R: fingers together
    return { letter: 'U', confidence: 0.80 };
  }

  // H: index + middle pointing sideways (nearly horizontal)
  if (iUp && mUp && !rUp && !pUp) {
    const horizontalDiff = Math.abs(lm[IDX.I_TIP].y - lm[IDX.M_TIP].y);
    if (horizontalDiff < 0.03) return { letter: 'H', confidence: 0.68 };
  }

  // ── 1 finger up ───────────────────────────────────────────────────────────
  if (iUp && !mUp && !rUp && !pUp) {
    // L: index up + thumb extended (L-shape)
    if (tExt) return { letter: 'L', confidence: 0.88 };
    return { letter: 'D', confidence: 0.78 };
  }

  if (!iUp && !mUp && !rUp && pUp) {
    // Y: pinky + thumb
    if (tExt) return { letter: 'Y', confidence: 0.86 };
    // I: pinky only
    return { letter: 'I', confidence: 0.85 };
  }

  // G: index + thumb horizontal point (index points sideways)
  if (iUp && !mUp && !rUp && !pUp && thumbIndexPinch) {
    return { letter: 'G', confidence: 0.68 };
  }

  // ── F: index-thumb pinch + middle/ring/pinky up ───────────────────────────
  if (!iUp && mUp && rUp && pUp && thumbIndexPinch) {
    return { letter: 'F', confidence: 0.78 };
  }

  // ── No fingers up (fist variants) ─────────────────────────────────────────
  if (numUp === 0) {
    const thumbToIndex = dist(lm[IDX.T_TIP], lm[IDX.I_TIP]);

    // O: all fingertips close together forming a circle
    if (thumbIndexPinch && dist(lm[IDX.T_TIP], lm[IDX.M_TIP]) < 0.12)
      return { letter: 'O', confidence: 0.78 };

    // C: C-curve — thumb and index form a gap but not touching
    if (thumbToIndex > 0.09 && thumbToIndex < 0.20 && tExt)
      return { letter: 'C', confidence: 0.72 };

    // A: fist with thumb on side or up
    if (tExt || tUp) return { letter: 'A', confidence: 0.72 };

    // E: fingernails facing forward, all curled (thumb tucked)
    if (numCurl === 4 && !tExt) return { letter: 'E', confidence: 0.65 };

    // S: closed fist, thumb over fingers
    return { letter: 'S', confidence: 0.65 };
  }

  // ── T: thumb between index and middle ────────────────────────────────────
  if (numCurl === 4 && dist(lm[IDX.T_TIP], lm[IDX.I_MCP]) < 0.08)
    return { letter: 'T', confidence: 0.62 };

  // ── X: hooked index ──────────────────────────────────────────────────────
  if (!iUp && isCurled(lm, IDX.I_TIP, IDX.I_PIP) &&
      !mUp && !rUp && !pUp)
    return { letter: 'X', confidence: 0.58 };

  return { letter: '?', confidence: 0.25 };
}
