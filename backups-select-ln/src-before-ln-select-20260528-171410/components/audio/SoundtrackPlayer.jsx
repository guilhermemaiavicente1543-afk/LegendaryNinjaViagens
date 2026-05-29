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
        <>
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
        </>
      )}
    </svg>
  );
}

export default function SoundtrackPlayer() {
  const audioRef = useRef(null);
  const buttonRef = useRef(null);

  const isMutedRef = useRef(getStoredMuted());
  const hasUserGestureRef = useRef(false);
  const dragRef = useRef({
    isDragging: false,
    wasDragged: false,
    startX: 0,
    startY: 0,
    startButtonX: 0,
    startButtonY: 0
  });

  const [isMuted, setIsMuted] = useState(isMutedRef.current);
  const [position, setPosition] = useState(getStoredPosition);

  function pauseAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
  }

  function stopAudioCompletely() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
  }

  function tryPlayAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMutedRef.current) return;
    if (document.hidden) return;

    audio.volume = 0.15;
    audio.muted = false;

    audio.play().catch(() => {
      // Navegadores podem bloquear áudio até uma interação real do usuário.
    });
  }

  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.volume = 0.15;
    audio.preload = "auto";
    audio.muted = isMutedRef.current;

    audioRef.current = audio;

    function unlockAndPlay() {
      hasUserGestureRef.current = true;
      tryPlayAudio();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        pauseAudio();
        return;
      }

      if (hasUserGestureRef.current && !isMutedRef.current) {
        tryPlayAudio();
      }
    }

    function handleWindowBlur() {
      pauseAudio();
    }

    function handleWindowFocus() {
      if (hasUserGestureRef.current && !isMutedRef.current && !document.hidden) {
        tryPlayAudio();
      }
    }

    function handlePageHide() {
      stopAudioCompletely();
    }

    // Captura praticamente qualquer primeira interação do usuário.
    document.addEventListener("pointerdown", unlockAndPlay, true);
    document.addEventListener("click", unlockAndPlay, true);
    document.addEventListener("touchstart", unlockAndPlay, true);
    document.addEventListener("keydown", unlockAndPlay, true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      document.removeEventListener("pointerdown", unlockAndPlay, true);
      document.removeEventListener("click", unlockAndPlay, true);
      document.removeEventListener("touchstart", unlockAndPlay, true);
      document.removeEventListener("keydown", unlockAndPlay, true);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);

      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
    localStorage.setItem(STORAGE_MUTED_KEY, String(isMuted));

    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = isMuted;
    audio.volume = 0.15;

    if (isMuted) {
      pauseAudio();
      return;
    }

    hasUserGestureRef.current = true;
    tryPlayAudio();
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
