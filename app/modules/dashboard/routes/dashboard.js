
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'

import { renderFile } from '../../../tools/view.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/', checkUser, async (req, res) => {
    const page = await SysPage.getPage('dashboard')
    res.send(await renderFile('dashboard/views/index', {
        page,
        user: req.user,
        clean: req.query.c || false,
        stateKPIs: page.ctx.page.data.kpis.filter(k => k.type === 'state')
    }))
})
