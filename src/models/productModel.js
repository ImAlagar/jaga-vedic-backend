// models/productModel.js
import prisma from "../config/prisma.js";

export async function findProductById(id) {
  try {
    return await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        orders: {
          include: {
            order: {
              select: {
                id: true,
                paymentStatus: true,
                fulfillmentStatus: true,
                createdAt: true
              }
            }
          }
        }
      }
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

export async function findAllProducts(page = 1, limit = 10, search = '', category = '', inStock = null) {
  try {
    const skip = (page - 1) * limit;
    
    const whereClause = {
      AND: [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        },
        category ? { category: { equals: category, mode: 'insensitive' } } : {},
        inStock !== null ? { inStock: inStock } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          orders: {
            select: {
              quantity: true,
              order: {
                select: {
                  paymentStatus: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where: whereClause })
    ]);

    // Calculate sales data
    const productsWithSales = products.map(product => {
      const totalSold = product.orders
        .filter(orderItem => orderItem.order.paymentStatus === 'SUCCEEDED')
        .reduce((sum, orderItem) => sum + orderItem.quantity, 0);
      
      return {
        ...product,
        totalSold,
        orders: undefined // Remove orders from response
      };
    });

    return {
      products: productsWithSales,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  } catch (error) {
    console.error("Error finding all products:", error);
    throw new Error("Database error occurred");
  }
}

export async function createProduct(data) {
  try {
    return await prisma.product.create({
      data: {
        ...data,
        images: data.images || [] // Ensure images is always an array
      }
    });
  } catch (error) {
    console.error("Error creating product:", error);
    throw new Error("Failed to create product");
  }
}

export async function updateProduct(id, data) {
  try {
    return await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error updating product:", error);
    throw new Error("Failed to update product");
  }
}

export async function deleteProduct(id) {
  try {
    return await prisma.product.delete({
      where: { id: parseInt(id) }
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product");
  }
}

export async function toggleProductStock(id, inStock) {
  try {
    return await prisma.product.update({
      where: { id: parseInt(id) },
      data: { inStock }
    });
  } catch (error) {
    console.error("Error toggling product stock:", error);
    throw new Error("Failed to update product stock status");
  }
}

export async function getProductCategories() {
  try {
    const categories = await prisma.product.findMany({
      where: {
        category: {
          not: null
        }
      },
      select: {
        category: true
      },
      distinct: ['category']
    });
    
    return categories.map(cat => cat.category).filter(Boolean);
  } catch (error) {
    console.error("Error getting product categories:", error);
    throw new Error("Failed to fetch product categories");
  }
}