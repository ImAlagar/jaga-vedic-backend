// src/utils/contactEmailTemplates.js

// 🔹 Contact Confirmation Email (Sent to user)
export function getContactConfirmationEmail(inquiry) {
  const inquiryTypeLabels = {
    'GENERAL': 'General Inquiry',
    'ORDER_SUPPORT': 'Order Support',
    'PRODUCT_QUESTION': 'Product Question',
    'SHIPPING': 'Shipping Information',
    'RETURNS': 'Returns & Exchanges',
    'COMPLAINT': 'Complaint',
    'FEEDBACK': 'Feedback',
    'OTHER': 'Other'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We've Received Your Inquiry</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        .badge { display: inline-block; padding: 5px 15px; background: #667eea; color: white; border-radius: 20px; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Inquiry Received!</h1>
          <p>Thank you for contacting Tech Buddyzz</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="badge">REF: #${inquiry.id}</span>
            <p>We've received your message and will get back to you within 24 hours.</p>
          </div>

          <div class="info-card">
            <h3>Your Inquiry Details</h3>
            <p><strong>Name:</strong> ${inquiry.name}</p>
            <p><strong>Email:</strong> ${inquiry.email}</p>
            ${inquiry.phone ? `<p><strong>Phone:</strong> ${inquiry.phone}</p>` : ''}
            <p><strong>Subject:</strong> ${inquiry.subject}</p>
            <p><strong>Inquiry Type:</strong> ${inquiryTypeLabels[inquiry.inquiryType] || inquiry.inquiryType}</p>
            <p><strong>Submitted:</strong> ${new Date(inquiry.createdAt).toLocaleString()}</p>
          </div>

          <div class="info-card">
            <h3>Your Message</h3>
            <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 3px solid #667eea;">
              ${inquiry.message}
            </p>
          </div>

          ${inquiry.scheduleCallback ? `
          <div class="info-card" style="border-left-color: #28a745;">
            <h3>📞 Callback Scheduled</h3>
            <p>You've requested a callback. We'll contact you at your preferred time.</p>
            ${inquiry.callbackTime ? `<p><strong>Scheduled Time:</strong> ${new Date(inquiry.callbackTime).toLocaleString()}</p>` : ''}
          </div>
          ` : ''}

          <div class="info-card">
            <h3>What Happens Next?</h3>
            <ul>
              <li>Our team will review your inquiry</li>
              <li>We'll respond within 24 hours</li>
              <li>For urgent matters, you can call us at +1 (555) 123-4567</li>
            </ul>
          </div>

          <div class="footer">
            <p><strong>Tech Buddyzz Support Team</strong></p>
            <p>Email: support@techbuddyzz.com | Phone: +1 (555) 123-4567</p>
            <p>© ${new Date().getFullYear()} Tech Buddyzz. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔹 New Inquiry Notification (Sent to admin)
export function getNewInquiryAdminEmail(inquiry) {
  const inquiryTypeLabels = {
    'GENERAL': 'General Inquiry',
    'ORDER_SUPPORT': 'Order Support',
    'PRODUCT_QUESTION': 'Product Question',
    'SHIPPING': 'Shipping Information',
    'RETURNS': 'Returns & Exchanges',
    'COMPLAINT': 'Complaint',
    'FEEDBACK': 'Feedback',
    'OTHER': 'Other'
  };

  const priorityBadge = inquiry.inquiryType === 'COMPLAINT' ? 
    '<span style="background: #dc3545; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; margin-left: 10px;">HIGH PRIORITY</span>' : 
    '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Inquiry - #${inquiry.id}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 25px; border-radius: 0 0 10px 10px; }
        .info-card { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e9ecef; }
        .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🆕 New Contact Inquiry</h1>
          <p>Inquiry #${inquiry.id} requires attention ${priorityBadge}</p>
        </div>
        
        <div class="content">
          ${inquiry.inquiryType === 'COMPLAINT' ? `
          <div class="urgent">
            <strong>⚠️ High Priority:</strong> This is a customer complaint that requires immediate attention.
          </div>
          ` : ''}

          <div class="info-card">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${inquiry.name}</p>
            <p><strong>Email:</strong> ${inquiry.email}</p>
            ${inquiry.phone ? `<p><strong>Phone:</strong> ${inquiry.phone}</p>` : ''}
            <p><strong>Inquiry Type:</strong> ${inquiryTypeLabels[inquiry.inquiryType] || inquiry.inquiryType}</p>
            <p><strong>Submitted:</strong> ${new Date(inquiry.createdAt).toLocaleString()}</p>
          </div>

          <div class="info-card">
            <h3>Inquiry Details</h3>
            <p><strong>Subject:</strong> ${inquiry.subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">
              ${inquiry.message}
            </div>
          </div>

          ${inquiry.scheduleCallback ? `
          <div class="info-card" style="border-left: 4px solid #28a745;">
            <h3>📞 Callback Requested</h3>
            <p>Customer has requested a callback.</p>
            ${inquiry.callbackTime ? `<p><strong>Preferred Time:</strong> ${new Date(inquiry.callbackTime).toLocaleString()}</p>` : ''}
          </div>
          ` : ''}

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.ADMIN_DASHBOARD_URL}/contact/${inquiry.id}" class="btn">
              View Inquiry in Dashboard
            </a>
          </div>

          <div style="background: #e9ecef; padding: 15px; border-radius: 5px; font-size: 0.9em;">
            <strong>Quick Actions:</strong>
            <ul>
              <li>Respond to customer within 24 hours</li>
              <li>Update inquiry status in admin panel</li>
              <li>Add internal notes if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}