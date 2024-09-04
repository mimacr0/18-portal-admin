import express from 'express'
import path from 'path'
import fs from 'fs'

import { Logger } from '../../../tools/log.js'
import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { validateSchema } from '../../../tools/validate.js'
import { BASE_PATH } from '../../../etc/sys.js'
import { renderFile } from '../../../tools/view.js'
import { jsFileSchema } from './schemas.js'

export const baseRouter = express.Router()

baseRouter.use(async (req, _, next) => {
    Logger.debug('U', req.url,'B', req.body,'Q', req.query, 'P', req.params,'F', req.files || 'No files')
    next()
})

baseRouter.get('/:page/js/:card/:file.js', checkUser, async (req, res) => {

    const r = validateSchema(req.params, jsFileSchema)

    if(r?.status !== 'success') return res.sendStatus(404)

    const { page, card, file } = req.params

    const pageData = await SysPage.getPage(page)

    if(!pageData) return res.sendStatus(404)

    const cardData = pageData.cards.find(c => c.name === card)

    if(!cardData) return res.sendStatus(404)

    const fPath = path.join(BASE_PATH, 'modules', 'base', 'ui', 'js', `${file}.ejs`)

    if(!fs.existsSync(fPath)) return res.sendStatus(404)

    res.setHeader('Content-disposition', `inline; filename=${card}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await renderFile(`base/ui/js/${file}`, { page: pageData }))
})

baseRouter.get('/base/image/file/:file', checkUser, async (req, res) => {
    if(!req.params.file) return res.sendStatus(404)
    const filePath = path.join(BASE_PATH, 'data', 'filestore', req.params.file)
    const defaultPath = path.join(BASE_PATH, 'public', 'img', 'default_user.svg')
    if(!fs.existsSync(filePath)) return res.sendFile(defaultPath)
    res.sendFile(filePath)
})