/**
 * Improved rule-based ASL letter classifier.
 *
 * Input:  21 MediaPipe Hands landmarks
 *         Each landmark: { x, y, z } normalised 0-1 relative to image size.
 *         y=0 is top, y=1 is bottom (screen coordinates).
 *
 * Output: { letter: string, confidence: number }
 *
 * Coverage (static signs):
 *  A B C D E F G H I K L M N O P Q R S T U V W X Y
 *  (J and Z require motion — detected as I and Z respectively with low confidence)
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
  WRIST:  0,
  T_CMC:  1, T_MCP:  2, T_IP:  3, T_TIP:  4, // thumb
  I_MCP:  5, I_PIP:  6, I_DIP:  7, I_TIP:  8, // index
  M_MCP:  9, M_PIP: 10, M_DIP: 11, M_TIP: 12, // middle
  R_MCP: 13, R_PIP: 14, R_DIP: 15, R_TIP: 16, // ring
  P_MCP: 17, P_PIP: 18, P_DIP: 19, P_TIP: 20, // pinky
} as const;

// ── Geometry helpers ──────────────────────────────────────────────────────────

function dist2d(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dist3d(a: Landmark, b: Landmark): number {
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
}

/** Palm width — used to normalise distances so they're scale-invariant. */
function palmWidth(lm: Landmark[]): number {
  return dist2d(lm[IDX.I_MCP], lm[IDX.P_MCP]) + 0.001;
}

/**
 * Returns a 0-1 extension score for a finger.
 * 1 = fully extended (tip above mcp), 0 = fully curled.
 */
function fingerExtension(lm: Landmark[], tip: number, pip: number, mcp: number): number {
  const tipY = lm[tip].y;
  const mcpY = lm[mcp].y;
  const pipY = lm[pip].y;
  // tip is above pip: extended; tip below mcp: curled
  const range = Math.abs(mcpY - pipY) + 0.02;
  const score = (mcpY - tipY) / range;
  return Math.max(0, Math.min(1, score));
}

function isUp(lm: Landmark[], tip: number, pip: number): boolean {
  return lm[tip].y < lm[pip].y - 0.02;
}

function isCurled(lm: Landmark[], tip: number, mcp: number): boolean {
  return lm[tip].y > lm[mcp].y - 0.01;
}

/** Half-curled: tip is between MCP and PIP level */
function isHalfCurled(lm: Landmark[], tip: number, pip: number, mcp: number): boolean {
  return lm[tip].y > lm[pip].y && lm[tip].y < lm[mcp].y + 0.04;
}

function thumbExtended(lm: Landmark[], pw: number): boolean {
  return dist2d(lm[IDX.T_TIP], lm[IDX.I_MCP]) / pw > 0.55;
}

function thumbUp(lm: Landmark[]): boolean {
  return lm[IDX.T_TIP].y < lm[IDX.T_MCP].y - 0.06;
}

function pinch(lm: Landmark[], a: number, b: number, threshold: number): boolean {
  return dist2d(lm[a], lm[b]) < threshold;
}

/** Angle in degrees between three points (vertex at b) */
function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag < 0.0001) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

// ── Main classifier ──────────────────────────────────────────────────────────

