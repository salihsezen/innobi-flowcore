"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, FileBox, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        api.get('/templates').then(res => setTemplates(res.data));
    }, []);

    const createBlank = async () => {
        try {
            const res = await api.post('/workflows', { name: 'New Blank Workflow' });
            router.push(`/app/workflows/${res.data.id}`);
        } catch (err: any) {
            toast.error("Failed to create workflow");
        }
    };

    const useTemplate = async (id: string) => {
        try {
            const res = await api.post(`/templates/${id}/use`);
            toast.success("Workflow created from template");
            router.push(`/app/workflows/${res.data.id}`);
        } catch {
            toast.error("Failed to apply template");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-foreground">Templates</h1>
                    <p className="text-muted-foreground mt-1">Start with a professional recipe or build your own custom flow.</p>
                </div>
                <Button onClick={createBlank} className="premium-gradient shadow-lg shadow-primary/20 hover:scale-105 transition-transform h-11 px-6 rounded-xl font-bold">
                    <Plus className="mr-2 h-5 w-5" /> Create Blank
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Special "Start from Scratch" Card */}
                <div
                    onClick={createBlank}
                    className="glass-card group p-6 flex flex-col justify-between border-dashed border-2 border-primary/20 hover:border-primary/50 bg-primary/5 cursor-pointer rounded-2xl transition-all"
                >
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold font-outfit mb-2">Blank Canvas</h3>
                        <p className="text-sm text-muted-foreground mb-6">Master your logic from the ground up with a completely empty workflow.</p>
                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                            Build now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                {templates.map(t => (
                    <div
                        key={t.id}
                        className="glass-card group flex flex-col p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <FileBox size={20} />
                            </div>
                            <h3 className="text-lg font-bold font-outfit truncate group-hover:text-primary transition-colors">
                                {t.name}
                            </h3>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-3 mb-8 flex-1 leading-relaxed">
                            {t.description}
                        </p>

                        <Button
                            onClick={() => useTemplate(t.id)}
                            className="w-full premium-gradient font-bold h-10 rounded-xl shadow-lg shadow-primary/10 border-none"
                        >
                            <Sparkles className="mr-2 h-4 w-4" /> Use Template
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

