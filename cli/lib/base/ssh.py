
import subprocess
import os

execute = lambda cmd: subprocess.getoutput(cmd)

class SSH():

    def __init__(self, conf):
        self.conf = conf
        self.ssh_port = conf.get('port', 22)
        self.ssh_data = f"""{conf.get('user', 'root')}@{conf.get('host')}"""

    def test(self, timeout=10):
        return (execute(f""" timeout {timeout} bash -c ' ssh -p {self.ssh_port} {self.ssh_data} "echo 1" ' """) or '').strip() == '1'

    def cmd(self, cmd, term=False):
        return f"""ssh {term and '-t' or ''} -p {self.ssh_port} {self.ssh_data} {cmd and '"' + cmd + '"' or ''}""".strip()

    def cp(self, src, dst):
        return f"""scp -P {self.ssh_port} {src} {self.ssh_data}:{dst}"""

    def upload(self, src, dst):

        if not os.path.exists(src):
            raise Exception(f"""File not found: {src}""")

        return f"""scp -P {self.ssh_port} -r {src} {self.ssh_data}:{dst}"""

    def download(self, src, dst):
        return f"""scp -P {self.ssh_port} -r {self.ssh_data}:{src} {dst}"""
