# cli.py

import argparse
from actions import dev as DACT
from actions import admin as AACT
from actions import share as SACT
from actions import code as CODEACT


def main():
    parser = argparse.ArgumentParser(description="CLI for the project")

    subparsers = parser.add_subparsers()

    dev_parser = subparsers.add_parser('tmpl', help='Rende template files')
    dev_parser.add_argument('templates', help='Template names', nargs='*')
    dev_parser.set_defaults(func=DACT.template)

    venv_parser = subparsers.add_parser('venv', help='Manage the virtual environment')
    venv_parser.set_defaults(func=AACT.venv_action)

    packages_parser = subparsers.add_parser('packages', help='Install packages')
    packages_parser.add_argument('packages', help='Package names', nargs='*')
    packages_parser.add_argument('-u', '--update', action='store_true', help='Update packages')
    packages_parser.set_defaults(func=AACT.packages)

    share_parser = subparsers.add_parser('share', help='Share files')
    share_parser.add_argument('name', help='Name of the share')
    share_parser.set_defaults(func=SACT.share_files)

    pull_parser = subparsers.add_parser('pull', help='Pull files')
    pull_parser.add_argument('name', help='Name of the share')
    pull_parser.set_defaults(func=SACT.pull_files)

    code_parser = subparsers.add_parser('code', help='Manage the project code')
    code_parser.add_argument('models', nargs='+', help='Models to clean')
    code_parser.set_defaults(func=CODEACT.action_code)

    args = parser.parse_args()

    if 'func' in args:
        args.func(args)
    else:
        print("Please provide a valid subcommand. Use -h for help.")

if __name__ == '__main__':
    main()
