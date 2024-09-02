import express from 'express'
import path from 'path'

import { checkUserAssets } from '../controllers/web/security.js'
import { app } from '../controllers/web/server.js'
import { BASE_PATH } from '../etc/sys.js'
import { runScript } from '../tools/cli.js'

import { SysUser } from './base/models/users.js'
import { SysPage } from './base/models/base.js'

import { baseRouter } from './base/routes/base.js'
import { usersRouter } from './base/routes/users.js'
import { mainRouter } from './base/routes/main.js'
import { configRouter } from './base/routes/config.js'
import { dashboardsRouter } from './base/routes/dashboards.js'

import { mainPages } from './base/data/mainPages.js'
import { configPages } from './base/data/configPages.js'
import { usersPages } from './base/data/usersPages.js'

export const initRouters = () => {
    app.use(baseRouter)
    app.use(mainRouter)
    app.use(usersRouter)
    app.use(configRouter)
    app.use(dashboardsRouter)
}

export const initStatic = () => {
    app.use('/static/base', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "base", "static")))
}

export const initDB = async () => {
    const config = await runScript('sys/conf', { format: 'yml', file: 'conf' })

    await SysUser.registerUsers(config?.data?.users || [])
    await SysPage.actionRegister(mainPages)
    await SysPage.actionRegister(configPages)
    await SysPage.actionRegister(usersPages)
}
