import { useEffect, useRef, useState } from "react";

const AUDIO_SRC = "/audio/ln-soundtrack.mp3";
const STORAGE_MUTED_KEY = "ln-soundtrack-muted";
const STORAGE_POSITION_KEY = "ln-floating-sound-position";

function getStoredMuted() {
  return localStorage.getItem(STORAGE_MUTED_KEY) === "true";
}

function getStoredPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_POSITION_KEY) || "null");

    if (
      saved &&
      typeof saved.x === "number" &&
      typeof saved.y === "number"
    ) {
      return saved;
    }
  } catch {
    return null;
  }

  return null;
}

function MegaphoneIcon({ muted }) {
  return (
    <svg className="floating-sound-icon" viewBox="0 0 64 64" aria-hidden="true">
      <path
        className="speaker-body"
        d="M10 28.5v7c0 2.2 1.8 4 4 4h7.2l14.9 9.4c2.1 1.3 4.9-.2 4.9-2.7V17.8c0-2.5-2.8-4-4.9-2.7L21.2 24.5H14c-2.2 0-4 1.8-4 4Z"
        fill="currentColor"
      />

      {!muted && (
        <>
          <path
            d="M45 24c2.3 2 3.7 4.8 3.7 8s-1.4 6-3.7 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M51 18c4 3.5 6.5 8.4 6.5 14S55 42.5 51 46"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.78"
          />
        </>
      )}

      {muted && (
        <g className="speaker-x">
          <path
            d="M46 24l11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M57 24L46 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

export default function SoundtrackPlayer() {
  const audioRef = useRef(null);
  const buttonRef = useRef(null);
  const dragRef = useRef({
    isDragging: false,
    wasDragged: false,
    startX: 0,
    startY: 0,
    startButtonX: 0,
    startButtonY: 0
  });

  const [isMuted, setIsMuted] = useState(getStoredMuted);
  const [position, setPosition] = useState(getStoredPosition);

  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.volume = 0.15;
    audio.muted = isMuted;
    audioRef.current = audio;

    function tryPlay() {
      if (!audioRef.current || isMuted) return;
      audioRef.current.play().catch(() => {});
    }

    tryPlay();

    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });

    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);

      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_MUTED_KEY, String(isMuted));

    if (!audioRef.current) return;

    audioRef.current.muted = isMuted;
    audioRef.current.volume = 0.15;

    if (isMuted) {
      audioRef.current.pause();
      return;
    }

    audioRef.current.play().catch(() => {});
  }, [isMuted]);

  function clampPosition(x, y) {
    const size = window.innerWidth <= 900 ? 46 : 54;
    const padding = 10;

    return {
      x: Math.min(window.innerWidth - size - padding, Math.max(padding, x)),
      y: Math.min(window.innerHeight - size - padding, Math.max(padding, y))
    };
  }

  function handlePointerDown(event) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      isDragging: true,
      wasDragged: false,
      startX: event.clientX,
      startY: event.clientY,
      startButtonX: rect.left,
      startButtonY: rect.top
    };

    buttonRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current.isDragging) return;

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      dragRef.current.wasDragged = true;
    }

    const next = clampPosition(
      dragRef.current.startButtonX + deltaX,
      dragRef.current.startButtonY + deltaY
    );

    setPosition(next);
    localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify(next));
  }

  function handlePointerUp(event) {
    if (!dragRef.current.isDragging) return;

    buttonRef.current?.releasePointerCapture?.(event.pointerId);

    const wasDragged = dragRef.current.wasDragged;
    dragRef.current.isDragging = false;

    if (!wasDragged) {
      setIsMuted((current) => !current);
    }
  }

  const style = position
    ? {
        "--sound-left": `${position.x}px`,
        "--sound-top": `${position.y}px`
      }
    : undefined;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`floating-sound-button ${position ? "sound-is-moved" : ""} ${
        isMuted ? "muted" : "playing"
      }`}
      style={style}
      aria-label={isMuted ? "Ativar som" : "Desativar som"}
      title={isMuted ? "Ativar som" : "Desativar som"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="floating-sound-aura" />
      <span className="floating-sound-core">
        <MegaphoneIcon muted={isMuted} />
      </span>
    </button>
  );
}
