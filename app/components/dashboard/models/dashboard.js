import { formatAttrs } from '../../../tools/view.js'

import { Menu } from '../../layout/models/menu.js'
import { KpisKpi } from '../../../modules/base/models/main.js'
import { Screen } from './screen.js'
import { KPI, stateKPI } from './kpis.js'

import {
    UI_COMPANY_NAME,
    UI_COMPANY_WEBSITE,
    UI_LICENSE_YEAR,
    UI_VERSION_NUMBER } from '../../../etc/sys.js'

const KPITypes = {}

const formatAssets = (assets) => {

    if(!assets) return {
        css: [],
        js: []
    }

    const css = assets?.css?.length > 0 ? assets?.css.map(i => {
        return {
            attrsHTML: formatAttrs({ href: i.url, ...{rel: 'stylesheet'}, ...(i.attrs || {})})
        }
    }) : []
    const js = assets?.js?.length > 0 ? assets?.js.map(i => {
        return {
            attrsHTML: formatAttrs({ src: i.url, ...(i.attrs || {})})
        }
    }) : []
    return { css, js }
}

export class Dashboard {
    constructor(page, pages) {
        this.page = page
        this.pages = pages
    }
    get assets() {
        return {
            header: formatAssets(this.page?.data?.assets?.header),
            footer: formatAssets(this.page?.data?.assets?.footer)
        }
    }
    get title() {
        return this.page?.data?.title
    }
    get url() {
        return this.page?.data?.url
    }
    get info() {
        return {
            company: UI_COMPANY_NAME,
            website: UI_COMPANY_WEBSITE,
            license: UI_LICENSE_YEAR,
            version: UI_VERSION_NUMBER
        }
    }
    get menus() {
        return this.pages.map(i => new Menu(i))
    }
    get screens() {
        return (this.page?.data?.screens || []).map((i, index) => new Screen(i, index, this))
    }
    static async actionRegister(page) {
        for(const kpi of page.data.kpis) {
            const KPIModel = KPITypes[kpi.type] || KPI
            await KpisKpi.actionRegister({...(new KPIModel(kpi)).data, page: page.name})
        }
    }
}