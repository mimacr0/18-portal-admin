
import os
import subprocess

from lib.base.conf import Conf
from lib.base.cli import CLI
from lib.base.ssh import SSH

cmd_exec = lambda cmd: subprocess.run(cmd, shell=True, check=True)


def share_files(args):
    conf = Conf.read_yml('conf')

    if not conf:
        CLI.error('No configuration found')

    sconf = conf.share() or {}

    if not sconf:
        CLI.error('No share configuration found')

    if not sconf.get('host'):
        CLI.error('No share host found')

    if not sconf.get('dir'):
        CLI.error('No share directory found')

    ssh = SSH(sconf)

    if not ssh.test():
        CLI.error('Share host not reachable')

    dst_dir = sconf.get('dir')

    if not ssh.exists(dst_dir):
        cmd_exec(ssh.cmd(f'mkdir -p {dst_dir}'))

    bdir = os.getenv('PROJECT_BASE_DIR')
    src_dir = os.path.join(bdir, 'share', args.name)
    share_dir = os.path.join(dst_dir, args.name)

    if not os.path.exists(src_dir):
        CLI.error(f'Share {args.name} does not exist')

    overwrite = ssh.exists(share_dir) and CLI.confirm(f'Share {args.name} already exists. Overwrite (Y/n)? ')

    if overwrite:
        cmd_exec(ssh.cmd(f'rm -rf {share_dir}'))

    cmd_exec(ssh.upload(src_dir, share_dir))

    print()

    CLI.info(f'Share {args.name} uploaded')

    print()

def pull_files(args):
    conf = Conf.read_yml('conf')

    if not conf:
        CLI.error('No configuration found')

    sconf = conf.share() or {}

    if not sconf:
        CLI.error('No share configuration found')

    if not sconf.get('host'):
        CLI.error('No share host found')

    if not sconf.get('dir'):
        CLI.error('No share directory found')

    ssh = SSH(sconf)

    if not ssh.test():
        CLI.error('Share host not reachable')

    share_dir = sconf.get('dir')

    if not ssh.exists(share_dir):
        CLI.error('Share directory not found')

    bdir = os.getenv('PROJECT_BASE_DIR')
    ddir = os.path.join(bdir, 'share', args.name)
    src_dir = os.path.join(share_dir, args.name)

    if not ssh.exists(src_dir):
        CLI.error(f'Share {args.name} does not exist')

    overwrite = os.path.exists(ddir) and CLI.confirm(f'Share {args.name} already exists. Overwrite (Y/n)? ')

    if overwrite:
        os.system(f'rm -rf {ddir}')

    pdir = os.path.realpath(os.path.join(ddir, '..'))
    os.system(f'mkdir -p {pdir}')
    os.system(ssh.download(src_dir, ddir))

    print()

    CLI.info(f'Share {args.name} downloaded')

    print()
