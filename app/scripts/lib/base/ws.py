
import json
import random
import urllib.request
import xmlrpc.client

from .cli import CLI

headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}

def json_rpc(url, method, params):
    data = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": random.randint(0, 1000000000),
    }
    req = urllib.request.Request(url=url, data=json.dumps(data).encode(), headers={
        "Content-Type":"application/json",
    })
    reply = json.loads(urllib.request.urlopen(req).read().decode('UTF-8'))
    if reply.get("error"):
        raise Exception(reply["error"])
    return reply["result"]

class JWS(object):

    def __init__(self, conf):
        self.url = f"""{conf.get('url').rstrip('/')}/jsonrpc"""
        self.db = conf.get('db')
        self.user = conf.get('user')
        self.password = conf.get('pass')
        self.uid = False
        self.type = 'json'

        try:
            self.uid = self.common_call("login")
        except Exception as e:
            CLI.error(e)

    def common_call(self, method, *options):
        args = [self.db, self.user, self.password] + list(options)
        return json_rpc(self.url, "call", {"service": "common", "method": method, "args": args})

    def object_call(self, model, action, *options):
        args = [self.db, self.uid, self.password, model, action] + list(options)
        return json_rpc(self.url, "call", {
            "service": "object",
            "method": "execute",
            "args": args
        })

    def create(self, model, *options):
        return self.object_call(model, 'create', list(options))

    def search(self, model, *options):
        return self.object_call(model, 'search', list(options))

    def search_read(self, model, *options):
        return self.object_call(model, 'search_read', list(options))

    def read(self, model, *options):
        return self.object_call(model, 'read', list(options))

    def update(self, model, ids, values):
        if not isinstance(ids, list):
            ids = [ids]
        return self.object_call(model, 'write', [ids, values])

    def unlink(self, model, ids):
        if not isinstance(ids, list):
            ids = [ids]
        return self.object_call(model, 'unlink', [ids])

    def model_fields(self, model):

        result = {}

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return CLI.error(f"""MODEL NOT FOUND {model}""")

        for field in self.search_read('ir.model.fields', [('model_id', '=', model_ids[0])]):

            if field['name'] == 'id':
                continue

            result[field['name']] = field

        return result

    def ref(self, ref):
        module, name = ref.split('.')
        res = self.search_read('ir.model.data', [
            ('module', '=', module),
            ('name', '=', name)
        ])

        return res and res[0]['res_id']

    def gref(self, model, item_id):
        res = self.search_read('ir.model.data', [
            ('model', '=', model),
            ('res_id', '=', item_id)
        ])

        return res and '{}.{}'.format(res[0]['module'], res[0]['name'])

    def cref(self, model, item_id, ref):

        if not self.search(model, [('id', '=', item_id)]):
            return False

        cref = self.gref(model, item_id)

        if cref:
            return cref

        cref = self.ref(ref)

        if cref:
            return ref

        module, name = ref.split('.')
        self.create('ir.model.data', {
            'module': module,
            'name': name,
            'model': model,
            'res_id': item_id
        })

        return self.gref(model, item_id)

    def add_src_id(self, model):

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return

        field_ids = self.search('ir.model.fields', [('name', '=', 'x_pgmx_migrate_src_id'), ('model_id', '=', model_ids[0])])

        if field_ids:
            return

        self.create('ir.model.fields', {
            'name': 'x_pgmx_migrate_src_id',
            'field_description': 'PGMX MIGRATE SRC ID',
            'model_id': model_ids[0],
            'ttype': 'integer'
        })

        return True

    def remove_src_id(self, model):

        if 'src' in self.name:
            return CLI.error(f"""INVALID WS: {self.name}""")

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return

        field_ids = self.search('ir.model.fields', [('name', '=', 'x_pgmx_migrate_src_id'), ('model_id', '=', model_ids[0])])

        self.unlink('ir.model.fields', field_ids)

        return True

class WS(object):

    def __init__(self,  conf):
        self.url = conf.get('url')
        self.username = conf.get('user')
        self.password = conf.get('pass')
        self.db = conf.get('db')
        self._common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(self.url))
        self._models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(self.url))
        self.uid = False

        try:
            self.uid = self._common.authenticate(self.db, self.username, self.password, {})
        except Exception as e:
            CLI.error(e)

    def search(self, model, domain = [], options = {}):
        return self._models.execute_kw(self.db, self.uid, self.password, model, 'search', [domain], options)

    def search_read(self, model, domain = [], options = {}):
        return self._models.execute_kw(self.db, self.uid, self.password, model, 'search_read', [domain], options)

    def create(self, model, values = {}):
        return self._models.execute_kw(self.db, self.uid, self.password, model, 'create', [values])

    def call(self, model, method, values=[]):
        return self._models.execute_kw(self.db, self.uid, self.password, model, method, values)

    def update(self, model, oid, values = {}):
        return self._models.execute_kw(self.db, self.uid, self.password, model, 'write', [[oid], values])

    def unlink(self, model, ids):
        if not isinstance(ids, list):
            ids = [ids]
        return self._models.execute_kw(self.db, self.uid, self.password, model, 'unlink', [ids])

    def read(self, model, ids, options = {}):
        if not isinstance(ids, list):
            ids = [ids]

        return self._models.execute_kw(self.db, self.uid, self.password, model, 'read', [ids], options)

    def find_ref(self, ref):
        module, name = ref.split('.')
        res = self.search_read('ir.model.data', [
            ('module', '=', module),
            ('name', '=', name)
        ])

        return res and res[0]['res_id']

    def get_ref(self, model, item_id):
        res = self.search_read('ir.model.data', [
            ('model', '=', model),
            ('res_id', '=', item_id)
        ])

        return res and '{}.{}'.format(res[0]['module'], res[0]['name'])

    def add_src_id(self, model):

        if 'src' in self.name:
            return CLI.error(f"""INVALID WS: {self.name}""")

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return

        self.create('ir.model.fields', {
            'name': 'x_pgmx_migrate_src_id',
            'field_description': 'PGMX MIGRATE SRC ID',
            'model_id': model_ids[0],
            'ttype': 'integer'
        })

        return True

    def remove_src_id(self, model):

        if 'src' in self.name:
            return CLI.error(f"""INVALID WS: {self.name}""")

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return

        field_ids = self.search('ir.model.fields', [('name', '=', 'x_pgmx_migrate_src_id'), ('model_id', '=', model_ids[0])])

        self.unlink('ir.model.fields', field_ids)

        return True

    def model_fields(self, model):

        result = {}

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return CLI.error(f"""MODEL NOT FOUND {model}""")

        for field in self.search_read('ir.model.fields', [('model_id', '=', model_ids[0])]):

            if field['name'] == 'id':
                continue

            result[field['name']] = field

        return result