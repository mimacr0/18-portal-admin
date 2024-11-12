
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser } from '../../../controllers/web/security.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Page } from '../../../components/layout/models/page.js'
import { renderComponent, renderModule } from '../../../tools/view.js'
import { genMD5 } from '../../../tools/sys.js'
import { ExpeditionItem } from '../models/expeditions.js'


export const expeditionsRouter = express.Router()

expeditionsRouter.get('/expeditions', checkUser, async (req, res) => {
    const page = await SysPage.getPage('expeditions')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render())
})

expeditionsRouter.get('/expeditions/expeditions/list', checkUser, async (req, res) => {
    if(!req.user.portal) return res.json({
        html: await renderComponent('portal/html/_nodata', { message: req.i18n.__('No products found') })
    })

    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.expeditions.expeditions'
    })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit

    const q = req.query?.q || ''

    const rpc = pconf?.pc?.rpc || pconf?.gl?.rpc

    const totalCount = await ExpeditionItem.count({ where: { user_id: req.user.id } })

    if(totalCount == 0) {

        const erp = new WebServiceRPC('pages.expeditions.expeditions')

        const result = await erp.request('expeditions/list', {
            user_id: req.user.uid
        })

        if(result?.status !== 'success') return res.json(result)
        else await ExpeditionItem.bulkCreate(result.data.map(row => {
            return {
                id: genMD5(row.id.toString()),
                data: row,
                user_id: req.user.id
            }
        }))

    }

    const { count, rows } = await ExpeditionItem.findAndCountAll({
        where: { user_id: req.user.id },
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
    const list = await renderModule('expeditions/views/_items', { user: req.user, items: rows, pconf, rstyle, count, i18n: req.i18n })
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

expeditionsRouter.get('/expeditions/create/account/data', checkUser, async (req, res) => {
    const erp = new WebServiceRPC('pages.expeditions.expeditions')

    const result = await erp.request('expeditions/shipping/data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json(result)

    res.json({ status: 'success', accounts: result.data.accounts, countries: result.data.countries })
})

expeditionsRouter.post('/expeditions/create/account/shipping/data', checkUser, async (req, res) => {
    const { account_id } = req.body

    const erp = new WebServiceRPC('pages.expeditions.expeditions')

    const result = await erp.request('expeditions/shipping/address/data', {
        user_id: req.user.uid, account_id
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

expeditionsRouter.post('/expeditions/create/account/zip/find', checkUser, async (req, res) => {
    const { account_id, zip } = req.body

    const erp = new WebServiceRPC('pages.expeditions.expeditions')

    const result = await erp.request('expeditions/zip/find', {
        user_id: req.user.uid, account_id, q: zip
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

expeditionsRouter.post('/expeditions/create/account/zip/data', checkUser, async (req, res) => {
    const { account_id, zip } = req.body

    const erp = new WebServiceRPC('pages.expeditions.expeditions')

    const result = await erp.request('expeditions/zip/data', {
        user_id: req.user.uid, account_id, q: zip.toString()
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

expeditionsRouter.post('/expeditions/create/account/address/save', checkUser, async (req, res) => {
    const {
        contact_name,
        contact_email,
        contact_street,
        contact_phone,
        contact_city_id,
        contact_state_id,
        contact_zip,
        zip_id,
        contact_country_id } = req.body

    const erp = new WebServiceRPC('pages.expeditions.expeditions')

    const result = await erp.request('expeditions/shipping/create', {
        user_id: req.user.uid,
        contact_name,
        contact_email,
        contact_street,
        contact_phone,
        contact_city_id,
        contact_state_id,
        contact_zip,
        zip_id,
        contact_country_id
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: { partner_id: result.partner_id }})
})

expeditionsRouter.post('/expeditions/create/expedition/create', checkUser, async (req, res) => {
    const { client_account_id, shipping_adddress_id, id } = req.body

    const erp = new WebServiceRPC('pages.expeditions.expeditions')

    const result = await erp.request('expeditions/expedition/create', {
        user_id: req.user.uid,
        client_account_id,
        shipping_adddress_id,
        ids: id.split(',')
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', message: `Expedition ${result.data.name} created successfully` })
})

expeditionsRouter.post('/portal/customer/after/sales/create', checkUser, async (req, res) => {
    const { id } = req.body
    const data = req.body
    delete data.id

    res.json({ status: 'success' })
})

expeditionsRouter.post('/portal/customer/after/sales/update', checkUser, async (req, res) => {
    const { id } = req.body
    const data = req.body
    delete data.id

    res.json({ status: 'success' })
})
