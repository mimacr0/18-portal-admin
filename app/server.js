import sysConfig from './etc/sys.js'

if(!sysConfig.BASE_PATH) {
    console.error('ERROR: Required config (BASE_PATH) not defined in .env file!')
    process.exit(0);
}

if(!sysConfig.SECRET) {
    console.error('ERROR: Required config (SECRET) not defined in .env file!')
    process.exit(0);
}

if(!sysConfig.RPC_API_SECRET) {
    console.error('ERROR: Required config (RPC_API_SECRET) not defined in .env file!')
    process.exit(0);
}

import { initDatabases } from './controllers/db/db.js'
import { initServers } from './controllers/web/servers.js'
import { initModules } from './modules/modules.js'

initDatabases().then(() => {
    initModules()
})
initServers()

