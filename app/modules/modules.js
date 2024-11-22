import express from 'express'
import path from 'path'

import sysConfig from '../etc/sys.js'

import { checkUserAssets } from '../controllers/web/security.js'
import { app } from '../controllers/web/servers.js'
import { runScript } from '../tools/cli.js'

import { SysUser } from './base/models/users.js'
import { SysPage, SysMenu } from './base/models/base.js'

import { baseRouter } from './base/routes/base.js'
import { apiRouter } from './base/routes/api.js'
import { usersRouter } from './base/routes/users.js'
import { configRouter } from './base/routes/config.js'
import { expeditionsRouter } from './expeditions/routes/expeditions.js'
import { mainRouter } from './base/routes/main.js'
import { stockRouter } from './stock/routes/stock.js'
import { repairsRouter } from './repairs/routes/repairs.js'
import { storageRouter } from './storage/routes/storage.js'
import { sparePartsRouter } from './spareparts/routes/spareparts.js'
import { invoicesRouter } from './invoices/routes/invoices.js'
import { dashboardRouter } from './dashboard/routes/dashboard.js'
import { messagesRouter } from './messages/routes/messages.js'
import { receptionsRouter } from './receptions/routes/receptions.js'
import { keysRouter } from './base/routes/keys.js'

import { configPages } from './base/data/config.js'
import { usersPages } from './base/data/users.js'
import { expeditionsPages, expeditionsMenus } from './expeditions/data/expeditions.js'
import { stockPages, stockMenus } from './stock/data/pages.js'
import { dashboardPages, dashboardMenus } from './dashboard/data/dashboard.js'
import { messagesPages, messagesMenu } from './messages/data/messages.js'
import { receptionsPages, receptionsMenus } from './receptions/data/receptions.js'
import { storagePages, storageMenus } from './storage/data/pages.js'
import { repairsPages, repairsMenus } from './repairs/data/pages.js'
import { sparepartsPages, sparepartsMenus } from './spareparts/data/pages.js'
import { invoicesPages, invoicesMenus } from './invoices/data/pages.js'
import { keysPages } from './base/data/keys.js'
import { basePages } from './base/data/base.js'

import { dashboardRegisterListeners } from './dashboard/listeners/register.js'


export const initRouters = () => {
    app.use(baseRouter)
    app.use(usersRouter)
    app.use(configRouter)
    app.use(expeditionsRouter)
    app.use(repairsRouter)
    app.use(stockRouter)
    app.use(storageRouter)
    app.use(invoicesRouter)
    app.use(sparePartsRouter)
    app.use(dashboardRouter)
    app.use(messagesRouter)
    app.use(receptionsRouter)
    app.use(keysRouter)
    app.use(apiRouter)

    if (!app._router.stack.some(layer => layer.route && layer.route.path === '/'))
        app.use(mainRouter)

    app.use((req, res) => {
        res.redirect('/pages/404')
    })

}

export const initStatic = () => {
    app.use('/static/dashboard', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "dashboard", "static")))
    app.use('/static/base', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "base", "static")))
    app.use('/static/stock', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "stock", "static")))
    app.use('/static/expeditions', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "expeditions", "static")))
    app.use('/static/repairs', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "repairs", "static")))
    app.use('/static/messages', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "messages", "static")))
    app.use('/static/receptions', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "receptions", "static")))
    app.use('/static/storage', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "storage", "static")))
    app.use('/static/spareparts', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "spareparts", "static")))
    app.use('/static/invoices', checkUserAssets, express.static(path.join(sysConfig.BASE_PATH, "modules", "invoices", "static")))
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
    await SysPage.actionRegister(basePages)
    await SysPage.actionRegister(storagePages)
    await SysPage.actionRegister(repairsPages)
    await SysPage.actionRegister(sparepartsPages)
    await SysPage.actionRegister(invoicesPages)
}

const initMenus = async () => {
    await SysMenu.destroy({ where: {} })
    await SysMenu.actionRegister(dashboardMenus)
    await SysMenu.actionRegister(expeditionsMenus)
    await SysMenu.actionRegister(receptionsMenus)
    await SysMenu.actionRegister(stockMenus)
    await SysMenu.actionRegister(messagesMenu)
    await SysMenu.actionRegister(storageMenus)
    await SysMenu.actionRegister(repairsMenus)
    await SysMenu.actionRegister(sparepartsMenus)
    await SysMenu.actionRegister(invoicesMenus)
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
    initStatic()
    initRouters()
    initMenus()
    initPages()
    initUsers()
}
