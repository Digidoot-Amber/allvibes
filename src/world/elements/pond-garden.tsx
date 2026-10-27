"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import * as THREE from "three";
import {
  ISLAND_RADIUS,
  LAND_LEVEL,
  POND_RADIUS,
  WATER_LEVEL,
} from "../constants";
import {
  arcGeometry,
  bladeGeometry,
  fallenLeafGeometry,
  profile,
  spiralGeometry,
} from "../geometry";
import { makeRng, pick, range } from "../rng";

/**
 * The pond, tree, garden and waterfall.
 *
 * This is the starting element of the world — it sets the ground plane and the
 * 0,0 datum that everything else is placed against. Please don't move it.
 *
 * How it is built: the big, deliberate things (tree, waterfall, the hero
 * plants) are placed by hand so the view from the Home camera is composed.
 * Everything small and repeated — fallen leaves, pebbles, grass, blooms — is
 * scattered with the seeded random generator and drawn with <Instances>, which
 * means a hundred pebbles cost the graphics card about as much as one.
 */

const PALETTE = {
  earth: "#8d7f66",
  earthDeep: "#6b5f4c",
  sand: "#c3b08c",
  moss: "#4f9134",
  mossDeep: "#2f6122",
  mossLight: "#79bb4c",
  water: "#21c6d4",
  waterPale: "#a6f0f2",
  foam: "#eafcfc",
  bark: "#2c2018",
  barkLight: "#4b3729",
  glow: "#39e9de",
  leaf: ["#2f6b24", "#3e7d2e", "#56a13c", "#6fbf4a", "#88cf5c"],
  leafDeep: ["#1f4a1a", "#2a5c20", "#356f2a"],
  pod: ["#7d8e5b", "#8f9c64", "#6c7c4f", "#9caa70"],
  podTip: ["#5d3c6d", "#7d4b7c", "#8e4b3b"],
  bloom: ["#f4622d", "#f28c28", "#e23b2e", "#f6c445", "#e8609b", "#8a5bd6"],
  stone: ["#9a9a92", "#86867e", "#b2b0a6", "#74746d"],
  shroomCool: ["#49b6e8", "#3f8fd6", "#5bd0e0"],
  shroomWarm: ["#8a5bd6", "#a65bd6", "#6f4ad0"],
  litter: ["#e8622d", "#f2913a", "#d8452c", "#f4b63f", "#c4572a"],
} as const;

/** Where the tree stands. Everything else is composed around it. */
const TREE_POS: [number, number, number] = [-0.95, LAND_LEVEL, -2.1];

/**
 * How high the ground is at a given distance from the centre.
 *
 * The land is flat out to 3.5 and then rolls over towards the rim. Anything
 * placed past 3.5 at a flat LAND_LEVEL floats in mid-air, so follow this
 * instead. The numbers match the island profile below — change both together.
 */
function groundY(dist: number) {
  if (dist <= 3.5) return LAND_LEVEL;
  if (dist >= 4) return 0.26;
  if (dist <= 3.86) return LAND_LEVEL + ((dist - 3.5) / 0.36) * (0.5 - LAND_LEVEL);
  return 0.5 + ((dist - 3.86) / 0.14) * (0.26 - 0.5);
}

/** A point on the land ring. 0° is +X; the camera looks in from ~50°. */
function onLand(deg: number, dist: number, y?: number): [number, number, number] {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * dist, y ?? groundY(dist), Math.sin(a) * dist];
}

/**
 * A random distance that spreads things EVENLY across the ring.
 *
 * Picking a plain random number between the inner and outer edge looks wrong:
 * the outer ring is far bigger in area, so it ends up looking bald while the
 * inside is crowded. Taking the square root fixes it.
 */
function ringDist(rng: () => number, inner: number, outer: number) {
  return Math.sqrt(inner * inner + rng() * (outer * outer - inner * inner));
}

/* ------------------------------------------------------------------ *
 * Shared shapes. Built once, reused by every mesh that needs them.
 * ------------------------------------------------------------------ */

const BLADE = bladeGeometry({ length: 1, width: 0.34, curve: 0.34 });
const PETAL = bladeGeometry({ length: 1, width: 0.52, curve: 0.46, channel: 0.62 });
const GRASS = bladeGeometry({ length: 1, width: 0.1, curve: 0.5, channel: 0.5 });
const FALLEN_LEAF = fallenLeafGeometry(1, 5);

/* ------------------------------------------------------------------ *
 * The island
 * ------------------------------------------------------------------ */

