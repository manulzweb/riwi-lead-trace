import os
import re

files_to_patch = {
    'frontend/src/views/admin/categories.view.js': [
        (r'if \(!confirm\((.*?)\)\)', r'if (!(await showConfirm(\1)))')
    ],
    'frontend/src/views/admin/evaluations.view.js': [
        (r'if \(confirm\((.*?)\)\) \{', r'if (await showConfirm(\1)) {'),
        (r'const confirmed = confirm\(', r'const confirmed = await showConfirm('),
        (r'const onCoherenceConfirm = async \(question, aiMessage\) => confirm\(', r'const onCoherenceConfirm = async (question, aiMessage) => await showConfirm('),
    ],
    'frontend/src/views/admin/periods.view.js': [
        (r'if \(!confirm\((.*?)\)\)', r'if (!(await showConfirm(\1)))')
    ]
}

import_statement = "import { showConfirm } from '../../components/alerts.js';\n"

for filepath, replacements in files_to_patch.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = re.sub(old, new, content)
        
    if 'showConfirm' in content and 'import { showConfirm' not in content:
        if 'import { showToast }' in content:
            content = content.replace('import { showToast }', 'import { showToast, showConfirm }')
        else:
            content = import_statement + content
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Replaced confirm calls using regex')
