
import re

from jinja2 import Environment, FileSystemLoader, Template
import os

from lib.base.sdict import SafeDict


class Templates:

    def __init__(self, template_dir):
        self.template_dir = template_dir
        self.env = Environment(loader=FileSystemLoader(template_dir))

    def render(self, template, file, ctx=None, clean=True):
        """
        Render a template file and save it to the specified output directory.
        """
        template = self.env.get_template(template)
        content = template.render({ 'this': self })

        if clean:
            content = Templates.clean_content(content)

        parent_dir = os.path.dirname(file)

        os.makedirs(parent_dir, exist_ok=True)

        with open(file, 'w') as f:
            f.write(content)

    def content(self, template, ctx=None, clean=True):
        """
        Render the template and return the content.
        """
        template = self.env.get_template(template)
        content = template.render({ 'this': self })

        if clean:
            content = Templates.clean_content(content)

        return content

    def find(self, file, *expr):
        with open(file, 'r') as f:
            content = f.read()

        for exp in expr:
            match = re.search(exp, content)
            if match:
                return content[:match.start()].count('\n') + 1

        return None

    def insert(self, file, lnum, content, offset=0):
        with open(file, 'r+') as f:
            lines = f.readlines()
            pos = lnum + offset
            lines.insert(pos, content + "\n")
            f.seek(0)
            f.writelines(lines)
            f.truncate()

    @staticmethod
    def clean_content(content):
        cleaned_lines = []
        for line in content.splitlines():
            if (line or '').strip() == '@@':
                continue

            cleaned_lines.append(line)
        return '\n'.join(cleaned_lines)

    @staticmethod
    def render_file(file, ctx, clean=True):
        with open(file, 'r') as f:
            content = f.read()
        rendered_content = Template(content).render({ 'env': SafeDict(ctx) })
        if clean:
            rendered_content = Templates.clean_content(rendered_content)
        with open(file, 'w') as f:
            f.write(rendered_content)

    @staticmethod
    def touch(file):
        with open(file, 'w') as f:
            f.write('')
