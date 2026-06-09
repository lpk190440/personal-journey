import esprima
import re

with open(r'e:\A_AI\WorkBuddy\2026-06-08-21-54-02\个人之旅\js\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace optional chaining patterns with compatible syntax
modified = content
# ?. [ → just [
modified = re.sub(r'\?\.\s*\[', '[', modified)
# ?. ( → just (
modified = re.sub(r'\?\.\s*\(', '(', modified)
# ?.  → .
modified = modified.replace('?.', '.')
# ?? → ||
modified = modified.replace('??', '||')

orig_lines = content.split('\n')

try:
    esprima.parseScript(modified, tolerant=True)
    print('Parse OK - no syntax errors!')
except esprima.Error as e:
    ln = e.lineNumber
    desc = e.description if hasattr(e, 'description') else str(e)
    print(f'Error at line {ln}: {desc}')
    if ln and ln <= len(orig_lines):
        start = max(0, ln - 3)
        end = min(len(orig_lines), ln + 3)
        for i in range(start, end):
            marker = '>>>' if i == ln - 1 else '   '
            print(f'{marker} {i+1}: {orig_lines[i]}')
