
import fs from 'fs/promises'
import fss from 'fs'
import jwt from 'jsonwebtoken'
import path from 'path'
import util from 'util'

import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { genMD5 } from '../../../tools/sys.js'
import { Logger } from '../../../tools/log.js'
import { registerEmitter } from '../../../controllers/events/register.js'


export class SysPage extends Model {
    static async getPage(url) {
        const pages = await SysPage.findAll({
            order: [['data.sequence', 'ASC']]
        })
        const page = pages.find(m => m.data.url === url)
        if(!page) throw new Error(`Page "${url}" not found`)
        return { page, pages }
    }
    static async actionRegister(pages) {
        for(const data of pages) {
            const pid = genMD5(data.url)
            const page = await SysPage.findByPk(pid)
            await SysPage.upsert({
                id: pid,
                name: data.name,
                data: {
                    ...page?.data,
                    ...data
                }
            })
            const newPage = await SysPage.findByPk(pid)
            registerEmitter.emit('page register', newPage)
        }
    }
    hasMenu(user) {
        if(!this.data?.icon) return false
        const privilege = this.data?.privilege
        return privilege ? user.hasPrivilege(privilege) : true
    }
}

SysPage.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'sys_page' })


export class SysValue extends Model {
    static async getByKey(key, defaultValue) {
        const value = await SysValue.findByPk(genMD5(key))
        return value ? value.data : defaultValue
    }
    static async setByKey(key, data) {
        const id = genMD5(key)
        await SysValue.upsert({ id, key, data })
        return await SysValue.findByPk(id)
    }
}

SysValue.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'sys_value' })


export class RPCAPIConnections extends Model {
    static async getByCID(cid) {
        const key = await RPCAPIConnections.findOne({ where: { cid } })
        return key ? key : null
    }

    async requestToken() {
        const keyPath = path.join(sysConfig.BASE_PATH, 'security', sysConfig.PRIVATE_KEY_FILE)

        if(!fss.existsSync(keyPath)) {
            Logger.error(`Private key file not found: ${keyPath}`)
            return { status: 'error', message: 'Error during request' }
        }

        const key = await fs.readFile(keyPath)
        const token = await util.promisify(jwt.sign)({}, key, { expiresIn: '10m', algorithm: 'RS256' })
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.cid},${token}` }
        const url = RPCAPIConnections.joinURL(this.data.url, 'auth/login')

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({})
            })
            const json = await response.json()
            const newToken = json?.result?.token
            if (!newToken) return { status: 'error', message: 'Error during request' }
            await SysValue.setByKey(`conn_${this.cid}`, { token: newToken })
            Logger.debug('Token:', newToken)
            return { status: 'success', token: newToken }
        } catch (error) {
            Logger.error('Error during request:', error.message)
            return { status: 'error', message: 'Error during request' }
        }
    }

    static joinURL(...parts) {
        return parts.join('/').replace(/([^:]\/)\/+/g, '$1')
    }

    async request(endpoint, data = {}, options = {}, sysConfig) {
        if (typeof data !== 'object') throw new Error('Invalid data')

        const tokenCache = await SysValue.getByKey(`conn_${this.cid}`)
        let token = tokenCache?.token

        if (!token) {
            const loginRes = await this.requestToken()
            if (loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
            token = loginRes.token
        }

        const { method = 'POST' } = options
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

        try {
            const url = RPCAPIConnections.joinURL(this.data.url, endpoint)
            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(data)
            })

            const json = await response.json()
            const result = json.result

            if (result?.code === 401) {
                const loginRes = await this.requestToken()
                if (loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
                return await this.request(this.cid, endpoint, data, options, sysConfig)
            }

            if (result?.status !== 'success') {
                await SysValue.setByKey(`conn_${this.cid}`, { token: null })
                Logger.error('Error during request:', result)
                return { status: 'error', message: 'Error during request' }
            }

            Logger.debug('Response:', result)

            return result
        } catch (error) {
            Logger.error('Error during request:', error.message)
            return { status: 'error', message: 'Error during request' }
        }
    }
}

RPCAPIConnections.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    cid: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'rpc_api_connections' })


export class RPCAuthorization extends Model {}

RPCAuthorization.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    cid: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'rpc_authorization' })
