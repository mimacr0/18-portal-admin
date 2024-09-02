
from distutils.dir_util import copy_tree
import hashlib
import json
import os
import random
import shutil
import string
import subprocess
import sys


class CLI:

    STYLE_RESET = '\033[0m'
    STYLE_BOLD = '\033[1m'
    STYLE_ITALIC = '\033[3m'
    STYLE_UNDERLINE = '\033[4m'
    STYLE_STRIKETHROUGH = '\033[9m'
    STYLE_BOLD_OFF = '\033[22m'
    STYLE_ITALIC_OFF = '\033[23m'
    STYLE_UNDERLINE_OFF = '\033[24m'
    STYLE_STRIKETHROUGH_OFF = '\033[29m'
    STYLE_BLACK = '\033[30m'
    STYLE_RED = '\033[31m'
    STYLE_GREEN = '\033[32m'
    STYLE_YELLOW = '\033[33m'
    STYLE_BLUE = '\033[34m'
    STYLE_PURPLE = '\033[35m'
    STYLE_CYAN = '\033[36m'
    STYLE_WHITE = '\033[37m'
    STYLE_BLACK_BACKGROUND = '\033[40m'
    STYLE_RED_BACKGROUND = '\033[41m'
    STYLE_GREEN_BACKGROUND = '\033[42m'
    STYLE_YELLOW_BACKGROUND = '\033[43m'
    STYLE_BLUE_BACKGROUND = '\033[44m'
    STYLE_PURPLE_BACKGROUND = '\033[45m'
    STYLE_CYAN_BACKGROUND = '\033[46m'
    STYLE_WHITE_BACKGROUND = '\033[47m'

    @staticmethod
    def exec(cmd):
        os.system(cmd)

    @staticmethod
    def sh(cmd, debug=False, clean=True):
        try:
            out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT)
            return out.decode('UTF-8').strip() if clean else out
        except KeyboardInterrupt as e:
            return False
        except Exception as e:
            if debug:
                CLI.error(e, 1)

    @staticmethod
    def confirm(msg, lang='en'):
        try:
            if lang == 'en':
                return input(f"""{msg} [Y/n]\n""") == 'Y'

            if lang == 'es':
                return input(f"""{msg} [S/n]\n""") == 'S'
        except KeyboardInterrupt as e:
            return False

    @staticmethod
    def error(msg, close=None):
        print(f"""{CLI.STYLE_RED}ERROR:{CLI.STYLE_RESET} {msg}""")

        if close is not None:
            exit(close)

    @staticmethod
    def info(msg):
        print(f"""{CLI.STYLE_GREEN}INFO:{CLI.STYLE_RESET} {msg}""")

    @staticmethod
    def warn(msg):
        print(f"""{CLI.STYLE_YELLOW}WARN:{CLI.STYLE_RESET} {msg}""")

    @staticmethod
    def debug(msg):
        print(f"""{CLI.STYLE_BLUE}DEBUG:{CLI.STYLE_RESET} {msg}""")

    @staticmethod
    def find_cmd(cmd):
        return CLI.sh('which {}'.format(cmd))

    @staticmethod
    def exist(path):
        return os.path.exists(path)

    @staticmethod
    def mkd(dirs):
        if not isinstance(dirs, list):
            dirs = [dirs]

        for path in dirs:
            os.makedirs(path, exist_ok=True)

    @staticmethod
    def cp(files):

        for src, dst in files.items():

            if not CLI.exist(src):
                CLI.error(f'File not found: {src}', 1)

            if os.path.isfile(src):
                shutil.copyfile(src, dst)
                continue

            copy_tree(src, dst)

    @staticmethod
    def rm(files):
        if not isinstance(files, list):
            files = [files]

        for file in files:
            try:
                if os.path.isdir(file):
                    shutil.rmtree(file, ignore_errors=True)
                else:
                    os.remove(file)
            except Exception as e:
                pass

    @staticmethod
    def dirname(path, levels=1):
        result = path
        for i in range(0, levels):
            result = os.path.dirname(result)
        return result

    @staticmethod
    def join(*args):
        args = list(args)
        paths = [args.pop(0)]
        paths.extend([p.lstrip('/') for p in args])
        return os.path.join(*paths)

    @staticmethod
    def realpath(path):
        return os.path.realpath(path)

    @staticmethod
    def basename(path):
        return os.path.basename(path)

    @staticmethod
    def find_cmd(cmd):
        return CLI.sh('which {}'.format(cmd))

    @staticmethod
    def ls(path):
        return os.listdir(path)

    @staticmethod
    def args():
        data = json.load(open(os.getenv('CMD_FILE'))) or {}
        return data.get('in') or {}

    @staticmethod
    def out(data, code=0):
        fdata = json.load(open(os.getenv('CMD_FILE')))
        fdata['out'] = data
        f = open(os.getenv('CMD_FILE'), 'wb')
        f.write(json.dumps(fdata).encode('UTF-8'))
        f.close()
        sys.exit(code)

    @staticmethod
    def owner(files, owner):
        if not isinstance(files, list):
            files = [files]

        for file in files:
            if os.path.exists(file):
                if os.path.isdir(file):
                    CLI.sh('sudo chown -R {} {}'.format(owner, file))
                else:
                    CLI.sh('sudo chown {} {}'.format(owner, file))

    @staticmethod
    def chmod(files, mode):
        if not isinstance(files, list):
            files = [files]

        for file in files:
            if os.path.exists(file):
                if os.path.isdir(file):
                    CLI.sh('chmod -R {} {}'.format(mode, file))
                else:
                    CLI.sh('chmod {} {}'.format(mode, file))

    @staticmethod
    def rm_void(files):

        if not isinstance(files, list):
            files = [files]

        for file in files:
            try:
                if os.path.isdir(file):
                    if len(os.listdir(file)) == 0:
                        shutil.rmtree(file, ignore_errors=True)
            except Exception as e:
                pass

    @staticmethod
    def isempty(dir_path):
        return not os.listdir(dir_path)

    @staticmethod
    def confirm_action(msg):
        try:
            return input(f"""{msg} [Y/n]\n""") == 'Y'
        except KeyboardInterrupt as e:
            return False

    @staticmethod
    def join(*args):
        args = list(args)
        paths = [args.pop(0)]
        paths.extend([p.lstrip('/') for p in args])
        return os.path.join(*paths)

    @staticmethod
    def run(command, trim=False):
        try:
            process = subprocess.Popen(command.split(), stdout=subprocess.PIPE)
            while True:
                output = process.stdout.readline().decode('UTF-8')
                if trim:
                    output = output.strip()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    print(output, end = '')
            rc = process.poll()
            return rc
        except KeyboardInterrupt:
            pass

    @staticmethod
    def deep_update(dict1, dict2):
        for key, value in dict2.items():
            if isinstance(value, dict):
                if key in dict1 and isinstance(dict1[key], dict):
                    CLI.deep_update(dict1[key], value)
                else:
                    dict1[key] = value
            else:
                dict1[key] = value

    @staticmethod
    def token(N=20, special=True, up=True, num=True, extra=''):
        chars = string.ascii_lowercase

        if up:
            chars += string.ascii_uppercase

        if num:
            chars += string.digits

        if special:
            chars += '$%&#@¡?¿¡#$%^!&_+|*()'

        if extra:
            chars += extra

        return ''.join(random.choice(chars) for _ in range(N))

    @staticmethod
    def file_hash(path, hash_type='sha256'):
        try:
            hash_obj = hashlib.new(hash_type)
            with open(path, 'rb') as f:
                while True:
                    data = f.read(8192)
                    if not data:
                        break
                    hash_obj.update(data)
                return hash_obj.hexdigest()
        except Exception as e:
            return None

def root_cmd(func):
    def wrapper(*args, **kwargs):

        if os.geteuid() != 0:
            CLI.error('You must be root to run this command', 1)

        return func(*args, **kwargs)
    return wrapper

def basic_cmd(func):
    def wrapper(*args, **kwargs):

        if os.geteuid() == 0:
            CLI.error('You can not run this command as root', 1)

        return func(*args, **kwargs)
    return wrapper