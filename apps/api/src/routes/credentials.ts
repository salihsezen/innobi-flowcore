import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { encrypt } from '../lib/crypto';

export const credentialRouter = Router();

credentialRouter.use(authenticate);

credentialRouter.get('/', async (req: AuthRequest, res) => {
    const credentials = await db.credential.findMany({
        where: { userId: req.user!.id }
    });
    // Mask data
    const masked = credentials.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        createdAt: c.createdAt
    }));
    res.json(masked);
});

credentialRouter.post('/', async (req: AuthRequest, res) => {
    const { name, type, data } = req.body;

    const encrypted = encrypt(JSON.stringify(data));
    const cred = await db.credential.create({
        data: {
            name,
            type,
            dataEncrypted: encrypted,
            userId: req.user!.id
        }
    });
    res.json({ id: cred.id });
});
credentialRouter.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const cred = await db.credential.findUnique({
            where: { id: req.params.id }
        });

        if (!cred) return res.status(404).json({ error: 'Credential not found' });

        // Security check: Only owner or admin can delete
        const isAdmin = (req.user as any)?.role === 'ADMIN';
        if (cred.userId !== req.user!.id && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        await db.credential.delete({
            where: { id: req.params.id }
        });

        // Audit Logging
        await db.auditLog.create({
            data: {
                userId: req.user!.id,
                action: 'CREDENTIAL_DELETE',
                entityId: req.params.id,
                entityType: 'CREDENTIAL',
                details: JSON.stringify({ name: cred.name, type: cred.type })
            }
        });

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
