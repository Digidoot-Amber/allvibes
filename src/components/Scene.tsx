"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import {
  HOME_CAMERA,
  HOME_TARGET,
  MAX_DISTANCE,
  MIN_DISTANCE,
} from "@/world/constants";
import { elements } from "@/world/elements";
import Hud, { type DragMode } from "./Hud";

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

        <hemisphereLight args={["#ffffff", "#ddd6c6", 1.1]} />
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 8, 4]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
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
