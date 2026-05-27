import { useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";
import { UI_AUTO_TRANSLATIONS } from "./uiAutoTranslations";
import { UI_EXTRA_TRANSLATIONS } from "./uiExtraTranslations";

const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();

const SKIP_TEXT_SELECTORS = [
  "script",
  "style",
  "textarea",
  "input",
  "[contenteditable='true']",
  ".shinobidex-page",
  ".leaflet-container",
  ".leaflet-tooltip",
  ".character-icon",
  ".shinobidex-rank",
  ".anced-calc-result > strong",
  ".ln-custom-select-icon",
  ".ln-custom-select-option-icon"
];

const SKIP_ATTRIBUTE_SELECTORS = [
  "script",
  "style",
  "[contenteditable='true']",
  ".shinobidex-page",
  ".leaflet-container",
  ".leaflet-tooltip"
];

const REGEX_TRANSLATIONS = {
  en: [
    [/^(\d+)\s+técnica\(s\)\s+encontradas$/i, "$1 technique(s) found"],
    [/^(\d+)\s+pontos$/i, "$1 points"],
    [/^Dias:\s*([\d.,]+)\s+dias$/i, "Days: $1 days"],
    [/^Região atual:\s*(.+)$/i, "Current region: $1"],
    [/^Viagem em\s+(.+)$/i, "Travel by $1"]
  ],
  es: [
    [/^(\d+)\s+técnica\(s\)\s+encontradas$/i, "$1 técnica(s) encontrada(s)"],
    [/^(\d+)\s+pontos$/i, "$1 puntos"],
    [/^Dias:\s*([\d.,]+)\s+dias$/i, "Días: $1 días"],
    [/^Região atual:\s*(.+)$/i, "Región actual: $1"],
    [/^Viagem em\s+(.+)$/i, "Viaje por $1"]
  ],
  fr: [
    [/^(\d+)\s+técnica\(s\)\s+encontradas$/i, "$1 technique(s) trouvée(s)"],
    [/^(\d+)\s+pontos$/i, "$1 points"],
    [/^Dias:\s*([\d.,]+)\s+dias$/i, "Jours : $1 jours"],
    [/^Região atual:\s*(.+)$/i, "Région actuelle : $1"],
    [/^Viagem em\s+(.+)$/i, "Voyage par $1"]
  ]
};

function getDictionary(language) {
  return {
    ...(UI_AUTO_TRANSLATIONS[language] || {}),
    ...(UI_EXTRA_TRANSLATIONS[language] || {})
  };
}

function shouldSkipTextNode(node) {
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!element) return true;

  return SKIP_TEXT_SELECTORS.some((selector) => element.closest(selector));
}

function shouldSkipAttributeElement(element) {
  if (!element) return true;

  return SKIP_ATTRIBUTE_SELECTORS.some((selector) => element.closest(selector));
}

function preserveWhitespace(original, translated) {
  const start = original.match(/^\s*/)?.[0] || "";
  const end = original.match(/\s*$/)?.[0] || "";

  return `${start}${translated}${end}`;
}

function translateDynamicFragments(clean, language, dictionary) {
  if (language === "pt") return clean;

  let translated = clean;

  const fragments = [
    "Sem natureza",
    "Não identificada",
    "Não identificado",
    "Não identificadas",
    "Não identificados",
    "draft",
    "approved",
    "needs_review",
    "pending",
    "baixa",
    "média",
    "alta"
  ];

  for (const fragment of fragments) {
    if (!dictionary[fragment]) continue;

    translated = translated.replaceAll(fragment, dictionary[fragment]);
  }

  return translated;
}

function translateValue(value, language) {
  if (language === "pt") return value;

  const dictionary = getDictionary(language);
  const clean = String(value || "").trim();

  if (dictionary[clean]) return dictionary[clean];

  const regexRules = REGEX_TRANSLATIONS[language] || [];

  for (const [pattern, replacement] of regexRules) {
    if (pattern.test(clean)) {
      return clean.replace(pattern, replacement);
    }
  }

  return translateDynamicFragments(clean, language, dictionary);
}

function translateTextNode(node, language) {
  if (shouldSkipTextNode(node)) return;

  const current = node.nodeValue;

  if (!originalTextNodes.has(node)) {
    originalTextNodes.set(node, current);
  }

  const original = originalTextNodes.get(node);

  if (language === "pt") {
    node.nodeValue = original;
    return;
  }

  const translated = translateValue(original, language);
  node.nodeValue = preserveWhitespace(original, translated);
}

function translateElementAttributes(element, language) {
  if (!(element instanceof HTMLElement)) return;
  if (shouldSkipAttributeElement(element)) return;

  const attrs = ["placeholder", "aria-label", "title"];

  for (const attr of attrs) {
    if (!element.hasAttribute(attr)) continue;

    let saved = originalAttributes.get(element);

    if (!saved) {
      saved = {};
      originalAttributes.set(element, saved);
    }

    if (!saved[attr]) {
      saved[attr] = element.getAttribute(attr);
    }

    const original = saved[attr];

    if (language === "pt") {
      element.setAttribute(attr, original);
    } else {
      element.setAttribute(attr, translateValue(original, language));
    }
  }
}

function translateDocument(language) {
  if (!document.body) return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => translateTextNode(node, language));

  document
    .querySelectorAll("[placeholder], [aria-label], [title]")
    .forEach((element) => translateElementAttributes(element, language));
}

export default function AutoTranslator() {
  const { language } = useLanguage();
  const observerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    function runTranslation() {
      translateDocument(language);
    }

    function scheduleTranslation(delay = 0) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(runTranslation, delay);
    }

    runTranslation();
    requestAnimationFrame(runTranslation);
    setTimeout(runTranslation, 80);
    setTimeout(runTranslation, 220);
    setTimeout(runTranslation, 500);

    function handleLanguageChange() {
      runTranslation();
      requestAnimationFrame(runTranslation);
      setTimeout(runTranslation, 100);
      setTimeout(runTranslation, 260);
    }

    window.addEventListener("ln-language-change", handleLanguageChange);

    observerRef.current?.disconnect();

    observerRef.current = new MutationObserver(() => {
      scheduleTranslation(35);
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"]
    });

    return () => {
      clearTimeout(timeoutRef.current);
      observerRef.current?.disconnect();
      window.removeEventListener("ln-language-change", handleLanguageChange);
    };
  }, [language]);

  return null;
}
