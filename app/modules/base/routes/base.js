import express from 'express'
import path from 'path'
import fs from 'fs'

import { Logger } from '../../../tools/log.js'
import { checkUser } from '../../../controllers/web/security.js'
import { SysPage } from '../../base/models/base.js'
import { Page } from '../../../components/layout/models/page.js'
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

baseRouter.get('/pages/404', checkUser, async (req, res) => {
    const page = await SysPage.getPage('404')
    const renderer = new Page({
        page,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await renderer.render())
})
