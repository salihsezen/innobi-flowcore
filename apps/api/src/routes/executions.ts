import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const executionRouter = Router();

executionRouter.use(authenticate);

executionRouter.get('/', async (req: AuthRequest, res) => {
    const { workflowId, status } = req.query;
    const where: any = { workflow: { userId: req.user!.id } };

    if (workflowId) where.workflowId = String(workflowId);
    if (status) where.status = String(status);

    const executions = await db.execution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 50
    });

    // No deep parse needed for list usually?
    res.json(executions);
});

executionRouter.get('/:id', async (req: AuthRequest, res) => {
    const execution = await db.execution.findFirst({
        where: { id: req.params.id, workflow: { userId: req.user!.id } },
        include: { logs: true }
    });
    if (!execution) return res.status(404).send();

    // Parse
    try { if (execution.input) execution.input = JSON.parse(execution.input as string) as any; } catch { }
    try { if (execution.output) execution.output = JSON.parse(execution.output as string) as any; } catch { }

    execution.logs.forEach((log: any) => {
        try { if (log.data) log.data = JSON.parse(log.data); } catch { }
    });

    res.json(execution);
});
