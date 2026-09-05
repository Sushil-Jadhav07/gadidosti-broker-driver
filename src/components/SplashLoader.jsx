// Same green-gradient + loaderGif.gif treatment as the boot splash in index.html, reused
// wherever the app needs a full-screen loading transition after this point (e.g. after
// login, before the dashboard mounts). The gif loops infinitely on its own, so it just
// keeps animating for as long as this component stays mounted — no fixed timer needed.
export default function SplashLoader() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(160deg, #14532D 0%, #166534 55%, #16A34A 100%)" }}
    >
      <img
        src="/gadidost-logo.png"
        alt="GadiDost"
        className="h-12 flex-shrink-0"
        style={{ filter: "brightness(0) invert(1)" }}
      />
      <img src="/loaderGif.gif" alt="Loading" style={{ height: "min(600px, 65vh)", width: "auto", maxWidth: "92vw" }} />
    </div>
  );
}
