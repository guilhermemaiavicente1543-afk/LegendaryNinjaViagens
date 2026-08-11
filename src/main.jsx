import "./patchLeafletRemoveChild.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { LanguageProvider } from "./i18n/LanguageContext";
import PageButtonSound from "./components/audio/PageButtonSound";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <PageButtonSound />
      <ErrorBoundary>
      <App />
    </ErrorBoundary>
    </LanguageProvider>
  </StrictMode>
);
