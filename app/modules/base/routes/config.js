import express from 'express'
import { promises as fs } from 'fs'
import fss from 'fs'
import path from 'path'
import { Op } from 'sequelize'

import sysConfig from '../../../etc/sys.js'

import { checkUser } from '../../../controllers/web/security.js'
import { SysPage } from '../../base/models/base.js'
import { ConfigConf } from '../models/config.js'
import { Cards } from '../../../components/cards/models/page.js'
import { renderComponent } from '../../../tools/view.js'
import { runScript } from '../../../tools/cli.js'
import { genDBID, saveFile, removeFile } from '../../../tools/sys.js'


export const configRouter = express.Router()

configRouter.get('/config', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/config')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await page.render())
})

configRouter.get('/assets/js/config/page.js', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/config')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.setHeader('Content-disposition', `inline; filename=${page.name}.js`)
    res.setHeader('Content-type', 'text/javascript')
    res.send(await page.renderJS())
})

configRouter.get('/config/config/list', checkUser, async (req, res) => {
    const pconf = await ConfigConf.getByKeys({
        gl: 'pages.global',
        pc: 'pages.config.config'
    })

    const pageData = await SysPage.getPage('/config')
    const page = new Cards({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })

    const card = page.cards.find(c => c.name === 'config')
    const pageNum = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit || pconf?.pc.pager?.limit || pconf?.gl.pager?.limit) || 15
    const offset = (pageNum - 1) * limit;
    const { count, rows } = await ConfigConf.findAndCountAll({
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

configRouter.post('/config/config/action/delete/:id', checkUser, async (req, res) => {
    await ConfigConf.destroy({ where: { id: req.params.id } })
    res.json({status: 'success', message: 'Action completed successfully'})
})

configRouter.get('/config/config/read/:id', checkUser, async (req, res) => {
    const item = await ConfigConf.findByPk(req.params.id)
    res.json({
        status: 'success',
        data: {
            ...item.data,
            id: item.id,
            name: item.name
        }
    })
})

configRouter.post('/config/config/update/form', checkUser, async (req, res) => {
    const { id, name } = req.body
    const data = { ...req.body }
    delete data.id
    delete data.name

    let config = {}

    if(data.config) config = (await runScript('sys/conf', { format: 'raw_yml', data: data.config }))?.data || {}

    const rid = id || genDBID()
    const item = await ConfigConf.findByPk(rid)
    await ConfigConf.upsert({ id: rid, name: name, data: { ...item?.data, ...data }, config })
    res.json({status: 'success', message: 'Action completed successfully'})
})

configRouter.get('/config/config/tools/action/export', checkUser, async (req, res) => {
    const items = await ConfigConf.findAll()
    const r = await runScript('config/export', { items })

    const filePath = r?.data?.file

    if(!filePath || !fss.existsSync(filePath)) return res.status(404).send('File not found')

    const filename = 'config_export_' + Date.now() + '.csv'

    res.setHeader('Content-disposition', 'attachment; filename=' + filename)
    res.setHeader('Content-type', 'text/csv')

    const filestream = fss.createReadStream(filePath)
    filestream.pipe(res)
})

configRouter.post('/config/config/tools/action/import/before', checkUser, async (req, res) => {
    const file = req.files['file-0']

    const ext = path.extname(file.name)

    let data = null

    try { data = (await fs.readFile(file.tempFilePath)).toString('base64') }
    catch (error) { Logger.error(error) }

    if(!data) return res.json({ status: 'error', message: 'Error reading file', alert: true })

    const f = await saveFile({
        file: file.name,
        ext,
        b64: data,
        mimetype: file.mimetype,
        md5: file.md5
    })

    const r = await runScript('config/import', { path: path.join(sysConfig.BASE_PATH, f.path) })

    await removeFile(f.path)

    if(r?.status === 'error') return res.json({ status: 'error', message: r?.message, alert: true })

    for(const item of (r?.data || [])) {
        await ConfigConf.upsert({ id: item.id, name: item.name, data: item.data })
    }

    res.json({ status: 'success', message: 'Action completed', alert: true })
})


