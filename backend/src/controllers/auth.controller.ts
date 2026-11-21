import { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    const user = await authService.getProfile(req.user!.userId);
    res.json({ success: true, data: user });
  }
}

export const authController = new AuthController();
