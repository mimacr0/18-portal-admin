
import { I18n } from 'i18n'
import path from 'path'

import sysConfig from '../../etc/sys.js'

const i18n = new I18n({
    locales: sysConfig.I18N_LOCALES,
    directory: path.join(sysConfig.BASE_PATH, 'locales'),
    defaultLocale: 'en_US'
})

export default i18n
