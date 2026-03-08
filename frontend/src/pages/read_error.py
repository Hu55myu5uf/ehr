import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\build_output.txt'
with open(file_path, 'r', encoding='utf-16') as f:
    content = f.read()

for line in content.split('\n'):
    if 'error' in line.lower() or 'ts' in line.lower():
        print(repr(line))
