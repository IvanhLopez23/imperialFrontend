import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Al publicar una versión nueva, el Service Worker toma el control y recargamos
// una vez para no quedarnos viendo assets/styles antiguos en caché.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) return;
    reloading = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
