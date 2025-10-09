// utils/emailTemplates.js
export function getPasswordResetEmail(resetUrl, adminName = 'Admin') {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #fff; border: 1px solid #e9ecef; }
                .button { display: inline-block; padding: 12px 24px; background: #007bff; 
                         color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                .footer { margin-top: 20px; padding: 20px; background: #f8f9fa; 
                         text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Agumiya Collections</h2>
                </div>
                <div class="content">
                    <h3>Password Reset Request</h3>
                    <p>Hello ${adminName},</p>
                    <p>We received a request to reset your password for your Agumiya Collections admin account.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="${resetUrl}" class="button">Reset Password</a>
                    </p>
                    <p>This link will expire in 10 minutes for security reasons.</p>
                    <p>If you didn't request this password reset, please ignore this email or contact our support team immediately.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

export function getPasswordResetSuccessEmail(adminName = 'Admin') {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; text-align: center; }
                .content { padding: 30px; background: #fff; border: 1px solid #e9ecef; }
                .footer { margin-top: 20px; padding: 20px; background: #f8f9fa; 
                         text-align: center; font-size: 12px; color: #6c757d; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Agumiya Collections</h2>
                </div>
                <div class="content">
                    <h3>Password Reset Successful</h3>
                    <p>Hello ${adminName},</p>
                    <p>Your password has been successfully reset for your Agumiya Collections admin account.</p>
                    <p>If you did not initiate this change, please contact our support team immediately to secure your account.</p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Agumiya Collections. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}


// utils/emailTemplates.js (Add these templates)
export function getWelcomeEmail(name) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Welcome to Our Platform, ${name}!</h2>
            <p>Thank you for registering. Please verify your email address to get started.</p>
        </div>
    </body>
    </html>
  `;
}



// 🔹 Order Confirmation Email (Sent when order is created)
export function getOrderConfirmationEmail(order) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <img src="${item.product.images[0]}" alt="${item.product.name}" width="60" style="border-radius: 8px;">
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.product.name}</strong><br>
        <small>Size: ${item.size} | Color: ${item.color}</small>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 10px; text-align: left; }
        .total { font-size: 1.2em; font-weight: bold; color: #667eea; }
        .status { display: inline-block; padding: 5px 15px; background: #ffa500; color: white; border-radius: 20px; font-size: 0.9em; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Order Confirmed!</h1>
          <p>Thank you for your purchase. We're preparing your order.</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="status">ORDER #${order.id}</span>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>

          <div class="order-details">
            <h3>Order Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" style="text-align: right; padding: 10px; border-top: 2px solid #eee;"><strong>Total Amount:</strong></td>
                  <td style="text-align: right; padding: 10px; border-top: 2px solid #eee;" class="total">$${order.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="order-details">
            <h3>Shipping Address</h3>
            <p>
              <strong>${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</strong><br>
              ${order.shippingAddress.address1}<br>
              ${order.shippingAddress.address2 ? order.shippingAddress.address2 + '<br>' : ''}
              ${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.zipCode}<br>
              ${order.shippingAddress.country}<br>
              📞 ${order.shippingAddress.phone}<br>
              📧 ${order.shippingAddress.email}
            </p>
          </div>

          <div class="order-details">
            <h3>What's Next?</h3>
            <p>We'll notify you when your order ships. You can track your order status anytime from your account.</p>
            <p><strong>Payment Status:</strong> <span class="status" style="background: #ffa500;">${order.paymentStatus}</span></p>
            ${order.orderNotes ? `<p><strong>Your Notes:</strong> ${order.orderNotes}</p>` : ''}
          </div>

          <div class="footer">
            <p>If you have any questions, reply to this email or contact our support team.</p>
            <p>© ${new Date().getFullYear()} Your Store Name. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔹 Payment Success Email (Sent when payment is confirmed)
export function getPaymentSuccessEmail(order) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <img src="${item.product.images[0]}" alt="${item.product.name}" width="60" style="border-radius: 8px;">
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.product.name}</strong><br>
        <small>Size: ${item.size} | Color: ${item.color}</small>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmed</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 10px; text-align: left; }
        .total { font-size: 1.2em; font-weight: bold; color: #4CAF50; }
        .status { display: inline-block; padding: 5px 15px; background: #4CAF50; color: white; border-radius: 20px; font-size: 0.9em; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Payment Confirmed!</h1>
          <p>Your payment has been successfully processed.</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="status">ORDER #${order.id}</span>
            <p><strong>Paid on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="order-details">
            <h3>Payment Details</h3>
            <p><strong>Amount Paid:</strong> <span class="total">$${order.totalAmount.toFixed(2)}</span></p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Credit Card'}</p>
            <p><strong>Status:</strong> <span class="status">PAID</span></p>
          </div>

          <div class="order-details">
            <h3>Order Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="order-details">
            <h3>Next Steps</h3>
            <p>Your order is now being processed. We'll start production soon and notify you when it ships.</p>
            <p>Expected processing time: 3-5 business days</p>
          </div>

          <div class="footer">
            <p>Thank you for your business! We appreciate your trust in us.</p>
            <p>© ${new Date().getFullYear()} Your Store Name. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔹 Admin New Order Notification
export function getAdminNewOrderEmail(order) {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        <img src="${item.product.images[0]}" alt="${item.product.name}" width="40" style="border-radius: 4px;">
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Notification</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
        th { background: #f5f5f5; padding: 8px; text-align: left; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 New Order Received!</h1>
          <p>Order #${order.id} requires your attention</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>Action Required:</strong> This order needs to be processed and forwarded to Printify.
          </div>

          <div class="order-details">
            <h3>Order Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right; padding: 8px; border-top: 2px solid #eee;"><strong>Total:</strong></td>
                  <td style="text-align: right; padding: 8px; border-top: 2px solid #eee;"><strong>$${order.totalAmount.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="order-details">
            <h3>Customer Information</h3>
            <p><strong>Customer:</strong> ${order.user.name} (${order.user.email})</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            <p><strong>Fulfillment Status:</strong> ${order.fulfillmentStatus}</p>
          </div>

          <div class="order-details">
            <h3>Shipping Address</h3>
            <p>
              ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
              ${order.shippingAddress.address1}<br>
              ${order.shippingAddress.address2 ? order.shippingAddress.address2 + '<br>' : ''}
              ${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.zipCode}<br>
              ${order.shippingAddress.country}<br>
              Phone: ${order.shippingAddress.phone}
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.ADMIN_DASHBOARD_URL}/orders/${order.id}" class="btn">View Order in Dashboard</a>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em;">
            <strong>Quick Actions:</strong>
            <ul>
              <li>Review order details in admin panel</li>
              <li>Forward to Printify if payment is confirmed</li>
              <li>Contact customer if any issues</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔹 Order Shipped Email
export function getOrderShippedEmail(order, trackingInfo) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order Has Shipped!</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .tracking-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status { display: inline-block; padding: 10px 20px; background: #28a745; color: white; border-radius: 25px; font-size: 1.1em; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚚 Your Order Has Shipped!</h1>
          <p>Great news! Your order is on its way to you.</p>
        </div>
        
        <div class="content">
          <div class="tracking-info">
            <span class="status">SHIPPED</span>
            <h2>Order #${order.id}</h2>
            ${trackingInfo ? `
              <p><strong>Tracking Number:</strong> ${trackingInfo.number}</p>
              <p><strong>Carrier:</strong> ${trackingInfo.carrier}</p>
              <a href="${trackingInfo.url}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Track Your Package</a>
            ` : '<p>Tracking information will be available soon.</p>'}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3>Estimated Delivery</h3>
            <p>Your order should arrive within 5-10 business days.</p>
            <p>If you have any questions about your delivery, please contact our support team.</p>
          </div>

          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>© ${new Date().getFullYear()} Your Store Name. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔹 Payment Failed Email
export function getPaymentFailedEmail(order, errorMessage) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Issue with Your Order</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Payment Issue</h1>
          <p>There was a problem processing your payment</p>
        </div>
        
        <div class="content">
          <div class="alert">
            <strong>Payment Failed:</strong> ${errorMessage || 'There was an issue processing your payment method.'}
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3>Order #${order.id}</h3>
            <p><strong>Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px;">
            <h3>What to Do Next</h3>
            <p>Please update your payment information to complete your order. Your items are reserved for 24 hours.</p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.CLIENT_URL}/order/${order.id}/payment" class="btn">Update Payment Information</a>
            </div>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <p><strong>Need help?</strong> Contact our support team if you need assistance with your payment.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// src/utils/emailTemplates.js - Add these templates

export function getOrderCancelledEmail(order, reason, cancelledBy) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Order Cancelled</h2>
      <p>Dear ${order.user.name},</p>
      
      <p>Your order <strong>#${order.id}</strong> has been cancelled.</p>
      
      <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
        <p><strong>Cancelled on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Order Amount:</strong> ₹${order.totalAmount}</p>
      </div>

      ${order.refundStatus === 'PENDING' ? `
        <p>Your refund of <strong>₹${order.refundAmount}</strong> is being processed and will be credited to your original payment method within 5-7 business days.</p>
      ` : ''}
      
      ${order.refundStatus === 'COMPLETED' ? `
        <p>Your refund of <strong>₹${order.refundAmount}</strong> has been processed successfully.</p>
      ` : ''}

      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br>Your Store Team</p>
    </div>
  `;
}

export function getRefundProcessedEmail(order, refundId) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Refund Processed</h2>
      <p>Dear ${order.user.name},</p>
      
      <p>We have processed your refund for order <strong>#${order.id}</strong>.</p>
      
      <div style="background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Refund Amount:</strong> ₹${order.refundAmount}</p>
        <p><strong>Refund ID:</strong> ${refundId}</p>
        <p><strong>Processed on:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p>The amount will be credited to your original payment method within 5-7 business days.</p>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br>Your Store Team</p>
    </div>
  `;
}