
import os

from lib.base.conf import Conf
from lib.base.cli import CLI
from lib.base.sdict import SafeDict

from lib.models.pages import Pages


def template(args):
    conf = Conf.read_yml('conf')

    for template in args.templates:
        model_file = os.path.realpath(os.path.join(os.getenv('PROJECT_BASE_DIR'), 'models', template + '.yml'))

        if not os.path.exists(model_file):
            CLI.error(f'Model file not found: {template}', code=1)

        base_path = os.getenv('PROJECT_BASE_DIR')
        project_type = os.getenv('PROJECT_TYPE')
        project_version = os.getenv('PROJECT_VERSION')
        env = SafeDict({
            'conf': conf(),
            'args': args,
            'location': os.path.join(base_path, 'app'),
            'model': Conf.read_yml(template, 'models')(),
            'module': template,
            'templates': os.path.realpath(os.path.join(base_path, '..', '..', 'templates', 'dev', project_type, project_version))
        })

        Pages(env).build()
