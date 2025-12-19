import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!admin) throw new Error("Admin not found");

    // Delete existing demo if any
    await prisma.workflow.deleteMany({
        where: { name: "Live Demo Flow 🚀" }
    });

    const flow = await prisma.workflow.create({
        data: {
            name: "Live Demo Flow 🚀",
            description: "A simple flow to demonstrate the engine.",
            userId: admin.id,
            status: "PUBLISHED",
            tags: "demo",
            definition: JSON.stringify({
                nodes: [
                    { id: 'start', type: 'manual-trigger', position: { x: 100, y: 200 }, data: { label: 'Start Button', type: 'manual-trigger' } },
                    { id: 'process', type: 'code', position: { x: 400, y: 200 }, data: { label: 'Magic Code', type: 'code', config: { code: 'return { message: "Hello from the Live Demo!", timestamp: new Date().toISOString() };' } } },
                    { id: 'end', type: 'http-request', position: { x: 700, y: 200 }, data: { label: 'Fake API Call', type: 'http-request', config: { url: 'https://jsonplaceholder.typicode.com/todos/1', method: 'GET' } } }
                ],
                edges: [
                    { id: 'e1', source: 'start', target: 'process' },
                    { id: 'e2', source: 'process', target: 'end' }
                ]
            })
        }
    });
    console.log(`Created Flow_ID: ${flow.id}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
