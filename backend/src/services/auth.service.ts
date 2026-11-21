import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateToken } from '../middleware/auth';
import { JwtPayload } from '../types';
import { AppError } from '../utils/AppError';

export class AuthService {
  async login(email: string, password: string) {
    const normalizedEmail = email
      .trim()
      .toLowerCase()
      .replace(/@(certiflow\.(demo|in))$/, '@certiflow.gov.in');

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { district: true, centre: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 400);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 400);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
      centreId: user.centreId,
      districtId: user.districtId,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        centre: user.centre,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        centreId: true,
        districtId: true,
        createdAt: true,
        updatedAt: true,
        district: true,
        centre: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}

export const authService = new AuthService();
