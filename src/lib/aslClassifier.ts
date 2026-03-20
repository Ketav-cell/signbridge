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

function d(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function palmW(lm: Landmark[]) {
  return d(lm[IDX.I_MCP], lm[IDX.P_MCP]) + 0.001;
}

function ext(lm: Landmark[], tip: number, mcp: number): number {
  const handHeight = d(lm[IDX.WRIST], lm[IDX.M_MCP]) + 0.001;
  const raw = (lm[mcp].y - lm[tip].y) / handHeight;
  return Math.max(0, Math.min(1, raw + 0.1));
}

function tipAbovePip(lm: Landmark[], tip: number, pip: number) {
  return lm[tip].y < lm[pip].y - 0.005;
}

function hooked(lm: Landmark[], tip: number, pip: number, mcp: number) {
  return lm[tip].y > lm[pip].y + 0.005 && lm[tip].y < lm[mcp].y + 0.04;
}

function features(lm: Landmark[]) {
  const pw = palmW(lm);

  const iE = ext(lm, IDX.I_TIP, IDX.I_MCP);
  const mE = ext(lm, IDX.M_TIP, IDX.M_MCP);
  const rE = ext(lm, IDX.R_TIP, IDX.R_MCP);
  const pE = ext(lm, IDX.P_TIP, IDX.P_MCP);

  const iUp = tipAbovePip(lm, IDX.I_TIP, IDX.I_PIP);
  const mUp = tipAbovePip(lm, IDX.M_TIP, IDX.M_PIP);
  const rUp = tipAbovePip(lm, IDX.R_TIP, IDX.R_PIP);
  const pUp = tipAbovePip(lm, IDX.P_TIP, IDX.P_PIP);

  const iCurl = lm[IDX.I_TIP].y >= lm[IDX.I_MCP].y - 0.01;
  const mCurl = lm[IDX.M_TIP].y >= lm[IDX.M_MCP].y - 0.01;
  const rCurl = lm[IDX.R_TIP].y >= lm[IDX.R_MCP].y - 0.01;
  const pCurl = lm[IDX.P_TIP].y >= lm[IDX.P_MCP].y - 0.01;

  const iHook = hooked(lm, IDX.I_TIP, IDX.I_PIP, IDX.I_MCP);
  const mHook = hooked(lm, IDX.M_TIP, IDX.M_PIP, IDX.M_MCP);
  const rHook = hooked(lm, IDX.R_TIP, IDX.R_PIP, IDX.R_MCP);

  const numUp   = [iUp, mUp, rUp, pUp].filter(Boolean).length;
  const numCurl = [iCurl, mCurl, rCurl, pCurl].filter(Boolean).length;

  const tTip = lm[IDX.T_TIP];
  const tMcp = lm[IDX.T_MCP];
  const tSide = d(tTip, lm[IDX.I_MCP]) / pw > 0.55;
  const tUp   = tTip.y < tMcp.y - 0.05;

  const tiD = d(tTip, lm[IDX.I_TIP]) / pw;
  const tmD = d(tTip, lm[IDX.M_TIP]) / pw;
  const trD = d(tTip, lm[IDX.R_TIP]) / pw;
  const imD = d(lm[IDX.I_TIP], lm[IDX.M_TIP]) / pw;

  // Thumb clearly above the knuckle peaks (PIP level) — true only for S
  const thumbOverKnuckles = tTip.y < lm[IDX.I_PIP].y - pw * 0.10;

  // Thumb tucked inside the fist (below MCP line) — true for T, N, M
  const thumbUnderIndex  = tTip.y > lm[IDX.I_MCP].y + pw * 0.05 &&
                           d(tTip, lm[IDX.I_MCP]) / pw < 0.55;
  const thumbUnderMiddle = tTip.y > lm[IDX.M_MCP].y + pw * 0.05 &&
                           d(tTip, lm[IDX.M_MCP]) / pw < 0.55;
  const thumbUnderRing   = tTip.y > lm[IDX.R_MCP].y + pw * 0.05 &&
                           d(tTip, lm[IDX.R_MCP]) / pw < 0.55;

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
    thumbOverKnuckles, thumbUnderIndex, thumbUnderMiddle, thumbUnderRing,
    indexHoriz,
  };
}

type F = ReturnType<typeof features>;

