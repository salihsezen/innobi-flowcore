import { EventEmitter } from 'events';

// Mimics a subset of BullMQ Job
interface MockJob {
    data: any;
}

// Mimics BullMQ Queue
export class MemoryQueue {
    private name: string;
    private worker?: (job: MockJob) => Promise<void>;
    private queue: any[] = [];

    constructor(name: string) {
        this.name = name;
        // Global registry for simple wiring
        (global as any).mockQueues = (global as any).mockQueues || {};
        (global as any).mockQueues[name] = this;
    }

    async add(name: string, data: any) {
        const job = { data };
        this.queue.push(job);
        this.process();
    }

    registerWorker(processor: (job: MockJob) => Promise<void>) {
        this.worker = processor;
        this.process();
    }

    private async process() {
        if (!this.worker) return;

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            try {
                await this.worker(job);
            } catch (e) {
                console.error('Mock Worker Error:', e);
            }
        }
    }
}

// Mimics BullMQ Worker
export class MemoryWorker {
    constructor(name: string, processor: (job: MockJob) => Promise<any>, options?: any) {
        // Find the queue and register this processor
        const queues = (global as any).mockQueues || {};
        const queue = queues[name];
        if (queue && queue instanceof MemoryQueue) {
            queue.registerWorker(processor);
        } else {
            // Retry or wait? For MVP, we assume queue created first.
            // Or store processor for later.
            setTimeout(() => {
                const q = ((global as any).mockQueues || {})[name];
                if (q) q.registerWorker(processor);
            }, 1000);
        }
    }

    on(event: string, cb: any) {
        // no-op for MVP
    }
}
