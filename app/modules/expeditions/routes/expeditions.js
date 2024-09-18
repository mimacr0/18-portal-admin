
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser, checkERPUser } from '../../../controllers/web/security.js'
import { expeditionsClient } from '../api/expeditions.js'

import { renderFile } from '../../../tools/view.js'


export const expeditionsRouter = express.Router()

expeditionsRouter.get('/expeditions', checkUser, async (req, res) => {
    res.send(await renderFile('expeditions/views/index', {
        page: await SysPage.getPage('expeditions'),
        user: req.user,
        iframe: req.query.iframe
    }))
})

expeditionsRouter.get('/expeditions/expeditions/list', checkUser, async (req, res) => {
    if(!req.user.portal) return res.json({
        html: await renderFile('base/ui/html/pages/_list/_nodata', { message: 'No products found' })
    })

    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.expeditions.expeditions'
    })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit

    const q = req.query?.q || ''
    const expeditions = await expeditionsClient.searchReadExpeditions(req.user, {
        limit, offset, q
    })

    if (expeditions?.status != 'success') return res.json(expeditions)

    const { count, rows } = expeditions.data

    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderFile('expeditions/views/_items', { user: req.user, items: rows, pconf, rstyle, count })
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

expeditionsRouter.post('/expeditions/erp/api/register', checkERPUser, async (req, res) => {
    res.json({ status: 'success', message: 'Registered' })
})
