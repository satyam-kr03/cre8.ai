import mongoose, { Schema } from 'mongoose';

// Define the gallery item schema
const galleryItemSchema = new Schema({
  // Common fields for all types
  type: { 
    type: String, 
    required: true,
    enum: ['Image', 'Ghibli', 'Animation', 'Speech', 'Music', 'Video']
  },
  prompt: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  userId: { 
    type: String, 
    default: 'anonymous' // Will be updated with real user IDs when auth is implemented
  },
  
  // The content - could be an image, animation, or audio
  contentUrl: { 
    type: String 
  }, // URL if stored externally (e.g., on a CDN)
  contentData: { 
    type: String 
  }, // Base64 data if stored inline
  contentType: { 
    type: String, 
    required: true 
  }, // e.g., 'image/png', 'image/gif', 'audio/mpeg'
  
  // Optional fields for specific types
  negativePrompt: String, // For some types like animation
  settings: {
    type: Map,
    of: Schema.Types.Mixed,
    default: () => new Map() // Store various settings like strength, steps, etc.
  }
});

// Create or get the model
const GalleryItem = mongoose.models.GalleryItem || mongoose.model('GalleryItem', galleryItemSchema);

export default GalleryItem; 