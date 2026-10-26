import type { ComponentType } from "react";
import PondGarden from "./pond-garden";

/**
 * The register of everything in the world.
 *
 * To add your element:
 *   1. Make ONE new file in this folder, e.g. `mountains.tsx`.
 *   2. Default-export a component that returns a <group>.
 *   3. Import it here and add one line to the list below.
 *
 * Don't edit anyone else's element file, and don't reorder the list.
 */

export type WorldElement = {
  /** kebab-case, matches the filename */
  id: string;
  /** How it shows up in a list — a thing, not a person */
  name: string;
  /** First name or nickname of whoever added it */
  by: string;
  Component: ComponentType;
};

export const elements: WorldElement[] = [
  {
    id: "pond-garden",
    name: "Pond & Garden",
    by: "Amber",
    Component: PondGarden,
  },
];
