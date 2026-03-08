import os
import re

dir_path = r'c:\xampp\htdocs\ehr\frontend\src'
pattern = re.compile(r'className="([^"]*)"')

for root, _, files in os.walk(dir_path):
    for f in files:
        if f.endswith('.tsx'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                lines = file.readlines()
                for i, line in enumerate(lines):
                    matches = pattern.findall(line)
                    for match in matches:
                        classes = match.split()
                        # Check if text-white or text-slate-100/200 is used
                        # without dark: prefix, and without a bg- class that would provide contrast
                        if 'text-white' in classes or 'text-slate-50' in classes or 'text-slate-100' in classes:
                            if 'dark:text-white' not in classes and not any(c.startswith('bg-') and c != 'bg-transparent' for c in classes):
                                print(f"{f}:{i+1} -> {match}")
