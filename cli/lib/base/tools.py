
import configparser
import os
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
    def token(N=20, extra='', special=False):
        chars = string.ascii_lowercase
        chars += string.ascii_uppercase
        chars += string.digits
        special_chars = '$%&#@¡#$%!&_+*'


        if special:
            chars += special_chars

        if extra:
            chars += extra

        result = ''.join(random.choice(chars) for _ in range(N))

        for s in special_chars:
            if result.startswith(s):
                result = result[1:]

        return result

    @staticmethod
    def clean_pyc(rdir):
        for path, subdirs, files in os.walk(rdir):

            if path.endswith('__pycache__'):
                os.system('rm -rf {0}'.format(path))

            for file in files:
                if file.endswith('.pyc'):
                    full_path = os.path.join(path, file)
                    os.system('rm -rf {0}'.format(full_path))
