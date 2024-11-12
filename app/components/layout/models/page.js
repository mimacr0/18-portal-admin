import path from 'path'

import { SysMenu } from '../../../modules/base/models/base.js'
import { renderModule, formatAssets } from '../../../tools/view.js'

import sysConfig from '../../../etc/sys.js'


export class Page {
    constructor(ctx) {
        const { page, user, i18n } = ctx
        this.name = page.name
        this.data = page.data
        this.user = user
        this.i18n = i18n
        this.module = this.data.module
        this.view = this.data.view || 'index'
        this.jsView = this.data.js_view || 'index'
        this.menuItems = []

        if(!this.user) throw new Error(`User is required for page: ${this.name}`)
        if(!this.i18n) throw new Error(`i18n is required for page: ${this.name}`)
        if(!this.module) throw new Error(`Module is required for page: ${this.name}`)
    }

    translate(text) {
        return this.i18n.__(text)
    }

    get assets() {
        return {
            header: formatAssets(this.data?.assets?.header),
            footer: formatAssets(this.data?.assets?.footer)
        }
    }
    get title() {
        return this.data?.title
    }
    get url() {
        return this.data?.url
    }

    get company() {
        return sysConfig.UI_COMPANY_NAME
    }
    get website() {
        return sysConfig.UI_COMPANY_WEBSITE
    }
    get license() {
        return sysConfig.UI_LICENSE_YEAR
    }
    get version() {
        return sysConfig.UI_VERSION_NUMBER
    }

    get menus() {
        return this.menuItems
    }

    async loadMenus() {
        this.menuItems = await SysMenu.findAll({ where: {}, order: [['data.sequence', 'ASC']] })
    }

    async render(data={}) {
        await this.loadMenus()
        return await renderModule(path.join(this.module, 'views', this.view), { page: this, ...data, i18n: this.i18n })
    }

    async renderJS(data={}) {
        return await renderModule(path.join(this.module, 'js', this.jsView), { page: this, ...data, i18n: this.i18n })
    }
}