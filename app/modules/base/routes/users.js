import express from 'express'
import jwt from 'jsonwebtoken'

import { Op } from 'sequelize'

import { checkUser } from '../../../controllers/web/security.js'
import { loginSchema } from './schemas.js'
import { renderFile } from '../../../tools/view.js'
import { runScript } from '../../../tools/cli.js'
import { SysPage } from '../../base/models/base.js'
import { SysUser } from '../models/users.js'
import { ConfigConf } from '../models/config.js'
import { validateSchema } from '../../../tools/validate.js'
import { genMD5 } from '../../../tools/sys.js'

export const usersRouter = express.Router()

usersRouter.get('/users', checkUser, async (req, res) => {
    res.send(await renderFile('base/ui/html/page', {
        page: await SysPage.getPage('users'),
        user: req.user
    }))
})

usersRouter.get('/users/users/list', checkUser, async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.users.users'
    })

    const card = await SysPage.getCard('users-users')
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (page - 1) * limit;
    const { count, rows } = await SysUser.findAndCountAll({
        where: { name: { [Op.like]: '%' + req.query.q + '%' } },
        limit,
        offset
    })
    rows.sort((a, b) => a.data.sequence - b.data.sequence)

    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderFile('base/ui/html/pages/_list/_items', { user: req.user, items: rows, pconf, rstyle, count, card })
    const footer = await renderFile('base/ui/html/pages/_list/_footer', {
        items: rows,
        total: count,
        totalPages, currentPage,
        limit, startPage,
        endPage,
        firstResult,
        lastResult
    })
    res.json({ html: list, footer })
})

usersRouter.post('/login', async (req, res) => {
    const { username, password } = req.body

    const r = validateSchema(req.body, loginSchema)

    if(r?.status !== 'success') return res.json({ status: 'error', message: 'Invalid data' })

    const user = await SysUser.findOne({ where: { login: username } })
    if(!user) return res.json({ status: 'error', message: 'Error de autenticación' })
    if(!(await user.doLogin(password))) return res.json({ status: 'error', message: 'Error de autenticación' })
    const token = jwt.sign({ id: user.id, login: user.login }, process.env.SECRET, { expiresIn: '1h' })
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, { expiresIn: '1d' })
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: true, maxAge: 24 * 60 * 60 * 1000 })
    res.json({ status: 'success', token, refreshToken })
})

usersRouter.post('/users/users/tools/action/sync', async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        conn: 'wsrpc.connections'
    })

    const ws = Object.entries(pconf?.conn).reduce((acc, [key, value]) => {
        if(key == pconf?.gl?.rpc?.ws) return value;
        return acc;
    }, null)

    if(!ws) return res.json({ status: 'error', message: 'Connection not found' })

    const result = await runScript('users/sync', { ws })

    if(result?.status !== 'success') return res.json(result)

    for(const user of result.data) {
        const uid = genMD5(user.login)
        const item = await SysUser.findByPk(uid)
        const password = user.password
        const login = user.login
        delete user.login
        delete user.password
        await SysUser.upsert({
            id: uid,
            name: user.name || login,
            login: login,
            password,
            data: {
                ...item?.data, ...user
            }
        })
    }

    res.json({ status: 'success', message: 'Sync completed' })
})
