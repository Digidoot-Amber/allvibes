import * as THREE from "three";

/**
 * The datum for the whole world.
 *
 * The centre of the pond is 0,0 on the horizontal plane, and the BOTTOM of the
 * pond is y = 0. Everything else is positioned relative to this. If you are
 * adding an element, place it on the land ring (roughly 1.9 to 3.8 units out
 * from the centre) and sit it on the ground at the height given below.
 */
export const DATUM = new THREE.Vector3(0, 0, 0);

/** Radius of the pond's flat floor. */
export const POND_RADIUS = 1.5;

/** Height of the water surface above the pond floor. */
export const WATER_LEVEL = 0.4;

/** Height of the surrounding land — stand new elements on this. */
export const LAND_LEVEL = 0.64;

/** Outer edge of the island. Keep elements inside this. */
export const ISLAND_RADIUS = 4;

/** Where the camera sits when the world first loads, and where Home returns to. */
export const HOME_CAMERA = new THREE.Vector3(6.2, 4.4, 7.4);
export const HOME_TARGET = new THREE.Vector3(0, 0.5, 0);

/** How close and how far the camera may get. */
export const MIN_DISTANCE = 2.5;
export const MAX_DISTANCE = 22;
