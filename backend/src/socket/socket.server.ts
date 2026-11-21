import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

let _io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as JwtPayload;
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);
    if (user.districtId) socket.join(`district:${user.districtId}`);
    if (user.centreId) socket.join(`centre:${user.centreId}`);

    socket.on('disconnect', () => {
      // cleanup handled automatically
    });
  });

  _io = io;
  return io;
}

export function getIO(): Server | null {
  return _io;
}

export function emitToAll(event: string, data: Record<string, unknown>): void {
  if (_io) _io.emit(event, data);
}

export function emitToRole(role: string, event: string, data: Record<string, unknown>): void {
  if (_io) _io.to(`role:${role}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: Record<string, unknown>): void {
  if (_io) _io.to(`user:${userId}`).emit(event, data);
}

export function emitToDistrict(districtId: string, event: string, data: Record<string, unknown>): void {
  if (_io) _io.to(`district:${districtId}`).emit(event, data);
}
