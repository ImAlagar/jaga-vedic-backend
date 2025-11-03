// src/dto/orderDto.js

export class CreateOrderDto {
  constructor({
    items,
    shippingAddress,
    orderImage = null,
    orderNotes = null,
    couponCode = null
  }) {
    this.items = items;
    this.shippingAddress = shippingAddress;
    this.orderImage = orderImage;
    this.orderNotes = orderNotes;
    this.couponCode = couponCode;
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

  // 🔥 NEW: Helper method to determine product type
  static determineProductType(item) {
    const category = item.category?.toLowerCase() || '';
    const productName = item.name?.toLowerCase() || '';
    const variantTitle = item.variantTitle?.toLowerCase() || item.variant?.title?.toLowerCase() || '';

     console.log('🔍 Determining product type:', { category, productName, variantTitle });

      if (category.includes('phone') || 
          category.includes('case') ||
          category.includes('accessory') ||
          productName.includes('case') || 
          productName.includes('iphone') ||
          productName.includes('samsung') ||
          variantTitle.includes('iphone') || 
          variantTitle.includes('samsung') ||
          variantTitle.includes('glossy') ||
          variantTitle.includes('matte')) {
        return 'PHONE_CASE';
      }
    
    if (category.includes('clothing') || 
        category.includes('wear') || 
        productName.includes('shirt') || 
        productName.includes('hoodie') ||
        productName.includes('sweatshirt') ||
        productName.includes('t-shirt')) {
      return 'CLOTHING';
    }
    
    if (category.includes('mug') || productName.includes('mug')) {
      return 'MUG';
    }
    
    if (category.includes('home') || category.includes('living')) {
      return 'HOME_LIVING';
    }
    
    return 'GENERAL';
  }

  // 🔥 NEW: Extract selections based on product type
  static extractSelectionsByProductType(item) {
    const productType = this.determineProductType(item);
    const variantTitle = item.variantTitle || item.variant?.title || '';
    const parts = variantTitle.split('/').map(part => part.trim());
    
  switch (productType) {
    case 'PHONE_CASE':
      // "iPhone 13 / Glossy / Without gift packaging"
      if (parts.length >= 2) {
        return {
          size: parts[0] || 'Standard',
          color: parts[1] || 'Default', 
          phoneModel: parts[0] || 'Standard Model',
          finishType: parts[1] || 'Standard Finish',
          productType: 'PHONE_CASE',
          displayText: `${parts[0]} • ${parts[1]}`
        };
      } else {
        // Fallback for malformed variant titles
        return {
          size: 'Standard',
          color: 'Default',
          phoneModel: 'Standard Model', 
          finishType: 'Standard Finish',
          productType: 'PHONE_CASE',
          displayText: 'Standard Model • Standard Finish'
        };
      }
      
    case 'CLOTHING':
      // "Large / Black" or similar
      if (parts.length >= 2) {
        return {
          size: parts[0] || 'Standard',
          color: parts[1] || 'Default',
          productType: 'CLOTHING',
          displayText: `Size: ${parts[0]} • Color: ${parts[1]}`
        };
      } else {
        return {
          size: item.selectedSize || 'Standard',
          color: item.selectedColor || 'Default',
          productType: 'CLOTHING',
          displayText: item.selectedSize && item.selectedColor ?
            `Size: ${item.selectedSize} • Color: ${item.selectedColor}` :
            (item.selectedSize ? `Size: ${item.selectedSize}` : 'Standard')
        };
      }
      case 'MUG':
        // "11oz"
        return {
          size: parts[0] || 'Standard',
          color: item.selectedColor || 'Default',
          productType: 'MUG',
          displayText: `Size: ${parts[0] || 'Standard'}`
        };
        
      case 'HOME_LIVING':
        // Could be "Large / Wood" or just "Large"
        return {
          size: parts[0] || 'Standard',
          color: parts[1] || 'Default',
          material: parts[1] || 'Standard Material',
          productType: 'HOME_LIVING',
          displayText: parts[1] ? 
            `Size: ${parts[0] || 'Standard'} • Material: ${parts[1]}` :
            `Size: ${parts[0] || 'Standard'}`
        };
        
      default:
        return {
          size: item.selectedSize || 'Standard',
          color: item.selectedColor || 'Default',
          productType: 'GENERAL',
          displayText: item.selectedSize && item.selectedColor ?
            `Size: ${item.selectedSize} • Color: ${item.selectedColor}` :
            (item.selectedSize ? `Size: ${item.selectedSize}` : 'Standard')
        };
    }
  }
}

export class OrderResponseDto {
  static fromOrder(order) {
    try {
      if (!order || !order.id) return null;
      
      const items = (order.items || []).map(item => {
        if (!item) return null;
        
        // 🔥 ENHANCED: Extract proper selections based on product type
        const selections = CreateOrderDto.extractSelectionsByProductType({
          ...item,
          variantTitle: item.variantTitle,
          variant: { title: item.variantTitle },
          category: item.product?.category,
          name: item.product?.name
        });

        return {
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          
          // 🔥 FLEXIBLE SELECTION FIELDS
          size: item.size,
          color: item.color,
          phoneModel: item.phoneModel,
          finishType: item.finishType,
          material: item.material,
          style: item.style,
          customOption1: item.customOption1,
          customOption2: item.customOption2,
          variantTitle: item.variantTitle,
          
          // 🔥 ENHANCED: Product type and display text
          productType: selections.productType,
          displayText: selections.displayText,
          selections: selections,
          
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            images: item.product.images || [],
            category: item.product.category
          } : null
        };
      }).filter(item => item !== null);

      const baseData = {
        id: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        subtotalAmount: order.subtotalAmount,
        shippingCost: order.shippingCost || 0,
        taxAmount: order.taxAmount || 0,
        taxRate: order.taxRate || 0,
        discountAmount: order.discountAmount || 0,
        currency: order.currency || 'USD',
        couponCode: order.couponCode || null,
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

  // 🔥 NEW: Get display text for order items in emails
  static getItemDisplayText(item) {
    if (!item) return 'Standard';
    
    // Use the enhanced selections if available
    if (item.selections && item.selections.displayText) {
      return item.selections.displayText;
    }
    
    // Fallback to individual fields
    if (item.phoneModel && item.finishType) {
      return `${item.phoneModel} • ${item.finishType}`;
    } else if (item.size && item.color) {
      return `Size: ${item.size} • Color: ${item.color}`;
    } else if (item.size) {
      return `Size: ${item.size}`;
    } else if (item.material) {
      return `Material: ${item.material}`;
    } else {
      return 'Standard';
    }
  }

  // 🔥 NEW: Get selection details for admin view
  static getItemSelectionDetails(item) {
    if (!item) return {};
    
    const details = {};
    
    if (item.phoneModel) details.phoneModel = item.phoneModel;
    if (item.finishType) details.finishType = item.finishType;
    if (item.size) details.size = item.size;
    if (item.color) details.color = item.color;
    if (item.material) details.material = item.material;
    if (item.style) details.style = item.style;
    if (item.customOption1) details.customOption1 = item.customOption1;
    if (item.customOption2) details.customOption2 = item.customOption2;
    
    return details;
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

// 🔥 NEW: Enhanced Order Item DTO for frontend display
export class OrderItemDisplayDto {
  static fromOrderItem(item) {
    if (!item) return null;
    
    const selections = CreateOrderDto.extractSelectionsByProductType(item);
    
    return {
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        images: item.product.images || [],
        category: item.product.category
      } : null,
      
      // Selection information
      displayText: selections.displayText,
      productType: selections.productType,
      selectionDetails: OrderResponseDto.getItemSelectionDetails(item),
      
      // Individual fields for backward compatibility
      size: item.size,
      color: item.color,
      phoneModel: item.phoneModel,
      finishType: item.finishType,
      material: item.material,
      variantTitle: item.variantTitle
    };
  }
}

// 🔥 NEW: DTO specifically for email templates
export class OrderEmailDto {
  static fromOrder(order) {
    const base = OrderResponseDto.fromOrder(order);
    if (!base) return null;

    // Enhance items with email-friendly display
    const emailItems = base.items.map(item => ({
      ...item,
      emailDisplayText: OrderResponseDto.getItemDisplayText(item),
      selectionDetails: OrderResponseDto.getItemSelectionDetails(item)
    }));

    return {
      ...base,
      items: emailItems,
      
      // Email-specific formatting
      formattedTotal: this.formatCurrency(base.totalAmount, base.currency),
      formattedSubtotal: this.formatCurrency(base.subtotalAmount, base.currency),
      formattedShipping: this.formatCurrency(base.shippingCost, base.currency),
      formattedTax: this.formatCurrency(base.taxAmount, base.currency),
      formattedDiscount: base.discountAmount ? 
        this.formatCurrency(base.discountAmount, base.currency) : null,
      
      orderDate: new Date(base.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  }

  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}