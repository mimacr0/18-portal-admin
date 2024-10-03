
import { pageAssets } from './assets.js'
import { formatMenus } from './menu.js'
import { Screen } from './screen.js'

import {
    UI_COMPANY_NAME,
    UI_COMPANY_WEBSITE,
    UI_LICENSE_YEAR,
    UI_VERSION_NUMBER } from '../../../../etc/sys.js'

export class Page {
    constructor(page, ctx) {
        this.page = page
        this.ctx = ctx
    }
    get assets() {
        return pageAssets(this.page)
    }
    get menus() {
        return formatMenus(this.page, this.ctx.pages)
    }
    get screens() {
        const screens = this.page.data.screens || []
        return screens.map((screen, index) => new Screen(screen, index, this.ctx))
    }
    get forms() {
        const cardForms = this.cards.reduce((acc, card) => {
            if(!acc) acc = []
            if(card.form) acc.push(card.form)
            return acc
        }, [])
        const toolsForms = this.cards.reduce((acc, card) => {
            if(!acc) acc = []
            for(const tool of card.actions.tools) {
                if(tool.modal.before) acc.push(tool.modal.before)
                if(tool.modal.after) acc.push(tool.modal.after)
            }
            return acc
        }, [])
        // const batchForms = this.cards.reduce((acc, card) => {
        //     if(!acc) acc = []
        //     for(const batch of card.actions.batch) {
        //         if(batch.modal.before) acc.push(batch.modal.before)
        //         if(batch.modal.after) acc.push(batch.modal.after)
        //     }
        //     return acc
        // }, [])
        return [...cardForms, ...toolsForms]
    }
    get cards() {
        const screens = this.screens
        return screens.reduce((acc, screen) => {
            if(!acc) acc = []
            for(const section of screen.sections) {
                acc.push(...section.cards)
            }
            return acc
        }, [])
    }
    get info() {
        return {
            company: UI_COMPANY_NAME,
            website: UI_COMPANY_WEBSITE,
            license: UI_LICENSE_YEAR,
            version: UI_VERSION_NUMBER
        }
    }
}
