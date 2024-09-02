
import os
import sys

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI
from lib.base.tools import Conf

args = CLI.args()
mode = args.get('format')
fname = args.get('file')
fdata = args.get('data')

data = {}

if mode == 'yml':

    file = os.path.join(os.getenv('WORK_DIR'), 'etc', f"""{fname}.yml""")

    if not os.path.exists(file):
        CLI.out({'status': 'error', 'message': 'File not found'})

    data = Conf.read_yml(fname) or {}

if mode == 'raw_yml':
    data = Conf.load_yml(fdata) or {}

CLI.out({'status': 'success', 'data': data })
