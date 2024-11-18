
import express from 'express'
import { Op } from 'sequelize'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser } from '../../../controllers/web/security.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Page } from '../../../components/layout/models/page.js'
import { renderComponent, renderModule } from '../../../tools/view.js'
import { PartnerShipping } from '../models/expeditions.js'
import { ClientAccount } from '../../base/models/base.js'
import { ExpeditionItem } from '../models/expeditions.js'
import { Logger } from '../../../tools/log.js'
import { genDBID } from '../../../tools/sys.js'
import { StockItem } from '../../stock/models/stock.js'
import { ResCountry, ResCountryState, ResCountryZip } from '../../base/models/base.js'


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

    const { count, rows } = await ExpeditionItem.findAndCountAll({
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
    const list = await renderModule('expeditions/views/_items', { user: req.user, items: rows, pconf, rstyle, count, i18n: req.i18n })
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

expeditionsRouter.post('/expeditions/create/account/zip/data', checkUser, async (req, res) => {
    const { zip: zip_id } = req.body

    const zip = await ResCountryZip.findByPk(zip_id)

    res.json({
        status: 'success',
        data: {
            countryId: zip.country_id,
            stateId: zip.state_id,
            zip: zip.name,
            city: zip.city
        }
    })
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

expeditionsRouter.get('/expeditions/details/:id', checkUser, async (req, res) => {
    const item = await ExpeditionItem.findOne({ where: { id: req.params.id } })
    if(!item) return res.redirect('/pages/404')
    const page = await SysPage.getPage('expeditions-details')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render())
})

expeditionsRouter.get('/expeditions/create', checkUser, async (req, res) => {
    const page = await SysPage.getPage('expeditions-create')
    const shippingItems = await PartnerShipping.findAll({ where: { user_id: req.user.id } })
    const accountItems = await ClientAccount.findAll({ where: { user_id: req.user.id } })
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render({ shippingItems, accountItems }))
})

expeditionsRouter.get('/expeditions/countries/list', checkUser, async (req, res) => {
    const countries = await ResCountry.findAll({})
    res.json({ status: 'success', data: await renderComponent('forms/html/fields/_options', { items: countries, null_opt: 'Select country ...' }) })
})

expeditionsRouter.post('/expeditions/create/account/zip/find', checkUser, async (req, res) => {
    const { zip } = req.body

    const zips = await ResCountryZip.findAll({ where: { 'data.name': { [Op.like]: '%' + zip + '%' } }, limit: 10 })

    res.json({
        status: 'success',
        data: await renderModule('expeditions/views/_zip_result', { zips })
    })
})

expeditionsRouter.get('/expeditions/states/:country_id', checkUser, async (req, res) => {
    const country = await ResCountry.findByPk(req.params.country_id)

    if(!country) return res.json({ status: 'error', message: 'Country not found' })

    const states = await ResCountryState.findAll({ where: { country_id: country.id } })

    res.json({
        status: 'success',
        data: await renderComponent('forms/html/fields/_options', { items: states, null_opt: 'Select state ...' })
    })
})

expeditionsRouter.post('/expeditions/contact/create', checkUser, async (req, res) => {
    const { client_account_id, name, type, street, street2, city, zip, country_id, state_id, phone, email } = req.body

    const clientAccount = await ClientAccount.findByPk(client_account_id)

    if(!clientAccount) return res.json({ status: 'error', message: 'Client account not found' })

    const country = await ResCountry.findByPk(country_id)

    if(!country) return res.json({ status: 'error', message: 'Country not found' })

    const state = await ResCountryState.findByPk(state_id)

    if(!state) return res.json({ status: 'error', message: 'State not found' })

    const erp = new WebServiceRPC()

    const result = await erp.request('expeditions.contact.create', {
        name,
        type,
        street,
        street2,
        parent_id: clientAccount.partner_id,
        city,
        zip,
        country_id: country.dbid,
        state_id: state.dbid,
        phone,
        email
    })

    Logger.debug('Expedition contact created:', result)

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error creating contact' })

    const shippingData = result.data

    const shippingItem = await PartnerShipping.findOne({ where: { user_id: req.user.id, 'data.id': shippingData.id } })

    const shipping = await PartnerShipping.create({ id: genDBID(), user_id: req.user.id, data: shippingData })

    const shippings = await PartnerShipping.findAll({ where: { user_id: req.user.id } })

    res.json({
        status: 'success',
        message: 'Contact created successfully',
        data: await renderComponent('forms/html/fields/_options', {
            value: shipping.id,
            items: shippings,
            null_opt: 'Select shipping ...'
        })
    })
})

expeditionsRouter.get('/expeditions/products/list', checkUser, async (req, res) => {
    const products = await StockItem.findAll({ where: { user_id: req.user.id } })

    res.json({
        status: 'success',
        data: await renderModule('expeditions/views/_stock_items', { items: products, i18n: req.i18n })
    })
})
