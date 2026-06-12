import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.createOrder({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json({ success: true, data: orderService.serializeOrder(order as never) });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getOrderById(String(req.params.id), req.user?.userId);
    res.json({ success: true, data: orderService.serializeOrder(order) });
  } catch (err) {
    next(err);
  }
}

export async function getUserOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await orderService.getUserOrders(req.user!.userId);
    res.json({
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        serviceName: o.serviceName,
        vendorName: o.vendorName,
        amount: Number(o.amount),
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        createdAt: o.createdAt,
        transaction: o.transactions[0]
          ? {
              transactionId: o.transactions[0].transactionId,
              status: o.transactions[0].status,
            }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}
