import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";

export async function createReviewService(reviewData, userId) {
  try {


    // Check if user has purchased the product
    const order = await prisma.order.findFirst({
      where: {
        userId: parseInt(userId),
        id: parseInt(reviewData.orderId),
        items: {
          some: {
            productId: parseInt(reviewData.productId)
          }
        },
        paymentStatus: 'SUCCEEDED'
      }
    });



    if (!order) {
      throw new Error('You can only review products you have purchased');
    }

    // Check if review already exists for this order and product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId_orderId: {
          userId: parseInt(userId),
          productId: parseInt(reviewData.productId),
          orderId: parseInt(reviewData.orderId)
        }
      }
    });

    if (existingReview) {
      throw new Error('You have already reviewed this product from this order');
    }

    // Create review with verified purchase status
    const review = await prisma.review.create({
      data: {
        userId: parseInt(userId),
        productId: parseInt(reviewData.productId),
        orderId: parseInt(reviewData.orderId),
        rating: parseInt(reviewData.rating),
        title: reviewData.title,
        comment: reviewData.comment,
        images: reviewData.images || [],
        isVerified: true,
        isApproved: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update product review summary
    await updateProductReviewSummary(reviewData.productId);

    logger.info(`Review created for product ${reviewData.productId} by user ${userId}`);

    return review;
  } catch (error) {
    logger.error(`Create review service error: ${error.message}`);
    throw error;
  }
}

export async function getProductReviewsService(productId, query = {}) {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const rating = query.rating ? parseInt(query.rating) : null;
    const sortBy = query.sortBy || 'recent';

    // Build filters
    const filters = {
      productId: parseInt(productId),
      isApproved: true
    };
    
    if (rating) {
      filters.rating = rating;
    }

    const skip = (page - 1) * limit;

    // Handle sorting
    let orderBy = [];
    switch (sortBy) {
      case 'helpful':
        orderBy = [{ isHelpful: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'rating_high':
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'rating_low':
        orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }];
        break;
      default: // recent
        orderBy = [{ createdAt: 'desc' }];
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: filters,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          helpfulVotes: {
            select: {
              userId: true,
              isHelpful: true
            }
          },
          order: {
            select: {
              id: true,
              createdAt: true
            }
          }
        },
        orderBy: orderBy,
        skip: skip,
        take: limit
      }),
      prisma.review.count({ where: filters })
    ]);

    // Get review summary
    const summary = await getReviewStats(parseInt(productId));

    return {
      reviews,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      summary
    };
  } catch (error) {
    logger.error(`Get product reviews service error: ${error.message}`);
    throw error;
  }
}

export async function updateReviewService(reviewId, updateData, userId) {
  try {
    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!existingReview) {
      throw new Error('Review not found');
    }

    if (existingReview.userId !== parseInt(userId)) {
      throw new Error('You can only update your own reviews');
    }

    // Prevent updating after 30 days
    const reviewAge = Date.now() - existingReview.createdAt.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    if (reviewAge > thirtyDays) {
      throw new Error('Reviews can only be updated within 30 days of creation');
    }

    const updatedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        ...updateData,
        isApproved: false // Require re-approval after update
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update product review summary
    await updateProductReviewSummary(updatedReview.productId);

    return updatedReview;
  } catch (error) {
    logger.error(`Update review service error: ${error.message}`);
    throw error;
  }
}

export async function deleteReviewService(reviewId, userId, isAdmin = false) {
  try {
    const existingReview = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) }
    });
    
    if (!existingReview) {
      throw new Error('Review not found');
    }

    // Check if user owns the review or is admin
    if (!isAdmin && existingReview.userId !== parseInt(userId)) {
      throw new Error('You can only delete your own reviews');
    }

    const productId = existingReview.productId;
    await prisma.review.delete({
      where: { id: parseInt(reviewId) }
    });

    // Update product review summary
    await updateProductReviewSummary(productId);

    logger.info(`Review ${reviewId} deleted by user ${userId}`);

    return { success: true, message: 'Review deleted successfully' };
  } catch (error) {
    logger.error(`Delete review service error: ${error.message}`);
    throw error;
  }
}

