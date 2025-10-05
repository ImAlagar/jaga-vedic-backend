// src/services/printifyOrderService.js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import logger from "../utils/logger.js"; // Add logger

const printifyApi = axios.create({
  baseURL: "https://api.printify.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
  },
});

export class PrintifyOrderService {
  constructor(shopId) {
    this.shopId = shopId;
  }

  async uploadImage(imagePath) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      
      const response = await printifyApi.post('/uploads/images.json', formData, {
        headers: formData.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      logger.error('Printify image upload error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  async createOrder(orderData) {
    try {
      // Log the order data we're sending for debugging
      logger.info('Creating Printify order with data:', {
        orderId: orderData.orderId,
        itemsCount: orderData.items?.length,
        hasShippingAddress: !!orderData.shippingAddress
      });

      const printifyOrder = {
        external_id: orderData.orderId.toString(),
        label: `Order-${orderData.orderId}`,
        line_items: orderData.items.map(item => ({
          product_id: item.printifyProductId,
          variant_id: parseInt(item.printifyVariantId),
          quantity: item.quantity,
          print_provider_id: item.printifyPrintProviderId,
          blueprint_id: item.printifyBlueprintId,
          sku: item.sku,
          ...(orderData.orderImage && {
            files: [{
              url: orderData.orderImage,
              type: 'default'
            }]
          })
        })),
        shipping_method: 1,
        send_shipping_notification: false,
        address_to: {
            first_name: orderData.shippingAddress.firstName,
            last_name: orderData.shippingAddress.lastName,
            email: orderData.shippingAddress.email,
            phone: orderData.shippingAddress.phone,
            country: orderData.shippingAddress.country, // 🔥 must be ISO2 code like "IN"
            region: orderData.shippingAddress.state || orderData.shippingAddress.region,
            address1: orderData.shippingAddress.address1,
            address2: orderData.shippingAddress.address2 || '',
            city: orderData.shippingAddress.city,
            zip: orderData.shippingAddress.zipCode
            }

      };

      // Log the final payload
      logger.debug('Printify order payload:', JSON.stringify(printifyOrder, null, 2));

      const response = await printifyApi.post(
        `/shops/${this.shopId}/orders.json`,
        printifyOrder
      );

      logger.info('Printify order created successfully:', response.data.id);
      return response.data;

    } catch (error) {
      logger.error('Printify order creation failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        orderData: {
          orderId: orderData.orderId,
          items: orderData.items?.map(item => ({
            productId: item.printifyProductId,
            variantId: item.printifyVariantId,
            printProviderId: item.printifyPrintProviderId,
            blueprintId: item.printifyBlueprintId
          }))
        }
      });
      
      throw new Error(`Order forwarding failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getOrderStatus(printifyOrderId) {
    try {
      const response = await printifyApi.get(
        `/shops/${this.shopId}/orders/${printifyOrderId}.json`
      );
      return response.data;
    } catch (error) {
      logger.error('Printify order status error:', error.response?.data || error.message);
      throw new Error(`Order status check failed: ${error.message}`);
    }
  }
}