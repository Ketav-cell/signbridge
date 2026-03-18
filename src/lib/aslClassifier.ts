/**
 * Rule-based ASL letter classifier.
 *
 * Input:  21 MediaPipe Hands landmarks (already x-mirrored to match webcam display).
 *         Each landmark: { x, y, z } normalised 0-1 relative to image size.
 *         y=0 is top, y=1 is bottom (screen coordinates).
 *         x=0 is left, x=1 is right (after mirroring — right hand thumb is on the right).
 *
 * Output: { letter: string, confidence: number }
 *
 * Coverage (static signs): A B C D E F G H I K L M N O P Q R S T U V W X Y
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

// ── Landmark indices ──────────────────────────────────────────────────────────
const IDX = {
  WRIST:  0,
  T_CMC:  1, T_MCP:  2, T_IP:  3, T_TIP:  4,
  I_MCP:  5, I_PIP:  6, I_DIP:  7, I_TIP:  8,
  M_MCP:  9, M_PIP: 10, M_DIP: 11, M_TIP: 12,
  R_MCP: 13, R_PIP: 14, R_DIP: 15, R_TIP: 16,
  P_MCP: 17, P_PIP: 18, P_DIP: 19, P_TIP: 20,
} as const;

// ── Geometry helpers ──────────────────────────────────────────────────────────

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function palmWidth(lm: Landmark[]): number {
  return dist(lm[IDX.I_MCP], lm[IDX.P_MCP]) + 0.001;
}

/**
 * Finger extension: 0=fully curled, 1=fully extended.
 * Based on how high the tip is relative to MCP.
 */
function ext(lm: Landmark[], tip: number, pip: number, mcp: number): number {
  const range = Math.abs(lm[mcp].y - lm[pip].y) + 0.02;
  const score = (lm[mcp].y - lm[tip].y) / range;
  return Math.max(0, Math.min(1, score));
}

function isUp(lm: Landmark[], tip: number, pip: number): boolean {
  return lm[tip].y < lm[pip].y - 0.02;
}

function isBent(lm: Landmark[], tip: number, pip: number, mcp: number): boolean {
  // tip is below pip but above mcp — hooked/bent
  return lm[tip].y > lm[pip].y && lm[tip].y < lm[mcp].y + 0.05;
}

function thumbIsUp(lm: Landmark[]): boolean {
  return lm[IDX.T_TIP].y < lm[IDX.T_MCP].y - 0.05;
}

function thumbSideExtended(lm: Landmark[], pw: number): boolean {
  // Thumb tip far from index MCP (extended to the side)
  return dist(lm[IDX.T_TIP], lm[IDX.I_MCP]) / pw > 0.5;
}

