"""
Predictor — hand skeleton CNN approach.

Data flow per frame:
  base64 JPEG string
    → decode → OpenCV BGR frame
    → cvzone HandDetector → hand landmarks + bbox
    → crop hand region (with offset)
    → draw skeleton on 400×400 white canvas
    → feed to Keras CNN → 8-group prediction (0-7)
    → geometric rule-based disambiguation → final letter (A-Z)

Based on: Sign-Language-To-Text-and-Speech-Conversion
"""

import base64
import math
import os

import cv2
import numpy as np
from cvzone.HandTrackingModule import HandDetector
from keras.models import load_model

_DIR = os.path.dirname(__file__)
_MODEL_PATH = os.path.join(_DIR, "cnn8grps_rad1_model.h5")

OFFSET = 29
CANVAS_SIZE = 400


def _dist(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _draw_skeleton(pts, canvas_size=CANVAS_SIZE, hand_w=0, hand_h=0):
    """Draw the hand skeleton on a white canvas, centred within canvas_size."""
    white = np.ones((canvas_size, canvas_size, 3), np.uint8) * 255
    os_x = ((canvas_size - hand_w) // 2) - 15
    os_y = ((canvas_size - hand_h) // 2) - 15

    def p(i):
        return (pts[i][0] + os_x, pts[i][1] + os_y)

    # Finger segments
    for t in range(0, 4):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(5, 8):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(9, 12):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(13, 16):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(17, 20):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)

    # Palm connections
    cv2.line(white, p(5), p(9), (0, 255, 0), 3)
    cv2.line(white, p(9), p(13), (0, 255, 0), 3)
    cv2.line(white, p(13), p(17), (0, 255, 0), 3)
    cv2.line(white, p(0), p(5), (0, 255, 0), 3)
    cv2.line(white, p(0), p(17), (0, 255, 0), 3)

    # Joints
    for i in range(21):
        cv2.circle(white, p(i), 2, (0, 0, 255), 1)

    return white


def _map_group_to_letter(ch1, ch2, pts):
    """
    Exact disambiguation logic from prediction_wo_gui.py.
    ch1: top predicted group (0-7)
    ch2: second predicted group
    pts: 21 hand landmarks [[x,y,z], ...]
    Returns the predicted letter as a string.
    """
    pl = [ch1, ch2]

    # ---- inter-group disambiguation rules ----

    # condition for [Aemnst]
    l = [[5,2],[5,3],[3,5],[3,6],[3,0],[3,2],[6,4],[6,1],[6,2],[6,6],[6,7],[6,0],[6,5],
         [4,1],[1,0],[1,1],[6,3],[1,6],[5,6],[5,1],[4,5],[1,4],[1,5],[2,0],[2,6],[4,6],
         [1,0],[5,7],[1,6],[6,1],[7,6],[2,5],[7,1],[5,4],[7,0],[7,5],[7,2]]
    if pl in l:
        if (pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 0

    # condition for [o][s]
    l = [[2,2],[2,1]]
    if pl in l:
        if pts[5][0] < pts[4][0]:
            ch1 = 0

    # condition for [c0][aemnst]
    l = [[0,0],[0,6],[0,2],[0,5],[0,1],[0,7],[5,2],[7,6],[7,1]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[0][0] > pts[8][0] and pts[0][0] > pts[4][0] and
                pts[0][0] > pts[12][0] and pts[0][0] > pts[16][0] and
                pts[0][0] > pts[20][0]) and pts[5][0] > pts[4][0]:
            ch1 = 2

    l = [[6,0],[6,6],[6,2]]
    pl = [ch1, ch2]
    if pl in l:
        if _dist(pts[8], pts[16]) < 52:
            ch1 = 2

    # condition for [gh][bdfikruvw]
    l = [[1,4],[1,5],[1,6],[1,3],[1,0]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[14][1] < pts[16][1] and
                pts[18][1] < pts[20][1] and pts[0][0] < pts[8][0] and
                pts[0][0] < pts[12][0] and pts[0][0] < pts[16][0] and pts[0][0] < pts[20][0]):
            ch1 = 3

    l = [[4,6],[4,1],[4,5],[4,3],[4,7]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[4][0] > pts[0][0]:
            ch1 = 3

    l = [[5,3],[5,0],[5,7],[5,4],[5,2],[5,1],[5,5]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[2][1] + 15 < pts[16][1]:
            ch1 = 3

    # con for [l][x]
    l = [[6,4],[6,1],[6,2]]
    pl = [ch1, ch2]
    if pl in l:
        if _dist(pts[4], pts[11]) > 55:
            ch1 = 4

    l = [[1,4],[1,6],[1,1]]
    pl = [ch1, ch2]
    if pl in l:
        if (_dist(pts[4], pts[11]) > 50 and pts[6][1] > pts[8][1] and
                pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 4

    l = [[3,6],[3,4]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[4][0] < pts[0][0]:
            ch1 = 4

    l = [[2,2],[2,5],[2,4]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[1][0] < pts[12][0]:
            ch1 = 4

    # con for [gh][z]
    l = [[3,6],[3,5],[3,4]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]) and pts[4][1] > pts[10][1]:
            ch1 = 5

    l = [[3,2],[3,1],[3,6]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[4][1]+17 > pts[8][1] and pts[4][1]+17 > pts[12][1] and
                pts[4][1]+17 > pts[16][1] and pts[4][1]+17 > pts[20][1]):
            ch1 = 5

    l = [[4,4],[4,5],[4,2],[7,5],[7,6],[7,0]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[4][0] > pts[0][0]:
            ch1 = 5

    l = [[0,2],[0,6],[0,1],[0,5],[0,0],[0,7],[0,4],[0,3],[2,7]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[0][0] < pts[8][0] and pts[0][0] < pts[12][0] and
                pts[0][0] < pts[16][0] and pts[0][0] < pts[20][0]):
            ch1 = 5

    # con for [pqz][yj]
    l = [[5,7],[5,2],[5,6]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[3][0] < pts[0][0]:
            ch1 = 7

    l = [[4,6],[4,2],[4,4],[4,1],[4,5],[4,7]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[6][1] < pts[8][1]:
            ch1 = 7

    l = [[6,7],[0,7],[0,1],[0,0],[6,4],[6,6],[6,5],[6,1]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[18][1] > pts[20][1]:
            ch1 = 7

    # condition for [x][aemnst]
    l = [[0,4],[0,2],[0,3],[0,1],[0,6]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[5][0] > pts[16][0]:
            ch1 = 6

    l = [[7,2]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[18][1] < pts[20][1]:
            ch1 = 6

    l = [[2,1],[2,2],[2,6],[2,7],[2,0]]
    pl = [ch1, ch2]
    if pl in l:
        if _dist(pts[8], pts[16]) > 50:
            ch1 = 6

    l = [[4,6],[4,2],[4,1],[4,4]]
    pl = [ch1, ch2]
    if pl in l:
        if _dist(pts[4], pts[11]) < 60:
            ch1 = 6

    l = [[1,4],[1,6],[1,0],[1,2]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[5][0] - pts[4][0] - 15 > 0:
            ch1 = 6

    # con for [b/d/f/i/u/v/w/k/r]
    l = [[5,0],[5,1],[5,4],[5,5],[5,6],[6,1],[7,6],[0,2],[7,1],[7,4],[6,6],[7,2],
         [5,0],[6,3],[6,4],[7,5],[7,2]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    l = [[6,1],[6,0],[0,3],[6,4],[2,2],[0,6],[6,2],[7,6],[4,6],[4,1],[4,2],
         [0,2],[7,1],[7,4],[6,6],[7,2],[7,5],[7,2]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] < pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    l = [[6,1],[6,0],[4,2],[4,1],[4,6],[4,4]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    l = [[5,0],[3,4],[3,0],[3,1],[3,5],[5,5],[5,4],[5,1],[7,6]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1] and
                pts[2][0] < pts[0][0] and pts[4][1] > pts[14][1]):
            ch1 = 1

    l = [[4,1],[4,2],[4,4]]
    pl = [ch1, ch2]
    if pl in l:
        if (_dist(pts[4], pts[11]) < 50 and pts[6][1] > pts[8][1] and
                pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 1

    l = [[3,4],[3,0],[3,1],[3,5],[3,6]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1] and
                pts[2][0] < pts[0][0] and pts[14][1] < pts[4][1]):
            ch1 = 1

    l = [[6,6],[6,4],[6,1],[6,2]]
    pl = [ch1, ch2]
    if pl in l:
        if pts[5][0] - pts[4][0] - 15 < 0:
            ch1 = 1

    l = [[5,4],[5,5],[5,1],[0,3],[0,7],[5,0],[0,2],[6,2],[7,5],[7,1],[7,6],[7,7]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 1

    l = [[1,5],[1,7],[1,1],[1,6],[1,3],[1,0]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[4][0] < pts[5][0]+15 and pts[6][1] < pts[8][1] and
                pts[10][1] < pts[12][1] and pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 7

    l = [[5,5],[5,0],[5,4],[5,1],[4,6],[4,1],[7,6],[3,0],[3,5]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1] and pts[4][1] > pts[14][1]):
            ch1 = 1

    fg = 13
    l = [[3,5],[3,0],[3,6],[5,1],[4,1],[2,0],[5,0],[5,5]]
    pl = [ch1, ch2]
    if pl in l:
        if (not (pts[0][0]+fg < pts[8][0] and pts[0][0]+fg < pts[12][0] and
                 pts[0][0]+fg < pts[16][0] and pts[0][0]+fg < pts[20][0]) and
                not (pts[0][0] > pts[8][0] and pts[0][0] > pts[12][0] and
                     pts[0][0] > pts[16][0] and pts[0][0] > pts[20][0]) and
                _dist(pts[4], pts[11]) < 50):
            ch1 = 1

    l = [[5,0],[5,5],[0,1]]
    pl = [ch1, ch2]
    if pl in l:
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and pts[14][1] > pts[16][1]):
            ch1 = 1

    # ---- intra-group mapping (groups → letters) ----
    pl = [ch1, ch2]

    if ch1 == 0:
        ch1 = 'S'
        if (pts[4][0] < pts[6][0] and pts[4][0] < pts[10][0] and
                pts[4][0] < pts[14][0] and pts[4][0] < pts[18][0]):
            ch1 = 'A'
        if (pts[4][0] > pts[6][0] and pts[4][0] < pts[10][0] and
                pts[4][0] < pts[14][0] and pts[4][0] < pts[18][0] and
                pts[4][1] < pts[14][1] and pts[4][1] < pts[18][1]):
            ch1 = 'T'
        if (pts[4][1] > pts[8][1] and pts[4][1] > pts[12][1] and
                pts[4][1] > pts[16][1] and pts[4][1] > pts[20][1]):
            ch1 = 'E'
        if (pts[4][0] > pts[6][0] and pts[4][0] > pts[10][0] and
                pts[4][0] > pts[14][0] and pts[4][1] < pts[18][1]):
            ch1 = 'M'
        if (pts[4][0] > pts[6][0] and pts[4][0] > pts[10][0] and
                pts[4][1] < pts[18][1] and pts[4][1] < pts[14][1]):
            ch1 = 'N'

    elif ch1 == 2:
        ch1 = 'C' if _dist(pts[12], pts[4]) > 42 else 'O'

    elif ch1 == 3:
        ch1 = 'G' if _dist(pts[8], pts[12]) > 72 else 'H'

    elif ch1 == 7:
        ch1 = 'Y' if _dist(pts[8], pts[4]) > 42 else 'J'

    elif ch1 == 4:
        ch1 = 'L'

    elif ch1 == 6:
        ch1 = 'X'

    elif ch1 == 5:
        if (pts[4][0] > pts[12][0] and pts[4][0] > pts[16][0] and pts[4][0] > pts[20][0]):
            ch1 = 'Z' if pts[8][1] < pts[5][1] else 'Q'
        else:
            ch1 = 'P'

    elif ch1 == 1:
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'B'
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'D'
        if (pts[6][1] < pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] > pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'F'
        if (pts[6][1] < pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'I'
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] > pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'W'
        if (pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]) and pts[4][1] < pts[9][1]:
            ch1 = 'K'
        if ((_dist(pts[8], pts[12]) - _dist(pts[6], pts[10])) < 8 and
                pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'U'
        if ((_dist(pts[8], pts[12]) - _dist(pts[6], pts[10])) >= 8 and
                pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1] and pts[4][1] > pts[9][1]):
            ch1 = 'V'
        if (pts[8][0] > pts[12][0] and pts[6][1] > pts[8][1] and pts[10][1] > pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] < pts[20][1]):
            ch1 = 'R'

    # Special cases
    pl = [ch1, ch2]
    if ch1 in (1, 'E', 'S', 'X', 'Y', 'B'):
        if (pts[6][1] > pts[8][1] and pts[10][1] < pts[12][1] and
                pts[14][1] < pts[16][1] and pts[18][1] > pts[20][1]):
            ch1 = 'Space'

    if ch1 in ('E', 'Y', 'B'):
        if pts[4][0] < pts[5][0]:
            ch1 = 'Next'

    if ch1 in ('Next', 'B', 'C', 'H', 'F'):
        if (pts[0][0] > pts[8][0] and pts[0][0] > pts[12][0] and
                pts[0][0] > pts[16][0] and pts[0][0] > pts[20][0] and
                pts[4][1] < pts[8][1] and pts[4][1] < pts[12][1] and
                pts[4][1] < pts[16][1] and pts[4][1] < pts[20][1]):
            ch1 = 'Backspace'

    return ch1


class Predictor:
    """
    Loads cnn8grps_rad1_model.h5 and uses cvzone HandDetector
    to convert webcam frames → predicted ASL letter.
    """

    def __init__(self):
        if not os.path.exists(_MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found: {_MODEL_PATH}\n"
                "Place cnn8grps_rad1_model.h5 in the inference/ directory."
            )
        self._model = load_model(_MODEL_PATH)
        self._hd = HandDetector(maxHands=1)
        self._hd2 = HandDetector(maxHands=1)
        print("✅ Predictor ready (cnn8grps CNN).")

    def predict(self, frame_b64: str) -> dict:
        """
        Args:
            frame_b64: base64-encoded JPEG (no data-URL prefix).
        Returns:
            { "hand_detected": bool, "letter": str|None, "confidence": float }
        """
        try:
            img_bytes = base64.b64decode(frame_b64)
            arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if frame is None:
                return {"hand_detected": False, "letter": None, "confidence": 0.0}

            # Flip like a mirror (matches the original script)
            frame = cv2.flip(frame, 1)

            hands = self._hd.findHands(frame, draw=False, flipType=True)
            if not hands:
                return {"hand_detected": False, "letter": None, "confidence": 0.0}

            hand = hands[0]
            x, y, w, h = hand['bbox']

            # Crop with offset
            y1 = max(0, y - OFFSET)
            y2 = min(frame.shape[0], y + h + OFFSET)
            x1 = max(0, x - OFFSET)
            x2 = min(frame.shape[1], x + w + OFFSET)
            cropped = frame[y1:y2, x1:x2]

            if cropped.size == 0:
                return {"hand_detected": False, "letter": None, "confidence": 0.0}

            # Detect on cropped region to get local landmarks
            white_canvas = np.ones((CANVAS_SIZE, CANVAS_SIZE, 3), np.uint8) * 255
            hands2 = self._hd2.findHands(cropped, draw=False, flipType=True)

            if not hands2:
                return {"hand_detected": True, "letter": None, "confidence": 0.0}

            hand2 = hands2[0]
            pts = hand2['lmList']  # list of [x, y, z]

            # Draw skeleton on white canvas
            skeleton = _draw_skeleton(pts, CANVAS_SIZE, w, h)

            # CNN prediction
            inp = skeleton.reshape(1, CANVAS_SIZE, CANVAS_SIZE, 3).astype(np.float32)
            probs = self._model.predict(inp, verbose=0)[0].astype('float32')

            ch1 = int(np.argmax(probs))
            probs[ch1] = 0
            ch2 = int(np.argmax(probs))
            probs[ch2] = 0
            ch3 = int(np.argmax(probs))

            # Confidence = original top probability
            inp2 = skeleton.reshape(1, CANVAS_SIZE, CANVAS_SIZE, 3).astype(np.float32)
            orig_probs = self._model.predict(inp2, verbose=0)[0].astype('float32')
            confidence = float(orig_probs[ch1])

            letter = _map_group_to_letter(ch1, ch2, pts)

            # Only return alphabetic letters (filter Space/Next/Backspace for the UI)
            if not (isinstance(letter, str) and len(letter) == 1 and letter.isalpha()):
                return {"hand_detected": True, "letter": None, "confidence": confidence}

            return {
                "hand_detected": True,
                "letter": letter,
                "confidence": round(confidence, 3),
            }

        except Exception as exc:
            return {
                "hand_detected": False,
                "letter": None,
                "confidence": 0.0,
                "error": str(exc),
            }
