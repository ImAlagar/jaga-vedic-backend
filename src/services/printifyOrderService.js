// src/services/printifyOrderService.js
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import logger from "../utils/logger.js";

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
            country: orderData.shippingAddress.country,
            region: orderData.shippingAddress.state || orderData.shippingAddress.region,
            address1: orderData.shippingAddress.address1,
            address2: orderData.shippingAddress.address2 || '',
            city: orderData.shippingAddress.city,
            zip: orderData.shippingAddress.zipCode
        }
      };

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

  async getOrder(printifyOrderId) {
    try {
      logger.info(`Fetching Printify order: ${printifyOrderId}`);
      
      const url = `/shops/${this.shopId}/orders/${printifyOrderId}.json`;
      logger.debug(`Printify API URL: ${url}`);
      
      const response = await printifyApi.get(url);

      logger.info(`✅ Successfully fetched Printify order: ${printifyOrderId}`, {
        status: response.data.status,
        external_id: response.data.external_id,
        shipments: response.data.shipments?.length || 0
      });
      
      return response.data;
    } catch (error) {
      logger.error('❌ Printify get order error:', {
        printifyOrderId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      
      if (error.response?.status === 404) {
        throw new Error(`Printify order not found: ${printifyOrderId}. This order may not exist in Printify or was deleted.`);
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Printify API credentials. Please check your PRINTIFY_API_KEY.');
      } else if (error.response?.status === 403) {
        throw new Error('Access forbidden. Please check your shop ID and API permissions.');
      } else {
        throw new Error(`Failed to fetch Printify order: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  async getOrders(page = 1, limit = 50) {
    try {
      const response = await printifyApi.get(
        `/shops/${this.shopId}/orders.json`,
        {
          params: { page, limit }
        }
      );

      logger.info(`✅ Fetched ${response.data.data?.length || 0} Printify orders`);
      return {
        data: response.data.data,
        current_page: response.data.current_page,
        total: response.data.total,
        last_page: response.data.last_page
      };
    } catch (error) {
      logger.error('❌ Failed to fetch Printify orders:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(`Failed to fetch Printify orders: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateOrderStatus(printifyOrderId, status) {
    try {
      const response = await printifyApi.patch(
        `/shops/${this.shopId}/orders/${printifyOrderId}.json`,
        { status }
      );

      logger.info(`✅ Updated Printify order ${printifyOrderId} status to: ${status}`);
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to update Printify order status:', {
        printifyOrderId,
        status,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to update Printify order status: ${error.response?.data?.message || error.message}`);
    }
  }

  async sendToProduction(printifyOrderId) {
    try {
      const response = await printifyApi.post(
        `/shops/${this.shopId}/orders/${printifyOrderId}/send_to_production.json`
      );

      logger.info(`✅ Sent Printify order ${printifyOrderId} to production`);
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to send order to production:', {
        printifyOrderId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to send order to production: ${error.response?.data?.message || error.message}`);
    }
  }

  async cancelOrder(printifyOrderId) {
    try {
      const response = await printifyApi.post(
        `/shops/${this.shopId}/orders/${printifyOrderId}/cancel.json`
      );

      logger.info(`✅ Cancelled Printify order: ${printifyOrderId}`);
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to cancel Printify order:', {
        printifyOrderId,
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to cancel Printify order: ${error.response?.data?.message || error.message}`);
    }
  }

  async calculateShipping(orderData) {
    try {
      const response = await printifyApi.post(
        `/shops/${this.shopId}/orders/shipping.json`,
        orderData
      );

      return response.data;
    } catch (error) {
      logger.error('❌ Failed to calculate shipping:', {
        error: error.response?.data || error.message
      });
      throw new Error(`Failed to calculate shipping: ${error.response?.data?.message || error.message}`);
    }
  }

  async getOrderStatus(printifyOrderId) {
    return this.getOrder(printifyOrderId);
  }

  async testConnection() {
    try {
      const response = await printifyApi.get(`/shops/${this.shopId}.json`);
      logger.info('✅ Printify connection test successful');
      return {
        success: true,
        shop: response.data,
        message: 'Successfully connected to Printify API'
      };
    } catch (error) {
      logger.error('❌ Printify connection test failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to connect to Printify API'
      };
    }
  }

  async listAllOrders(limit = 50) {
    try {
      const response = await printifyApi.get(
        `/shops/${this.shopId}/orders.json`,
        { params: { limit } }
      );

      const orders = response.data.data || [];
      logger.info(`✅ Found ${orders.length} orders in Printify`);
      
      return {
        success: true,
        orders: orders.map(order => ({
          id: order.id,
          external_id: order.external_id,
          label: order.label,
          status: order.status,
          created_at: order.created_at
        })),
        total: response.data.total
      };
    } catch (error) {
      logger.error('❌ Failed to list Printify orders:', error.message);
      return {
        success: false,
        error: error.message,
        orders: []
      };
    }
  }
}