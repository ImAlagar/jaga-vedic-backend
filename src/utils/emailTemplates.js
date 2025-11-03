import { CreateOrderDto, OrderResponseDto } from '../dto/orderDto.js';
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


const roundAmount = (amount) => {
  return Math.round(parseFloat(amount || 0));
};


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
      <title>Hey there! Welcome to Agumiya Collections 🤍</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f5f5f7;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: white;
          padding: 40px 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #28a745;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: background 0.3s ease;
        }
        .button:hover {
          background: #218838;
        }
        .footer {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-radius: 8px;
        }
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .button { display: block; text-align: center; margin: 15px auto; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 30px;">Hey there! Welcome to Agumiya Collections 🤍</h1>
        </div>

        <div class="content">
          <h2 style="margin-top: 0;">Hi ${name},</h2>

          <p>We’re so happy to have you here!</p>
          <p>At <strong>Agumiya Collections</strong>, it’s all about feeling confident and being yourself.</p>

          <div style="background: #f1f5ff; border-left: 5px solid #667eea; padding: 15px 20px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 15px;">
              To get you started, here’s a little something — 
              <strong style="color:#764ba2;">10% off your first order</strong> with code 
              <strong style="background:#f8f9fa; padding:3px 6px; border-radius:4px;">WELCOME10 🎁</strong>
            </p>
          </div>

          <p>Take a look around and find what feels <em>you</em>.</p>

          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL}/shop" class="button">👉 Shop Now</a>
          </div>

          <p style="margin-top: 30px;">With love,<br>
          <strong>Agumiya Collections 🤍</strong></p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>Need help? Contact us at 
            <a href="mailto:support@agumiyacollections.com" style="color: #6c757d;">support@agumiyacollections.com</a>
          </p>
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

