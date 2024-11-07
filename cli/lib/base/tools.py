
import os
import random
import string


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
