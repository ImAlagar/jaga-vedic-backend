// services/productService.js
import * as productModel from "../models/productModel.js";
import { CloudinaryService } from "../utils/cloudinary.js";

export async function createProduct(productData, imageFiles = []) {
  try {
    // Upload images to Cloudinary if provided
    let imageUrls = [];
    
    if (imageFiles && imageFiles.length > 0) {
      const uploadResults = await CloudinaryService.uploadImages(imageFiles);
      imageUrls = uploadResults.map(result => result.secure_url);
    }

    // Create product in database
    const product = await productModel.createProduct({
      ...productData,
      images: imageUrls,
      price: parseFloat(productData.price)
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      images: product.images,
      category: product.category,
      sku: product.sku,
      inStock: product.inStock,
      createdAt: product.createdAt
    };
  } catch (error) {
    // Clean up uploaded images if product creation fails
    if (imageFiles.length > 0) {
      try {
        const publicIds = imageFiles.map(file => 
          CloudinaryService.getPublicIdFromUrl(file.path)
        ).filter(Boolean);
        await CloudinaryService.deleteImages(publicIds);
      } catch (cleanupError) {
        console.error('Error cleaning up images:', cleanupError);
      }
    }
    throw new Error(`Product creation failed: ${error.message}`);
  }
}

export async function getProducts(page = 1, limit = 10, search = '', category = '', inStock = null) {
  try {
    return await productModel.findAllProducts(page, parseInt(limit), search, category, inStock);
  } catch (error) {
    throw new Error(`Failed to get products: ${error.message}`);
  }
}

export async function getProductById(productId) {
  try {
    const product = await productModel.findProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    return product;
  } catch (error) {
    throw new Error(`Failed to get product: ${error.message}`);
  }
}

export async function updateProduct(productId, updateData, newImageFiles = []) {
  try {
    const existingProduct = await productModel.findProductById(productId);
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    let imageUrls = existingProduct.images;
    let imagesToDelete = [];

    // Handle image updates
    if (newImageFiles && newImageFiles.length > 0) {
      // Upload new images
      const uploadResults = await CloudinaryService.uploadImages(newImageFiles);
      const newImageUrls = uploadResults.map(result => result.secure_url);
      
      // If replacing all images, mark old ones for deletion
      if (updateData.replaceImages) {
        imagesToDelete = existingProduct.images.map(url => 
          CloudinaryService.getPublicIdFromUrl(url)
        ).filter(Boolean);
        imageUrls = newImageUrls;
      } else {
        // Add new images to existing ones
        imageUrls = [...existingProduct.images, ...newImageUrls];
      }
    }

    // Update product in database
    const updatedProduct = await productModel.updateProduct(productId, {
      ...updateData,
      images: imageUrls,
      price: updateData.price ? parseFloat(updateData.price) : undefined
    });

    // Delete old images if they were replaced
    if (imagesToDelete.length > 0) {
      try {
        await CloudinaryService.deleteImages(imagesToDelete);
      } catch (deleteError) {
        console.error('Error deleting old images:', deleteError);
      }
    }

    return updatedProduct;
  } catch (error) {
    throw new Error(`Product update failed: ${error.message}`);
  }
}

export async function deleteProduct(productId) {
  try {
    const product = await productModel.findProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map(url => 
        CloudinaryService.getPublicIdFromUrl(url)
      ).filter(Boolean);
      
      if (publicIds.length > 0) {
        await CloudinaryService.deleteImages(publicIds);
      }
    }

    // Delete product from database
    await productModel.deleteProduct(productId);

    return { message: "Product deleted successfully" };
  } catch (error) {
    throw new Error(`Product deletion failed: ${error.message}`);
  }
}

export async function toggleProductStock(productId, inStock) {
  try {
    const product = await productModel.toggleProductStock(productId, inStock);
    return {
      id: product.id,
      name: product.name,
      inStock: product.inStock,
      message: `Product ${inStock ? 'restocked' : 'marked as out of stock'} successfully`
    };
  } catch (error) {
    throw new Error(`Failed to update product stock: ${error.message}`);
  }
}

export async function getCategories() {
  try {
    return await productModel.getProductCategories();
  } catch (error) {
    throw new Error(`Failed to get categories: ${error.message}`);
  }
}

export async function deleteProductImage(productId, imageUrl) {
  try {
    const product = await productModel.findProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.images.includes(imageUrl)) {
      throw new Error("Image not found for this product");
    }

    // Delete image from Cloudinary
    const publicId = CloudinaryService.getPublicIdFromUrl(imageUrl);
    if (publicId) {
      await CloudinaryService.deleteImage(publicId);
    }

    // Remove image from product
    const updatedImages = product.images.filter(img => img !== imageUrl);
    await productModel.updateProduct(productId, { images: updatedImages });

    return { message: "Image deleted successfully" };
  } catch (error) {
    throw new Error(`Image deletion failed: ${error.message}`);
  }
}