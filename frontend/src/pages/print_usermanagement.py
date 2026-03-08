import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\UserManagement.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(340, 350):
    if i < len(lines):
        print(f"Line {i+1}: {repr(lines[i])}")