/** The island: one revolved profile, pond depression included. */
function Island() {
  const points = useMemo(
    () =>
      profile([
        [0.001, 0],
        [POND_RADIUS, 0],
        [1.72, 0.26],
        [1.95, LAND_LEVEL],
        [3.5, LAND_LEVEL],
        [3.86, 0.5],
        [ISLAND_RADIUS, 0.26],
        [3.95, 0.0],
        [3.6, -0.22],
        [2.2, -0.36],
        [0.001, -0.42],
      ]),
    [],
  );

  // A thin skin of moss that lies on the flat ring and rolls over the edge.
  const mossSkin = useMemo(
    () =>
      profile([
        [1.96, LAND_LEVEL + 0.006],
        [3.5, LAND_LEVEL + 0.006],
        [3.86, 0.508],
        [ISLAND_RADIUS, 0.268],
        [3.97, 0.12],
      ]),
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

      <mesh receiveShadow>
        <latheGeometry args={[mossSkin, 64]} />
        <meshStandardMaterial
          color={PALETTE.moss}
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>

      {/* Sandy pond floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[POND_RADIUS - 0.02, 48]} />
        <meshStandardMaterial color={PALETTE.sand} roughness={1} />
      </mesh>

      {/* Damp, darker ground where the land meets the water */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, LAND_LEVEL + 0.012, 0]}
        receiveShadow
      >
        <ringGeometry args={[1.96, 2.42, 64]} />
        <meshStandardMaterial color={PALETTE.mossDeep} roughness={1} />
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
    <group>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL, 0]}>
        <circleGeometry args={[1.84, 48]} />
        <meshStandardMaterial
          color={PALETTE.water}
          transparent
          opacity={0.8}
          roughness={0.08}
          metalness={0.15}
        />
      </mesh>

      {/* A paler shelf of shallow water around the edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL - 0.03, 0]}>
        <ringGeometry args={[1.45, 1.84, 48]} />
        <meshStandardMaterial
          color={PALETTE.waterPale}
          transparent
          opacity={0.5}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

/** Flat stones laid around the lip of the pond. */
function CobbleRim() {
  const stones = useMemo(() => {
    const rng = makeRng(555);
    return Array.from({ length: 46 }, (_, i) => {
      const angle = (i / 46) * Math.PI * 2 + range(rng, -0.04, 0.04);
      const dist = range(rng, 1.9, 2.08);
      return {
        pos: [
          Math.cos(angle) * dist,
          LAND_LEVEL - range(rng, 0.0, 0.04),
          Math.sin(angle) * dist,
        ] as [number, number, number],
        scale: [
          range(rng, 0.1, 0.19),
          range(rng, 0.05, 0.09),
          range(rng, 0.1, 0.19),
        ] as [number, number, number],
        rot: [range(rng, -0.2, 0.2), rng() * Math.PI, range(rng, -0.2, 0.2)] as [
          number,
          number,
          number,
        ],
        color: pick(rng, PALETTE.stone),
      };
    });
  }, []);

  return (
    <Instances limit={64} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial flatShading roughness={1} />
      {stones.map((s, i) => (
        <Instance
          key={i}
          position={s.pos}
          scale={s.scale}
          rotation={s.rot}
          color={s.color}
        />
      ))}
    </Instances>
  );
}

/** Bigger mossy rocks sitting around the garden. */
function Boulders() {
  const { rocks, moss } = useMemo(() => {
    const rng = makeRng(808);

    // A few placed on purpose, the rest scattered.
    const placed: { deg: number; dist: number; s: number }[] = [
      { deg: 62, dist: 2.45, s: 0.3 },
      { deg: 118, dist: 2.6, s: 0.22 },
      { deg: 196, dist: 2.5, s: 0.26 },
      { deg: 248, dist: 2.7, s: 0.2 },
      { deg: -42, dist: 2.52, s: 0.27 },
    ];

    const rocks = [
      ...placed,
      ...Array.from({ length: 14 }, () => ({
        deg: rng() * 360,
        dist: range(rng, 2.3, 3.75),
        s: range(rng, 0.09, 0.22),
      })),
    ].map((r) => ({
      pos: onLand(r.deg, r.dist, groundY(r.dist) - r.s * 0.35),
      s: r.s,
      squash: range(rng, 0.6, 0.95),
      rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI] as [
        number,
        number,
        number,
      ],
      color: pick(rng, PALETTE.stone),
    }));

    // Moss caps that sit on top of the larger rocks.
    const moss = rocks
      .filter((r) => r.s > 0.16)
      .map((r) => ({
        pos: [r.pos[0], r.pos[1] + r.s * 0.52, r.pos[2]] as [number, number, number],
        s: r.s * 0.78,
        color: pick(rng, [PALETTE.moss, PALETTE.mossLight, PALETTE.mossDeep]),
      }));

    return { rocks, moss };
  }, []);

  return (
    <group>
      <Instances limit={32} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={1} />
        {rocks.map((r, i) => (
          <Instance
            key={i}
            position={r.pos}
            scale={[r.s, r.s * r.squash, r.s]}
            rotation={r.rot}
            color={r.color}
          />
        ))}
      </Instances>

      <Instances limit={16} castShadow>
        <sphereGeometry args={[1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial flatShading roughness={0.95} />
        {moss.map((m, i) => (
          <Instance
            key={i}
            position={m.pos}
            scale={[m.s, m.s * 0.42, m.s]}
            color={m.color}
          />
        ))}
      </Instances>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The tree
 * ------------------------------------------------------------------ */

/** The tree: a gnarled trunk, glowing veins and a broad two-lobed canopy. */
function Tree({ position }: { position: [number, number, number] }) {
  const trunkPoints = useMemo(
    () =>
      profile([
        [0.58, 0],
        [0.38, 0.2],
        [0.3, 0.5],
        [0.27, 0.95],
        [0.24, 1.35],
        [0.22, 1.7],
        [0.001, 1.8],
      ]),
    [],
  );

  // Big limbs sweeping out of the top of the trunk.
  const limbs = useMemo(
    () => [
      arcGeometry([0.1, 1.25, 0], [1.15, 1.95, 0.35], 0.45, 0.1),
      arcGeometry([-0.08, 1.35, 0.05], [-0.95, 2.15, -0.3], 0.4, 0.09),
      arcGeometry([0, 1.5, -0.08], [0.35, 2.35, -0.75], 0.3, 0.075),
    ],
    [],
  );

  // Roots flaring out of the base and gripping the ground.
  const rootFlares = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        return arcGeometry(
          [Math.cos(a) * 0.08, 0.34, Math.sin(a) * 0.08],
          [Math.cos(a) * 0.72, 0.02, Math.sin(a) * 0.72],
          0.12,
          0.055,
        );
      }),
    [],
  );

  // These have to sit just OUTSIDE the trunk or they vanish inside it. The
  // trunk is about 0.30 wide at y=0.5 and 0.22 at the top, so the spirals
  // start a touch wider than that and taper at the same rate.
  const veins = useMemo(
    () => [
      spiralGeometry({ height: 1.3, radius: 0.325, turns: 0.9, thickness: 0.019, phase: 0.4, taper: 0.26 }),
      spiralGeometry({ height: 1.18, radius: 0.318, turns: -0.75, thickness: 0.015, phase: 2.6, taper: 0.24 }),
      spiralGeometry({ height: 1.0, radius: 0.315, turns: 0.62, thickness: 0.013, phase: 4.4, taper: 0.22 }),
    ],
    [],
  );

  // Two canopy lobes, like the reference: a big one and a smaller shoulder.
  const canopy = useMemo(() => {
    const rng = makeRng(7);
    const lobe = (
      centre: [number, number, number],
      spread: number,
      count: number,
      min: number,
      max: number,
    ) =>
      Array.from({ length: count }, () => ({
        pos: [
          centre[0] + range(rng, -spread, spread),
          centre[1] + range(rng, -spread * 0.45, spread * 0.45),
          centre[2] + range(rng, -spread, spread),
        ] as [number, number, number],
        r: range(rng, min, max),
        color: pick(rng, PALETTE.leaf),
      }));

    return [
      ...lobe([-0.1, 2.52, -0.05], 0.84, 11, 0.52, 0.82),
      ...lobe([1.3, 2.08, 0.35], 0.5, 6, 0.34, 0.56),
      ...lobe([-1.15, 2.32, -0.4], 0.46, 5, 0.3, 0.5),
    ];
  }, []);

  // Individual leaves dressing the outside of the canopy.
  const leaves = useMemo(() => {
    const rng = makeRng(311);
    return canopy.flatMap((blob) =>
      Array.from({ length: 7 }, () => {
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(range(rng, -0.35, 1));
        const r = blob.r * 0.96;
        return {
          pos: [
            blob.pos[0] + Math.sin(phi) * Math.cos(theta) * r,
            blob.pos[1] + Math.cos(phi) * r,
            blob.pos[2] + Math.sin(phi) * Math.sin(theta) * r,
          ] as [number, number, number],
          rot: [range(rng, -1.4, 0.4), rng() * Math.PI * 2, range(rng, -0.8, 0.8)] as [
            number,
            number,
            number,
          ],
          s: range(rng, 0.24, 0.42),
          color: pick(rng, PALETTE.leaf),
        };
      }),
    );
  }, [canopy]);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[trunkPoints, 16]} />
        <meshStandardMaterial
          color={PALETTE.bark}
          side={THREE.DoubleSide}
          roughness={0.95}
        />
      </mesh>

      {[...limbs, ...rootFlares].map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial color={PALETTE.bark} roughness={0.95} />
        </mesh>
      ))}

      {/* Glowing veins winding up the bark, echoing the reference art */}
      {veins.map((geo, i) => (
        <mesh key={i} geometry={geo} position={[0, 0.45, 0]}>
          <meshStandardMaterial
            color={PALETTE.glow}
            emissive={PALETTE.glow}
            emissiveIntensity={2.4}
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

      <Instances limit={200} castShadow>
        <primitive object={BLADE} attach="geometry" />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.72} />
        {leaves.map((l, i) => (
          <Instance
            key={i}
            position={l.pos}
            rotation={l.rot}
            scale={l.s}
            color={l.color}
          />
        ))}
      </Instances>
    </group>
  );
}

