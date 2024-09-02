# cli.py

import argparse
from actions import admin as AACT


def main():
    parser = argparse.ArgumentParser(description="CLI for the project")

    subparsers = parser.add_subparsers()

    venv_parser = subparsers.add_parser('venv', help='Manage the virtual environment')
    venv_parser.set_defaults(func=AACT.venv_action)

    packages_parser = subparsers.add_parser('packages', help='Install packages')
    packages_parser.add_argument('packages', help='Package names', nargs='*')
    packages_parser.add_argument('-u', '--update', action='store_true', help='Update packages')
    packages_parser.set_defaults(func=AACT.packages)

    args = parser.parse_args()

    if 'func' in args:
        args.func(args)
    else:
        print("Please provide a valid subcommand. Use -h for help.")

if __name__ == '__main__':
    main()
