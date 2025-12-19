import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex bg-background h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-background relative md:ml-20 lg:ml-0">
                {children}
            </main>
        </div>
    );
}
