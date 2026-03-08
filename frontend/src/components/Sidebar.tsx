import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    Beaker,
    Pill,
    BedDouble,
    HeartPulse,
    LogOut,
    ShieldAlert,
    Sun,
    Moon,
    Settings,
    ShieldCheck,
    CalendarCheck,
    Stethoscope,
    Activity,
    Banknote,
    BarChart3,
    Shield,
    LucideIcon,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import viisecLogo from '../assets/viisec-logo.png';

interface NavItem {
    to: string;
    icon: LucideIcon;
    label: string;
    roles: string[]; // which roles can see this item
}

const ALL_ROLES = ['super_admin', 'doctor', 'nurse', 'lab_attendant', 'receptionist', 'pharmacist', 'billing_officer'];

interface SidebarProps {
    user?: any;
    isMobile?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ user: propUser, isMobile, onMobileClose }: SidebarProps) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Use propUser if provided, otherwise fallback to localStorage
    let user = propUser;
    if (!user) {
        const userStr = localStorage.getItem('user');
        user = { username: 'User', role: '' };
        if (userStr && userStr !== 'undefined') {
            try {
                user = JSON.parse(userStr);
            } catch (e) {
                console.error("Invalid user data in localStorage");
            }
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems: NavItem[] = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ALL_ROLES },
        { to: '/patients', icon: Users, label: 'Patients', roles: ['super_admin', 'nurse', 'receptionist', 'billing_officer'] },
        { to: '/appointments', icon: CalendarCheck, label: 'Appointments', roles: ['super_admin', 'receptionist', 'doctor'] },
        { to: '/consultations', icon: Stethoscope, label: 'Consultations', roles: ['super_admin', 'doctor'] },
        { to: '/admissions', icon: HeartPulse, label: 'Admissions', roles: ['super_admin', 'doctor', 'nurse'] },
        { to: '/nursing', icon: Activity, label: 'Nursing', roles: ['super_admin', 'nurse'] },
        { to: '/labs', icon: Beaker, label: 'Laboratory', roles: ['super_admin', 'lab_attendant'] },
        { to: '/pharmacy', icon: Pill, label: 'Pharmacy', roles: ['super_admin', 'pharmacist'] },
        { to: '/billing', icon: Banknote, label: 'Billing', roles: ['super_admin', 'billing_officer', 'receptionist'] },
        { to: '/wards', icon: BedDouble, label: 'Wards', roles: ['super_admin', 'nurse', 'doctor'] },
        { to: '/insurance', icon: Shield, label: 'Insurance', roles: ['super_admin', 'billing_officer'] },
        { to: '/admin/prices', icon: Banknote, label: 'Price List', roles: ['super_admin'] },
        { to: '/admin/funds', icon: BarChart3, label: 'Funds Statistics', roles: ['super_admin'] },
        { to: '/admin/users', icon: ShieldCheck, label: 'User Management', roles: ['super_admin'] },
        { to: '/settings', icon: Settings, label: 'Settings', roles: ALL_ROLES },
    ];

    const visibleItems = navItems.filter(item => user.role && item.roles.includes(user.role));

    const handleNavClick = () => {
        if (isMobile && onMobileClose) {
            onMobileClose();
        }
    };

    return (
        <div className={`${isMobile ? 'w-full' : (isCollapsed ? 'w-20' : 'w-72')} h-full bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 transition-all duration-300 relative shadow-xl md:shadow-none`}>
            {/* Toggle Button (Desktop only) */}
            {!isMobile && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 shadow-sm z-10 transition-colors"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            )}

            {/* Close Button (Mobile only) */}
            {isMobile && (
                <button
                    onClick={onMobileClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 mb-10`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-600 rounded-lg shrink-0">
                        <ShieldAlert className="w-6 h-6 text-white" />
                    </div>
                    {!isCollapsed && <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white transition-opacity duration-300">ViiSec EHR</span>}
                </div>
            </div>

            <nav className={`flex-1 space-y-2 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'scrollbar-hidden' : 'scrollbar-slim'}`}>
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive
                                ? 'bg-brand-600/10 text-brand-600 dark:text-brand-500 font-semibold shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            } ${isCollapsed && !isMobile ? 'justify-center' : ''}`
                        }
                        title={isCollapsed && !isMobile ? item.label : undefined}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {(!isCollapsed || isMobile) && <span className="transition-opacity duration-300 whitespace-nowrap">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto space-y-4">
                <button
                    onClick={toggleTheme}
                    className={`nav-button-group w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-800 shadow-sm ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
                >
                    {theme === 'dark' ? (
                        <>
                            <Sun className="w-5 h-5 text-amber-500 shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">Light Mode</span>}
                        </>
                    ) : (
                        <>
                            <Moon className="w-5 h-5 text-brand-600 shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">Dark Mode</span>}
                        </>
                    )}
                </button>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    {!isCollapsed && (
                        <div className="px-3 mb-4 transition-opacity duration-300 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                                {(user as any).profile_picture ? (
                                    <img src={`http://localhost:5173/api/uploads/profiles/${(user as any).profile_picture}`} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    ((user as any).full_name || user.username).charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-slate-900 dark:text-slate-300 font-bold truncate">{(user as any).full_name || user.username}</p>
                                <p className="text-[10px] text-brand-600 dark:text-brand-500 font-black uppercase tracking-widest truncate">{user.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Logout' : undefined}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">Logout</span>}
                    </button>
                </div>

                {/* Developed by ViiSec */}
                <a
                    href="https://viisec.onrender.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 px-3 py-2 mt-3 rounded-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/50 dark:border-slate-700/50 hover:border-brand-500/50 hover:shadow-sm hover:shadow-brand-500/10 transition-all group ${isCollapsed ? 'w-10 h-10 mx-auto !px-0' : ''}`}
                    title={isCollapsed ? "Developed by ViiSec" : "Developed by ViiSec Software Solutions"}
                >
                    <img src={viisecLogo} alt="ViiSec" className={`rounded-sm opacity-80 group-hover:opacity-100 transition-opacity ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                    {!isCollapsed && (
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors tracking-wide overflow-hidden whitespace-nowrap">
                            Developed by ViiSec Software Solutions
                        </span>
                    )}
                </a>
            </div>
        </div>
    );
}