// A: fist, thumb rests at the SIDE of index (not over, not inside)
function scoreA(f: F) {
  if (f.numCurl < 3) return 0;
  if (f.thumbOverKnuckles) return 0;
  if (f.thumbUnderIndex || f.thumbUnderMiddle) return 0;
  let s = 50;
  if (f.numCurl >= 4) s += 20;
  if (f.tSide) s += 30;
  return s;
}

// B: flat open hand, all fingers extended up, thumb tucked in
function scoreB(f: F) {
  if (f.numUp < 3) return 0;
  if (f.thumbOverKnuckles) return 0;
  if (f.numCurl > 1) return 0;
  let s = 30 + f.numUp * 15;
  if (!f.tSide && !f.tUp) s += 10;
  return s;
}

// C: curved fingers and thumb forming a C shape
function scoreC(f: F) {
  const allMid = [f.iE, f.mE, f.rE, f.pE].every(e => e > 0.10 && e < 0.85);
  if (!allMid) return 0;
  if (f.numUp > 1) return 0;
  let s = 50;
  if (f.tiD > 0.35 && f.tiD < 1.3) s += 25;
  if (f.tSide) s += 15;
  if (f.numCurl <= 2) s += 15;
  return s;
}

// D: index up, other fingers curl to meet thumb
function scoreD(f: F) {
  if (!f.iUp) return 0;
  if (f.mUp || f.rUp || f.pUp) return 0;
  let s = 50;
  if (f.mCurl && f.rCurl && f.pCurl) s += 25;
  if (f.tmD < 0.55 || f.trD < 0.55) s += 30;
  if (!f.tSide) s += 10;
  return s;
}

// E: all fingers hooked/bent, curled down toward palm
function scoreE(f: F) {
  if (f.numUp > 0) return 0;
  const hookCount = [f.iHook, f.mHook, f.rHook].filter(Boolean).length;
  if (hookCount < 2) return 0;
  let s = 30 + hookCount * 15;
  if (f.tiD < 0.50) s += 20;
  if (!f.tSide) s += 10;
  return s;
}

// F: middle, ring, pinky up; index touches thumb
function scoreF(f: F) {
  if (!f.mUp || !f.rUp || !f.pUp) return 0;
  if (f.iUp) return 0;
  let s = 40;
  if (f.tiD < 0.40) s += 40;
  else if (f.tiD < 0.55) s += 20;
  return s;
}

// I: only pinky up, others curled
function scoreI(f: F) {
  if (!f.pUp) return 0;
  if (f.iUp || f.mUp || f.rUp) return 0;
  let s = 50;
  if (f.iCurl && f.mCurl && f.rCurl) s += 30;
  if (!f.tSide) s += 20;
  return s;
}

// K: index up, middle angled, thumb pointing up between them
function scoreK(f: F) {
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  if (!f.tUp) return 0;
  let s = 50;
  if (f.imD > 0.20 && f.imD < 0.65) s += 20;
  if (f.tiD < 0.70) s += 20;
  return s;
}

// L: index up and thumb out to side forming L shape
function scoreL(f: F) {
  if (!f.iUp) return 0;
  if (f.mUp || f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.tSide) s += 40;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  if (!f.tUp) s += 10;
  return s;
}

// M: fist with thumb tucked under index + middle + ring
function scoreM(f: F) {
  if (f.numCurl < 3) return 0;
  if (f.thumbOverKnuckles) return 0;
  if (f.tSide || f.tUp) return 0;
  if (!f.thumbUnderMiddle || !f.thumbUnderRing) return 0;
  let s = 50;
  if (f.numCurl >= 4) s += 20;
  s += 30;
  return s;
}

// N: fist with thumb tucked under index + middle (not ring)
function scoreN(f: F) {
  if (f.numCurl < 2) return 0;
  if (f.thumbOverKnuckles) return 0;
  if (f.tSide || f.tUp) return 0;
  if (!f.thumbUnderIndex || !f.thumbUnderMiddle || f.thumbUnderRing) return 0;
  let s = 50;
  if (f.numCurl >= 3) s += 20;
  s += 30;
  return s;
}

