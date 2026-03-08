import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\Laboratory.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix Line 697 and 698
# Line 697: '                        <form onSubmit{submitResult} className="flex flex-col overflow-hidden">\n'
# Line 698: '                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">y-auto scrollbar-sli\n'

lines[696] = '                        <form onSubmit={submitResult} className="flex flex-col overflow-hidden">\n'
lines[697] = '                            <div className="p-8 space-y-6 overflow-y-auto scrollbar-slim modal-content-scroll">\n'

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed lines 697 and 698")
