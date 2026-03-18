import base64
import math
import os
import urllib.request
from typing import List

import cv2
import numpy as np
from keras.models import load_model

_DIR = os.path.dirname(os.path.abspath(__file__))
_CNN_PATH = os.path.join(_DIR, "cnn8grps_rad1_model.h5")
_HAND_MODEL_DIR = os.path.join(_DIR, "models")
_HAND_MODEL_PATH = os.path.join(_HAND_MODEL_DIR, "hand_landmarker.task")
_HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)

OFFSET = 29
CANVAS_SIZE = 400
PADDING = 40


def _ensure_hand_model():
    os.makedirs(_HAND_MODEL_DIR, exist_ok=True)
    if not os.path.exists(_HAND_MODEL_PATH):
        print("Downloading hand_landmarker.task model (~9 MB)...")
        urllib.request.urlretrieve(_HAND_MODEL_URL, _HAND_MODEL_PATH)
        print("Downloaded hand_landmarker.task")


def _dist(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _draw_skeleton(pts: List, canvas_size: int = CANVAS_SIZE) -> np.ndarray:
    white = np.ones((canvas_size, canvas_size, 3), np.uint8) * 255

    xs = [pt[0] for pt in pts]
    ys = [pt[1] for pt in pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    hand_w = max(max_x - min_x, 1)
    hand_h = max(max_y - min_y, 1)

    avail = canvas_size - 2 * PADDING
    scale = avail / max(hand_w, hand_h)

    os_x = PADDING + (avail - hand_w * scale) / 2 - min_x * scale
    os_y = PADDING + (avail - hand_h * scale) / 2 - min_y * scale

    def p(i):
        return (
            int(round(pts[i][0] * scale + os_x)),
            int(round(pts[i][1] * scale + os_y)),
        )

    for t in range(4):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(5, 8):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(9, 12):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(13, 16):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    for t in range(17, 20):
        cv2.line(white, p(t), p(t + 1), (0, 255, 0), 3)
    cv2.line(white, p(5),  p(9),  (0, 255, 0), 3)
    cv2.line(white, p(9),  p(13), (0, 255, 0), 3)
    cv2.line(white, p(13), p(17), (0, 255, 0), 3)
    cv2.line(white, p(0),  p(5),  (0, 255, 0), 3)
    cv2.line(white, p(0),  p(17), (0, 255, 0), 3)
    for i in range(21):
        cv2.circle(white, p(i), 2, (0, 0, 255), 1)

    return white


def _map_group_to_letter(ch1, ch2, pts, scale):
    T = max(scale, 1.0) / 100.0

    pl = [ch1, ch2]
    l = [[5,2],[5,3],[3,5],[3,6],[3,0],[3,2],[6,4],[6,1],[6,2],[6,6],[6,7],[6,0],[6,5],
         [4,1],[1,0],[1,1],[6,3],[1,6],[5,6],[5,1],[4,5],[1,4],[1,5],[2,0],[2,6],[4,6],
         [1,0],[5,7],[1,6],[6,1],[7,6],[2,5],[7,1],[5,4],[7,0],[7,5],[7,2]]
    if pl in l:
        if (pts[6][1]<pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 0

    l = [[2,2],[2,1]]
    if [ch1,ch2] in l:
        if pts[5][0]<pts[4][0]: ch1 = 0

    pl = [ch1, ch2]
    l = [[0,0],[0,6],[0,2],[0,5],[0,1],[0,7],[5,2],[7,6],[7,1]]
    if pl in l:
        if (pts[0][0]>pts[8][0] and pts[0][0]>pts[4][0] and pts[0][0]>pts[12][0] and
                pts[0][0]>pts[16][0] and pts[0][0]>pts[20][0]) and pts[5][0]>pts[4][0]:
            ch1 = 2

    pl = [ch1, ch2]
    l = [[6,0],[6,6],[6,2]]
    if pl in l:
        if _dist(pts[8], pts[16]) < 52*T: ch1 = 2

    pl = [ch1, ch2]
    l = [[1,4],[1,5],[1,6],[1,3],[1,0]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and
                pts[0][0]<pts[8][0] and pts[0][0]<pts[12][0] and
                pts[0][0]<pts[16][0] and pts[0][0]<pts[20][0]):
            ch1 = 3

    pl = [ch1, ch2]
    l = [[4,6],[4,1],[4,5],[4,3],[4,7]]
    if pl in l:
        if pts[4][0]>pts[0][0]: ch1 = 3

    pl = [ch1, ch2]
    l = [[5,3],[5,0],[5,7],[5,4],[5,2],[5,1],[5,5]]
    if pl in l:
        if pts[2][1]+15*T < pts[16][1]: ch1 = 3

    pl = [ch1, ch2]
    l = [[6,4],[6,1],[6,2]]
    if pl in l:
        if _dist(pts[4], pts[11]) > 55*T: ch1 = 4

    pl = [ch1, ch2]
    l = [[1,4],[1,6],[1,1]]
    if pl in l:
        if (_dist(pts[4], pts[11])>50*T and pts[6][1]>pts[8][1] and
                pts[10][1]<pts[12][1] and pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 4

    pl = [ch1, ch2]
    l = [[3,6],[3,4]]
    if pl in l:
        if pts[4][0]<pts[0][0]: ch1 = 4

    pl = [ch1, ch2]
    l = [[2,2],[2,5],[2,4]]
    if pl in l:
        if pts[1][0]<pts[12][0]: ch1 = 4

    pl = [ch1, ch2]
    l = [[3,6],[3,5],[3,4]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and pts[4][1]>pts[10][1]):
            ch1 = 5

    pl = [ch1, ch2]
    l = [[3,2],[3,1],[3,6]]
    if pl in l:
        if (pts[4][1]+17*T>pts[8][1] and pts[4][1]+17*T>pts[12][1] and
                pts[4][1]+17*T>pts[16][1] and pts[4][1]+17*T>pts[20][1]):
            ch1 = 5

    pl = [ch1, ch2]
    l = [[4,4],[4,5],[4,2],[7,5],[7,6],[7,0]]
    if pl in l:
        if pts[4][0]>pts[0][0]: ch1 = 5

    pl = [ch1, ch2]
    l = [[0,2],[0,6],[0,1],[0,5],[0,0],[0,7],[0,4],[0,3],[2,7]]
    if pl in l:
        if (pts[0][0]<pts[8][0] and pts[0][0]<pts[12][0] and
                pts[0][0]<pts[16][0] and pts[0][0]<pts[20][0]):
            ch1 = 5

    pl = [ch1, ch2]
    l = [[5,7],[5,2],[5,6]]
    if pl in l:
        if pts[3][0]<pts[0][0]: ch1 = 7

    pl = [ch1, ch2]
    l = [[4,6],[4,2],[4,4],[4,1],[4,5],[4,7]]
    if pl in l:
        if pts[6][1]<pts[8][1]: ch1 = 7

    pl = [ch1, ch2]
    l = [[6,7],[0,7],[0,1],[0,0],[6,4],[6,6],[6,5],[6,1]]
    if pl in l:
        if pts[18][1]>pts[20][1]: ch1 = 7

    pl = [ch1, ch2]
    l = [[0,4],[0,2],[0,3],[0,1],[0,6]]
    if pl in l:
        if pts[5][0]>pts[16][0]: ch1 = 6

    pl = [ch1, ch2]
    l = [[7,2]]
    if pl in l:
        if pts[18][1]<pts[20][1]: ch1 = 6

    pl = [ch1, ch2]
    l = [[2,1],[2,2],[2,6],[2,7],[2,0]]
    if pl in l:
        if _dist(pts[8], pts[16]) > 50*T: ch1 = 6

    pl = [ch1, ch2]
    l = [[4,6],[4,2],[4,1],[4,4]]
    if pl in l:
        if _dist(pts[4], pts[11]) < 60*T: ch1 = 6

    pl = [ch1, ch2]
    l = [[1,4],[1,6],[1,0],[1,2]]
    if pl in l:
        if pts[5][0]-pts[4][0]-15*T > 0: ch1 = 6

    pl = [ch1, ch2]
    l = [[5,0],[5,1],[5,4],[5,5],[5,6],[6,1],[7,6],[0,2],[7,1],[7,4],[6,6],[7,2],
         [6,3],[6,4],[7,5]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]>pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[6,1],[6,0],[0,3],[6,4],[2,2],[0,6],[6,2],[7,6],[4,6],[4,1],[4,2],
         [0,2],[7,1],[7,4],[6,6],[7,2],[7,5]]
    if pl in l:
        if (pts[6][1]<pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]>pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[6,1],[6,0],[4,2],[4,1],[4,6],[4,4]]
    if pl in l:
        if (pts[10][1]>pts[12][1] and pts[14][1]>pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[5,0],[3,4],[3,0],[3,1],[3,5],[5,5],[5,4],[5,1],[7,6]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and
                pts[2][0]<pts[0][0] and pts[4][1]>pts[14][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[4,1],[4,2],[4,4]]
    if pl in l:
        if (_dist(pts[4], pts[11])<50*T and pts[6][1]>pts[8][1] and
                pts[10][1]<pts[12][1] and pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[3,4],[3,0],[3,1],[3,5],[3,6]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and
                pts[2][0]<pts[0][0] and pts[14][1]<pts[4][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[6,6],[6,4],[6,1],[6,2]]
    if pl in l:
        if pts[5][0]-pts[4][0]-15*T < 0: ch1 = 1

    pl = [ch1, ch2]
    l = [[5,4],[5,5],[5,1],[0,3],[0,7],[5,0],[0,2],[6,2],[7,5],[7,1],[7,6],[7,7]]
    if pl in l:
        if (pts[6][1]<pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[1,5],[1,7],[1,1],[1,6],[1,3],[1,0]]
    if pl in l:
        if (pts[4][0]<pts[5][0]+15*T and pts[6][1]<pts[8][1] and
                pts[10][1]<pts[12][1] and pts[14][1]<pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 7

    pl = [ch1, ch2]
    l = [[5,5],[5,0],[5,4],[5,1],[4,6],[4,1],[7,6],[3,0],[3,5]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and pts[4][1]>pts[14][1]):
            ch1 = 1

    fg = 13
    pl = [ch1, ch2]
    l = [[3,5],[3,0],[3,6],[5,1],[4,1],[2,0],[5,0],[5,5]]
    if pl in l:
        if (not (pts[0][0]+fg*T<pts[8][0] and pts[0][0]+fg*T<pts[12][0] and
                 pts[0][0]+fg*T<pts[16][0] and pts[0][0]+fg*T<pts[20][0]) and
                not (pts[0][0]>pts[8][0] and pts[0][0]>pts[12][0] and
                     pts[0][0]>pts[16][0] and pts[0][0]>pts[20][0]) and
                _dist(pts[4], pts[11])<50*T):
            ch1 = 1

    pl = [ch1, ch2]
    l = [[5,0],[5,5],[0,1]]
    if pl in l:
        if (pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and pts[14][1]>pts[16][1]):
            ch1 = 1

    if ch1 == 0:
        ch1 = 'S'
        if (pts[4][0]<pts[6][0] and pts[4][0]<pts[10][0] and
                pts[4][0]<pts[14][0] and pts[4][0]<pts[18][0]):
            ch1 = 'A'
        if (pts[4][0]>pts[6][0] and pts[4][0]<pts[10][0] and
                pts[4][0]<pts[14][0] and pts[4][0]<pts[18][0] and
                pts[4][1]<pts[14][1] and pts[4][1]<pts[18][1]):
            ch1 = 'T'
        if (pts[4][1]>pts[8][1] and pts[4][1]>pts[12][1] and
                pts[4][1]>pts[16][1] and pts[4][1]>pts[20][1]):
            ch1 = 'E'
        if (pts[4][0]>pts[6][0] and pts[4][0]>pts[10][0] and
                pts[4][0]>pts[14][0] and pts[4][1]<pts[18][1]):
            ch1 = 'M'
        if (pts[4][0]>pts[6][0] and pts[4][0]>pts[10][0] and
                pts[4][1]<pts[18][1] and pts[4][1]<pts[14][1]):
            ch1 = 'N'
    elif ch1 == 2:
        ch1 = 'C' if _dist(pts[12], pts[4]) > 42*T else 'O'
    elif ch1 == 3:
        ch1 = 'G' if _dist(pts[8], pts[12]) > 72*T else 'H'
    elif ch1 == 7:
        ch1 = 'Y' if _dist(pts[8], pts[4]) > 42*T else 'I'
    elif ch1 == 4:
        ch1 = 'L'
    elif ch1 == 6:
        ch1 = 'X'
    elif ch1 == 5:
        if (pts[4][0]>pts[12][0] and pts[4][0]>pts[16][0] and pts[4][0]>pts[20][0]):
            ch1 = 'Z' if pts[8][1]<pts[5][1] else 'Q'
        else:
            ch1 = 'P'
    elif ch1 == 1:
        ch1 = 'B'
        if (pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]>pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 'B'
        if (pts[6][1]>pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 'D'
        if (pts[6][1]<pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]>pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 'F'
        if (pts[6][1]<pts[8][1] and pts[10][1]<pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]>pts[20][1]):
            ch1 = 'I'
        if (pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]>pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 'W'
        if (pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and pts[4][1]<pts[9][1]):
            ch1 = 'K'
        if ((_dist(pts[8],pts[12])-_dist(pts[6],pts[10]))<8*T and
                pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 'U'
        if ((_dist(pts[8],pts[12])-_dist(pts[6],pts[10]))>=8*T and
                pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1] and pts[4][1]>pts[9][1]):
            ch1 = 'V'
        if (pts[8][0]>pts[12][0] and pts[6][1]>pts[8][1] and pts[10][1]>pts[12][1] and
                pts[14][1]<pts[16][1] and pts[18][1]<pts[20][1]):
            ch1 = 'R'

    best_alpha = ch1 if (isinstance(ch1, str) and ch1.isalpha() and len(ch1) == 1) else 'A'

    if isinstance(ch1, str) and ch1.isalpha() and len(ch1) == 1:
        return ch1.upper()
    return best_alpha.upper() if isinstance(best_alpha, str) else 'A'


class Predictor:

    def __init__(self):
        if not os.path.exists(_CNN_PATH):
            raise FileNotFoundError(
                f"CNN model not found: {_CNN_PATH}\n"
                "Place cnn8grps_rad1_model.h5 in the inference/ directory."
            )
        _ensure_hand_model()
        self._cnn = load_model(_CNN_PATH)

        import mediapipe as mp
        self._mp = mp

        BaseOptions = mp.tasks.BaseOptions
        HandLandmarker = mp.tasks.vision.HandLandmarker
        HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=_HAND_MODEL_PATH),
            running_mode=VisionRunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.4,
            min_hand_presence_confidence=0.4,
            min_tracking_confidence=0.4,
        )
        self._detector = HandLandmarker.create_from_options(options)
        print("Predictor ready.")

    def predict(self, frame_b64: str) -> dict:
        try:
            img_bytes = base64.b64decode(frame_b64)
            arr = np.frombuffer(img_bytes, np.uint8)
            frame_raw = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame_raw is None:
                return {"hand_detected": False, "letter": None, "confidence": 0.0, "landmarks": []}

            h, w = frame_raw.shape[:2]
            frame = cv2.flip(frame_raw, 1)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=rgb)
            result = self._detector.detect(mp_img)

            if not result.hand_landmarks:
                return {"hand_detected": False, "letter": None, "confidence": 0.0, "landmarks": []}

            landmarks = result.hand_landmarks[0]

            px = [int(lm.x * w) for lm in landmarks]
            py = [int(lm.y * h) for lm in landmarks]

            x1 = max(0, min(px) - OFFSET)
            y1 = max(0, min(py) - OFFSET)
            x2 = min(w, max(px) + OFFSET)
            y2 = min(h, max(py) + OFFSET)
            pts = [[px[i] - x1, py[i] - y1, 0] for i in range(21)]

            hand_scale = max(_dist(pts[0], pts[9]), 1.0)

            skeleton = _draw_skeleton(pts, CANVAS_SIZE)
            inp = (skeleton.reshape(1, CANVAS_SIZE, CANVAS_SIZE, 3)
                   .astype(np.float32) / 255.0)
            probs = self._cnn.predict(inp, verbose=0)[0].astype("float32")
            ch1 = int(np.argmax(probs))
            confidence = float(probs[ch1])
            tmp = probs.copy(); tmp[ch1] = 0
            ch2 = int(np.argmax(tmp))

            letter = _map_group_to_letter(ch1, ch2, pts, hand_scale)
            print(f"[dbg] scale={hand_scale:.0f} cnn={ch1}({confidence:.2f}) -> {letter}")

            lm_norm = [[round(1.0 - lm.x, 4), round(lm.y, 4)] for lm in landmarks]

            return {
                "hand_detected": True,
                "letter": letter,
                "confidence": round(confidence, 3),
                "landmarks": lm_norm,
            }

        except Exception as exc:
            import traceback
            traceback.print_exc()
            return {"hand_detected": False, "letter": None, "confidence": 0.0,
                    "error": str(exc), "landmarks": []}
