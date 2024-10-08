
import fs from 'fs/promises'
import jwt from 'jsonwebtoken'
import path from 'path'
import util from 'util'

import { ConfigConf } from '../../modules/base/models/config.js'
import { SysValue } from '../../modules/base/models/base.js'
import { Logger } from '../../tools/log.js'
import sysConfig from '../../etc/sys.js'

export class WebServiceRPC {

    constructor(page) {
        this.pageConfig = page
    }

    async _getConnectionData() {
        const connections = await ConfigConf.getByKey('api.rpc.connections')
        const conf = await ConfigConf.getByKeys({
            gl: 'pages.global',
            pc: this.pageConfig
        })

        const connKey = conf?.pc?.rpc || conf?.gl?.rpc

        if(!connKey) return { status: 'error', message: 'Connection not found' }

        const data = connections[connKey]

        Logger.debug('Connection:', data)

        if(!data) return { status: 'error', message: 'Connection not found' }
        if(!data?.url) return { status: 'error', message: 'Connection URL not found' }
        if(!data?.client) return { status: 'error', message: 'Connection client not found' }

        return { status: 'success', data: { ...data, connKey } }
    }

    async requestToken(data) {
        const keyPath = path.join(sysConfig.BASE_PATH, 'security', 'id_rsa.key')
        const key = await fs.readFile(keyPath)

        const token = await util.promisify(jwt.sign)({}, key, { expiresIn: '10m', algorithm: 'RS256' })
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.client},${token}` }
        const url = this.joinURL(data.url, 'auth/login')

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({})
            })
            const json = await response.json()

            Logger.debug('Response:', json?.result || json?.error)

            const newToken = json?.result?.token

            if(!newToken) return { status: 'error', message: 'Error during request' }

            await SysValue.setByKey(`rpc_api_${data.connKey}`, { token: newToken })

            Logger.debug('Token:', newToken)
            return { status: 'success', token: newToken }
        } catch (error) {
            Logger.error('Error during request:', error.message)
            return { status: 'error', message: 'Error during request' }
        }
    }

    joinURL(...parts) {
        return parts.join('/').replace(/([^:]\/)\/+/g, '$1')
    }

    async request(endpoint, data={}, options = {}) {

        if(typeof data !== 'object') throw new Error('Invalid data')

        const connResult = await this._getConnectionData()

        if(connResult?.status !== 'success') return connResult

        const connData = connResult.data

        const tokenCache = await SysValue.getByKey(`rpc_api_${connData.connKey}`)

        let token = false

        if(tokenCache?.token) token = tokenCache.token

        Logger.debug('Request:', endpoint, data, options, this.token)

        if(!token) {
            const loginRes = await this.requestToken(connData)
            if(loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
            token = loginRes.token
        }

        const { method = 'POST' } = options
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

        try {
            const url = this.joinURL(connData.url, endpoint)
            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(data)
            })

            const json = await response.json()

            Logger.debug('Response:', json?.result || json?.error)

            const debug = json?.error?.data?.debug

            if(debug) Logger.error('Error:', debug)

            if(json?.error) return { status: 'error', message: 'Error during request' }

            const result = json.result

            if (result?.code === 401) {
                const loginRes = await this.requestToken(connData)
                if(loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
                this.token = loginRes.token
                return await this.request(endpoint, data, options)
            }

            if(result?.status !== 'success') {
                await SysValue.setByKey(`rpc_api_${connData.connKey}`, { token: null })
                return { status: 'error', message: 'Error during request' }
            }

            if(result?.status !== 'success') return result

            return result
        } catch (error) {
            Logger.error('Error during request:', error.message)
            return { status: 'error', message: 'Error during request' }
        }

    }

}