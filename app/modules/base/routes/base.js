import express from 'express'
import path from 'path'
import fs from 'fs'

import { Logger } from '../../../tools/log.js'
import { checkUser, checkRPCUser } from '../../../controllers/web/security.js'
import { SysPage } from '../../base/models/base.js'
import { Page } from '../../../components/layout/models/page.js'
import { ResCountry, ResCountryState, ResCountryZip } from '../../base/models/base.js'
import { ClientAccount } from '../../base/models/base.js'
import { SysUser } from '../../base/models/users.js'
import { genMD5 } from '../../../tools/sys.js'
import { dataDB } from '../../../controllers/db/db.js'
import sysConfig from '../../../etc/sys.js'

export const baseRouter = express.Router()

baseRouter.use(async (req, _, next) => {
    Logger.debug('U', req.url,'B', req.body,'Q', req.query, 'P', req.params,'F', req.files || 'No files')
    next()
})

baseRouter.get('/base/image/user/:file', checkUser, async (req, res) => {
    if(!req.params.file) return res.sendStatus(404)
    const filePath = path.join(sysConfig.BASE_PATH, 'data', 'filestore', req.params.file)
    const defaultPath = path.join(sysConfig.BASE_PATH, 'public', 'img', 'default_user.svg')
    if(!fs.existsSync(filePath)) return res.sendFile(defaultPath)
    res.sendFile(filePath)
})

baseRouter.get('/base/image/attachment/:file', checkUser, async (req, res) => {
    if(!req.params.file) return res.sendStatus(404)
    const filePath = path.join(sysConfig.BASE_PATH, 'data', 'filestore', req.params.file)
    const defaultPath = path.join(sysConfig.BASE_PATH, 'public', 'img', 'document-error.svg')
    if(!fs.existsSync(filePath)) return res.sendFile(defaultPath)
    res.sendFile(filePath)
})

baseRouter.get('/base/file/attachment/:file', checkUser, async (req, res) => {
    if(!req.params.file) return res.sendStatus(404)
    const filePath = path.join(sysConfig.BASE_PATH, 'data', 'filestore', req.params.file)
    if(!fs.existsSync(filePath)) return res.sendStatus(404)
    res.sendFile(filePath)
})

baseRouter.post('/base/system/lang/update', checkUser, async (req, res) => {
    const user = req.user

    user.config.lang = req.body.lang
    user.changed('config', true)
    await user.save()

    res.json({ status: 'success', message: 'Action completed successfully' })

})

const registerClientAccount = async (data) => {
    for(const account of data) {
        const user = await SysUser.findOne({ where: { 'data.dbid': account.user_id } })

        if(!user) continue

        const item = await ClientAccount.findOne({ where: { 'data.ref': account.ref } })
        if(item) continue
        await ClientAccount.create({ id: genMD5(account.ref), user_id: user.id, data: account })
    }
    return { status: 'success', message: 'Action completed successfully' }
}

const registerResCountry = async (data) => {
    for(const country of data) {
        const item = await ResCountry.findOne({ where: { 'data.ref': country.ref } })
        if(item) continue
        await ResCountry.create({ id: genMD5(country.ref), data: country })
    }
    return { status: 'success', message: 'Action completed successfully' }
}

const registerResCountryState = async (data) => {
    for(const state of data) {
        const country = await ResCountry.findOne({ where: { 'data.id': state.country_id } })
        if(!country) continue

        const item = await ResCountryState.findOne({ where: { 'data.ref': state.ref } })
        if(item) continue
        await ResCountryState.create({ id: genMD5(state.ref), country_id: country.id, data: state })
    }
    return { status: 'success', message: 'Action completed successfully' }
}

const registerResCountryZip = async (data) => {

    const register = []

    const countries = await ResCountry.findAll({})
    const countryMap = countries.reduce((acc, country) => {
        acc[country.data.id] = country.id
        return acc
    }, {})

    const states = await ResCountryState.findAll({})
    const stateMap = states.reduce((acc, state) => {
        acc[state.data.id] = state.id
        return acc
    }, {})

    for(const zip of data) {

        const country_id = countryMap[zip.country_id]
        const state_id = stateMap[zip.state_id]

        if(!country_id) {
            Logger.error(`Country not found`, zip)
            continue
        }

        register.push({
            id: genMD5(zip.ref),
            country_id,
            state_id,
            data: zip
        })

    }

    await ResCountryZip.bulkCreate(register)

    return { status: 'success', message: 'Action completed successfully' }
}

baseRouter.post('/base/data/portal/clean/action', checkRPCUser, async (req, res) => {
    await dataDB.query(`DROP TABLE IF EXISTS client_accounts`)
    await dataDB.query(`DROP TABLE IF EXISTS res_country_zips`)
    await dataDB.query(`DROP TABLE IF EXISTS res_country_states`)
    await dataDB.query(`DROP TABLE IF EXISTS res_countries`)

    await ClientAccount.sync()
    await ResCountry.sync()
    await ResCountryState.sync()
    await ResCountryZip.sync()

    res.json({ status: 'success', message: 'Action completed successfully' })
})

baseRouter.post('/base/data/portal/register/action', checkRPCUser, async (req, res) => {
    const { model, data } = req.body

    if(model == 'client_account') return res.json(await registerClientAccount(data))
    if(model == 'res_country') return res.json(await registerResCountry(data))
    if(model == 'res_country_state') return res.json(await registerResCountryState(data))
    if(model == 'res_country_zip') return res.json(await registerResCountryZip(data))

    res.json({ status: 'error', message: 'Invalid model' })
})

baseRouter.get('/pages/404', checkUser, async (req, res) => {
    const page = await SysPage.getPage('404')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render())
})