/** Dark arches of root and vine sweeping around behind the tree. */
function Roots() {
  const arcs = useMemo(
    () => [
      arcGeometry([-2.55, LAND_LEVEL, -1.5], [-0.35, LAND_LEVEL + 0.5, -2.75], 1.15, 0.075),
      arcGeometry([-2.05, LAND_LEVEL, -2.5], [0.5, LAND_LEVEL, -2.6], 0.85, 0.06),
      arcGeometry([-1.6, LAND_LEVEL, -3.1], [-1.9, LAND_LEVEL + 0.3, -1.25], 0.72, 0.05),
    ],
    [],
  );

  return (
    <group>
      {arcs.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow>
          <meshStandardMaterial color={PALETTE.bark} roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The waterfall
 * ------------------------------------------------------------------ */

/** A rocky cascade running down into the pond. */
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
    return Array.from({ length: 13 }, (_, i) => ({
      pos: [
        range(rng, -0.52, 0.52),
        0.04 + (i % 7) * 0.13,
        range(rng, -0.38, 0.3),
      ] as [number, number, number],
      s: range(rng, 0.16, 0.34),
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
    return Array.from({ length: 12 }, () => ({
      x: range(rng, -0.16, 0.16),
      z: range(rng, -0.08, 0.08),
      offset: rng(),
      s: range(rng, 0.03, 0.068),
    }));
  }, []);

  const foam = useMemo(() => {
    const rng = makeRng(77);
    return Array.from({ length: 9 }, () => ({
      pos: [range(rng, -0.32, 0.32), range(rng, -0.02, 0.06), range(rng, 0.4, 0.78)] as [
        number,
        number,
        number,
      ],
      s: range(rng, 0.05, 0.12),
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!dropsRef.current) return;
    const t = clock.elapsedTime;
    dropsRef.current.children.forEach((child, i) => {
      const d = drops[i];
      const p = (t * 0.6 + d.offset) % 1;
      child.position.y = 0.95 - p * 0.95;
      child.scale.setScalar(d.s * (1 - p * 0.35));
    });
  });

  return (
    <group position={position} rotation={rotation}>
      <Instances limit={20} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={1} />
        {rocks.map((r, i) => (
          <Instance
            key={i}
            position={r.pos}
            scale={r.s}
            rotation={r.rot}
            color={r.color}
          />
        ))}
      </Instances>

      {/* Three sheets of falling water, stepping down into the pond */}
      {[
        { y: 0.82, z: 0.1, w: 0.34, h: 0.52 },
        { y: 0.48, z: 0.3, w: 0.44, h: 0.5 },
        { y: 0.16, z: 0.52, w: 0.54, h: 0.44 },
      ].map((sheet, i) => (
        <mesh key={i} position={[0, sheet.y, sheet.z]} rotation={[0.26, 0, 0]}>
          <planeGeometry args={[sheet.w, sheet.h]} />
          <meshStandardMaterial
            color={PALETTE.foam}
            emissive={PALETTE.waterPale}
            emissiveIntensity={0.35}
            transparent
            opacity={0.88}
            roughness={0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <group ref={dropsRef}>
        {drops.map((d, i) => (
          <mesh key={i} position={[d.x, 0.5, d.z + 0.16]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial
              color={PALETTE.foam}
              transparent
              opacity={0.85}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Froth where it lands */}
      <Instances limit={12}>
        <sphereGeometry args={[1, 7, 6]} />
        <meshStandardMaterial
          color={PALETTE.foam}
          transparent
          opacity={0.72}
          roughness={0.3}
        />
        {foam.map((f, i) => (
          <Instance key={i} position={f.pos} scale={[f.s, f.s * 0.5, f.s]} />
        ))}
      </Instances>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The planting
 * ------------------------------------------------------------------ */

/** A fat layered bud — the big sculptural plants in the reference. */
function Pod({
  position,
  scale,
  spin,
  body,
  tip,
}: {
  position: [number, number, number];
  scale: number;
  spin: number;
  body: string;
  tip: string;
}) {
  const outer = 7;
  const inner = 5;

  return (
    <group position={position} rotation={[0, spin, 0]} scale={scale}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.085, 0.2, 7]} />
        <meshStandardMaterial color={PALETTE.mossDeep} roughness={0.9} />
      </mesh>

      {/* Outer ring of petals, leaning out */}
      {Array.from({ length: outer }, (_, i) => {
        const a = (i / outer) * Math.PI * 2;
        return (
          <mesh
            key={`o${i}`}
            geometry={PETAL}
            position={[Math.cos(a) * 0.07, 0.17, Math.sin(a) * 0.07]}
            rotation={[0.26, -a + Math.PI / 2, 0]}
            scale={[0.92, 0.82, 0.92]}
            castShadow
          >
            <meshStandardMaterial
              color={body}
              side={THREE.DoubleSide}
              roughness={0.78}
            />
          </mesh>
        );
      })}

      {/* Middle ring, standing up straighter */}
      {Array.from({ length: inner }, (_, i) => {
        const a = (i / inner) * Math.PI * 2 + 0.4;
        return (
          <mesh
            key={`i${i}`}
            geometry={PETAL}
            position={[Math.cos(a) * 0.04, 0.27, Math.sin(a) * 0.04]}
            rotation={[0.1, -a + Math.PI / 2, 0]}
            scale={[0.6, 0.66, 0.6]}
            castShadow
          >
            <meshStandardMaterial
              color={body}
              side={THREE.DoubleSide}
              roughness={0.72}
            />
          </mesh>
        );
      })}

      {/* Just the crown is coloured, the way the reference pods are tipped */}
      {Array.from({ length: 3 }, (_, i) => {
        const a = (i / 3) * Math.PI * 2 + 1.1;
        return (
          <mesh
            key={`t${i}`}
            geometry={PETAL}
            position={[Math.cos(a) * 0.02, 0.5, Math.sin(a) * 0.02]}
            rotation={[0.06, -a + Math.PI / 2, 0]}
            scale={[0.34, 0.38, 0.34]}
          >
            <meshStandardMaterial
              color={tip}
              side={THREE.DoubleSide}
              roughness={0.66}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** A clump of tall broad leaves fanning out of the ground. */
function LeafClump({
  position,
  spin,
  scale,
  colors,
}: {
  position: [number, number, number];
  spin: number;
  scale: number;
  colors: readonly string[];
}) {
  const blades = useMemo(() => {
    const rng = makeRng(Math.round(position[0] * 97 + position[2] * 31) + 500);
    return Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * Math.PI * 2 + range(rng, -0.25, 0.25),
      lean: range(rng, 0.45, 0.95),
      len: range(rng, 0.52, 0.95),
      wide: range(rng, 0.5, 0.78),
      color: pick(rng, colors),
    }));
  }, [position, colors]);

  return (
    <group position={position} rotation={[0, spin, 0]} scale={scale}>
      {blades.map((b, i) => (
        <group key={i} rotation={[0, -b.a, 0]}>
          <mesh
            geometry={BLADE}
            rotation={[b.lean, 0, 0]}
            scale={[b.wide, b.len, b.wide]}
            castShadow
          >
            <meshStandardMaterial
              color={b.color}
              side={THREE.DoubleSide}
              roughness={0.7}
            />
          </mesh>
          {/* A pale midrib, so the leaves read as striped */}
          <mesh
            geometry={BLADE}
            rotation={[b.lean, 0, 0]}
            position={[0, 0.004, 0.004]}
            scale={[b.wide * 0.2, b.len * 0.95, b.wide * 0.2]}
          >
            <meshStandardMaterial
              color={PALETTE.mossLight}
              side={THREE.DoubleSide}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A spiky rosette, low and wide. */
function Rosette({
  position,
  spin,
  scale,
  color,
}: {
  position: [number, number, number];
  spin: number;
  scale: number;
  color: string;
}) {
  const count = 9;

  return (
    <group position={position} rotation={[0, spin, 0]} scale={scale}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, -a, 0]}>
            <mesh
              geometry={BLADE}
              rotation={[1.15, 0, 0]}
              scale={[0.3, 0.72, 0.3]}
              castShadow
            >
              <meshStandardMaterial
                color={color}
                side={THREE.DoubleSide}
                roughness={0.68}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** The hand-placed hero plants. */
function HeroPlanting() {
  const pods = useMemo(() => {
    const rng = makeRng(1201);
    return [
      { deg: 150, dist: 3.0, s: 1.0 },
      { deg: 168, dist: 2.7, s: 0.76 },
      { deg: 131, dist: 2.84, s: 0.62 },
      { deg: 202, dist: 2.95, s: 0.84 },
      { deg: 12, dist: 2.98, s: 0.94 },
      { deg: -16, dist: 2.76, s: 0.7 },
      { deg: 41, dist: 3.12, s: 0.58 },
      { deg: 290, dist: 3.05, s: 0.72 },
      { deg: 68, dist: 2.66, s: 0.8 },
      { deg: 249, dist: 2.7, s: 0.68 },
      { deg: 159, dist: 3.62, s: 0.64 },
      { deg: -58, dist: 3.48, s: 0.74 },
      { deg: 96, dist: 3.56, s: 0.6 },
      { deg: 62, dist: 3.74, s: 0.66 },
      { deg: 24, dist: 3.68, s: 0.58 },
      { deg: 112, dist: 3.8, s: 0.56 },
      { deg: 272, dist: 3.82, s: 0.6 },
      { deg: 342, dist: 3.74, s: 0.58 },
    ].map((p) => ({
      position: onLand(p.deg, p.dist),
      scale: p.s * 1.06,
      spin: rng() * Math.PI * 2,
      body: pick(rng, PALETTE.pod),
      tip: pick(rng, PALETTE.podTip),
    }));
  }, []);

  const clumps = useMemo(() => {
    const rng = makeRng(1310);
    return [
      { deg: -36, dist: 3.08, s: 1.0 },
      { deg: 70, dist: 3.12, s: 0.86 },
      { deg: 186, dist: 3.22, s: 0.92 },
      { deg: 110, dist: 3.1, s: 0.74 },
      { deg: 236, dist: 3.15, s: 0.8 },
      { deg: 322, dist: 2.95, s: 0.7 },
      { deg: 8, dist: 3.58, s: 0.82 },
      { deg: 146, dist: 3.52, s: 0.78 },
      { deg: 286, dist: 3.42, s: 0.74 },
      { deg: 46, dist: 2.62, s: 0.68 },
      { deg: 206, dist: 2.64, s: 0.64 },
      { deg: 56, dist: 3.66, s: 0.76 },
      { deg: 88, dist: 3.8, s: 0.68 },
      { deg: 130, dist: 3.78, s: 0.7 },
      { deg: 258, dist: 3.7, s: 0.72 },
      { deg: 14, dist: 3.82, s: 0.66 },
      { deg: 300, dist: 3.76, s: 0.7 },
    ].map((c) => ({
      position: onLand(c.deg, c.dist),
      spin: rng() * Math.PI * 2,
      scale: c.s * 1.12,
      colors: rng() > 0.5 ? PALETTE.leaf : PALETTE.leafDeep,
    }));
  }, []);

  const rosettes = useMemo(() => {
    const rng = makeRng(1480);
    return [
      { deg: 26, dist: 2.52, s: 0.72 },
      { deg: 96, dist: 2.78, s: 0.6 },
      { deg: 214, dist: 2.6, s: 0.66 },
      { deg: 318, dist: 2.66, s: 0.56 },
      { deg: 140, dist: 3.74, s: 0.58 },
      { deg: -70, dist: 2.92, s: 0.62 },
      { deg: 174, dist: 2.46, s: 0.54 },
      { deg: 38, dist: 3.8, s: 0.6 },
      { deg: 66, dist: 3.88, s: 0.52 },
      { deg: 218, dist: 3.84, s: 0.54 },
    ].map((r) => ({
      position: onLand(r.deg, r.dist),
      spin: rng() * Math.PI * 2,
      scale: r.s * 1.1,
      color: pick(rng, PALETTE.leafDeep),
    }));
  }, []);

  return (
    <group>
      {pods.map((p, i) => (
        <Pod key={`pod${i}`} {...p} />
      ))}
      {clumps.map((c, i) => (
        <LeafClump key={`clump${i}`} {...c} />
      ))}
      {rosettes.map((r, i) => (
        <Rosette key={`ros${i}`} {...r} />
      ))}
    </group>
  );
}

/** Small flowers on stems, scattered all round the ring. */
function Blooms() {
  const { stems, heads } = useMemo(() => {
    const rng = makeRng(2026);
    const items = Array.from({ length: 94 }, () => {
      const deg = rng() * 360;
      const dist = ringDist(rng, 2.2, 3.78);
      const h = range(rng, 0.16, 0.36);
      const color = pick(rng, PALETTE.bloom);
      const base = onLand(deg, dist);
      return { base, h, color, lean: range(rng, -0.16, 0.16), spin: rng() * Math.PI };
    });

    const stems = items.map((it) => ({
      pos: [it.base[0], it.base[1] + it.h / 2, it.base[2]] as [number, number, number],
      scale: [1, it.h, 1] as [number, number, number],
      rot: [it.lean, 0, it.lean] as [number, number, number],
    }));

    const heads = items.map((it) => ({
      pos: [it.base[0], it.base[1] + it.h, it.base[2]] as [number, number, number],
      s: range(rng, 0.045, 0.085),
      rot: [0, it.spin, 0] as [number, number, number],
      color: it.color,
    }));

    return { stems, heads };
  }, []);

  return (
    <group>
      <Instances limit={110}>
        <cylinderGeometry args={[0.009, 0.013, 1, 5]} />
        <meshStandardMaterial color={PALETTE.mossDeep} roughness={0.9} />
        {stems.map((s, i) => (
          <Instance key={i} position={s.pos} scale={s.scale} rotation={s.rot} />
        ))}
      </Instances>

      <Instances limit={110} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={0.6} />
        {heads.map((h, i) => (
          <Instance
            key={i}
            position={h.pos}
            scale={h.s}
            rotation={h.rot}
            color={h.color}
          />
        ))}
      </Instances>
    </group>
  );
}

/** Clusters of glowing mushrooms, cool and warm. */
function Mushrooms() {
  const groups = useMemo(() => {
    const rng = makeRng(3003);
    const spots = [
      { deg: 134, dist: 2.52, cool: true },
      { deg: 178, dist: 3.4, cool: false },
      { deg: 54, dist: 3.38, cool: true },
      { deg: -8, dist: 2.42, cool: false },
      { deg: 252, dist: 3.3, cool: true },
      { deg: 300, dist: 2.45, cool: false },
      { deg: 86, dist: 2.3, cool: true },
    ];

    const cool: ReturnType<typeof one>[] = [];
    const warm: ReturnType<typeof one>[] = [];

    function one(base: [number, number, number]) {
      const h = range(rng, 0.09, 0.2);
      const r = range(rng, 0.055, 0.11);
      const off = () => range(rng, -0.16, 0.16);
      const pos: [number, number, number] = [base[0] + off(), base[1], base[2] + off()];
      return { pos, h, r };
    }

    for (const spot of spots) {
      const base = onLand(spot.deg, spot.dist);
      const n = Math.round(range(rng, 2, 4));
      for (let i = 0; i < n; i++) {
        (spot.cool ? cool : warm).push(one(base));
      }
    }

    return { cool, warm, rng };
  }, []);

  const caps = (
    items: { pos: [number, number, number]; h: number; r: number }[],
    colors: readonly string[],
    glow: string,
  ) => (
    <group>
      <Instances limit={40}>
        <cylinderGeometry args={[0.018, 0.026, 1, 6]} />
        <meshStandardMaterial color="#efe9da" roughness={0.85} />
        {items.map((m, i) => (
          <Instance
            key={i}
            position={[m.pos[0], m.pos[1] + m.h / 2, m.pos[2]]}
            scale={[1, m.h, 1]}
          />
        ))}
      </Instances>

      <Instances limit={40} castShadow>
        <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          emissive={glow}
          emissiveIntensity={0.9}
          roughness={0.5}
        />
        {items.map((m, i) => (
          <Instance
            key={i}
            position={[m.pos[0], m.pos[1] + m.h, m.pos[2]]}
            scale={[m.r, m.r * 0.72, m.r]}
            color={colors[i % colors.length]}
          />
        ))}
      </Instances>
    </group>
  );

  return (
    <group>
      {caps(groups.cool, PALETTE.shroomCool, "#2aa6d8")}
      {caps(groups.warm, PALETTE.shroomWarm, "#7b4ad0")}
    </group>
  );
}

/** Grass, pebbles and fallen leaves covering the ground. */
function GroundCover() {
  const { tufts, pebbles, litter, patches } = useMemo(() => {
    const rng = makeRng(5150);

    const tufts = Array.from({ length: 330 }, () => {
      const base = onLand(rng() * 360, ringDist(rng, 2.06, 3.88));
      return {
        pos: base,
        s: range(rng, 0.14, 0.3),
        h: range(rng, 0.14, 0.34),
        rot: [
          range(rng, -0.42, 0.42),
          rng() * Math.PI * 2,
          range(rng, -0.42, 0.42),
        ] as [number, number, number],
        color: pick(rng, PALETTE.leaf),
      };
    });

    const patches = Array.from({ length: 30 }, () => {
      const base = onLand(rng() * 360, ringDist(rng, 2.15, 3.7));
      return {
        pos: [base[0], base[1] + 0.008, base[2]] as [number, number, number],
        s: range(rng, 0.22, 0.56),
        rot: rng() * Math.PI,
        // Close to the base moss on purpose — enough to break up the flat
        // green, not enough to read as a hole in the ground.
        color: pick(rng, ["#55993a", "#468630", "#5ea33f", "#4a8d33"]),
      };
    });

    const pebbles = Array.from({ length: 95 }, () => {
      const base = onLand(rng() * 360, ringDist(rng, 2.1, 3.84));
      return {
        pos: [base[0], base[1] - 0.01, base[2]] as [number, number, number],
        s: range(rng, 0.022, 0.06),
        rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI] as [
          number,
          number,
          number,
        ],
        color: pick(rng, PALETTE.stone),
      };
    });

    const litter = Array.from({ length: 330 }, () => {
      const base = onLand(rng() * 360, ringDist(rng, 2.0, 3.92));
      return {
        pos: [base[0], base[1] + 0.016, base[2]] as [number, number, number],
        s: range(rng, 0.034, 0.078),
        rot: [
          -Math.PI / 2 + range(rng, -0.22, 0.22),
          rng() * Math.PI * 2,
          range(rng, -0.3, 0.3),
        ] as [number, number, number],
        color: pick(rng, PALETTE.litter),
      };
    });

    return { tufts, pebbles, litter, patches };
  }, []);

  return (
    <group>
      {/* Patches of lighter and darker moss, so the ground isn't one flat green */}
      <Instances limit={40}>
        <circleGeometry args={[1, 12]} />
        <meshStandardMaterial roughness={0.95} />
        {patches.map((p, i) => (
          <Instance
            key={i}
            position={p.pos}
            rotation={[-Math.PI / 2, 0, p.rot]}
            scale={p.s}
            color={p.color}
          />
        ))}
      </Instances>

      <Instances limit={350} castShadow>
        <primitive object={GRASS} attach="geometry" />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.8} />
        {tufts.map((t, i) => (
          <Instance
            key={i}
            position={t.pos}
            scale={[t.s, t.h, t.s]}
            rotation={t.rot}
            color={t.color}
          />
        ))}
      </Instances>

      <Instances limit={110}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={1} />
        {pebbles.map((p, i) => (
          <Instance
            key={i}
            position={p.pos}
            scale={[p.s, p.s * 0.6, p.s]}
            rotation={p.rot}
            color={p.color}
          />
        ))}
      </Instances>

      <Instances limit={350}>
        <primitive object={FALLEN_LEAF} attach="geometry" />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.8} />
        {litter.map((l, i) => (
          <Instance
            key={i}
            position={l.pos}
            scale={l.s}
            rotation={l.rot}
            color={l.color}
          />
        ))}
      </Instances>
    </group>
  );
}

/** Lily pads and a flower floating on the pond. */
function LilyPads() {
  const pads = useMemo(() => {
    const rng = makeRng(99);
    return Array.from({ length: 9 }, () => {
      const angle = rng() * Math.PI * 2;
      const dist = range(rng, 0.45, 1.45);
      return {
        pos: [
          Math.cos(angle) * dist,
          WATER_LEVEL + 0.022,
          Math.sin(angle) * dist,
        ] as [number, number, number],
        scale: range(rng, 0.13, 0.24),
        rot: rng() * Math.PI,
        color: pick(rng, [PALETTE.mossDeep, PALETTE.moss, "#3f7a2e"]),
      };
    });
  }, []);

  const flower = pads[2];

  return (
    <group>
      <Instances limit={12}>
        <circleGeometry args={[1, 16, 0.5, Math.PI * 1.82]} />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.68} />
        {pads.map((p, i) => (
          <Instance
            key={i}
            position={p.pos}
            rotation={[-Math.PI / 2, 0, p.rot]}
            scale={p.scale}
            color={p.color}
          />
        ))}
      </Instances>

      {/* One open water lily */}
      <group position={[flower.pos[0], WATER_LEVEL + 0.04, flower.pos[2]]}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              geometry={PETAL}
              position={[Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03]}
              rotation={[1.05, -a + Math.PI / 2, 0]}
              scale={[0.12, 0.17, 0.12]}
            >
              <meshStandardMaterial
                color="#f6b8d0"
                side={THREE.DoubleSide}
                roughness={0.6}
              />
            </mesh>
          );
        })}
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshStandardMaterial color="#f6d44a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

export default function PondGarden() {
  return (
    <group>
      <Island />
      <CobbleRim />
      <Water />
      <LilyPads />
      <Boulders />
      <Tree position={TREE_POS} />
      <Roots />
      <Waterfall
        position={[1.15, WATER_LEVEL - 0.06, -1.5]}
        rotation={[0, Math.atan2(-1.15, 1.5), 0]}
      />
      <HeroPlanting />
      <Blooms />
      <Mushrooms />
      <GroundCover />
    </group>
  );
}
