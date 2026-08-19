/**
 * Socket.IO Real-Time Service (services/socket.service.js)
 * Manages WebSocket client connections, JWT authentication handshake, auto-reconnection, and notification listeners.
 */

import { authService } from './auth.service.js';
import { API_BASE_URL } from '../utils/constants.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.notificationListeners = new Set();
    this.unreadCountListeners = new Set();
  }

  /**
   * Initializes the Socket.IO client connection with authentication token.
   */
  initSocket() {
    if (this.socket) return this.socket;

    const token = authService.getToken();
    const serverOrigin = API_BASE_URL ? API_BASE_URL.replace('/api', '') : 'https://ai-resume-analyzer-rn7x.onrender.com';

    if (typeof io === 'undefined') {
      console.warn('Socket.IO client library not loaded from CDN; real-time alerts falling back to REST.');
      return null;
    }

    try {
      this.socket = io(serverOrigin, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log(`[Socket.IO] Connected to real-time alerts server (ID: ${this.socket.id})`);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        console.log(`[Socket.IO] Disconnected: ${reason}`);
      });

      this.socket.on('connect_error', (err) => {
        console.warn(`[Socket.IO] Connection error: ${err.message}`);
      });

      // Real-Time Notification Broadcast Handler
      this.socket.on('notification:new', (notification) => {
        this.notificationListeners.forEach((listener) => {
          try {
            listener(notification);
          } catch (err) {
            console.error('Error in notification listener:', err);
          }
        });
      });

      // Real-Time Unread Count Update Handler
      this.socket.on('notification:unread_count', (payload) => {
        this.unreadCountListeners.forEach((listener) => {
          try {
            listener(payload.unreadCount);
          } catch (err) {
            console.error('Error in unread count listener:', err);
          }
        });
      });

      return this.socket;
    } catch (err) {
      console.warn(`[Socket.IO] Failed to initialize socket: ${err.message}`);
      return null;
    }
  }

  /**
   * Subscribes a callback to new incoming notifications.
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onNotification(callback) {
    this.notificationListeners.add(callback);
    return () => this.notificationListeners.delete(callback);
  }

  /**
   * Subscribes a callback to live unread count updates.
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onUnreadCount(callback) {
    this.unreadCountListeners.add(callback);
    return () => this.unreadCountListeners.delete(callback);
  }

  /**
   * Disconnects the socket.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
