import express from 'express'
import path from 'path'
import qr from 'qr-image'

import { config } from 'dotenv'
import { Op } from 'sequelize'

import i18n from '../../../controllers/i18n/i18n.js'
import sysConfig from '../../../etc/sys.js'

import { checkUser } from '../../../controllers/web/security.js'
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'
import { loginSchema } from '../schemas/login.js'
import { runScript } from '../../../tools/cli.js'
import { SysPage } from '../../base/models/base.js'
import { SysUser } from '../models/users.js'
import { ConfigConf } from '../models/config.js'
import { Login } from '../../../components/login/models/page.js'
import { Cards } from '../../../components/cards/models/page.js'
import { validateSchema } from '../../../tools/validate.js'
import { renderComponent } from '../../../tools/view.js'
import { genMD5, saveFile, generateWebToken, verifyWebToken } from '../../../tools/sys.js'


export const usersRouter = express.Router()

usersRouter.get('/users', checkUser, async (req, res) => {

    if(!req.user.hasPrivilege('system')) return res.redirect('/pages/404')

    const pageData = await SysPage.getPage('/users')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await page.render())
})

usersRouter.get('/assets/js/users/page.js', checkUser, async (req, res) => {

    if(!req.user.hasPrivilege('system')) return res.redirect('/pages/404')

    const pageData = await SysPage.getPage('/users')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await page.renderJS())
})

usersRouter.get('/users/users/list', checkUser, async (req, res) => {

    if(!req.user.hasPrivilege('system')) return res.status(404).json({ status: 'error', message: 'Not found' })

    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.users.users'
    })

    const pageData = await SysPage.getPage('/users')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })

    const card = page.cards.find(c => c.name === 'users')
    const pageNum = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (pageNum - 1) * limit;
    const { count, rows } = await SysUser.findAndCountAll({
        where: { name: { [Op.like]: '%' + req.query.q + '%' } },
        limit,
        offset
    })

    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1);
    const endPage = Math.min(totalPages, currentPage + 4)
    const firstResult = (currentPage - 1) * limit + 1
    const lastResult = Math.min(currentPage * limit, count)
    const list = await renderComponent(`cards/html/${card.html}/_items`, { user: req.user, items: rows, pconf, rstyle, count, card })
    const footer = await renderComponent(`cards/html/${card.html}/_footer`, {
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

usersRouter.get('/login', async (req, res) => {
    i18n.setLocale(sysConfig.DEFAULT_UI_LANGUAGE)
    const page = new Login({ i18n })
    res.send(await page.render())
})

usersRouter.post('/login', async (req, res) => {
    const { username, password } = req.body

    const r = validateSchema(req.body, loginSchema)

    if(r?.status !== 'success') return res.json({ status: 'error', message: 'Invalid data' })

    const user = await SysUser.findOne({ where: { login: username } })
    if(!user) return res.json({ status: 'error', message: 'Error de autenticación' })
    if(!(await user.doLogin(password))) return res.json({ status: 'error', message: 'Error de autenticación' })
    req.session.uid = user.id
    res.json({ status: 'success' })
})

usersRouter.get('/logout', checkUser, (req, res) => {
    req.session.destroy()
    res.redirect('/')
})

usersRouter.post('/users/users/list/action/access', checkUser, async (req, res) => {

    if(!req.user.hasPrivilege('system')) return res.status(404).json({ status: 'error', message: 'Not found' })

    const { id } = req.body

    config({ path: path.join(BASE_PATH, '.env') })

    const user = await SysUser.findByPk(id)

    if(!user) return res.json({ status: 'error', message: 'User not found' })

    const token = await generateWebToken({ id: user.id, login: user.login }, process.env.DIRECT_SECRET)

    const url = `${process.env.BASE_URL.replace(/\/$/, '')}/users/login/token/${token}`

    const QRSvg = qr.imageSync(url, {
        type: 'svg',
        size: 5,
        margin: 2
    })

    res.json({
        status: 'success',
        html: await renderFile('../modules/base/views/access', { url, qr_image: QRSvg.toString() })
    })
})

usersRouter.post('/users/users/tools/action/sync', checkUser, async (req, res) => {

    if(!req.user.hasPrivilege('system')) return res.status(404).json({ status: 'error', message: 'Not found' })

    const erp = new WebServiceRPC('pages.users.users')

    const result = await erp.request('users/list')

    if(result?.status !== 'success') return res.json({
        status: 'error',
        message: req.i18n.__('Error syncing users')
    })

    const usersResponse = await runScript('users/sync', { users: result.data })

    if(usersResponse?.status !== 'success') return res.json(usersResponse)

    for(const user of usersResponse.data) {
        const uid = genMD5(user.login)
        const item = await SysUser.findByPk(uid)
        const password = user.password
        const login = user.login
        const image = user.image
        delete user.login
        delete user.password
        delete user.image

        if(item?.login === login && !item.data?.dbid) continue

        user.role = 'portal'
        user.image = await saveFile({
            file: `${uid}.jpg`,
            ext: '.jpg',
            b64: image,
            mimetype: 'image/jpeg',
            md5: uid
        })

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

    res.json({ status: 'success', message: req.i18n.__('Sync completed') })
})

usersRouter.get('/users/login/token/:token', async (req, res) => {
    const { token } = req.params
    if(!token) return res.redirect('/')

    const result = await verifyWebToken(token, process.env.DIRECT_SECRET)

    if(result?.status !== 'success') return res.redirect('/')

    const payload = result?.data
    const user = await SysUser.findOne({ where: { login: payload?.login, id: payload?.id } })

    if(!user) return res.redirect('/')

    req.session.uid = user.id

    res.send(await renderFile('../modules/base/views/redirect', {
        page: await SysPage.getPage('redirect'),
        user,
        url: '/'
    }))
})
