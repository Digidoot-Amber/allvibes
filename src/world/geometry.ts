import * as THREE from "three";

/**
 * Shared shapes for building things out of code.
 *
 * These are the awkward shapes — a leaf, a fallen leaf, a spiral, an arch —
 * that are fiddly to work out from scratch. Use them in your own element
 * instead of reinventing them. Everything here is plain maths, so it runs on
 * the server too and won't upset the page load.
 *
 * Build each shape ONCE and share it between meshes. Making a new one on every
 * frame is the usual reason a scene gets slow.
 */

/**
 * A leaf blade: pointed at the tip, curving over as it goes.
 *
 * It stands up along +Y and bends towards -Z, so an un-rotated blade looks
 * like a leaf growing straight up and drooping away from you. Used for leaves,
 * flower petals, and the spiky blades of a rosette.
 */
export function bladeGeometry({
  length = 1,
  width = 0.38,
  /** How far the tip curls over. 0 is a flat blade. */
  curve = 0.35,
  /** How deep the fold is down the middle, like a real leaf. */
  channel = 0.3,
  segments = 12,
} = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.85, length * 0.16, width, length * 0.55, 0, length);
  shape.bezierCurveTo(-width, length * 0.55, -width * 0.85, length * 0.16, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, segments);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = Math.max(0, pos.getY(i) / length);
    pos.setZ(i, -curve * t * t * length + Math.abs(x) * channel * (1 - t));
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * A small many-lobed leaf, flat in the XY plane.
 *
 * Lay these on the ground (rotate -90° on X) for fallen autumn leaves.
 */
export function fallenLeafGeometry(radius = 1, lobes = 5) {
  const shape = new THREE.Shape();
  const steps = lobes * 2;

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.44;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  shape.closePath();
  return new THREE.ShapeGeometry(shape, 1);
}

/**
 * A spiral tube climbing upwards — the glowing veins on the tree trunk.
 *
 * Give it the height and radius of whatever it is wrapping around.
 */
export function spiralGeometry({
  height = 1,
  radius = 0.2,
  turns = 1.2,
  thickness = 0.014,
  phase = 0,
  /** How much narrower the spiral gets at the top. */
  taper = 0.45,
} = {}) {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const angle = phase + t * turns * Math.PI * 2;
    const r = radius * (1 - taper * t);
    points.push(new THREE.Vector3(Math.cos(angle) * r, t * height, Math.sin(angle) * r));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, 56, thickness, 5, false);
}

/**
 * A tube arching from one point to another — roots, vines, fallen branches.
 *
 * `lift` is how high the middle of the arch rises above the straight line
 * between the two ends.
 */
export function arcGeometry(
  from: [number, number, number],
  to: [number, number, number],
  lift = 1,
  thickness = 0.08,
) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);

  const c1 = a.clone().lerp(b, 0.25);
  const mid = a.clone().lerp(b, 0.5);
  const c2 = a.clone().lerp(b, 0.75);
  c1.y += lift * 0.82;
  mid.y += lift;
  c2.y += lift * 0.82;

  const curve = new THREE.CatmullRomCurve3([a, c1, mid, c2, b]);
  return new THREE.TubeGeometry(curve, 44, thickness, 6, false);
}

/** Turn a list of [x, y] pairs into the profile a <latheGeometry> wants. */
export function profile(points: readonly (readonly [number, number])[]) {
  return points.map(([x, y]) => new THREE.Vector2(x, y));
}
