import { WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType } from '@automation/shared';
import { db } from '../lib/db';
import axios from 'axios';

type NodeExecutionResult = Record<string, any>;

export class WorkflowEngine {

    async runURI(definition: WorkflowDefinition, triggerData: any, executionId: string): Promise<any> {
        const { nodes, edges } = definition;

        const startNode = nodes.find(n => n.type.includes('trigger'));
        if (!startNode) throw new Error('No trigger node found');

        const context: Record<string, any> = { [startNode.id]: triggerData };
        await this.log(executionId, startNode.id, 'Triggered', { output: triggerData });

        const queue: { nodeId: string; inputData: any }[] = [{ nodeId: startNode.id, inputData: triggerData }];

        // In a looping engine, we can't just use a global visited set for the whole run
        // but we need to prevent infinite cycles. For now, simple limit.
        let executionCount = 0;
        const MAX_STEPS = 500;

        while (queue.length > 0 && executionCount < MAX_STEPS) {
            const { nodeId, inputData } = queue.shift()!;
            executionCount++;

            const node = nodes.find(n => n.id === nodeId);
            if (!node) continue;

            if (node.data.enabled === false) {
                await this.log(executionId, nodeId, 'Skipped', { message: 'Node is disabled' });
                continue;
            }

            // EXECUTE
            let output: any = {};
            let hasError = false;
            if (nodeId !== startNode.id) {
                try {
                    output = await this.executeNode(node, inputData, { executionId, nodeId, allResults: context });
                    await this.log(executionId, nodeId, 'Executed', { input: inputData, output });
                } catch (err: any) {
                    await this.log(executionId, nodeId, 'Error', { input: inputData, error: err.message }, 'error');

                    // Check for Error Handle
                    const errorEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === 'error');
                    if (errorEdges.length > 0) {
                        hasError = true;
                        output = { error: err.message };
                    } else {
                        throw err;
                    }
                }
            } else {
                output = triggerData;
            }

            context[nodeId] = output; // Overwrites for now, but in logs they are separate

            // NEXT STEPS
            const outgoingEdges = edges.filter(e => e.source === nodeId);

            if (hasError) {
                outgoingEdges.filter(e => e.sourceHandle === 'error').forEach(e => {
                    queue.push({ nodeId: e.target, inputData: output });
                });
                continue;
            }

            if (node.type === NodeType.IF) {
                const isTrue = output === true || (output && (output as any).result === true);
                const targetHandle = isTrue ? 'true' : 'false';
                outgoingEdges.filter(e => e.sourceHandle === targetHandle).forEach(e => {
                    queue.push({ nodeId: e.target, inputData: output });
                });
            } else if (node.type === NodeType.SWITCH) {
                const config = node.data.config as any;
                const val = output ? output[config.field] : undefined;
                const matchedCase = config.cases?.find((c: any) => c.value == val);
                const targetHandle = matchedCase ? matchedCase.handle : 'default';
                outgoingEdges.filter(e => e.sourceHandle === targetHandle).forEach(e => {
                    queue.push({ nodeId: e.target, inputData: output });
                });
            } else if (node.type === NodeType.LOOP) {
                // If the node is a LOOP type, it triggers multiple parallel/serial runs for its children
                if (Array.isArray(output)) {
                    output.forEach(item => {
                        outgoingEdges.forEach(e => queue.push({ nodeId: e.target, inputData: item }));
                    });
                } else {
                    outgoingEdges.forEach(e => queue.push({ nodeId: e.target, inputData: output }));
                }
            } else {
                outgoingEdges.forEach(e => queue.push({ nodeId: e.target, inputData: output }));
            }
        }

