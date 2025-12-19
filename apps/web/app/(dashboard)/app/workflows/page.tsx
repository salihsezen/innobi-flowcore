"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Network, Clock, ShieldCheck, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const router = useRouter();

    const fetchWorkflows = () => {
        api.get('/workflows').then(res => setWorkflows(res.data));
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const createWorkflow = async () => {
        try {
            const res = await api.post('/workflows', { name: 'New Workflow' });
            router.push(`/app/workflows/${res.data.id}`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to create workflow");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/workflows/${deleteId}`);
            toast.success("Workflow deleted successfully");
            fetchWorkflows();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to delete workflow");
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-foreground">Workflows</h1>
                    <p className="text-muted-foreground mt-1">Manage and monitor your automation pipelines.</p>
                </div>
                <Button onClick={createWorkflow} className="premium-gradient shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-11 px-6 rounded-xl font-bold">
                    <Plus className="mr-2 h-5 w-5" /> New Workflow
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map(wf => (
                    <div
                        key={wf.id}
                        className="glass-card group relative p-6 cursor-pointer hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden"
                        onClick={() => router.push(`/app/workflows/${wf.id}`)}
                    >
                        {/* Status bar */}
                        <div className={cn(
                            "absolute top-0 left-0 right-0 h-1",
                            wf.status === 'PUBLISHED' ? "bg-green-500" : "bg-slate-400"
                        )} />

                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Network size={20} />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(wf.id);
                                }}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>

                        <h3 className="text-lg font-bold font-outfit mb-2 group-hover:text-primary transition-colors truncate">
                            {wf.name}
                        </h3>

                        <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Activity size={14} className="text-primary/60" />
                                <span>{wf.executions?.length || 0} executions</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock size={14} className="text-primary/60" />
                                <span>
                                    {wf.executions?.length > 0
                                        ? `Last: ${new Date(wf.executions[0].finishedAt).toLocaleDateString()}`
                                        : "Never run"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className={cn(
                                "text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors border",
                                wf.status === 'PUBLISHED'
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                            )}>
                                {wf.status}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                                ID: {wf.id.slice(0, 8)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Workflow"
                description="Are you sure you want to delete this workflow? This action cannot be undone."
                onConfirm={handleDelete}
            />
        </div>
    );
}
