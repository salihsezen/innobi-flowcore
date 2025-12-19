import { Queue, Worker } from 'bullmq';
import { MemoryQueue, MemoryWorker } from './queue-memory';
import { workflowEngine } from '../services/workflowEngine';
import { db } from './db';


const USE_REDIS = process.env.USE_REDIS === 'true';

const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Queue Factory
export const executionQueue = (USE_REDIS
    ? new Queue('workflow-execution', { connection: redisOptions })
    : new MemoryQueue('workflow-execution')) as any;

// Worker Logic
const workerProcessor = async (job: any) => {
    const { executionId, workflowDefinition, triggerData } = job.data;

    console.log(`Processing execution ${executionId} (Mode: ${USE_REDIS ? 'Redis' : 'Memory'})`);

    try {
        await db.execution.update({
            where: { id: executionId },
            data: { status: 'RUNNING' as any, startedAt: new Date() } // Type cast for safety if enum vs string mismatch
        });

        const output = await workflowEngine.runURI(workflowDefinition, triggerData, executionId);

        await db.execution.update({
            where: { id: executionId },
            data: {
                status: 'SUCCESS' as any,
                finishedAt: new Date(),
                output: JSON.stringify(output || {}) // Stringify
            }
        });

    } catch (error: any) {
        console.error(`Execution ${executionId} failed:`, error);
        await db.execution.update({
            where: { id: executionId },
            data: {
                status: 'FAILED' as any,
                finishedAt: new Date(),
                error: error.message
            }
        });
    }
};

// Init Worker
if (USE_REDIS) {
    const worker = new Worker('workflow-execution', workerProcessor, { connection: redisOptions });
    worker.on('error', err => console.error('Queue error:', err));
} else {
    // In memory worker automatically attaches to the queue singleton
    new MemoryWorker('workflow-execution', workerProcessor);
}
