"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@automation/shared";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from 'next/link';
import { Sparkles, ServerCrash } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const form = useForm({
        resolver: zodResolver(LoginSchema),
    });

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isWakingUp && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev: number) => prev - 1);
            }, 1000);
        } else if (countdown === 0) {
            setIsWakingUp(false); // Hide after countdown
        }
        return () => clearInterval(timer);
    }, [isWakingUp, countdown]);

    const handleLoginProcess = async (loginFn: () => Promise<void>) => {
        setIsLoading(true);
        setIsWakingUp(false);
        setCountdown(60);

        // If request takes longer than 1.5s, assume cold start and show timer
        const slowRequestTimer = setTimeout(() => {
            setIsWakingUp(true);
        }, 1500);

        try {
            await loginFn();
            clearTimeout(slowRequestTimer);
            // Don't hide immediately if success, let redirect happen
        } catch (err: any) {
            clearTimeout(slowRequestTimer);
            setIsLoading(false);
            // If it failed effectively immediately (network error), show wakeup
            // or if it was a real auth error, just show toast
            if (!err.response) {
                // Network error likely means server is down/waking up
                setIsWakingUp(true);
            } else {
                toast.error(err.response?.data?.error || "Login failed");
                // Hide timer if it was just a wrong password
                setIsWakingUp(false);
            }
        }
    };

    const onSubmit = (data: any) => {
        handleLoginProcess(async () => {
            const res = await api.post("/auth/login", data);
            setToken(res.data.token);
            toast.success("Welcome back!");
            router.push("/app");
        });
    };

    const handleGuestLogin = () => {
        handleLoginProcess(async () => {
            const res = await api.post("/auth/login", {
                email: "user@example.com",
                password: "User123!"
            });
            setToken(res.data.token);
            toast.success("Logging in as guest...");
            router.push("/app");
        });
    };

    return (
        <div className="flex justify-center items-center min-h-screen h-[100vh] bg-background">
            <Card className="w-[350px] shadow-2xl">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input {...form.register("email")} placeholder="admin@example.com" disabled={isLoading} />
                            {form.formState.errors.email && <p className="text-red-500 text-xs">{(form.formState.errors.email as any).message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" {...form.register("password")} placeholder="123456" disabled={isLoading} />
                        </div>
                        <div className="space-y-3">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Signing In..." : "Sign In"}
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-primary/20 hover:bg-primary/5 hover:text-primary transition-all group"
                                onClick={handleGuestLogin}
                                disabled={isLoading}
                            >
                                <Sparkles className="mr-2 h-4 w-4 text-primary group-hover:animate-pulse" />
                                Try without UserName and Password
                            </Button>

                            {isWakingUp && (
                                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="mt-0.5">
                                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping absolute" />
                                        <div className="h-2 w-2 rounded-full bg-amber-500 relative" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold mb-1">Backend Server is Waking Up</p>
                                        <p className="opacity-90">Please wait while the system authenticates. This may take up to <span className="font-mono font-bold">{countdown}s</span>.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="text-center text-sm pt-2">
                            Don't have account? <Link href="/register" className="text-blue-500">Sign up</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
