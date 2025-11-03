// src/services/geolocationService.js
import axios from 'axios';

export class GeolocationService {
  /**
   * Get user's country and currency from IP address
   */
  async getUserLocationFromIP(ipAddress = 'auto') {
    try {
      // Using ipapi.co (free tier available)
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
        timeout: 5000
      });
      
      const data = response.data;
      
      return {
        country: data.country_code || 'US',
        countryName: data.country_name || 'United States',
        currency: data.currency || 'USD',
        currencyName: data.currency_name || 'US Dollar',
        ip: data.ip,
        success: true
      };
      
    } catch (error) {
      console.warn('❌ Geolocation failed, using defaults:', error.message);
      return {
        country: 'US',
        countryName: 'United States',
        currency: 'USD',
        currencyName: 'US Dollar',
        ip: ipAddress,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract IP from request
   */
  getIPFromRequest(req) {
    try {
      return req.ip || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             req.connection?.socket?.remoteAddress || 
             'auto';
    } catch (error) {
      return 'auto';
    }
  }
}

export default new GeolocationService();