
import { renderComponent, formatAssets } from '../../../tools/view.js'

import sysConfig from '../../../etc/sys.js'

export class Login {
    constructor(ctx) {
        const { i18n } = ctx
        this.i18n = i18n
        this.view = 'page'

        if(!this.i18n) throw new Error(`i18n is required for page: ${this.name}`)
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

    get lang() {
        const lang = sysConfig.DEFAULT_UI_LANGUAGE
        return lang.includes('_') ? lang.split('_')[0] : lang
    }

    async render() {
        return await renderComponent(`login/html/${this.view}`, { page: this })
    }
}
