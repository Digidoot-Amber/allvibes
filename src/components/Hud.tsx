"use client";

import { useState } from "react";

export type DragMode = "rotate" | "pan";

type Props = {
  mode: DragMode;
  onModeChange: (mode: DragMode) => void;
  onHome: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const ICON = "h-5 w-5";

function TreeIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 6.5 10h3L5 17h5.2v5h3.6v-5H19l-4.5-7h3L12 2Z"
      />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z"
      />
    </svg>
  );
}

function PanIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 9.5 4.5h2v5h-5v-2L4 12l2.5 4.5v-2h5v5h-2L12 22l2.5-2.5h-2v-5h5v2L20 12l-2.5-4.5v2h-5v-5h2L12 2Z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path fill="currentColor" d="M5 11h14v2H5z" />
    </svg>
  );
}

const btn =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/90 text-neutral-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400";

const btnActive =
  "flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-800 text-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400";

export default function Hud({
  mode,
  onModeChange,
  onHome,
  onZoomIn,
  onZoomOut,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      {/* ---- Navigation, top left ---- */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onHome}
          title="Back to the starting view"
          className={`pointer-events-auto ${btn}`}
        >
          <TreeIcon />
          <span className="sr-only">Back to the starting view</span>
        </button>

        <div className="pointer-events-auto mt-1 flex flex-col gap-2 rounded-2xl border border-black/5 bg-white/70 p-1.5 backdrop-blur">
          <button
            type="button"
            onClick={() => onModeChange("rotate")}
            aria-pressed={mode === "rotate"}
            title="Drag to rotate"
            className={mode === "rotate" ? btnActive : btn}
          >
            <RotateIcon />
            <span className="sr-only">Drag to rotate</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("pan")}
            aria-pressed={mode === "pan"}
            title="Drag to move around"
            className={mode === "pan" ? btnActive : btn}
          >
            <PanIcon />
            <span className="sr-only">Drag to move around</span>
          </button>

          <button type="button" onClick={onZoomIn} title="Zoom in" className={btn}>
            <PlusIcon />
            <span className="sr-only">Zoom in</span>
          </button>

          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom out"
            className={btn}
          >
            <MinusIcon />
            <span className="sr-only">Zoom out</span>
          </button>
        </div>
      </div>

      {/* ---- Help, bottom left ---- */}
      <div className="absolute bottom-4 left-4 flex flex-col items-start gap-3">
        {helpOpen && (
          <div className="max-w-xs rounded-2xl border border-black/10 bg-white/95 p-5 text-sm leading-relaxed text-neutral-700 shadow-lg backdrop-blur">
            <h2 className="text-base font-semibold text-neutral-900">
              all vibes
            </h2>
            <p className="mt-2">
              A collaborative interactive space that is “all vibes”. Add your
              touch and submit it for update.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">
              How to navigate
            </h3>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Drag to turn the world around</li>
              <li>Scroll or pinch to zoom in and out</li>
              <li>Right-click drag — or the move tool — to slide the view</li>
              <li>The tree button puts everything back where it started</li>
            </ul>

            <p className="mt-4 text-xs text-neutral-500">
              More instructions will be added as we go.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
          title="About this playground"
          className={`${btn} text-lg font-semibold`}
        >
          ?<span className="sr-only">About this playground</span>
        </button>
      </div>
    </>
  );
}
