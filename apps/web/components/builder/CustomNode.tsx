import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { cn } from '@/lib/utils';
import { Settings, Zap, Play, ArrowRightLeft, Code, Mail, MessageSquare, Clock, Hourglass, Repeat, Sparkles, Check, X, RefreshCw, MoreHorizontal, Globe, Database } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    'database': Database
};

// Premium Category Styles with Gradients and Shadows
const CATEGORY_STYLES: Record<string, {
    accent: string;
    bg: string;
    iconBg: string;
    iconColor: string;
}> = {
    'trigger': {
        accent: 'bg-amber-500',
        bg: 'from-amber-500/5 to-amber-500/0',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500'
    },
    'action': {
        accent: 'bg-indigo-500',
        bg: 'from-indigo-500/5 to-indigo-500/0',
        iconBg: 'bg-indigo-500/10',
        iconColor: 'text-indigo-500'
    },
    'logic': {
        accent: 'bg-violet-500',
        bg: 'from-violet-500/5 to-violet-500/0',
        iconBg: 'bg-violet-500/10',
        iconColor: 'text-violet-500'
    },
};

export const CustomNode = memo(({ id, data, selected }: NodeProps) => {
    const Icon = ICONS[data.type] || Settings;
    const isEnabled = data.enabled !== false;
    const { setNodes, deleteElements } = useReactFlow();
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);

    // Determine category based on type
    const category = data.type?.includes('trigger') ? 'trigger' : (['if', 'switch', 'loop', 'merge'].includes(data.type || '') ? 'logic' : 'action');
    const styles = CATEGORY_STYLES[category] || {
        accent: 'bg-slate-500',
        bg: 'from-slate-500/5 to-slate-500/0',
        iconBg: 'bg-slate-500/10',
        iconColor: 'text-slate-500'
    };

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

    const handleDelete = () => {
        deleteElements({ nodes: [{ id }] });
    };

    return (

        <div className={cn(
            "group relative transition-all duration-300 ease-out",
            selected ? "scale-100 z-50" : "hover:scale-[1.01] z-10"
        )}>
            {/* Main Card Container */}
            <div className={cn(
                "glass-card rounded-xl w-[280px] overflow-hidden transition-all duration-300",
                selected ? "ring-1 ring-primary shadow-2xl shadow-primary/20 bg-background/80" : "hover:ring-1 hover:ring-white/20 hover:shadow-xl",
                !isEnabled && "opacity-60 grayscale-[0.5] hover:opacity-100 transition-opacity"
            )}>

                {/* Colorful Top Accent Bar (Gradient) */}
                <div className={cn("absolute inset-0 h-full w-full bg-gradient-to-br opacity-50 pointer-events-none", styles.bg)} />
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", styles.accent)} />

                <div className="relative p-3">
                    {/* Header: Icon + Label + Actions */}
                    <div className="flex items-start gap-3">
                        {/* Icon Box */}
                        <div className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 shadow-sm border border-white/10",
                            styles.iconBg
                        )}>
                            <Icon size={18} className={styles.iconColor} />
                        </div>

                        {/* Content Info */}
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                                {/* Label */}
                                {isEditing ? (
                                    <input
                                        autoFocus
                                        className="text-sm font-semibold font-outfit bg-transparent border-b border-primary/50 outline-none w-full p-0 text-foreground"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        onBlur={onLabelBlur}
                                        onKeyDown={(e) => e.key === 'Enter' && onLabelBlur()}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <div
                                        className="text-sm font-semibold font-outfit text-foreground truncate cursor-text"
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditing(true);
                                        }}
                                    >
                                        {data.label}
                                    </div>
                                )}

                                {/* Options Menu */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-muted-foreground hover:text-foreground">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 font-medium">
                                            <DropdownMenuLabel className="text-xs">Node Actions</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setIsEditing(true)}
                                                className="text-xs cursor-pointer"
                                            >
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-xs text-red-500 focus:text-red-500 cursor-pointer"
                                                onClick={handleDelete}
                                            >
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide opacity-80 mt-0.5">
                                {category} &bull; {data.type.replace(/-/g, ' ')}
                            </div>
                        </div>
                    </div>

                    {/* Config Preview (Optional - can be expanded later) */}
                    {data.config?.url && (
                        <div className="mt-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate font-mono">
                                <Globe size={10} />
                                <span className="truncate">{data.config.url}</span>
                            </div>
                        </div>
                    )}

                    {data.config?.prompt && (
                        <div className="mt-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] text-muted-foreground line-clamp-2 italic">
                                "{data.config.prompt}"
                            </div>
                        </div>
                    )}

                    {/* Execution Status Footer */}
                    {(data.lastRunStatus || selected) && (
                        <div className={cn(
                            "mt-3 pt-2 border-t border-border/50 flex items-center justify-between gap-2 transition-all",
                            !data.lastRunStatus && !selected && "hidden"
                        )}>
                            {data.lastRunStatus ? (
                                <div className="flex items-center gap-1.5">
                                    {data.lastRunStatus === 'SUCCESS' ? (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Success</span>
                                        </>
                                    ) : data.lastRunStatus === 'FAILED' ? (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">Failed</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={10} className="text-blue-500 animate-spin" />
                                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Running...</span>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <span className="text-[10px] text-muted-foreground ml-auto">ID: {id}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ---------------- HANDLE LOGIC ---------------- */}

            {/* Left Input Handle (Target) */}
            {data.type !== 'manual-trigger' && data.type !== 'webhook-trigger' && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className={cn(
                        "!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-[3px] !border-background transition-all",
                        "group-hover:!bg-primary group-hover:!w-4 group-hover:!h-4 group-hover:!-left-[8px]",
                        "!top-1/2 !-translate-y-1/2 !-left-[6px]"
                    )}
                />
            )}

            {/* Right Output Handles (Source) */}

            {/* Case: IF Condition */}
            {data.type === 'if' ? (
                <>
                    {/* True Handle */}
                    <div className="absolute -right-3 top-[30%] -translate-y-1/2 flex items-center gap-1 flex-row-reverse">
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="true"
                            className="!relative !transform-none !right-auto !left-auto !w-3 !h-3 !bg-green-500 !border-[3px] !border-background transition-all hover:scale-125"
                        />
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute right-4">TRUE</span>
                    </div>

                    {/* False Handle */}
                    <div className="absolute -right-3 top-[70%] -translate-y-1/2 flex items-center gap-1 flex-row-reverse">
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="false"
                            className="!relative !transform-none !right-auto !left-auto !w-3 !h-3 !bg-red-500 !border-[3px] !border-background transition-all hover:scale-125"
                        />
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute right-4">FALSE</span>
                    </div>
                </>
            ) : data.type === 'switch' ? (
                /* Case: Switch */
                <>
                    {(data.config?.cases || []).map((c: any, i: number) => {
                        // Calculate dynamic position based on index to distribute handles
                        const total = (data.config.cases.length || 0) + 1; // +1 for default
                        const step = 80 / total; // Distribution range 80%
                        const topPos = 10 + (step * (i)) + (step / 2);

                        return (
                            <div
                                key={c.handle}
                                className="absolute -right-3 flex items-center gap-1 flex-row-reverse"
                                style={{ top: `${topPos}%` }}
                            >
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={c.handle}
                                    className="!relative !transform-none !right-auto !left-auto !w-3 !h-3 !bg-primary !border-[3px] !border-background transition-all hover:scale-125"
                                />
                                <span className="text-[9px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 whitespace-nowrap max-w-[60px] truncate">
                                    {c.label || 'Case'}
                                </span>
                            </div>
                        );
                    })}
                    {/* Default Handle for Switch */}
                    <div
                        className="absolute -right-3 bottom-[15%] flex items-center gap-1 flex-row-reverse"
                    >
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="default"
                            className="!relative !transform-none !right-auto !left-auto !w-3 !h-3 !bg-slate-400 !border-[3px] !border-background transition-all hover:scale-125"
                        />
                        <span className="text-[9px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute right-4">Default</span>
                    </div>
                </>
            ) : (
                /* Case: Standard Single Output */
                <Handle
                    type="source"
                    position={Position.Right}
                    className={cn(
                        "!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-[3px] !border-background transition-all",
                        "group-hover:!bg-primary group-hover:!w-4 group-hover:!h-4 group-hover:!-right-[8px]",
                        "!top-1/2 !-translate-y-1/2 !-right-[6px]"
                    )}
                />
            )}

            {/* Error Handle (Bottom) */}
            {data.type !== 'manual-trigger' && data.type !== 'webhook-trigger' && data.type !== 'schedule-trigger' && (
                <div className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="error"
                        className="!relative !transform-none !left-auto !w-2.5 !h-2.5 !bg-red-500 !border-2 !border-background hover:scale-125"
                    />
                </div>
            )}
        </div>

    );
});
