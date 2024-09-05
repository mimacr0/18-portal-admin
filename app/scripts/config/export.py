
import base64
import csv
import json
import os
import sys
import tempfile

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI

args = CLI.args()

items = args.get('items', [])

csv_filename = None

with tempfile.NamedTemporaryFile(delete=False) as temp_file:
    csv_filename = temp_file.name
    with open(csv_filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['id', 'name', 'data'])

        for item in items:
            if 'conf_dict' in item['data']:
                item['data'].pop('conf_dict')
            writer.writerow([
                item.get('id'),
                item.get('name'),
                base64.b64encode(json.dumps(item.get('data')).encode()).decode('utf-8')
            ])

CLI.out({'status': 'success', 'data': { 'file': csv_filename }})