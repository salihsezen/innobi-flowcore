import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { workflowRouter } from './routes/workflows';
import { executionRouter } from './routes/executions';
import { credentialRouter } from './routes/credentials';
import { templateRouter } from './routes/templates';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/workflows', workflowRouter);
app.use('/executions', executionRouter);
app.use('/credentials', credentialRouter);
app.use('/templates', templateRouter);

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'automation-api' });
});

export default app;
