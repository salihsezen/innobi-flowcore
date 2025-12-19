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
import { Save, Play, Plus, Trash, History, LayoutDashboard, Settings, Clock, Sparkles, ArrowLeft, X, Undo2, Redo2, Zap, Globe, ArrowRightLeft, Code, Mail, MessageSquare, Hourglass, Repeat, Database } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useFlowHistory } from '@/hooks/useFlowHistory';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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

const ICONS: Record<string, any> = {
    'manual-trigger': Play,
    'webhook-trigger': Zap,
    'schedule-trigger': Clock,
    'http-request': Globe,
    'if': ArrowRightLeft,
    'switch': ArrowRightLeft,
    'set': Settings,
    'code': Code,
    'delay': Hourglass,
    'loop': Repeat,
    'send-email': Mail,
    'slack-message': MessageSquare,
    'ai-agent': Sparkles,
    'database': Database,
    'merge': ArrowRightLeft
};

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
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // History & Undo/Redo
    const { undo, redo, takeSnapshot, canUndo, canRedo } = useFlowHistory();
    const isHistoryChange = useRef(false);

    // Debounced snapshot saving
    useEffect(() => {
        if (isHistoryChange.current) {
            isHistoryChange.current = false;
            return;
        }

        const timer = setTimeout(() => {
            takeSnapshot(nodes, edges);
        }, 500);

        return () => clearTimeout(timer);
    }, [nodes, edges, takeSnapshot]);

    const onUndo = useCallback(() => {
        const state = undo();
        if (state) {
            isHistoryChange.current = true;
            setNodes(state.nodes);
            setEdges(state.edges);
        }
    }, [undo, setNodes, setEdges]);

    const onRedo = useCallback(() => {
        const state = redo();
        if (state) {
            isHistoryChange.current = true;
            setNodes(state.nodes);
            setEdges(state.edges);
        }
    }, [redo, setNodes, setEdges]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    onRedo();
                } else {
                    onUndo();
                }
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 'y') {
                event.preventDefault();
                onRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onUndo, onRedo]);

    const deleteWorkflow = async () => {
        try {
            await api.delete(`/workflows/${id}`);
            toast.success("Workflow deleted");
            router.push('/app/workflows');
        } catch {
            toast.error("Failed to delete workflow");
        }
    };

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



    return (
        <div className="h-full w-full relative bg-slate-50 dark:bg-slate-950 overflow-hidden font-inter select-none">
            {/* Top Floating Header Island */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl">
                <div className="glass-card rounded-full px-2 py-2 flex items-center justify-between shadow-2xl animate-fade-in group hover:scale-[1.01] transition-transform duration-300">
                    <div className="flex items-center gap-4 pl-4">
                        <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 hover:bg-slate-200/50" onClick={() => router.push('/app/workflows')}>
                            <ArrowLeft size={16} />
                        </Button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
                        <Input
                            className="w-64 border-none shadow-none bg-transparent h-8 font-outfit font-bold text-lg focus-visible:ring-0 px-0"
                            value={workflowName}
                            onChange={e => setWorkflowName(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 pr-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-full text-xs font-medium text-muted-foreground hover:text-foreground">
                                    <History size={14} className="mr-2" /> Versions
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] glass-card border-white/20">
                                <DialogHeader>
                                    <DialogTitle>Workflow Versions</DialogTitle>
                                    <DialogDescription>Snapshot history of your workflow.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <Button className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25" size="sm" onClick={createVersion}>
                                        Save New Version
                                    </Button>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                        {versions.map(v => (
                                            <div key={v.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <div>
                                                    <div className="font-bold text-sm">Version {v.versionNumber}</div>
                                                    <div className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
                                                </div>
                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => restoreVersion(v)}>Restore</Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        onClick={onUndo}
                                        disabled={!canUndo}
                                    >
                                        <Undo2 size={14} className={!canUndo ? 'opacity-30' : ''} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        onClick={onRedo}
                                        disabled={!canRedo}
                                    >
                                        <Redo2 size={14} className={!canRedo ? 'opacity-30' : ''} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" size="icon" className="rounded-full w-9 h-9" onClick={() => {
                                        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(nodes, edges);
                                        setNodes([...lNodes]);
                                        setEdges([...lEdges]);
                                    }}>
                                        <LayoutDashboard size={15} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Auto Layout</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full w-9 h-9 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setConfirmDeleteOpen(true)}
                        >
                            <Trash size={15} />
                        </Button>

                        <Button
                            variant="outline"
                            className="rounded-full border-primary/20 hover:bg-primary/5 text-primary gap-2 ml-2"
                            onClick={saveWorkflow}
                        >
                            <Save size={15} /> Save
                        </Button>

                        <Button
                            className="rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 gap-2 px-6 font-semibold"
                            onClick={runWorkflow}
                        >
                            <Play size={15} className="fill-current" /> Run
                        </Button>
                    </div>
                </div>
            </div>

            {/* Left Floating Dock - Node Library */}
            <div className="absolute left-6 top-28 bottom-6 z-40 w-16 hover:w-64 transition-all duration-300 group/dock">
                <div className="h-full glass-card rounded-2xl flex flex-col p-2 overflow-hidden shadow-2xl hover:shadow-primary/5 border-white/40 dark:border-white/5">
                    <div className="flex items-center h-10 mb-4 text-primary overflow-hidden">
                        <div className="w-12 flex items-center justify-center shrink-0">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-lg opacity-0 group-hover/dock:opacity-100 transition-opacity duration-300 whitespace-nowrap">Add Node</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-1 no-scrollbar space-y-6">
                        {['Trigger', 'Action', 'Logic'].map(category => (
                            <div key={category} className="space-y-2">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 opacity-0 group-hover/dock:opacity-100 transition-opacity duration-300">
                                    {category}
                                </div>
                                <div className="space-y-1">
                                    {NODE_TYPES_LIST.filter(n => n.category === category).map(node => {
                                        const Icon = ICONS[node.type] || Settings;
                                        return (
                                            <div
                                                key={node.type}
                                                className="p-2 rounded-xl cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors flex items-center gap-3 group/item relative"
                                                onDragStart={(event) => event.dataTransfer.setData('application/reactflow', node.type)}
                                                draggable
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800 text-slate-500 group-hover/item:text-primary transition-colors">
                                                    <Icon size={16} />
                                                </div>
                                                <span className="text-sm font-medium opacity-0 group-hover/dock:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                                    {node.label}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Canvas */}
            <div className="absolute inset-0 z-0 bg-slate-50/50 dark:bg-slate-950" ref={reactFlowWrapper}>
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
                    deleteKeyCode={['Backspace', 'Delete']}
                    // snapToGrid={true}
                    // snapGrid={[20, 20]} // Disable rigid grid for more 'organic' feel or keep it subtle
                    fitView
                    className="touch-none"
                    minZoom={0.5}
                    maxZoom={1.5}
                >
                    <Background color="#94a3b8" variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-[0.7] dark:opacity-[0.5]" />
                    <Controls className="!bg-white/80 dark:!bg-slate-900/80 !backdrop-blur-md !border-none !shadow-xl !rounded-xl !m-6 scale-110 !fill-primary" showInteractive={false} />
                    <MiniMap
                        style={{ position: 'absolute', bottom: 24, right: 24, margin: 0 }}
                        className="!bg-slate-50 dark:!bg-slate-900 !border !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-xl !w-48 !h-32 opacity-90 hover:opacity-100 transition-opacity z-50"
                        maskColor="rgba(0,0,0,0.05)"
                        nodeColor="#6366f1"
                        zoomable
                        pannable
                    />
                </ReactFlow>
            </div>

            {/* Right Config Panel - Floating Island */}
            <div
                className={`absolute top-28 right-6 bottom-6 w-96 transform transition-all duration-300 ease-out z-40 ${isConfigOpen ? 'translate-x-0 opacity-100' : 'translate-x-[110%] opacity-0'
                    }`}
            >
                <div className="h-full glass-card rounded-2xl flex flex-col overflow-hidden shadow-2xl border-white/40 dark:border-white/5 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl">
                    <Tabs defaultValue="config" className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex-none">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-outfit font-bold text-xl">{selectedNode ? selectedNode.data.label : 'Configuration'}</h3>
                                    <p className="text-xs text-muted-foreground">{selectedNode ? selectedNode.data.type : 'Select a node'}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full" onClick={() => setIsConfigOpen(false)}>
                                    <X size={18} />
                                </Button>
                            </div>
                            <TabsList className="w-full bg-slate-100 dark:bg-slate-950/50 p-1 rounded-xl">
                                <TabsTrigger value="config" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Settings size={14} className="mr-2" /> Settings
                                </TabsTrigger>
                                <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm" onClick={fetchExecutions}>
                                    <History size={14} className="mr-2" /> Logs
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="config" className="flex-1 overflow-y-auto p-0 m-0 custom-scrollbar">
                            {selectedNode ? (
                                <div className="p-5 space-y-6">
                                    {/* General Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">General</Label>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="node-enabled" className="text-xs cursor-pointer">Enabled</Label>
                                                <input
                                                    type="checkbox"
                                                    id="node-enabled"
                                                    checked={selectedNode.data.enabled !== false}
                                                    onChange={e => updateNodeData('enabled', e.target.checked)}
                                                    className="h-4 w-4 accent-primary rounded border-slate-300"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Node Name</Label>
                                            <Input
                                                value={selectedNode.data.label}
                                                onChange={e => updateNodeData('label', e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-950/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Description</Label>
                                            <Textarea
                                                value={selectedNode.data.description || ''}
                                                onChange={e => updateNodeData('description', e.target.value)}
                                                placeholder="What does this node do?"
                                                className="min-h-[60px] resize-none bg-slate-50 dark:bg-slate-950/50 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800" />

                                    {/* Configuration Section */}
                                    <div className="space-y-4">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configuration</Label>

                                        {selectedNode.data.type === 'http-request' && (
                                            <div className="grid grid-cols-4 gap-2">
                                                <div className="col-span-1 space-y-2">
                                                    <Label className="text-[10px]">Method</Label>
                                                    <select
                                                        className="w-full text-xs h-9 border rounded-md px-2 bg-slate-50 dark:bg-slate-950/50"
                                                        value={selectedNode.data.config.method || 'GET'}
                                                        onChange={e => updateConfig('method', e.target.value)}
                                                    >
                                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-3 space-y-2">
                                                    <Label className="text-[10px]">URL</Label>
                                                    <Input value={selectedNode.data.config.url || ''} onChange={e => updateConfig('url', e.target.value)} className="h-9 bg-slate-50 dark:bg-slate-950/50" />
                                                </div>
                                            </div>
                                        )}

                                        {selectedNode.data.type === 'code' && (
                                            <div className="space-y-2">
                                                <Label className="text-xs">JavaScript Code</Label>
                                                <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-800">
                                                    <div className="absolute top-0 right-0 p-1 bg-slate-100 dark:bg-slate-900 text-[10px] text-muted-foreground rounded-bl">JS</div>
                                                    <Textarea
                                                        value={selectedNode.data.config.code || 'return input;'}
                                                        onChange={e => updateConfig('code', e.target.value)}
                                                        className="font-mono text-[11px] min-h-[250px] bg-slate-950 text-slate-100 border-none focus-visible:ring-0 p-4 leading-relaxed"
                                                        spellCheck={false}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Available: <code className="text-primary">input</code>, <code className="text-primary">context</code>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNode.data.type === 'ai-agent' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">Context Fields</Label>
                                                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                                                        const newFields = [...(selectedNode.data.config.fields || []), { key: '', value: '' }];
                                                        updateConfig('fields', newFields);
                                                    }}>
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
                                    </div>

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
                    </Tabs>
                </div>
            </div>
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
