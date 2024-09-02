import { promisify } from 'util'
import jwt from 'jsonwebtoken'

import { SysUser } from '../../modules/base/models/users.js'

import { renderFile } from '../../tools/view.js'

import {
    DEFAULT_UI_LANGUAGE,
    UI_LOGIN_PAGE_TITLE,
    UI_APP_TITLE,
    UI_APP_COLOR } from '../../etc/sys.js'

export const socketCheckUser = (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication error'))
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'))
        socket.user = decoded
        next()
    })
}

export const checkUser = async (req, res, next) => {
    const token = req.cookies['token']

    const pageData = {
        lang: DEFAULT_UI_LANGUAGE,
        title: UI_LOGIN_PAGE_TITLE,
        appTitle: UI_APP_TITLE,
        color: UI_APP_COLOR
    }

    if (!token) return res.send(await renderFile('base/views/login', pageData))

    try {
        const decoded = await promisify(jwt.verify)(token, process.env.SECRET)
        const user = await SysUser.findByPk(decoded.id)
        req.user = user
        next()
    } catch (err) {
        return req.headers['content-type'] == 'application/json' ?
        res.status(404).json({ status: 'error', message: 'Unauthorized' }) :
        res.send(await renderFile('base/views/login', pageData))
    }

}

export const checkUserAssets = async (req, res, next) => {
    const token = req.cookies['token']
    if (!token) return res.status(404).send('')

    try {
        const decoded = await promisify(jwt.verify)(token, process.env.SECRET)
        const user = await SysUser.findByPk(decoded.id)
        req.user = user
        next()
    } catch (err) {
        return res.status(404).send('')
    }
}
