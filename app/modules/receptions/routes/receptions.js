
import express from 'express'
import { Op } from 'sequelize'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser } from '../../../controllers/web/security.js'
import { StockReception } from '../models/receptions.js'
import { Page } from '../../../components/layout/models/page.js'
import { ClientAccount } from '../../base/models/base.js'
import { ResPartnerUser } from '../../base/models/base.js'
import { renderComponent, renderModule } from '../../../tools/view.js'


export const receptionsRouter = express.Router()

receptionsRouter.get('/receptions', checkUser, async (req, res) => {
    const page = await SysPage.getPage('receptions')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render())
})

receptionsRouter.get('/receptions/receptions/list', checkUser, async (req, res) => {
    if(!req.user.portal) return res.json({
        html: await renderComponent('portal/html/_nodata', { message: req.i18n.__('No products found') })
    })

    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.receptions.receptions'
    })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit

    const q = req.query?.q || ''

    const { count, rows } = await StockReception.findAndCountAll({
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
    const list = await renderModule('receptions/views/_items', { user: req.user, items: rows, pconf, rstyle, count, i18n: req.i18n })
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

receptionsRouter.get('/receptions/create', checkUser, async (req, res) => {
    const page = await SysPage.getPage('receptions-create')
    const accountItems = await ClientAccount.findAll({ where: { user_id: req.user.id } })
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render({ accountItems }))
})

receptionsRouter.get('/receptions/create/account/data', checkUser, async (req, res) => {
    const receptions = await receptionsClient.getreceptionsData({ user_id: req.user.uid })

    if (receptions?.status != 'success') return res.json(receptions)

    res.json({ status: 'success', accounts: receptions.data.accounts, countries: receptions.data.countries })
})

receptionsRouter.post('/receptions/create/account/shipping/data', checkUser, async (req, res) => {
    const { account_id } = req.body
    const result = await receptionsClient.getreceptionsShippingData({
        user_id: req.user.uid,
        account_id
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

receptionsRouter.post('/receptions/create/account/zip/find', checkUser, async (req, res) => {
    const { account_id, zip } = req.body
    const result = await receptionsClient.getreceptionsZipCodeData({
        user_id: req.user.uid,
        account_id,
        q: zip
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

receptionsRouter.post('/receptions/create/account/zip/data', checkUser, async (req, res) => {
    const { zip } = req.body
    const result = await receptionsClient.getreceptionsZipData({
        user_id: req.user.uid,
        q: zip.toString()
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

receptionsRouter.post('/receptions/create/account/address/save', checkUser, async (req, res) => {
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

    const result = await receptionsClient.receptionsRegisterShippingAddress({
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

    res.json({ status: 'success', data: result.data })
})

receptionsRouter.post('/receptions/create/reception/create', checkUser, async (req, res) => {
    const { client_account_id, shipping_adddress_id, id } = req.body

    const result = await receptionsClient.receptionsShippingCreate({
        user_id: req.user.uid,
        client_account_id,
        shipping_adddress_id,
        ids: id.split(',')
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', message: `reception ${result.data.name} created successfully` })
})

receptionsRouter.get('/receptions/details/:id', checkUser, async (req, res) => {
    const item = await StockReception.findOne({ where: { id: req.params.id } })
    if(!item) return res.redirect('/pages/404')

    let contact = null

    if(item.userId) contact = await ResPartnerUser.findOne({ where: { 'data.id': item.userId.partner_id } })
    const page = await SysPage.getPage('receptions-details')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render({ reception: item, contact }))
})