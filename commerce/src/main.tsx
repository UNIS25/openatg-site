import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {window.top === window.self ? (
      <App />
    ) : (
      <p>Open administration directly.</p>
    )}
  </React.StrictMode>,
);
