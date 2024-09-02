
import os

from lib.base.tools import Tools, Conf
from lib.base.cli import CLI

def read_conf(file):
    try:
        return Conf.read_yml('conf') or {}
    except FileNotFoundError:
        return {}

def packages(args):
    conf = Conf.read_yml('conf')

    if not conf:
        CLI.error('No configuration found', 1)

    packages = conf.get('packages') or {}
    dev_packages = packages.get('dev') or []
    prod_packages = packages.get('prod') or []
    app_dir = os.path.realpath(os.path.join(os.getenv('PROJECT_BASE_DIR'), 'app'))

    if dev_packages:
        os.system(f'cd {app_dir} && npm install {" ".join(dev_packages)}')

    if prod_packages:
        os.system(f'cd {app_dir} && npm install {" ".join(prod_packages)}')

def venv_action(args):
    pdir = os.getenv('PROJECT_BASE_DIR')
    version = os.getenv('PROJECT_VERSION')
    venv_dir = os.path.join(pdir, '..', '..', 'cache', str(version), 'venv')
    CLI.info(f'RUN:\n\ncd {os.path.realpath(venv_dir)}/bin && source activate\n\n')
    CLI.info(f'GOBACK:\n\ndeactivate\n\n')
    CLI.info(f'PROJECT:\n\ncd {pdir}\n\n')