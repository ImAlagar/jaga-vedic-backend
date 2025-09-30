import prisma from "../config/prisma.js";

export async function findCouponByCode(code) {
  return await prisma.coupon.findUnique({
    where: { 
      code: code.toUpperCase(),
      isActive: true
    }
  });
}

export async function findCouponById(id) {
  return await prisma.coupon.findUnique({
    where: { id: parseInt(id) },
    include: {
      couponUsages: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          order: {
            select: {
              id: true,
              totalAmount: true,
              createdAt: true
            }
          }
        }
      }
    }
  });
}

export async function hasUserUsedCoupon(couponId, userId) {
  const usage = await prisma.couponUsage.findFirst({
    where: {
      couponId: parseInt(couponId),
      userId: parseInt(userId)
    }
  });
  
  return !!usage;
}

export async function recordCouponUsage(usageData) {
  return await prisma.$transaction(async (tx) => {
    // Create coupon usage record
    const couponUsage = await tx.couponUsage.create({
      data: {
        couponId: usageData.couponId,
        userId: usageData.userId,
        orderId: usageData.orderId
      }
    });

    // Update coupon usage count
    await tx.coupon.update({
      where: { id: usageData.couponId },
      data: {
        usedCount: {
          increment: 1
        }
      }
    });

    // Update order with discount
    await tx.order.update({
      where: { id: usageData.orderId },
      data: {
        couponCode: usageData.couponCode,
        discountAmount: usageData.discountAmount,
        totalAmount: {
          decrement: usageData.discountAmount
        }
      }
    });

    return couponUsage;
  });
}

export async function createCoupon(couponData) {
  return await prisma.coupon.create({
    data: {
      ...couponData,
      code: couponData.code.toUpperCase()
    }
  });
}

export async function findAllCoupons(filters = {}) {
  const { page = 1, limit = 10, isActive, search } = filters;
  const skip = (page - 1) * limit;

  const where = {};
  
  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }
  
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            couponUsages: true
          }
        }
      }
    }),
    prisma.coupon.count({ where })
  ]);

  return {
    coupons,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

export async function updateCoupon(couponId, updateData) {
  return await prisma.coupon.update({
    where: { id: parseInt(couponId) },
    data: updateData
  });
}

export async function deleteCoupon(couponId) {
  return await prisma.coupon.delete({
    where: { id: parseInt(couponId) }
  });
}

export async function getCouponStats() {
  const totalCoupons = await prisma.coupon.count();
  const activeCoupons = await prisma.coupon.count({ where: { isActive: true } });
  const totalUsage = await prisma.couponUsage.count();
  
  const popularCoupons = await prisma.coupon.findMany({
    include: {
      _count: {
        select: {
          couponUsages: true
        }
      }
    },
    orderBy: {
      couponUsages: {
        _count: 'desc'
      }
    },
    take: 5
  });

  return {
    totalCoupons,
    activeCoupons,
    totalUsage,
    popularCoupons
  };
}