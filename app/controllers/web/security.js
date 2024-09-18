import { config } from 'dotenv'

import path from 'path'
import jwt from 'jsonwebtoken'
import util from 'util'
import session from 'express-session'
import SqliteStoreFactory from 'better-sqlite3-session-store'

import { ConfigConf } from '../../modules/base/models/config.js'
import { SysUser } from '../../modules/base/models/users.js'
import { sysDB } from '../db/db.js'

import { BASE_PATH } from '../../etc/sys.js'

config({ path: path.join(BASE_PATH, '.env') })

const SqliteStore = SqliteStoreFactory(session)

export const checkUser = async (req, res, next) => {
    if(!req?.session?.uid && req.headers['content-type'] == 'application/json')
        return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    if(!req?.session?.uid) return res.redirect('/login')

    const user = await SysUser.findByPk(req.session.uid)

    if(!user) return res.redirect('/login')

    req.user = user
    next()
}

export const checkUserAssets = async (req, res, next) => {
    if(!req?.session?.uid) return res.redirect('/login')
    const user = await SysUser.findByPk(req.session.uid)
    if(!user) return res.redirect('/login')
    req.user = user
    next()
}

export const checkERPUser = async (req, res, next) => {
    const token = req.headers['authorization'].split(' ')[1]
    if(!token) return res.status(404).json({ status: 'error', message: 'Unauthorized' })

    try {
        const decoded = await util.promisify(jwt.verify)(token, process.env.RPC_API_SECRET)
        const user = await SysUser.findOne({ where: { login: decoded.login } })
        if(!user) return res.status(404).json({ status: 'error', message: 'Unauthorized' })
        req.user = user
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