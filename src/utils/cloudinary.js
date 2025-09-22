// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tech-buddyzz/products',
    format: async (req, file) => {
      // Determine format based on file mimetype
      const formats = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
      };
      return formats[file.mimetype] || 'jpg';
    },
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `product_${timestamp}_${randomString}`;
    },
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto' },
      { format: 'auto' }
    ]
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Cloudinary service functions
export class CloudinaryService {
  // Upload single image
  static async uploadImage(filePath, folder = 'tech-buddyzz/products') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' }
        ]
      });
      return result;
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Upload multiple images
  static async uploadImages(files, folder = 'tech-buddyzz/products') {
    try {
      const uploadPromises = files.map(file => 
        this.uploadImage(file.path, folder)
      );
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Multiple image upload failed: ${error.message}`);
    }
  }

  // Delete image by public_id
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error(`Image deletion failed: ${error.message}`);
    }
  }

  // Delete multiple images
  static async deleteImages(publicIds) {
    try {
      const deletePromises = publicIds.map(publicId => 
        this.deleteImage(publicId)
      );
      return await Promise.all(deletePromises);
    } catch (error) {
      throw new Error(`Multiple image deletion failed: ${error.message}`);
    }
  }

  // Extract public_id from Cloudinary URL
  static getPublicIdFromUrl(url) {
    try {
      const matches = url.match(/\/v\d+\/(.+)\.(?:jpg|jpeg|png|webp|gif)/);
      return matches ? matches[1] : null;
    } catch (error) {
      throw new Error('Invalid Cloudinary URL');
    }
  }
}

export default cloudinary;