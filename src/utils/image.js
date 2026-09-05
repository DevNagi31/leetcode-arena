/**
 * Client-side photo downscaling.
 *
 * Photos of handwritten notes are stored inline on the note document, and the
 * whole Atlas cluster is 512MB — so a 5MB phone photo has to come down before
 * it ever reaches the network. Resizing here rather than on the server also
 * means the upload itself is small, which matters on a phone connection.
 *
 * A 4032x3024 photo at ~5MB lands around 200KB at these settings, and stays
 * comfortably readable for handwriting.
 */

export const MAX_DIMENSION = 1600;
export const JPEG_QUALITY = 0.72;
export const MAX_IMAGES = 4;

// Matches MAX_IMAGE_BASE64 in server/middleware/validation.js.
export const MAX_BASE64_LENGTH = 1_000_000;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Safari can hand back HEIC that it then refuses to decode.
      reject(new Error("That image couldn't be read. Try a JPEG or PNG."));
    };
    img.src = url;
  });

/**
 * Downscale and re-encode a File to JPEG.
 *
 * Resolves to `{ data, mimeType, width, height, bytes }` — `data` being bare
 * base64, which is the shape the notes API expects.
 */
export async function compressImage(file) {
  const img = await loadImage(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // Photos of paper are mostly flat white; smoothing keeps the strokes clean
  // rather than aliased when scaling down a long way.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  // Very detailed pages can still exceed the cap; step the quality down rather
  // than rejecting a photo the user just took.
  while (dataUrl.length > MAX_BASE64_LENGTH && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const data = dataUrl.split(',')[1] || '';
  if (data.length > MAX_BASE64_LENGTH) {
    throw new Error('That photo is too detailed to store. Try cropping it first.');
  }

  return {
    data,
    mimeType: 'image/jpeg',
    width,
    height,
    // Approximate decoded size — base64 carries 3 bytes per 4 characters.
    bytes: Math.round((data.length * 3) / 4),
  };
}

export const formatBytes = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