export function classifyASLLetter(lm: Landmark[]): ClassifyResult {
  if (!lm || lm.length < 21) return { letter: '?', confidence: 0 };

  const pw = palmWidth(lm);

  // Extension scores (0=curled, 1=extended)
  const iExt = fingerExtension(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP);
  const mExt = fingerExtension(lm, IDX.M_TIP, IDX.M_PIP, IDX.M_MCP);
  const rExt = fingerExtension(lm, IDX.R_TIP, IDX.R_PIP, IDX.R_MCP);
  const pExt = fingerExtension(lm, IDX.P_TIP, IDX.P_PIP, IDX.P_MCP);

  // Boolean helpers
  const iUp = iExt > 0.6;
  const mUp = mExt > 0.6;
  const rUp = rExt > 0.6;
  const pUp = pExt > 0.6;

  const iCurl = iExt < 0.25;
  const mCurl = mExt < 0.25;
  const rCurl = rExt < 0.25;
  const pCurl = pExt < 0.25;

  const tExt = thumbExtended(lm, pw);
  const tUp  = thumbUp(lm);

  const numUp   = [iUp, mUp, rUp, pUp].filter(Boolean).length;
  const numCurl = [iCurl, mCurl, rCurl, pCurl].filter(Boolean).length;

  // Distance metrics (normalised by palm width)
  const tipThreshold     = pw * 0.35;  // pinch threshold
  const loosePinch       = pw * 0.55;
  const thumbIndexDist   = dist2d(lm[IDX.T_TIP], lm[IDX.I_TIP]);
  const thumbMiddleDist  = dist2d(lm[IDX.T_TIP], lm[IDX.M_TIP]);
  const indexMiddleDist  = dist2d(lm[IDX.I_TIP], lm[IDX.M_TIP]);
  const indexMiddleSpread = indexMiddleDist / pw > 0.55;

  const thumbIndexPinch  = thumbIndexDist < tipThreshold;
  const thumbMiddlePinch = thumbMiddleDist < tipThreshold;

  // ── 4 fingers up ────────────────────────────────────────────────────────────

  if (numUp === 4) {
    // B: all 4 up, thumb folded across palm
    if (!tExt && thumbIndexDist / pw > 0.2) {
      return { letter: 'B', confidence: 0.88 };
    }
    // 4 fingers up with thumb extended
    return { letter: 'B', confidence: 0.80 };
  }

  // ── 3 fingers up ────────────────────────────────────────────────────────────

  if (iUp && mUp && rUp && !pUp) {
    // W: 3 fingers spread
    return { letter: 'W', confidence: 0.84 };
  }

  if (iUp && mUp && !rUp && pUp) {
    // H variant or U+pinky — unlikely, call U
    return { letter: 'U', confidence: 0.65 };
  }

  if (!iUp && mUp && rUp && pUp) {
    // F: index+thumb pinch, other 3 up
    if (thumbIndexPinch) return { letter: 'F', confidence: 0.82 };
  }

  // ── 2 fingers up ────────────────────────────────────────────────────────────

  if (iUp && mUp && !rUp && !pUp) {
    // K: thumb between index and middle, pointing up
    if (tExt && dist2d(lm[IDX.T_TIP], lm[IDX.M_PIP]) < pw * 0.55) {
      return { letter: 'K', confidence: 0.75 };
    }
    // H: index+middle pointing sideways (nearly horizontal relative to each other)
    const hAngle = Math.abs(lm[IDX.I_TIP].y - lm[IDX.M_TIP].y) / pw;
    if (hAngle < 0.25 && !indexMiddleSpread) {
      return { letter: 'H', confidence: 0.72 };
    }
    // R: fingers crossed — index and middle close together but index slightly over middle
    if (!indexMiddleSpread && lm[IDX.I_TIP].x < lm[IDX.M_TIP].x + pw * 0.15) {
      return { letter: 'R', confidence: 0.70 };
    }
    // V: peace sign — spread
    if (indexMiddleSpread) return { letter: 'V', confidence: 0.88 };
    // U: fingers together
    return { letter: 'U', confidence: 0.82 };
  }

  // ── 1 finger up ─────────────────────────────────────────────────────────────

  if (iUp && !mUp && !rUp && !pUp) {
    // L: index up + thumb extended out to side
    if (tExt && lm[IDX.T_TIP].y > lm[IDX.I_MCP].y - pw * 0.3) {
      return { letter: 'L', confidence: 0.90 };
    }
    // G: index pointing sideways (horizontal), thumb also extended
    const indexHorizontal = Math.abs(lm[IDX.I_TIP].y - lm[IDX.I_MCP].y) / pw < 0.4;
    if (indexHorizontal && tExt) return { letter: 'G', confidence: 0.72 };
    // X: hooked index (half-curled)
    if (isHalfCurled(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP) && iExt < 0.6) {
      return { letter: 'X', confidence: 0.68 };
    }
    // D: index up, other 3 curled, thumb touching middle
    if (thumbMiddlePinch || dist2d(lm[IDX.T_TIP], lm[IDX.R_TIP]) < pw * 0.45) {
      return { letter: 'D', confidence: 0.76 };
    }
    return { letter: 'D', confidence: 0.72 };
  }

  if (!iUp && !mUp && !rUp && pUp) {
    // Y: pinky + thumb extended
    if (tExt) return { letter: 'Y', confidence: 0.88 };
    // I: pinky only
    return { letter: 'I', confidence: 0.86 };
  }

  // ── No fingers up (fist variants) ───────────────────────────────────────────

  if (numUp === 0) {
    // O: fingertips gathered, forming a circle shape
    if (thumbIndexPinch && thumbMiddleDist < pw * 0.55) {
      return { letter: 'O', confidence: 0.80 };
    }

    // Q: like G but pointing downward — index+thumb pinch pointing down
    if (thumbIndexPinch && lm[IDX.I_TIP].y > lm[IDX.I_MCP].y) {
      return { letter: 'Q', confidence: 0.68 };
    }

    // C: open C-curve, thumb and index form a gap
    const thumbToIndex = thumbIndexDist / pw;
    if (thumbToIndex > 0.4 && thumbToIndex < 0.85 && tExt) {
      return { letter: 'C', confidence: 0.74 };
    }

    // A: closed fist, thumb to side or up (not tucked)
    if (tExt || tUp) {
      // Distinguish A from E and S by thumb position
      if (lm[IDX.T_TIP].x < lm[IDX.I_MCP].x - pw * 0.1) {
        return { letter: 'A', confidence: 0.76 };
      }
      return { letter: 'A', confidence: 0.72 };
    }

    // T: thumb tip touching between index and middle MCP
    const thumbToIndexMcp = dist2d(lm[IDX.T_TIP], lm[IDX.I_MCP]) / pw;
    if (thumbToIndexMcp < 0.45 && !tExt) {
      return { letter: 'T', confidence: 0.68 };
    }

    // N: thumb over middle finger
    const thumbToMiddleMcp = dist2d(lm[IDX.T_TIP], lm[IDX.M_MCP]) / pw;
    if (thumbToMiddleMcp < 0.40 && !tExt) {
      return { letter: 'N', confidence: 0.65 };
    }

    // M: thumb over ring finger
    const thumbToRingMcp = dist2d(lm[IDX.T_TIP], lm[IDX.R_MCP]) / pw;
    if (thumbToRingMcp < 0.40 && !tExt) {
      return { letter: 'M', confidence: 0.65 };
    }

    // E: all fingers curled downward, fingertips at or below MCP, thumb tucked
    if (numCurl >= 3 && !tExt) {
      return { letter: 'E', confidence: 0.68 };
    }

    // S: closed fist, thumb over fingers
    return { letter: 'S', confidence: 0.68 };
  }

  // ── Mixed / partial extension ────────────────────────────────────────────────

  // P: index+middle pointing down, thumb extended
  if (!iUp && !mUp && iExt > 0.3 && mExt > 0.3) {
    if (lm[IDX.I_TIP].y > lm[IDX.I_MCP].y && tExt) {
      return { letter: 'P', confidence: 0.68 };
    }
  }

  // X: hooked index only (bent/hooked, not fully up)
  if (iExt > 0.2 && iExt < 0.55 && mCurl && rCurl && pCurl) {
    return { letter: 'X', confidence: 0.65 };
  }

  // Fallback
  return { letter: '?', confidence: 0.20 };
}
