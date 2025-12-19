import { Router } from 'express';
import { db } from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';

export const templateRouter = Router();

templateRouter.get('/', async (req, res) => {
    const templates = await db.template.findMany();
    res.json(templates);
});

templateRouter.post('/:id/use', authenticate, async (req: AuthRequest, res) => {
    // Authenticated
    if (!req.user) return res.status(401).send();

    const tmpl = await db.template.findUnique({ where: { id: req.params.id } });
    if (!tmpl) return res.status(404).send();

    const workflow = await db.workflow.create({
        data: {
            name: `${tmpl.name} (Copy)`,
            description: tmpl.description || '',
            definition: tmpl.definition,
            userId: req.user.id,
            tags: ''
        }
    });

    res.json(workflow);
});
