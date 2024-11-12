
import os

from lib.base.tools import Tools
from lib.base.conf import Conf
from lib.base.cli import CLI

def packages(args):
    conf = Conf.read_yml('conf')

    if not conf:
        CLI.error('No configuration found')

    packages = []
    dev_packages = conf.packages.dev() or []
    prod_packages = conf.packages.prod() or []
    app_dir = os.path.realpath(os.path.join(os.getenv('PROJECT_BASE_DIR'), 'app'))

    if dev_packages:
        packages.extend(dev_packages)

    if prod_packages:
        packages.extend(prod_packages)

    if packages:
        os.system(f'cd {app_dir} && npm install {" ".join(packages)}')

def update_scripts(args):
    pdir = os.getenv('PROJECT_BASE_DIR')
    version = os.getenv('PROJECT_VERSION')
    admdir = os.path.realpath(os.path.join(pdir, '..', '..'))
    tmpl_dir = os.path.join(admdir, 'templates', 'base')
    tmpl_dname = os.path.exists(os.path.join(tmpl_dir, str(version))) and str(version) or 'all'
    dst_dir = os.path.join(tmpl_dir, tmpl_dname, 'cli')

    os.system(f'rm -rf {dst_dir}')
    os.system(f'cp -r {os.path.join(pdir, "cli")} {dst_dir}')

    Tools.remove_pyc(dst_dir)

def venv_action(args):
    pdir = os.getenv('PROJECT_BASE_DIR')
    venv_dir = os.path.join(pdir, '..', '..', 'cache', 'venv')
    CLI.info(f'RUN:\n\ncd {os.path.realpath(venv_dir)}/bin && source activate\n\n')
    CLI.info(f'GOBACK:\n\ndeactivate && cd {pdir}\n\n')
