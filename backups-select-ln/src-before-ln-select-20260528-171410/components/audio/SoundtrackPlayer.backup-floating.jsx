import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

const AUDIO_SRC = "/audio/ln-soundtrack.mp3";
const STORAGE_KEY = "ln-digital-sound-enabled";
const FIXED_VOLUME = 0.15;

export default function SoundtrackPlayer() {
  const { t } = useLanguage();
  const audioRef = useRef(null);

  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === "false") return false;

    return true;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = FIXED_VOLUME;
    audio.loop = true;
    audio.preload = "auto";

    async function tryPlay() {
      audio.volume = FIXED_VOLUME;

      if (!isEnabled || document.hidden) {
        audio.pause();
        return;
      }

      try {
        await audio.play();
      } catch {
        // O navegador pode bloquear autoplay com som.
        // Nesse caso, o áudio inicia na primeira interação do usuário.
        audio.pause();
      }
    }

    function stopAudio(reset = false) {
      audio.pause();

      if (reset) {
        audio.currentTime = 0;
      }
    }

    function handleFirstInteraction() {
      if (!isEnabled || document.hidden) return;
      tryPlay();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopAudio();
        return;
      }

      if (isEnabled) {
        tryPlay();
      }
    }

    function handlePageHide() {
      stopAudio(true);
    }

    function handleBeforeUnload() {
      stopAudio(true);
    }

    tryPlay();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);

      stopAudio();
    };
  }, [isEnabled]);

  function toggleSound() {
    const audio = audioRef.current;
    const nextValue = !isEnabled;

    setIsEnabled(nextValue);
    localStorage.setItem(STORAGE_KEY, String(nextValue));

    if (!audio) return;

    audio.volume = FIXED_VOLUME;

    if (!nextValue) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    if (!document.hidden) {
      audio.play().catch(() => {
        audio.pause();
      });
    }
  }

  return (
    <>
      <audio ref={audioRef} src={AUDIO_SRC} />

      <button
        type="button"
        className={`sound-toggle-button ${isEnabled ? "active" : ""}`}
        onClick={toggleSound}
        aria-label={isEnabled ? t("sound.disable") : t("sound.enable")}
      >
        {isEnabled ? t("sound.on") : t("sound.off")}
      </button>
    </>
  );
}
