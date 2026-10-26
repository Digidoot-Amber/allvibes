"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ISLAND_RADIUS,
  LAND_LEVEL,
  POND_RADIUS,
  WATER_LEVEL,
} from "../constants";
import { makeRng, pick, range } from "../rng";

/**
 * The pond, tree, garden and waterfall.
 *
 * This is the starting element of the world — it sets the ground plane and the
 * 0,0 datum that everything else is placed against. Please don't move it.
 */

const PALETTE = {
  earth: "#a3937b",
  sand: "#c9b793",
  grass: "#5d9c42",
  grassDark: "#3f7a2e",
  water: "#2ec4c6",
  bark: "#3a2a1e",
  barkLight: "#5a4330",
  glow: "#4fe8e0",
  leaf: ["#3e7d2e", "#56a13c", "#6fbf4a", "#2f6b24"],
  bloom: ["#e2574c", "#f2a03d", "#9b59b6", "#f4d35e", "#e86aa6"],
  stone: ["#9a9a92", "#7e7e78", "#b0aea4"],
  capShroom: ["#7b5bd6", "#4fb3d9", "#e2574c"],
} as const;

/** The island: one revolved profile, pond depression included. */
function Island() {
  const points = useMemo(
    () =>
      [
        [0.001, 0],
        [POND_RADIUS, 0],
        [1.75, 0.3],
        [1.95, LAND_LEVEL],
        [3.8, LAND_LEVEL],
        [ISLAND_RADIUS, 0.52],
        [ISLAND_RADIUS, 0.2],
        [3.8, -0.08],
        [0.001, -0.16],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );

  return (
    <group>
      <mesh receiveShadow>
        <latheGeometry args={[points, 64]} />
        <meshStandardMaterial
          color={PALETTE.earth}
          side={THREE.DoubleSide}
          roughness={0.95}
        />
      </mesh>

      {/* Sandy pond floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[POND_RADIUS - 0.02, 48]} />
        <meshStandardMaterial color={PALETTE.sand} roughness={1} />
      </mesh>

      {/* Grass on the flat land ring */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, LAND_LEVEL + 0.004, 0]}
        receiveShadow
      >
        <ringGeometry args={[1.96, 3.79, 64]} />
        <meshStandardMaterial color={PALETTE.grass} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** The water surface, with a slow breathing motion. */
function Water() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y =
      WATER_LEVEL + Math.sin(clock.elapsedTime * 0.8) * 0.012;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL, 0]}>
      <circleGeometry args={[1.8, 48]} />
      <meshStandardMaterial
        color={PALETTE.water}
        transparent
        opacity={0.78}
        roughness={0.12}
        metalness={0.1}
      />
    </mesh>
  );
}

