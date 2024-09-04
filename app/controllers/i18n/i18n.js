
import { I18n } from 'i18n'
import path from 'path'

import { BASE_PATH } from '../../etc/sys.js'

const i18n = new I18n({
    locales: ['en_US', 'es_ES', 'zh_CN'],
    directory: path.join(BASE_PATH, 'locales'),
    defaultLocale: 'en_US'
})

export default i18n
