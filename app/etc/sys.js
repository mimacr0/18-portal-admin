import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_PATH = path.resolve(__dirname, '..')

config({ path: path.join(BASE_PATH, '.env') })

const CONFIG_LOCALES = (process.env?.I18N_LOCALES || '').split(',').filter(l => l.length > 0)

const langData = {
    en: { name: 'English', code: 'en' },
    es: { name: 'Español', code: 'es' },
    zh: { name: '中文 (繁體)', code: 'zh' }
}

const SERVER_PORT = process.env?.SERVER_PORT || 0
const sysConfig = {
    BASE_PATH,
    USER_PASSWORD_SALT: process.env?.USER_PASSWORD_SALT || 10,
    MAX_UPLOAD_SIZE: process.env?.MAX_UPLOAD_SIZE || '100mb',
    I18N_LOCALES: CONFIG_LOCALES.length > 0 ? CONFIG_LOCALES : ['en_US', 'es_ES'],
    LANG_DATA: langData,
    DB_SQL_LOG: process.env?.DB_SQL_LOG || false,
    DEFAULT_UI_LANGUAGE: process.env?.DEFAULT_UI_LANGUAGE || 'en_US',
    UI_LOGIN_PAGE_TITLE: process.env?.UI_LOGIN_PAGE_TITLE || 'Login',
    UI_APP_TITLE: process.env?.UI_APP_TITLE || 'Application',
    UI_APP_COLOR: process.env?.UI_APP_COLOR || '#007bff',
    UI_COMPANY_NAME: process.env?.UI_COMPANY_NAME || 'Company',
    UI_COMPANY_WEBSITE: process.env?.UI_COMPANY_WEBSITE || 'https://company.com',
    UI_LICENSE_YEAR: process.env?.UI_LICENSE_YEAR || `${new Date().getFullYear()}-Today`,
    UI_VERSION_NUMBER: process.env?.UI_VERSION_NUMBER || '1.0.0',
    SERVER_PORT,
    SERVER_BASE_URL: process.env?.SERVER_BASE_URL || `http://localhost:${SERVER_PORT}`,
    SECRET: process.env?.SECRET,
    RPC_API_SECRET: process.env?.RPC_API_SECRET
}

export default sysConfig
