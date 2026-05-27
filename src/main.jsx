import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n/LanguageContext";
import GlobalLanguageButton from "./components/i18n/GlobalLanguageButton";
import PageButtonSound from "./components/audio/PageButtonSound";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <GlobalLanguageButton />
      <PageButtonSound />
      <App />
    </LanguageProvider>
  </StrictMode>
);
