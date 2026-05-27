import { useEffect, useRef, useState } from "react";

const AUDIO_SRC = "/audio/ln-soundtrack.mp3";
const STORAGE_MUTED_KEY = "ln-soundtrack-muted";
const STORAGE_POSITION_KEY = "ln-soundtrack-position";

const DEFAULT_POSITION = {
  right: 18,
  bottom: 18
};

function getStoredMuted() {
  return localStorage.getItem(STORAGE_MUTED_KEY) === "true";
}

function getStoredPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_POSITION_KEY) || "null");

    if (
      saved &&
      typeof saved.left === "number" &&
      typeof saved.top === "number"
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
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="soundtrack-megaphone-icon"
    >
      <path
        d="M3.5 10.2v3.6c0 .7.5 1.2 1.2 1.2h2.1l4.7 3.1c.8.5 1.8 0 1.8-.9V5.8c0-.9-1-1.4-1.8-.9L6.8 8H4.7c-.7 0-1.2.5-1.2 1.2Z"
        fill="currentColor"
      />
      <path
        d="M15.4 8.2c1 .8 1.6 2.1 1.6 3.8s-.6 3-1.6 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17.8 5.8c1.8 1.5 2.9 3.7 2.9 6.2s-1.1 4.7-2.9 6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {muted && (
        <>
          <path
            d="M15.8 8.2l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M20.8 8.2l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default function SoundtrackPlayer() {
  const audioRef = useRef(null);
  const buttonRef = useRef(null);
  const dragRef = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0
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

  function getCurrentButtonRect() {
    const button = buttonRef.current;
    if (!button) return null;

    return button.getBoundingClientRect();
  }

  function handlePointerDown(event) {
    const rect = getCurrentButtonRect();
    if (!rect) return;

    dragRef.current = {
      dragging: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top
    };

    buttonRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragRef.current.dragging) return;

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.moved = true;
    }

    const size = 48;
    const padding = 8;

    const nextLeft = Math.min(
      window.innerWidth - size - padding,
      Math.max(padding, dragRef.current.startLeft + deltaX)
    );

    const nextTop = Math.min(
      window.innerHeight - size - padding,
      Math.max(padding, dragRef.current.startTop + deltaY)
    );

    const nextPosition = {
      left: nextLeft,
      top: nextTop
    };

    setPosition(nextPosition);
    localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify(nextPosition));
  }

  function handlePointerUp(event) {
    if (!dragRef.current.dragging) return;

    buttonRef.current?.releasePointerCapture?.(event.pointerId);

    const wasMoved = dragRef.current.moved;

    dragRef.current.dragging = false;

    if (!wasMoved) {
      setIsMuted((current) => !current);
    }
  }

  const buttonStyle = position
    ? {
        left: `${position.left}px`,
        top: `${position.top}px`,
        right: "auto",
        bottom: "auto"
      }
    : {
        right: `${DEFAULT_POSITION.right}px`,
        bottom: `${DEFAULT_POSITION.bottom}px`
      };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`soundtrack-control floating-sound-button ${
        isMuted ? "muted" : "playing"
      }`}
      style={buttonStyle}
      aria-label={isMuted ? "Ativar som" : "Desativar som"}
      title={isMuted ? "Ativar som" : "Desativar som"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <MegaphoneIcon muted={isMuted} />
    </button>
  );
}
