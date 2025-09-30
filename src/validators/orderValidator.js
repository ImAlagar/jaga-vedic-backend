import { body, param } from "express-validator";

export const orderValidators = {
  createOrder: [
    body("items")
      .isArray({ min: 1 })
      .withMessage("Order must contain at least one item"),
    body("items.*.productId")
      .isInt({ min: 1 })
      .withMessage("Invalid product ID"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("shippingAddress")
      .isObject()
      .withMessage("Shipping address is required"),
    body("shippingAddress.firstName")
      .notEmpty()
      .withMessage("First name is required"),
    body("shippingAddress.lastName")
      .notEmpty()
      .withMessage("last name is required"),
    body("shippingAddress.email")
      .notEmpty()
      .withMessage("Valid email is required"),
    body("shippingAddress.phone")
      .notEmpty()
      .withMessage("Phone number is required"),
    body("shippingAddress.address1")
      .notEmpty()
      .withMessage("Address is required"),
    body("shippingAddress.city").notEmpty().withMessage("City is required"),
    body("shippingAddress.country")
      .notEmpty()
      .withMessage("Country is required"),
    body("shippingAddress.zipCode")
      .notEmpty()
      .withMessage("Zip code is required"),
  ],

    updateStatus: [
    param('orderId')
      .isInt({ min: 1 })
      .withMessage('Invalid order ID'),
    body('paymentStatus')
      .optional()
      .isIn(['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'])
      .withMessage('Invalid payment status'),
    body('fulfillmentStatus')
      .optional()
      .isIn(['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
      .withMessage('Invalid fulfillment status')
  ]
};
