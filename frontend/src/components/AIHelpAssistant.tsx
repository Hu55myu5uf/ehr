import React, { useState, useEffect, useRef } from 'react';
import { 
    HelpCircle, X, MessageSquare, Sparkles, 
    Send, Loader2, BookOpen, Navigation, Brain
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../api/client';

export default function AIHelpAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg = query;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setQuery('');
        setLoading(true);

        try {
            const res = await api.post('/ai/help', { 
                query: userMsg,
                context: `Current Route: ${location.pathname}`
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting to my knowledge base. Please check if the AI service is configured." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-2xl shadow-brand-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40 group"
            >
                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 max-h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    {/* Header */}
                    <div className="p-4 bg-brand-500 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">ViiSec System Guide</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-brand-100 font-bold uppercase tracking-wider">AI Assistant Online</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] bg-slate-50/50 dark:bg-slate-950/20">
                        {messages.length === 0 && (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <Brain className="w-8 h-8 text-brand-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900 dark:text-white">How can I help you today?</p>
                                    <p className="text-xs text-slate-500 px-8">Ask me about any ViiSec EHR module or workflow.</p>
                                </div>
                                <div className="flex flex-col gap-2 px-6">
                                    <button 
                                        onClick={() => setQuery("How do I add a new patient?")}
                                        className="text-[10px] text-left p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-colors text-slate-600 dark:text-slate-400 font-medium"
                                    >
                                        "How do I add a new patient?"
                                    </button>
                                    <button 
                                        onClick={() => setQuery("How to allocate a bed to an inpatient?")}
                                        className="text-[10px] text-left p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-colors text-slate-600 dark:text-slate-400 font-medium"
                                    >
                                        "How to allocate a bed to an inpatient?"
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                    m.role === 'user' 
                                        ? 'bg-brand-500 text-white rounded-br-none shadow-lg shadow-brand-500/10' 
                                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                                }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="relative">
                            <input 
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type your question..."
                                className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-brand-500 outline-none rounded-2xl pl-4 pr-12 py-3 text-sm text-slate-900 dark:text-white transition-all"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!query.trim() || loading}
                                className="absolute right-2 top-2 p-1.5 bg-brand-500 text-white rounded-xl disabled:opacity-50 transition-all hover:scale-105"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[9px] text-center text-slate-400 mt-3 font-medium uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Navigation className="w-2 h-2" /> ViiSec Cognitive Support
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
