"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clearToken } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Shield, AlertTriangle, LogOut, Mail, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const router = useRouter();

    const handleLogout = () => {
        clearToken();
        toast.info("Logged out successfully");
        router.push('/login');
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight font-outfit text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your professional profile and workspace preferences.</p>
            </div>

            <div className="grid gap-8">
                {/* Account Section */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-foreground/5 bg-background/20 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <User size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-outfit">Account Information</h2>
                            <p className="text-xs text-muted-foreground">Profile details used across the automation platform.</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-10 bg-background/50 border-white/10" placeholder="John Doe" disabled />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-10 bg-background/50 border-white/10" placeholder="user@example.com" disabled />
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary transition-all" disabled>
                            Update Profile
                        </Button>
                    </div>
                </div>

                {/* Security Section */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-foreground/5 bg-background/20 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Shield size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-outfit">Security</h2>
                            <p className="text-xs text-muted-foreground">Manage your authentication and access controls.</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2 max-w-md">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                            <div className="relative">
                                <Fingerprint className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="password" value="••••••••••••" className="pl-10 bg-background/50 border-white/10" disabled />
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-lg border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500 transition-all" disabled>
                            Change Password
                        </Button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card rounded-2xl overflow-hidden border-red-500/20 bg-red-500/5">
                    <div className="px-6 py-4 border-b border-red-500/10 bg-red-500/5 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/20 text-red-500">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-outfit text-red-600">Danger Zone</h2>
                            <p className="text-xs text-red-500/70">Critical actions that affect your workspace.</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Sign Out</h3>
                                <p className="text-xs text-muted-foreground">Immediately terminate your current active session.</p>
                            </div>
                            <Button variant="destructive" onClick={handleLogout} className="rounded-xl px-6 h-10 shadow-lg shadow-red-500/20 flex items-center gap-2">
                                <LogOut size={16} /> Sign Out Now
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

