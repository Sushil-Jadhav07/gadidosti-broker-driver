// Auto-detects and crops just the QR-code square out of a larger branded image (e.g.
// Razorpay's QR poster: a "Powered by Razorpay" header, the actual QR, "Scan & pay" text, a
// payment-app logo row, then the merchant name/trip number and a decorative footer). Blind
// CSS-percentage crops kept breaking whenever the poster's proportions shifted (the business
// name/trip number block below the QR is generated per-request, not part of any fixed
// template), so this instead finds the QR itself by scanning actual pixel data: a QR code is
// the only part of the poster that's a large, square, near-50/50 black/white region — dense
// text lines and logos are much thinner and never reach that density over a run that tall.
//
// `src` must be same-origin (or a blob: URL) — a cross-origin <img> taints the canvas and
// getImageData() throws. Returns a cropped data URL, or null if no square dense-enough region
// was found (caller should fall back to showing the original image uncropped).
export async function extractQrCrop(src) {
  const img = await loadImage(src);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  let pixels;
  try {
    pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null; // Tainted canvas (shouldn't happen for a same-origin/blob src) — bail safely.
  }

  const { width, height } = canvas;
  const isDark = (x, y) => {
    const i = (y * width + x) * 4;
    // Standard luminance weighting; QR modules are near-pure black/white so 128 splits cleanly.
    return 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2] < 128;
  };

  const rowDarkFraction = (y) => {
    let dark = 0;
    let sampled = 0;
    for (let x = 0; x < width; x += 2) {
      if (isDark(x, y)) dark++;
      sampled++;
    }
    return dark / sampled;
  };

  // Pass 1: find the tallest contiguous run of rows dense enough to be QR modules (not a thin
  // text line or logo row). Sampled every 2px vertically too — plenty of resolution for a
  // region we expect to be dozens to low-hundreds of pixels tall.
  const ROW_THRESHOLD = 0.22;
  let bestTop = -1, bestBottom = -1, bestRunLen = 0, runStart = -1;

  for (let y = 0; y < height; y += 2) {
    if (rowDarkFraction(y) > ROW_THRESHOLD) {
      if (runStart === -1) runStart = y;
    } else if (runStart !== -1) {
      const runLen = y - runStart;
      if (runLen > bestRunLen) { bestRunLen = runLen; bestTop = runStart; bestBottom = y; }
      runStart = -1;
    }
  }
  if (runStart !== -1 && height - runStart > bestRunLen) {
    bestRunLen = height - runStart; bestTop = runStart; bestBottom = height;
  }

  // A real QR's own height should be a substantial fraction of the poster's width (it's
  // square-ish and usually the widest single element on the card) — anything shorter is
  // almost certainly a false positive (a dense logo cluster, not the QR).
  if (bestTop === -1 || bestRunLen < width * 0.35) return null;

  // Pass 2: within that vertical band, find the horizontal extent the same way, so the crop
  // hugs the QR's actual left/right edges instead of the full poster width.
  const colDarkFraction = (x) => {
    let dark = 0;
    let sampled = 0;
    for (let y = bestTop; y < bestBottom; y += 2) {
      if (isDark(x, y)) dark++;
      sampled++;
    }
    return dark / sampled;
  };

  const COL_THRESHOLD = 0.15;
  let left = -1, right = -1;
  for (let x = 0; x < width; x++) {
    if (colDarkFraction(x) > COL_THRESHOLD) {
      if (left === -1) left = x;
      right = x;
    }
  }
  if (left === -1) { left = 0; right = width - 1; }

  // Small padding so the QR's own white quiet-zone border stays intact (scanners need it).
  const boxW = right - left;
  const boxH = bestBottom - bestTop;
  const pad = Math.round(Math.max(boxW, boxH) * 0.08);
  const cropLeft = Math.max(0, left - pad);
  const cropTop = Math.max(0, bestTop - pad);
  const cropRight = Math.min(width, right + pad);
  const cropBottom = Math.min(height, bestBottom + pad);
  const cropW = cropRight - cropLeft;
  const cropH = cropBottom - cropTop;
  if (cropW <= 0 || cropH <= 0) return null;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  out.getContext("2d").drawImage(canvas, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH);
  return out.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
