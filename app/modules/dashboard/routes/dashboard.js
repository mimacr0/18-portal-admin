
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Dashboard } from '../../../components/dashboard/models/dashboard.js'
import { DashboardKpi } from '../models/dashboard.js'
import { Logger } from '../../../tools/log.js'
import { genDBID } from '../../../tools/sys.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/', checkUser, async (req, res) => {
    const page = await SysPage.getPage('dashboard')
    const renderer = new Dashboard({
        page,
        user: req.user,
        i18n: req.i18n
    })

    res.send(await renderer.render())
})

dashboardRouter.get('/assets/js/dashboard/page.js', checkUser, async (req, res) => {
    const page = await SysPage.getPage('dashboard')
    const kpis = await DashboardKpi.findAll({ where: { user_id: req.user.id } })
    let initSync = false
    if(kpis.length == 0) initSync = true
    const renderer = new Dashboard({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await renderer.renderJS({ initSync }))
})

dashboardRouter.get('/dashboard/init/kpi/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.portal.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading kpis' })

    Logger.debug('Dashboard KPIs:', result.data)

    for(const data of result.data) {
        const kpi = await DashboardKpi.findOne({ where: { 'data.ref': data.ref } })

        const kpiData = data?.data || {}

        delete data.data

        if(!kpi) {
            await DashboardKpi.create({ id: genDBID(), user_id: req.user.id, data, kpi: kpiData })
            continue
        }

        kpi.data = { ...kpi.data, ...data }
        kpi.kpi = { ...kpi.kpi, ...kpiData }
        kpi.user_id = req.user.id
        kpi.changed('data', true)
        kpi.changed('kpi', true)
        kpi.changed('user_id', true)
        await kpi.save()
    }

    const kpis = await DashboardKpi.findAll({ where: { user_id: req.user.id } })

    if(kpis.length == 0) return res.json({ status: 'error', message: 'No kpis found' })

    res.json({ status: 'success' })
})

// dashboardRouter.post('/dashboard/api/update', checkERPUser, async (req, res) => {
//     sio.emit('dashboard expeditions update')
//     res.json({ status: 'success', message: 'Action completed successfully' })
// })
