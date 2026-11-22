import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerServiceWorker } from "./lib/fcm";

// Registered unconditionally (not gated behind login or notification permission) so the app
// has an active service worker from first visit — that's what makes Chrome/Edge offer the
// "Install app" prompt. registerFcmToken() re-registers the same URL later, which is a no-op
// once this has already run.
registerServiceWorker();

// No <StrictMode> here — its dev-only double-invoke of effects breaks
// @react-google-maps/api's <Marker> rendering (a marker mounted during the first
// invoke, then a second render pass adds more markers alongside it, and the first
// one's icon silently drops out of the map — verified directly: same code renders
// every marker correctly in a production build, which never double-invokes
// effects). This only affects the dev-server experience; StrictMode's checks don't
// run in production either way, so nothing is lost by leaving it out.
const root = createRoot(document.getElementById("root"));
root.render(
  <App />
);

// Remove splash screen once React has painted. loaderGif.gif loops infinitely on its own
// (no artificial minimum hold needed) — it just keeps animating for as long as this is shown.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 550);
    }
  });
});
