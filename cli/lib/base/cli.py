
import hashlib
import json
import platform
import random
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
    def os_data():
        uname = platform.uname()
        result = {
            'sys': uname.system,
            'release': uname.release,
            'dist': {
                'dist': '',
                'version': '',
                'release': ''
            },
            'os': os.name,
            'version': uname.version
        }

        if hasattr(platform, 'dist'):
            dist_data = platform.dist()
            result['dist'] = {
                'dist': dist_data[0],
                'version': dist_data[1],
                'release': dist_data[2]
            }

        return result

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
    def error(msg, code=None):
        print(f"""{CLI.STYLE_RED}ERROR:{CLI.STYLE_RESET} {msg}""")

        if str(code).isdigit():
            exit(int(code))

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
    def out(data, code=0, indent=None):
        print(json.dumps(data, indent=indent))
        sys.exit(code)

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

    @staticmethod
    def sys_info():
        mem=str(os.popen('free -t -m').readlines()[1])
        parts = [int(part.strip()) / 1024 for part in mem[5:].split() if part.strip()]

        total, used, free = shutil.disk_usage("/")
        total = (total // (2**30)) + 1
        used = (used // (2**30)) + 1
        free = (free // (2**30)) + 1
        use_precent = round(used / total * 100, 2)
        out = 100 - int(subprocess.getoutput("""echo $(vmstat 1 2|tail -1|awk '{print $15}')"""))
        drive_out = subprocess.getoutput("""df -h | awk '{print $1"|"$2"|"$3"|"$4"|"$5}'""")
        drive_data = {}

        for drive in drive_out.split('\n'):
            dparts = drive.split('|')

            if dparts[0].strip() == 'Filesystem':
                continue

            dlist = [dpart.strip() for dpart in dparts[1:]]

            if not dlist:
                continue

            drive_data[dparts[0].strip()] = {
                'size': dlist[0],
                'used': dlist[1],
                'free': dlist[2],
                'percent': dlist[3]
            }

        res = {
            'memory': {
                'total': round(parts[0], 2),
                'used': round(parts[1], 2),
                'free': round(parts[-1:][0], 2),
                'percent': round(parts[1] / parts[0] * 100, 2)
            },
            'cpu': out,
            'disk': {
                'total': round(total, 2),
                'used': round(used, 2),
                'free': round(free, 2),
                'percent': use_precent,
                'max_percent': max([int(d['percent'].replace('%', '')) for d in drive_data.values()]),
                'data': drive_data
            }
        }

        return res

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