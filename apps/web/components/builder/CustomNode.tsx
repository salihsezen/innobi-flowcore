import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { WorkflowNode } from '@automation/shared';
import { Settings, Zap, Play, ArrowRightLeft, Code, Mail, MessageSquare, Clock, Hourglass, Repeat, Info, Sparkles, Check, X, RefreshCw } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";

const ICONS: Record<string, any> = {
    'manual-trigger': Play,
    'webhook-trigger': Zap,
    'schedule-trigger': Clock,
    'http-request': NetworkIcon,
    'if': ArrowRightLeft,
    'switch': ArrowRightLeft,
    'set': Settings,
    'code': Code,
    'delay': Hourglass,
    'loop': Repeat,
    'send-email': Mail,
    'slack-message': MessageSquare,
    'ai-agent': Sparkles
};

function NetworkIcon(props: any) {
    return <div {...props}>🌐</div>
}

const CATEGORY_STYLES: Record<string, { accent: string; shadow: string }> = {
    'trigger': { accent: 'bg-amber-500', shadow: 'shadow-amber-500/10' },
    'action': { accent: 'bg-blue-500', shadow: 'shadow-blue-500/10' },
    'logic': { accent: 'bg-purple-500', shadow: 'shadow-purple-500/10' },
};

export const CustomNode = memo(({ id, data, selected }: NodeProps) => {
    const Icon = ICONS[data.type] || Settings;
    const isEnabled = data.enabled !== false;
    const { setNodes } = useReactFlow();
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);

    const category = data.type?.includes('trigger') ? 'trigger' : (['if', 'switch', 'loop', 'merge'].includes(data.type || '') ? 'logic' : 'action');
    const styles = CATEGORY_STYLES[category] || { accent: 'bg-slate-500', shadow: 'shadow-slate-500/10' };

    useEffect(() => {
        setLabel(data.label);
    }, [data.label]);

    const onLabelBlur = () => {
        setIsEditing(false);
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, label } };
            }
            return node;
        }));
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "group transition-all duration-300",
                        selected ? "scale-105" : "hover:scale-[1.02]"
                    )}>
                        <div className={cn(
                            "glass-card rounded-2xl min-w-[180px] overflow-hidden transition-all duration-300 shadow-2xl relative",
                            selected ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : "border-slate-200/20",
                            !isEnabled && "opacity-60 grayscale-[0.5]"
                        )}>
                            <div className={cn("h-1.5 w-full", styles.accent)} />

                            <div className="p-4 bg-background/40">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={cn("p-1.5 rounded-lg text-white shadow-lg", styles.accent)}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                className="text-xs font-bold font-outfit bg-transparent border-b border-primary outline-none w-full"
                                                value={label}
                                                onChange={(e) => setLabel(e.target.value)}
                                                onBlur={onLabelBlur}
                                                onKeyDown={(e) => e.key === 'Enter' && onLabelBlur()}
                                            />
                                        ) : (
                                            <div
                                                className="text-xs font-bold font-outfit cursor-text truncate max-w-[100px]"
                                                onDoubleClick={() => setIsEditing(true)}
                                            >
                                                {data.label}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Execution Status Badge */}
                                {data.lastRunStatus && (
                                    <div className="mt-2 pt-2 border-t border-foreground/5 flex items-center justify-center gap-2">
                                        {data.lastRunStatus === 'SUCCESS' ? (
                                            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                <Check size={10} className="text-green-500" />
                                                <span className="text-[10px] font-bold text-green-500">Success</span>
                                            </div>
                                        ) : data.lastRunStatus === 'FAILED' ? (
                                            <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                <X size={10} className="text-red-500" />
                                                <span className="text-[10px] font-bold text-red-500">Failed</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                                <RefreshCw size={10} className="text-blue-500 animate-spin" />
                                                <span className="text-[10px] font-bold text-blue-500">Running</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Inputs */}
                            {data.type !== 'manual-trigger' && data.type !== 'webhook-trigger' && (
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background !-left-[5.5px]"
                                />
                            )}

                            {/* Outputs */}
                            {data.type === 'if' ? (
                                <>
                                    <div className="absolute -right-3 top-3 text-[10px] font-bold text-green-500">T</div>
                                    <Handle type="source" position={Position.Right} id="true" className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-background !top-[18px] !-right-[5.5px]" />

                                    <div className="absolute -right-3 bottom-3 text-[10px] font-bold text-red-500">F</div>
                                    <Handle type="source" position={Position.Right} id="false" className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-background !top-auto !bottom-[18px] !-right-[5.5px]" />
                                </>
                            ) : data.type === 'switch' ? (
                                <>
                                    {(data.config?.cases || []).map((c: any, i: number) => (
                                        <div key={c.handle} className="absolute -right-1 text-[8px] whitespace-nowrap text-muted-foreground" style={{ top: `${(i + 1) * 20}px` }}>
                                            <Handle
                                                type="source"
                                                position={Position.Right}
                                                id={c.handle}
                                                className="!bg-primary/60 !w-2.5 !h-2.5 !border-2 !border-background translate-x-[6px]"
                                            />
                                        </div>
                                    ))}
                                    <div className="absolute -right-1 bottom-2 text-[8px] text-muted-foreground">
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id="default"
                                            className="!bg-slate-400/60 !w-2.5 !h-2.5 !border-2 !border-background translate-x-[6px]"
                                        />
                                    </div>
                                </>
                            ) : (
                                <Handle type="source" position={Position.Right} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background !-right-[5.5px]" />
                            )}

                            {/* Error Handle */}
                            {data.type !== 'manual-trigger' && data.type !== 'webhook-trigger' && data.type !== 'schedule-trigger' && (
                                <Handle
                                    type="source"
                                    position={Position.Bottom}
                                    id="error"
                                    className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-background"
                                />
                            )}
                        </div>
                    </div>
                </TooltipTrigger>
                {data.description && (
                    <TooltipContent side="top" className="glass-card text-[10px] py-1 px-2 border-none">
                        {data.description}
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
});
