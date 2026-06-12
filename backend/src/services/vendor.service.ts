import { VendorStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { normalizePhone } from '../utils/sanitize';
import { logAudit, AuditActions } from './audit.service';

export async function registerVendor(data: {
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string;
}) {
  const phone = normalizePhone(data.phone);
  return prisma.vendor.create({
    data: {
      shopName: data.shopName,
      ownerName: data.ownerName,
      phone,
      email: data.email,
      status: VendorStatus.PENDING,
    },
  });
}

export async function listVendors(status?: VendorStatus) {
  return prisma.vendor.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getVendorById(id: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw new NotFoundError('Vendor not found');
  return vendor;
}

export async function updateVendor(
  id: string,
  data: {
    shopName?: string;
    ownerName?: string;
    email?: string;
    status?: VendorStatus;
  },
  userId?: string
) {
  const vendor = await getVendorById(id);
  const updated = await prisma.vendor.update({
    where: { id },
    data,
  });

  await logAudit(AuditActions.VENDOR_UPDATED, {
    userId,
    metadata: { vendorId: id, changes: data, previousStatus: vendor.status },
  });

  return updated;
}
