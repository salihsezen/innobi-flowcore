import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NodeType = {
    MANUAL_TRIGGER: "manual-trigger",
    WEBHOOK_TRIGGER: "webhook-trigger",
    SCHEDULE_TRIGGER: "schedule-trigger",
    HTTP_REQUEST: "http-request",
    SEND_EMAIL: "send-email",
    SLACK_MESSAGE: "slack-message",
    SET: "set",
    IF: "if",
    SWITCH: "switch",
    MERGE: "merge",
    CODE: "code",
    LOOP: "loop",
    DELAY: "delay",
    AI_AGENT: "ai-agent",
};

async function main() {
    const adminEmail = 'admin@example.com';
    const userEmail = 'user@example.com';

    // 1. Create Users
    const adminPass = await bcrypt.hash('Admin123!', 10);
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            passwordHash: adminPass,
            name: 'Admin User',
            role: 'ADMIN'
        }
    });

    const userPass = await bcrypt.hash('User123!', 10);
    const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
            email: userEmail,
            passwordHash: userPass,
            name: 'Demo User',
            role: 'USER'
        }
    });

    console.log('Users seeded.');

    // 2. Define Templates

    // --- Template 1: GenAI - Intelligent Customer Support ---
    const supportTemplate = {
        nodes: [
            { id: 'start', type: NodeType.WEBHOOK_TRIGGER, position: { x: 50, y: 300 }, data: { label: 'Inbound Chat', config: { path: '/chat-hook', method: 'POST' } } },
            { id: 'classify', type: NodeType.AI_AGENT, position: { x: 450, y: 300 }, data: { label: 'Classify Intent', config: { prompt: 'Analyze this message: {{start.message}}. Classify into: support, sales, or general.', model: 'gpt-4' } } },
            { id: 'router', type: NodeType.SWITCH, position: { x: 850, y: 300 }, data: { label: 'Route Intent', config: { field: 'classify.response', cases: [{ value: 'support', handle: 'support' }, { value: 'sales', handle: 'sales' }] } } },

            // Support Branch
            { id: 'kb_search', type: NodeType.HTTP_REQUEST, position: { x: 1250, y: 100 }, data: { label: 'Search KB', config: { url: 'https://api.internal.kb/search?q={{start.message}}', method: 'GET' } } },
            { id: 'kb_answer', type: NodeType.AI_AGENT, position: { x: 1650, y: 100 }, data: { label: 'Draft Answer', config: { prompt: 'Using these docs: {{kb_search.data}}, answer this: {{start.message}}' } } },

            // Sales Branch
            { id: 'crm_lookup', type: NodeType.HTTP_REQUEST, position: { x: 1250, y: 500 }, data: { label: 'Check CRM', config: { url: 'https://api.hubspot.com/contacts/{{start.email}}', method: 'GET' } } },
            { id: 'sales_alert', type: NodeType.SLACK_MESSAGE, position: { x: 1650, y: 500 }, data: { label: 'Notify Sales', config: { webhookUrl: 'https://hooks.slack.com/...', text: 'Hot lead detected: {{start.email}}' } } },

            // General Branch (Default)
            { id: 'gen_chat', type: NodeType.AI_AGENT, position: { x: 1250, y: 300 }, data: { label: 'General Chat', config: { prompt: 'Reply to: {{start.message}}' } } },

            // Merge & Reply
            { id: 'merge', type: NodeType.MERGE, position: { x: 2100, y: 300 }, data: { label: 'Merge Responses' } },
            { id: 'reply', type: NodeType.HTTP_REQUEST, position: { x: 2500, y: 300 }, data: { label: 'Send Reply', config: { url: '{{start.callback_url}}', method: 'POST', body: '{"text": "{{merge.data}}"}' } } },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'classify' },
            { id: 'e2', source: 'classify', target: 'router' },
            { id: 'e3', source: 'router', sourceHandle: 'support', target: 'kb_search' },
            { id: 'e4', source: 'kb_search', target: 'kb_answer' },
            { id: 'e5', source: 'router', sourceHandle: 'sales', target: 'crm_lookup' },
            { id: 'e6', source: 'crm_lookup', target: 'sales_alert' },
            { id: 'e7', source: 'router', sourceHandle: 'default', target: 'gen_chat' },
            { id: 'e8', source: 'kb_answer', target: 'merge' },
            { id: 'e9', source: 'sales_alert', target: 'merge' },
            { id: 'e10', source: 'gen_chat', target: 'merge' },
            { id: 'e11', source: 'merge', target: 'reply' }
        ]
    };

    // --- Template 2: GenAI - Daily Market Intelligence ---
    const newsTemplate = {
        nodes: [
            { id: 'timer', type: NodeType.SCHEDULE_TRIGGER, position: { x: 50, y: 300 }, data: { label: 'Every Morning', config: { cron: '0 8 * * *' } } },
            { id: 'fetch_tech', type: NodeType.HTTP_REQUEST, position: { x: 450, y: 150 }, data: { label: 'Fetch Tech News', config: { url: 'https://newsapi.org/v2/top-headlines?category=technology', method: 'GET' } } },
            { id: 'fetch_crypto', type: NodeType.HTTP_REQUEST, position: { x: 450, y: 450 }, data: { label: 'Fetch Crypto News', config: { url: 'https://api.coindesk.com/v1/news', method: 'GET' } } },
            { id: 'combiner', type: NodeType.MERGE, position: { x: 850, y: 300 }, data: { label: 'Combine Lists' } },
            { id: 'iterator', type: NodeType.LOOP, position: { x: 1250, y: 300 }, data: { label: 'For Each Article', config: { field: 'combiner' } } },
            { id: 'summarizer', type: NodeType.AI_AGENT, position: { x: 1650, y: 300 }, data: { label: 'Summarize', config: { prompt: 'Summarize in 2 sentences: {{iterator.content}}' } } },
            { id: 'filter_bad', type: NodeType.IF, position: { x: 2050, y: 300 }, data: { label: 'Is Important?', config: { conditions: [{ field: 'summarizer.response', operator: 'contains', value: 'important' }] } } },
            { id: 'digest_builder', type: NodeType.CODE, position: { x: 2450, y: 300 }, data: { label: 'Build Digest HTML', config: { code: 'return context.digest + "<li>" + input.title + "</li>"' } } },
            { id: 'send_email', type: NodeType.SEND_EMAIL, position: { x: 2850, y: 300 }, data: { label: 'Send Digest', config: { to: 'team@company.com', subject: 'Daily Intelligence', body: '{{digest_builder.result}}' } } }
        ],
        edges: [
            { id: 'e1', source: 'timer', target: 'fetch_tech' },
            { id: 'e2', source: 'timer', target: 'fetch_crypto' },
            { id: 'e3', source: 'fetch_tech', target: 'combiner' },
            { id: 'e4', source: 'fetch_crypto', target: 'combiner' },
            { id: 'e5', source: 'combiner', target: 'iterator' },
            { id: 'e6', source: 'iterator', target: 'summarizer' },
            { id: 'e7', source: 'summarizer', target: 'filter_bad' },
            { id: 'e8', source: 'filter_bad', sourceHandle: 'true', target: 'digest_builder' },
            { id: 'e9', source: 'digest_builder', target: 'send_email' }
        ]
    };

    // --- Template 3: GenAI - Lead Enrichment & Scoring Pipeline ---
    const leadTemplate = {
        nodes: [
            { id: 'new_lead', type: NodeType.WEBHOOK_TRIGGER, position: { x: 50, y: 300 }, data: { label: 'New Lead Form' } },
            { id: 'format', type: NodeType.SET, position: { x: 450, y: 300 }, data: { label: 'Format Data', config: { fields: [{ key: 'email', value: '{{new_lead.body.email}}' }] } } },
            { id: 'enrich', type: NodeType.HTTP_REQUEST, position: { x: 850, y: 300 }, data: { label: 'Clearbit Enrichment', config: { url: 'https://person.clearbit.com/v2/combined/find?email={{format.email}}' } } },
            { id: 'scorer', type: NodeType.AI_AGENT, position: { x: 1250, y: 300 }, data: { label: 'AI Score Lead', config: { prompt: 'Score this lead 0-100 based on title {{enrich.employment.title}} and company size {{enrich.company.metrics.employees}}. Return only number.' } } },
            { id: 'check_score', type: NodeType.IF, position: { x: 1650, y: 300 }, data: { label: 'Score > 80?', config: { conditions: [{ field: 'scorer.response', operator: 'greaterThan', value: '80' }] } } },

            // High Priority
            { id: 'slack_high', type: NodeType.SLACK_MESSAGE, position: { x: 2050, y: 150 }, data: { label: '🔥 Hot Lead Alert', config: { text: 'New High Value Lead: {{format.email}}' } } },
            { id: 'crm_high', type: NodeType.HTTP_REQUEST, position: { x: 2450, y: 150 }, data: { label: 'Add to Pipedrive (High)', config: { url: 'https://api.pipedrive.com/deals', body: '{"priority": "high"}' } } },

            // Low Priority
            { id: 'crm_low', type: NodeType.HTTP_REQUEST, position: { x: 2050, y: 450 }, data: { label: 'Add to Pipedrive (Low)', config: { url: 'https://api.pipedrive.com/deals', body: '{"priority": "low"}' } } },
            { id: 'nurture_email', type: NodeType.SEND_EMAIL, position: { x: 2450, y: 450 }, data: { label: 'Welcome Email', config: { subject: 'Thanks for contacting us' } } },
            { id: 'wait_3d', type: NodeType.DELAY, position: { x: 2850, y: 450 }, data: { label: 'Wait 3 Days', config: { duration: 259200000 } } },
            { id: 'followup_email', type: NodeType.SEND_EMAIL, position: { x: 3250, y: 450 }, data: { label: 'Follow Up', config: { subject: 'Checking in...' } } }
        ],
        edges: [
            { id: 'e1', source: 'new_lead', target: 'format' },
            { id: 'e2', source: 'format', target: 'enrich' },
            { id: 'e3', source: 'enrich', target: 'scorer' },
            { id: 'e4', source: 'scorer', target: 'check_score' },
            { id: 'e5', source: 'check_score', sourceHandle: 'true', target: 'slack_high' },
            { id: 'e6', source: 'slack_high', target: 'crm_high' },
            { id: 'e7', source: 'check_score', sourceHandle: 'false', target: 'crm_low' },
            { id: 'e8', source: 'crm_low', target: 'nurture_email' },
            { id: 'e9', source: 'nurture_email', target: 'wait_3d' },
            { id: 'e10', source: 'wait_3d', target: 'followup_email' }
        ]
    };

    // --- Template 4: GenAI - Social Content Machine ---
    const socialTemplate = {
        nodes: [
            { id: 'manual', type: NodeType.MANUAL_TRIGGER, position: { x: 50, y: 250 }, data: { label: 'Start Generation' } },
            { id: 'ideation', type: NodeType.AI_AGENT, position: { x: 450, y: 250 }, data: { label: 'Generate 5 Ideas', config: { prompt: 'Give me 5 viral tweet ideas about AI Agents.' } } },
            { id: 'loop_ideas', type: NodeType.LOOP, position: { x: 850, y: 250 }, data: { label: 'Loop Ideas' } },

            // Parallel: Tweet & LinkedIn
            { id: 'draft_tweet', type: NodeType.AI_AGENT, position: { x: 1250, y: 100 }, data: { label: 'Draft Tweet' } },
            { id: 'draft_linkedin', type: NodeType.AI_AGENT, position: { x: 1250, y: 400 }, data: { label: 'Draft LinkedIn' } },

            { id: 'img_gen', type: NodeType.HTTP_REQUEST, position: { x: 1650, y: 250 }, data: { label: 'Gen Image (DALL-E)', config: { url: 'https://api.openai.com/v1/images/generations' } } },

            { id: 'approval', type: NodeType.SLACK_MESSAGE, position: { x: 2050, y: 250 }, data: { label: 'Request Approval', config: { text: 'New content ready for review.' } } }
        ],
        edges: [
            { id: 'e1', source: 'manual', target: 'ideation' },
            { id: 'e2', source: 'ideation', target: 'loop_ideas' },
            { id: 'e3', source: 'loop_ideas', target: 'draft_tweet' },
            { id: 'e4', source: 'loop_ideas', target: 'draft_linkedin' },
            { id: 'e5', source: 'draft_tweet', target: 'img_gen' },
            { id: 'e6', source: 'draft_linkedin', target: 'img_gen' },
            { id: 'e7', source: 'img_gen', target: 'approval' }
        ]
    };

    await prisma.template.deleteMany({}); // Clear existing templates

    await prisma.template.create({
        data: {
            name: 'GenAI - Intelligent Customer Support',
            description: 'Automated support agent that routes complex queries to human staff and answers simple ones using KB.',
            category: 'Support',
            definition: JSON.stringify(supportTemplate)
        }
    });

    await prisma.template.create({
        data: {
            name: 'GenAI - Daily Market Intelligence',
            description: 'Scrapes news from multiple sources, summarizes using AI, and sends a digest email.',
            category: 'Marketing',
            definition: JSON.stringify(newsTemplate)
        }
    });

    await prisma.template.create({
        data: {
            name: 'GenAI - Lead Enrichment & Scoring',
            description: 'Enriches new leads via Clearbit, scores them with AI, and routes high-value leads to Slack.',
            category: 'Sales',
            definition: JSON.stringify(leadTemplate)
        }
    });

    await prisma.template.create({
        data: {
            name: 'GenAI - Social Content Machine',
            description: 'Generates viral content ideas, drafts posts for Twitter/LinkedIn, and creates images.',
            category: 'Content',
            definition: JSON.stringify(socialTemplate)
        }
    });

    // Add one as a user workflow too
    await prisma.workflow.create({
        data: {
            name: 'GenAI - My Customer Bot',
            userId: user.id,
            tags: 'support,gen-ai',
            definition: JSON.stringify(supportTemplate)
        }
    });

    console.log('Templates seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
