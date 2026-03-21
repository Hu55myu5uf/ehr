import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { HeartPulse, Activity, ExternalLink, Info, BookOpen } from 'lucide-react';

export default function EmbeddedResource() {
    const location = useLocation();
    
    const resources = [
        { 
            path: '/resources/calc', 
            url: 'https://calcfordocs.vercel.app/', 
            title: 'Medical Calc', 
            icon: Activity,
            desc: 'Clinical calculators & tools'
        },
        { 
            path: '/resources/emdex', 
            url: 'https://emdex.org/', 
            title: 'EMDEX', 
            icon: BookOpen,
            desc: 'Drug Formulary'
        }
    ];

    const activeResource = resources.find(r => r.path === location.pathname) || resources[0];

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
            {/* Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activeResource.title}</h1>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Internal Secure Sandbox View</p>
                            <a 
                                href={activeResource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-500 text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open Externally
                            </a>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative group">
                    <iframe 
                        src={activeResource.url} 
                        title={activeResource.title}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
}

// Separate component for the icon since using Lucide components as vars can be tricky with types
function ShieldAlert(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </svg>
    )
}