        return context;
    }

    private async executeNode(node: WorkflowNode, input: any, context: { executionId: string, nodeId: string, allResults: NodeExecutionResult }): Promise<any> {
        const config = this.resolveExpressions(node.data.config || {}, context.allResults);

        switch (node.type) {
            case NodeType.HTTP_REQUEST:
                const { url, method, headers, body, auth } = config;
                const requestHeaders: any = {};
                if (headers) {
                    headers.forEach((h: any) => { requestHeaders[h.key] = h.value; });
                }

                if (auth) {
                    if (auth.type === 'bearer' && auth.token) {
                        requestHeaders['Authorization'] = `Bearer ${auth.token}`;
                    } else if (auth.type === 'basic' && auth.username && auth.password) {
                        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                        requestHeaders['Authorization'] = `Basic ${credentials}`;
                    }
                }

                const response = await axios({
                    url,
                    method,
                    headers: requestHeaders,
                    data: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined
                });
                return response.data;

            case NodeType.SET:
                const result: any = { ...input };
                if (config.fields) {
                    config.fields.forEach((f: any) => {
                        result[f.key] = f.value;
                    });
                }
                return result;

            case NodeType.IF:
                const item = Array.isArray(input) ? input[0] : input;
                let match = true;
                if (config.conditions) {
                    for (const cond of config.conditions) {
                        const val = item ? item[cond.field] : undefined;
                        const target = cond.value;
                        if (cond.operator === 'equals' && val != target) match = false;
                        if (cond.operator === 'contains' && !String(val).includes(target)) match = false;
                        if (cond.operator === 'greaterThan' && !(val > target)) match = false;
                    }
                }
                return { result: match };

            case NodeType.CODE:
                try {
                    const script = config.code || 'return input;';
                    const fn = new Function('input', 'context', script);
                    return fn(input, context.allResults) || {};
                } catch (err: any) {
                    throw new Error(`Code execution failed: ${err.message}`);
                }

            case NodeType.DELAY:
                await new Promise(resolve => setTimeout(resolve, config.duration || 1000));
                return input;

            case NodeType.SEND_EMAIL:
                // Resolved expressions will already be in config.to, config.subject, config.body
                console.log(`[Email Service] To: ${config.to} | Subject: ${config.subject}`);
                console.log(`[Email Service] Body: ${config.body}`);
                return {
                    sent: true,
                    recipient: config.to,
                    messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: new Date().toISOString()
                };

            case NodeType.SLACK_MESSAGE:
                if (!config.webhookUrl) {
                    throw new Error("Slack Webhook URL is missing");
                }
                await axios.post(config.webhookUrl, {
                    text: config.text,
                    channel: config.channel
                });
                return { posted: true, timestamp: new Date().toISOString() };

            case NodeType.LOOP:
                // Basic implementation: find array and pass it to next node
                // (True iteration requires execution engine changes)
                const arr = config.field ? input[config.field] : input;
                return Array.isArray(arr) ? arr : [arr];

            case NodeType.MERGE:
                return input;

            case NodeType.AI_AGENT:
                // Resolved expressions will already be in config.prompt/systemPrompt
                console.log(`[AI Agent] Model: ${config.model} | Prompt: ${config.prompt.slice(0, 50)}...`);
                // Note: In production, call OpenAI/Anthropic/Gemini API here
                // We'll simulate a slightly longer delay and a generated response
                await new Promise(resolve => setTimeout(resolve, 2000));

                return {
                    response: `This is a simulated AI response for: "${config.prompt.slice(0, 20)}..."`,
                    model: config.model,
                    usage: { prompt_tokens: 120, completion_tokens: 45, total_tokens: 165 },
                    timestamp: new Date().toISOString()
                };

            default:
                return input;
        }
    }

    private resolveExpressions(config: any, results: NodeExecutionResult): any {
        if (typeof config === 'string') {
            return this.resolveValue(config, results);
        }
        if (Array.isArray(config)) {
            return config.map(item => this.resolveExpressions(item, results));
        }
        if (typeof config === 'object' && config !== null) {
            const resolved: any = {};
            for (const key in config) {
                resolved[key] = this.resolveExpressions(config[key], results);
            }
            return resolved;
        }
        return config;
    }

    private resolveValue(val: string, results: NodeExecutionResult): any {
        // Regex to find {{node_id.path}}
        // If the entire string is an expression, return the resolved value directly (not as a string)
        const fullMatch = val.match(/^\{\{(.+?)\}\}$/);
        if (fullMatch) {
            const path = fullMatch[1];
            const [nodeId, ...parts] = path.split('.');
            let data = results[nodeId];
            if (data === undefined) return val; // Keep original if node result not found

            for (const part of parts) {
                if (data && typeof data === 'object' && part in data) {
                    data = data[part];
                } else {
                    data = undefined;
                    break;
                }
            }
            return data !== undefined ? data : val;
        }

        // If it's a mixed string, replace parts
        return val.replace(/\{\{(.+?)\}\}/g, (match, path) => {
            const [nodeId, ...parts] = path.split('.');
            let data = results[nodeId];
            if (data === undefined) return match; // Keep as is if node result not found

            for (const part of parts) {
                if (data && typeof data === 'object' && part in data) {
                    data = data[part];
                } else {
                    data = undefined;
                    break;
                }
            }
            // For mixed strings, always return string representation
            return data !== undefined ? String(data) : match;
        });
    }

    private async log(executionId: string, nodeId: string, msg: string, data: any, level = 'info') {
        await db.executionLog.create({
            data: {
                executionId,
                nodeId,
                message: msg,
                data: data ? JSON.stringify(data) : undefined,
                level
            }
        });
    }
}

export const workflowEngine = new WorkflowEngine();