// O: all fingers curved to meet thumb forming an O circle
function scoreO(f: F) {
  if (f.numUp > 1) return 0;
  if (f.tiD > 0.55) return 0;
  let s = 40;
  if (f.tiD < 0.40) s += 30;
  if (f.tmD < 0.50) s += 20;
  if (f.trD < 0.60) s += 15;
  if (!f.tSide && !f.tUp) s += 10;
  return s;
}

function scoreP(f: F) {
  const iDown = f.iE > 0.25 && !f.iUp;
  const mDown = f.mE > 0.25 && !f.mUp;
  if (!iDown || !mDown) return 0;
  let s = 30;
  if (f.tSide || f.tUp) s += 30;
  if (f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreQ(f: F) {
  if (f.numUp > 0) return 0;
  let s = 20;
  if (f.tiD < 0.45) s += 30;
  if (f.numCurl >= 3) s += 20;
  return s;
}

function scoreR(f: F) {
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.imD < 0.35) s += 40;
  if (f.rCurl && f.pCurl) s += 20;
  if (!f.tSide) s += 10;
  return s;
}

// S: fist with thumb pressed OVER all fingers from front
function scoreS(f: F) {
  if (f.numCurl < 3) return 0;
  if (!f.thumbOverKnuckles) return 0;
  let s = 50;
  if (f.numCurl >= 4) s += 20;
  if (!f.tSide && !f.tUp) s += 30;
  return s;
}

// T: fist with thumb tucked under index only
function scoreT(f: F) {
  if (f.numCurl < 2) return 0;
  if (f.thumbOverKnuckles) return 0;
  if (f.tSide || f.tUp) return 0;
  if (!f.thumbUnderIndex || f.thumbUnderMiddle) return 0;
  let s = 50;
  if (f.numCurl >= 3) s += 20;
  s += 30;
  return s;
}

function scoreU(f: F) {
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  let s = 30;
  if (f.imD < 0.55) s += 40;
  if (f.rCurl && f.pCurl) s += 20;
  if (f.imD < 0.35) s += 10;
  return s;
}

// V: index and middle up and SPREAD, thumb not up (else K)
function scoreV(f: F) {
  if (!f.iUp || !f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  if (f.tUp) return 0;
  let s = 40;
  if (f.imD > 0.40) s += 40;
  if (f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreW(f: F) {
  if (!f.iUp || !f.mUp || !f.rUp) return 0;
  if (f.pUp) return 0;
  return 80;
}

function scoreX(f: F) {
  if (f.iUp || f.mUp || f.rUp || f.pUp) return 0;
  let s = 20;
  if (f.iHook) s += 50;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  return s;
}

function scoreY(f: F) {
  if (!f.pUp) return 0;
  if (f.iUp || f.mUp || f.rUp) return 0;
  let s = 30;
  if (f.tSide) s += 50;
  if (f.iCurl && f.mCurl && f.rCurl) s += 20;
  return s;
}

function scoreGWithLm(f: F, lm: Landmark[]) {
  if (f.mUp || f.rUp || f.pUp) return 0;
  if (f.numCurl < 2) return 0;
  let s = 20;
  const dy = Math.abs(lm[IDX.I_TIP].y - lm[IDX.I_MCP].y);
  const dx = Math.abs(lm[IDX.I_TIP].x - lm[IDX.I_MCP].x);
  if (dx > dy * 1.3) s += 35;
  if (f.tSide) s += 25;
  if (f.mCurl && f.rCurl && f.pCurl) s += 20;
  return s;
}

// H: index and middle pointing SIDEWAYS (horizontal), not upward
function scoreHWithLm(f: F, lm: Landmark[], pw: number) {
  if (f.iUp || f.mUp) return 0;
  if (f.rUp || f.pUp) return 0;
  if (!f.indexHoriz) return 0;
  if (f.iE < 0.20 && f.mE < 0.20) return 0;
  let s = 20;
  const heightDiff = Math.abs(lm[IDX.I_TIP].y - lm[IDX.M_TIP].y) / pw;
  if (heightDiff < 0.30) s += 30;
  if (f.iE > 0.25 && f.mE > 0.25) s += 20;
  if (f.rCurl && f.pCurl) s += 20;
  return s;
}

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
    ['G', scoreGWithLm(f, lm)],
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

  const margin = bestScore - secondScore;
  const confidence = Math.min(1, Math.max(0.15, margin / 40));

  return { letter: bestLetter, confidence };
}
