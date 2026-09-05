const crypto = require('crypto');
const axios = require('axios');

/**
 * Where note photographs live.
 *
 * Two drivers behind one interface:
 *
 *   inline      base64 on the note document. No configuration, works out of
 *               the box, but every photo competes with user data for the
 *               512MB Atlas quota and is served by the app process.
 *
 *   cloudinary  the bytes go to Cloudinary and the note keeps only a URL.
 *               25GB free, CDN-backed, and the database stays small.
 *
 * The driver is chosen per upload, so turning Cloudinary on is a config change
 * rather than a migration — photos already stored inline keep working, and new
 * ones start going to the bucket.
 *
 * To switch, set in the environment:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || 'leetcode-arena/notes';

const useCloudinary = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

/** Cloudinary signs requests with a sorted param string plus the secret. */
const sign = (params) => {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + API_SECRET).digest('hex');
};

async function putCloudinary(img) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder: FOLDER, timestamp };

  const body = new URLSearchParams({
    file: `data:${img.mimeType};base64,${img.data}`,
    api_key: API_KEY,
    ...signed,
    signature: sign(signed),
  });

  const { data } = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    body.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  );

  return {
    storage: 'cloudinary',
    url: data.secure_url,
    publicId: data.public_id,
    mimeType: img.mimeType,
    bytes: data.bytes ?? img.bytes,
    width: data.width ?? img.width,
    height: data.height ?? img.height,
  };
}

function putInline(img) {
  return {
    storage: 'inline',
    data: img.data,
    mimeType: img.mimeType,
    bytes: img.bytes,
    width: img.width,
    height: img.height,
  };
}

/**
 * Persist one uploaded image and return the subdocument to store.
 *
 * A Cloudinary failure falls back to inline rather than losing the user's
 * photo — a degraded save beats a lost one.
 */
async function put(img) {
  if (!img || !img.data || !img.mimeType) return null;
  if (!useCloudinary) return putInline(img);

  try {
    return await putCloudinary(img);
  } catch (err) {
    console.error('Cloudinary upload failed, storing inline instead:', err.message);
    return putInline(img);
  }
}

/** Best-effort cleanup; a failure here must never break the note write. */
async function remove(stored) {
  if (!stored || stored.storage !== 'cloudinary' || !stored.publicId) return;
  if (!useCloudinary) return;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = { public_id: stored.publicId, timestamp };
    const body = new URLSearchParams({
      api_key: API_KEY,
      ...signed,
      signature: sign(signed),
    });
    await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );
  } catch (err) {
    console.error('Cloudinary delete failed (orphaned asset):', err.message);
  }
}

/** What the client renders: a CDN URL when we have one, else a data URI. */
function toPublic(stored) {
  return {
    _id: stored._id,
    mimeType: stored.mimeType,
    width: stored.width,
    height: stored.height,
    bytes: stored.bytes,
    src: stored.storage === 'cloudinary' && stored.url
      ? stored.url
      : `data:${stored.mimeType};base64,${stored.data}`,
  };
}

module.exports = { put, remove, toPublic, useCloudinary };
