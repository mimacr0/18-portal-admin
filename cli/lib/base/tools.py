
from datetime import datetime, timedelta
import configparser
import os
import pytz
import random
import string
import yaml

class Conf:

    @staticmethod
    def load_yml(txt):
        return yaml.safe_load(txt) or {}

    @staticmethod
    def read_yml(file, dname=None):
        file = file.replace('.yml', '')
        fpath = dname and os.path.join(dname, file + '.yml') or os.path.join(os.getenv('PROJECT_BASE_DIR'), 'etc', file + '.yml')

        if not os.path.exists(fpath):
            raise FileNotFoundError(f'File {fpath} does not exist')

        with open(fpath, 'r') as f:
            return yaml.load(f, Loader=yaml.FullLoader) or {}

        return {}

    @staticmethod
    def read_conf(file):

        if not os.path.exists(file):
            raise Exception('File not found: {}'.format(file))

        config = configparser.ConfigParser()
        config.read(file)
        return config

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
    def make_interval(time_str):

        if '-' not in time_str:
            return None

        time_str = time_str.strip()
        units, measure = time_str.split('-')

        if not units.isdigit():
            return None

        units = int(units)

        if measure in ['day', 'days']:
            return timedelta(days=units)

        if measure in ['hour', 'hours']:
            return timedelta(hours=units)

        if measure in ['minute', 'minutes']:
            return timedelta(minutes=units)

        if measure in ['second', 'seconds']:
            return timedelta(seconds=units)

    @staticmethod
    def remove_pyc(rdir):
        for path, subdirs, files in os.walk(rdir):

            if path.endswith('__pycache__'):
                os.system('rm -rf {0}'.format(path))

            for file in files:
                if file.endswith('.pyc'):
                    full_path = os.path.join(path, file)
                    os.system('rm -rf {0}'.format(full_path))
