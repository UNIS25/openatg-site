import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui";
import "./style.css";
import { I18nProvider, useI18n, LanguageSelector } from "./i18n";
function EmbeddedNotice() {
  const { t } = useI18n();
  return (
    <>
      <LanguageSelector />
      <p>{t("Open administration directly.")}</p>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      {window.top === window.self ? <App /> : <EmbeddedNotice />}
    </I18nProvider>
  </React.StrictMode>,
);
