import { Request, Response, NextFunction } from 'express';
import { TransactionStatus } from '@prisma/client';
import * as transactionService from '../services/transaction.service';

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as TransactionStatus | undefined;
    const txs = await transactionService.getAllTransactions({
      status,
      userId: req.user?.role === 'ADMIN' ? undefined : req.user?.userId,
    });
    res.json({
      success: true,
      data: txs.map((t) => transactionService.serializeTransaction(t as never)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const tx = await transactionService.getTransactionById(String(req.params.id));
    res.json({ success: true, data: transactionService.serializeTransaction(tx) });
  } catch (err) {
    next(err);
  }
}
