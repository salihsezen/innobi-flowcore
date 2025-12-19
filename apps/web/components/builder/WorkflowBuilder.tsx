"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Connection,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, Play, Plus, Trash, History, LayoutDashboard, Settings, Clock, Sparkles } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import dagre from 'dagre';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Position } from 'reactflow';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 80;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

const nodeTypes = {
    custom: CustomNode,
};

const NODE_TYPES_LIST = [
    { type: 'manual-trigger', label: 'Manual Trigger', category: 'Trigger' },
    { type: 'webhook-trigger', label: 'Webhook', category: 'Trigger' },
    { type: 'schedule-trigger', label: 'Schedule Trigger', category: 'Trigger' },
    { type: 'http-request', label: 'HTTP Request', category: 'Action' },
    { type: 'send-email', label: 'Send Email', category: 'Action' },
    { type: 'slack-message', label: 'Slack Message', category: 'Action' },
    { type: 'ai-agent', label: 'AI Agent (LLM)', category: 'Action' },
    { type: 'if', label: 'IF Condition', category: 'Logic' },
    { type: 'switch', label: 'Switch', category: 'Logic' },
    { type: 'set', label: 'Set Variables', category: 'Logic' },
    { type: 'code', label: 'Code', category: 'Logic' },
    { type: 'delay', label: 'Delay', category: 'Logic' },
    { type: 'loop', label: 'Loop (For Each)', category: 'Logic' },
    { type: 'merge', label: 'Merge', category: 'Logic' },
];

import { useRouter } from 'next/navigation';

