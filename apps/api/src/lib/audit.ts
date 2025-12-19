import { db } from './db';

export async function createAuditLog(userId: string, action: string, entityId?: string, entityType?: string, details?: any) {
    try {
        await db.auditLog.create({
            data: {
                userId,
                action,
                entityId,
                entityType,
                details: details ? JSON.stringify(details) : undefined
            }
        });
    } catch (err) {
        console.error('Failed to create audit log:', err);
    }
}
