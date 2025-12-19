import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import { RegisterSchema, LoginSchema } from '../shared';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

authRouter.post('/register', async (req, res) => {
    try {
        const data = RegisterSchema.parse(req.body);
        const exists = await db.user.findUnique({ where: { email: data.email } });
        if (exists) return res.status(400).json({ error: 'User exists' });

        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await db.user.create({
            data: { email: data.email, passwordHash, name: data.name }
        });

        res.json({ id: user.id, email: user.email });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

authRouter.post('/login', async (req, res) => {
    try {
        const data = LoginSchema.parse(req.body);
        const user = await db.user.findUnique({ where: { email: data.email } });
        if (!user || !await bcrypt.compare(data.password, user.passwordHash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

authRouter.get('/me', async (req: any, res) => {
    // Basic decode without middleware
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await db.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const { passwordHash, ...safe } = user;
        res.json(safe);
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});
