import sys
import re

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\UserManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace from max-h-[85vh]"> to the end of the Username input div.
start_str = '                        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">'
end_str = '                            <div className="space-y-1.5">\n                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Full Name</label>'

# Find start and end
start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    print(f"Found snippet from {start_idx} to {end_idx}")
    new_snippet = """                        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                            <div className="p-8 space-y-5 overflow-y-auto scrollbar-slim modal-content-scroll">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Username</label>
                                    <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white" />
                                </div>
"""
    # Replace content
    content = content[:start_idx] + new_snippet + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Could not find start or end string")
