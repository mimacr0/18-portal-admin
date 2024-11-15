
import express from 'express'
import { Op } from 'sequelize'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { Dashboard } from '../../../components/dashboard/models/dashboard.js'
import { DashboardKpi } from '../models/dashboard.js'
import { ExpeditionItem } from '../../expeditions/models/expeditions.js'
import { StockReception } from '../../receptions/models/receptions.js'
import { StockRepairs } from '../../repairs/models/repairs.js'
import { StockItem } from '../../stock/models/stock.js'
import { StorageItem } from '../../storage/models/storage.js'
import { SpareParts } from '../../spareparts/models/spareparts.js'
import { InvoiceItem } from '../../invoices/models/invoices.js'
import { ClientAccount } from '../../base/models/base.js'
import { PartnerShipping } from '../../expeditions/models/expeditions.js'
import { Logger } from '../../../tools/log.js'
import { genDBID } from '../../../tools/sys.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/', checkUser, async (req, res) => {
    const page = await SysPage.getPage('dashboard')
    const renderer = new Dashboard({
        page,
        user: req.user,
        i18n: req.i18n
    })

    res.send(await renderer.render())
})

dashboardRouter.get('/assets/js/dashboard/page.js', checkUser, async (req, res) => {
    const page = await SysPage.getPage('dashboard')
    const kpis = await DashboardKpi.findAll({ where: { user_id: req.user.id } })
    let initSync = false
    if(kpis.length == 0) initSync = true
    const renderer = new Dashboard({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await renderer.renderJS({ initSync }))
})

dashboardRouter.get('/dashboard/init/kpi/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.dashboard.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading kpis' })

    const generalKpis = await DashboardKpi.findAll({ where: { [Op.or]: [{ user_id: null }, { user_id: false }, { user_id: '' }] } })

    for(const kpi of generalKpis) await kpi.destroy()

    Logger.debug('Dashboard KPIs:', result.data)

    for(const data of result.data) {
        const kpi = await DashboardKpi.findOne({ where: { 'data.ref': data.ref, user_id: req.user.id } })

        const kpiData = data?.data || {}

        delete data.data

        if(!kpi) {
            await DashboardKpi.create({ id: genDBID(), user_id: req.user.id, data, kpi: kpiData })
            continue
        }

        kpi.data = { ...kpi.data, ...data }
        kpi.kpi = { ...kpi.kpi, ...kpiData }
        kpi.user_id = req.user.id
        kpi.changed('data', true)
        kpi.changed('kpi', true)
        kpi.changed('user_id', true)
        await kpi.save()
    }

    const accountResult = await erp.request('init.client.accounts.data', {
        user_id: req.user.uid
    })

    if(accountResult?.status !== 'success') return res.json({ status: 'error', message: 'Error loading kpis' })

    for(const account of accountResult.data) {
        const accountItem = await ClientAccount.findOne({ where: { 'data.id': account.id } })

        if(!accountItem) {
            await ClientAccount.create({ id: genDBID(), user_id: req.user.id, data: account })
            continue
        }

        accountItem.data = { ...accountItem.data, ...account }
        accountItem.changed('data', true)
        await accountItem.save()
    }

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading kpis' })

    const kpis = await DashboardKpi.findAll({ where: { user_id: req.user.id } })

    if(kpis.length == 0) return res.json({ status: 'error', message: 'No kpis found' })

    res.json({ status: 'success' })
})

dashboardRouter.get('/dashboard/init/expeditions/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.expeditions.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading expeditions' })

    for(const data of result.data) {
        const expedition = await ExpeditionItem.findOne({ where: { 'data.id': data.id } })

        if(!expedition) {
            await ExpeditionItem.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        expedition.data = { ...expedition.data, ...data }
        expedition.changed('data', true)
        await expedition.save()
    }

    const shippingResult = await erp.request('init.shipping.data', {
        user_id: req.user.uid
    })

    if(shippingResult?.status !== 'success') return res.json({ status: 'error', message: 'Error loading kpis' })

    for(const shipping of shippingResult.data) {
        const shippingItem = await PartnerShipping.findOne({ where: { 'data.id': shipping.id } })

        if(!shippingItem) {
            await PartnerShipping.create({ id: genDBID(), user_id: req.user.id, data: shipping })
            continue
        }

        shippingItem.data = { ...shippingItem.data, ...shipping }
        shippingItem.changed('data', true)
        await shippingItem.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/init/receptions/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.receptions.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading receptions' })

    for(const data of result.data) {
        const reception = await StockReception.findOne({ where: { 'data.id': data.id } })

        if(!reception) {
            await StockReception.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        reception.data = { ...reception.data, ...data }
        reception.changed('data', true)
        await reception.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/init/stock/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.stock.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading stock' })

    for(const data of result.data) {
        const stock = await StockItem.findOne({ where: { 'data.id': data.id } })

        if(!stock) {
            await StockItem.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        stock.data = { ...stock.data, ...data }
        stock.changed('data', true)
        await stock.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/init/storage/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.storage.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading storage' })

    for(const data of result.data) {
        const storage = await StorageItem.findOne({ where: { 'data.id': data.id } })

        if(!storage) {
            await StorageItem.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        storage.data = { ...storage.data, ...data }
        storage.changed('data', true)
        await storage.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/init/repairs/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.repairs.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading repairs' })

    for(const data of result.data) {
        const repair = await StockRepairs.findOne({ where: { 'data.name': data.name } })

        if(!repair) {
            await StockRepairs.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        repair.data = { ...repair.data, ...data }
        repair.changed('data', true)
        await repair.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/init/spareparts/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.spareparts.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading spareparts' })

    for(const data of result.data) {
        const sparepart = await SpareParts.findOne({ where: { 'data.id': data.id } })

        if(!sparepart) {
            await SpareParts.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        sparepart.data = { ...sparepart.data, ...data }
        sparepart.changed('data', true)
        await sparepart.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

dashboardRouter.get('/dashboard/init/invoices/data/action', checkUser, async (req, res) => {
    const erp = new WebServiceRPC()

    const result = await erp.request('init.invoices.data', {
        user_id: req.user.uid
    })

    if(result?.status !== 'success') return res.json({ status: 'error', message: 'Error loading invoices' })

    for(const data of result.data) {
        const invoice = await InvoiceItem.findOne({ where: { 'data.id': data.id } })

        if(!invoice) {
            await InvoiceItem.create({ id: genDBID(), user_id: req.user.id, data })
            continue
        }

        invoice.data = { ...invoice.data, ...data }
        invoice.changed('data', true)
        await invoice.save()
    }

    res.json({ status: 'success', message: 'Action completed successfully' })
})

// dashboardRouter.post('/dashboard/api/update', checkERPUser, async (req, res) => {
//     sio.emit('dashboard expeditions update')
//     res.json({ status: 'success', message: 'Action completed successfully' })
// })
