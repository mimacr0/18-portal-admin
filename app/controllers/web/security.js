import { config } from 'dotenv'

import path from 'path'
import fs from 'fs/promises'
import jwt from 'jsonwebtoken'
import util from 'util'
import session from 'express-session'
import SqliteStoreFactory from 'better-sqlite3-session-store'

import { SysUser } from '../../modules/base/models/users.js'
import { KeysKey } from '../../modules/base/models/keys.js'
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
    const authToken = req.headers['authorization'].split(' ')[1]

    if(!authToken) return res.status(404).json({ status: 'error', message: 'Unauthorized' })
    if(!authToken.includes(',')) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    const [cid, token] = authToken.split(',')

    const key = await KeysKey.findOne({ where: { 'data.client_user': cid } })

    if(!key) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    if(!key.data?.file?.path) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    const keyPath = path.join(sysConfig.BASE_PATH, key.data.file.path)

    try {
        const keyData = await fs.readFile(keyPath, { encoding: 'utf8' })
        const decoded = await util.promisify(jwt.verify)(token, keyData, { algorithms: ['RS256'] })
        req.payload = decoded
        next()
    } catch (error) {
        if(error.name == 'TokenExpiredError') return res.status(401).json({ status: 'error', message: 'Token expired' })
        if(error.name == 'JsonWebTokenError') return res.status(403).json({ status: 'error', message: 'Invalid token' })
        return res.status(500).json({ status: 'error', message: 'Authentication error' })
    }
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