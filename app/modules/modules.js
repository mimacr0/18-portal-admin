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
import { configRouter } from './base/routes/config.js'
import { expeditionsRouter } from './expeditions/routes/expeditions.js'
import { stockRouter } from './stock/routes/stock.js'
import { dashboardRouter } from './dashboard/routes/dashboard.js'
import { messagesRouter } from './messages/routes/messages.js'
import { receptionsRouter } from './receptions/routes/receptions.js'

import { configPages } from './base/data/configPages.js'
import { usersPages } from './base/data/usersPages.js'
import { expeditionsPages } from './expeditions/data/expeditionsPages.js'
import { stockPages } from './stock/data/pages.js'
import { dashboardPages } from './dashboard/data/dashboard.js'
import { messagesPages } from './messages/data/messages.js'
import { receptionsPages } from './receptions/data/receptions.js'

export const initRouters = () => {
    app.use(baseRouter)
    app.use(usersRouter)
    app.use(configRouter)
    app.use(expeditionsRouter)
    app.use(stockRouter)
    app.use(dashboardRouter)
    app.use(messagesRouter)
    app.use(receptionsRouter)
}

export const initStatic = () => {
    app.use('/static/base', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "base", "static")))
    app.use('/static/dashboard', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "dashboard", "static")))
    app.use('/static/stock', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "stock", "static")))
    app.use('/static/expeditions', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "expeditions", "static")))
    app.use('/static/messages', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "messages", "static")))
    app.use('/static/receptions', checkUserAssets, express.static(path.join(BASE_PATH, "modules", "receptions", "static")))
}

export const initDB = async () => {
    const config = await runScript('sys/conf', { format: 'yml', file: 'conf' })

    await SysUser.registerUsers(config?.data?.users || [])
    await SysPage.destroy({ where: {} })
    await SysPage.actionRegister(configPages)
    await SysPage.actionRegister(usersPages)
    await SysPage.actionRegister(expeditionsPages)
    await SysPage.actionRegister(stockPages)
    await SysPage.actionRegister(dashboardPages)
    await SysPage.actionRegister(messagesPages)
    await SysPage.actionRegister(receptionsPages)
}
