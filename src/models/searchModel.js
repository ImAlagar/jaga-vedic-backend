// src/models/searchModel.js
import prisma from "../config/prisma.js";

export async function searchAll(query, limit, offset) {
  const [products, users, orders] = await Promise.all([
    searchProducts(query, limit, offset),
    searchUsers(query, limit, offset),
    searchOrders(query, limit, offset)
  ]);

  return {
    products,
    users,
    orders,
    meta: {
      totalResults: products.total + users.total + orders.total,
      productsCount: products.total,
      usersCount: users.total,
      ordersCount: orders.total
    }
  };
}

export async function searchProducts(query, limit = 10, offset = 0, sortBy = "createdAt", sortOrder = "desc") {
  const where = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { category: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } }
    ],
    inStock: true
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        inStock: true,
        sku: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { [sortBy]: sortOrder },
      skip: offset,
      take: limit
    }),
    prisma.product.count({ where })
  ]);

  return {
    data: products,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: offset > 0
  };
}

export async function searchUsers(query, limit = 10, offset = 0, sortBy = "createdAt", sortOrder = "desc") {
  const where = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } }
    ],
    isActive: true
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { [sortBy]: sortOrder },
      skip: offset,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: users,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: offset > 0
  };
}

export async function searchOrders(query, limit = 10, offset = 0, sortBy = "createdAt", sortOrder = "desc") {
  // Try to parse query as order ID
  const queryAsId = parseInt(query);
  
  const where = {
    OR: [
      ...(isNaN(queryAsId) ? [] : [{ id: queryAsId }]),
      { 
        user: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        }
      },
      { razorpayPaymentId: { contains: query, mode: 'insensitive' } },
      { printifyOrderId: { contains: query, mode: 'insensitive' } }
    ]
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true,
                images: true
              }
            }
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip: offset,
      take: limit
    }),
    prisma.order.count({ where })
  ]);

  return {
    data: orders,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: offset > 0
  };
}

// Suggestions functions
export async function getProductSuggestions(query, limit = 5) {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ],
      inStock: true
    },
    select: {
      id: true,
      name: true,
      category: true,
      images: true,
      price: true,
      _count: {
        select: {
          orderItems: true  // Changed from 'orders' to 'orderItems'
        }
      }
    },
    take: limit,
    orderBy: [
      { 
        orderItems: {  // Changed from 'orders' to 'orderItems'
          _count: 'desc'
        }
      },
      { name: 'asc' }
    ]
  });

  return {
    type: 'products',
    suggestions: products.map(p => ({
      id: p.id,
      text: p.name,
      category: p.category,
      image: p.images?.[0],
      price: p.price,
      type: 'product',
      orderCount: p._count.orderItems
    }))
  };
}

export async function getCategorySuggestions(query, limit = 5) {
  const categories = await prisma.product.findMany({
    where: {
      category: {
        contains: query,
        mode: 'insensitive'
      },
      inStock: true
    },
    distinct: ['category'],
    select: {
      category: true,
      _count: {
        select: {
          orderItems: true  // Count order items instead of products
        }
      }
    },
    take: limit,
    orderBy: [
      {
        orderItems: {  // Order by order items count
          _count: 'desc'
        }
      }
    ]
  });

  return {
    type: 'categories',
    suggestions: categories.filter(c => c.category).map(c => ({
      text: c.category,
      orderCount: c._count.orderItems,
      type: 'category'
    }))
  };
}

export async function getUserSuggestions(query, limit = 5) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ],
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true
    },
    take: limit,
    orderBy: { name: 'asc' }
  });

  return {
    type: 'users',
    suggestions: users.map(u => ({
      id: u.id,
      text: u.name,
      email: u.email,
      type: 'user'
    }))
  };
}

export async function getAllSuggestions(query, limit = 5) {
  const [products, categories, users] = await Promise.all([
    getProductSuggestions(query, Math.ceil(limit / 3)),
    getCategorySuggestions(query, Math.ceil(limit / 3)),
    getUserSuggestions(query, Math.ceil(limit / 3))
  ]);

  return {
    type: 'all',
    suggestions: [
      ...products.suggestions,
      ...categories.suggestions,
      ...users.suggestions
    ].slice(0, limit)
  };
}

