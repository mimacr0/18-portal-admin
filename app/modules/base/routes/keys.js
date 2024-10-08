
import util from 'util'
import jwt from 'jsonwebtoken'
import express from 'express'
import { Op } from 'sequelize'

import { SysUser } from '../../base/models/users.js'
import { KeysKey } from '../models/keys.js'
import { sio } from '../../../controllers/web/servers.js'
import { checkUser, checkRPCUser } from '../../../controllers/web/security.js'
import { ConfigConf } from '../../base/models/config.js'
import { SysPage } from '../../base/models/base.js'
import { Cards } from '../../../components/cards/models/page.js'
import { renderComponent } from '../../../tools/view.js'
import { uploadFiles, removeFile, genDBID } from '../../../tools/sys.js'

export const keysRouter = express.Router()

keysRouter.get('/keys', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/keys')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await page.render())
})

keysRouter.get('/assets/js/keys/page.js', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/keys')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await page.renderJS())
})

keysRouter.get('/keys/keys/list', checkUser, async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.keys.keys'
    })

    const pageData = await SysPage.getPage('/keys')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })

    const card = page.cards.find(c => c.name === 'keys')
    const pageNum = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (pageNum - 1) * limit
    const { count, rows } = await KeysKey.findAndCountAll({
        where: { name: { [Op.like]: '%' + req.query.q + '%' } },
        limit,
        offset,
        order: [['createdAt', 'DESC']]
    })
    let rcount = pconf?.pc?.list?.rcount || pconf?.gl?.list?.rcount
    let rstyle = false
    if (rcount && rows.length <= rcount) rstyle = pconf?.pc?.list?.rstyle || pconf?.gl?.list?.rstyle
    const totalPages = Math.ceil(count / limit)
    const currentPage = Math.min(Math.max(1, page), totalPages)
    const startPage = Math.max(1, currentPage - 1)
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

keysRouter.get('/keys/keys/read/:id', checkUser, async (req, res) => {
    const item = await KeysKey.findByPk(req.params.id)
    res.json({
        status: 'success',
        data: {
            ...item.data,
            id: item.id,
            name: item.name
        }
    })
})

keysRouter.post('/keys/keys/update/form', checkUser, async (req, res) => {
    const { id, name } = req.body
    const data = { ...req.body }
    delete data.id
    delete data.name

    let files = []

    const rid = id || genDBID()
    const item = await KeysKey.findByPk(rid)

    if(req?.files && item?.id && item?.data?.file) {
        await removeFile(item.data.file.path)
    }

    if(req?.files) files = await uploadFiles(req.files)

    if(files.length > 0) data.file = files[0]

    await KeysKey.upsert({ id: rid, name: name, data: { ...item?.data, ...data } })
    res.json({status: 'success'})
})

keysRouter.post('/keys/keys/action/delete/:id', checkUser, async (req, res) => {
    const { id } = req.params
    const item = await KeysKey.findByPk(id)
    if(item?.id && item?.data?.file) await removeFile(item.data.file.path)
    await KeysKey.destroy({ where: { id } })
    res.json({status: 'success'})
})

keysRouter.post('/keys/keys/list/action/fullscreen', checkUser, async (req, res) => {
    sio.emit('dashboard fullscreen', {})
    res.json({status: 'success'})
})

const decodeToken = util.promisify(jwt.verify)

keysRouter.get('/keys/login/token/:token', async (req, res) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)[0]

    if(!ip) return res.redirect('/')

    const { token } = req.params

    if(!token) return res.redirect('/')

    const key = await KeysKey.findOne({ where: { 'data.ip': ip } })

    if(!key) return res.redirect('/')

    const user = await SysUser.findByPk(key.data.user_id)

    if(!user) return res.redirect('/')

    req.session.uid = user.id

    let payload = null

    try {
        payload = await decodeToken(token, key.data.secret)
    } catch(err) {
        if(err.name === 'TokenExpiredError') return res.status(401).send('')
        if(err.name === 'JsonWebTokenError') return res.status(403).send('')
        return res.status(500).send('')
    }

    const url = payload?.url || '/'

    res.redirect(url)
})

keysRouter.get('/keys/keys/update/form/user_id', checkUser, async (req, res) => {
    const items = await SysUser.findAll()
    const html = await renderComponent('forms/html/fields/_options', { items, null_opt: 'Select user ...'})
    res.json({
        html
    })
})

keysRouter.post('/keys/keys/rpc/send/action', checkRPCUser, async (req, res) => {
    res.json({status: 'success'})
})