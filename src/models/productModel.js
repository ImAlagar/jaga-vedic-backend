import prisma from "../config/prisma.js";

export async function upsertProduct(product) {
  const isPublished = determinePublishingStatus(product);
  
  // Store variant information with proper status
  const variants = product.variants ? product.variants.map(variant => ({
    id: variant.id,
    price: variant.price ? variant.price / 100 : 0,
    sku: variant.sku || '',
    isAvailable: variant.is_available !== undefined ? variant.is_available : true,
    isEnabled: variant.is_enabled !== undefined ? variant.is_enabled : true,
    isSelectedForPublishing: variant.is_selected_for_publishing || false,
    title: variant.title || `Variant ${variant.id}`
  })) : [];

  return await prisma.product.upsert({
    where: { printifyProductId: product.id },
    update: {
      name: product.title,
      description: product.description || '',
      price: product.variants && product.variants[0]?.price ? product.variants[0].price / 100 : 0,
      images: product.images ? product.images.map((img) => img.src) : [],
      sku: product.variants && product.variants[0]?.sku,
      category: product.tags && product.tags[0] ? product.tags[0] : 'general',
      printifyVariants: variants,
      printifyBlueprintId: product.blueprint_id || null,
      printifyPrintProviderId: product.print_provider_id || null,
      isPublished: isPublished,
      updatedAt: new Date(),
    },
    create: {
      name: product.title,
      description: product.description || '',
      price: product.variants && product.variants[0]?.price ? product.variants[0].price / 100 : 0,
      images: product.images ? product.images.map((img) => img.src) : [],
      printifyProductId: product.id,
      sku: product.variants && product.variants[0]?.sku,
      category: product.tags && product.tags[0] ? product.tags[0] : 'general',
      printifyVariants: variants,
      printifyBlueprintId: product.blueprint_id || null,
      printifyPrintProviderId: product.print_provider_id || null,
      isPublished: isPublished,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function findProductById(id) {
  try {
    return await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });
  } catch (error) {
    console.error("Error finding product by ID:", error);
    throw new Error("Database error occurred");
  }
}

export async function findProductByPrintifyId(printifyProductId) {
  try {
    return await prisma.product.findUnique({
      where: { printifyProductId }
    });
  } catch (error) {
    console.error("Error finding product by Printify ID:", error);
    throw new Error("Database error occurred");
  }
}

// In your product model file
export async function findAllProducts(
  page = 1, 
  limit = 10, 
  search = '', 
  category = '', 
  inStock = null, 
  minPrice = null, 
  maxPrice = null
) {
  try {
    const skip = (page - 1) * limit;
    
    // Build where clause with proper filtering
    const whereClause = {
      isPublished: true,
      AND: [
        // Search filter
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        
        // Category filter
        category && category !== 'All' ? { 
          category: { equals: category, mode: 'insensitive' } 
        } : {},
        
        // Stock filter
        inStock !== null && inStock !== 'all' ? { 
          inStock: inStock === 'true' 
        } : {},
        
        // Price range filter
        {
          AND: [
            minPrice ? { price: { gte: parseFloat(minPrice) } } : {},
            maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {}
          ]
        }
      ].filter(condition => Object.keys(condition).length > 0)
    };

    console.log('🔍 Database query where clause:', JSON.stringify(whereClause, null, 2));

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
          inStock: true,
          isPublished: true,
          printifyProductId: true,
          sku: true,
          printifyVariants: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);

    console.log(`📊 Found ${products.length} products out of ${totalCount} total`);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      products,
      totalCount,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: limit
    };
  } catch (error) {
    console.error("❌ Database error in findAllProducts:", error);
    throw new Error("Database error occurred while fetching products");
  }
}

export async function findAllProductsAdmin(page = 1, limit = 10, search = '', category = '', inStock = null, isPublished = null) {
  try {
    const skip = (page - 1) * limit;
    
    const whereClause = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        category ? { category: { equals: category, mode: 'insensitive' } } : {},
        inStock !== null ? { inStock: inStock } : {},
        isPublished !== null ? { isPublished: isPublished } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
          inStock: true,
          isPublished: true,
          printifyProductId: true,
          sku: true,
          printifyVariants: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);

    return {
      products,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    };
  } catch (error) {
    console.error("Error finding all products for admin:", error);
    throw new Error("Database error occurred");
  }
}

export async function deleteProductById(id) {
  try {
    const product = await prisma.product.delete({
      where: { id: parseInt(id) }
    });

    return product;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Product not found');
    }
    console.error("Error deleting product by ID:", error);
    throw new Error("Database error occurred while deleting product");
  }
}

export async function deleteProductByPrintifyId(printifyProductId) {
  try {
    const product = await prisma.product.delete({
      where: { printifyProductId }
    });

    return product;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Product not found');
    }
    console.error("Error deleting product by Printify ID:", error);
    throw new Error("Database error occurred while deleting product");
  }
}

export async function bulkDeleteProducts(productIds) {
  try {
    // Convert all IDs to numbers
    const numericIds = productIds.map(id => parseInt(id));
    
    const result = await prisma.product.deleteMany({
      where: {
        id: {
          in: numericIds
        }
      }
    });

    return {
      deletedCount: result.count,
      productIds: numericIds
    };
  } catch (error) {
    console.error("Error in bulk delete products:", error);
    throw new Error("Database error occurred while bulk deleting products");
  }
}