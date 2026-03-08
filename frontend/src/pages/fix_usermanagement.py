import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\UserManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'scrollbar-slim modal-content-scroll' in line:
        print(f"Fixing line {i+1}")
        lines[i] = '                            <div className="p-8 space-y-5 overflow-y-auto scrollbar-slim modal-content-scroll">\n'

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
