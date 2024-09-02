
import json
import random
import urllib.request
import xmlrpc.client

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
    return "result" in reply and reply["result"]

class JWS(object):

    def __init__(self, conf):
        self.conf = conf
        self.url = f"""{conf.get('url').rstrip('/')}/jsonrpc"""
        self.db = conf.get('db')
        self.user = conf.get('user')
        self.password = conf.get('pass')
        self.uid = False
        self.type = 'json'
        self.uid = self.common_call("login")

    def common_call(self, method, *options):
        args = [self.db, self.user, self.password] + list(options)
        return json_rpc(self.url, "call", {"service": "common", "method": method, "args": args})

    def object_call(self, model, action, options):
        args = [self.db, self.uid, self.password, model, action] + options
        return json_rpc(self.url, "call", {
            "service": "object",
            "method": "execute",
            "args": args
        })

    def get_model(self, model):
        return JWSModel(self, model)

    def ref(self, ref):

        if not ref:
            return False

        module, name = ref.split('.')
        model = self.get_model('ir.model.data')
        res = model.search_read([
            ('module', '=', module),
            ('name', '=', name)
        ])

        return res and res[0]['res_id']

    def gref(self, model, item_id):
        model = self.get_model('ir.model.data')
        res = model.search_read([
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

        model_ids = self.search('ir.model', [('model', '=', model)])

        if not model_ids:
            return

        field_ids = self.search('ir.model.fields', [('name', '=', 'x_pgmx_migrate_src_id'), ('model_id', '=', model_ids[0])])

        self.unlink('ir.model.fields', field_ids)

        return True

    def is_installed(self, *modules):

        result = {}

        for module in modules:
            module_ids = self.search('ir.module.module', [('name', '=', module), ('state', '=', 'installed')])
            result[module] = module_ids and module_ids[0]

        return result

class JWSModel(object):

    def __init__(self, ws, model):
        self.ws = ws
        self.model = model

    def call(self, method, *options):
        return self.ws.object_call(self.model, method, list(options))

    def create(self, *options):
        return self.ws.object_call(self.model, 'create', list(options))

    def search(self, *options):
        return self.ws.object_call(self.model, 'search', list(options))

    def search_read(self, *options):
        return self.ws.object_call(self.model, 'search_read', list(options))

    def call(self, method, *options):
        return self.object_call(self.model, method, list(options))

    def create(self, *options):
        return self.object_call(self.model, 'create', list(options))

    def search(self, *options):
        return self.object_call(self.model, 'search', list(options))

    def search_read(self, *options):
        return self.object_call(self.model, 'search_read', list(options))

    def read(self, *options):
        return self.object_call(self.model, 'read', list(options))

    def update(self, ids, values):
        if not isinstance(ids, list):
            ids = [ids]
        return self.object_call(self.model, 'write', [ids, values])

    def unlink(self, ids):
        if not isinstance(ids, list):
            ids = [ids]
        return self.object_call(self.model, 'unlink', [ids])

    def model_fields(self):

        models = self.ws.get_model('ir.model')
        model_fields = self.ws.get_model('ir.model.fields')
        model_ids = models.search([('model', '=', self.model)])

        if not model_ids:
            return { 'status': 'error', 'message': f"""MODEL NOT FOUND {self.model}""" }

        result = {}

        for field in model_fields.search_read([('model_id', '=', model_ids[0])]):

            if field['name'] == 'id':
                continue

            result[field['name']] = field

        return { 'status': 'success', 'data': result }


class WS(object):

    def __init__(self,  conf):
        self.conf = conf
        self.url = conf.get('url')
        self.username = conf.get('user')
        self.password = conf.get('pass')
        self.db = conf.get('db')
        self._common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(self.url))
        self._models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(self.url))
        self.uid = self._common.authenticate(self.db, self.username, self.password, {})

    def get_model(self, model):
        return WSModel(self, model)

    def ref(self, ref):
        module, name = ref.split('.')
        model = self.get_model('ir.model.data')
        res = model.search_read([
            ('module', '=', module),
            ('name', '=', name)
        ])

        return res and res[0]['res_id']

    def gref(self, model, item_id):
        model_table = self.get_model('ir.model.data')
        res = model_table.search_read([
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

    def is_installed(self, *modules):

        result = {}

        modules_model = self.get_model('ir.module.module')

        for module in modules:
            module_ids = modules_model.search([('name', '=', module), ('state', '=', 'installed')])
            result[module] = module_ids and module_ids[0] or False

        return result

class WSModel(object):

    def __init__(self, ws, model):
        self.ws = ws
        self.model = model

    def search(self, domain = [], options = {}):
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'search', [domain], options)

    def search_count(self, domain = [], options = {}):
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'search_count', [domain], options)

    def search_read(self, domain = [], options = {}):
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'search_read', [domain], options)

    def create(self, values = {}):
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'create', [values])

    def call(self, method, values=[]):
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, method, values)

    def update(self, oid, values = {}):
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'write', [[oid], values])

    def unlink(self, ids):
        if not isinstance(ids, list):
            ids = [ids]
        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'unlink', [ids])

    def read(self, ids, options = {}):
        if not isinstance(ids, list):
            ids = [ids]

        return self.ws._models.execute_kw(self.ws.db, self.ws.uid, self.ws.password, self.model, 'read', [ids], options)

    def model_fields(self):

        result = {}
        models = self.ws.get_model('ir.model')
        model_fields = self.ws.get_model('ir.model.fields')

        model_ids = models.search([('model', '=', self.model)])

        if not model_ids:
            return { 'status': 'error', 'message': f'Model {self.model} not found' }

        for field in model_fields.search_read([('model_id', '=', model_ids[0])]):

            if field['name'] == 'id':
                continue

            result[field['name']] = field

        return { 'status': 'success', 'data': result }