export function WorkflowBuilder({ id }: { id: string }) {
    const router = useRouter();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [workflowName, setWorkflowName] = useState('');
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [executions, setExecutions] = useState<any[]>([]);

    const fetchVersions = async () => {
        const res = await api.get(`/workflows/${id}/versions`);
        setVersions(res.data);
    };

    const fetchExecutions = async () => {
        const res = await api.get(`/workflows/${id}/executions`);
        setExecutions(res.data);
    };

    const createVersion = async () => {
        try {
            await saveWorkflow(); // Save current first
            await api.post(`/workflows/${id}/versions`);
            toast.success("Version snapshot saved");
            fetchVersions();
        } catch {
            toast.error("Failed to save version");
        }
    };

    const restoreVersion = (v: any) => {
        try {
            const def = JSON.parse(v.definition);
            const mappedNodes = (def.nodes || []).map((n: any) => ({
                ...n,
                type: 'custom',
                data: { ...n.data, type: n.type || n.data.type }
            }));
            setNodes(mappedNodes);
            setEdges(def.edges || []);
            toast.success(`Restored to Version ${v.versionNumber}`);
        } catch {
            toast.error("Failed to restore version");
        }
    };

    // Load Workflow
    useEffect(() => {
        api.get(`/workflows/${id}`).then(res => {
            const wf = res.data;
            setWorkflowName(wf.name);
            if (wf.definition) {
                // Map nodes to have 'type: custom' for rendering but keep original type in data
                const mappedNodes = (wf.definition.nodes || []).map((n: any) => ({
                    ...n,
                    type: 'custom',
                    data: { ...n.data, type: n.type } // Store real type in data
                }));
                setNodes(mappedNodes);
                setEdges(wf.definition.edges || []);
            }
        });
        fetchVersions();
        fetchExecutions();
    }, [id, setNodes, setEdges]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: any) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            const newNode = {
                id: `node_${Date.now()}`,
                type: 'custom',
                position,
                data: { label: NODE_TYPES_LIST.find(t => t.type === type)?.label, type: type, config: {} },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeClick = (_: any, node: any) => {
        setSelectedNode(node);
        setIsConfigOpen(true);
    };

    const updateNodeData = (key: string, value: any) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    const newData = { ...node.data, [key]: value };
                    // Also update selected node locally to reflect changes in valid input
                    setSelectedNode({ ...node, data: newData });
                    return { ...node, data: newData };
                }
                return node;
            })
        );
    };

    const updateConfig = (key: string, value: any) => {
        if (!selectedNode) return;
        const newConfig = { ...selectedNode.data.config, [key]: value };
        updateNodeData('config', newConfig);
    };

    const saveWorkflow = async () => {
        // Restore original types from data.type
        const savedNodes = nodes.map(n => ({
            ...n,
            type: n.data.type // Use the real type
        }));

        try {
            await api.put(`/workflows/${id}`, {
                name: workflowName,
                definition: { nodes: savedNodes, edges }
            });
            toast.success("Workflow saved");
        } catch {
            toast.error("Failed to save");
        }
    };

    const runWorkflow = async () => {
        try {
            await saveWorkflow(); // Save first
            const res = await api.post(`/workflows/${id}/run`);
            const execId = res.data.executionId;
            toast.info("Execution started...");

            // Poll for result
            const interval = setInterval(async () => {
                const execRes = await api.get(`/executions/${execId}`);
                const status = execRes.data.status;

                // Update nodes in real-time based on logs
                setNodes(nds => nds.map(node => {
                    const logs = execRes.data.logs.filter((l: any) => l.nodeId === node.id);
                    if (logs.length > 0) {
                        const hasError = logs.some((l: any) => l.level === 'error');
                        const isExecuted = logs.some((l: any) => l.message === 'Executed');
                        const isTriggered = logs.some((l: any) => l.message === 'Triggered');

                        let currentStatus = 'RUNNING';
                        if (hasError) currentStatus = 'FAILED';
                        else if (isExecuted || isTriggered) currentStatus = 'SUCCESS';

                        return {
                            ...node,
                            data: {
                                ...node.data,
                                lastRunStatus: currentStatus
                            }
                        };
                    }
                    return node;
                }));

                if (status === 'SUCCESS' || status === 'FAILED') {
                    clearInterval(interval);
                    setExecutionResult(execRes.data);
                    toast(status === 'SUCCESS' ? "Execution Success" : "Execution Failed");
                }
            }, 1000);
        } catch {
            toast.error("Failed to run");
        }
    };

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const deleteWorkflow = async () => {
        try {
            await api.delete(`/workflows/${id}`);
            toast.success("Workflow deleted successfully");
            router.push('/app/workflows');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to delete workflow");
        }
    };

    return (
        <div className="flex h-screen flex-col">
            <div className="h-14 border-b bg-background flex items-center px-4 justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/app/workflows')}>← Back</Button>
                    <Input className="w-64" value={workflowName} onChange={e => setWorkflowName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><History size={16} className="mr-2" /> Versions</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Workflow Versions</DialogTitle>
                                <DialogDescription>
                                    Snapshots of your workflow. Restoring will overwrite the current canvas.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Button className="w-full" size="sm" onClick={createVersion}>Save Current as New Version</Button>
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {versions.map(v => (
                                        <div key={v.id} className="flex justify-between items-center p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <div>
                                                <div className="font-bold text-sm">Version {v.versionNumber}</div>
                                                <div className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => restoreVersion(v)}>Restore</Button>
                                        </div>
                                    ))}
                                    {versions.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No snapshots saved yet.</p>}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" size="sm" onClick={() => {
                        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                            nodes,
                            edges
                        );
                        setNodes([...layoutedNodes]);
                        setEdges([...layoutedEdges]);
                    }}>
                        <LayoutDashboard size={16} className="mr-2" /> Layout
                    </Button>

                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDeleteOpen(true)}>
                        <Trash size={16} className="mr-2" /> Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={saveWorkflow}><Save size={16} className="mr-2" /> Save</Button>
                    <Button size="sm" onClick={runWorkflow}><Play size={16} className="mr-2" /> Run</Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Library */}
                <div className="w-56 border-r bg-slate-50 p-4 overflow-y-auto">
                    <div className="font-semibold mb-3 text-xs text-slate-500 uppercase tracking-wider">Node Library</div>
                    <Input
                        placeholder="Search nodes..."
                        className="mb-4 h-8 text-xs"
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="space-y-4">
                        {['Trigger', 'Action', 'Logic'].map(category => (
                            <div key={category}>
                                <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">{category}s</div>
                                {NODE_TYPES_LIST.filter(n => n.category === category && n.label.toLowerCase().includes(searchQuery.toLowerCase())).map(node => (
                                    <div
                                        key={node.type}
                                        className="bg-card p-2.5 mb-2 border rounded-md shadow-sm cursor-move text-sm hover:border-primary hover:shadow-md transition-all flex items-center gap-2 group"
                                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', node.type)}
                                        draggable
                                    >
                                        <Plus size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
                                        {node.label}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative bg-background" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        onPaneClick={() => {
                            setSelectedNode(null);
                            setIsConfigOpen(false);
                        }}
                        nodeTypes={nodeTypes}
                        snapToGrid={true}
                        snapGrid={[15, 15]}
                        fitView
                    >
                        <Background color="#94a3b8" variant={BackgroundVariant.Dots} gap={20} size={1} />
                        <Controls className="bg-card border-none shadow-xl" />
                        <MiniMap
                            className="bg-card border-none shadow-xl rounded-xl overflow-hidden"
                            maskColor="rgba(0,0,0,0.1)"
                        />
                    </ReactFlow>
                </div>

                {/* Right Panel */}
                {isConfigOpen && (
                    <div className="w-80 border-l bg-background/60 backdrop-blur-xl flex flex-col premium-shadow z-10 overflow-hidden">
                        <Tabs defaultValue="config" className="flex flex-col h-full">
                            <div className="p-4 border-b bg-background/20">
                                <TabsList className="w-full bg-accent/50 p-1 rounded-xl">
                                    <TabsTrigger value="config" className="flex-1 flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Settings size={14} /> Config
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="flex-1 flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm" onClick={fetchExecutions}>
                                        <History size={14} /> History
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="config" className="flex-1 overflow-y-auto p-4 m-0">
                                {selectedNode ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-lg">{selectedNode.data.label}</h3>
                                            <Button variant="ghost" size="icon" onClick={() => setNodes(nodes.filter(n => n.id !== selectedNode.id))}>
                                                <Trash size={16} className="text-red-500" />
                                            </Button>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="border-b pb-6 space-y-4">
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">General</h4>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Node Label</Label>
                                                    <Input value={selectedNode.data.label} onChange={e => updateNodeData('label', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Description</Label>
                                                    <Input
                                                        value={selectedNode.data.description || ''}
                                                        onChange={e => updateNodeData('description', e.target.value)}
                                                        placeholder="Add a note..."
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="node-enabled"
                                                        checked={selectedNode.data.enabled !== false}
                                                        onChange={e => updateNodeData('enabled', e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <Label htmlFor="node-enabled" className="cursor-pointer text-xs">Enabled</Label>
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 border border-blue-100 flex gap-2">
                                                <div className="font-bold">TIP:</div>
                                                <div>Use <code className="bg-blue-100 px-1 rounded">{"{{node_id.key}}"}</code> to reference previous outputs.</div>
                                            </div>

                                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Configuration</h4>
                                            <div className="space-y-4">
                                                {selectedNode.data.type === 'code' && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">JavaScript Code</Label>
                                                            <Textarea
                                                                value={selectedNode.data.config.code || 'return input;'}
                                                                onChange={e => updateConfig('code', e.target.value)}
                                                                placeholder="return { key: 'value' };"
                                                                className="font-mono text-[10px] min-h-[200px] bg-slate-900 text-slate-100"
                                                            />
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground space-y-1 bg-slate-50 p-2 rounded border">
                                                            <p className="font-bold">Available Variables:</p>
                                                            <ul className="list-disc pl-4 space-y-0.5">
                                                                <li><code className="bg-slate-200 px-1 rounded">input</code>: Data from previous node.</li>
                                                                <li><code className="bg-slate-200 px-1 rounded">context</code>: Map of all node results.</li>
                                                            </ul>
                                                            <p className="italic mt-1">Note: Code must return an object.</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'http-request' && (
                                                    <>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">URL</Label>
                                                            <Input value={selectedNode.data.config.url || ''} onChange={e => updateConfig('url', e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Method</Label>
                                                            <select
                                                                className="w-full text-xs h-8 border rounded px-1"
                                                                value={selectedNode.data.config.method || 'GET'}
                                                                onChange={e => updateConfig('method', e.target.value)}
                                                            >
                                                                <option value="GET">GET</option>
                                                                <option value="POST">POST</option>
                                                                <option value="PUT">PUT</option>
                                                                <option value="DELETE">DELETE</option>
                                                                <option value="PATCH">PATCH</option>
                                                            </select>
                                                        </div>
                                                        <div className="pt-2 border-t mt-2">
                                                            <Label className="text-[10px] text-muted-foreground">Authentication</Label>
                                                            <select
                                                                className="w-full text-xs h-8 border rounded px-1 mb-2"
                                                                value={selectedNode.data.config.auth?.type || 'none'}
                                                                onChange={e => updateConfig('auth', { ...selectedNode.data.config.auth, type: e.target.value })}
                                                            >
                                                                <option value="none">None</option>
                                                                <option value="bearer">Bearer Token</option>
                                                                <option value="basic">Basic Auth</option>
                                                            </select>

                                                            {selectedNode.data.config.auth?.type === 'bearer' && (
                                                                <Input
                                                                    className="h-8 text-xs"
                                                                    placeholder="Token"
                                                                    value={selectedNode.data.config.auth.token || ''}
                                                                    onChange={e => updateConfig('auth', { ...selectedNode.data.config.auth, token: e.target.value })}
                                                                />
                                                            )}

                                                            {selectedNode.data.config.auth?.type === 'basic' && (
                                                                <div className="space-y-1">
                                                                    <Input
                                                                        className="h-8 text-xs"
                                                                        placeholder="Username"
                                                                        value={selectedNode.data.config.auth.username || ''}
                                                                        onChange={e => updateConfig('auth', { ...selectedNode.data.config.auth, username: e.target.value })}
                                                                    />
                                                                    <Input
                                                                        className="h-8 text-xs"
                                                                        type="password"
                                                                        placeholder="Password"
                                                                        value={selectedNode.data.config.auth.password || ''}
                                                                        onChange={e => updateConfig('auth', { ...selectedNode.data.config.auth, password: e.target.value })}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}

                                                {selectedNode.data.type === 'schedule-trigger' && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Cron Expression</Label>
                                                        <Input
                                                            value={selectedNode.data.config.cron || '*/5 * * * *'}
                                                            onChange={e => updateConfig('cron', e.target.value)}
                                                            placeholder="*/5 * * * *"
                                                        />
                                                        <p className="text-[10px] text-muted-foreground">Standard Cron syntax.</p>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'send-email' && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">To</Label>
                                                            <Input value={selectedNode.data.config.to || ''} onChange={e => updateConfig('to', e.target.value)} placeholder="email@example.com" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Subject</Label>
                                                            <Input value={selectedNode.data.config.subject || ''} onChange={e => updateConfig('subject', e.target.value)} placeholder="Hello!" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Body</Label>
                                                            <Textarea
                                                                value={selectedNode.data.config.body || ''}
                                                                onChange={e => updateConfig('body', e.target.value)}
                                                                placeholder="Email content..."
                                                                className="text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'slack-message' && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Webhook URL</Label>
                                                            <Input value={selectedNode.data.config.webhookUrl || ''} onChange={e => updateConfig('webhookUrl', e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Channel (optional)</Label>
                                                            <Input value={selectedNode.data.config.channel || ''} onChange={e => updateConfig('channel', e.target.value)} placeholder="#general" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Message</Label>
                                                            <Textarea
                                                                value={selectedNode.data.config.text || ''}
                                                                onChange={e => updateConfig('text', e.target.value)}
                                                                placeholder="Your message here..."
                                                                className="text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'delay' && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Duration (ms)</Label>
                                                        <Input
                                                            type="number"
                                                            value={selectedNode.data.config.duration || 1000}
                                                            onChange={e => updateConfig('duration', parseInt(e.target.value))}
                                                        />
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'loop' && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Field to iterate (optional)</Label>
                                                        <Input
                                                            value={selectedNode.data.config.field || ''}
                                                            onChange={e => updateConfig('field', e.target.value)}
                                                            placeholder="e.g. results"
                                                        />
                                                        <p className="text-[10px] text-muted-foreground italic">
                                                            If empty, it tries to iterate over the entire input data.
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'switch' && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Field to Match</Label>
                                                            <Input
                                                                value={selectedNode.data.config.field || ''}
                                                                onChange={e => updateConfig('field', e.target.value)}
                                                                placeholder="e.g. status"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <Label className="text-xs font-bold">Cases</Label>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-[10px]"
                                                                    onClick={() => {
                                                                        const newCases = [...(selectedNode.data.config.cases || [])];
                                                                        newCases.push({ value: '', handle: `case_${Date.now()}` });
                                                                        updateConfig('cases', newCases);
                                                                    }}
                                                                >
                                                                    <Plus size={10} className="mr-1" /> Add
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(selectedNode.data.config.cases || []).map((c: any, i: number) => (
                                                                    <div key={i} className="flex gap-1 items-center">
                                                                        <Input
                                                                            className="h-8 text-xs flex-1"
                                                                            value={c.value}
                                                                            onChange={e => {
                                                                                const newCases = [...selectedNode.data.config.cases];
                                                                                newCases[i].value = e.target.value;
                                                                                updateConfig('cases', newCases);
                                                                            }}
                                                                            placeholder="Value"
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-red-400"
                                                                            onClick={() => {
                                                                                const newCases = selectedNode.data.config.cases.filter((_: any, idx: number) => idx !== i);
                                                                                updateConfig('cases', newCases);
                                                                            }}
                                                                        >
                                                                            <Trash size={12} />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'ai-agent' && (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">System Instructions (Optional)</Label>
                                                            <Textarea
                                                                value={selectedNode.data.config.systemPrompt || ''}
                                                                onChange={e => updateConfig('systemPrompt', e.target.value)}
                                                                placeholder="You are a helpful assistant..."
                                                                className="text-xs h-20"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">User Prompt</Label>
                                                            <Textarea
                                                                value={selectedNode.data.config.prompt || ''}
                                                                onChange={e => updateConfig('prompt', e.target.value)}
                                                                placeholder="Summarize this: {{prev_node.data}}"
                                                                className="text-xs h-32"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px]">Model</Label>
                                                                <select
                                                                    className="w-full text-[10px] h-7 border rounded"
                                                                    value={selectedNode.data.config.model || 'gpt-4o'}
                                                                    onChange={e => updateConfig('model', e.target.value)}
                                                                >
                                                                    <option value="gpt-4o">GPT-4o</option>
                                                                    <option value="gpt-3.5-turbo">GPT-3.5</option>
                                                                    <option value="claude-3-sonnet">Claude 3</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px]">Temperature</Label>
                                                                <Input
                                                                    type="number"
                                                                    step="0.1"
                                                                    className="h-7 text-[10px]"
                                                                    value={selectedNode.data.config.temperature || 0.7}
                                                                    onChange={e => updateConfig('temperature', parseFloat(e.target.value))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'if' && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Logic</Label>
                                                            <select
                                                                className="w-full text-xs h-8 border rounded px-1"
                                                                value={selectedNode.data.config.logic || 'AND'}
                                                                onChange={e => updateConfig('logic', e.target.value)}
                                                            >
                                                                <option value="AND">AND (All must match)</option>
                                                                <option value="OR">OR (Any must match)</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <Label className="text-xs font-bold">Conditions</Label>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-[10px]"
                                                                    onClick={() => {
                                                                        const newConds = [...(selectedNode.data.config.conditions || [])];
                                                                        newConds.push({ field: '', operator: 'equals', value: '' });
                                                                        updateConfig('conditions', newConds);
                                                                    }}
                                                                >
                                                                    <Plus size={10} className="mr-1" /> Add
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(selectedNode.data.config.conditions || []).map((c: any, i: number) => (
                                                                    <div key={i} className="flex gap-1 items-center border p-2 rounded relative group bg-slate-50/50">
                                                                        <div className="grid grid-cols-1 gap-1 flex-1">
                                                                            <Input
                                                                                className="h-7 text-[10px]"
                                                                                placeholder="Field (e.g. status)"
                                                                                value={c.field}
                                                                                onChange={e => {
                                                                                    const newConds = [...selectedNode.data.config.conditions];
                                                                                    newConds[i].field = e.target.value;
                                                                                    updateConfig('conditions', newConds);
                                                                                }}
                                                                            />
                                                                            <select
                                                                                className="h-7 text-[10px] border rounded"
                                                                                value={c.operator}
                                                                                onChange={e => {
                                                                                    const newConds = [...selectedNode.data.config.conditions];
                                                                                    newConds[i].operator = e.target.value;
                                                                                    updateConfig('conditions', newConds);
                                                                                }}
                                                                            >
                                                                                <option value="equals">Equals</option>
                                                                                <option value="contains">Contains</option>
                                                                                <option value="greaterThan">Greater Than</option>
                                                                                <option value="lessThan">Less Than</option>
                                                                            </select>
                                                                            <Input
                                                                                className="h-7 text-[10px]"
                                                                                placeholder="Value"
                                                                                value={c.value}
                                                                                onChange={e => {
                                                                                    const newConds = [...selectedNode.data.config.conditions];
                                                                                    newConds[i].value = e.target.value;
                                                                                    updateConfig('conditions', newConds);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            onClick={() => {
                                                                                const newConds = selectedNode.data.config.conditions.filter((_: any, idx: number) => idx !== i);
                                                                                updateConfig('conditions', newConds);
                                                                            }}
                                                                        >
                                                                            <Trash size={10} />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedNode.data.type === 'set' && (
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <Label className="text-xs font-bold">Variables to Set</Label>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2 text-[10px]"
                                                                onClick={() => {
                                                                    const newFields = [...(selectedNode.data.config.fields || [])];
                                                                    newFields.push({ key: '', value: '' });
                                                                    updateConfig('fields', newFields);
                                                                }}
                                                            >
                                                                <Plus size={10} className="mr-1" /> Add
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(selectedNode.data.config.fields || []).map((f: any, i: number) => (
                                                                <div key={i} className="flex gap-1 items-start group">
                                                                    <div className="grid grid-cols-2 gap-1 flex-1">
                                                                        <Input
                                                                            className="h-8 text-xs font-mono"
                                                                            placeholder="Key"
                                                                            value={f.key}
                                                                            onChange={e => {
                                                                                const newFields = [...selectedNode.data.config.fields];
                                                                                newFields[i].key = e.target.value;
                                                                                updateConfig('fields', newFields);
                                                                            }}
                                                                        />
                                                                        <Input
                                                                            className="h-8 text-xs"
                                                                            placeholder="Value"
                                                                            value={f.value}
                                                                            onChange={e => {
                                                                                const newFields = [...selectedNode.data.config.fields];
                                                                                newFields[i].value = e.target.value;
                                                                                updateConfig('fields', newFields);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => {
                                                                            const newFields = selectedNode.data.config.fields.filter((_: any, idx: number) => idx !== i);
                                                                            updateConfig('fields', newFields);
                                                                        }}
                                                                    >
                                                                        <Trash size={12} />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Variables Helper */}
                                                <div className="mt-8 border-t pt-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Available Variables</h4>
                                                        <div className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">Click to copy</div>
                                                    </div>
                                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                        {nodes.filter(n => n.id !== selectedNode.id).map(node => (
                                                            <div
                                                                key={node.id}
                                                                className="flex items-center justify-between p-2 rounded border bg-slate-50 hover:bg-slate-100 cursor-pointer group transition-colors"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`{{${node.id}}}`);
                                                                    toast.success('Copied variable tag!');
                                                                }}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-bold text-slate-700">{node.data.label || node.type}</span>
                                                                    <span className="text-[9px] text-muted-foreground font-mono">ID: {node.id}</span>
                                                                </div>
                                                                <div className="text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {"{{"}{node.id}{"}}"}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {nodes.length <= 1 && (
                                                            <div className="text-center py-4 text-[10px] text-muted-foreground italic">
                                                                Add more nodes to see variables.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {executionResult && executionResult.output && executionResult.output[selectedNode.id] && (
                                                    <div className="mt-8 border-t pt-4">
                                                        <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">Last Output</h4>
                                                        <pre className="bg-slate-50 p-2 rounded border text-[10px] overflow-auto max-h-40 font-mono">
                                                            {JSON.stringify(executionResult.output[selectedNode.id], null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
                                            <Settings size={24} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">Select a node to configure its properties</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="history" className="flex-1 overflow-y-auto p-4 m-0">
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest mb-4">Recent Executions</h4>
                                    <div className="space-y-2">
                                        {executions.map(ex => (
                                            <div
                                                key={ex.id}
                                                className="p-3 border rounded-lg hover:border-primary cursor-pointer transition-all bg-card shadow-sm"
                                                onClick={() => router.push(`/app/executions/${ex.id}`)}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ex.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                                        ex.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {ex.status}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">#{ex.id.slice(0, 6)}</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Clock size={10} /> {new Date(ex.startedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                        {executions.length === 0 && (
                                            <div className="text-center py-10 opacity-50">
                                                <p className="text-xs">No execution history found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs >
                    </div >
                )
                }
            </div >
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title="Delete Workflow"
                description="Are you sure you want to delete this workflow? This will permanently remove all nodes, edges, versions and execution history."
                onConfirm={deleteWorkflow}
            />
        </div >
    );
}
