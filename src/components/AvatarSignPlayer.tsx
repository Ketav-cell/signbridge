'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SignSequenceItem } from '@/types';
import { LETTER_ANIMATIONS, type AnimFrame } from '@/lib/signAnimations';

interface AvatarSignPlayerProps {
  currentSign: SignSequenceItem | null;
  isPlaying: boolean;
  speed?: number;
  className?: string;
}

// Per-bone animation state
interface BoneState {
  bone: THREE.Bone;
  axis: 'x' | 'y' | 'z';
  limit: number;
  dir: '+' | '-';
  done: boolean;
}

// Animation runner state
interface AnimState {
  // flat list of phases to process: each phase = AnimFrame[]
  phases: AnimFrame[][];
  phaseIdx: number;
  boneStates: BoneState[];
}

const ANIM_SPEED = 0.05; // radians per frame

export default function AvatarSignPlayer({
  currentSign,
  isPlaying,
  speed = 1,
  className,
}: AvatarSignPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep speed in a ref so the RAF loop always reads the latest value
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Three.js objects
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bonesRef = useRef<Map<string, THREE.Bone>>(new Map());
  const rafRef = useRef<number | null>(null);
  const modelLoadedRef = useRef(false);

  // Animation queue
  const animRef = useRef<AnimState | null>(null);

  // Build phases list from currentSign
  function buildPhases(sign: SignSequenceItem): AnimFrame[][] {
    if (sign.signType === 'fingerspell' && sign.letters && sign.letters.length > 0) {
      const phases: AnimFrame[][] = [];
      for (const letter of sign.letters) {
        const seq = LETTER_ANIMATIONS[letter.toUpperCase()];
        if (seq) {
          for (const phase of seq) phases.push(phase);
        }
      }
      return phases;
    }
    // For whole-word signs, try direct lookup (e.g. HOME, PERSON, TIME, YOU)
    // then fall back to fingerspelling
    const token = sign.glossToken.toUpperCase();
    const seq = LETTER_ANIMATIONS[token];
    if (seq) return [...seq];

    // Fingerspell fallback
    const phases: AnimFrame[][] = [];
    for (const letter of token) {
      const lseq = LETTER_ANIMATIONS[letter];
      if (lseq) {
        for (const phase of lseq) phases.push(phase);
      }
    }
    return phases;
  }

  // Start animating the current sign
  function startAnim(sign: SignSequenceItem) {
    const phases = buildPhases(sign);
    if (phases.length === 0) {
      animRef.current = null;
      return;
    }
    animRef.current = { phases, phaseIdx: 0, boneStates: [] };
    loadPhase(0);
  }

  function loadPhase(idx: number) {
    const state = animRef.current;
    if (!state || idx >= state.phases.length) {
      animRef.current = null;
      return;
    }
    state.phaseIdx = idx;
    state.boneStates = [];
    const phase = state.phases[idx];
    for (const [boneName, , axis, limit, dir] of phase) {
      const bone = bonesRef.current.get(boneName);
      if (!bone) continue;
      state.boneStates.push({ bone, axis, limit, dir, done: false });
    }
  }

  // Main render + animation loop
  function loop() {
    rafRef.current = requestAnimationFrame(loop);

    const state = animRef.current;
    if (state && state.boneStates.length > 0) {
      let allDone = true;
      const frameSpeed = ANIM_SPEED * speedRef.current;

      for (const bs of state.boneStates) {
        if (bs.done) continue;

        if (bs.dir === '+') {
          bs.bone.rotation[bs.axis] += frameSpeed;
          if (bs.bone.rotation[bs.axis] >= bs.limit) {
            bs.bone.rotation[bs.axis] = bs.limit;
            bs.done = true;
          } else {
            allDone = false;
          }
        } else {
          bs.bone.rotation[bs.axis] -= frameSpeed;
          if (bs.bone.rotation[bs.axis] <= bs.limit) {
            bs.bone.rotation[bs.axis] = bs.limit;
            bs.done = true;
          } else {
            allDone = false;
          }
        }
      }

      if (allDone) {
        loadPhase(state.phaseIdx + 1);
      }
    }

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }

  // Setup Three.js scene once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 1.4, 2.2);
    camera.lookAt(0, 1.0, 0);
    cameraRef.current = camera;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(1, 3, 2);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-1, 1, -1);
    scene.add(fillLight);

    // Load model
    const loader = new GLTFLoader();
    loader.load(
      '/models/xbot.glb',
      (gltf) => {
        const model = gltf.scene;
        // Center model: crop to upper body view
        model.position.set(0, -0.9, 0);
        scene.add(model);

        // Collect all bones
        model.traverse((obj) => {
          if ((obj as THREE.Bone).isBone) {
            bonesRef.current.set(obj.name, obj as THREE.Bone);
          }
        });

        modelLoadedRef.current = true;
      },
      undefined,
      (err) => console.error('Failed to load xbot.glb:', err)
    );

    // Start render loop
    rafRef.current = requestAnimationFrame(loop);

    // Handle resize
    const ro = new ResizeObserver(() => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(cw, ch, false);
        cameraRef.current.aspect = cw / ch;
        cameraRef.current.updateProjectionMatrix();
      }
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger animation when sign or play state changes
  useEffect(() => {
    if (!currentSign) {
      animRef.current = null;
      return;
    }
    if (isPlaying || currentSign) {
      // Animate whenever sign changes (whether playing or not, show the gesture)
      if (modelLoadedRef.current) {
        startAnim(currentSign);
      } else {
        // Model not yet loaded — retry once it is
        const interval = setInterval(() => {
          if (modelLoadedRef.current) {
            clearInterval(interval);
            startAnim(currentSign);
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSign, isPlaying, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
