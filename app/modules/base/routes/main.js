
import express from 'express'

import { SysPage } from '../../base/models/base.js'
import { checkUser } from '../../../controllers/web/security.js'
import { Page } from '../../../components/layout/models/page.js'


export const mainRouter = express.Router()

mainRouter.get('/', checkUser, async (req, res) => {
    const pageData = await SysPage.getPage('/')
    const page = new Page({
        ...pageData,
        user: req.user,
        i18n: req.i18n
    })
    res.send(await page.render())
})
