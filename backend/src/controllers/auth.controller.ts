import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.sendOtp(req.body.phone, req.ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp, name, email } = req.body;
    const result = await authService.verifyOtp(phone, otp, name, email, req.ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}
