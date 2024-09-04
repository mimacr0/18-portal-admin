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
import { expeditionsRouter } from './expeditions/routes/expeditions.js'
import { stockRouter } from './stock/routes/stock.js'

import { mainPages } from './base/data/mainPages.js'
import { configPages } from './base/data/configPages.js'
import { usersPages } from './base/data/usersPages.js'
import { expeditionsPages } from './expeditions/data/expeditionsPages.js'
import { stockPages } from './stock/data/pages.js'

export const initRouters = () => {
    app.use(baseRouter)
    app.use(mainRouter)
    app.use(usersRouter)
    app.use(configRouter)
    app.use(expeditionsRouter)
    app.use(stockRouter)
}

export const initStatic = () => {
    app.use('/static/base', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "base", "static")))
    app.use('/static/stock', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "stock", "static")))
}

export const initDB = async () => {
    const config = await runScript('sys/conf', { format: 'yml', file: 'conf' })

    await SysUser.registerUsers(config?.data?.users || [])
    await SysPage.destroy({ where: {} })
    await SysPage.actionRegister(mainPages)
    await SysPage.actionRegister(configPages)
    await SysPage.actionRegister(usersPages)
    await SysPage.actionRegister(expeditionsPages)
    await SysPage.actionRegister(stockPages)
}
