"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import {
  HOME_CAMERA,
  HOME_TARGET,
  ISLAND_RADIUS,
  MAX_DISTANCE,
  MIN_DISTANCE,
} from "@/world/constants";
import { elements } from "@/world/elements";
import Hud, { type DragMode } from "./Hud";

/**
 * Widens the lens on narrow screens so the whole island still fits.
 *
 * A phone is tall and thin. The camera's field of view is measured
 * vertically, so on a thin screen the sides of the world get cut off. This
 * works out how wide the lens has to be and opens it up — it never narrows
 * below the 45° that desktop uses.
 */
function FitToViewport() {
  // Reach for the camera through get() rather than holding it from the hook —
  // we change its lens, and a value handed straight back by a hook is not ours
  // to modify.
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const distance = HOME_CAMERA.distanceTo(HOME_TARGET);
    // Half-angle needed across the width to take in the whole island.
    const needed = Math.atan((ISLAND_RADIUS + 0.3) / distance);
    const vertical = Math.atan(Math.tan(needed) / Math.max(aspect, 0.2));

    camera.fov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(vertical * 2),
      45,
      80,
    );
    camera.updateProjectionMatrix();
  }, [get, size]);

  return null;
}

export default function Scene() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [mode, setMode] = useState<DragMode>("rotate");

  // Switch what a left-drag (or a one-finger drag) does.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.mouseButtons.LEFT =
      mode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    c.touches.ONE = mode === "pan" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  }, [mode]);

  /** Move the camera closer to or further from whatever it is looking at. */
  const dolly = useCallback((factor: number) => {
    const c = controlsRef.current;
    if (!c) return;
    const offset = c.object.position.clone().sub(c.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * factor,
        MIN_DISTANCE,
        MAX_DISTANCE,
      ),
    );
    c.object.position.copy(c.target.clone().add(offset));
    c.update();
  }, []);

  /** Put the camera back exactly where it started. */
  const goHome = useCallback(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.object.position.copy(HOME_CAMERA);
    c.target.copy(HOME_TARGET);
    c.update();
  }, []);

  return (
    <div className="relative h-dvh w-full bg-white">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: HOME_CAMERA.toArray(), fov: 45 }}
      >
        <color attach="background" args={["#ffffff"]} />
        <FitToViewport />

        <hemisphereLight args={["#ffffff", "#c8d8b4", 1.0]} />
        <ambientLight intensity={0.34} />

        {/* Warm key light — the one that casts the shadows */}
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.55}
          color="#fff4e2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0006}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
        />

        {/* Cool fill from the other side, so the shadows aren't flat grey */}
        <directionalLight
          position={[-6, 3.5, -5]}
          intensity={0.42}
          color="#cfe6ff"
        />

        {elements.map(({ id, Component }) => (
          <Component key={id} />
        ))}

        {/* Grounds the island so it doesn't float on the white page. */}
        <ContactShadows
          position={[0, -0.18, 0]}
          opacity={0.32}
          scale={13}
          blur={2.6}
          far={4}
          frames={1}
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={HOME_TARGET.toArray()}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
          maxPolarAngle={Math.PI / 2.05}
          // Damping is deliberately off. With it on, OrbitControls keeps
          // leftover rotation momentum in its internal state and re-applies it
          // on the next update() — which threw the Home button off every time.
          enableDamping={false}
        />
      </Canvas>

      <Hud
        mode={mode}
        onModeChange={setMode}
        onHome={goHome}
        onZoomIn={() => dolly(0.8)}
        onZoomOut={() => dolly(1.25)}
      />
    </div>
  );
}
