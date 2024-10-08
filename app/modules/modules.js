import express from 'express'
import path from 'path'

import sysConfig from '../etc/sys.js'

import { checkUserAssets } from '../controllers/web/security.js'
import { app } from '../controllers/web/servers.js'
import { runScript } from '../tools/cli.js'

import { SysUser } from './base/models/users.js'
import { SysPage } from './base/models/base.js'

import { baseRouter } from './base/routes/base.js'
import { usersRouter } from './base/routes/users.js'
import { configRouter } from './base/routes/config.js'
import { expeditionsRouter } from './expeditions/routes/expeditions.js'
import { mainRouter } from './base/routes/main.js'
import { stockRouter } from './stock/routes/stock.js'
import { dashboardRouter } from './dashboard/routes/dashboard.js'
import { messagesRouter } from './messages/routes/messages.js'
import { receptionsRouter } from './receptions/routes/receptions.js'
import { keysRouter } from './base/routes/keys.js'

import { configPages } from './base/data/config.js'
import { usersPages } from './base/data/users.js'
import { expeditionsPages } from './expeditions/data/expeditions.js'
import { stockPages } from './stock/data/pages.js'
import { dashboardPages } from './dashboard/data/dashboard.js'
import { messagesPages } from './messages/data/messages.js'
import { receptionsPages } from './receptions/data/receptions.js'
import { keysPages } from './base/data/keys.js'

import { dashboardRegisterListeners } from './dashboard/listeners/register.js'


export const initRouters = () => {
    app.use(baseRouter)
    app.use(usersRouter)
    app.use(configRouter)
    app.use(expeditionsRouter)
    app.use(stockRouter)
    app.use(dashboardRouter)
    app.use(messagesRouter)
    app.use(receptionsRouter)
    app.use(keysRouter)

    if (!app._router.stack.some(layer => layer.route && layer.route.path === '/'))
        app.use(mainRouter)
}

export const initStatic = () => {
    app.use('/static/base', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "base", "static")))
    // app.use('/static/dashboard', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "dashboard", "static")))
    app.use('/static/stock', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "stock", "static")))
    app.use('/static/expeditions', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "expeditions", "static")))
    app.use('/static/messages', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "messages", "static")))
    app.use('/static/receptions', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "receptions", "static")))
}

const initPages = async () => {
    await SysPage.destroy({ where: {} })
    await SysPage.actionRegister(configPages)
    await SysPage.actionRegister(usersPages)
    await SysPage.actionRegister(expeditionsPages)
    await SysPage.actionRegister(stockPages)
    await SysPage.actionRegister(dashboardPages)
    await SysPage.actionRegister(messagesPages)
    await SysPage.actionRegister(receptionsPages)
    await SysPage.actionRegister(keysPages)
}

const initUsers = async () => {
    const config = await runScript('sys/conf', { format: 'yml', file: 'conf' })
    await SysUser.registerUsers(config?.data?.users || [])
}

export const initListeners = async () => {
    await dashboardRegisterListeners()
}

export const initModules = async () => {
    initListeners()
    initRouters()
    initPages()
    initUsers()

    initStatic()
}