export async function getTrendingProducts(limit = 5) {
  const trending = await prisma.product.findMany({
    where: { inStock: true },
    select: {
      id: true,
      name: true,
      price: true,
      images: true,
      category: true,
      _count: {
        select: {
          orderItems: true  // Changed from 'orders' to 'orderItems'
        }
      }
    },
    orderBy: {
      orderItems: {  // Changed from 'orders' to 'orderItems'
        _count: 'desc'
      }
    },
    take: limit
  });

  return trending.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.images?.[0],
    category: p.category,
    orderCount: p._count.orderItems
  }));
}

// Advanced search with filters
export async function advancedProductSearch({
  query = '',
  categories = [],
  priceRange = { min: 0, max: 10000 },
  inStock = true,
  sortBy = 'popularity',
  sortOrder = 'desc',
  limit = 10,
  offset = 0
} = {}) {
  const where = {
    AND: [
      query ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      } : {},
      categories.length > 0 ? { category: { in: categories } } : {},
      { price: { gte: priceRange.min, lte: priceRange.max } },
      { inStock: inStock }
    ].filter(condition => Object.keys(condition).length > 0)
  };

  // Determine orderBy based on sortBy parameter
  let orderBy = {};
  switch (sortBy) {
    case 'popularity':
      orderBy = { orderItems: { _count: sortOrder } };
      break;
    case 'price':
      orderBy = { price: sortOrder };
      break;
    case 'name':
      orderBy = { name: sortOrder };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    default:
      orderBy = { orderItems: { _count: 'desc' } };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        inStock: true,
        sku: true,
        createdAt: true,
        _count: {
          select: {
            orderItems: true
          }
        }
      },
      orderBy,
      skip: offset,
      take: limit
    }),
    prisma.product.count({ where })
  ]);

  return {
    data: products,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: offset > 0,
    filters: {
      query,
      categories,
      priceRange,
      inStock,
      sortBy,
      sortOrder
    }
  };
}

// Get search analytics
export async function getSearchAnalytics(timeRange = '7d') {
  // This would typically integrate with an analytics service
  // For now, return some basic metrics
  const totalProducts = await prisma.product.count();
  const totalUsers = await prisma.user.count();
  const totalOrders = await prisma.order.count();
  
  const popularCategories = await prisma.product.groupBy({
    by: ['category'],
    _count: {
      id: true
    },
    where: {
      category: {
        not: null
      }
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });

  const trendingProducts = await getTrendingProducts(10);

  return {
    totals: {
      products: totalProducts,
      users: totalUsers,
      orders: totalOrders
    },
    popularCategories: popularCategories.map(cat => ({
      category: cat.category,
      productCount: cat._count.id
    })),
    trendingProducts
  };
}

// Search by category
export async function searchByCategory(category, limit = 10, offset = 0) {
  const where = {
    category: {
      equals: category,
      mode: 'insensitive'
    },
    inStock: true
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        inStock: true,
        _count: {
          select: {
            orderItems: true
          }
        }
      },
      orderBy: {
        orderItems: {
          _count: 'desc'
        }
      },
      skip: offset,
      take: limit
    }),
    prisma.product.count({ where })
  ]);

  return {
    data: products,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: offset > 0,
    category
  };
}

// Quick search for navbar/search bar
export async function quickSearch(query, limit = 8) {
  const [products, categories, users] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ],
        inStock: true
      },
      select: {
        id: true,
        name: true,
        category: true,
        images: true,
        price: true
      },
      take: Math.ceil(limit / 2),
      orderBy: {
        orderItems: {
          _count: 'desc'
        }
      }
    }),
    prisma.product.findMany({
      where: {
        category: {
          contains: query,
          mode: 'insensitive'
        },
        inStock: true
      },
      distinct: ['category'],
      select: {
        category: true
      },
      take: Math.ceil(limit / 4)
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: Math.ceil(limit / 4)
    })
  ]);

  return {
    products: products.map(p => ({
      ...p,
      type: 'product'
    })),
    categories: categories.filter(c => c.category).map(c => ({
      text: c.category,
      type: 'category'
    })),
    users: users.map(u => ({
      ...u,
      type: 'user'
    }))
  };
}