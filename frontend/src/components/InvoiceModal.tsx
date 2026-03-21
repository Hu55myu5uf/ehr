import React from 'react';
import { X, Printer, CheckCircle2, FileText } from 'lucide-react';

interface BillItem {
    id: string;
    item_type: string;
    description: string;
    quantity: number;
    unit_price: string;
    total_price: string;
}

interface Bill {
    id: string;
    patient_first: string;
    patient_last: string;
    mrn: string;
    bill_number: string;
    total_amount: string;
    paid_amount: string;
    status: string;
    generated_at: string;
    paid_at?: string;
    payment_method?: string;
    items?: BillItem[];
}

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    bill: Bill | null;
    isReceipt?: boolean;
}

export default function InvoiceModal({ isOpen, onClose, bill, isReceipt = false }: InvoiceModalProps) {
    if (!isOpen || !bill) return null;

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: string | number | undefined | null) => {
        if (amount === undefined || amount === null) return '₦0.00';
        const num = Number(amount);
        if (isNaN(num)) return '₦0.00';
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(num);
    };

    const formatDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleString();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 print:bg-white print:p-0 print:block print:static invoice-modal-overlay">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none print:static">
                
                {/* Header - Hidden on Print */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 print:hidden text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-500 rounded-xl text-white shadow-lg shadow-brand-500/20">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {isReceipt ? 'Payment Receipt' : 'Invoice Details'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-brand-600/20"
                        >
                            <Printer className="w-4 h-4" />
                            {isReceipt ? 'PRINT RECEIPT' : 'PRINT INVOICE'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div id="printable-invoice" className="p-8 overflow-y-auto print:overflow-visible print:p-0 text-left print:static">
                    {/* Invoice Branding - Shown on Print */}
                    <div className="hidden print:flex flex-col items-center mb-10 text-center">
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-widest">ViiSec EHR</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Secure Patient Management System</p>
                        <div className="w-24 h-1 bg-brand-600 mt-4 rounded-full"></div>
                    </div>

                    <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Information</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {bill.patient_first || 'N/A'} {bill.patient_last || ''}
                            </h3>
                            <p className="text-xs font-bold text-slate-500 font-mono mt-1 uppercase">MRN: {bill.mrn || 'N/A'}</p>
                        </div>
                        <div className="text-right sm:text-right text-left min-w-[150px]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice Number</p>
                            <p className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-lg inline-block">
                                {bill.bill_number || 'N/A'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                                {isReceipt ? `Paid: ${formatDate(bill.paid_at)}` : `Issued: ${formatDate(bill.generated_at)}`}
                            </p>
                            {isReceipt && bill.payment_method && (
                                <p className="text-[10px] text-brand-500 font-black uppercase mt-1 tracking-wider">
                                    via {bill.payment_method}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden mb-8 print:border-slate-300">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr className="text-left">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                                    <th className="text-center px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                                    <th className="text-right px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Price</th>
                                    <th className="text-right px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                                {bill.items && bill.items.length > 0 ? (
                                    bill.items.map((item) => (
                                        <tr key={item.id} className="text-left">
                                            <td className="px-6 py-4 text-slate-900 dark:text-white font-bold uppercase text-[11px]">{item.description}</td>
                                            <td className="px-6 py-4 text-center text-slate-500 font-bold">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right text-slate-500 font-mono">{formatCurrency(item.unit_price)}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white font-mono">{formatCurrency(item.total_price)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-bold italic uppercase text-xs">No items billed for this invoice</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-[280px] space-y-3 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl print:bg-white print:border print:border-slate-200">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(bill.total_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Grand Total</span>
                                <span className="text-xl font-black text-brand-600 dark:text-brand-400 font-mono">{formatCurrency(bill.total_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Only on Print */}
                    <div className="hidden print:block mt-20 text-center border-t border-slate-100 pt-10">
                        <div className="flex justify-around mb-12">
                            <div className="text-center">
                                <div className="w-40 border-b border-slate-300 mb-2 mx-auto"></div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issued By</p>
                            </div>
                            <div className="text-center">
                                <div className="w-40 border-b border-slate-300 mb-2 mx-auto"></div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Signature</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Thank you for Choosing ViiSec EHR Services</p>
                    </div>
                </div>

                {/* Print Styles */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        @page { 
                            margin: 10mm;
                            size: auto;
                        }
                        
                        /* Strategy: Hide everything except the modal and its ancestors */
                        
                        body * {
                            visibility: hidden !important;
                        }

                        /* Essential path to the invoice */
                        .invoice-modal-overlay,
                        .invoice-modal-overlay *,
                        #printable-invoice,
                        #printable-invoice * {
                            visibility: visible !important;
                        }

                        /* Force overlay to take up the full screen and be white */
                        .invoice-modal-overlay {
                            position: fixed !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            height: 100% !important;
                            background: white !important;
                            display: block !important;
                            z-index: 99999 !important;
                            visibility: visible !important;
                        }

                        /* Reset any dark mode backgrounds to white and text to black */
                        html, body {
                            background: white !important;
                            color: black !important;
                        }

                        .invoice-modal-overlay > div,
                        #printable-invoice,
                        #printable-invoice * {
                            background-color: white !important;
                            color: black !important;
                            box-shadow: none !important;
                            border-color: #eee !important;
                        }

                        /* Target the innermost container to be full width */
                        .invoice-modal-overlay > div {
                            border: none !important;
                            width: 100% !important;
                            max-width: none !important;
                            max-height: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                        }

                        #printable-invoice {
                            padding: 20px !important;
                            width: 100% !important;
                            display: block !important;
                        }

                        .print\\:hidden { 
                            display: none !important; 
                        }

                        .print\\:flex { 
                            display: flex !important; 
                        }
                    }
                ` }} />
            </div>
        </div>
    );
}
