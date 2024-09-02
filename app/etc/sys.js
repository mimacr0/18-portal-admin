import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const BASE_PATH = path.resolve(__dirname, '..')

export const USER_PASSWORD_SALT = 10

export const MAX_UPLOAD_SIZE = '100mb'

export const DEFAULT_UI_LANGUAGE = 'en'
export const UI_LOGIN_PAGE_TITLE = "Login"
export const UI_APP_TITLE = "Mimacro"
export const UI_APP_COLOR = "#2589bb"
export const UI_COMPANY_NAME = "Mimacro"
export const UI_COMPANY_WEBSITE = "https://mimacro.com"
export const UI_LICENSE_YEAR = "2023-Today"
export const UI_VERSION_NUMBER = "1.0.0"
