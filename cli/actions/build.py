
import os

from lib.base.tools import Tools, Conf
from lib.base.cli import CLI
from lib.templates import Templates


def install(args):
    conf = (Conf.read_yml('conf') or {}).get('install') or {}

    if not conf:
        CLI.error('No configuration found', 1)

    bdir = conf.get('dir')

    if not bdir:
        CLI.error('No install directory found', code=1)

    name = conf.get('name')

    if not name:
        CLI.error('No install name found', code=1)

    service = conf.get('service')

    if not service:
        CLI.error('No install service found', code=1)

    owner = os.getenv('PROJECT_OUSER')
    hostname = os.uname()[1].lower()
    src_dir = os.getenv('PROJECT_BASE_DIR')
    packages_dir = os.path.join(bdir, 'packages')
    install_dir = os.path.join(packages_dir, name)
    venv_path = os.path.join(bdir, 'venv')
    secret = Tools.token(143, extra='./-=+')
    port = conf.get('port') or 3000
    srv_file = os.path.join('/etc/systemd/system', f'{service}.service')

    env_file = os.path.join(install_dir, '.env')

    if not os.path.exists(f'{venv_path}/bin/python'):
        os.system(f'python3 -m venv {venv_path}')

    for module in (conf.get('modules') or []):
        os.system(f'{venv_path}/bin/pip install {module}')

    os.makedirs(install_dir, exist_ok=True)
    os.makedirs(os.path.join(install_dir, 'data', 'db'), exist_ok=True)
    os.makedirs(os.path.join(install_dir, 'data', 'filestore'), exist_ok=True)

    os.system(f'rm -rf {install_dir}/controllers')
    os.system(f'rm -rf {install_dir}/data/mp3')
    os.system(f'rm -rf {install_dir}/modules')
    os.system(f'rm -rf {install_dir}/components')
    os.system(f'rm -rf {install_dir}/locales')
    os.system(f'rm -rf {install_dir}/scripts')
    os.system(f'rm -rf {install_dir}/public')
    os.system(f'rm -rf {install_dir}/server.js')
    os.system(f'rm -rf {install_dir}/package*.json')

    os.system(f'cp -r {src_dir}/app/controllers {install_dir}')
    os.system(f'cp -r {src_dir}/app/data/mp3 {install_dir}/data')
    os.system(f'cp -r {src_dir}/app/modules {install_dir}')
    os.system(f'cp -r {src_dir}/app/components {install_dir}')
    os.system(f'cp -r {src_dir}/app/locales {install_dir}')
    os.system(f'cp -r {src_dir}/app/tools {install_dir}')
    os.system(f'cp -r {src_dir}/app/etc {install_dir}')
    os.system(f'cp -r {src_dir}/app/public {install_dir}')
    os.system(f'cp -r {src_dir}/app/scripts {install_dir}/scripts')
    os.system(f'cp -r {src_dir}/app/server.js {install_dir}')
    os.system(f'cp -r {src_dir}/app/package.json {install_dir}')

    os.makedirs(os.path.join(install_dir, 'scripts', 'tmp'), exist_ok=True)

    ctx = {
        'HOSTNAME': hostname or 'localhost',
        'HOST_IP': 'localhost',
        'BASE_DIR': bdir,
        'VENV_DIR': venv_path,
        'PROJECT_SECRET': secret,
        'PROJECT_PORT': port,
        'PROJECT_NAME': name,
        'PROJECT_DIR': install_dir,
        'DESCRIPTION': f'{name} server',
        'WORK_DIR': bdir,
        'BASE_PATH': install_dir
    }

    if not os.path.exists(env_file):
        os.system(f'cp {src_dir}/cli/install/env-tmpl {env_file}')
        Templates.render_file(env_file, ctx)

    if not os.path.exists(srv_file):
        os.system(f'cp {src_dir}/cli/install/service.tmpl {srv_file}')
        Templates.render_file(srv_file, ctx)
        os.system(f'systemctl daemon-reload')
        os.system(f'systemctl enable {service}.service')
        os.system(f'systemctl restart {service}.service')

    if not os.path.exists(f'{install_dir}/node_modules'):
        os.system(f'cd {install_dir} && npm update --omit=dev')

    os.system(f'chown -R {owner}: {bdir}')
