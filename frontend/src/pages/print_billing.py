import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\Billing.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(540, 580):
    if i < len(lines):
        print(f"{i+1:03d}: {repr(lines[i])}")
