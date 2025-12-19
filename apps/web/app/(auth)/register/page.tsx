"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema } from "@automation/shared";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const form = useForm({
        resolver: zodResolver(RegisterSchema),
    });

    const onSubmit = async (data: any) => {
        try {
            await api.post("/auth/register", data);
            toast.success("Account created! Please login.");
            router.push("/login");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Registration failed");
        }
    };

    return (
        <div className="flex justify-center items-center main-h-screen h-[100vh] bg-background">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Register</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input {...form.register("name")} placeholder="Your Name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input {...form.register("email")} placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" {...form.register("password")} />
                        </div>
                        <Button type="submit" className="w-full">
                            Sign Up
                        </Button>
                        <div className="text-center text-sm">
                            Already member? <Link href="/login" className="text-blue-500">Sign in</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
