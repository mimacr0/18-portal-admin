
import re
import os
import uuid
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning

from lib.base.conf import Conf
from lib.base.cli import CLI
from lib.base.db import DB

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

MODELS_DIR = os.path.join(os.getenv('PROJECT_BASE_DIR'), 'models')
CODE_DIR = os.path.join(os.getenv('PROJECT_BASE_DIR'), 'code')

def stract_script(response):
    res = re.search(r'^```bash\n(.*?)```', response, re.DOTALL)

    if res:
        return res.group(1)

    return False

def action_code(args):
    conf = Conf.read_yml('conf')

    auth = conf.assistants.auth()
    url = conf.assistants.url()
    assitant_id = conf.assistants.id()
    ctype = conf.assistants.type()

    if not auth:
        CLI.error('No assistant auth found', 1)

    if not url:
        CLI.error('No assistant url found', 1)

    if not assitant_id:
        CLI.error('No assistant id found', 1)

    if not ctype:
        CLI.error('No assistant type found', 1)

    os.system(f'rm -rf {CODE_DIR}')
    os.makedirs(CODE_DIR, exist_ok=True)

    base_dir = os.getenv('PROJECT_BASE_DIR')
    db = DB(os.path.join(base_dir, 'data', 'db', 'sys'))

    has_tokens = db.table_exists('tokens')

    if not has_tokens:
        db.create_table('tokens', ['id VARCHAR(32)', 'token TEXT', 'assistant_id VARCHAR(32)'])

    def request_token(auth):
        try:
            res = requests.get(auth, verify=False)
            return res.json().get('data', {}).get('token')
        except Exception as e:
            CLI.error(f'Error requesting token: {e}')
            return False

    for model in args.models:
        model_data = Conf.read_yml(model, MODELS_DIR)
        steps = model_data.steps() or []

        for step in steps:

            token = db.fetch_one("SELECT * FROM tokens WHERE assistant_id = ?", assitant_id)

            if not token:
                token = request_token(auth)
            else:
                token = token.get('token')

            if not token:
                CLI.error('No token found', 1)

            db.execute("INSERT INTO tokens (id, token, assistant_id) VALUES (?, ?, ?)", uuid.uuid4().hex, token, assitant_id)
            db.commit()

            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }

            result = None

            print()
            CLI.info('Thinking...')
            print()

            try:
                res = requests.post(url, json={
                    'contact_id': assitant_id,
                    'chat_type': ctype,
                    'message': step
                }, headers=headers, verify=False)
                r = res.json()

                if r.get('status') != 'success':
                    CLI.error(r.get("message"), 1)

                result = r.get('data')
            except Exception as e:
                CLI.error(f'Error executing action: {e}')
                return False

            if not result:
                CLI.error('No result found', 1)

            script = stract_script(result)

            if not script:
                CLI.error('No script found')

            sid = str(uuid.uuid4().hex)
            code_file = os.path.join(CODE_DIR, f'{sid}.sh')
            open(code_file, 'w').write(script)
            os.system(f'chmod +x {code_file}')
            os.system(f'cd {CODE_DIR} && ./{sid}.sh')
            os.remove(code_file)

            CLI.info(f'Script executed successfully')
            print()
