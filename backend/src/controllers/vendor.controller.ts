import { Request, Response, NextFunction } from 'express';
import { VendorStatus } from '@prisma/client';
import * as vendorService from '../services/vendor.service';

export async function registerVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.registerVendor(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}

export async function listVendors(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as VendorStatus | undefined;
    const vendors = await vendorService.listVendors(status);
    res.json({ success: true, data: vendors });
  } catch (err) {
    next(err);
  }
}

export async function getVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.getVendorById(String(req.params.id));
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}

export async function updateVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const vendor = await vendorService.updateVendor(
      String(req.params.id),
      req.body,
      req.user?.userId
    );
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
}
