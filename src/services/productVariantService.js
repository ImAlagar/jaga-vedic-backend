// src/services/productVariantService.js
import prisma from "../config/prisma.js";

export class ProductVariantService {
  async getProductVariants(productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        printifyProductId: true,
        printifyVariants: true,
        printifyBlueprintId: true,
        printifyPrintProviderId: true
      }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return {
      productId: product.id,
      printifyProductId: product.printifyProductId,
      blueprintId: product.printifyBlueprintId,
      printProviderId: product.printifyPrintProviderId,
      variants: product.printifyVariants || []
    };
  }

  async validateVariant(productId, variantId) {
    const productData = await this.getProductVariants(productId);
    const variant = productData.variants.find(v => v.id === parseInt(variantId));
    
    if (!variant) {
      throw new Error(`Variant ${variantId} not found for product ${productId}`);
    }

    return {
      ...variant,
      blueprintId: productData.blueprintId,
      printProviderId: productData.printProviderId,
      printifyProductId: productData.printifyProductId
    };
  }
}