function pinch(lm: Landmark[], a: number, b: number, pw: number, threshold = 0.35): boolean {
  return dist(lm[a], lm[b]) / pw < threshold;
}

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyASLLetter(lm: Landmark[]): ClassifyResult {
  if (!lm || lm.length < 21) return { letter: '?', confidence: 0 };

  const pw = palmWidth(lm);

  // Extension scores
  const iE = ext(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP);
  const mE = ext(lm, IDX.M_TIP, IDX.M_PIP, IDX.M_MCP);
  const rE = ext(lm, IDX.R_TIP, IDX.R_PIP, IDX.R_MCP);
  const pE = ext(lm, IDX.P_TIP, IDX.P_PIP, IDX.P_MCP);

  const iUp = iE > 0.55;
  const mUp = mE > 0.55;
  const rUp = rE > 0.55;
  const pUp = pE > 0.55;

  const iCurl = iE < 0.30;
  const mCurl = mE < 0.30;
  const rCurl = rE < 0.30;
  const pCurl = pE < 0.30;

  const tSide = thumbSideExtended(lm, pw);
  const tUp   = thumbIsUp(lm);

  const numUp   = [iUp, mUp, rUp, pUp].filter(Boolean).length;
  const numCurl = [iCurl, mCurl, rCurl, pCurl].filter(Boolean).length;

  // Key distances (normalised)
  const tiDist = dist(lm[IDX.T_TIP], lm[IDX.I_TIP]) / pw;
  const tmDist = dist(lm[IDX.T_TIP], lm[IDX.M_TIP]) / pw;
  const trDist = dist(lm[IDX.T_TIP], lm[IDX.R_TIP]) / pw;
  const imDist = dist(lm[IDX.I_TIP], lm[IDX.M_TIP]) / pw;

  const tiPinch = tiDist < 0.35;
  const tmPinch = tmDist < 0.35;

  // ── ALL 4 FINGERS UP ────────────────────────────────────────────────────────

  if (numUp === 4) {
    // B: thumb folded across palm (not extended to side)
    return { letter: 'B', confidence: tSide ? 0.80 : 0.90 };
  }

  // ── 3 FINGERS UP ────────────────────────────────────────────────────────────

  if (iUp && mUp && rUp && !pUp) {
    // W: three fingers spread
    return { letter: 'W', confidence: 0.85 };
  }

  if (!iUp && mUp && rUp && pUp) {
    // F: index+thumb pinch, middle/ring/pinky up
    if (tiPinch) return { letter: 'F', confidence: 0.85 };
    return { letter: 'F', confidence: 0.72 };
  }

  if (iUp && mUp && !rUp && pUp) {
    return { letter: 'U', confidence: 0.65 };
  }

  // ── 2 FINGERS UP ────────────────────────────────────────────────────────────

  if (iUp && mUp && !rUp && !pUp) {
    // K: thumb extended up between index and middle
    if (tSide && dist(lm[IDX.T_TIP], lm[IDX.M_PIP]) / pw < 0.6) {
      return { letter: 'K', confidence: 0.78 };
    }
    // H: index+middle pointing sideways (horizontal)
    const hAngle = Math.abs(lm[IDX.I_TIP].y - lm[IDX.M_TIP].y) / pw;
    if (hAngle < 0.30 && imDist < 0.55) {
      return { letter: 'H', confidence: 0.78 };
    }
    // V: peace sign — fingers spread
    if (imDist > 0.50) return { letter: 'V', confidence: 0.90 };
    // R: fingers crossed/close together
    if (imDist < 0.35) return { letter: 'R', confidence: 0.75 };
    // U: fingers together pointing up
    return { letter: 'U', confidence: 0.82 };
  }

  // ── 1 FINGER UP ─────────────────────────────────────────────────────────────

  if (iUp && !mUp && !rUp && !pUp) {
    // L: index up + thumb extended to side
    if (tSide && lm[IDX.T_TIP].y > lm[IDX.I_MCP].y - pw * 0.2) {
      return { letter: 'L', confidence: 0.92 };
    }
    // G: index pointing sideways, thumb also out
    const indexAngle = Math.abs(lm[IDX.I_TIP].y - lm[IDX.I_MCP].y) / pw;
    if (indexAngle < 0.45 && tSide) return { letter: 'G', confidence: 0.78 };
    // X: hooked index
    if (isBent(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP)) {
      return { letter: 'X', confidence: 0.72 };
    }
    // D: index up, thumb touches middle/ring
    if (tmPinch || dist(lm[IDX.T_TIP], lm[IDX.R_TIP]) / pw < 0.50) {
      return { letter: 'D', confidence: 0.80 };
    }
    return { letter: 'D', confidence: 0.72 };
  }

  if (!iUp && !mUp && !rUp && pUp) {
    // Y: pinky + thumb both extended
    if (tSide || tUp) return { letter: 'Y', confidence: 0.90 };
    // I: pinky only
    return { letter: 'I', confidence: 0.88 };
  }

  // ── NO FINGERS UP (fist variants) ───────────────────────────────────────────

  if (numUp === 0) {

    // O: fingertips gathered into circle — all tips close to thumb tip
    const tipsToThumb = [IDX.I_TIP, IDX.M_TIP, IDX.R_TIP].map(
      (t) => dist(lm[IDX.T_TIP], lm[t]) / pw
    );
    const avgTipDist = tipsToThumb.reduce((a, b) => a + b, 0) / tipsToThumb.length;
    if (avgTipDist < 0.50 && tiDist < 0.45) {
      return { letter: 'O', confidence: 0.82 };
    }

    // C: open C-shape — thumb and fingers form a curve, gap between them
    if (tiDist > 0.40 && tiDist < 0.90 && tSide && numCurl < 4) {
      return { letter: 'C', confidence: 0.76 };
    }

    // Now all 4 fingers curled (fist variants) ─────────────────────────────

    // E: fingers hooked/bent downward, tips near MCP level
    //    Finger tips are clearly below their PIPs (bent downward hook)
    const iBent = isBent(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP);
    const mBent = isBent(lm, IDX.M_TIP, IDX.M_PIP, IDX.M_MCP);
    const rBent = isBent(lm, IDX.R_TIP, IDX.R_PIP, IDX.R_MCP);
    const bentCount = [iBent, mBent, rBent].filter(Boolean).length;
    // In E, thumb tip is CLOSE to finger tips (touches or nearly touches)
    const thumbNearTips = tiDist < 0.45 || dist(lm[IDX.T_TIP], lm[IDX.M_TIP]) / pw < 0.45;
    if (bentCount >= 2 && thumbNearTips && !tSide) {
      return { letter: 'E', confidence: 0.78 };
    }

    // T: thumb tip is between index MCP and middle (pokes between them)
    const tBetweenIM = (
      lm[IDX.T_TIP].y > lm[IDX.I_MCP].y - pw * 0.15 &&
      lm[IDX.T_TIP].y < lm[IDX.I_MCP].y + pw * 0.50 &&
      dist(lm[IDX.T_TIP], lm[IDX.I_MCP]) / pw < 0.55
    );
    if (tBetweenIM && !tSide) {
      return { letter: 'T', confidence: 0.72 };
    }

    // M: thumb tucked under first 3 fingers — thumb tip is near middle/ring MCP
    const thumbUnder3 = (
      dist(lm[IDX.T_TIP], lm[IDX.M_MCP]) / pw < 0.55 &&
      lm[IDX.T_TIP].y > lm[IDX.WRIST].y - pw * 0.5
    );
    if (thumbUnder3 && numCurl >= 3 && !tSide) {
      return { letter: 'M', confidence: 0.68 };
    }

    // N: thumb tucked under first 2 fingers — thumb tip near index/middle PIP
    const thumbUnder2 = (
      dist(lm[IDX.T_TIP], lm[IDX.I_PIP]) / pw < 0.55 ||
      dist(lm[IDX.T_TIP], lm[IDX.M_PIP]) / pw < 0.55
    );
    if (thumbUnder2 && numCurl >= 3 && !tSide) {
      return { letter: 'N', confidence: 0.65 };
    }

    // S: thumb over all fingers (on top), fingers tightly curled
    const thumbOverTop = lm[IDX.T_TIP].y < lm[IDX.I_PIP].y + pw * 0.2;
    if (thumbOverTop && numCurl >= 3 && !tSide) {
      return { letter: 'S', confidence: 0.72 };
    }

    // A: thumb to side of fist (not tucked, not on top)
    if (tSide || tUp) {
      return { letter: 'A', confidence: 0.80 };
    }

    // Q: like G but pointing downward — index+thumb pinch pointing down
    if (tiPinch && lm[IDX.I_TIP].y > lm[IDX.I_MCP].y) {
      return { letter: 'Q', confidence: 0.68 };
    }

    // Fallback for fist
    return { letter: 'S', confidence: 0.55 };
  }

  // ── MIXED extension ──────────────────────────────────────────────────────────

  // P: index+middle pointing downward, thumb extended
  if (iE > 0.3 && mE > 0.3 && !iUp && !mUp &&
      lm[IDX.I_TIP].y > lm[IDX.I_MCP].y && tSide) {
    return { letter: 'P', confidence: 0.70 };
  }

  // X: hooked index, others curled
  if (isBent(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP) && mCurl && rCurl && pCurl) {
    return { letter: 'X', confidence: 0.68 };
  }

  // Catch all
  return { letter: '?', confidence: 0.20 };
}
