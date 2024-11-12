import os
import yaml
import sys

from lib.base.sdict import SafeDict

class Conf:

    @staticmethod
    def load_yml(txt):
        return SafeDict(yaml.load(txt, Loader=yaml.FullLoader) or {})

    @staticmethod
    def read_yml(file, dname=None, raise_error=True):
        file = file.replace('.yml', '')
        fpath = dname and os.path.join(dname, file + '.yml') or os.path.join(os.getenv('PROJECT_BASE_DIR'), 'etc', file + '.yml')

        if not os.path.exists(fpath):
            error_message = f'File {fpath} does not exist'
            if raise_error:
                print('\033[91m\033[1mError: ' + error_message + '\033[0m')
                sys.exit(1)
            else:
                return SafeDict(None)

        with open(fpath, 'r') as f:
            return SafeDict(yaml.load(f, Loader=yaml.FullLoader) or {})
