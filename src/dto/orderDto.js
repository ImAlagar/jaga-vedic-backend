// src/dto/orderDto.js
export class CreateOrderDto {
  constructor({
    items,
    shippingAddress,
    orderImage = null,
    orderNotes = null
  }) {
    this.items = items;
    this.shippingAddress = shippingAddress;
    this.orderImage = orderImage;
    this.orderNotes = orderNotes;
    this.subtotalAmount = subtotalAmount; // Add this
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
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'country', 'zipCode'];
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
                    product: item.product ? {
                        id: item.product.id,
                        name: item.product.name,
                        price: item.product.price,
                        images: item.product.images || []
                    } : null
                };
            }).filter(item => item !== null);

            return {
                id: order.id,
                userId: order.userId,
                totalAmount: order.totalAmount,
                paymentStatus: order.paymentStatus,
                fulfillmentStatus: order.fulfillmentStatus,
                shippingAddress: order.shippingAddress || {},
                createdAt: order.createdAt,
                printifyOrderId: order.printifyOrderId,
                orderNotes: order.orderNotes,
                items: items
            };
        } catch (error) {
            console.error('Error mapping order:', error);
            return null;
        }
    }
}