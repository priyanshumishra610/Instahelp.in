import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const result = await adminService.getAdminOrders(page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getVendors(req: Request, res: Response, next: NextFunction) {
  try {
    const vendors = await adminService.getAdminVendors();
    res.json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const result = await adminService.getAdminTransactions(page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.getPaymentSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updatePaymentSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.updatePaymentSettings(req.body, req.user?.userId);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}
