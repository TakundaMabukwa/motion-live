'use client';

import {
    LayoutDashboard,
    Car,
    Users,
    Building2,
    LogOut,
    Clock,
    BarChart3,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
    selectedSection: string;
    setSelectedSection: (section: string) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar({
    selectedSection,
    setSelectedSection,
    sidebarOpen,
    setSidebarOpen
}: SidebarProps) {
    const menuItems: MenuItem[] = [
        {
            id: 'utilisation',
            label: 'Utilisation',
            icon: BarChart3
        },
        {
            id: 'vehicles',
            label: 'Vehicles',
            icon: Car
        },
        {
            id: 'drivers',
            label: 'Drivers',
            icon: Users
        },

        {
            id: 'starttime',
            label: 'Start Time',
            icon: Clock
        },
    ];

    const handleItemClick = (item: MenuItem) => {
        setSelectedSection(item.id);
        if (sidebarOpen) setSidebarOpen(false);
    };

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden z-40 fixed inset-0 bg-black bg-opacity-50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Close button for mobile */}
                    <div className="lg:hidden flex justify-between items-center p-4 border-b">
                        <h2 className="font-semibold text-gray-800">Menu</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2 px-4 py-4 overflow-y-auto">
                        {menuItems.map((item) => (
                            <Button
                                key={item.id}
                                variant={selectedSection === item.id ? "default" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-left h-auto p-3",
                                    selectedSection === item.id
                                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                        : "text-gray-700 hover:bg-gray-50"
                                )}
                                onClick={() => handleItemClick(item)}
                            >
                                <item.icon className="flex-shrink-0 mr-3 w-5 h-5" />
                                <span className="flex-1">{item.label}</span>
                            </Button>
                        ))}
                    </nav>

                    {/* Sign Out */}
                    <div className="p-4 border-t">
                        <Button
                            variant="ghost"
                            className="justify-start hover:bg-red-50 w-full text-red-600 hover:text-red-700"
                        >
                            <LogOut className="mr-3 w-5 h-5" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    );
}