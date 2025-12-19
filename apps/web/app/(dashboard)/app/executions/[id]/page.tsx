"use client";
import { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ExecutionDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [execution, setExecution] = useState<any>(null);

    useEffect(() => {
        api.get(`/executions/${id}`).then(res => setExecution(res.data));
    }, [id]);

    if (!execution) return <div className="p-8">Loading...</div>;

    const logs = execution.logs || [];
    // Sort logs by ID as a proxy for time (or createdAt if available)
    logs.sort((a: any, b: any) => a.id.localeCompare(b.id));

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Execution {execution.id.slice(0, 8)}...</h1>
                <Badge variant={execution.status === 'SUCCESS' ? 'default' : 'destructive'}>
                    {execution.status}
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle className="text-lg">Timing</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                        <div>Start: {new Date(execution.startedAt).toLocaleString()}</div>
                        <div>End: {execution.finishedAt ? new Date(execution.finishedAt).toLocaleString() : '-'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-lg">Trigger</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                        {execution.triggerType}
                    </CardContent>
                </Card>
            </div>

            {execution.error && (
                <Card className="border-red-500">
                    <CardHeader><CardTitle className="text-red-500">Global Error</CardTitle></CardHeader>
                    <CardContent>{execution.error}</CardContent>
                </Card>
            )}

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Execution Steps</h2>
                {logs.length === 0 && <div className="text-muted-foreground">No logs available.</div>}

                {logs.map((log: any) => (
                    <Card key={log.id} className={`overflow-hidden ${log.level === 'error' ? 'border-red-400' : ''}`}>
                        <div className="p-3 bg-accent border-b flex justify-between items-center">
                            <div className="font-mono text-sm font-semibold">Node: {log.nodeId}</div>
                            <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                                {log.message}
                            </Badge>
                        </div>
                        <div className="p-3">
                            {log.data ? (
                                <details className="group">
                                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none">
                                        View Input/Output Data
                                    </summary>
                                    <div className="mt-2 text-xs">
                                        {/* If data has input/output keys, split them? Or just raw dump */}
                                        {log.data.input && (
                                            <div className="mb-2">
                                                <div className="font-semibold text-muted-foreground mb-1">INPUT:</div>
                                                <pre className="bg-muted text-foreground p-2 rounded overflow-auto">
                                                    {JSON.stringify(log.data.input, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {(log.data.output || (!log.data.input && log.data)) && (
                                            <div>
                                                <div className="font-semibold text-muted-foreground mb-1">OUTPUT:</div>
                                                <pre className="bg-muted text-green-500 p-2 rounded overflow-auto">
                                                    {JSON.stringify(log.data.output || log.data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            ) : (
                                <span className="text-sm text-muted-foreground">No data logged.</span>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
