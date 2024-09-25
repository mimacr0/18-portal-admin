
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../../base/models/config.js'
import { checkUser, checkERPUser } from '../../../controllers/web/security.js'
import { expeditionsClient } from '../api/expeditions.js'

import { renderFile } from '../../../tools/view.js'


export const expeditionsRouter = express.Router()

expeditionsRouter.get('/expeditions', checkUser, async (req, res) => {
    res.send(await renderFile('expeditions/views/index', {
        page: await SysPage.getPage('expeditions', req.user),
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
    const expeditions = await expeditionsClient.searchReadExpeditions({
        q, limit, offset, user_id: req.user.uid
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

expeditionsRouter.get('/expeditions/create/account/data', checkUser, async (req, res) => {

    const expeditions = await expeditionsClient.getExpeditionsData({ user_id: req.user.uid })

    if (expeditions?.status != 'success') return res.json(expeditions)

    res.json({ status: 'success', accounts: expeditions.data.accounts, countries: expeditions.data.countries })
})

expeditionsRouter.post('/expeditions/create/account/shipping/data', checkUser, async (req, res) => {
    const { account_id } = req.body
    const result = await expeditionsClient.getExpeditionsShippingData({
        user_id: req.user.uid,
        account_id
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

expeditionsRouter.post('/expeditions/create/account/zip/find', checkUser, async (req, res) => {
    const { account_id, zip } = req.body
    const result = await expeditionsClient.getExpeditionsZipCodeData({
        user_id: req.user.uid,
        account_id,
        q: zip
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', data: result.data })
})

expeditionsRouter.post('/expeditions/create/account/zip/data', checkUser, async (req, res) => {
    const { zip } = req.body
    const result = await expeditionsClient.getExpeditionsZipData({
        user_id: req.user.uid,
        q: zip.toString()
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

    const result = await expeditionsClient.expeditionsRegisterShippingAddress({
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

expeditionsRouter.post('/expeditions/create/expedition/create', checkUser, async (req, res) => {
    const { client_account_id, shipping_adddress_id, id } = req.body

    const result = await expeditionsClient.expeditionsShippingCreate({
        user_id: req.user.uid,
        client_account_id,
        shipping_adddress_id,
        ids: id.split(',')
    })

    if (result?.status != 'success') return res.json(result)

    res.json({ status: 'success', message: `Expedition ${result.data.name} created successfully` })
})
