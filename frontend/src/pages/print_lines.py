import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\Laboratory.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(695, 700):
    if i < len(lines):
        print(f"Line {i+1}: {repr(lines[i])}")
