
import express from 'express'

import { checkRPCUserAuth, checkRPCUser } from '../../../controllers/web/security.js'

export const apiRouter = express.Router()

apiRouter.get('/api/auth/rpc/token', checkRPCUserAuth, async (req, res) => {
    res.json({ status: 'success', data: { token: req.token } })
})

apiRouter.get('/api/auth/rpc/test', checkRPCUser, async (req, res) => {
    res.json({ status: 'success', message: 'Authentication success' })
})
