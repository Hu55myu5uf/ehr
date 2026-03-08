import sys
import re

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\Laboratory.tsx'
with open(file_path, 'rb') as f:
    content = f.read()

# Look for null bytes or other weird stuff
has_null = b'\x00' in content
print(f"Has null bytes: {has_null}")

# Try to decode and find the corrupted string
try:
    text = content.decode('utf-8')
except UnicodeDecodeError as e:
    print(f"Unicode Decode Error: {e}")
    text = content.decode('latin-1')

# Search for the suspicious patterns
patterns = [
    r'y-auto scrollbar-',
    r'-slim modal-content-scroll">',
    r'es\(patientSearch.toLowerCase\)\)\)se\(\)\.includ'
]

for p in patterns:
    matches = list(re.finditer(p, text))
    print(f"Pattern '{p}' found {len(matches)} times")
    for m in matches:
        start = max(0, m.start() - 50)
        end = min(len(text), m.end() + 50)
        print(f"Context: ...{text[start:end]}...")
