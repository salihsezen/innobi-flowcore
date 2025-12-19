import { z } from "zod";

// --- Enums ---

export enum NodeType {
    MANUAL_TRIGGER = "manual-trigger",
    WEBHOOK_TRIGGER = "webhook-trigger",
    SCHEDULE_TRIGGER = "schedule-trigger",
    HTTP_REQUEST = "http-request",
    SEND_EMAIL = "send-email", // mock
    SLACK_MESSAGE = "slack-message", // mock
    SET = "set",
    IF = "if",
    SWITCH = "switch",
    MERGE = "merge",
    CODE = "code",
    LOOP = "loop",
    DELAY = "delay",
    ERROR_BOUNDARY = "error-boundary",
    AI_AGENT = "ai-agent",
}

export enum ExecutionStatus {
    PENDING = "PENDING",
    RUNNING = "RUNNING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}

export enum WorkflowStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED",
}

export enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER",
}

// --- Node Configuration Schemas ---

export const HttpRequestConfigSchema = z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
    headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    body: z.string().optional(), // JSON string
    auth: z.object({
        type: z.enum(["none", "bearer", "basic"]),
        token: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
    }).optional(),
});

export const IfConfigSchema = z.object({
    conditions: z.array(
        z.object({
            field: z.string(),
            operator: z.enum(["equals", "contains", "greaterThan", "lessThan"]),
            value: z.string(),
        })
    ),
    logic: z.enum(["AND", "OR"]).default("AND"),
});

export const SetConfigSchema = z.object({
    fields: z.array(
        z.object({
            key: z.string(),
            value: z.string(), // can be expression
        })
    ),
});

export const WebhookConfigSchema = z.object({
    path: z.string().min(1),
    method: z.enum(["GET", "POST"]).default("POST"),
});

export const LoopConfigSchema = z.object({
    field: z.string().optional(),
});

export const DelayConfigSchema = z.object({
    duration: z.number().min(0).default(1000),
});

export const SwitchConfigSchema = z.object({
    field: z.string(),
    cases: z.array(z.object({
        value: z.string(),
        handle: z.string(),
    })),
});

export const EmailConfigSchema = z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
});

export const SlackConfigSchema = z.object({
    webhookUrl: z.string().url(),
    channel: z.string().optional(),
    text: z.string(),
});

export const AiAgentConfigSchema = z.object({
    prompt: z.string(),
    systemPrompt: z.string().optional(),
    model: z.string().default("gpt-4o"),
    temperature: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().optional(),
});

// Union of all configs (simplified for MVP)
export const NodeConfigSchema = z.union([
    HttpRequestConfigSchema,
    IfConfigSchema,
    SwitchConfigSchema,
    SetConfigSchema,
    WebhookConfigSchema,
    LoopConfigSchema,
    DelayConfigSchema,
    EmailConfigSchema,
    SlackConfigSchema,
    AiAgentConfigSchema,
    z.record(z.any()), // Fallback for others
]);

// --- Core Entities ---

export const WorkflowNodeSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(NodeType),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({
        label: z.string().optional(),
        description: z.string().optional(),
        enabled: z.boolean().default(true).optional(),
        config: NodeConfigSchema.optional(),
    }),
});

export const WorkflowEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
});

export const WorkflowDefinitionSchema = z.object({
    nodes: z.array(WorkflowNodeSchema),
    edges: z.array(WorkflowEdgeSchema),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

// --- API DTOs ---

export const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
});

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const CreateWorkflowSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
});

export const UpdateWorkflowSchema = z.object({
    name: z.string().optional(),
    definition: WorkflowDefinitionSchema.optional(),
    status: z.nativeEnum(WorkflowStatus).optional(),
    tags: z.array(z.string()).optional(),
});

export const CreateCredentialSchema = z.object({
    name: z.string(),
    type: z.string(), // e.g., 'http-header-auth'
    data: z.record(z.string()), // e.g. { "Header": "Authorization", "Value": "Bearer ..." }
});
