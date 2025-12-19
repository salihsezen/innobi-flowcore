"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, Zap, Play, Calendar, ChevronRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ExecutionsPage() {
    const [executions, setExecutions] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        api.get('/executions').then(res => setExecutions(res.data));
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'FAILED': return <XCircle size={16} className="text-red-500" />;
            case 'RUNNING': return <Activity size={16} className="text-blue-500 animate-pulse" />;
            default: return <Clock size={16} className="text-slate-400" />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-foreground">Executions</h1>
                <p className="text-muted-foreground mt-1">Track the real-time status and history of your automated flows.</p>
            </div>

            <div className="space-y-3">
                {executions.length === 0 && (
                    <div className="glass-card p-12 text-center rounded-2xl border-dashed">
                        <Play className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No executions yet</h3>
                        <p className="text-sm text-muted-foreground">Run a workflow to see the results here.</p>
                    </div>
                )}

                {executions.map(ex => (
                    <div
                        key={ex.id}
                        className="glass-card group flex items-center justify-between p-4 px-6 cursor-pointer hover:border-primary/40 hover:scale-[1.01] transition-all duration-200 rounded-2xl"
                        onClick={() => router.push(`/app/executions/${ex.id}`)}
                    >
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "flex items-center justify-center p-3 rounded-xl bg-background/20 group-hover:bg-primary/10 transition-colors",
                                ex.status === 'COMPLETED' ? "text-green-500" : ex.status === 'FAILED' ? "text-red-500" : "text-blue-500"
                            )}>
                                {getStatusIcon(ex.status)}
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                                        Execution #{ex.id.slice(-6).toUpperCase()}
                                    </span>
                                    <div className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                        ex.status === 'COMPLETED' ? "bg-green-500/10 text-green-600" :
                                            ex.status === 'FAILED' ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"
                                    )}>
                                        {ex.status}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {format(new Date(ex.startedAt), 'MMM d, HH:mm:ss')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Zap size={12} className="text-amber-500" />
                                        {ex.triggerType}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <div className="text-xs font-mono text-muted-foreground">
                                    {ex.id.slice(0, 12)}...
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

