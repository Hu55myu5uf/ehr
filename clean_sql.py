import re
import os

input_file = r'c:\xampp\htdocs\ehr\ehrecords.sql'
output_file = r'c:\xampp\htdocs\ehr\ehrecords_clean_prod.sql'

if not os.path.exists(input_file):
    print(f"Error: {input_file} not found")
    exit(1)

with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Add foreign key check disable
header = "SET FOREIGN_KEY_CHECKS = 0;\n"
footer = "\nSET FOREIGN_KEY_CHECKS = 1;"

# Replace DEFAULT uuid() or DEFAULT (UUID())
content = re.sub(r' DEFAULT uuid\(\)', '', content)
content = re.sub(r' DEFAULT \(UUID\(\)\)', '', content)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(header + content + footer)

print(f"Successfully cleaned SQL and saved to {output_file}")
