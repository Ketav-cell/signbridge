# SignBridge

SignBridge converts speech to sign language and sign language back to text in real time. It runs entirely in the browser so there is nothing to install for most features.

## What it does

**Speech to Sign** — speak into your microphone and the app translates your words into ISL signs using GIFs from a real sign language repository. You can control playback speed, step through signs one at a time, and see the full sign sequence laid out.

**Sign to Text** — point your webcam at your hand and the app reads your ASL letters. It builds words as you sign them. Use the space bar to add word breaks and backspace to remove a letter.

**Dictionary** — browse all 26 alphabet letters and 86 ISL phrases with their corresponding images and GIFs.

## Running it

You only need one command for the speech-to-sign and dictionary pages:

```bash
npm run dev
```

Then open http://localhost:3000.

For better sign-to-text accuracy, run the inference server alongside it. The app will automatically use the CNN model when the server is available and fall back to browser-based detection when it is not.

```bash
cd inference
source ../venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000
```

The inference server requires Python 3.9 and the packages in `inference/requirements.txt`. The CNN model file `cnn8grps_rad1_model.h5` needs to be in the `inference/` directory.

## Tech

- Next.js 14 with TypeScript
- MediaPipe for hand landmark detection
- Python FastAPI server with a CNN model for accurate letter classification
- Framer Motion for animations
- Tailwind CSS

## Deployment

Push to GitHub and connect the repo to Vercel. The frontend deploys automatically. Speech to sign and the dictionary work on Vercel without any changes. Sign to text falls back to browser-native detection without the Python server.

To get it on your phone, open the deployed URL in Safari or Chrome and use "Add to Home Screen."
