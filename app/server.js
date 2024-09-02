import path from 'path'
import { config } from 'dotenv'
import { existsSync } from 'fs'

import { Logger } from './tools/log.js'
import { BASE_PATH } from './etc/sys.js'

config({ path: path.join(BASE_PATH, '.env') })

import { dataDB } from './controllers/db/db.js'
import { server } from "./controllers/web/server.js"
import { initRouters, initStatic, initDB } from './modules/modules.js'

if(!process.env?.BASE_PATH) {
    console.error('ERROR: Required config (BASE_PATH) not defined in .env file!')
    process.exit(0);
}

if(!process.env?.SECRET) {
    console.error('ERROR: Required config (SECRET) not defined in .env file!')
    process.exit(0);
}

dataDB.sync()
.then(async () => { await initDB() })
.then(() => Logger.debug('DATA DB is ready!'))

initRouters()
initStatic()

const port = process.env.PORT || 3000

server.listen(port, () => {
    Logger.debug(`Server running on ${process.env?.BASE_URL || 'https://localhost:' + port}`)
})
