const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

// Resizes + re-encodes an image file client-side before upload. Raw phone-camera photos
// routinely run 5-15MB each — picking several for a Proof-of-Delivery submission (up to 6) was
// producing multipart bodies large enough to blow past the backend's per-file upload cap (or an
// infra proxy's body-size limit) with a "request entity too large" / 413 error. Downscaling to a
// sensible max dimension and re-encoding as JPEG gets each photo down to a few hundred KB with
// no visible quality loss for a delivery photo, and also makes the upload itself faster and more
// reliable on a driver's mobile connection.
export function compressImage(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  return new Promise((resolve) => {
    if (!file.type?.startsWith("image/")) {
      resolve(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          // Never make the file bigger — an already-small/optimized source image re-encoded at
          // this quality can occasionally come out larger; keep the original in that case.
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
