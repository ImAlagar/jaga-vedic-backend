// src/dto/orderDto.js
export class CreateOrderDto {
  constructor({
    items,
    shippingAddress,
    orderImage = null,
    orderNotes = null,
    couponCode = null  // ✅ Add couponCode
  }) {
    this.items = items;
    this.shippingAddress = shippingAddress;
    this.orderImage = orderImage;
    this.orderNotes = orderNotes;
    this.couponCode = couponCode; // ✅ Include coupon code
  }

  validate() {
    const errors = [];
    
    if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
      errors.push('Order must contain at least one item');
    } else {
      this.items.forEach((item, index) => {
        if (!item.productId) {
          errors.push(`Item ${index + 1}: Product ID is required`);
        }
        if (!item.quantity || item.quantity < 1) {
          errors.push(`Item ${index + 1}: Quantity must be at least 1`);
        }
        if (!item.variantId) {
          errors.push(`Item ${index + 1}: Variant ID is required`);
        }
      });
    }

    if (!this.shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      const requiredFields = ['firstName', 'email', 'phone', 'address1', 'city', 'country', 'zipCode'];
      requiredFields.forEach(field => {
        if (!this.shippingAddress[field]) {
          errors.push(`Shipping address ${field} is required`);
        }
      });
    }

    return errors;
  }
}
// src/dto/orderDto.js
export class OrderResponseDto {
  static fromOrder(order) {
    try {
      if (!order || !order.id) return null;
      
      const items = (order.items || []).map(item => {
        if (!item) return null;
        return {
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            images: item.product.images || []
          } : null
        };
      }).filter(item => item !== null);

      const baseData = {
        id: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        subtotalAmount: order.subtotalAmount,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingAddress: order.shippingAddress || {},
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        printifyOrderId: order.printifyOrderId,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        carrier: order.carrier,
        orderNotes: order.orderNotes,
        orderImage: order.orderImage,
        items: items,
        user: order.user ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email
        } : null
      };

      // Add cancellation and refund data if order is cancelled
      const cancellationData = order.fulfillmentStatus === 'CANCELLED' ? {
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        cancelledBy: order.cancelledBy,
        refundStatus: order.refundStatus,
        refundAmount: order.refundAmount,
        refundRequestedAt: order.refundRequestedAt,
        refundProcessedAt: order.refundProcessedAt,
        razorpayRefundId: order.razorpayRefundId,
        refunds: order.refunds || []
      } : {};

      return {
        ...baseData,
        ...cancellationData
      };
    } catch (error) {
      console.error('Error mapping order:', error);
      return null;
    }
  }
}

export class CancelledOrderDto {
  static fromOrder(order) {
    const base = OrderResponseDto.fromOrder(order);
    if (!base) return null;

    const latestRefund = order.refunds && order.refunds.length > 0 ? order.refunds[0] : null;

    return {
      ...base,
      cancellationDetails: {
        reason: order.cancellationReason,
        cancelledAt: order.cancelledAt,
        cancelledBy: order.cancelledBy,
        refundStatus: order.refundStatus,
        refundAmount: order.refundAmount,
        printifyStatus: order.printifyStatus,
        requiresAction: order.refundStatus === 'PENDING' || order.refundStatus === 'FAILED'
      },
      refundDetails: latestRefund ? {
        refundId: latestRefund.refundId,
        amount: latestRefund.amount,
        status: latestRefund.status,
        reason: latestRefund.reason,
        processedAt: latestRefund.processedAt
      } : null
    };
  }
}


export class OrderTrackingDto {
  static fromOrder(order) {
    const base = OrderResponseDto.fromOrder(order);
    if (!base) return null;

    return {
      ...base,
      tracking: {
        number: order.trackingNumber,
        url: order.trackingUrl,
        carrier: order.carrier,
        status: order.fulfillmentStatus,
        printifyStatus: order.printifyStatus,
        lastUpdated: order.updatedAt,
        estimatedDelivery: order.estimatedDelivery,
        shipmentDate: order.shipmentDate
      },
      timeline: this.generateTimeline(order)
    };
  }

  static generateTimeline(order) {
    const timeline = [];
    
    timeline.push({
      status: 'PLACED',
      title: 'Order Placed',
      description: 'Your order has been received',
      date: order.createdAt,
      completed: true
    });

    if (order.paymentStatus === 'SUCCEEDED') {
      timeline.push({
        status: 'PAID',
        title: 'Payment Confirmed',
        description: 'Payment has been processed successfully',
        date: order.updatedAt,
        completed: true
      });
    }

    if (['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.fulfillmentStatus)) {
      timeline.push({
        status: 'PROCESSING',
        title: 'Processing Order',
        description: 'Your order is being prepared for shipment',
        date: order.updatedAt,
        completed: true
      });
    }

    if (['SHIPPED', 'DELIVERED'].includes(order.fulfillmentStatus)) {
      timeline.push({
        status: 'SHIPPED',
        title: 'Shipped',
        description: order.trackingNumber 
          ? `Your order has been shipped with tracking number ${order.trackingNumber}`
          : 'Your order has been shipped',
        date: order.shipmentDate || order.updatedAt,
        completed: true,
        trackingUrl: order.trackingUrl
      });
    }

    if (order.fulfillmentStatus === 'DELIVERED') {
      timeline.push({
        status: 'DELIVERED',
        title: 'Delivered',
        description: 'Your order has been delivered',
        date: order.updatedAt,
        completed: true
      });
    }

    const currentStatus = order.fulfillmentStatus;
    if (currentStatus === 'PLACED') {
      timeline.push({
        status: 'PROCESSING',
        title: 'Processing',
        description: 'We are preparing your order',
        date: null,
        completed: false,
        current: true
      });
    } else if (currentStatus === 'PROCESSING') {
      timeline.push({
        status: 'SHIPPED',
        title: 'Shipping',
        description: 'Your order will be shipped soon',
        date: null,
        completed: false,
        current: true
      });
    } else if (currentStatus === 'SHIPPED') {
      timeline.push({
        status: 'DELIVERED',
        title: 'Out for Delivery',
        description: 'Your order is on its way to you',
        date: null,
        completed: false,
        current: true
      });
    }

    return timeline;
  }
}