
from datetime import datetime, timedelta
import os
import pysftp
import pytz
import random
import shutil
import string
import subprocess
import yaml

class Conf:

    @staticmethod
    def load_yml(txt):
        return yaml.safe_load(txt) or {}

    @staticmethod
    def read_yml(file, dname='etc'):
        file = file.replace('.yml', '')
        fpath = os.path.join(os.getenv('WORK_DIR'), dname, file + '.yml')

        if not os.path.exists(fpath):
            raise FileNotFoundError(f'File {fpath} does not exist')

        with open(fpath, 'r') as f:
            return yaml.load(f, Loader=yaml.FullLoader)

class SFTP():

    def __init__(self, conf):
        self.host = conf.get('host')
        self.user = conf.get('user')
        self.password = conf.get('passwd')

    def connect(self):
        cnopts = pysftp.CnOpts()
        cnopts.hostkeys = None
        return pysftp.Connection(self.host, username=self.user, password=self.password, cnopts=cnopts)

class Tools:

    @staticmethod
    def safe_dict(data):

        class SafeDict:
            def __init__(self, initial_obj=None):
                self._obj = initial_obj if initial_obj else {}

            def __getattr__(self, name):
                value = self._obj.get(name)

                if value is None:
                    return SafeDict()

                if isinstance(value, dict):
                    return SafeDict(value)

                return value

            def __bool__(self):
                return bool(self._obj)

            def __getitem__(self, key):
                return self._obj[key]

            def __setitem__(self, key, value):
                self._obj[key] = value

            def __str__(self):
                return str(self._obj) if self._obj else ''

            def __repr__(self):
                return  self._obj and repr(self._obj) or ''

            def d(self):
                return self._obj

        return SafeDict(data)

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
    def as_timezone(dt, tz_str="America/Mexico_City"):
        dformat="%Y-%m-%d %H:%M:%S"
        return datetime.strptime(dt.astimezone(pytz.timezone(tz_str)).strftime(dformat), dformat)

    @staticmethod
    def local_time(as_obj=False, native=True, tz_str="America/Mexico_City", dformat="%Y-%m-%d %H:%M:%S"):
        ldate = datetime.now(tz=pytz.timezone(tz_str))

        if as_obj:
            return native and ldate.strptime(ldate.strftime(dformat), dformat) or ldate

        return ldate.strftime(dformat)

    @staticmethod
    def datetime_mixin(_date, _time):
        return datetime.strptime('{} {}'.format(_date.strftime('%Y-%m-%d'), _time), '%Y-%m-%d %H:%M:%S')

    @staticmethod
    def make_datetime(date_str, dt_format='%Y-%m-%d %H:%M:%S'):
        return datetime.strptime(date_str, dt_format)

    @staticmethod
    def make_interval(_interval):
        interval = _interval.split('-')

        if interval[1] in ['day', 'days']:
            return timedelta(days=int(interval[0]))

        if interval[1] in ['hour', 'hours']:
            return timedelta(hours=int(interval[0]))

        if interval[1] in ['minute', 'minutes']:
            return timedelta(minutes=int(interval[0]))

        if interval[1] in ['second', 'seconds']:
            return timedelta(seconds=int(interval[0]))

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