/** A ring of stones around the lip of the pond. */
function PondRim() {
  const stones = useMemo(() => {
    const rng = makeRng(555);
    return Array.from({ length: 26 }, (_, i) => {
      const angle = (i / 26) * Math.PI * 2 + range(rng, -0.05, 0.05);
      const dist = range(rng, 1.86, 1.99);
      return {
        pos: [
          Math.cos(angle) * dist,
          LAND_LEVEL - range(rng, 0.02, 0.07),
          Math.sin(angle) * dist,
        ] as [number, number, number],
        s: range(rng, 0.09, 0.17),
        rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI] as [
          number,
          number,
          number,
        ],
        color: pick(rng, PALETTE.stone),
      };
    });
  }, []);

  return (
    <group>
      {stones.map((s, i) => (
        <mesh key={i} position={s.pos} scale={s.s} rotation={s.rot} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={s.color} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** A few lily pads floating on the pond. */
function LilyPads() {
  const pads = useMemo(() => {
    const rng = makeRng(99);
    return Array.from({ length: 5 }, () => {
      const angle = rng() * Math.PI * 2;
      const dist = range(rng, 0.5, 1.35);
      return {
        pos: [
          Math.cos(angle) * dist,
          WATER_LEVEL + 0.02,
          Math.sin(angle) * dist,
        ] as [number, number, number],
        scale: range(rng, 0.13, 0.22),
        rot: rng() * Math.PI,
      };
    });
  }, []);

  return (
    <group>
      {pads.map((p, i) => (
        <mesh
          key={i}
          position={p.pos}
          rotation={[-Math.PI / 2, 0, p.rot]}
          scale={p.scale}
        >
          <circleGeometry args={[1, 16, 0.5, Math.PI * 1.82]} />
          <meshStandardMaterial
            color={PALETTE.grassDark}
            side={THREE.DoubleSide}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The tree: a tapered trunk with a clustered canopy and glowing veins. */
function Tree({ position }: { position: [number, number, number] }) {
  const trunkPoints = useMemo(
    () =>
      [
        [0.34, 0],
        [0.22, 0.25],
        [0.17, 0.7],
        [0.15, 1.2],
        [0.13, 1.55],
        [0.001, 1.62],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );

  const canopy = useMemo(() => {
    const rng = makeRng(7);
    return Array.from({ length: 7 }, () => ({
      pos: [
        range(rng, -0.62, 0.62),
        range(rng, 1.55, 2.15),
        range(rng, -0.62, 0.62),
      ] as [number, number, number],
      r: range(rng, 0.42, 0.66),
      color: pick(rng, PALETTE.leaf),
    }));
  }, []);

  const veins = useMemo(() => {
    const rng = makeRng(23);
    return Array.from({ length: 9 }, () => {
      const angle = rng() * Math.PI * 2;
      const h = range(rng, 0.2, 1.4);
      const r = 0.17;
      return {
        pos: [Math.cos(angle) * r, h, Math.sin(angle) * r] as [
          number,
          number,
          number,
        ],
        s: range(rng, 0.03, 0.06),
      };
    });
  }, []);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[trunkPoints, 20]} />
        <meshStandardMaterial
          color={PALETTE.bark}
          side={THREE.DoubleSide}
          roughness={0.95}
        />
      </mesh>

      {/* Glowing veins, echoing the reference art */}
      {veins.map((v, i) => (
        <mesh key={i} position={v.pos} scale={v.s}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color={PALETTE.glow}
            emissive={PALETTE.glow}
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      ))}

      {canopy.map((c, i) => (
        <mesh key={i} position={c.pos} castShadow>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color={c.color} flatShading roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Rocks with water running down into the pond. */
function Waterfall({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const dropsRef = useRef<THREE.Group>(null);

  const rocks = useMemo(() => {
    const rng = makeRng(42);
    return Array.from({ length: 7 }, (_, i) => ({
      pos: [
        range(rng, -0.42, 0.42),
        0.06 + i * 0.12,
        range(rng, -0.3, 0.26),
      ] as [number, number, number],
      s: range(rng, 0.17, 0.33),
      color: pick(rng, PALETTE.stone),
      rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI] as [
        number,
        number,
        number,
      ],
    }));
  }, []);

  const drops = useMemo(() => {
    const rng = makeRng(13);
    return Array.from({ length: 7 }, () => ({
      x: range(rng, -0.13, 0.13),
      z: range(rng, -0.08, 0.08),
      offset: rng(),
      s: range(rng, 0.035, 0.07),
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!dropsRef.current) return;
    const t = clock.elapsedTime;
    dropsRef.current.children.forEach((child, i) => {
      const d = drops[i];
      const p = (t * 0.6 + d.offset) % 1;
      child.position.y = 0.92 - p * 0.92;
      const s = d.s * (1 - p * 0.35);
      child.scale.setScalar(s);
    });
  });

  return (
    <group position={position} rotation={rotation}>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.pos} scale={r.s} rotation={r.rot} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={r.color} flatShading roughness={1} />
        </mesh>
      ))}

      {/* The sheet of falling water, running down into the pond */}
      <mesh position={[0, 0.46, 0.17]} rotation={[0.14, 0, 0]}>
        <planeGeometry args={[0.32, 0.98]} />
        <meshStandardMaterial
          color={PALETTE.water}
          transparent
          opacity={0.55}
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={dropsRef}>
        {drops.map((d, i) => (
          <mesh key={i} position={[d.x, 0.5, d.z + 0.16]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial
              color="#bdf3f4"
              transparent
              opacity={0.85}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Flowers, mushrooms, stones and tufts scattered over the land ring. */
function Garden() {
  const items = useMemo(() => {
    const rng = makeRng(2026);
    return Array.from({ length: 46 }, () => {
      const angle = rng() * Math.PI * 2;
      const dist = range(rng, 2.12, 3.66);
      const kind = pick(rng, ["bloom", "shroom", "stone", "tuft"] as const);
      return {
        pos: [Math.cos(angle) * dist, LAND_LEVEL, Math.sin(angle) * dist] as [
          number,
          number,
          number,
        ],
        kind,
        s: range(rng, 0.7, 1.35),
        rot: rng() * Math.PI * 2,
        bloom: pick(rng, PALETTE.bloom),
        shroom: pick(rng, PALETTE.capShroom),
        stone: pick(rng, PALETTE.stone),
        leaf: pick(rng, PALETTE.leaf),
      };
    });
  }, []);

  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={[0, it.rot, 0]} scale={it.s}>
          {it.kind === "bloom" && (
            <>
              <mesh position={[0, 0.11, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.016, 0.22, 5]} />
                <meshStandardMaterial color={PALETTE.grassDark} />
              </mesh>
              <mesh position={[0, 0.24, 0]} castShadow>
                <icosahedronGeometry args={[0.062, 0]} />
                <meshStandardMaterial color={it.bloom} flatShading />
              </mesh>
            </>
          )}

          {it.kind === "shroom" && (
            <>
              <mesh position={[0, 0.06, 0]} castShadow>
                <cylinderGeometry args={[0.026, 0.034, 0.12, 6]} />
                <meshStandardMaterial color="#e8e2d4" />
              </mesh>
              <mesh position={[0, 0.13, 0]} castShadow>
                <sphereGeometry args={[0.075, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                  color={it.shroom}
                  emissive={it.shroom}
                  emissiveIntensity={0.35}
                />
              </mesh>
            </>
          )}

          {it.kind === "stone" && (
            <mesh position={[0, 0.05, 0]} castShadow>
              <dodecahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial color={it.stone} flatShading roughness={1} />
            </mesh>
          )}

          {it.kind === "tuft" && (
            <mesh position={[0, 0.08, 0]} castShadow>
              <coneGeometry args={[0.07, 0.17, 5]} />
              <meshStandardMaterial color={it.leaf} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export default function PondGarden() {
  return (
    <group>
      <Island />
      <PondRim />
      <Water />
      <LilyPads />
      <Tree position={[-1.45, LAND_LEVEL, -1.9]} />
      <Waterfall
        position={[1.38, WATER_LEVEL - 0.02, -1.22]}
        rotation={[0, Math.atan2(-1.38, 1.22), 0]}
      />
      <Garden />
    </group>
  );
}
