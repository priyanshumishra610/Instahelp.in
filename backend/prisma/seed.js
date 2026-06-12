"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.appSettings.upsert({
        where: { id: 'default' },
        create: {
            businessName: 'InstaHelp',
            supportEmail: 'mail@instahelp.in',
            supportNumber: '+91 70227 02220',
            paymentsEnabled: true,
            phonepeEnabled: true,
            successUrl: '/payment-success.html',
            failureUrl: '/payment-failed.html',
        },
        update: {},
    });
    const adminPhone = process.env.ADMIN_PHONE ?? '+919999999999';
    await prisma.user.upsert({
        where: { phone: adminPhone },
        create: {
            phone: adminPhone,
            name: 'InstaHelp Admin',
            role: client_1.UserRole.ADMIN,
        },
        update: { role: client_1.UserRole.ADMIN },
    });
    console.log('Seed completed');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map