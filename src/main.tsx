import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Disable browser's native context menu for native app feel
document.addEventListener("contextmenu", (e) => {
  // Allow context menu in input/textarea for copy/paste
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  ) {
    return;
  }
  e.preventDefault();
});

// Disable browser's native drag-and-drop on document
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  // Only prevent default on root, the app handles file drops
  if (e.target === document.body || e.target === document.documentElement) {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
