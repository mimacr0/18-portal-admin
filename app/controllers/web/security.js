import { config } from 'dotenv'

import path from 'path'
import session from 'express-session'
import SqliteStoreFactory from 'better-sqlite3-session-store'

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