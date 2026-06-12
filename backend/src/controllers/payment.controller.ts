import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';

export async function getGateways(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.getPaymentGateways();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.createPayment(
      { ...req.body, userId: req.user?.userId },
      req.ip
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function verifyRazorpayPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.verifyRazorpayPayment({
      ...req.body,
      userId: req.user?.userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.verifyPayment(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.getPaymentStatus(String(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function paymentCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.handlePaymentCallback({
      orderId: req.query.orderId as string,
      txn: req.query.txn as string,
    });
    res.redirect(302, result.redirectUrl);
  } catch (err) {
    next(err);
  }
}

export async function paymentWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization ?? '';
    const rawBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

    const result = await paymentService.handleWebhook(authorization, rawBody);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refundPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await paymentService.processRefund({
      ...req.body,
      userId: req.user?.userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
