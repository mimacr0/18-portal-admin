
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'

import { renderFile } from '../../../tools/view.js'


export const expeditionsRouter = express.Router()

expeditionsRouter.get('/expeditions', checkUser, async (req, res) => {
    res.send(await renderFile('expeditions/views/index', {
        page: await SysPage.getPage('expeditions'),
        user: req.user,
        iframe: req.query.iframe
    }))
})
