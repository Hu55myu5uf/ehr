import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\build_output2.txt'

try:
    with open(file_path, 'r', encoding='utf-16') as f:
        content = f.read()
except UnicodeError:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'error TS' in line:
        print(f"ERROR FOUND:")
        for j in range(max(0, i-2), min(len(lines), i+3)):
            print(repr(lines[j]))
