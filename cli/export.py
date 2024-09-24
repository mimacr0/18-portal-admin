# cli.py

import argparse

from actions import build as BACT


def main():
    parser = argparse.ArgumentParser(description="CLI for the project")

    subparsers = parser.add_subparsers()

    install_parser = subparsers.add_parser('install', help='Install package')
    install_parser.set_defaults(func=BACT.install)

    args = parser.parse_args()

    if 'func' in args:
        args.func(args)
    else:
        print("Please provide a valid subcommand. Use -h for help.")

if __name__ == '__main__':
    main()
