"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/lib/shared";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from 'next/link';
import { Sparkles } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const form = useForm({
        resolver: zodResolver(LoginSchema),
    });

    const onSubmit = async (data: any) => {
        try {
            const res = await api.post("/auth/login", data);
            setToken(res.data.token);
            toast.success("Welcome back!");
            router.push("/app");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Login failed");
        }
    };

    const handleGuestLogin = async () => {
        try {
            const res = await api.post("/auth/login", {
                email: "user@example.com",
                password: "User123!"
            });
            setToken(res.data.token);
            toast.success("Logging in as guest...");
            router.push("/app");
        } catch (err: any) {
            toast.error("Guest login failed. Please try manually.");
        }
    };

    return (
        <div className="flex justify-center items-center main-h-screen h-[100vh] bg-background">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input {...form.register("email")} placeholder="admin@example.com" />
                            {form.formState.errors.email && <p className="text-red-500 text-xs">{(form.formState.errors.email as any).message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" {...form.register("password")} placeholder="123456" />
                        </div>
                        <div className="space-y-3">
                            <Button type="submit" className="w-full">
                                Sign In
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
                            >
                                <Sparkles className="mr-2 h-4 w-4 text-primary group-hover:animate-pulse" />
                                Try without UserName and Password
                            </Button>
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
