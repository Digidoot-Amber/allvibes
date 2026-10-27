# allvibes — rules for anyone (or any AI) adding to this world

This is a shared 3D world. One person works at a time. Read this whole file
before you change anything.

---

## Before you start

**Always pull the latest `main` first.**

```bash
git checkout main
git pull
```

If you skip this you will build on an old copy of the world and your change
will conflict with someone else's.

---

## STYLE GUIDE

> **⚠️ Amber — this section is yours to fill in. Everything added to the world
> has to follow it, so the more specific you are, the more the world will hang
> together instead of looking like six different people built it.**
>
> Fill in:
>
> - **Palette** — the exact colours allowed. Hex codes, not "greenish".
> - **Mood** — calm? playful? dreamlike? eerie?
> - **Lighting** — soft and even, or hard shadows and contrast?
> - **Level of detail** — chunky and low-poly, or fine and intricate?
> - **Scale** — how big is a "normal" element next to the tree?
> - **Anything banned** — e.g. no text floating in the air, no pure black.

Until this is filled in, match the existing pond element: soft, slightly
stylised low-poly shapes, flat shading, saturated but not neon colours, and a
plain white background.

---

## How the world is put together

The pond sets the reference for everything else:

| Thing | Value |
|---|---|
| Centre of the pond | `0, 0` — the datum for the whole world |
| Bottom of the pond | `y = 0` — the ground plane |
| Water surface | `y = 0.4` |
| Surrounding land (stand things on this) | `y = 0.64` |
| Outer edge of the island | radius `4` |

These live in `src/world/constants.ts`. Import them — don't retype the numbers.

**The land is only flat out to radius 3.5.** Past that it rolls over towards
the rim, so anything placed further out at `y = 0.64` floats in mid-air. The
pond element has a `groundY(distance)` helper that gives the real height —
copy the same idea if you plant anything near the edge.

**Don't move or edit the pond element.** It is the spatial reference that makes
everything else make sense.

---

## Adding an element

1. **One element, one file**, in `src/world/elements/`. Name it after the
   *thing*, not after yourself: `mountains.tsx`, `archway-book.tsx` — not
   `jens-thing.tsx`.
2. Default-export a React component that returns a `<group>`.
3. Register it in `src/world/elements/index.ts` — one line added to the list.
4. **Don't edit anyone else's element file**, and don't edit shared files
   (`constants.ts`, `Scene.tsx`, `Hud.tsx`) unless Amber asks you to.

### Build it in code

Elements are made from shapes, materials and particles written in code.
**Don't download or import 3D model files** (`.glb`, `.gltf`, `.fbx`, `.obj`).

`src/world/geometry.ts` already has the awkward shapes worked out — reuse them
rather than starting from a cube:

| Helper | What it gives you |
|---|---|
| `bladeGeometry()` | a leaf or petal, pointed and curling over |
| `fallenLeafGeometry()` | a small lobed leaf to lie flat on the ground |
| `spiralGeometry()` | a spiral tube, for veins or climbing vines |
| `arcGeometry()` | a tube arching between two points — roots, branches |
| `profile()` | turns `[x, y]` pairs into a `<latheGeometry>` profile |

Build a shape **once** and share it between meshes. Making a new one every
frame is the usual reason a scene turns slow.

### Keep it light — people open this on phones

- Aim for **under ~40 meshes** per element. If you want more than that of the
  *same* thing — a hundred pebbles, a field of grass — use `<Instances>` and
  `<Instance>` from drei instead. The whole lot then costs about as much as one
  mesh, and you can still give each instance its own colour, size and angle.
  The pond element does this for its grass, leaf litter and pebbles.
- Scattering something? Spread it with `ringDist`-style maths (see the pond
  element), not a plain random distance — otherwise the middle looks crowded
  and the outside looks bald.
- Use `makeRng` from `src/world/rng.ts` instead of `Math.random()` when you
  scatter things, so the layout is the same on every load.
- Wrap anything expensive in `useMemo`.
- Don't add a `useFrame` animation unless the element really needs to move.

### A gotcha that will waste your time

Changing geometry often **won't show up on hot reload**. If your change doesn't
appear, **reload the page properly** before assuming it's broken.

---

## Never

- **No secrets, API keys, passwords or tokens.** Not in code, not in a comment,
  not "temporarily".
- **No photos of people** unless that person has said yes. Compress any image
  before adding it.
- **Never push straight to `main`.**

---

## How to submit your change

If you have never done this before, follow it exactly. Your AI assistant can run
these for you — ask it to.

**1. Make a branch.** Name it after what you're adding.

```bash
git checkout -b add-mountains
```

**2. Commit, in plain English.** Describe what you added, not how.

```bash
git add .
git commit -m "Add mountains along the back edge"
```

**3. Push it.**

```bash
git push -u origin add-mountains
```

**4. Open a pull request.**

```bash
gh pr create --fill
```

No `gh`? Open the repo on GitHub — there will be a banner offering to open a
pull request from the branch you just pushed.

**5. Send Amber the preview link.** Vercel comments a preview URL on your pull
request within a minute or two. That link shows your change in the real world,
live. Send it to Amber — she reviews and merges.

Your change goes live once she merges. **Don't merge your own pull request.**

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
