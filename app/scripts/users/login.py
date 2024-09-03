import os
import sys
from passlib.hash import pbkdf2_sha512

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI

args = CLI.args()
password = args.get('password')
password_hash = args.get('hash')

if not password:
    CLI.out({'status': 'error', 'message': 'Password not found'})

if not password_hash:
    CLI.out({'status': 'error', 'message': 'Password hash not found'})

encripted = pbkdf2_sha512.using(rounds=600_000, salt_size=16).hash(password)

check = pbkdf2_sha512.verify(password, password_hash)

if not check:
    CLI.out({'status': 'error', 'message': 'Password does not match'})

CLI.out({'status': 'success'})
