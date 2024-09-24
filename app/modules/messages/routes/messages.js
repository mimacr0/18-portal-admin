
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser, checkERPUser } from '../../../controllers/web/security.js'
import { sio } from '../../../controllers/web/server.js'

import { renderFile } from '../../../tools/view.js'

export const messagesRouter = express.Router()

messagesRouter.get('/messages', checkUser, async (req, res) => {
    const page = await SysPage.getPage('messages', req.user)
    res.send(await renderFile('messages/views/index', {
        page,
        user: req.user,
        clean: req.query.c || false
    }))
})

messagesRouter.post('/messages/api/update', checkERPUser, async (req, res) => {
    sio.emit('messages expeditions update')
    res.json({ status: 'success', message: 'Action completed successfully' })
})
