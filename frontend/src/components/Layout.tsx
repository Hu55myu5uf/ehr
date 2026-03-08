import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api/client';
import { Menu, X } from 'lucide-react';

const Layout: React.FC = () => {
    const [user, setUser] = useState<any>(() => {
        const stored = localStorage.getItem('user');
        return stored && stored !== 'undefined' ? JSON.parse(stored) : null;
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/auth/me');
                const freshUser = response.data;
                setUser(freshUser);
                localStorage.setItem('user', JSON.stringify(freshUser));
            } catch (err) {
                console.error("Failed to refresh user data", err);
            }
        };

        fetchUser();
    }, []);

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans flex overflow-hidden transition-colors duration-300">
            {/* Sidebar Desktop */}
            <div className="hidden md:block h-full">
                <Sidebar user={user} />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <div 
                        className="w-72 h-full animate-in slide-in-from-left duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <Sidebar user={user} onMobileClose={() => setIsMobileMenuOpen(false)} isMobile />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-brand-600 rounded-lg">
                            <Menu className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg">ViiSec EHR</span>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
