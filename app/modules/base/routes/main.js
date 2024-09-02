
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { KpisKpi } from '../models/main.js'

import { renderFile } from '../../../tools/view.js'


export const mainRouter = express.Router()

mainRouter.get('/', checkUser, async (req, res) => {
    res.send(await renderFile('base/ui/html/dashboard', {
        page: await SysPage.getPage('main'),
        user: req.user,
        clean: req.query.c || false,
        kpis: await KpisKpi.getKPIs('/')
    }))
})

mainRouter.get('/main/page/header/status', checkUser, async (req, res) => {
    res.json({
        status: 'success',
        data: {}
    })
})