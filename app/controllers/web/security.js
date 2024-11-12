import { config } from 'dotenv'

import path from 'path'
import fs from 'fs/promises'
import fss from 'fs'
import jwt from 'jsonwebtoken'
import util from 'util'
import session from 'express-session'
import SqliteStoreFactory from 'better-sqlite3-session-store'

import { SysUser } from '../../modules/base/models/users.js'
import { sysDB } from '../db/db.js'

import i18n from '../i18n/i18n.js'

import sysConfig from '../../etc/sys.js'

config({ path: path.join(sysConfig.BASE_PATH, '.env') })

const SqliteStore = SqliteStoreFactory(session)

export const checkUser = async (req, res, next) => {
    if(!req?.session?.uid && req.headers['content-type'] == 'application/json')
        return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    if(!req?.session?.uid) return res.redirect('/login')

    const user = await SysUser.findByPk(req.session.uid)

    if(!user) return res.redirect('/login')

    i18n.setLocale(user.lang)

    req.i18n = i18n
    req.user = user
    next()
}

export const checkUserAssets = async (req, res, next) => {
    if(!req?.session?.uid) return res.sendStatus(404)
    const user = await SysUser.findByPk(req.session.uid)
    if(!user) return res.sendStatus(404)
    i18n.setLocale(user.lang)

    req.i18n = i18n
    req.user = user
    next()
}

export const checkRPCUser = async (req, res, next) => {
    const token = req.headers['authorization'].split(' ')[1]
    if(!token) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    try {
        await util.promisify(jwt.verify)(token, sysConfig.RPC_API_SECRET)
    } catch (error) {
        if(error.name == 'TokenExpiredError') return res.status(401).json({ status: 'error', message: 'Token expired' })
        if(error.name == 'JsonWebTokenError') return res.status(403).json({ status: 'error', message: 'Invalid token' })
        return res.status(500).json({ status: 'error', message: 'Authentication error' })
    }

    req.token = token
    next()
}

export const checkRPCUserAuth = async (req, res, next) => {
    const token = req.headers['authorization'].split(' ')[1]

    if(!token) return res.status(404).json({ status: 'error', message: 'Unauthorized' })
    if(typeof(token) != 'string') return res.status(404).json({ status: 'error', message: 'Unauthorized' })
    if(!token.includes(',')) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    const [cid, t] = token.split(',')

    const keyPath = path.join(sysConfig.BASE_PATH, 'security', 'keys', `${cid}.pub`)

    try {
        if(!fss.existsSync(keyPath)) return res.status(404).json({ status: 'error', message: 'Unauthorized' })
        const keyData = await fs.readFile(keyPath, { encoding: 'utf8' })
        await util.promisify(jwt.verify)(t, keyData, { algorithms: ['RS256'] })
    } catch (error) {
        Logger.error('Error verifying token:', error)
        if(error.name == 'TokenExpiredError') return res.status(401).json({ status: 'error', message: 'Token expired' })
        if(error.name == 'JsonWebTokenError') return res.status(403).json({ status: 'error', message: 'Invalid token' })
        return res.status(500).json({ status: 'error', message: 'Authentication error' })
    }

    req.token = await util.promisify(jwt.sign)({}, sysConfig.RPC_API_SECRET, { expiresIn: '1h' })
    next()
}

export const checkAuthorization = async (req, res, next) => {
    const token = (req.headers['authorization'] || '').split(' ')[1]

    if(!token) return res.status(404).json({ status: 'error', message: 'Unauthorized' })
    if(typeof(token) != 'string') return res.status(404).json({ status: 'error', message: 'Unauthorized' })
    if(!token.includes(',')) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    const [cid, _token] = token.split(',')

    const key = await RPCAuthorization.findOne({ where: { cid: cid } })

    if(!key) return { status: 'error', message: 'Unauthorized', code: 404 }

    const keyB64 = key.data.key

    if(!keyB64) return { status: 'error', message: 'Unauthorized', code: 404 }

    const keyData = Buffer.from(keyB64, 'base64').toString('utf8')

    try {
        await util.promisify(jwt.verify)(_token, keyData, { algorithms: ['RS256'] })
    } catch (error) {
        Logger.error('Error verifying token:', error)
        if(error.name == 'TokenExpiredError') return res.status(401).json({ status: 'error', message: 'Token expired' })
        if(error.name == 'JsonWebTokenError') return res.status(403).json({ status: 'error', message: 'Invalid token' })
        return res.status(500).json({ status: 'error', message: 'Authentication error' })
    }

    if(!sysConfig.RPC_API_SECRET) {
        Logger.error('RPC_API_SECRET is not set')
        return res.status(500).json({ status: 'error', message: 'Authentication error' })
    }

    req.token = await util.promisify(jwt.sign)({}, sysConfig.RPC_API_SECRET, { expiresIn: '1h' })
    next()
}

export const sessionMiddleware = session({
    store: new SqliteStore({
        client: sysDB,
        table: 'sessions'
    }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: null
    }
})