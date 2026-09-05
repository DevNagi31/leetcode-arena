const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  problemName: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  /**
   * Photographs of handwritten notes.
   *
   * Two storage backends, chosen per-image at upload time by
   * services/imageStore.js:
   *
   *   inline      - base64 on this document. Zero configuration, but shares
   *                 the 512MB Atlas quota with user data and has no CDN.
   *   cloudinary  - only the URL lives here. Used automatically once the
   *                 CLOUDINARY_* env vars are set.
   *
   * Storing the backend per-image rather than globally means switching is a
   * config change, not a migration: existing inline photos keep working while
   * new ones go to the bucket.
   */
  images: [{
    storage: { type: String, enum: ['inline', 'cloudinary'], default: 'inline' },
    data: { type: String },        // inline only: base64, no data: prefix
    url: { type: String },         // cloudinary only
    publicId: { type: String },    // cloudinary only, needed to delete
    mimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
    bytes: { type: Number },
    width: { type: Number },
    height: { type: Number },
    createdAt: { type: Date, default: Date.now }
  }],

  resources: [String],
  personalRating: {
    type: Number,
    min: 1,
    max: 5
  },
  topics: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Note', NoteSchema);
