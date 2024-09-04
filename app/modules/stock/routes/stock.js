import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser } from '../../../controllers/web/security.js'
import { erpConn } from '../../../controllers/conn/erp.js'

import { renderFile } from '../../../tools/view.js'


export const stockRouter = express.Router()

stockRouter.get('/stock', checkUser, async (req, res) => {
    res.send(await renderFile('stock/views/index', {
        page: await SysPage.getPage('stock'),
        user: req.user,
        iframe: req.query.iframe
    }))
})

stockRouter.get('/stock/stock/list', checkUser, async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.stock.stock'
    })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit
    const result = await erpConn.getStock()
    const rows = result?.result?.data || []
    const count = rows.length

    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderFile('stock/views/_items', { user: req.user, items: rows, pconf, rstyle, count })
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
