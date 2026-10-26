# allvibes

A collaborative 3D world you can add to. One person works at a time.

**Live:** https://allvibes.vercel.app

---

## What this is

A world in your browser that the group builds together. Each person adds one
thing — a mountain range, an archway, a shoal of fish — and it becomes part of
the shared space. Everything is built out of code, not downloaded models.

Right now there's a pond with a tree, a garden and a waterfall. That's the
starting point and the thing everything else is measured against.

---

## One-time setup

You need these installed once. If any step fails, send Amber the error.

**1. Install Node.js.** Go to [nodejs.org](https://nodejs.org) and install the
version it offers you. Restart your terminal afterwards.

**2. Install Git.** [git-scm.com/downloads](https://git-scm.com/downloads).

**3. Get the code.**

```bash
git clone https://github.com/Digidoot-Amber/allvibes.git
cd allvibes
```

**4. Install the project's bits.** This takes a minute.

```bash
npm install
```

**5. Start it up.**

```bash
npm run dev
```

Open <http://localhost:3000> and you should see the pond. Press `Ctrl+C` in the
terminal to stop it.

---

## Every time after that

```bash
git checkout main
git pull
npm run dev
```

Pulling first matters — otherwise you're building on an old copy of the world.

---

## Finding your way around

- **Drag** to turn the world
- **Scroll** or pinch to zoom
- **Right-click drag**, or the move tool in the top left, to slide the view
- **The tree button** puts everything back where it started
- **The `?` button** explains all this inside the app

---

## Adding your thing

The full rules are in **[AGENTS.md](./AGENTS.md)** — most AI coding tools read
that automatically, so you may be able to just say *"add mountains behind the
pond"* and let it work.

The short version:

1. Pull the latest `main` first.
2. One new file in `src/world/elements/`, named after the thing.
3. Add one line to `src/world/elements/index.ts`.
4. Don't touch anyone else's file.
5. Make a branch, commit, push, open a pull request, send Amber the preview
   link. **Never push to `main`.**

If your change doesn't appear, **reload the page properly** — 3D geometry often
doesn't hot-reload.

---

## House rules

- No secrets, API keys or passwords, ever
- No photos of people without their OK
- Keep elements light — people open this on their phones
- Amber reviews and merges everything
