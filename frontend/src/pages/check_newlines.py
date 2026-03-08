import sys

file_path = r'c:\xampp\htdocs\ehr\frontend\src\pages\Laboratory.tsx'
with open(file_path, 'rb') as f:
    content = f.read()

# Find sequences of \r not followed by \n
for i in range(len(content)-1):
    if content[i] == 0x0D and content[i+1] != 0x0A:
        print(f"Lone CR at index {i}")
        start = max(0, i-50)
        end = min(len(content), i+50)
        print(f"Context: {content[start:end]}")

# Also check for \n not preceded by \r (in case it's inconsistent)
for i in range(1, len(content)):
    if content[i] == 0x0A and content[i-1] != 0x0D:
        print(f"Lone LF at index {i}")
