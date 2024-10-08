
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { sio } from '../../../controllers/web/servers.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Dashboard } from '../../../components/dashboard/models/dashboard.js'
import { Logger } from '../../../tools/log.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/')
    const page = new Dashboard({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })

    const kpis = await page.getKPIs()
    const unload = kpis.find(k => Object.keys(k.data).length == 0)

    if(unload) {

        const erp = new WebServiceRPC('pages.dashboard.dashboard')

        const result = await erp.request('dashboard/data', {
            user_id: req.user.uid
        })

        const defaultColors = ['#20c997', '#ffc107', '#ff0000']
        const expeditionsChart = kpis.find(k => k.ref == 'PORTAL_EXPEDITIONS_CHART')
        const receptionsChart = kpis.find(k => k.ref == 'PORTAL_RECEPTIONS_CHART')
        const expeditionsChartPie = kpis.find(k => k.ref == 'PORTAL_EXPEDITIONS_CHART_PIE')
        const receptionsChartPie = kpis.find(k => k.ref == 'PORTAL_RECEPTIONS_CHART_PIE')
        const updates = {
            EXPEDITIONS_STATUS_KPI: {
                value: result?.data?.count?.expeditions_count
            },
            RECEPTIONS_STATUS_KPI: {
                value: result?.data?.count?.receptions_count
            },
            STOCK_STATUS_KPI: {
                value: result?.data?.count?.stock_count
            },
            STORAGE_STATUS_KPI: {
                value: result?.data?.count?.locations_count
            },
            REPAIRS_STATUS_KPI: {
                value: result?.data?.count?.repairs_count
            },
            SPARE_PARTS_STATUS_KPI: {
                value: result?.data?.count?.spareparts_count
            },
            PORTAL_EXPEDITIONS_CHART: {
                ...result?.data?.charts?.expeditions_data,
                colors: expeditionsChart.conf?.colors || defaultColors
            },
            PORTAL_RECEPTIONS_CHART: {
                ...result?.data?.charts?.receptions_data,
                colors: receptionsChart.conf?.colors || defaultColors
            },
            PORTAL_EXPEDITIONS_CHART_PIE: {
                ...result?.data?.charts?.expeditions,
                colors: expeditionsChartPie.conf?.colors || defaultColors
            },
            PORTAL_RECEPTIONS_CHART_PIE: {
                ...result?.data?.charts?.receptions,
                colors: receptionsChartPie.conf?.colors || defaultColors
            }
        }

        if(result?.status !== 'success') Logger.error(result)
        else await page.updateKPIs(updates)

    }

    res.send(await page.render())
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

// dashboardRouter.post('/dashboard/api/update', checkERPUser, async (req, res) => {
//     sio.emit('dashboard expeditions update')
//     res.json({ status: 'success', message: 'Action completed successfully' })
// })

