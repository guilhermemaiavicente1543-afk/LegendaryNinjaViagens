import { useEffect, useRef, useState } from "react";

const AUDIO_SRC = "/audio/ln-soundtrack.mp3";

function getInitialVolume() {
  const savedVolume = Number(localStorage.getItem("ln-sound-volume"));

  if (Number.isFinite(savedVolume) && savedVolume > 0) {
    return Math.min(1, Math.max(0, savedVolume));
  }

  return 0.5;
}

function getInitialHiddenState() {
  return localStorage.getItem("ln-sound-control-hidden") === "true";
}

export default function SoundtrackPlayer() {
  const audioRef = useRef(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wasBlocked, setWasBlocked] = useState(false);
  const [volume, setVolume] = useState(getInitialVolume);
  const [isHidden, setIsHidden] = useState(getInitialHiddenState);

  async function playAudio() {
    const audio = audioRef.current;

    if (!audio) return false;

    audio.volume = volume;
    audio.loop = true;

    try {
      await audio.play();
      setIsPlaying(true);
      setWasBlocked(false);
      return true;
    } catch {
      setIsPlaying(false);
      setWasBlocked(true);
      return false;
    }
  }

  function pauseAudio() {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setWasBlocked(false);
  }

  useEffect(() => {
    localStorage.removeItem("ln-sound-enabled");
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = volume;
    localStorage.setItem("ln-sound-volume", String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("ln-sound-control-hidden", String(isHidden));
  }, [isHidden]);

  useEffect(() => {
    if (!isEnabled) {
      pauseAudio();
      return;
    }

    playAudio();
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || isPlaying) return;

    function unlockAudio() {
      setIsEnabled(true);
      playAudio();
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [isEnabled, isPlaying, volume]);

  function toggleSound() {
    if (isPlaying) {
      setIsEnabled(false);
      pauseAudio();
      return;
    }

    setIsEnabled(true);
    playAudio();
  }

  function handleVolumeChange(event) {
    const nextVolume = Number(event.target.value);

    setVolume(nextVolume);

    if (!isEnabled) {
      setIsEnabled(true);
    }

    if (!isPlaying) {
      playAudio();
    }
  }

  function hideControl() {
    setIsHidden(true);
  }

  function showControl() {
    setIsHidden(false);

    if (isEnabled && !isPlaying) {
      playAudio();
    }
  }

  const label = isPlaying
    ? "Som ligado"
    : wasBlocked
      ? "Clique para som"
      : "Som ativado";

  const volumePercent = Math.round(volume * 100);

  return (
    <>
      <audio ref={audioRef} src={AUDIO_SRC} preload="auto" />

      {isHidden ? (
        <button
          type="button"
          className={`soundtrack-mini-toggle ${isPlaying ? "playing" : "muted"}`}
          onClick={showControl}
          title="Mostrar controle de som"
          aria-label="Mostrar controle de som"
        >
          {isPlaying ? "♪" : "♪"}
        </button>
      ) : (
        <div className="soundtrack-control">
          <button
            type="button"
            className={`soundtrack-toggle ${isPlaying ? "playing" : "muted"}`}
            onClick={toggleSound}
            title={isPlaying ? "Desativar som" : "Ativar som"}
          >
            <span>{isPlaying ? "♪" : "♪"}</span>
            <strong>{label}</strong>
          </button>

          <label className="soundtrack-volume" title={`Volume: ${volumePercent}%`}>
            <span>Vol.</span>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
            />

            <small>{volumePercent}%</small>
          </label>

          <button
            type="button"
            className="soundtrack-hide-button"
            onClick={hideControl}
            title="Ocultar controle de som"
            aria-label="Ocultar controle de som"
          >
            —
          </button>
        </div>
      )}
    </>
  );
}
