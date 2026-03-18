SignBridge

SignBridge converts speech into sign language and sign language back into text in real time. runs entirely in the browser so theres nothing to install for most of it.

what it does

speech to sign — speak into your mic and the app translates your words into ISL signs using real sign language gifs. you can control playback speed, step through signs one at a time, and see the full sign sequence.

sign to text — point your webcam at your hand and it reads your ASL letters and builds words as you sign. space bar adds word breaks, backspace removes a letter.

dictionary — browse all 26 alphabet letters and 86 ISL phrases with their actual images and gifs.

how to run

for speech to sign and the dictionary you just need:

npm run dev

then open http://localhost:3000

for better sign to text accuracy run the inference server too. the app automatically uses the CNN model when the server is up and falls back to browser detection when its not.

cd inference
source ../venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000

the inference server needs Python 3.9 and the packages in inference/requirements.txt. the CNN model file cnn8grps_rad1_model.h5 needs to be in the inference folder.

tech

Next.js 14, TypeScript, MediaPipe for hand landmark detection, Python FastAPI with a CNN model for letter classification, Framer Motion, Tailwind CSS.

deployment

push to github and connect to Vercel. speech to sign and dictionary work on Vercel with no changes. sign to text falls back to browser detection without the python server. to get it on your phone open the deployed URL and use add to home screen.