export async function getOrderConfirmationEmail(order) {
  if (!order || !order.items) {
    console.error('Invalid order data in getOrderConfirmationEmail:', order);
    return '';
  }

  const userCurrency = order.currency || 'USD';
  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // ✅ USE SAME LOGIC AS ADMIN EMAIL FOR CONSISTENCY
  const roundAmount = (amount) => {
    return Math.round(parseFloat(amount || 0));
  };

  const convertToLocal = (usdAmount) => {
    if (userCurrency === 'USD') return usdAmount;
    const exchangeRate = order.exchangeRate || 88.72;
    return (usdAmount || 0) * exchangeRate;
  };

const formatPrice = (amount) => {
  const numAmount = parseFloat(amount || 0);
  return numAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

  // ✅ CORRECT CALCULATIONS (Same as admin email)
const localTotal = formatPrice(order.totalAmount);
const localSubtotal = formatPrice(convertToLocal(order.subtotalAmount || 0));
const shippingCost = order.shipping?.shippingCost || order.shippingCost || 0;
const localShipping = formatPrice(convertToLocal(shippingCost));
const localTax = formatPrice(convertToLocal(order.taxAmount || 0));
const localDiscount = formatPrice(convertToLocal(order.discountAmount || 0));

  const orderNumber = order.id;

  // ✅ AMOUNT BREAKDOWN SECTION (Same structure as admin email)
  const amountBreakdown = `
    <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd;">
      <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">💰 Order Amount Details</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
        <div><strong>Subtotal:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localSubtotal}</div>
        
        <div><strong>Shipping:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localShipping}</div>
        
        <div><strong>Tax:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localTax}</div>
        
        ${
          (order.discountAmount || 0) > 0
            ? `
          <div><strong style="color: #dc3545;">Discount:</strong></div>
          <div style="text-align: right; color: #dc3545;">-${currencySymbol}${localDiscount}</div>
        `
            : ''
        }
        
        <div style="border-top: 2px solid #667eea; padding-top: 10px; margin-top: 5px; font-weight: bold; font-size: 16px;">Total Amount:</div>
        <div style="border-top: 2px solid #667eea; padding-top: 10px; margin-top: 5px; text-align: right; font-weight: bold; font-size: 16px; color: #667eea;">
          ${currencySymbol}${localTotal}
        </div>
      </div>
    </div>
  `;

// ✅ SIMPLER FIX: Show ALL available selection data
// ✅ IMPROVED ITEMS DISPLAY with proper data handling
const itemsHtml = order.items
  .map((item) => {
    const convertedPrice = convertToLocal(item.price || 0);
    const itemTotal = formatPrice(convertedPrice * (item.quantity || 1));
    const productImage = item.product?.images?.[0] || '/images/placeholder-product.jpg';
    const productName = item.product?.name || 'Product';
    const qty = item.quantity || 1;
    
    // ✅ SMART SELECTION DISPLAY - Use OrderResponseDto logic
    const displayText = OrderResponseDto.getItemDisplayText(item);
    
    // ✅ ALTERNATIVE: Direct field access with fallbacks
    const selectionDetails = [];
    
    // Phone case specific fields
    if (item.phoneModel) selectionDetails.push(`<strong>Model:</strong> ${item.phoneModel}`);
    if (item.finishType) selectionDetails.push(`<strong>Finish:</strong> ${item.finishType}`);
    
    // General product fields
    if (item.size && item.size !== 'Standard' && item.size !== 'N/A') {
      selectionDetails.push(`<strong>Size:</strong> ${item.size}`);
    }
    if (item.color && item.color !== 'Default' && item.color !== 'N/A') {
      selectionDetails.push(`<strong>Color:</strong> ${item.color}`);
    }
    
    // Material and other fields
    if (item.material) selectionDetails.push(`<strong>Material:</strong> ${item.material}`);
    if (item.style) selectionDetails.push(`<strong>Style:</strong> ${item.style}`);
    
    const selectionText = selectionDetails.length > 0 
      ? `<div class="item-selections" style="margin-top: 5px; font-size: 13px; color: #666;">${selectionDetails.join(' • ')}</div>`
      : '';

    return `
      <div class="order-item">
        <img src="${productImage}" alt="${productName}" class="item-image" />
        <div class="item-info">
          <div class="item-name">${productName}</div>
          ${selectionText}
          <div class="item-meta">Qty: ${qty}</div>
          <div class="item-price">${currencySymbol}${itemTotal}</div>
        </div>
      </div>
    `;
  })
  .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Agumiya Order is Confirmed! 🎉</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f5f5f7;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: white;
          padding: 35px 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .order-summary {
          background: #f9f9fb;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
        }
        .order-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          border-bottom: 1px solid #eee;
          padding: 12px 0;
        }
        .item-image {
          width: 70px;
          height: 70px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid #f0f0f0;
        }
        .item-info {
          flex: 1;
        }
        .item-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }
        .item-meta {
          font-size: 13px;
          color: #777;
          margin-bottom: 5px;
        }
        .item-price {
          font-weight: bold;
          color: #667eea;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background: #28a745;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 25px auto;
          text-align: center;
          transition: all 0.3s ease;
        }
        .button:hover {
          background: #218838;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }
        .footer {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-radius: 8px;
        }

        /* ✅ IMPROVED Mobile Responsive Fixes */
        @media only screen and (max-width: 600px) {
          .container { 
            padding: 10px; 
            width: 100% !important;
          }
          .header { 
            padding: 30px 15px; 
            font-size: 18px; 
          }
          .content { 
            padding: 25px 20px; 
          }
          .order-item {
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }
          .item-image {
            width: 60px;
            height: 60px;
          }
          .item-info {
            flex: 1;
            min-width: 0; /* Prevents text overflow */
          }
          .item-name {
            font-size: 14px;
            word-wrap: break-word;
          }
          .item-meta {
            font-size: 12px;
          }
          .item-price {
            font-size: 14px;
          }
          /* ✅ FIXED BUTTON STYLES FOR MOBILE */
          .button {
            display: block !important;
            width: 100% !important;
            text-align: center;
            margin: 20px 0 !important;
            padding: 16px 20px !important;
            font-size: 16px !important;
            box-sizing: border-box;
          }
          /* ✅ Ensure button container is properly styled */
          .button-container {
            width: 100% !important;
            display: block !important;
          }
        }

        /* ✅ Additional mobile optimizations */
        @media only screen and (max-width: 480px) {
          .container {
            padding: 5px;
          }
          .content {
            padding: 20px 15px;
          }
          .order-summary {
            padding: 15px;
          }
          .button {
            padding: 18px 20px !important;
            font-size: 17px !important;
          }
        }

        /* ✅ Force responsive behavior for email clients */
        .button-container {
          text-align: center;
          width: 100%;
        }
        
        /* ✅ Prevent Outlook from breaking the button */
        @media screen and (max-width: 600px) {
          .button-container table {
            width: 100% !important;
          }
          .button-container td {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Agumiya Order is Confirmed! 🎉</h1>
        </div>

        <div class="content">
          <p>Hi ${order.user?.name || 'Customer'},</p>
          <p>Great news! Your order with <strong>Agumiya Collections</strong> has been successfully placed ✅</p>

          <div class="order-summary">
            <p>📦 <strong>Order Number:</strong> ${orderNumber}</p>
            <p>💰 <strong>Total Amount:</strong> ${currencySymbol}${localTotal}</p>
            
            <div style="margin-top:15px;">
              <strong>🛒 Items Ordered:</strong>
              ${itemsHtml}
            </div>
            
            ${amountBreakdown}
          </div>

          <p>We're getting your order ready and will notify you once it ships! 🚚✨</p>
          <p>Thank you for choosing <strong>Agumiya Collections</strong> — we're excited for you to receive your new items! 🖤</p>

          <!-- ✅ FIXED BUTTON CONTAINER -->
          <div class="button-container" style="text-align: center; width: 100%;">
            <a href="${process.env.CLIENT_URL || 'https://yourapp.com'}/orders/${order.id}" class="button" style="display: inline-block; padding: 14px 28px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 25px auto; text-align: center;">
              Track Your Order
            </a>
          </div>

          <p style="margin-top: 30px;">With love,<br><strong>Agumiya Collections Team 🤍</strong></p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
          <p>Need help? Contact us at 
            <a href="mailto:support@agumiyacollections.com" style="color: #6c757d;">support@agumiyacollections.com</a>
          </p>
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

  // ✅ USE ORDER CURRENCY INSTEAD OF userCurrency
  const displayCurrency = order.currency || userCurrency;
  const currencySymbol = getCurrencySymbol(displayCurrency);
  
  // ✅ CORRECT CONVERSION FUNCTION
  const convertToLocal = (usdAmount) => {
    if (displayCurrency === 'USD') return usdAmount;
    const exchangeRate = order.exchangeRate || 88.7;
    return (usdAmount || 0) * exchangeRate;
  };

  const formatPrice = (amount) => {
    // ✅ ROUND THE AMOUNT FIRST
    const roundedAmount = roundAmount(amount);
    return parseFloat(roundedAmount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ✅ CORRECT AMOUNTS WITH ROUNDING
  const localTotal = formatPrice(order.totalAmount); // Already in local currency
  const localSubtotal = formatPrice(convertToLocal(order.subtotalAmount || 0));
  const shippingCost = order.shipping?.shippingCost || order.shippingCost || 0;
  const localShipping = formatPrice(convertToLocal(shippingCost));
  const localTax = formatPrice(convertToLocal(order.taxAmount || 0));
  const localDiscount = formatPrice(convertToLocal(order.discountAmount || 0));

  // ✅ ADD AMOUNT BREAKDOWN WITH ROUNDED AMOUNTS
  const amountBreakdown = `
    <div style="margin-top: 15px; padding: 15px; background: #f0f8ff; border-radius: 6px; border-left: 4px solid #28a745;">
      <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">💰 Payment Breakdown</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
        <div><strong>Subtotal:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localSubtotal}</div>
        
        <div><strong>Shipping:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localShipping}</div>
        
        <div><strong>Tax:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localTax}</div>
        
        ${order.discountAmount > 0 ? `
          <div><strong style="color: #28a745;">Discount:</strong></div>
          <div style="text-align: right; color: #28a745;">-${currencySymbol}${localDiscount}</div>
        ` : ''}
        
        <div style="border-top: 2px solid #28a745; padding-top: 10px; margin-top: 5px; font-weight: bold; font-size: 16px;">Total Paid:</div>
        <div style="border-top: 2px solid #28a745; padding-top: 10px; margin-top: 5px; text-align: right; font-weight: bold; font-size: 16px; color: #28a745;">
          ${currencySymbol}${localTotal}
        </div>
      </div>
    </div>
  `;

  // Mobile-friendly items list - FIXED CONVERSION WITH ROUNDING
  const mobileItemsHtml = await Promise.all(order.items.map(async (item, index) => {
    if (!item) return '';
    
    const convertedPrice = convertToLocal(item.price || 0);
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
              <span>Price: ${currencySymbol}${formatPrice(convertedPrice)}</span>
            </div>
            ${displayCurrency !== 'USD' ? `
              <div style="margin-top: 4px; color: #888; font-size: 12px;">
                <em>Originally: $${formatPrice(item.price || 0)} USD</em>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }));

  // Desktop table items - FIXED CONVERSION WITH ROUNDING
  const desktopItemsHtml = await Promise.all(order.items.map(async (item) => {
    if (!item) return '';
    
    const convertedPrice = convertToLocal(item.price || 0);
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
          ${displayCurrency !== 'USD' ? `
            <div style="margin-top: 4px; color: #888; font-size: 12px;">
              <em>Originally: $${formatPrice(item.price || 0)} USD</em>
            </div>
          ` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 50px;" class="mobile-hide">${item.quantity || 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; width: 90px;" class="mobile-hide">${currencySymbol}${formatPrice(convertedPrice)}</td>
      </tr>
    `;
  }));

  // ✅ CURRENCY NOTE
  const currencyNote = displayCurrency !== 'USD' ? `
    <div style="margin-top: 10px; padding: 10px; background: #f0f8ff; border-radius: 5px; border-left: 4px solid #28a745;">
      <small>
        <strong>💱 Currency Note:</strong> 
        Prices converted from USD to ${displayCurrency} at rate: 1 USD = ${order.exchangeRate || 88.72} ${displayCurrency}
      </small>
    </div>
  ` : '';

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
            <p style="margin: 5px 0; color: #666;">
              <strong>Currency:</strong> ${displayCurrency} ${displayCurrency !== 'USD' ? '(Converted from USD)' : ''}
            </p>
          </div>

          <div class="payment-section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Payment Details</h3>
            
            ${currencyNote}
            
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
            
            ${amountBreakdown}
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
                      <th style="width: 90px; text-align: right;">Price (${displayCurrency})</th>
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
export async function getAdminNewOrderEmail(order) {
  if (!order || !order.items) {
    console.error('Invalid order data in getAdminNewOrderEmail:', order);
    return '';
  }

  const userCurrency = order.currency || 'USD';
  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // Price calculation logic (same as customer email)
  const roundAmount = (amount) => {
    return Math.round(parseFloat(amount || 0));
  };

  const convertToLocal = (usdAmount) => {
    if (userCurrency === 'USD') return usdAmount;
    const exchangeRate = order.exchangeRate || 88.72;
    return (usdAmount || 0) * exchangeRate;
  };

const formatPrice = (amount) => {
  const numAmount = parseFloat(amount || 0);
  return numAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

  // Calculations
const localTotal = formatPrice(order.totalAmount);
const localSubtotal = formatPrice(convertToLocal(order.subtotalAmount || 0));
const shippingCost = order.shipping?.shippingCost || order.shippingCost || 0;
const localShipping = formatPrice(convertToLocal(shippingCost));
const localTax = formatPrice(convertToLocal(order.taxAmount || 0));
const localDiscount = formatPrice(convertToLocal(order.discountAmount || 0));

  const orderNumber = order.id;

  // Amount breakdown
  const amountBreakdown = `
    <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd;">
      <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">💰 Order Amount Details</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
        <div><strong>Subtotal:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localSubtotal}</div>
        
        <div><strong>Shipping:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localShipping}</div>
        
        <div><strong>Tax:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localTax}</div>
        
        ${
          (order.discountAmount || 0) > 0
            ? `
          <div><strong style="color: #dc3545;">Discount:</strong></div>
          <div style="text-align: right; color: #dc3545;">-${currencySymbol}${localDiscount}</div>
        `
            : ''
        }
        
        <div style="border-top: 2px solid #ff6b6b; padding-top: 10px; margin-top: 5px; font-weight: bold; font-size: 16px;">Total Amount:</div>
        <div style="border-top: 2px solid #ff6b6b; padding-top: 10px; margin-top: 5px; text-align: right; font-weight: bold; font-size: 16px; color: #ff6b6b;">
          ${currencySymbol}${localTotal}
        </div>
      </div>
    </div>
  `;


  // ✅ ITEMS LIST with proper handling of optional fields
const itemsHtml = order.items
  .map((item) => {
    const convertedPrice = convertToLocal(item.price || 0);
    const itemTotal = formatPrice(convertedPrice * (item.quantity || 1));
    const productImage = item.product?.images?.[0] || '/images/placeholder-product.jpg';
    const productName = item.product?.name || 'Product';
    const qty = item.quantity || 1;
    
    // ✅ SMART SELECTION DISPLAY - Use OrderResponseDto logic
    const displayText = OrderResponseDto.getItemDisplayText(item);
    
    // ✅ ALTERNATIVE: Direct field access with fallbacks
    const selectionDetails = [];
    
    // Phone case specific fields
    if (item.phoneModel) selectionDetails.push(`<strong>Model:</strong> ${item.phoneModel}`);
    if (item.finishType) selectionDetails.push(`<strong>Finish:</strong> ${item.finishType}`);
    
    // General product fields
    if (item.size && item.size !== 'Standard' && item.size !== 'N/A') {
      selectionDetails.push(`<strong>Size:</strong> ${item.size}`);
    }
    if (item.color && item.color !== 'Default' && item.color !== 'N/A') {
      selectionDetails.push(`<strong>Color:</strong> ${item.color}`);
    }
    
    // Material and other fields
    if (item.material) selectionDetails.push(`<strong>Material:</strong> ${item.material}`);
    if (item.style) selectionDetails.push(`<strong>Style:</strong> ${item.style}`);
    
    const selectionText = selectionDetails.length > 0 
      ? `<div class="item-selections" style="margin-top: 5px; font-size: 13px; color: #666;">${selectionDetails.join(' • ')}</div>`
      : '';

    return `
      <div class="order-item">
        <img src="${productImage}" alt="${productName}" class="item-image" />
        <div class="item-info">
          <div class="item-name">${productName}</div>
          ${selectionText}
          <div class="item-meta">Qty: ${qty}</div>
          <div class="item-price">${currencySymbol}${itemTotal}</div>
        </div>
      </div>
    `;
  })
  .join('');

  // Customer information section
  const customerInfo = `
    <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h4 style="margin: 0 0 10px 0; color: #004085;">👤 Customer Information</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
        <div>
          <strong>Name:</strong><br>
          ${order.user?.name || 'N/A'}
        </div>
        <div>
          <strong>Email:</strong><br>
          ${order.user?.email || 'N/A'}
        </div>
        <div>
          <strong>Order Date:</strong><br>
          ${new Date(order.createdAt || new Date()).toLocaleString()}
        </div>
        <div>
          <strong>Currency:</strong><br>
          ${userCurrency}
        </div>
      </div>
      
      <!-- Shipping Address -->
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #b6d7ff;">
        <h5 style="margin: 0 0 8px 0; color: #004085;">📍 Shipping Address</h5>
        <div style="font-size: 14px; line-height: 1.4;">
          ${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}<br>
          ${order.shippingAddress?.address1 || ''}<br>
          ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.zipCode || ''}<br>
          ${order.shippingAddress?.country || ''}<br>
          📞 ${order.shippingAddress?.phone || 'N/A'} | 📧 ${order.shippingAddress?.email || 'N/A'}
        </div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🛒 New Order Received - #${orderNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f5f5f7;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: white;
          padding: 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .alert-section {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .order-summary {
          background: #f9f9fb;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          background: #ff6b6b;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          margin: 10px 5px;
        }
        .footer {
          margin-top: 25px;
          padding: 15px;
          background: #f8f9fa;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-radius: 8px;
        }

        /* Mobile Responsive */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 25px 15px; font-size: 18px; }
          .content { padding: 20px 15px; }
          .order-item {
            flex-direction: row;
            align-items: center;
          }
          .item-image {
            width: 50px;
            height: 50px;
          }
          .action-button {
            display: block;
            width: 100%;
            text-align: center;
            margin: 10px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🛒 New Order Received!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderNumber} requires your attention</p>
        </div>

        <div class="content">
          <div class="alert-section">
            <h3 style="margin: 0 0 10px 0; color: #856404;">🚨 Action Required: Process This Order</h3>
            <p style="margin: 0;">This order needs to be processed and forwarded to Printify for fulfillment.</p>
          </div>

          ${customerInfo}

          <div class="order-summary">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #ff6b6b; padding-bottom: 8px;">📦 Order Summary</h3>
            
            <div style="margin-top:15px;">
              <strong>🛒 Items Ordered:</strong>
              ${itemsHtml}
            </div>
            
            ${amountBreakdown}
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.ADMIN_DASHBOARD_URL || 'https://admin.agumiyacollections.com'}/orders" class="action-button">View Order in Dashboard</a>
            <a href="${process.env.PRINTIFY_DASHBOARD_URL || 'https://printify.com'}" class="action-button" style="background: #4ecdc4;">Open Printify</a>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #065f46;">✅ Next Steps</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
              <li>Review order details and customer selections (size/color)</li>
              <li>Process order through Printify dashboard</li>
              <li>Ensure correct variant is selected based on customer choices</li>
              <li>Update order status once shipped</li>
              <li>Monitor for any customer inquiries</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Agumiya Collections Admin System</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
/**
 * Order Cancelled Email (Responsive) - FIXED VERSION
 */
export async function getOrderCancelledEmail(order, reason, cancelledBy, userCurrency = 'USD') {
  try {
    // ✅ ADD NULL CHECKS FOR CRITICAL PROPERTIES
    if (!order) {
      throw new Error('Order is undefined in getOrderCancelledEmail');
    }

    // ✅ SAFELY ACCESS ORDER PROPERTIES
    const displayCurrency = order.currency || userCurrency;
    const currencySymbol = getCurrencySymbol(displayCurrency);
    
    // ✅ SAFELY ACCESS ORDER ITEMS
    const orderItems = order.items || [];
    const orderUser = order.user || { email: '', name: 'Customer' };
    
    // ✅ CORRECT CONVERSION FUNCTION WITH NULL CHECKS
    const convertToLocal = (usdAmount) => {
      if (displayCurrency === 'USD') return usdAmount || 0;
      const exchangeRate = order.exchangeRate || 88.72;
      return (usdAmount || 0) * exchangeRate;
    };

    const formatPrice = (amount) => {
      return parseFloat(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

const localTotal = formatPrice(roundAmount(order.totalAmount || 0));
const localSubtotal = formatPrice(roundAmount(convertToLocal(order.subtotalAmount || 0)));
const shippingCost = (order.shipping && order.shipping.shippingCost) || order.shippingCost || 0;
const localShipping = formatPrice(roundAmount(convertToLocal(shippingCost)));
const localTax = formatPrice(roundAmount(convertToLocal(order.taxAmount || 0)));
const localDiscount = formatPrice(roundAmount(convertToLocal(order.discountAmount || 0)));
const localRefund = formatPrice(roundAmount(convertToLocal(order.refundAmount || order.totalAmount || 0)));


    // ✅ AMOUNT BREAKDOWN
  const amountBreakdown = `
      <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd;">
        <h5 style="margin: 0 0 10px 0; color: #333;">Order Amount Details</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
          <div><strong>Subtotal:</strong></div>
          <div style="text-align: right;">${currencySymbol}${localSubtotal}</div>
          
          <div><strong>Shipping:</strong></div>
          <div style="text-align: right;">${currencySymbol}${localShipping}</div>
          
          <div><strong>Tax:</strong></div>
          <div style="text-align: right;">${currencySymbol}${localTax}</div>
          
          ${(order.discountAmount || 0) > 0 ? `
            <div><strong style="color: #dc3545;">Discount:</strong></div>
            <div style="text-align: right; color: #dc3545;">-${currencySymbol}${localDiscount}</div>
          ` : ''}
          
          <div style="border-top: 2px solid #dc2626; padding-top: 10px; margin-top: 5px; font-weight: bold; font-size: 16px;">Total Amount:</div>
          <div style="border-top: 2px solid #dc2626; padding-top: 10px; margin-top: 5px; text-align: right; font-weight: bold; font-size: 16px; color: #dc2626;">
            ${currencySymbol}${localTotal}
          </div>
        </div>
      </div>
    `;

    // ✅ REFUND INFO WITH NULL CHECKS
    const refundInfo = (order.refundAmount || 0) > 0 ? `
      <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
          The refund will be processed to your original payment method. You'll receive a confirmation email once the refund is completed.
        </p>
      </div>
    ` : `
      <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">ℹ️ Payment Status</h4>
        <p style="margin: 5px 0;">No refund is required as payment was not processed for this order.</p>
      </div>
    `;

    // ✅ FIXED: Mobile-friendly items list with null checks
    const mobileItemsHtml = orderItems.map((item, index) => {
      // ✅ SAFELY ACCESS ITEM PROPERTIES
      const product = item.product || { name: 'Product', images: [] };
      const productImages = product.images || [];
      const productImage = productImages[0] || '/images/placeholder-product.jpg';
      const productName = product.name || 'Product';
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      
      const convertedPrice = convertToLocal(itemPrice);
      
      return `
        <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 12px 0; ${index === orderItems.length - 1 ? 'border-bottom: none;' : ''}">
          <div style="display: flex; gap: 10px;">
            <img src="${productImage}" alt="${productName}" width="50" style="border-radius: 6px; border: 1px solid #f0f0f0; flex-shrink: 0;">
            <div style="flex: 1;">
              <strong style="color: #333; display: block; margin-bottom: 4px;">${productName}</strong>
              <div style="margin-top: 6px; color: #666; font-size: 14px;">
                <span>Qty: ${itemQuantity}</span> • 
                <span>Price: ${currencySymbol}${formatPrice(roundAmount(convertedPrice))}</span>

              </div>
              ${displayCurrency !== 'USD' ? `
                <div style="margin-top: 4px; color: #888; font-size: 12px;">
                  <em>Originally: $${formatPrice(itemPrice)} USD</em>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // ✅ FIXED: Desktop table items with null checks
    const desktopItemsHtml = orderItems.map(item => {
      // ✅ SAFELY ACCESS ITEM PROPERTIES
      const product = item.product || { name: 'Product', images: [] };
      const productImages = product.images || [];
      const productImage = productImages[0] || '/images/placeholder-product.jpg';
      const productName = product.name || 'Product';
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      
      const convertedPrice = convertToLocal(itemPrice);
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 70px;" class="mobile-hide">
            <img src="${productImage}" alt="${productName}" width="60" style="border-radius: 6px; border: 1px solid #f0f0f0;">
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${productName}</strong>
            ${displayCurrency !== 'USD' ? `
              <div style="margin-top: 4px; color: #888; font-size: 12px;">
                <em>Originally: $${formatPrice(itemPrice)} USD</em>
              </div>
            ` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; width: 50px;" class="mobile-hide">${itemQuantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; width: 90px;" class="mobile-hide">${currencySymbol}${formatPrice(roundAmount(convertedPrice))}</td>
        </tr>
      `;
    }).join('');

    // ✅ CURRENCY NOTE
    const currencyNote = displayCurrency !== 'USD' ? `
      <div style="margin-top: 10px; padding: 10px; background: #f0f8ff; border-radius: 5px; border-left: 4px solid #dc2626;">
        <small>
          <strong>💱 Currency Note:</strong> 
          Prices converted from USD to ${displayCurrency} at rate: 1 USD = ${order.exchangeRate || 88.72} ${displayCurrency}
        </small>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Cancellation Notice - Order #${order.id || 'N/A'}</title>
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
              <span style="font-size: 1.2em; font-weight: bold; color: #dc2626;">ORDER #${order.id || 'N/A'}</span>
              <p style="margin: 10px 0; color: #666;"><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Currency:</strong> ${displayCurrency} ${displayCurrency !== 'USD' ? '(Converted from USD)' : ''}
              </p>
            </div>

            <div class="cancellation-info">
              <h3 style="color: #dc2626; margin-top: 0;">Cancellation Details</h3>
              ${currencyNote}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <p><strong>Reason:</strong><br>${reason || 'Not specified'}</p>
                  <p><strong>Cancelled by:</strong><br>${cancelledBy || 'System'}</p>
                </div>
                <div>
                  <p><strong>Original Order Date:</strong><br>${new Date(order.createdAt || new Date()).toLocaleDateString()}</p>
                  <p><strong>Order Amount:</strong><br><span style="color: #dc2626; font-weight: bold;">${currencySymbol}${localTotal}</span></p>
                </div>
              </div>
              ${amountBreakdown}
            </div>

            ${refundInfo}

            ${orderItems.length > 0 ? `
              <div class="order-items">
                <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Cancelled Items</h3>
                
                <!-- Mobile View -->
                <div class="mobile-only">
                  ${mobileItemsHtml}
                </div>
                
                <!-- Desktop View -->
                <div class="mobile-hide">
                  <table class="responsive-table">
                    <thead>
                      <tr>
                        <th style="width: 70px; text-align: center;">Image</th>
                        <th>Product</th>
                        <th style="width: 50px; text-align: center;">Qty</th>
                        <th style="width: 90px; text-align: right;">Price (${displayCurrency})</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${desktopItemsHtml}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : '<p>No items found in this order.</p>'}

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
                <a href="${process.env.CLIENT_URL || ''}/shop" style="display: inline-block; padding: 10px 20px; background: #d97706; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">Browse Products</a>
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
  } catch (error) {
    console.error('❌ Error generating cancellation email:', error);
    // Return a simple fallback email template
    return getFallbackCancellationEmail(order, reason, cancelledBy);
  }
}

// Fallback email template in case of errors
function getFallbackCancellationEmail(order, reason, cancelledBy) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Cancellation Notice</title>
    </head>
    <body>
      <h2>Order Cancellation Notice</h2>
      <p>Your order #${order?.id || 'N/A'} has been cancelled.</p>
      <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
      <p><strong>Cancelled by:</strong> ${cancelledBy || 'System'}</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br>Agumiya Collections Team</p>
    </body>
    </html>
  `;
}

/**
 * Admin Cancellation Email (Responsive) - FIXED VERSION
 */
export function getAdminCancellationEmail(order, reason, cancelledBy) {
  try {
    // ✅ ADD NULL CHECKS FOR CRITICAL PROPERTIES
    if (!order) {
      throw new Error('Order is undefined in getAdminCancellationEmail');
    }

    // ✅ SAFELY ACCESS ORDER PROPERTIES
    const displayCurrency = order.currency || 'USD';
    const currencySymbol = getCurrencySymbol(displayCurrency);
    
    // ✅ SAFELY ACCESS ORDER ITEMS
    const orderItems = order.items || [];
    const orderUser = order.user || { email: '', name: 'Customer' };
    const shippingAddress = order.shippingAddress || {};
    
    // ✅ CORRECT CONVERSION FUNCTION WITH NULL CHECKS
    const convertToLocal = (usdAmount) => {
      if (displayCurrency === 'USD') return usdAmount || 0;
      const exchangeRate = order.exchangeRate || 88.72;
      return (usdAmount || 0) * exchangeRate;
    };

    const formatPrice = (amount) => {
      return parseFloat(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // ✅ SAFELY ACCESS AMOUNTS WITH NULL CHECKS
    const localTotal = formatPrice(order.totalAmount || 0);
    const localSubtotal = formatPrice(convertToLocal(order.subtotalAmount || 0));
    const shippingCost = (order.shipping && order.shipping.shippingCost) || order.shippingCost || 0;
    const localShipping = formatPrice(convertToLocal(shippingCost));
    const localTax = formatPrice(convertToLocal(order.taxAmount || 0));
    const localDiscount = formatPrice(convertToLocal(order.discountAmount || 0));
    const localRefund = formatPrice(convertToLocal(order.refundAmount || 0));

    // ✅ AMOUNT BREAKDOWN
    const amountBreakdown = `
      <div style="margin-top: 10px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd;">
        <h5 style="margin: 0 0 8px 0; color: #333;">Amount Details</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px;">
          <div>Subtotal:</div>
          <div style="text-align: right;">${currencySymbol}${localSubtotal}</div>
          <div>Shipping:</div>
          <div style="text-align: right;">${currencySymbol}${localShipping}</div>
          <div>Tax:</div>
          <div style="text-align: right;">${currencySymbol}${localTax}</div>
          ${(order.discountAmount || 0) > 0 ? `
            <div>Discount:</div>
            <div style="text-align: right; color: #dc3545;">-${currencySymbol}${localDiscount}</div>
          ` : ''}
          <div style="border-top: 1px solid #ccc; padding-top: 6px; font-weight: bold;">Total:</div>
          <div style="border-top: 1px solid #ccc; padding-top: 6px; text-align: right; font-weight: bold;">${currencySymbol}${localTotal}</div>
        </div>
      </div>
    `;

    // ✅ FIXED: Mobile-friendly items list with null checks
    const mobileItemsHtml = orderItems.map((item, index) => {
      // ✅ SAFELY ACCESS ITEM PROPERTIES
      const product = item.product || { name: 'Product', images: [] };
      const productImages = product.images || [];
      const productImage = productImages[0] || '/images/placeholder-product.jpg';
      const productName = product.name || 'Product';
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      
      const convertedPrice = convertToLocal(itemPrice);
      
      return `
        <div class="mobile-order-item" style="border-bottom: 1px solid #eee; padding: 10px 0; ${index === orderItems.length - 1 ? 'border-bottom: none;' : ''}">
          <div style="display: flex; gap: 10px;">
            <img src="${productImage}" alt="${productName}" width="40" style="border-radius: 4px; flex-shrink: 0;">
            <div style="flex: 1;">
              <strong style="color: #333; display: block; margin-bottom: 4px;">${productName}</strong>
              <div style="color: #666; font-size: 14px;">
                <span>Qty: ${itemQuantity}</span> • 
                <span>Price: ${currencySymbol}${formatPrice(convertedPrice)}</span>
              </div>
              ${displayCurrency !== 'USD' ? `
                <div style="margin-top: 2px; color: #888; font-size: 11px;">
                  <em>Originally: $${formatPrice(itemPrice)} USD</em>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // ✅ FIXED: Desktop table items with null checks
    const desktopItemsHtml = orderItems.map(item => {
      // ✅ SAFELY ACCESS ITEM PROPERTIES
      const product = item.product || { name: 'Product', images: [] };
      const productImages = product.images || [];
      const productImage = productImages[0] || '/images/placeholder-product.jpg';
      const productName = product.name || 'Product';
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      
      const convertedPrice = convertToLocal(itemPrice);
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;" class="mobile-hide">
            <img src="${productImage}" alt="${productName}" width="40" style="border-radius: 4px;">
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            ${productName}
            ${displayCurrency !== 'USD' ? `
              <div style="color: #888; font-size: 11px;">
                <em>Originally: $${formatPrice(itemPrice)} USD</em>
              </div>
            ` : ''}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;" class="mobile-hide">${itemQuantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;" class="mobile-hide">${currencySymbol}${formatPrice(convertedPrice)}</td>
        </tr>
      `;
    }).join('');

    const refundInfo = (order.refundAmount || 0) > 0 ? `
      <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <strong>💰 Refund Required:</strong>
        <p style="margin: 8px 0 0 0;">
          Status: <strong>${order.refundStatus || 'PENDING'}</strong><br>
          Currency: ${displayCurrency}<br>
          Action: Process refund through payment gateway
        </p>
      </div>
    ` : `
      <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <strong>✅ No Refund Required:</strong>
        <p style="margin: 8px 0 0 0;">Payment was not processed or failed previously.</p>
      </div>
    `;

    // ✅ CURRENCY NOTE
    const currencyNote = displayCurrency !== 'USD' ? `
      <div style="margin-top: 8px; padding: 8px; background: #f0f8ff; border-radius: 4px; font-size: 12px;">
        <strong>💱 Currency:</strong> Converted from USD at rate: 1 USD = ${order.exchangeRate || 88.72} ${displayCurrency}
      </div>
    ` : '';

    // ✅ SAFELY ACCESS SHIPPING ADDRESS
    const shippingAddressHtml = shippingAddress.firstName ? `
      <div class="order-section">
        <h4 style="margin: 0 0 10px 0; color: #333;">Shipping Address</h4>
        <p style="margin: 5px 0;">
          ${shippingAddress.firstName} ${shippingAddress.lastName || ''}<br>
          ${shippingAddress.address1 || ''}<br>
          ${shippingAddress.address2 ? shippingAddress.address2 + '<br>' : ''}
          ${shippingAddress.city || ''}, ${shippingAddress.region || ''} ${shippingAddress.zipCode || ''}<br>
          ${shippingAddress.country || ''}<br>
          <strong>Phone:</strong> ${shippingAddress.phone || 'N/A'}
        </p>
      </div>
    ` : '<p>No shipping address found.</p>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🚨 Order Cancellation - #${order.id || 'N/A'}</title>
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
              <h3 style="margin: 0 0 10px 0; color: #dc2626;">Order #${order.id || 'N/A'} Has Been Cancelled</h3>
              <p style="margin: 0;"><strong>Cancelled by:</strong> ${cancelledBy || 'System'} | <strong>Reason:</strong> ${reason || 'Not specified'}</p>
              ${currencyNote}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
              <div class="order-section">
                <h4 style="margin: 0 0 10px 0; color: #333;">Customer Information</h4>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${orderUser.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${orderUser.email}</p>
                <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt || new Date()).toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Cancelled:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div class="order-section">
                <h4 style="margin: 0 0 10px 0; color: #333;">Order Summary</h4>
                <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${currencySymbol}${localTotal}</p>
                <p style="margin: 5px 0;"><strong>Currency:</strong> ${displayCurrency}</p>
                <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.paymentStatus || 'UNKNOWN'}</p>
                <p style="margin: 5px 0;"><strong>Fulfillment Status:</strong> ${order.fulfillmentStatus || 'UNKNOWN'}</p>
                <p style="margin: 5px 0;"><strong>Items:</strong> ${orderItems.length}</p>
                ${amountBreakdown}
              </div>
            </div>

            ${refundInfo}

            ${orderItems.length > 0 ? `
              <div class="order-section">
                <h4 style="margin: 0 0 10px 0; color: #333;">Cancelled Items</h4>
                
                <!-- Mobile View -->
                <div class="mobile-only">
                  ${mobileItemsHtml}
                </div>
                
                <!-- Desktop View -->
                <div class="mobile-hide">
                  <table class="responsive-table">
                    <thead>
                      <tr>
                        <th class="mobile-hide">Image</th>
                        <th>Product</th>
                        <th class="mobile-hide" style="text-align: center;">Qty</th>
                        <th class="mobile-hide" style="text-align: right;">Price (${displayCurrency})</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${desktopItemsHtml}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : '<p>No items found in this order.</p>'}

            ${shippingAddressHtml}

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.ADMIN_DASHBOARD_URL || ''}/orders/" class="action-button">View Order in Dashboard</a>
            </div>

            <div style="background: #e7f3ff; padding: 15px; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0; color: #004085;">Required Actions</h4>
              <ul style="margin: 0; padding-left: 20px;">
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
  } catch (error) {
    console.error('❌ Error generating admin cancellation email:', error);
    // Return a simple fallback admin email template
    return getFallbackAdminCancellationEmail(order, reason, cancelledBy);
  }
}

// Fallback admin email template
function getFallbackAdminCancellationEmail(order, reason, cancelledBy) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Cancellation Alert</title>
    </head>
    <body>
      <h2>🚨 ORDER CANCELLATION ALERT</h2>
      <p><strong>Order ID:</strong> ${order?.id || 'N/A'}</p>
      <p><strong>Cancelled by:</strong> ${cancelledBy || 'System'}</p>
      <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
      <p><strong>Customer:</strong> ${order?.user?.name || 'N/A'} (${order?.user?.email || 'N/A'})</p>
      <p><strong>Total Amount:</strong> ${order?.totalAmount || 0}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p>Please check the admin dashboard for more details.</p>
    </body>
    </html>
  `;
}
/** Refund Processed Email (Responsive)
 */
export async function getRefundProcessedEmail(order, refundId) {
  if (!order || !order.items) {
    console.error('Invalid order data in getRefundProcessedEmail:', order);
    return '';
  }

  const userCurrency = order.currency || 'USD';
  const currencySymbol = getCurrencySymbol(userCurrency);
  
  // ✅ USE SAME LOGIC AS ORDER CONFIRMATION EMAIL FOR CONSISTENCY
  const roundAmount = (amount) => {
    return Math.round(parseFloat(amount || 0));
  };

  const convertToLocal = (usdAmount) => {
    if (userCurrency === 'USD') return usdAmount;
    const exchangeRate = order.exchangeRate || 88.72;
    return (usdAmount || 0) * exchangeRate;
  };

  const formatPrice = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ✅ CORRECT CALCULATIONS (Same as order confirmation email)
  const localRefund = formatPrice(roundAmount(order.refundAmount || order.totalAmount));
  const localTotal = formatPrice(roundAmount(order.totalAmount));
  const localSubtotal = formatPrice(roundAmount(convertToLocal(order.subtotalAmount || 0)));
  const shippingCost = order.shipping?.shippingCost || order.shippingCost || 0;
  const localShipping = formatPrice(roundAmount(convertToLocal(shippingCost)));
  const localTax = formatPrice(roundAmount(convertToLocal(order.taxAmount || 0)));
  const localDiscount = formatPrice(roundAmount(convertToLocal(order.discountAmount || 0)));

  // ✅ AMOUNT BREAKDOWN SECTION (Same structure as order confirmation email)
  const amountBreakdown = `
    <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd;">
      <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">💰 Original Order Amount</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
        <div><strong>Subtotal:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localSubtotal}</div>
        
        <div><strong>Shipping:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localShipping}</div>
        
        <div><strong>Tax:</strong></div>
        <div style="text-align: right;">${currencySymbol}${localTax}</div>
        
        ${
          (order.discountAmount || 0) > 0
            ? `
          <div><strong style="color: #dc3545;">Discount:</strong></div>
          <div style="text-align: right; color: #dc3545;">-${currencySymbol}${localDiscount}</div>
        `
            : ''
        }
        
        <div style="border-top: 2px solid #059669; padding-top: 10px; margin-top: 5px; font-weight: bold; font-size: 16px;">Total Refunded:</div>
        <div style="border-top: 2px solid #059669; padding-top: 10px; margin-top: 5px; text-align: right; font-weight: bold; font-size: 16px; color: #059669;">
          ${currencySymbol}${localRefund}
        </div>
      </div>
    </div>
  `;

// ✅ SIMPLER FIX: Show ALL available selection data
const itemsHtml = order.items
  .map((item) => {
    const convertedPrice = convertToLocal(item.price || 0);
    const itemTotal = formatPrice(roundAmount(convertedPrice * (item.quantity || 1)));
    const productImage = item.product?.images?.[0] || '/images/placeholder-product.jpg';
    const productName = item.product?.name || 'Product';
    const qty = item.quantity || 1;
    
    // ✅ SHOW ALL AVAILABLE DATA - No complex logic
    const selectionDetails = [];
    
    // Add all available selection fields
    if (item.size) selectionDetails.push(`<strong>Size:</strong> ${item.size}`);
    if (item.color) selectionDetails.push(`<strong>Color:</strong> ${item.color}`);
    if (item.phoneModel) selectionDetails.push(`<strong>Model:</strong> ${item.phoneModel}`);
    if (item.finishType) selectionDetails.push(`<strong>Type:</strong> ${item.finishType}`);
    if (item.material) selectionDetails.push(`<strong>Material:</strong> ${item.material}`);
    
    const selectionText = selectionDetails.length > 0 
      ? `<div class="item-selections" style="margin-top: 5px; font-size: 13px; color: #666;">${selectionDetails.join(' • ')}</div>`
      : '';

    return `
      <div class="order-item">
        <img src="${productImage}" alt="${productName}" class="item-image" />
        <div class="item-info">
          <div class="item-name">${productName}</div>
          ${selectionText}
          <div class="item-meta">Qty: ${qty}</div>
          <div class="item-price">${currencySymbol}${itemTotal}</div>
        </div>
      </div>
    `;
  })
  .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Refund Processed - Order #${order.id}</title>
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background: #f9f9f9; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #059669 0%, #047857 100%); 
          color: white; 
          padding: 40px 20px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
        }
        .content { 
          background: white; 
          padding: 35px 30px; 
          border-radius: 0 0 10px 10px; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
        }
        .refund-success { 
          background: #d1fae5; 
          border: 1px solid #a7f3d0; 
          padding: 30px; 
          border-radius: 8px; 
          margin: 20px 0; 
          text-align: center; 
        }
        .order-summary { 
          background: #f9f9fb; 
          border-radius: 10px; 
          padding: 20px; 
          margin: 25px 0; 
        }
        .order-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          border-bottom: 1px solid #eee;
          padding: 12px 0;
        }
        .item-image {
          width: 60px;
          height: 60px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid #f0f0f0;
        }
        .item-info {
          flex: 1;
        }
        .item-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
          font-size: 14px;
        }
        .item-meta {
          font-size: 12px;
          color: #777;
          margin-bottom: 5px;
        }
        .item-price {
          font-weight: bold;
          color: #059669;
          font-size: 14px;
        }
        .next-steps { 
          background: #eff6ff; 
          padding: 25px; 
          border-radius: 8px; 
          margin: 20px 0; 
        }
        .footer { 
          margin-top: 30px; 
          padding: 20px; 
          background: #f8f9fa; 
          text-align: center; 
          font-size: 12px; 
          color: #6c757d; 
          border-radius: 8px; 
        }
        .success-icon { 
          font-size: 48px; 
          margin-bottom: 15px; 
        }
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          background: #059669;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          margin: 10px 5px;
          transition: all 0.3s ease;
        }
        .action-button:hover {
          background: #047857;
          transform: translateY(-2px);
        }
        
        /* Mobile Styles */
        @media only screen and (max-width: 600px) {
          .container { padding: 10px; }
          .header { padding: 30px 15px; }
          .content { padding: 25px 20px; }
          .refund-success, .next-steps { padding: 20px 15px; }
          .success-icon { font-size: 36px; }
          .order-item {
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }
          .item-image {
            width: 50px;
            height: 50px;
          }
          .action-button {
            display: block !important;
            width: 100% !important;
            text-align: center;
            margin: 10px 0 !important;
            padding: 14px 20px !important;
            box-sizing: border-box;
          }
        }
        
        /* Desktop-only styles */
        @media only screen and (min-width: 601px) {
          .mobile-only { display: none !important; }
        }

        /* Button container for mobile */
        .button-container {
          text-align: center;
          width: 100%;
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
            <p style="font-size: 1.1em; margin: 10px 0 0 0; color: #065f46;">
              <strong>Refund Amount: ${currencySymbol}${localRefund}</strong>
            </p>
          </div>

          <div class="order-summary">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #059669; padding-bottom: 8px;">📦 Refunded Order Details</h3>
            
            <p><strong>Order Number:</strong> #${order.id}</p>
            <p><strong>Refund ID:</strong> ${refundId}</p>
            <p><strong>Processed Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Original Order Date:</strong> ${new Date(order.createdAt || new Date()).toLocaleDateString()}</p>
            
            <div style="margin-top:15px;">
              <strong>🛒 Refunded Items:</strong>
              ${itemsHtml}
            </div>
            
            ${amountBreakdown}
          </div>

          <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #d97706; margin-top: 0;">⏳ Refund Timeline</h4>
            <p><strong>Expected Processing:</strong> 3-5 business days</p>
            <p><strong>Payment Method:</strong> Refund will be credited to your original payment method</p>
            
            <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px;">
              <strong>💡 Important:</strong>
              <p style="margin: 8px 0 0 0; font-size: 14px;">If you don't see the refund after 5 business days, please contact your bank first as processing times may vary.</p>
            </div>
          </div>

          <div class="next-steps">
            <h3 style="color: #1e40af; margin-top: 0; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">What's Next?</h3>
            
            <div class="button-container">
              <a href="${process.env.CLIENT_URL || 'https://agumiyacollections.com'}/shop" class="action-button">Continue Shopping</a>
              <a href="mailto:support@agumiyacollections.com" class="action-button" style="background: #667eea;">Contact Support</a>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #475569;">Need Help?</h4>
            <p>If you have any questions about your refund:</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <strong>📧 Email Support</strong>
                <p style="margin: 8px 0 0 0;"><a href="mailto:support@agumiyacollections.com" style="color: #059669;">support@agumiyacollections.com</a></p>
              </div>
              <div>
                <strong>📞 Phone Support</strong>
                <p style="margin: 8px 0 0 0;">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your patience and understanding. We hope to serve you better in the future!</p>
          <p><strong>Agumiya Collections Team</strong></p>
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

// Add this function to your email templates


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