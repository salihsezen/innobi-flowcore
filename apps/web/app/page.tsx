"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    useEffect(() => {
        // Check token
        const token = localStorage.getItem("token");
        if (token) {
            router.push("/app");
        } else {
            router.push("/login");
        }
    }, [router]);
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
}
