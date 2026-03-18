/**
 * Rule-based ASL letter classifier using a scoring approach.
 *
 * Input: 21 MediaPipe landmarks (x-mirrored so right-hand thumb is on the right).
 *        y=0 top, y=1 bottom. x=0 left, x=1 right.
 *
 * Approach: each letter has a score function. We return the best-scoring
 * letter, and confidence = winner_score / 100 clamped to [0, 1].
 */

export interface Landmark { x: number; y: number; z?: number }
export interface ClassifyResult { letter: string; confidence: number }

const IDX = {
  WRIST:  0,
  T_CMC: 1, T_MCP: 2, T_IP: 3, T_TIP: 4,
  I_MCP: 5, I_PIP: 6, I_DIP: 7, I_TIP: 8,
  M_MCP: 9, M_PIP:10, M_DIP:11, M_TIP:12,
  R_MCP:13, R_PIP:14, R_DIP:15, R_TIP:16,
  P_MCP:17, P_PIP:18, P_DIP:19, P_TIP:20,
} as const;

// ── Geometry ─────────────────────────────────────────────────────────────────

function d(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function palmW(lm: Landmark[]) {
  return d(lm[IDX.I_MCP], lm[IDX.P_MCP]) + 0.001;
}

/**
 * How extended is a finger? 0=fully curled, 1=fully extended.
 * Compares tip y to mcp y; lower tip y (higher on screen) = more extended.
 */
function ext(lm: Landmark[], tip: number, mcp: number): number {
  const handHeight = d(lm[IDX.WRIST], lm[IDX.M_MCP]) + 0.001;
  const raw = (lm[mcp].y - lm[tip].y) / handHeight;
  return Math.max(0, Math.min(1, raw + 0.1));
}

/** Is finger tip clearly above its pip? */
function tipAbovePip(lm: Landmark[], tip: number, pip: number) {
  return lm[tip].y < lm[pip].y - 0.015;
}

/** Is finger hooked (tip below pip but above mcp)? */
function hooked(lm: Landmark[], tip: number, pip: number, mcp: number) {
  return lm[tip].y > lm[pip].y + 0.005 && lm[tip].y < lm[mcp].y + 0.04;
}

// ── Derived features ─────────────────────────────────────────────────────────

function features(lm: Landmark[]) {
  const pw = palmW(lm);

  // Per-finger extension (0–1)
  const iE = ext(lm, IDX.I_TIP, IDX.I_MCP);
  const mE = ext(lm, IDX.M_TIP, IDX.M_MCP);
  const rE = ext(lm, IDX.R_TIP, IDX.R_MCP);
  const pE = ext(lm, IDX.P_TIP, IDX.P_MCP);

  // Boolean: finger tip above pip
  const iUp = tipAbovePip(lm, IDX.I_TIP, IDX.I_PIP);
  const mUp = tipAbovePip(lm, IDX.M_TIP, IDX.M_PIP);
  const rUp = tipAbovePip(lm, IDX.R_TIP, IDX.R_PIP);
  const pUp = tipAbovePip(lm, IDX.P_TIP, IDX.P_PIP);

  // Curled: tip at or below mcp level
  const iCurl = lm[IDX.I_TIP].y >= lm[IDX.I_MCP].y - 0.01;
  const mCurl = lm[IDX.M_TIP].y >= lm[IDX.M_MCP].y - 0.01;
  const rCurl = lm[IDX.R_TIP].y >= lm[IDX.R_MCP].y - 0.01;
  const pCurl = lm[IDX.P_TIP].y >= lm[IDX.P_MCP].y - 0.01;

  // Hooked fingers
  const iHook = hooked(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP);
  const mHook = hooked(lm, IDX.M_TIP, IDX.M_PIP, IDX.M_MCP);
  const rHook = hooked(lm, IDX.R_TIP, IDX.R_PIP, IDX.R_MCP);

  const numUp   = [iUp, mUp, rUp, pUp].filter(Boolean).length;
  const numCurl = [iCurl, mCurl, rCurl, pCurl].filter(Boolean).length;

  // Thumb
  const tTip = lm[IDX.T_TIP];
  const tMcp = lm[IDX.T_MCP];
  // Thumb extended to the side (right, for right hand after mirroring)
  const tSide = d(tTip, lm[IDX.I_MCP]) / pw > 0.55;
  const tUp   = tTip.y < tMcp.y - 0.05;

  // Distances normalised by palm width
  const tiD  = d(tTip, lm[IDX.I_TIP]) / pw;  // thumb–index tip
  const tmD  = d(tTip, lm[IDX.M_TIP]) / pw;  // thumb–middle tip
  const trD  = d(tTip, lm[IDX.R_TIP]) / pw;  // thumb–ring tip
  const imD  = d(lm[IDX.I_TIP], lm[IDX.M_TIP]) / pw; // index–middle spread

  // Thumb tip height relative to knuckles
  const thumbOverKnuckles = tTip.y < lm[IDX.I_PIP].y + pw * 0.1;
  const thumbUnderIndex   = tTip.y > lm[IDX.I_MCP].y - pw * 0.1 &&
                            d(tTip, lm[IDX.I_MCP]) / pw < 0.60;
  const thumbUnderMiddle  = tTip.y > lm[IDX.M_MCP].y - pw * 0.1 &&
                            d(tTip, lm[IDX.M_MCP]) / pw < 0.60;

  // Index direction: is it pointing sideways rather than up?
  const indexHoriz = Math.abs(lm[IDX.I_TIP].y - lm[IDX.I_MCP].y) /
                     (Math.abs(lm[IDX.I_TIP].x - lm[IDX.I_MCP].x) + 0.001) < 1.2;

  return {
    pw, iE, mE, rE, pE,
    iUp, mUp, rUp, pUp,
    iCurl, mCurl, rCurl, pCurl,
    iHook, mHook, rHook,
    numUp, numCurl,
    tSide, tUp,
    tiD, tmD, trD, imD,
    thumbOverKnuckles, thumbUnderIndex, thumbUnderMiddle,
    indexHoriz,
  };
}

// ── Score each letter (0–100) ────────────────────────────────────────────────

type F = ReturnType<typeof features>;

function scoreA(f: F) {
  // Fist, thumb to side
  if (f.numCurl < 3) return 0;
  let s = 40;
  if (f.numCurl >= 4) s += 20;
  if (f.tSide || f.tUp) s += 30;
  if (!f.thumbOverKnuckles) s += 10;
  return s;
}

function scoreB(f: F) {
  // All 4 fingers up, thumb folded
  if (f.numUp < 3) return 0;
  let s = 30 + f.numUp * 15;
  if (!f.tSide && !f.tUp) s += 10;
  return s;
}

function scoreC(f: F) {
  // Fingers curved (mid-extension), open C gap between thumb and index
  const allMid = [f.iE, f.mE, f.rE, f.pE].every(e => e > 0.2 && e < 0.75);
  if (!allMid) return 0;
  if (f.numUp > 0) return 0;
  let s = 40;
  if (f.tiD > 0.45 && f.tiD < 1.0) s += 25;
  if (f.tSide) s += 15;
  if (f.numCurl === 0) s += 20;
  return s;
}

function scoreD(f: F) {
  // Index up, others curled, thumb touches middle
  if (!f.iUp) return 0;
  if (f.mUp || f.rUp || f.pUp) return 0;
  let s = 40;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  if (f.tmD < 0.55 || f.trD < 0.55) s += 30;
  if (!f.tSide) s += 10;
  return s;
}

function scoreE(f: F) {
  // Fingers hooked (bent at second joint), thumb tucked near tips
  if (f.numUp > 0) return 0;
  const hookCount = [f.iHook, f.mHook, f.rHook].filter(Boolean).length;
  if (hookCount < 2) return 0;
  let s = 30 + hookCount * 15;
  if (f.tiD < 0.50) s += 20;  // thumb near index tip
  if (!f.tSide) s += 10;
  return s;
}

function scoreF(f: F) {
  // Index+thumb pinch, middle+ring+pinky up
  if (!f.mUp || !f.rUp || !f.pUp) return 0;
  if (f.iUp) return 0;
  let s = 40;
  if (f.tiD < 0.40) s += 40;
  else if (f.tiD < 0.55) s += 20;
  return s;
}

function scoreG(f: F) {
  // Index pointing sideways (horizontal), thumb extended same direction, others curled
  if (f.mUp || f.rUp || f.pUp) return 0;
  let s = 20;
  if (f.indexHoriz) s += 40;
  if (f.tSide) s += 20;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreH(f: F) {
  // Index + middle pointing sideways, others curled
  if (f.rUp || f.pUp) return 0;
  if (!f.iUp && !f.mUp) return 0;
  const hAngle = Math.abs(
    (f as unknown as { lm?: Landmark[] }).lm ? 0 : 0
  );
  let s = 20;
  // Both index+middle roughly at same height (horizontal)
  if (f.iE > 0.4 && f.mE > 0.4) s += 20;
  if (f.rCurl && f.pCurl) s += 20;
  if (f.imD < 0.50) s += 20;  // fingers together
  if (!f.iUp && !f.mUp && f.iE > 0.35 && f.mE > 0.35) s += 20; // horizontal not up
  return s;
}

function scoreI(f: F) {
  // Pinky only up
  if (!f.pUp) return 0;
  if (f.iUp || f.mUp || f.rUp) return 0;
  let s = 50;
  if (f.iCurl && f.mCurl && f.rCurl) s += 30;
  if (!f.tSide) s += 20;
  return s;
}

function scoreK(f: F) {
  // Index + middle up, thumb between them pointing up
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.tUp || f.tSide) s += 20;
  if (f.imD > 0.30) s += 20;  // some spread
  if (f.tiD < 0.70) s += 20;  // thumb near index
  return s;
}

function scoreL(f: F) {
  // Index up, thumb extended horizontally to side
  if (!f.iUp) return 0;
  if (f.mUp || f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.tSide) s += 40;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  if (!f.tUp) s += 10;  // thumb horizontal not up
  return s;
}

function scoreM(f: F) {
  // 3+ fingers curled over thumb, thumb deeply tucked
  if (f.numCurl < 3) return 0;
  let s = 20;
  if (f.thumbUnderMiddle) s += 30;
  if (!f.tSide && !f.tUp) s += 20;
  if (f.numCurl >= 4) s += 10;
  if (!f.thumbOverKnuckles) s += 20;
  return s;
}

function scoreN(f: F) {
  // 2 fingers curled over thumb, thumb between index+middle
  if (f.numCurl < 2) return 0;
  let s = 20;
  if (f.thumbUnderIndex) s += 30;
  if (!f.tSide && !f.tUp) s += 20;
  if (f.numCurl >= 3) s += 10;
  if (!f.thumbOverKnuckles) s += 20;
  return s;
}

function scoreO(f: F) {
  // All fingers and thumb form a circle — all tips close to each other
  if (f.numUp > 0) return 0;
  let s = 20;
  if (f.tiD < 0.45) s += 25;
  if (f.tmD < 0.55) s += 15;
  if (f.trD < 0.65) s += 10;
  if (f.numCurl === 0) s += 20;  // fingers not fully curled (rounded)
  if (s < 50) return 0;
  return s;
}

function scoreP(f: F) {
  // Index + middle pointing DOWN (tips below MCPs), thumb out
  const iDown = f.iE > 0.25 && !f.iUp;
  const mDown = f.mE > 0.25 && !f.mUp;
  if (!iDown || !mDown) return 0;
  let s = 30;
  if (f.tSide || f.tUp) s += 30;
  if (f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreQ(f: F) {
  // Like G but index+thumb pinch pointing down
  if (f.numUp > 0) return 0;
  let s = 20;
  if (f.tiD < 0.45) s += 30;
  if (f.numCurl >= 3) s += 20;
  return s;
}

function scoreR(f: F) {
  // Index + middle up and crossed (close together)
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.imD < 0.35) s += 40;  // fingers close/crossing
  if (f.rCurl && f.pCurl) s += 20;
  if (!f.tSide) s += 10;
  return s;
}

function scoreS(f: F) {
  // Fist, thumb over fingers (on top of them)
  if (f.numCurl < 3) return 0;
  let s = 30;
  if (f.thumbOverKnuckles) s += 40;
  if (f.numCurl >= 4) s += 10;
  if (!f.tSide) s += 20;
  return s;
}

function scoreT(f: F) {
  // Fist, thumb between index and middle (pokes out between them)
  if (f.numCurl < 2) return 0;
  let s = 20;
  if (f.thumbUnderIndex && !f.thumbUnderMiddle) s += 40;
  if (!f.tSide && !f.tUp) s += 20;
  if (!f.thumbOverKnuckles) s += 20;
  return s;
}

function scoreU(f: F) {
  // Index + middle up, together
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.imD < 0.55) s += 40;  // fingers close together
  if (f.rCurl && f.pCurl) s += 20;
  if (f.imD < 0.35) s += 10;  // very close = U not V
  return s;
}

function scoreV(f: F) {
  // Index + middle up, spread (peace sign)
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.imD > 0.50) s += 40;
  if (f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreW(f: F) {
  // Index + middle + ring up, spread
  if (!f.iUp || !f.mUp || !f.rUp) return 0;
  if (f.pUp) return 0;
  return 80;
}

function scoreX(f: F) {
  // Index hooked/bent, others curled
  if (f.iUp || f.mUp || f.rUp || f.pUp) return 0;
  let s = 20;
  if (f.iHook) s += 50;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreY(f: F) {
  // Pinky up + thumb to side
  if (!f.pUp) return 0;
  if (f.iUp || f.mUp || f.rUp) return 0;
  let s = 30;
  if (f.tSide) s += 50;
  if (f.iCurl && f.mCurl && f.rCurl) s += 20;
  return s;
}

// ── H needs lm access for angle; pass lm directly ────────────────────────────

function scoreHWithLm(f: F, lm: Landmark[], pw: number) {
  if (f.rUp || f.pUp) return 0;
  if (f.iE < 0.25 && f.mE < 0.25) return 0;
  let s = 20;
  // Index and middle at similar heights (horizontal, not pointing up)
  const heightDiff = Math.abs(lm[IDX.I_TIP].y - lm[IDX.M_TIP].y) / pw;
  if (heightDiff < 0.30) s += 30;
  if (f.iE > 0.30 && f.mE > 0.30) s += 20;
  if (f.rCurl && f.pCurl) s += 20;
  if (!f.iUp && !f.mUp) s += 10;  // horizontal not strictly up
  return s;
}

function scoreGWithLm(f: F, lm: Landmark[], pw: number) {
  if (f.mUp || f.rUp || f.pUp) return 0;
  let s = 20;
  // Index mostly horizontal
  const dy = Math.abs(lm[IDX.I_TIP].y - lm[IDX.I_MCP].y);
  const dx = Math.abs(lm[IDX.I_TIP].x - lm[IDX.I_MCP].x);
  if (dx > dy) s += 35;  // more horizontal than vertical
  if (f.tSide) s += 25;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  return s;
}

// ── Main entry ────────────────────────────────────────────────────────────────

export function classifyASLLetter(lm: Landmark[]): ClassifyResult {
  if (!lm || lm.length < 21) return { letter: '?', confidence: 0 };

  const pw = palmW(lm);
  const f  = features(lm);

  const scores: [string, number][] = [
    ['A', scoreA(f)],
    ['B', scoreB(f)],
    ['C', scoreC(f)],
    ['D', scoreD(f)],
    ['E', scoreE(f)],
    ['F', scoreF(f)],
    ['G', scoreGWithLm(f, lm, pw)],
    ['H', scoreHWithLm(f, lm, pw)],
    ['I', scoreI(f)],
    ['K', scoreK(f)],
    ['L', scoreL(f)],
    ['M', scoreM(f)],
    ['N', scoreN(f)],
    ['O', scoreO(f)],
    ['P', scoreP(f)],
    ['Q', scoreQ(f)],
    ['R', scoreR(f)],
    ['S', scoreS(f)],
    ['T', scoreT(f)],
    ['U', scoreU(f)],
    ['V', scoreV(f)],
    ['W', scoreW(f)],
    ['X', scoreX(f)],
    ['Y', scoreY(f)],
  ];

  scores.sort((a, b) => b[1] - a[1]);

  const [bestLetter, bestScore] = scores[0];
  const [, secondScore] = scores[1];

  if (bestScore <= 0) return { letter: '?', confidence: 0 };

  // Confidence = how far ahead the winner is, clamped to [0, 1]
  const margin = bestScore - secondScore;
  const confidence = Math.min(1, Math.max(0.1, margin / 60));

  return { letter: bestLetter, confidence };
}
