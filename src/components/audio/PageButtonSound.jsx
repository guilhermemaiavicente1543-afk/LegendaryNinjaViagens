import { useEffect } from "react";

const OPEN_SOUND = "/audio/page-open.mp3";
const BACK_SOUND = "/audio/page-back.mp3";

const PAGE_OPEN_TERMS = [
  "meu ninja",
  "my ninja",
  "mi ninja",
  "mon ninja",
  "mapa",
  "map",
  "carte",
  "shinobidex",
  "anced",
  "painel adm",
  "admin panel",
  "panel adm",
  "panneau adm",
  "explorar",
  "explore",
  "explorer",
  "menu",
  "abrir menu",
  "open menu"
];

const BACK_CLOSE_TERMS = [
  "voltar",
  "voltar ao hall",
  "back",
  "retour",
  "volver",
  "fechar",
  "fechar configurações",
  "fechar menu",
  "close",
  "close menu",
  "cerrar",
  "fermer",
  "cancelar",
  "cancel",
  "annuler"
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getClickable(target) {
  return target.closest?.("button, a, [role='button']");
}

function getClickableText(clickable) {
  return normalizeText(
    [
      clickable.textContent,
      clickable.getAttribute("aria-label"),
      clickable.getAttribute("title"),
      clickable.className
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function shouldIgnore(clickable) {
  if (!clickable) return true;

  if (clickable.closest(".ln-custom-select")) return true;
  if (clickable.closest(".leaflet-control")) return true;
  if (clickable.closest(".inventory-filters")) return true;

  return false;
}

function isMobileMenuButton(clickable, text) {
  if (!clickable) return false;

  const classText = normalizeText(clickable.className);

  return (
    text.includes("☰") ||
    text.includes("menu") ||
    text.includes("hamburger") ||
    classText.includes("menu") ||
    classText.includes("hamburger") ||
    classText.includes("drawer") ||
    classText.includes("mobile") ||
    clickable.getAttribute("aria-controls")?.toLowerCase?.().includes("menu")
  );
}

function getSoundType(target) {
  const clickable = getClickable(target);

  if (shouldIgnore(clickable)) return null;

  const text = getClickableText(clickable);

  if (
    clickable.classList?.contains("ln-hall-return-button") ||
    clickable.classList?.contains("ln-hall-back-button") ||
    clickable.classList?.contains("ln-hall-back-button-app-return") ||
    clickable.classList?.contains("backButton") ||
    clickable.classList?.contains("panelBackdrop") ||
    clickable.classList?.contains("closeButton") ||
    clickable.classList?.contains("drawer-close") ||
    clickable.classList?.contains("modal-close")
  ) {
    return "back";
  }

  if (BACK_CLOSE_TERMS.some((term) => text.includes(normalizeText(term)))) {
    return "back";
  }

  if (isMobileMenuButton(clickable, text)) {
    const expanded = clickable.getAttribute("aria-expanded");

    if (expanded === "true") return "back";
    if (expanded === "false") return "open";

    const looksLikeClose =
      text.includes("fechar") ||
      text.includes("close") ||
      text.includes("cerrar") ||
      text.includes("fermer") ||
      clickable.classList?.contains("open") ||
      clickable.classList?.contains("active");

    return looksLikeClose ? "back" : "open";
  }

  if (clickable.closest(".profile-tabs")) {
    return "open";
  }

  if (PAGE_OPEN_TERMS.some((term) => text.includes(normalizeText(term)))) {
    return "open";
  }

  return null;
}

function playAudio(src, volume = 0.42) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.currentTime = 0;

  audio.play().catch(() => {});
}

export default function PageButtonSound() {
  useEffect(() => {
    function handlePointerDown(event) {
      const soundType = getSoundType(event.target);

      if (soundType === "back") {
        playAudio(BACK_SOUND, 0.42);
        return;
      }

      if (soundType === "open") {
        playAudio(OPEN_SOUND, 0.45);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return null;
}