export async function toggleHelpfulVoteService(reviewId, userId, isHelpful) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) }
    });
    
    if (!review) {
      throw new Error('Review not found');
    }

    // User cannot vote on their own review
    if (review.userId === parseInt(userId)) {
      throw new Error('You cannot vote on your own review');
    }

    // Check if vote exists
    const existingVote = await prisma.helpfulVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId: parseInt(reviewId),
          userId: parseInt(userId)
        }
      }
    });

    if (existingVote) {
      // Update existing vote
      await prisma.helpfulVote.update({
        where: {
          reviewId_userId: {
            reviewId: parseInt(reviewId),
            userId: parseInt(userId)
          }
        },
        data: { isHelpful }
      });
    } else {
      // Create new vote
      await prisma.helpfulVote.create({
        data: {
          reviewId: parseInt(reviewId),
          userId: parseInt(userId),
          isHelpful
        }
      });
    }

    // Update helpful count on review
    const helpfulVotes = await prisma.helpfulVote.count({
      where: { 
        reviewId: parseInt(reviewId),
        isHelpful: true 
      }
    });

    await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: { isHelpful: helpfulVotes }
    });

    // Update product review summary
    await updateProductReviewSummary(review.productId);

    return { success: true, helpfulCount: helpfulVotes };
  } catch (error) {
    logger.error(`Toggle helpful vote service error: ${error.message}`);
    throw error;
  }
}

export async function reportReviewService(reviewId, userId, reason) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) }
    });
    
    if (!review) {
      throw new Error('Review not found');
    }

    // User cannot report their own review
    if (review.userId === parseInt(userId)) {
      throw new Error('You cannot report your own review');
    }

    const updatedReview = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        isReported: true,
        reportReason: reason
      }
    });

    logger.info(`Review ${reviewId} reported by user ${userId}`);

    return updatedReview;
  } catch (error) {
    logger.error(`Report review service error: ${error.message}`);
    throw error;
  }
}

export async function getPendingReviewsService(page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;
    
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: { isApproved: false },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where: { isApproved: false } })
    ]);

    return {
      reviews,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  } catch (error) {
    logger.error(`Get pending reviews service error: ${error.message}`);
    throw error;
  }
}

export async function approveReviewService(reviewId) {
  try {
    const review = await prisma.review.update({
      where: { id: parseInt(reviewId) },
      data: {
        isApproved: true,
        isReported: false,
        reportReason: null
      }
    });

    // Update product review summary
    await updateProductReviewSummary(review.productId);

    logger.info(`Review ${reviewId} approved by admin`);

    return review;
  } catch (error) {
    logger.error(`Approve review service error: ${error.message}`);
    throw error;
  }
}

export async function rejectReviewService(reviewId, reason) {
  try {
    const review = await prisma.review.delete({
      where: { id: parseInt(reviewId) }
    });

    logger.info(`Review ${reviewId} rejected by admin: ${reason}`);

    return { success: true, message: 'Review rejected and deleted' };
  } catch (error) {
    logger.error(`Reject review service error: ${error.message}`);
    throw error;
  }
}

export async function getUserReviewsService(userId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;
    
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: { userId: parseInt(userId) },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true
            }
          },
          order: {
            select: {
              id: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where: { userId: parseInt(userId) } })
    ]);

    return {
      reviews,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  } catch (error) {
    logger.error(`Get user reviews service error: ${error.message}`);
    throw error;
  }
}

// Helper functions
async function getReviewStats(productId) {
  const reviews = await prisma.review.findMany({
    where: { 
      productId: parseInt(productId),
      isApproved: true 
    },
    select: {
      rating: true,
      isHelpful: true
    }
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      totalHelpfulVotes: 0
    };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    ratingDistribution[review.rating]++;
  });

  const totalHelpfulVotes = reviews.reduce((sum, review) => sum + review.isHelpful, 0);

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution,
    totalHelpfulVotes
  };
}

async function updateProductReviewSummary(productId) {
  const stats = await getReviewStats(productId);
  
  return await prisma.productReviewSummary.upsert({
    where: { productId: parseInt(productId) },
    update: {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      ratingDistribution: stats.ratingDistribution,
      totalHelpfulVotes: stats.totalHelpfulVotes,
      lastCalculatedAt: new Date()
    },
    create: {
      productId: parseInt(productId),
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      ratingDistribution: stats.ratingDistribution,
      totalHelpfulVotes: stats.totalHelpfulVotes
    }
  });
}

