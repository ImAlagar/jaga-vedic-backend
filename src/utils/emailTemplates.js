// utils/emailTemplates.js

/**
 * Currency conversion helper
 * Implement with your preferred currency API
 */
async function convertCurrency(amount, fromCurrency = 'USD', toCurrency = 'USD') {
  try {
    // Implementation example for ExchangeRate-API
    if (toCurrency === 'USD') {
      return amount.toFixed(2); // Default to USD
    }
    
    // Uncomment and implement with your preferred API:
    /*
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const data = await response.json();
    const rate = data.rates[toCurrency] || 1;
    return (amount * rate).toFixed(2);
    */
    
    return amount.toFixed(2); // Fallback
  } catch (error) {
    console.error('Currency conversion failed:', error);
    return amount.toFixed(2);
  }
}

/**
 * Helper function to format product details
 * Only shows size/color if they exist and are valid
 */
function formatProductDetails(item) {
  const details = [];
  
  // Check if size exists and is not default/empty values
  if (item.size && 
      item.size !== 'N/A' && 
      item.size !== 'One Size' && 
      item.size !== 'Default' && 
      item.size.trim() !== '') {
    details.push(`Size: ${item.size}`);
  }
  
  // Check if color exists and is not default/empty values
  if (item.color && 
      item.color !== 'N/A' && 
      item.color !== 'Default' && 
      item.color.trim() !== '') {
    details.push(`Color: ${item.color}`);
  }
  
  return details.length > 0 ? `<br><small style="color: #666;">${details.join(' | ')}</small>` : '';
}

/**
 * Get currency symbol based on currency code
 */
function getCurrencySymbol(currency) {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$'
  };
  return symbols[currency] || '$';
}

// =============================================================================
// RESPONSIVE TABLE STYLES & HELPERS
// =============================================================================

/**
 * Responsive table wrapper for mobile devices
 */
function responsiveTableWrapper(content) {
  return `
    <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
      ${content}
    </div>
  `;
}

/**
 * Mobile-friendly table styles
 */
const responsiveTableStyles = `
  <style>
    @media only screen and (max-width: 600px) {
      .responsive-table {
        width: 100% !important;
        min-width: 300px;
      }
      .responsive-table table {
        width: 100% !important;
      }
      .responsive-table th,
      .responsive-table td {
        padding: 8px 6px !important;
        font-size: 14px !important;
      }
      .responsive-table .mobile-hide {
        display: none !important;
      }
      .responsive-table .mobile-stack {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
        padding: 10px 0 !important;
      }
      .mobile-order-item {
        border-bottom: 1px solid #eee;
        padding: 15px 0;
      }
      .mobile-order-item:last-child {
        border-bottom: none;
      }
    }
  </style>
`;

// =============================================================================
// AUTHENTICATION & ACCOUNT EMAILS
// =============================================================================

/**
 * Password Reset Request Email
 */
