"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'sonner';

import { Trash2, Plus, Key, Shield, Hash, Server } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

export default function CredentialsPage() {
    const [creds, setCreds] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [newCred, setNewCred] = useState({ name: '', type: 'http-header', key: '', value: '' });

    const load = () => api.get('/credentials').then(res => setCreds(res.data));
    useEffect(() => { load(); }, []);

    const create = async () => {
        try {
            await api.post('/credentials', {
                name: newCred.name,
                type: newCred.type,
                data: { [newCred.key]: newCred.value }
            });
            toast.success("Credential created");
            setOpen(false);
            setNewCred({ name: '', type: 'http-header', key: '', value: '' });
            load();
        } catch {
            toast.error("Failed to create credential");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/credentials/${deleteId}`);
            toast.success("Credential deleted");
            load();
        } catch {
            toast.error("Failed to delete");
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-foreground">Credentials</h1>
                    <p className="text-muted-foreground mt-1">Manage your secure API keys and connection secrets.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="premium-gradient shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-11 px-6 rounded-xl font-bold">
                            <Plus className="mr-2 h-5 w-5" /> New Credential
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-outfit text-2xl font-bold">Create Credential</DialogTitle>
                            <DialogDescription>Add a new entry to your secure vault.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Name</Label>
                                <Input
                                    className="bg-background/50 border-white/10"
                                    value={newCred.name}
                                    onChange={e => setNewCred({ ...newCred, name: e.target.value })}
                                    placeholder="Production Database"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Key</Label>
                                <Input
                                    className="bg-background/50 border-white/10"
                                    value={newCred.key}
                                    onChange={e => setNewCred({ ...newCred, key: e.target.value })}
                                    placeholder="API_KEY"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Value</Label>
                                <Input
                                    type="password"
                                    className="bg-background/50 border-white/10"
                                    value={newCred.value}
                                    onChange={e => setNewCred({ ...newCred, value: e.target.value })}
                                />
                            </div>
                            <Button onClick={create} className="w-full premium-gradient font-bold h-11 rounded-xl">Save Credential</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {creds.map(c => (
                    <div
                        key={c.id}
                        className="glass-card group relative p-6 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary/40 transition-colors" />

                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                {c.type === 'http-header' ? <Server size={20} /> : <Shield size={20} />}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => setDeleteId(c.id)}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>

                        <h3 className="text-lg font-bold font-outfit mb-2 group-hover:text-primary transition-colors truncate">
                            {c.name}
                        </h3>

                        <div className="flex items-center gap-2 mt-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                            <Key size={12} className="text-primary/60" />
                            <span>{c.type.split('-').join(' ')}</span>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-mono">
                                ID: {c.id.slice(0, 8)}/•••
                            </span>
                            <div className="flex -space-x-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Credential"
                description="Are you sure you want to delete this credential? This action cannot be undone and any workflows using this credential may fail."
                onConfirm={handleDelete}
            />
        </div>
    );
}

