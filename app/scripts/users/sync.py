import os
import sys

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI

args = CLI.args()

data = {}

CLI.out({'status': 'success', 'message': 'File not found'})