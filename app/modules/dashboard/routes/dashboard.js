
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser, checkERPUser } from '../../../controllers/web/security.js'
import { sio } from '../../../controllers/web/servers.js'
import { ConfigConf } from '../../base/models/config.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Dashboard } from '../../../components/dashboard/models/dashboard.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/')
    const conf = await ConfigConf.getByKey('pages.dashboard.dashboard')
    const rpc = conf.rpc
    const page = new Dashboard({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })

    if(!rpc) return res.send(await page.render())

    const erp = new WebServiceRPC(rpc)

    const result = await erp.request('dashboard/data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.send(await page.render())

    res.send(await page.render(result.data || {}))
})

dashboardRouter.get('/assets/js/dashboard/page.js', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/')
    const page = new Dashboard({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await page.renderJS())
})

dashboardRouter.post('/dashboard/api/update', checkERPUser, async (req, res) => {
    sio.emit('dashboard expeditions update')
    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/get/charts/data', checkUser, async (req, res) => {
    const conf = await ConfigConf.getByKey('pages.dashboard.dashboard')
    const rpc = conf.rpc
    if(!rpc) return res.json({ status: 'success', data: {} })

    const erp = new WebServiceRPC(rpc)

    const result = await erp.request('dashboard/data', {
        user_id: req.user.uid,  q: 'charts'
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: req.i18n.__('Error syncing dashboard') })

    res.json({ status: 'success', data: result?.data })
})
