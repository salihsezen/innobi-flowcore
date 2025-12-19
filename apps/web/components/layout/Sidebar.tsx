"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Network, Play, Key, Settings, FileBox, LogOut, Shield, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, clearToken } from '@/lib/api';
import { ModeToggle } from '@/components/mode-toggle';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const MENU = [
    { label: 'Workflows', href: '/app/workflows', icon: Network },
    { label: 'Executions', href: '/app/executions', icon: Play },
    { label: 'Credentials', href: '/app/credentials', icon: Key },
    { label: 'Templates', href: '/app/templates', icon: FileBox },
    { label: 'Settings', href: '/app/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        api.get('/auth/me').then(res => setUser(res.data)).catch(() => setUser(null));
    }, []);

    const handleLogout = () => {
        clearToken();
        router.push('/login');
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <div className="md:hidden fixed top-20 left-4 z-50">
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2.5 bg-background/80 backdrop-blur-md border rounded-xl shadow-sm hover:bg-accent transition-colors"
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 bg-card/80 backdrop-blur-xl border-r flex flex-col transition-transform duration-300 ease-in-out premium-shadow",
                // Mobile: Full width drawer (matches Desktop w-52)
                // Tablet: Icon Sidebar (w-20)
                // Desktop: Full Sidebar (w-52) and relative positioning
                "w-52 md:w-20 lg:w-52",
                // Mobile: Drawer transform logic
                // Desktop/Tablet: Always visible
                mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                // Tablet: Center items (Icons)
                "md:items-center lg:items-stretch",
                // Desktop: Relative positioning to push content
                "lg:relative"
            )}>
                {/* Header */}
                <div className="p-6 h-16 border-b font-extrabold text-xl flex items-center justify-start md:justify-center lg:justify-start gap-2 bg-background/20 w-full">
                    <div className="flex items-center gap-3 -ml-2.5 md:ml-0 lg:-ml-2.5">
                        <Image
                            src="/images/innobi-flowcore-mark.png"
                            alt="innobi FlowCore"
                            width={68}
                            height={68}
                            className="h-[68px] w-[68px] md:h-10 md:w-10 lg:h-[68px] lg:w-[68px] flex-shrink-0"
                            priority
                        />
                        <span className="tracking-tight font-outfit text-foreground mt-0.5 flex md:hidden lg:flex flex-col items-center leading-none">
                            <span className="font-normal text-neutral-500 text-[0.8em]">innobi</span>
                            <span className="font-extrabold text-foreground">FlowCore</span>
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 mt-4 px-4 md:px-2 lg:px-4 w-full">
                    {MENU.map(item => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 md:px-2 md:py-2.5 lg:px-4 lg:py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold relative overflow-hidden group w-full",
                                    // Mobile & Desktop: Start aligned
                                    // Tablet: Center aligned
                                    "justify-start md:justify-center lg:justify-start",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 -translate-x-[12px] md:translate-x-0 lg:-translate-x-[12px]"
                                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                                )}
                                title={item.label}
                            >
                                <item.icon size={20} className={cn("transition-transform group-hover:scale-110", isActive ? "" : "opacity-70 group-hover:opacity-100")} />
                                <span className="md:hidden lg:block">{item.label}</span>
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 hidden lg:block" />}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 space-y-3 border-t bg-background/20 px-4 md:px-2 lg:px-4 w-full">
                    <div className="flex justify-center">
                        <ModeToggle />
                    </div>

                    {/* Desktop Profile Card */}
                    <div className="glass-card p-3 rounded-2xl group hover:scale-[1.02] transition-all duration-300 md:hidden lg:block">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <Image
                                    src="/images/profile.png"
                                    alt="User"
                                    width={40}
                                    height={40}
                                    className="rounded-full ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium">Welcome back,</div>
                                <div className="text-sm font-bold font-outfit text-foreground truncate">{user?.name || 'Guest'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-lg flex-1">
                                <Shield size={12} className="text-primary" />
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{user?.role || 'USER'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tablet/Mobile Profile (Icon Only) */}
                    <div className="justify-center hidden md:flex lg:hidden">
                        <div className="relative group">
                            <Image
                                src="/images/profile.png"
                                alt="Admin"
                                width={36}
                                height={36}
                                className="rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "flex items-center gap-3 px-4 py-2.5 md:px-2 md:py-2.5 lg:px-4 rounded-xl text-sm font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all w-full",
                            "justify-start md:justify-center lg:justify-start"
                        )}
                        title="Logout"
                    >
                        <LogOut size={18} />
                        <span className="md:hidden lg:block">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
