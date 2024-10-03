
import util from 'util'
import jwt from 'jsonwebtoken'

import { ConfigConf } from '../../modules/base/models/config.js'
import { SysValue } from '../../modules/base/models/base.js'
import { Logger } from '../../tools/log.js'

export class WebServiceRPC {

    constructor(conn) {
        this.connKey = conn
    }

    async _getConnectionData() {
        const connections = await ConfigConf.getByKey('api.rpc.connections')

        const conn = connections[this.connKey]

        Logger.debug('Connection:', conn)

        if(!conn) return { status: 'error', message: 'Connection not found' }
        if(!conn?.url) return { status: 'error', message: 'Connection URL not found' }
        if(!conn?.secret) return { status: 'error', message: 'Connection secret not found' }
        if(!conn?.client) return { status: 'error', message: 'Connection client not found' }

        return { status: 'success', data: conn }
    }

    async requestToken(data) {
        this.token = await util.promisify(jwt.sign)({ client: data.client }, data.secret, { expiresIn: '1h' })

        await SysValue.setByKey(this.connKey, { token: this.token })

        Logger.debug('Token:', this.token)

        return { status: 'success', token: this.token }
    }

    joinURL(...parts) {
        return parts.join('/').replace(/([^:]\/)\/+/g, '$1')
    }

    async request(endpoint, data={}, options = {}) {

        if(typeof data !== 'object') throw new Error('Invalid data')

        const connResult = await this._getConnectionData()

        if(connResult?.status !== 'success') return connResult

        const connData = connResult.data

        const tokenCache = await SysValue.getByKey(this.connKey)

        if(tokenCache?.token) this.token = tokenCache.token

        Logger.debug('Request:', endpoint, data, options, this.token)

        if(!this.token) {
            const loginRes = await this.requestToken(connData)
            if(loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
        }

        const { method = 'POST' } = options
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }

        try {
            const url = this.joinURL(connData.url, this.baseURL, endpoint)
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

            if(result?.status !== 'success') return result

            return result
        } catch (error) {
            Logger.error('Error during request:', error.message)
            return { status: 'error', message: 'Error during request' }
        }

    }

}