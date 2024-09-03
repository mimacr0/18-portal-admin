import os
import sys

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI
from lib.base.ws import WS

args = CLI.args()
ws_conf = args.get('ws') or {}

if not ws_conf:
    CLI.out({'status': 'error', 'message': 'WS config not found'})

ws = WS(ws_conf)

if not ws.uid:
    CLI.out({'status': 'error', 'message': 'Connection error'})

res = ws.search_read('res.users', [
    ('share', '=', True)
])

items = []

for values in res:
    dbid = values.pop('id')
    values['dbid'] = dbid
    items.append(values)

CLI.out({'status': 'success', 'data': items})