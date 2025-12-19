import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../lib/audit';
import { CreateWorkflowSchema } from '../shared';
import { executionQueue } from '../lib/queue';

export const workflowRouter = Router();

workflowRouter.use(authenticate);

workflowRouter.get('/', async (req: AuthRequest, res) => {
    const workflows = await db.workflow.findMany({
        where: { userId: req.user!.id },
        include: { executions: { take: 1, orderBy: { startedAt: 'desc' }, select: { status: true, finishedAt: true } } }
    });
    res.json(workflows);
});

workflowRouter.post('/', async (req: AuthRequest, res) => {
    try {
        const data = CreateWorkflowSchema.parse(req.body);
        const workflow = await db.workflow.create({
            data: {
                name: data.name || 'Untitled Workflow',
                userId: req.user!.id,
                definition: JSON.stringify({ nodes: [], edges: [] }),
                tags: ''
            }
        });

        await createAuditLog(req.user!.id, 'WORKFLOW_CREATE', workflow.id, 'WORKFLOW', { name: workflow.name });
        res.status(201).json(workflow);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

workflowRouter.get('/:id', async (req: AuthRequest, res) => {
    const workflow = await db.workflow.findFirst({
        where: { id: req.params.id, userId: req.user!.id }
    });
    if (!workflow) return res.status(404).send();

    try {
        (workflow as any).definition = JSON.parse(workflow.definition);
    } catch {
        (workflow as any).definition = { nodes: [], edges: [] };
    }

    res.json(workflow);
});

workflowRouter.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { definition, ...rest } = req.body;

        const current = await db.workflow.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
        if (!current) return res.status(404).send();

        const updated = await db.workflow.update({
            where: { id: req.params.id },
            data: {
                ...rest,
                definition: definition ? JSON.stringify(definition) : undefined
            }
        });
        res.json(updated); // Frontend might expect parsed definition? Usually it just refreshes or uses local state.
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

workflowRouter.post('/:id/run', async (req: AuthRequest, res) => {
    const workflow = await db.workflow.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!workflow) return res.status(404).send();

    let definitionObj;
    try { definitionObj = JSON.parse(workflow.definition); } catch { definitionObj = { nodes: [], edges: [] }; }

    // Create Execution
    const execution = await db.execution.create({
        data: {
            workflowId: workflow.id,
            status: 'PENDING',
            triggerType: 'manual',
        }
    });

    // Add to Queue
    await executionQueue.add('run-workflow', {
        executionId: execution.id,
        workflowDefinition: definitionObj,
        triggerData: {
            startedAt: new Date(),
            userId: req.user!.id,
            manual: true
        }
    });

    res.json({ executionId: execution.id });
});

// Missing from previous attempt: POST restore, publish etc. adhering to interface not fully required for MVP smoke test
workflowRouter.delete('/:id', async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
        const userId = req.user!.id;

        console.log(`[DELETE] Starting deletion for workflow ${id} (User: ${userId})`);

        const workflow = await db.workflow.findFirst({
            where: { id, userId }
        });

        if (!workflow) {
            console.error(`[DELETE] Workflow ${id} not found for user ${userId}`);
            return res.status(404).json({ error: 'Workflow not found' });
        }

        console.log(`[DELETE] Cleaning up versions...`);
        const vCount = await db.workflowVersion.deleteMany({ where: { workflowId: id } });
        console.log(`[DELETE] Versions deleted: ${vCount.count}`);

        console.log(`[DELETE] Finding executions...`);
        const executions = await db.execution.findMany({ where: { workflowId: id }, select: { id: true } });
        const execIds = executions.map(e => e.id);
        console.log(`[DELETE] Found ${execIds.length} executions. Cleaning logs...`);

        const lCount = await db.executionLog.deleteMany({ where: { executionId: { in: execIds } } });
        console.log(`[DELETE] Logs deleted: ${lCount.count}`);

        const eCount = await db.execution.deleteMany({ where: { workflowId: id } });
        console.log(`[DELETE] Executions deleted: ${eCount.count}`);

        console.log(`[DELETE] Deleting main workflow record...`);
        await db.workflow.delete({
            where: { id }
        });

        console.log(`[DELETE] Success for workflow ${id}`);
        await createAuditLog(req.user!.id, 'WORKFLOW_DELETE', id, 'WORKFLOW', { name: workflow.name });
        res.json({ success: true });
    } catch (e: any) {
        console.error(`[DELETE ERROR] ${id}: ${e.message}`, e);
        res.status(500).json({ error: e.message || 'Failed to delete workflow' });
    }
});

// --- Versions ---

workflowRouter.get('/:id/versions', async (req: AuthRequest, res) => {
    const versions = await db.workflowVersion.findMany({
        where: { workflowId: req.params.id, workflow: { userId: req.user!.id } },
        orderBy: { versionNumber: 'desc' }
    });
    res.json(versions);
});

workflowRouter.post('/:id/versions', async (req: AuthRequest, res) => {
    const workflow = await db.workflow.findFirst({
        where: { id: req.params.id, userId: req.user!.id }
    });
    if (!workflow) return res.status(404).send();

    const lastVersion = await db.workflowVersion.findFirst({
        where: { workflowId: workflow.id },
        orderBy: { versionNumber: 'desc' }
    });

    const version = await db.workflowVersion.create({
        data: {
            workflowId: workflow.id,
            definition: workflow.definition,
            versionNumber: (lastVersion?.versionNumber || 0) + 1
        }
    });

    res.json(version);
});

workflowRouter.get('/:id/executions', async (req: AuthRequest, res) => {
    const executions = await db.execution.findMany({
        where: { workflowId: req.params.id, workflow: { userId: req.user!.id } },
        orderBy: { startedAt: 'desc' },
        take: 10
    });
    res.json(executions);
});

workflowRouter.post('/:id/duplicate', async (req: AuthRequest, res) => {
    // ... MVP Stub
    res.status(501).send();
});