export async function getAdminReviewsService(filters = {}) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      rating = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = filters;

    // Build where clause
    const where = {};

    // Status filter
    if (status !== 'all') {
      switch (status) {
        case 'pending':
          where.isApproved = false;
          where.isReported = false;
          break;
        case 'approved':
          where.isApproved = true;
          break;
        case 'rejected':
          where.isApproved = false;
          where.isReported = true;
          break;
        case 'reported':
          where.isReported = true;
          break;
      }
    }

    // Rating filter
    if (rating !== 'all') {
      where.rating = parseInt(rating);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          comment: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          product: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    const skip = (page - 1) * limit;

    // Handle sorting
    let orderBy = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder };
        break;
      case 'helpful':
        orderBy = { isHelpful: sortOrder };
        break;
      case 'user':
        orderBy = { user: { name: sortOrder } };
        break;
      case 'product':
        orderBy = { product: { name: sortOrder } };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              category: true
            }
          },
          order: {
            select: {
              id: true,
              createdAt: true
            }
          },
          helpfulVotes: {
            select: {
              userId: true,
              isHelpful: true
            }
          },
          _count: {
            select: {
              helpfulVotes: true
            }
          }
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.review.count({ where })
    ]);

    // Get review statistics
    const stats = await getAdminReviewStats();

    return {
      reviews,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit),
      stats
    };
  } catch (error) {
    logger.error(`Get admin reviews service error: ${error.message}`);
    throw error;
  }
}

export async function getAdminReviewStats() {
  try {
    const [
      totalReviews,
      pendingReviews,
      approvedReviews,
      reportedReviews,
      ratingStats
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({
        where: {
          isApproved: false,
          isReported: false
        }
      }),
      prisma.review.count({
        where: { isApproved: true }
      }),
      prisma.review.count({
        where: { isReported: true }
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { isApproved: true },
        _count: {
          rating: true
        }
      })
    ]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingStats.forEach(stat => {
      ratingDistribution[stat.rating] = stat._count.rating;
    });

    // Calculate average rating
    const totalRatings = ratingStats.reduce((sum, stat) => sum + (stat.rating * stat._count.rating), 0);
    const totalRatedReviews = ratingStats.reduce((sum, stat) => sum + stat._count.rating, 0);
    const averageRating = totalRatedReviews > 0 ? (totalRatings / totalRatedReviews).toFixed(1) : 0;

    return {
      total: totalReviews,
      pending: pendingReviews,
      approved: approvedReviews,
      reported: reportedReviews,
      averageRating: parseFloat(averageRating),
      ratingDistribution
    };
  } catch (error) {
    logger.error(`Get admin review stats error: ${error.message}`);
    throw error;
  }
}

export async function bulkApproveReviewsService(reviewIds) {
  try {
    const result = await prisma.review.updateMany({
      where: {
        id: {
          in: reviewIds.map(id => parseInt(id))
        }
      },
      data: {
        isApproved: true,
        isReported: false,
        reportReason: null
      }
    });

    // Update product review summaries
    const updatedReviews = await prisma.review.findMany({
      where: {
        id: {
          in: reviewIds.map(id => parseInt(id))
        }
      },
      select: { productId: true }
    });

    const productIds = [...new Set(updatedReviews.map(review => review.productId))];
    await Promise.all(productIds.map(productId => updateProductReviewSummary(productId)));

    logger.info(`Bulk approved ${result.count} reviews`);

    return { success: true, count: result.count };
  } catch (error) {
    logger.error(`Bulk approve reviews service error: ${error.message}`);
    throw error;
  }
}

export async function bulkDeleteReviewsService(reviewIds) {
  try {
    // Get product IDs before deletion for summary updates
    const reviewsToDelete = await prisma.review.findMany({
      where: {
        id: {
          in: reviewIds.map(id => parseInt(id))
        }
      },
      select: { productId: true }
    });

    const productIds = [...new Set(reviewsToDelete.map(review => review.productId))];

    const result = await prisma.review.deleteMany({
      where: {
        id: {
          in: reviewIds.map(id => parseInt(id))
        }
      }
    });

    // Update product review summaries
    await Promise.all(productIds.map(productId => updateProductReviewSummary(productId)));

    logger.info(`Bulk deleted ${result.count} reviews`);

    return { success: true, count: result.count };
  } catch (error) {
    logger.error(`Bulk delete reviews service error: ${error.message}`);
    throw error;
  }
}