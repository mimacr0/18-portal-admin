
import base64
import csv
import json
import os
import sys

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI
from lib.base.tools import Conf

args = CLI.args()

result = []

with open(args.get('path'), mode='r') as file:
    reader = csv.reader(file)
    header = next(reader)
    for row in reader:
        data = json.loads(base64.b64decode(row[2]).decode('utf-8'))
        config = data.get('config')

        if config:
            data['conf_dict'] = Conf.load_yml(config)

        result.append({
            'id': row[0],
            'name': row[1],
            'data': data
        })

CLI.out({'status': 'success', 'data': result })