export function getPasswordResetEmail(resetUrl, adminName = 'Admin') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request - Agumiya Collections</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .button { display: inline-block; padding: 14px 28px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        .security-note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .code { font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .button { display: block; padding: 12px 20px; text-align: center; margin: 15px 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Agumiya Collections Admin Portal</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-top: 0;">Hello ${adminName},</h2>
          
          <p>We received a request to reset your password for your <strong>Agumiya Collections</strong> admin account.</p>
          
          <p>Click the button below to securely reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Your Password</a>
          </div>
          
          <div class="security-note">
            <strong>⚠️ Security Notice:</strong> 
            <p>This password reset link will <strong>expire in 10 minutes</strong> for security reasons.</p>
            <p>If you didn't request this reset, please ignore this email or contact our support team immediately.</p>
          </div>
          
          <p><strong>Having trouble?</strong> If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="code">${resetUrl}</div>
          
          <p>For your security, never share this link with anyone. Our support team will never ask for your password.</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>If you need assistance, contact our support team at <a href="mailto:support@agumiyacollections.com" style="color: #6c757d;">support@agumiyacollections.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Password Reset Success Email
 */
export function getPasswordResetSuccessEmail(adminName = 'Admin') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful - Agumiya Collections</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success-icon { font-size: 48px; margin-bottom: 20px; }
        .security-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .success-icon { font-size: 36px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✅</div>
          <h1 style="margin: 0; font-size: 28px;">Password Reset Successful</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account security has been updated</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-top: 0;">Hello ${adminName},</h2>
          
          <p>Your password has been successfully reset for your <strong>Agumiya Collections</strong> admin account.</p>
          
          <div class="security-info">
            <h3 style="color: #28a745; margin-top: 0;">🔒 Account Security Confirmed</h3>
            <p>The password reset was completed successfully on <strong>${new Date().toLocaleString()}</strong>.</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Important Security Notice:</strong>
            <p>If you did not initiate this password change, please contact our support team immediately to secure your account.</p>
          </div>
          
          <p><strong>Next steps:</strong></p>
          <ul>
            <li>You can now log in with your new password</li>
            <li>Make sure to use a strong, unique password</li>
            <li>Consider enabling two-factor authentication for added security</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>If you have any concerns about your account security, contact us immediately at <a href="mailto:support@agumiyacollections.com" style="color: #6c757d;">support@agumiyacollections.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Welcome Email Template
 */
export function getWelcomeEmail(name, verificationUrl = null) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Agumiya Collections!</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .button { display: inline-block; padding: 14px 28px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }
        .feature { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .features { grid-template-columns: 1fr; gap: 10px; }
          .button { display: block; padding: 12px 20px; text-align: center; margin: 15px 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">🎉 Welcome to Agumiya Collections!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">We're thrilled to have you join our community</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
          
          <p>Thank you for registering with <strong>Agumiya Collections</strong>! We're excited to have you as part of our fashion community.</p>
             
          <div class="features">
            <div class="feature">
              <div style="font-size: 24px; margin-bottom: 10px;">🚚</div>
              <strong>Fast Shipping</strong>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Free shipping on orders over $50</p>
            </div>
            <div class="feature">
              <div style="font-size: 24px; margin-bottom: 10px;">💎</div>
              <strong>Premium Quality</strong>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Handpicked collections</p>
            </div>
            <div class="feature">
              <div style="font-size: 24px; margin-bottom: 10px;">🔒</div>
              <strong>Secure Shopping</strong>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Your data is protected</p>
            </div>
            <div class="feature">
              <div style="font-size: 24px; margin-bottom: 10px;">💝</div>
              <strong>Exclusive Offers</strong>
              <p style="margin: 5px 0 0 0; font-size: 12px;">Member-only discounts</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL}/shop" class="button" style="background: #28a745;">Start Shopping Now</a>
          </div>
          
          <p><strong>Get ready to explore:</strong></p>
          <ul>
            <li>Latest fashion trends and collections</li>
            <li>Exclusive member discounts and early access</li>
            <li>Personalized shopping recommendations</li>
            <li>Fast and reliable delivery</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>This is an automated welcome message. Need help? Contact us at <a href="mailto:support@agumiyacollections.com" style="color: #6c757d;">support@agumiyacollections.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// =============================================================================
// ORDER MANAGEMENT EMAILS
// =============================================================================

/**
 * Order Confirmation Email
 */
export async function getOrderConfirmationEmail(order, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // Mobile-friendly items list
  const mobileItemsHtml = await Promise.all(order.items.map(async (item, index) => {
    const localPrice = await convertCurrency(item.price, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    
    return `
      <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 15px 0; ${index === order.items.length - 1 ? 'border-bottom: none;' : ''}">
        <div style="display: flex; gap: 12px;">
          <img src="${item.product.images[0]}" alt="${item.product.name}" width="60" style="border-radius: 6px; border: 1px solid #f0f0f0; flex-shrink: 0;">
          <div style="flex: 1;">
            <strong style="color: #333; display: block; margin-bottom: 5px;">${item.product.name}</strong>
            ${productDetails}
            <div style="margin-top: 8px; color: #666; font-size: 14px;">
              <span>Qty: ${item.quantity}</span> • 
              <span>Price: ${currencySymbol}${localPrice}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }));

  // Desktop table items
  const desktopItemsHtml = await Promise.all(order.items.map(async (item) => {
    const localPrice = await convertCurrency(item.price, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    
    return `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center; width: 80px;" class="mobile-hide">
          <img src="${item.product.images[0]}" alt="${item.product.name}" width="70" style="border-radius: 8px; border: 1px solid #f0f0f0;">
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <strong style="color: #333;">${item.product.name}</strong>
          ${productDetails}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center; width: 60px;" class="mobile-hide">${item.quantity}</td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; width: 100px;" class="mobile-hide">${currencySymbol}${localPrice}</td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; width: 100px;" class="mobile-hide">${currencySymbol}${(parseFloat(localPrice) * item.quantity).toFixed(2)}</td>
      </tr>
    `;
  }));

  const localTotal = await convertCurrency(order.totalAmount, 'USD', userCurrency);
  const localShipping = await convertCurrency(order.shippingCost || 0, 'USD', userCurrency);
  const localTax = await convertCurrency(order.taxAmount || 0, 'USD', userCurrency);
  const localSubtotal = await convertCurrency(order.subtotal || order.totalAmount - (order.shippingCost || 0) - (order.taxAmount || 0), 'USD', userCurrency);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation #${order.id} - Agumiya Collections</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .order-section { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 12px 15px; text-align: left; font-weight: 600; color: #555; }
        .status-badge { display: inline-block; padding: 6px 12px; background: #ffa500; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .total-row { background: #f8f9fa; font-weight: bold; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .order-section { padding: 20px 15px; }
          .mobile-hide { display: none !important; }
          .mobile-stack { display: block !important; width: 100% !important; }
          .responsive-table { width: 100% !important; min-width: 300px; }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">🎉 Order Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your purchase</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 25px;">
            <span class="status-badge">ORDER #${order.id}</span>
            <p style="margin: 10px 0; color: #666;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div class="order-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Order Summary</h3>
            
            <!-- Mobile View -->
            <div class="mobile-only">
              ${mobileItemsHtml.join('')}
              <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Subtotal:</span>
                  <span>${currencySymbol}${localSubtotal}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Shipping:</span>
                  <span>${currencySymbol}${localShipping}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Tax:</span>
                  <span>${currencySymbol}${localTax}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; padding-top: 10px; border-top: 1px solid #ddd;">
                  <span>Total Amount:</span>
                  <span style="color: #667eea;">${currencySymbol}${localTotal}</span>
                </div>
              </div>
            </div>
            
            <!-- Desktop View -->
            <div class="mobile-hide">
              ${responsiveTableWrapper(`
                <table class="responsive-table">
                  <thead>
                    <tr>
                      <th style="width: 80px; text-align: center;">Image</th>
                      <th>Product</th>
                      <th style="width: 60px; text-align: center;">Qty</th>
                      <th style="width: 100px; text-align: right;">Price</th>
                      <th style="width: 100px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${desktopItemsHtml.join('')}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="4" style="padding: 12px 15px; text-align: right; border-top: 2px solid #eee;">Subtotal:</td>
                      <td style="padding: 12px 15px; text-align: right; border-top: 2px solid #eee;">${currencySymbol}${localSubtotal}</td>
                    </tr>
                    <tr>
                      <td colspan="4" style="padding: 12px 15px; text-align: right;">Shipping:</td>
                      <td style="padding: 12px 15px; text-align: right;">${currencySymbol}${localShipping}</td>
                    </tr>
                    <tr>
                      <td colspan="4" style="padding: 12px 15px; text-align: right;">Tax:</td>
                      <td style="padding: 12px 15px; text-align: right;">${currencySymbol}${localTax}</td>
                    </tr>
                    <tr class="total-row">
                      <td colspan="4" style="padding: 15px; text-align: right; font-size: 1.1em;">Total Amount:</td>
                      <td style="padding: 15px; text-align: right; font-size: 1.1em; color: #667eea;">${currencySymbol}${localTotal}</td>
                    </tr>
                  </tfoot>
                </table>
              `)}
            </div>
          </div>

          <div class="order-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Shipping Address</h3>
            <p style="margin: 0;">
              <strong>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</strong><br>
              ${order.shippingAddress.address1}<br>
              ${order.shippingAddress.address2 ? order.shippingAddress.address2 + '<br>' : ''}
              ${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.zipCode}<br>
              ${order.shippingAddress.country}<br>
              📞 ${order.shippingAddress.phone}<br>
              📧 ${order.shippingAddress.email}
            </p>
          </div>

          <div class="order-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Order Status & Next Steps</h3>
            <p><strong>Payment Status:</strong> <span class="status-badge" style="background: #${order.paymentStatus === 'PAID' ? '28a745' : 'ffa500'};">${order.paymentStatus}</span></p>
            <p><strong>Fulfillment Status:</strong> <span class="status-badge" style="background: #17a2b8;">${order.fulfillmentStatus}</span></p>
            
            <div style="margin-top: 15px; padding: 15px; background: #e7f3ff; border-radius: 6px;">
              <strong>📦 What's Next?</strong>
              <p style="margin: 8px 0 0 0;">We'll notify you when your order ships. You can track your order status anytime from your account dashboard.</p>
            </div>
            
            ${order.orderNotes ? `
            <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 6px;">
              <strong>📝 Your Notes:</strong>
              <p style="margin: 8px 0 0 0;">${order.orderNotes}</p>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL}/orders/${order.id}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order Details</a>
          </div>
        </div>
        
        <div class="footer">
          <p>If you have any questions about your order, reply to this email or contact our support team.</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>This is an automated order confirmation. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Payment Success Email
 */
export async function getPaymentSuccessEmail(order, userCurrency = 'USD') {
  if (!order || !order.items) {
    console.error('Invalid order data in getPaymentSuccessEmail:', order);
    return getFallbackPaymentSuccessEmail(order, userCurrency);
  }

  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // Mobile-friendly items list
  const mobileItemsHtml = await Promise.all(order.items.map(async (item, index) => {
    if (!item) return '';
    
    const localPrice = await convertCurrency(item.price || 0, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    const productImage = item.product?.images?.[0] || '/images/placeholder-product.jpg';
    const productName = item.product?.name || 'Product';
    
    return `
      <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 12px 0; ${index === order.items.length - 1 ? 'border-bottom: none;' : ''}">
        <div style="display: flex; gap: 10px;">
          <img src="${productImage}" alt="${productName}" width="50" style="border-radius: 6px; border: 1px solid #f0f0f0; flex-shrink: 0;">
          <div style="flex: 1;">
            <strong style="color: #333; display: block; margin-bottom: 4px;">${productName}</strong>
            ${productDetails}
            <div style="margin-top: 6px; color: #666; font-size: 14px;">
              <span>Qty: ${item.quantity || 1}</span> • 
              <span>Price: ${currencySymbol}${localPrice}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }));

  // Desktop table items
  const desktopItemsHtml = await Promise.all(order.items.map(async (item) => {
    if (!item) return '';
    
    const localPrice = await convertCurrency(item.price || 0, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    const productImage = item.product?.images?.[0] || '/images/placeholder-product.jpg';
    const productName = item.product?.name || 'Product';
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 70px;" class="mobile-hide">
          <img src="${productImage}" alt="${productName}" width="60" style="border-radius: 6px; border: 1px solid #f0f0f0;">
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${productName}</strong>
          ${productDetails}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 50px;" class="mobile-hide">${item.quantity || 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; width: 90px;" class="mobile-hide">${currencySymbol}${localPrice}</td>
      </tr>
    `;
  }));

  const localTotal = await convertCurrency(order.totalAmount || 0, 'USD', userCurrency);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmed - Order #${order.id || 'N/A'}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .payment-section { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; color: #555; }
        .status-badge { display: inline-block; padding: 6px 12px; background: #28a745; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .payment-section { padding: 20px 15px; }
          .mobile-hide { display: none !important; }
          .responsive-table { width: 100% !important; min-width: 300px; }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">✅ Payment Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your payment has been successfully processed</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 25px;">
            <span class="status-badge">ORDER #${order.id || 'N/A'}</span>
            <p style="margin: 10px 0; color: #666;"><strong>Paid on:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div class="payment-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Payment Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p><strong>Amount Paid:</strong><br><span style="font-size: 1.4em; font-weight: bold; color: #28a745;">${currencySymbol}${localTotal}</span></p>
                <p><strong>Payment Method:</strong><br>${order.paymentMethod || 'Credit Card'}</p>
              </div>
              <div>
                <p><strong>Payment Status:</strong><br><span class="status-badge">PAID</span></p>
                <p><strong>Transaction ID:</strong><br>${order.razorpayPaymentId || order.transactionId || 'N/A'}</p>
              </div>
            </div>
          </div>

          ${order.items && order.items.length > 0 ? `
          <div class="payment-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Order Items</h3>
            
            <!-- Mobile View -->
            <div class="mobile-only">
              ${mobileItemsHtml.join('')}
            </div>
            
            <!-- Desktop View -->
            <div class="mobile-hide">
              ${responsiveTableWrapper(`
                <table class="responsive-table">
                  <thead>
                    <tr>
                      <th style="width: 70px; text-align: center;">Image</th>
                      <th>Product</th>
                      <th style="width: 50px; text-align: center;">Qty</th>
                      <th style="width: 90px; text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${desktopItemsHtml.join('')}
                  </tbody>
                </table>
              `)}
            </div>
          </div>
          ` : ''}

          <div class="payment-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">What Happens Next?</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
              <div style="padding: 15px; background: white; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 10px;">🏭</div>
                <strong>Production</strong>
                <p style="margin: 8px 0 0 0; font-size: 12px;">We start creating your products</p>
              </div>
              <div style="padding: 15px; background: white; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 10px;">📦</div>
                <strong>Shipping</strong>
                <p style="margin: 8px 0 0 0; font-size: 12px;">We'll ship within 3-5 business days</p>
              </div>
              <div style="padding: 15px; background: white; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 10px;">🎁</div>
                <strong>Delivery</strong>
                <p style="margin: 8px 0 0 0; font-size: 12px;">Receive your order in 5-10 days</p>
              </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 6px;">
              <strong>📞 Need to Make Changes?</strong>
              <p style="margin: 8px 0 0 0;">If you need to update your shipping address or have questions, contact us within 24 hours at <a href="mailto:support@agumiyacollections.com">support@agumiyacollections.com</a></p>
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL || 'https://yourapp.com'}/orders/${order.id || ''}" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Track Your Order</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business! We appreciate your trust in Agumiya Collections.</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔥 ADD: Fallback email template for when order data is incomplete
function getFallbackPaymentSuccessEmail(order, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  const localTotal = order?.totalAmount ? convertCurrency(order.totalAmount, 'USD', userCurrency) : '0.00';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmed - Order #${order?.id || 'N/A'}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">✅ Payment Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your payment has been successfully processed</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="display: inline-block; padding: 6px 12px; background: #28a745; color: white; border-radius: 20px; font-size: 12px; font-weight: 600;">ORDER #${order?.id || 'N/A'}</span>
            <p style="margin: 10px 0; color: #666;">Thank you for your purchase!</p>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #333; margin-top: 0;">Payment Successful</h3>
            <p style="font-size: 1.4em; font-weight: bold; color: #28a745;">${currencySymbol}${localTotal}</p>
            <p>Your order has been confirmed and is being processed.</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL || 'https://yourapp.com'}/account/orders" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">View Your Orders</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business! We appreciate your trust in Agumiya Collections.</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// =============================================================================
// REMAINING MOBILE-RESPONSIVE EMAIL TEMPLATES
// =============================================================================

/**
 * Payment Failed Email (Responsive)
 */
export async function getPaymentFailedEmail(order, errorMessage, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  const localTotal = await convertCurrency(order.totalAmount, 'USD', userCurrency);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Issue with Order #${order.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .alert-section { background: #f8d7da; color: #721c24; padding: 25px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb; }
        .order-section { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .action-button { display: inline-block; padding: 14px 28px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 10px 0; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .alert-section, .order-section { padding: 20px 15px; }
          .action-button { display: block; padding: 12px 20px; text-align: center; margin: 8px 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">⚠️ Payment Issue</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">There was a problem processing your payment</p>
        </div>
        
        <div class="content">
          <div class="alert-section">
            <h3 style="margin: 0 0 15px 0; color: #721c24;">Payment Failed</h3>
            <p style="margin: 0;">${errorMessage || 'There was an issue processing your payment method. Please try again or use a different payment method.'}</p>
          </div>

          <div class="order-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">Order Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p><strong>Order Number:</strong><br>#${order.id}</p>
                <p><strong>Order Date:</strong><br>${new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>Total Amount:</strong><br><span style="font-size: 1.2em; font-weight: bold;">${currencySymbol}${localTotal}</span></p>
                <p><strong>Items in Order:</strong><br>${order.items.length} item${order.items.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div style="background: #fff3cd; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">What to Do Next</h3>
            <p>Please update your payment information to complete your order. Your items are reserved for you for the next 24 hours.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.CLIENT_URL}/order/${order.id}/payment" class="action-button">Update Payment Information</a>
            </div>
            
            <p><strong>Common reasons for payment failure:</strong></p>
            <ul>
              <li>Insufficient funds in your account</li>
              <li>Card expiration date passed</li>
              <li>Incorrect CVV code or zip code</li>
              <li>Bank declined the transaction</li>
            </ul>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
            <h3 style="color: #004085; margin-top: 0;">Need Help?</h3>
            <p>If you're having trouble completing your payment, our support team is here to help:</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 10px;">📧</div>
                <strong>Email Support</strong>
                <p style="margin: 8px 0 0 0;"><a href="mailto:support@agumiyacollections.com">support@agumiyacollections.com</a></p>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 10px;">📞</div>
                <strong>Phone Support</strong>
                <p style="margin: 8px 0 0 0;">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL}/cart" class="action-button" style="background: #6c757d;">Return to Cart</a>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated payment notification. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Admin New Order Notification (Responsive)
 */
export async function getAdminNewOrderEmail(order, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // Mobile-friendly items list
  const mobileItemsHtml = await Promise.all(order.items.map(async (item, index) => {
    const localPrice = await convertCurrency(item.price, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    
    return `
      <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 12px 0; ${index === order.items.length - 1 ? 'border-bottom: none;' : ''}">
        <div style="display: flex; gap: 10px;">
          <img src="${item.product.images[0]}" alt="${item.product.name}" width="50" style="border-radius: 4px; border: 1px solid #f0f0f0; flex-shrink: 0;">
          <div style="flex: 1;">
            <strong style="color: #333; display: block; margin-bottom: 4px;">${item.product.name}</strong>
            ${productDetails}
            <div style="margin-top: 6px; color: #666; font-size: 14px;">
              <span>Qty: ${item.quantity}</span> • 
              <span>Price: ${currencySymbol}${localPrice}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }));

  // Desktop table items
  const desktopItemsHtml = await Promise.all(order.items.map(async (item) => {
    const localPrice = await convertCurrency(item.price, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; width: 60px;" class="mobile-hide">
          <img src="${item.product.images[0]}" alt="${item.product.name}" width="50" style="border-radius: 4px; border: 1px solid #f0f0f0;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product.name}${productDetails}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; width: 40px;" class="mobile-hide">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; width: 80px;" class="mobile-hide">${currencySymbol}${localPrice}</td>
      </tr>
    `;
  }));

  const localTotal = await convertCurrency(order.totalAmount, 'USD', userCurrency);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Notification - Order #${order.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .alert-section { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .order-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #f5f5f5; padding: 10px; text-align: left; font-weight: 600; color: #555; }
        .action-button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { margin-top: 25px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 25px 15px; }
          .content { padding: 20px 15px; }
          .alert-section, .order-section { padding: 15px 12px; }
          .mobile-hide { display: none !important; }
          .action-button { display: block; padding: 12px 20px; text-align: center; margin: 10px 0; }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🛒 New Order Received!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${order.id} requires your attention</p>
        </div>
        
        <div class="content">
          <div class="alert-section">
            <h3 style="margin: 0 0 10px 0; color: #856404;">Action Required: Process This Order</h3>
            <p style="margin: 0;">This order needs to be processed and forwarded to Printify for fulfillment.</p>
          </div>

          <div class="order-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #ff6b6b; padding-bottom: 8px;">Order Summary</h3>
            
            <!-- Mobile View -->
            <div class="mobile-only">
              ${mobileItemsHtml.join('')}
              <div style="margin-top: 15px; padding-top: 12px; border-top: 2px solid #eee;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <span>Total Amount:</span>
                  <span>${currencySymbol}${localTotal}</span>
                </div>
              </div>
            </div>
            
            <!-- Desktop View -->
            <div class="mobile-hide">
              ${responsiveTableWrapper(`
                <table class="responsive-table">
                  <thead>
                    <tr>
                      <th style="width: 60px; text-align: center;">Image</th>
                      <th>Product</th>
                      <th style="width: 40px; text-align: center;">Qty</th>
                      <th style="width: 80px; text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${desktopItemsHtml.join('')}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="padding: 12px 10px; text-align: right; border-top: 2px solid #eee;"><strong>Total Amount:</strong></td>
                      <td style="padding: 12px 10px; text-align: right; border-top: 2px solid #eee; font-weight: bold;">${currencySymbol}${localTotal}</td>
                    </tr>
                  </tfoot>
                </table>
              `)}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div class="order-section">
              <h3 style="color: #333; margin-top: 0; font-size: 16px;">Customer Information</h3>
              <p style="margin: 8px 0;"><strong>Customer:</strong><br>${order.user.name}<br>${order.user.email}</p>
              <p style="margin: 8px 0;"><strong>Order Date:</strong><br>${new Date(order.createdAt).toLocaleString()}</p>
              <p style="margin: 8px 0;"><strong>Payment Status:</strong><br><span style="color: ${order.paymentStatus === 'PAID' ? '#28a745' : '#dc3545'}; font-weight: bold;">${order.paymentStatus}</span></p>
            </div>
            
            <div class="order-section">
              <h3 style="color: #333; margin-top: 0; font-size: 16px;">Shipping Address</h3>
              <p style="margin: 8px 0;">
                ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
                ${order.shippingAddress.address1}<br>
                ${order.shippingAddress.address2 ? order.shippingAddress.address2 + '<br>' : ''}
                ${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.zipCode}<br>
                ${order.shippingAddress.country}<br>
                📞 ${order.shippingAddress.phone}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.ADMIN_DASHBOARD_URL}/orders" class="action-button">View Order in Dashboard</a>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
            <h3 style="color: #004085; margin-top: 0; font-size: 16px;">Quick Actions Checklist</h3>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Review order details and customer information</li>
              <li>Verify payment status before processing</li>
              <li>Forward to Printify if payment is confirmed</li>
              <li>Contact customer if any issues with address or items</li>
              <li>Update order status in the system</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated new order notification from Agumiya Collections.</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Order Cancelled Email (Responsive)
 */
export async function getOrderCancelledEmail(order, reason, cancelledBy, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // Mobile-friendly items list
  const mobileItemsHtml = await Promise.all(order.items.map(async (item, index) => {
    const localPrice = await convertCurrency(item.price, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    
    return `
      <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 12px 0; ${index === order.items.length - 1 ? 'border-bottom: none;' : ''}">
        <div style="display: flex; gap: 10px;">
          <img src="${item.product.images[0]}" alt="${item.product.name}" width="50" style="border-radius: 6px; border: 1px solid #f0f0f0; flex-shrink: 0;">
          <div style="flex: 1;">
            <strong style="color: #333; display: block; margin-bottom: 4px;">${item.product.name}</strong>
            ${productDetails}
            <div style="margin-top: 6px; color: #666; font-size: 14px;">
              <span>Qty: ${item.quantity}</span> • 
              <span>Price: ${currencySymbol}${localPrice}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }));

  // Desktop table items
  const desktopItemsHtml = await Promise.all(order.items.map(async (item) => {
    const localPrice = await convertCurrency(item.price, 'USD', userCurrency);
    const productDetails = formatProductDetails(item);
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 70px;" class="mobile-hide">
          <img src="${item.product.images[0]}" alt="${item.product.name}" width="60" style="border-radius: 6px; border: 1px solid #f0f0f0;">
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${item.product.name}</strong>
          ${productDetails}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 50px;" class="mobile-hide">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; width: 90px;" class="mobile-hide">${currencySymbol}${localPrice}</td>
      </tr>
    `;
  }));

  const localTotal = await convertCurrency(order.totalAmount, 'USD', userCurrency);
  const localRefund = await convertCurrency(order.refundAmount || order.totalAmount, 'USD', userCurrency);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Cancellation Notice - Order #${order.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .cancellation-info { background: #fef2f2; border: 1px solid #fecaca; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .order-items { background: #fafafa; padding: 25px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; color: #555; }
        .refund-status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .refund-pending { background: #fef3c7; color: #d97706; }
        .refund-completed { background: #d1fae5; color: #065f46; }
        .support-section { background: #eff6ff; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .cancellation-info, .order-items, .support-section { padding: 20px 15px; }
          .mobile-hide { display: none !important; }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">❌ Order Cancelled</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">We're sorry to inform you that your order has been cancelled</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 1.2em; font-weight: bold; color: #dc2626;">ORDER #${order.id}</span>
            <p style="margin: 10px 0; color: #666;"><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div class="cancellation-info">
            <h3 style="color: #dc2626; margin-top: 0;">Cancellation Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p><strong>Reason:</strong><br>${reason}</p>
                <p><strong>Cancelled by:</strong><br>${cancelledBy}</p>
              </div>
              <div>
                <p><strong>Original Order Date:</strong><br>${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Order Amount:</strong><br><span style="color: #dc2626; font-weight: bold;">${currencySymbol}${localTotal}</span></p>
              </div>
            </div>
          </div>

          <div class="order-items">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Cancelled Items</h3>
            
            <!-- Mobile View -->
            <div class="mobile-only">
              ${mobileItemsHtml.join('')}
            </div>
            
            <!-- Desktop View -->
            <div class="mobile-hide">
              ${responsiveTableWrapper(`
                <table class="responsive-table">
                  <thead>
                    <tr>
                      <th style="width: 70px; text-align: center;">Image</th>
                      <th>Product</th>
                      <th style="width: 50px; text-align: center;">Qty</th>
                      <th style="width: 90px; text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${desktopItemsHtml.join('')}
                  </tbody>
                </table>
              `)}
            </div>
          </div>

          <div class="support-section">
            <h3 style="color: #1e40af; margin-top: 0;">We're Here to Help</h3>
            <p>If you have any questions about this cancellation or would like to:</p>
            <ul>
              <li>Request a different product or size</li>
              <li>Get help with a new order</li>
              <li>Understand the cancellation reason better</li>
              <li>Check refund status</li>
            </ul>
            <p>Our support team is ready to assist you:</p>
            <div style="text-align: center; margin: 15px 0;">
              <a href="mailto:support@agumiyacollections.com" style="display: inline-block; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Contact Support</a>
            </div>
          </div>

          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #d97706; margin-top: 0;">💡 Want to Try Again?</h4>
            <p>If you'd like to place a new order or explore similar products, visit our store:</p>
            <div style="text-align: center; margin-top: 15px;">
              <a href="${process.env.CLIENT_URL}/shop" style="display: inline-block; padding: 10px 20px; background: #d97706; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">Browse Products</a>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>We apologize for any inconvenience and hope to serve you better in the future.</p>
          <p><strong>Agumiya Collections Customer Care Team</strong></p>
          <p>📞 Support: +1 (555) 123-4567 | 📧 Email: support@agumiyacollections.com</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Admin Cancellation Email (Responsive)
 */
export function getAdminCancellationEmail(order, reason, cancelledBy) {
  // Mobile-friendly items list
  const mobileItemsHtml = order.items.map((item, index) => `
    <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 10px 0; ${index === order.items.length - 1 ? 'border-bottom: none;' : ''}">
      <div style="display: flex; gap: 10px;">
        <img src="${item.product.images[0]}" alt="${item.product.name}" width="40" style="border-radius: 4px; flex-shrink: 0;">
        <div style="flex: 1;">
          <strong style="color: #333; display: block; margin-bottom: 4px;">${item.product.name}</strong>
          <div style="color: #666; font-size: 14px;">
            <span>Qty: ${item.quantity}</span> • 
            <span>Price: $${item.price.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Desktop table items
  const desktopItemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;" class="mobile-hide">
        <img src="${item.product.images[0]}" alt="${item.product.name}" width="40" style="border-radius: 4px;">
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;" class="mobile-hide">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;" class="mobile-hide">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  const refundInfo = order.refundAmount > 0 ? `
    <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <strong>💰 Refund Required:</strong>
      <p style="margin: 8px 0 0 0;">
        Amount: $${order.refundAmount.toFixed(2)}<br>
        Status: <strong>${order.refundStatus}</strong><br>
        Action: Process refund through payment gateway
      </p>
    </div>
  ` : `
    <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <strong>✅ No Refund Required:</strong>
      <p style="margin: 8px 0 0 0;">Payment was not processed or failed previously.</p>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🚨 Order Cancellation - #${order.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .alert-section { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .order-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #e5e5e5; padding: 10px; text-align: left; font-weight: 600; }
        .action-button { display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; font-weight: 600; }
        .footer { margin-top: 20px; padding: 15px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 25px 15px; }
          .content { padding: 20px 15px; }
          .alert-section, .order-section { padding: 15px 12px; }
          .mobile-hide { display: none !important; }
          .action-button { display: block; padding: 12px 20px; text-align: center; margin: 10px 0; }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🚨 ORDER CANCELLED</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate attention required</p>
        </div>
        
        <div class="content">
          <div class="alert-section">
            <h3 style="margin: 0 0 10px 0; color: #dc2626;">Order #${order.id} Has Been Cancelled</h3>
            <p style="margin: 0;"><strong>Cancelled by:</strong> ${cancelledBy} | <strong>Reason:</strong> ${reason}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div class="order-section">
              <h4 style="margin: 0 0 10px 0; color: #333;">Customer Information</h4>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${order.user.name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${order.user.email}</p>
              <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Cancelled:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="order-section">
              <h4 style="margin: 0 0 10px 0; color: #333;">Order Summary</h4>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
              <p style="margin: 5px 0;"><strong>Fulfillment Status:</strong> ${order.fulfillmentStatus}</p>
              <p style="margin: 5px 0;"><strong>Items:</strong> ${order.items.length}</p>
            </div>
          </div>

          ${refundInfo}

          <div class="order-section">
            <h4 style="margin: 0 0 10px 0; color: #333;">Cancelled Items</h4>
            
            <!-- Mobile View -->
            <div class="mobile-only">
              ${mobileItemsHtml}
            </div>
            
            <!-- Desktop View -->
            <div class="mobile-hide">
              ${responsiveTableWrapper(`
                <table class="responsive-table">
                  <thead>
                    <tr>
                      <th class="mobile-hide">Image</th>
                      <th>Product</th>
                      <th class="mobile-hide" style="text-align: center;">Qty</th>
                      <th class="mobile-hide" style="text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${desktopItemsHtml}
                  </tbody>
                </table>
              `)}
            </div>
          </div>

          <div class="order-section">
            <h4 style="margin: 0 0 10px 0; color: #333;">Shipping Address</h4>
            <p style="margin: 5px 0;">
              ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
              ${order.shippingAddress.address1}<br>
              ${order.shippingAddress.address2 ? order.shippingAddress.address2 + '<br>' : ''}
              ${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.zipCode}<br>
              ${order.shippingAddress.country}<br>
              <strong>Phone:</strong> ${order.shippingAddress.phone}
            </p>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.ADMIN_DASHBOARD_URL}/orders/" class="action-button">View Order in Dashboard</a>
          </div>

          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #004085;">Required Actions</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${order.refundAmount > 0 ? '<li>Process refund through payment gateway</li>' : ''}
              <li>Update inventory if necessary</li>
              <li>Review cancellation reason for patterns</li>
              <li>Contact customer if refund issues occur</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated cancellation alert from Agumiya Collections Admin System.</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Refund Processed Email (Responsive)
 */
export async function getRefundProcessedEmail(order, refundId, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  const localRefund = await convertCurrency(order.refundAmount || order.totalAmount, 'USD', userCurrency);
  
  // Mobile-friendly items list
  const mobileItemsList = await Promise.all(order.items.map(async (item, index) => {
    const productDetails = formatProductDetails(item);
    return `
      <div class="mobile-order-item" style="margin-bottom: 10px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #059669;">
        <strong style="color: #333; display: block; margin-bottom: 5px;">${item.product.name}</strong>
        ${productDetails}
        <div style="margin-top: 6px; color: #666; font-size: 14px;">
          <span>Quantity: ${item.quantity}</span>
        </div>
      </div>
    `;
  }));

  // Desktop items list
  const desktopItemsList = await Promise.all(order.items.map(async (item) => {
    const productDetails = formatProductDetails(item);
    return `
      <li style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
        <strong>${item.product.name}</strong> × ${item.quantity}
        ${productDetails}
      </li>
    `;
  }));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Processed - Order #${order.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .refund-success { background: #d1fae5; border: 1px solid #a7f3d0; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .refund-details { background: #f0fdf4; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .order-summary { background: #fafafa; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .next-steps { background: #eff6ff; padding: 25px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        .success-icon { font-size: 48px; margin-bottom: 15px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .refund-success, .refund-details, .order-summary, .next-steps { padding: 20px 15px; }
          .success-icon { font-size: 36px; }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">✅ Refund Processed</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your refund has been successfully completed</p>
        </div>
        
        <div class="content">
          <div class="refund-success">
            <div class="success-icon">💰</div>
            <h2 style="margin: 0; color: #065f46;">Refund Processed Successfully!</h2>
            <p style="font-size: 1.1em; margin: 10px 0 0 0;">Your money is on its way back to you</p>
          </div>

          <div class="refund-details">
            <h3 style="color: #065f46; margin-top: 0; border-bottom: 2px solid #065f46; padding-bottom: 10px;">Refund Details</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <p><strong>Order Number:</strong><br><span style="font-family: monospace; font-size: 1.1em;">#${order.id}</span></p>
                <p><strong>Refund ID:</strong><br>${refundId}</p>
              </div>
              <div>
                <p><strong>Refund Amount:</strong><br><span style="font-size: 1.4em; font-weight: bold; color: #065f46;">${currencySymbol}${localRefund}</span></p>
                <p><strong>Processed Date:</strong><br>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div class="order-summary">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #065f46; padding-bottom: 10px;">Refunded Items</h3>
            
            <!-- Mobile View -->
            <div class="mobile-only">
              ${mobileItemsList.join('')}
            </div>
            
            <!-- Desktop View -->
            <div class="mobile-hide">
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${desktopItemsList.join('')}
              </ul>
            </div>
            
            <p style="margin: 15px 0 0 0;"><strong>Original Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>

          <div style="background: #fffbeb; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #d97706; margin-top: 0;">⏳ When to Expect Your Money</h4>
            <p><strong>Timeline:</strong> The refund should appear in your account within <strong>3-5 business days</strong>, depending on your bank or payment provider.</p>
            <p><strong>Payment Method:</strong> The amount will be credited to your original payment method (credit card, debit card, PayPal, etc.).</p>
            
            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px;">
              <strong>💡 Pro Tip:</strong>
              <p style="margin: 8px 0 0 0;">If you don't see the refund after 5 business days, check with your bank first as processing times may vary.</p>
            </div>
          </div>

          <div class="next-steps">
            <h3 style="color: #1e40af; margin-top: 0; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">What You Can Do Next</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
              <div style="padding: 20px; background: white; border-radius: 8px;">
                <div style="font-size: 32px; margin-bottom: 15px;">🛍️</div>
                <strong>Continue Shopping</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Explore our latest collections</p>
                <a href="${process.env.CLIENT_URL}/products" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 14px;">Browse Products →</a>
              </div>
              <div style="padding: 20px; background: white; border-radius: 8px;">
                <div style="font-size: 32px; margin-bottom: 15px;">📞</div>
                <strong>Need Help?</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Contact our support team</p>
                <a href="mailto:support@agumiyacollections.com" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 14px;">Email Support →</a>
              </div>
              <div style="padding: 20px; background: white; border-radius: 8px;">
                <div style="font-size: 32px; margin-bottom: 15px;">💬</div>
                <strong>Feedback</strong>
                <p style="margin: 10px 0 0 0; font-size: 14px;">Help us improve</p>
                <a href="${process.env.CLIENT_URL}/feedback" style="color: #1e40af; text-decoration: none; font-weight: 600; font-size: 14px;">Share Feedback →</a>
              </div>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #475569;">Have Questions About Your Refund?</h4>
            <p>If you don't see the refund in your account after 5 business days, or if you have any questions:</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <strong>📧 Email Support</strong>
                <p style="margin: 8px 0 0 0;"><a href="mailto:support@agumiyacollections.com">support@agumiyacollections.com</a></p>
              </div>
              <div>
                <strong>📞 Phone Support</strong>
                <p style="margin: 8px 0 0 0;">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your patience and understanding. We hope to see you again soon!</p>
          <p><strong>Agumiya Collections</strong></p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


/**
 * Order Shipped Email (Responsive Version)
 */
export async function getOrderShippedEmail(order, trackingInfo, userCurrency = 'USD') {
  const currencySymbol = getCurrencySymbol(userCurrency);
  const localTotal = await convertCurrency(order.totalAmount, 'USD', userCurrency);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order Has Shipped! - Order #${order.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .tracking-section { background: #e7f3ff; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status-badge { display: inline-block; padding: 10px 20px; background: #007bff; color: white; border-radius: 25px; font-size: 14px; font-weight: 600; }
        .tracking-button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; }
        .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; text-align: center; font-size: 12px; color: #6c757d; border-radius: 8px; }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .tracking-section { padding: 20px 15px; }
          .info-grid { grid-template-columns: 1fr; gap: 15px; }
          .tracking-button { display: block; padding: 12px 20px; text-align: center; margin: 15px 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 32px;">🚚 Your Order Has Shipped!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Great news! Your order is on its way to you</p>
        </div>
        
        <div class="content">
          <div class="tracking-section">
            <span class="status-badge">SHIPPED</span>
            <h2 style="color: #007bff; margin: 15px 0;">Order #${order.id}</h2>
            <p style="font-size: 1.1em; margin: 10px 0;">We've handed your package over to our shipping partner</p>
            
            ${trackingInfo ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Tracking Number:</strong> <span style="font-family: monospace; font-size: 1.1em; word-break: break-all;">${trackingInfo.number}</span></p>
                <p><strong>Carrier:</strong> ${trackingInfo.carrier}</p>
                <p><strong>Shipping Method:</strong> ${trackingInfo.service || 'Standard Shipping'}</p>
              </div>
              <a href="${trackingInfo.url}" class="tracking-button">Track Your Package</a>
            ` : `
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p>Tracking information will be available soon. We'll send you another email when tracking is activated.</p>
              </div>
            `}
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div style="font-size: 32px; margin-bottom: 10px;">📦</div>
              <strong>Package Details</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px;">${order.items.length} item${order.items.length > 1 ? 's' : ''}<br>Order Total: ${currencySymbol}${localTotal}</p>
            </div>
            <div class="info-card">
              <div style="font-size: 32px; margin-bottom: 10px;">🏠</div>
              <strong>Shipping To</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px;">${order.shippingAddress.city}, ${order.shippingAddress.region}</p>
            </div>
          </div>

          <!-- Rest of the email content remains the same -->
          <!-- ... -->
        </div>
        
        <div class="footer">
          <p>We're excited for you to receive your Agumiya Collections order!</p>
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>This is an automated shipping notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  getPasswordResetEmail,
  getPasswordResetSuccessEmail,
  getWelcomeEmail,
  getOrderConfirmationEmail,
  getPaymentSuccessEmail,
  getOrderShippedEmail,
  getPaymentFailedEmail,
  getAdminNewOrderEmail,
  getOrderCancelledEmail,
  getAdminCancellationEmail,
  getRefundProcessedEmail
};