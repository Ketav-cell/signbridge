"""
Predictor — wraps MediaPipe hand detection + CNN model inference.

Data flow per frame:
  base64 JPEG string
    → decode → OpenCV BGR frame
    → MediaPipe Hands → 21 landmarks (x, y, z)
    → min-max normalise → 63-dim feature vector
    → CNNModel forward pass → softmax → argmax
    → letter (A-Z) + confidence score
"""

import base64
import os

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import torch

from model import CNNModel

ALPHABET_CLASSES: dict[int, str] = {
    0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F", 6: "G",
    7: "H", 8: "I", 9: "J", 10: "K", 11: "L", 12: "M", 13: "N",
    14: "O", 15: "P", 16: "Q", 17: "R", 18: "S", 19: "T", 20: "U",
    21: "V", 22: "W", 23: "X", 24: "Y", 25: "Z",
}

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


class Predictor:
    """
    Loads the pre-trained CNN and MediaPipe, then exposes a single
    `predict(frame_b64)` method that accepts a base64-encoded JPEG
    and returns a dict: { hand_detected, letter, confidence }.
    """

    def __init__(self):
        device = torch.device("cpu")

        alphabet_path = os.path.join(_MODELS_DIR, "CNN_model_alphabet_SIBI.pth")
        if not os.path.exists(alphabet_path):
            raise FileNotFoundError(
                f"Model weights not found at {alphabet_path}.\n"
                "Run the setup commands in README to download the .pth files."
            )

        self._model = CNNModel()
        self._model.load_state_dict(
            torch.load(alphabet_path, map_location=device)
        )
        self._model.eval()

        _mp_hands = mp.solutions.hands
        self._hands = _mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.2,
        )
        self._mp_hands = _mp_hands

    # ------------------------------------------------------------------
    def predict(self, frame_b64: str) -> dict:
        """
        Args:
            frame_b64: base64-encoded JPEG (no data-URL prefix).

        Returns:
            {
              "hand_detected": bool,
              "letter": str | None,   # e.g. "A"
              "confidence": float,    # 0.0 – 1.0
            }
        """
        try:
            img_bytes = base64.b64decode(frame_b64)
            arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if frame is None:
                return {"hand_detected": False, "letter": None, "confidence": 0.0}

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self._hands.process(frame_rgb)

            if not results.multi_hand_landmarks:
                return {"hand_detected": False, "letter": None, "confidence": 0.0}

            hand = results.multi_hand_landmarks[0]
            xs, ys, zs = [], [], []

            for lm in hand.landmark:
                xs.append(lm.x)
                ys.append(lm.y)
                zs.append(lm.z)

            # Min-max normalisation — same as original realTime.py
            data: dict[str, float] = {}
            for i, landmark in enumerate(self._mp_hands.HandLandmark):
                lm = hand.landmark[i]
                data[f"{landmark.name}_x"] = lm.x - min(xs)
                data[f"{landmark.name}_y"] = lm.y - min(ys)
                data[f"{landmark.name}_z"] = lm.z - min(zs)

            df = pd.DataFrame([data])
            tensor = torch.from_numpy(
                np.reshape(df.values, (1, 63, 1))
            ).float()

            with torch.no_grad():
                outputs = self._model(tensor)
                probs = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, dim=1)

            letter = ALPHABET_CLASSES[predicted.item()]
            conf = round(confidence.item(), 3)

            return {"hand_detected": True, "letter": letter, "confidence": conf}

        except Exception as exc:  # noqa: BLE001
            return {
                "hand_detected": False,
                "letter": None,
                "confidence": 0.0,
                "error": str(exc),
            }
