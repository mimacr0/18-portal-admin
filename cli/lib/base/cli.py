
import sys

class CLI:
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    RESET = '\033[0m'

    @staticmethod
    def _print_message(message, color, prefix):
        print(f"{color}{prefix}{CLI.RESET}: {message}")

    @staticmethod
    def info(message):
        CLI._print_message(message, CLI.CYAN, "INFO")

    @staticmethod
    def debug(message):
        CLI._print_message(message, CLI.MAGENTA, "DEBUG")

    @staticmethod
    def warning(message):
        CLI._print_message(message, CLI.YELLOW, "WARNING")

    @staticmethod
    def error(message):
        CLI._print_message(message, CLI.RED, "ERROR")
        sys.exit(1)

    @staticmethod
    def success(message):
        CLI._print_message(message, CLI.GREEN, "SUCCESS")

    @staticmethod
    def print_plain(message):
        print(message)

    @staticmethod
    def confirm(msg, lang='en'):
        try:
            if lang == 'en':
                return input(f"""{msg} [Y/n]\n""") == 'Y'

            if lang == 'es':
                return input(f"""{msg} [S/n]\n""") == 'S'
        except KeyboardInterrupt as e:
            return False
