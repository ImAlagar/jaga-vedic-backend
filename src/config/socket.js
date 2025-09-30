// src/config/socket.js
import { Server } from "socket.io";
import logger from "../utils/logger.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join admin room for real-time order updates
    socket.on('joinAdminRoom', () => {
      socket.join('admin');
      logger.info(`Admin joined admin room: ${socket.id}`);
    });
    
    // Join user room for order status updates
    socket.on('joinUserRoom', (userId) => {
      socket.join(`user_${userId}`);
      logger.info(`User ${userId} joined their room: ${socket.id}`);
    });
    
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Utility functions for emitting events
export const socketEvents = {
  emitNewOrder: (order) => {
    if (io) {
      io.to('admin').emit('newOrder', order);
      logger.info(`New order event emitted to admin room: Order #${order.id}`);
    }
  },
  
  emitOrderUpdate: (order) => {
    if (io) {
      io.to('admin').emit('orderUpdated', order);
      io.to(`user_${order.user.id}`).emit('orderStatusUpdated', order);
      logger.info(`Order update event emitted: Order #${order.id}`);
    }
  },
  
  emitToUser: (userId, event, data) => {
    if (io) {
      io.to(`user_${userId}`).emit(event, data);
      logger.info(`Event ${event} emitted to user ${userId}`);
    }
  }
};