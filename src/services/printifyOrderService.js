// src/services/printifyOrderService.js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import logger from "../utils/logger.js";
import prisma from "../config/prisma.js";

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
      // Check if order was already sent to Printify
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderData.orderId },
        select: { 
          printifyOrderId: true, 
          printifyExternalId: true,
          fulfillmentStatus: true 
        }
      });

      // If order already exists in Printify, return the existing ID
      if (existingOrder?.printifyOrderId) {
        logger.info(`Order ${orderData.orderId} already exists in Printify: ${existingOrder.printifyOrderId}`);
        return { id: existingOrder.printifyOrderId, existing: true };
      }

      // Generate truly unique external_id
      const uniqueExternalId = existingOrder?.printifyExternalId || `order-${orderData.orderId}-${Date.now()}`;

      logger.info('Creating Printify order with data:', {
        orderId: orderData.orderId,
        externalId: uniqueExternalId,
        itemsCount: orderData.items?.length,
        hasShippingAddress: !!orderData.shippingAddress
      });

      const printifyOrder = {
        external_id: uniqueExternalId,
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
          country: orderData.shippingAddress.country,
          region: orderData.shippingAddress.state || orderData.shippingAddress.region,
          address1: orderData.shippingAddress.address1,
          address2: orderData.shippingAddress.address2 || '',
          city: orderData.shippingAddress.city,
          zip: orderData.shippingAddress.zipCode
        }
      };

      // Store external_id immediately to prevent duplicates on retry
      if (!existingOrder?.printifyExternalId) {
        await prisma.order.update({
          where: { id: orderData.orderId },
          data: { printifyExternalId: uniqueExternalId }
        });
      }

      const response = await printifyApi.post(
        `/shops/${this.shopId}/orders.json`,
        printifyOrder
      );

      logger.info(`✅ Printify order created successfully: ${response.data.id} for external_id: ${uniqueExternalId}`);
      return response.data;

    } catch (error) {
      logger.error('Printify order creation failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        orderId: orderData.orderId
      });
      
      // More specific error messages
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.errors?.reason?.includes('already exists')) {
          throw new Error(`Order already exists in Printify: ${errorData.errors.reason}`);
        }
        throw new Error(`Printify validation failed: ${errorData.message || 'Invalid order data'}`);
      }
      
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