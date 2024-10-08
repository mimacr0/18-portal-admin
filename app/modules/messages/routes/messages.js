
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { sio } from '../../../controllers/web/servers.js'
import { Cards } from '../../../components/cards/models/page.js'

export const messagesRouter = express.Router()

messagesRouter.get('/messages', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/messages')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await page.render())
})

messagesRouter.get('/assets/js/messages/page.js', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/messages')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await page.renderJS())
})

// messagesRouter.post('/messages/api/update', checkERPUser, async (req, res) => {
//     sio.emit('messages expeditions update')
//     res.json({ status: 'success', message: 'Action completed successfully' })
// })
