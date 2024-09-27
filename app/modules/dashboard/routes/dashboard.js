
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser, checkERPUser } from '../../../controllers/web/security.js'
import { sio } from '../../../controllers/web/server.js'
import { dashboardClient } from '../api/dashboard.js'

import { renderFile } from '../../../tools/view.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/', checkUser, async (req, res) => {
    const page = await SysPage.getPage('dashboard', req.user)
    const data = await dashboardClient.readDashboardsData({
        user_id: req.user.uid
    })

    res.send(await renderFile('dashboard/views/index', {
        page,
        user: req.user,
        clean: req.query.c || false,
        data: data?.data || {}
    }))
})

dashboardRouter.post('/dashboard/api/update', checkERPUser, async (req, res) => {
    sio.emit('dashboard expeditions update')
    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/get/charts/data', checkUser, async (req, res) => {
    const result = await dashboardClient.readDashboardsData({
        user_id: req.user.uid, q: 'charts'
    })
    res.json({ status: 'success', data: result?.data })
})
