
import express from 'express'
import { Op } from 'sequelize'

import { KpisDashboard } from '../models/main.js'
import { checkUser } from '../../../controllers/web/security.js'
import { renderFile } from '../../../tools/view.js'
import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../models/config.js'

export const dashboardsRouter = express.Router()

dashboardsRouter.get('/dashboards', checkUser, async (req, res) => {
    res.send(await renderFile('base/ui/html/page', {
        page: await SysPage.getPage('dashboards'),
        user: req.user
    }))
})

dashboardsRouter.get('/dashboards/dashboard/list', checkUser, async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.dashboards.dashboard'
    })
    const card = await SysPage.getCard('dashboards-dashboard')
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit
    const { count, rows } = await KpisDashboard.findAndCountAll({
        where: { name: { [Op.like]: '%' + req.query.q + '%' } },
        limit,
        offset,
        order: [['createdAt', 'DESC']]
    })
    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle
    const totalPages = Math.ceil(count / limit)
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1)
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderFile('base/ui/html/pages/_list/_items', { user: req.user, items: rows, pconf, rstyle, count, card })
    const footer = await renderFile('base/ui/html/pages/_list/_footer', {
        items: rows,
        total: count,
        totalPages, currentPage,
        limit, startPage,
        endPage,
        firstResult,
        lastResult
    })
    res.json({ html: list, footer })
})

dashboardsRouter.post('/dashboards/dashboard/update/action', checkUser, async (req, res) => {
    const { id, name } = req.body
    const data = { ...req.body }
    delete data.id
    delete data.name

    const conf = data.config ? await runScript('sys/conf', { format: 'raw_yml', data: data.config }) : {}

    const rid = id || genDBID()
    const item = await KpisDashboard.findByPk(rid)
    await KpisDashboard.upsert({ id: rid, name: name, data: { ...item?.data, ...data }, conf })
    res.json({status: 'success'})
})

dashboardsRouter.post('/dashboards/dashboard/tools/sync/action', checkUser, async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        pc: 'pages.dashboards.dashboard'
    })

    for (const [key, item] of Object.entries(pconf.pc?.actions || {})) {
        const aid = genMD5(key)
        const action = await KpisDashboard.findByPk(aid)
        item.ref = key
        await KpisDashboard.upsert({ id: aid, name: item.name, data: { ...action?.data, ...item } })
    }

    res.json({ status: 'success', message: 'Action completed' })
})

dashboardsRouter.get('/dashboards/page/header/status', checkUser, async (req, res) => {
    res.json({
        status: 'success',
        data: {}
    })
})