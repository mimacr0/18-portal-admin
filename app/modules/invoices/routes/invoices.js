import express from 'express'
import { Op } from 'sequelize'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser } from '../../../controllers/web/security.js'
import { Page } from '../../../components/layout/models/page.js'
import { renderComponent, renderModule } from '../../../tools/view.js'
import { InvoiceItem } from '../models/invoices.js'


export const invoicesRouter = express.Router()

invoicesRouter.get('/invoices', checkUser, async (req, res) => {
    const page = await SysPage.getPage('invoices')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render())
})

invoicesRouter.get('/invoices/invoices/list', checkUser, async (req, res) => {
    if(!req.user.portal) return res.json({
        html: await renderComponent('portal/html/_nodata', { message: req.i18n.__('No products found') })
    })

    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.invoices.invoices'
    })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit

    const q = req.query?.q || ''

    const { count, rows } = await InvoiceItem.findAndCountAll({
        where: { user_id: req.user.id, 'data.name': { [Op.like]: '%' + q + '%' } },
        limit,
        offset
    })

    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderModule('invoices/views/_items', { user: req.user, items: rows, pconf, rstyle, count, i18n: req.i18n })
    const pager = await renderComponent('cards/html/list/_pager', {
        items: rows,
        total: count,
        totalPages, currentPage,
        limit, startPage,
        endPage,
        firstResult,
        lastResult
    })
    res.json({ html: list, pager })
})
