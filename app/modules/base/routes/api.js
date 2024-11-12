
import express from 'express'

import { RPCAPIConnections, RPCAuthorization } from '../models/base.js'
import { checkRPCUserAuth, checkRPCUser, checkAuthorization } from '../../../controllers/web/security.js'
import { genDBID } from '../../../tools/sys.js'


export const apiRouter = express.Router()

apiRouter.get('/api/auth/rpc/token', checkRPCUserAuth, async (req, res) => {
    res.json({ status: 'success', data: { token: req.token } })
})

apiRouter.get('/api/auth/rpc/test', checkRPCUser, async (req, res) => {
    res.json({ status: 'success', message: 'Authentication success' })
})

apiRouter.get('/api/authorization/rpc/token', checkAuthorization, async (req, res) => {
    res.json({ status: 'success', data: { token: req.token } })
})

apiRouter.post('/users/api/connections/sync', checkRPCUser, async (req, res) => {
    const { connections } = req.body

    for(const connection of connections) {
        const item = await RPCAPIConnections.findOne({ where: { cid: connection.cid } })
        if(item) {
            item.data = connection
            item.changed('data', true)
            await item.save()
            continue
        }
        await RPCAPIConnections.create({ id: genDBID(), cid: connection.cid, data: connection })
    }

    res.json({ status: 'success', message: 'Authentication success' })
})

apiRouter.post('/users/api/authorizations/sync', checkRPCUser, async (req, res) => {
    const { authorizations } = req.body

    for(const authorization of authorizations) {
        const item = await RPCAuthorization.findOne({ where: { cid: authorization.cid } })
        if(item) {
            item.data = authorization
            item.changed('data', true)
            await item.save()
            continue
        }
        await RPCAuthorization.create({ id: genDBID(), cid: authorization.cid, data: authorization })
    }

    res.json({ status: 'success', message: 'Authentication success' })
})
