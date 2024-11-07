
import os

from lib.base.cli import CLI
from lib.base.sdict import SafeDict
from lib.templates import Templates

class Page(Templates):

    def __init__(self, env, name, data):
        super().__init__(env.templates())
        self._env = env
        self.name = name
        self.data = SafeDict(data)

        self.title = self.data.title()
        self.module = self._env.module() or self.name

        self.dst = self._env.location()
        self.dst_module = os.path.join(self.dst, 'modules', self.module)
        self.dst_route = os.path.join(self.dst_module, 'routes', f"{self.name}.js")
        self.dst_data = os.path.join(self.dst_module, 'data', f"{self.name}.js")
        self.dst_page = os.path.join(self.dst_module, 'views', f"{self.name}.ejs")
        self.dst_js = os.path.join(self.dst_module, 'js', f"{self.name}.ejs")
        self.dst_modules = os.path.join(self.dst, 'modules', 'modules.js')

    def build(self):
        self.render('page/route.js', self.dst_route)
        self.render('page/page.ejs', self.dst_page)
        self.render('page/js.ejs', self.dst_js)
        self.render('page/data.js', self.dst_data)

        if not self.find(self.dst_modules, rf'.*import \{{ {self.name}Router }} from.*'):
            lnum = self.find(self.dst_modules, r'.*import { configRouter } from.*')
            self.insert(self.dst_modules, lnum, self.content('page/route/import.js'))

        if not self.find(self.dst_modules, rf'.*app\.use\({self.name}Router\).*'):
            lnum = self.find(self.dst_modules, r'.*app\.use\(configRouter\).*')
            self.insert(self.dst_modules, lnum, self.content('page/route/use.js'))

        if not self.find(self.dst_modules, rf'.*import {{ {self.name}Pages }} from.*'):
            lnum = self.find(self.dst_modules, r'.*import { configPages } from.*')
            self.insert(self.dst_modules, lnum, self.content('page/page/import.js'))

        if not self.find(self.dst_modules, rf'.*await SysPage.actionRegister\({self.name}Pages\).*'):
            lnum = self.find(self.dst_modules, r'.*await SysPage.actionRegister\(configPages\).*')
            self.insert(self.dst_modules, lnum, self.content('page/page/register.js'))

    def is_valid(self):
        return True

class Pages(Templates):

    def __init__(self, env):
        super().__init__(env.templates())
        self._env = env
        self.pages = [Page(self._env, p, data) for p, data in (self._env.model.pages() or {}).items()]

    def build(self):
        result = self.validate()

        if result.get('status') != 'success':
            CLI.error(result.get('message' or 'Page validation failed'))

        for page in self.pages:
            page.build()

    def validate(self):
        return { 'status': 'success' }
