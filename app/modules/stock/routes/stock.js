import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser } from '../../../controllers/web/security.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Page } from '../../../components/layout/models/page.js'
import { renderComponent, renderModule } from '../../../tools/view.js'


export const stockRouter = express.Router()

stockRouter.get('/stock', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/stock')
    const page = new Page({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await page.render())
})

stockRouter.get('/stock/stock/list', checkUser, async (req, res) => {
    if(!req.user.portal) return res.json({
        html: await renderComponent('portal/html/_nodata', { message: req.i18n.__('No products found') })
    })

    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.stock.stock'
    })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit

    const q = req.query?.q || ''

    const rpc = pconf?.pc?.rpc || pconf?.gl?.rpc

    if(!rpc) return res.json({ status: 'error', message: req.i18n.__('Error syncing stock') })

    const erp = new WebServiceRPC(rpc)

    const result = await erp.request('stock/list', {
        q, limit, offset, user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json(result)

    const { count, rows } = result.data

    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderModule('stock/views/_items', { user: req.user, items: rows, pconf, rstyle, count, i18n: req.i18n })
    const footer = await renderComponent('cards/html/list/_footer', {
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
