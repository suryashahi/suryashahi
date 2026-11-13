---
title: "Building Real-Time Features with Socket.IO and Redis"
date: "2025-08-12"
category: "Backend"
readTime: "12 min read"
description: "Implementing live order tracking, notifications, and collaborative features — scaling WebSocket connections with Redis adapter and handling reconnection logic."
tags: ["Socket.IO", "Redis", "WebSocket", "Real-time", "Node.js", "Scaling"]
heroImage: "blog-placeholder-4.webp"
---

# Building Real-Time Features with Socket.IO and Redis

Real-time features transform static apps into living systems — live order tracking, instant notifications, collaborative editing, presence indicators. But scaling WebSockets beyond a single server introduces complexity: message broadcasting, connection state, reconnection handling. Here's how I built production real-time infrastructure for [BrewQ](https://github.com/suryashahi/brewq) using Socket.IO with Redis adapter.

## Why Socket.IO Over Raw WebSockets?

[Socket.IO](https://socket.io/) isn't just a WebSocket wrapper. It provides:

- **Automatic reconnection** with exponential backoff
- **Fallback transports** (polling → WebSocket) for restrictive networks
- **Room/namespace abstraction** for targeted broadcasting
- **Binary support** for efficient payloads
- **Middleware support** for auth, logging, rate limiting

## Architecture: Horizontal Scaling with Redis Adapter

A single Socket.IO server handles ~10k concurrent connections. For BrewQ, we needed to scale horizontally across multiple Node.js instances behind a load balancer. The [Redis Adapter](https://github.com/socketio/socket.io-redis) solves this by using Redis Pub/Sub to forward messages between server instances.

```javascript
// server/socket.js
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
    },
    // Tuning for production
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6 // 1MB
});

// Redis adapter for horizontal scaling
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

// Redis client for presence, rate limiting, etc.
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

module.exports = { io, redis };
```

## Authentication Middleware

Never trust client-sent user IDs. Validate JWT on connection and attach user to socket.

```javascript
// server/middleware/socketAuth.js
const jwt = require('jsonwebtoken');
const { redis } = require('../socket');

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
        return next(new Error('Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify session still valid in Redis
        const session = await redis.get(`session:${decoded.sessionId}`);
        if (!session) {
            return next(new Error('Session expired'));
        }

        socket.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            sessionId: decoded.sessionId
        };
        socket.userId = decoded.userId; // Convenience

        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});
```

## Connection Lifecycle & Presence

Track online users, handle disconnects gracefully, and maintain presence across server restarts.

```javascript
// server/handlers/presence.js
const { io, redis } = require('../socket');

const USER_KEY = 'user:';
const ONLINE_USERS = 'online:users';
const USER_SOCKETS = 'user:sockets:'; // userId -> Set(socketIds)

io.on('connection', async (socket) => {
    const { userId } = socket.user;

    // Track this socket for the user
    await redis.sAdd(`${USER_SOCKETS}${userId}`, socket.id);
    const socketCount = await redis.sCard(`${USER_SOCKETS}${userId}`);

    // First socket for this user -> mark online
    if (socketCount === 1) {
        await redis.sAdd(ONLINE_USERS, userId);
        await redis.hSet(`${USER_KEY}${userId}`, {
            lastSeen: Date.now(),
            status: 'online'
        });
        // Broadcast presence to relevant rooms
        socket.broadcast.emit('user:online', { userId });
    }

    // Join user's personal room (for direct messages, notifications)
    socket.join(`user:${userId}`);

    // Join role-based rooms
    socket.join(`role:${socket.user.role}`);

    console.log(`User ${userId} connected (socket: ${socket.id}, total sockets: ${socketCount})`);

    // Handle explicit presence updates
    socket.on('presence:update', async (data) => {
        const { status, customMessage } = data; // 'away', 'busy', 'offline'
        await redis.hSet(`${USER_KEY}${userId}`, {
            status,
            customMessage,
            lastSeen: Date.now()
        });
        socket.broadcast.to(`user:${userId}`).emit('presence:updated', { userId, status, customMessage });
    });

    // Disconnect handling
    socket.on('disconnect', async (reason) => {
        await redis.sRem(`${USER_SOCKETS}${userId}`, socket.id);
        const remaining = await redis.sCard(`${USER_SOCKETS}${userId}`);

        if (remaining === 0) {
            // Last socket disconnected
            await redis.sRem(ONLINE_USERS, userId);
            await redis.hSet(`${USER_KEY}${userId}`, {
                status: 'offline',
                lastSeen: Date.now()
            });
            socket.broadcast.emit('user:offline', { userId, lastSeen: Date.now() });
        }

        console.log(`User ${userId} disconnected (${reason}), remaining sockets: ${remaining}`);
    });
});
```

## Room-Based Broadcasting: Order Tracking

BrewQ's core real-time feature: customers track order status live, baristas see new orders instantly, admins monitor all activity.

```javascript
// server/handlers/orders.js
const { io, redis } = require('../socket');
const { Order } = require('../models');

const ORDER_ROOM = (orderId) => `order:${orderId}`;
const CAFE_ROOM = (cafeId) => `cafe:${cafeId}`;

io.on('connection', (socket) => {
    // Customer joins their order room
    socket.on('order:track', async (orderId) => {
        const order = await Order.findById(orderId);
        if (!order || order.customerId !== socket.userId) {
            return socket.emit('error', { message: 'Order not found or unauthorized' });
        }
        socket.join(ORDER_ROOM(orderId));
        // Send current state immediately
        socket.emit('order:state', { orderId, status: order.status, updatedAt: order.updatedAt });
    });

    // Barista joins cafe room (all orders for their cafe)
    socket.on('cafe:join', async (cafeId) => {
        // Verify barista works at this cafe
        const works = await redis.sIsMember(`cafe:${cafeId}:baristas`, socket.userId);
        if (!works) return socket.emit('error', { message: 'Unauthorized' });

        socket.join(CAFE_ROOM(cafeId));
        // Send pending orders
        const orders = await Order.find({ cafeId, status: { $in: ['pending', 'preparing'] } });
        socket.emit('cafe:orders', { orders });
    });

    // Admin joins global monitoring room
    socket.on('admin:monitor', () => {
        if (socket.user.role !== 'admin') return;
        socket.join('admin:monitor');
    });
});

// Helper: Emit order update to all relevant rooms
async function emitOrderUpdate(order) {
    const payload = {
        orderId: order._id,
        status: order.status,
        items: order.items,
        updatedAt: order.updatedAt,
        estimatedReady: order.estimatedReady
    };

    // Customer tracking this order
    io.to(ORDER_ROOM(order._id)).emit('order:updated', payload);

    // Baristas at this cafe
    io.to(CAFE_ROOM(order.cafeId)).emit('order:updated', payload);

    // Admins
    io.to('admin:monitor').emit('order:updated', payload);
}

module.exports = { emitOrderUpdate };
```

## Frontend: React Hook for Socket.IO

```javascript
// frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket(token) {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            setConnected(false);
            console.log('Socket disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            setError(err.message);
            console.error('Connection error:', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]);

    const emit = useCallback((event, data) => {
        socketRef.current?.emit(event, data);
    }, []);

    const on = useCallback((event, handler) => {
        socketRef.current?.on(event, handler);
        return () => socketRef.current?.off(event, handler);
    }, []);

    const off = useCallback((event, handler) => {
        socketRef.current?.off(event, handler);
    }, []);

    return { socket: socketRef.current, connected, error, emit, on, off };
}

// Specialized hook for order tracking
export function useOrderTracking(orderId, token) {
    const [orderState, setOrderState] = useState(null);
    const { connected, emit, on, off } = useSocket(token);

    useEffect(() => {
        if (!orderId || !connected) return;

        emit('order:track', orderId);

        const handleState = (data) => setOrderState(data);
        const handleUpdate = (data) => setOrderState(data);

        on('order:state', handleState);
        on('order:updated', handleUpdate);

        return () => {
            off('order:state', handleState);
            off('order:updated', handleUpdate);
        };
    }, [orderId, connected, emit, on, off]);

    return { orderState, connected };
}
```

## Rate Limiting & Abuse Prevention

WebSocket connections are long-lived — protect against spam, DDoS, and resource exhaustion.

```javascript
// server/middleware/rateLimit.js
const { redis } = require('../socket');

const RATE_LIMITS = {
    'order:track': { max: 10, window: 60 },      // 10/min
    'presence:update': { max: 30, window: 60 },  // 30/min
    'chat:message': { max: 20, window: 60 },     // 20/min
    default: { max: 100, window: 60 }            // 100/min
};

async function socketRateLimit(socket, event, data) {
    const limits = RATE_LIMITS[event] || RATE_LIMITS.default;
    const key = `ratelimit:${socket.userId}:${event}`;

    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, limits.window);
    }

    if (current > limits.max) {
        socket.emit('error', {
            code: 'RATE_LIMITED',
            message: `Too many ${event} requests. Try again later.`,
            retryAfter: await redis.ttl(key)
        });
        return false; // Reject
    }
    return true; // Allow
}

// Apply to all events
io.on('connection', (socket) => {
    ['order:track', 'presence:update', 'chat:message'].forEach(event => {
        socket.on(event, async (data, callback) => {
            const allowed = await socketRateLimit(socket, event, data);
            if (!allowed) return;
            // ... actual handler
        });
    });
});
```

## Handling Reconnection & State Sync

Network hiccups happen. Clients must gracefully reconnect and sync missed events.

```javascript
// frontend/src/hooks/useReconnectionSync.js
import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';

export function useReconnectionSync(token, { onMissedEvents }) {
    const { socket, connected, on, off } = useSocket(token);
    const lastEventIdRef = useRef(null);
    const isReconnectingRef = useRef(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('connect', async () => {
            if (isReconnectingRef.current && lastEventIdRef.current) {
                // Request missed events since last known event ID
                socket.emit('sync:request', {
                    lastEventId: lastEventIdRef.current,
                    userId: socket.userId
                });
            }
            isReconnectingRef.current = true;
        });

        socket.on('sync:response', (data) => {
            // Replay missed events in order
            data.events.forEach(event => {
                onMissedEvents(event);
                lastEventIdRef.current = event.id;
            });
        });

        // Track event IDs for all incoming events
        const trackEventId = (event) => {
            if (event.id) lastEventIdRef.current = event.id;
        };

        // Attach to all event handlers (simplified)
        socket.onAny(trackEventId);

        return () => {
            socket.offAny(trackEventId);
        };
    }, [socket, onMissedEvents]);
}
```

```javascript
// Server: Sync handler
io.on('connection', (socket) => {
    socket.on('sync:request', async ({ lastEventId, userId }) => {
        // Verify user owns this session
        if (userId !== socket.userId) return;

        // Fetch missed events from Redis stream
        const events = await redis.xRange(
            `events:user:${userId}`,
            '(' + lastEventId, // Exclusive start
            '+',
            { COUNT: 100 }
        );

        const formattedEvents = events.map(([id, fields]) => ({
            id,
            type: fields.type,
            payload: JSON.parse(fields.payload),
            timestamp: parseInt(fields.timestamp)
        }));

        socket.emit('sync:response', { events: formattedEvents });
    });
});
```

## Redis Streams for Event Persistence

Use Redis Streams as an event log for replay, debugging, and audit trails.

```javascript
// server/utils/eventLog.js
const { redis } = require('../socket');

async function logEvent(userId, type, payload) {
    const streamKey = `events:user:${userId}`;
    await redis.xAdd(streamKey, '*', {
        type,
        payload: JSON.stringify(payload),
        timestamp: Date.now().toString()
    });

    // Trim to last 1000 events per user
    await redis.xTrim(streamKey, 'MAXLEN', '~', 1000);
}

// Usage in order handler
async function emitOrderUpdate(order) {
    const payload = { /* ... */ };

    // Emit real-time
    io.to(ORDER_ROOM(order._id)).emit('order:updated', payload);
    io.to(CAFE_ROOM(order.cafeId)).emit('order:updated', payload);

    // Persist for replay
    await logEvent(order.customerId, 'order:updated', payload);
    await logEvent(order.cafeId, 'order:updated', payload); // Cafe-level log
}
```

## Production Checklist

- ✅ Redis adapter configured for horizontal scaling
- ✅ JWT authentication on connection
- ✅ Rate limiting per event type
- ✅ Presence tracking with multi-socket support
- ✅ Room-based broadcasting (user, cafe, role, admin)
- ✅ Reconnection handling with state sync
- ✅ Redis Streams for event persistence & replay
- ✅ Connection metrics: active sockets, messages/sec, errors
- ✅ Graceful shutdown: drain connections before deploy
- ✅ Load balancer: sticky sessions or Redis adapter (prefer adapter)

## Monitoring Dashboard Metrics

```javascript
# Prometheus metrics for Socket.IO
const activeConnections = new promClient.Gauge({
    name: 'socketio_active_connections',
    help: 'Current active WebSocket connections',
    labelNames: ['server_id']
});

const messagesReceived = new promClient.Counter({
    name: 'socketio_messages_received_total',
    help: 'Total messages received',
    labelNames: ['event', 'server_id']
});

const messagesSent = new promClient.Counter({
    name: 'socketio_messages_sent_total',
    help: 'Total messages sent',
    labelNames: ['event', 'server_id']
});

const reconnections = new promClient.Counter({
    name: 'socketio_reconnections_total',
    help: 'Total reconnection attempts',
    labelNames: ['server_id', 'reason']
});

// Update on connect/disconnect
io.on('connection', (socket) => {
    activeConnections.inc({ server_id: process.env.HOSTNAME });

    socket.on('disconnect', () => {
        activeConnections.dec({ server_id: process.env.HOSTNAME });
    });

    socket.onAny((event, ...args) => {
        messagesReceived.inc({ event, server_id: process.env.HOSTNAME });
    });
});

// Wrap emit to count outgoing
const originalEmit = io.emit.bind(io);
io.emit = (event, ...args) => {
    messagesSent.inc({ event, server_id: process.env.HOSTNAME });
    return originalEmit(event, ...args);
};
```

## Conclusion

Real-time at scale isn't magic — it's careful architecture: Redis adapter for horizontal scaling, room-based broadcasting for targeted delivery, authentication middleware for security, rate limiting for stability, and event persistence for reliability.

BrewQ uses this exact stack: 3 Node.js instances behind NGINX, Redis Cluster for adapter + streams + presence, handling 5k+ concurrent connections with <50ms message latency. [Explore the codebase](https://github.com/suryashahi/brewq) or read the [full system design writeup](/blog/brewq-system-design.html).

---

*Next up: Virtual Try-On with FASHN VTON — integrating diffusion models for photorealistic fashion try-on in StyleAI. The generative AI deep dive you've been waiting for!*