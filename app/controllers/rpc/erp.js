import util from 'util'
import jwt from 'jsonwebtoken'

import { ConfigConf } from '../../modules/base/models/config.js'
import { SysValue } from '../../modules/base/models/base.js'
import { Logger } from '../../tools/log.js'

export class WebServiceRPC {
    constructor(conn) {
        this.conn = conn
        this.user = null
        this.token = null
    }

    async _getConnectionData() {
        const pconf = await ConfigConf.getByKeys({
            gl: 'pages.global',
            conn: 'api.rpc.connections'
        })

        const connRef = this.conn

        const conn = Object.entries(pconf?.conn).reduce((acc, [key, value]) => {
            if(key == connRef) return value
            return acc
        }, null)

        if(!conn) return { status: 'error', message: 'Connection not found' }

        return conn
    }

    async requestToken(user) {
        const conn = await this._getConnectionData()

        this.token = await util.promisify(jwt.sign)({
            id: user.portalID,
        }, conn.secret, { expiresIn: '1h' })

        await SysValue.setByKey('wsrpc.conn.data', { token: this.token })

        Logger.debug('Token:', this.token)

        return { status: 'success', token: this.token }
    }

    joinURL(...parts) {
        return parts.join('/').replace(/([^:]\/)\/+/g, '$1')
    }

    async _request(user, endpoint, data={}, options = {}) {

        const connData = await this._getConnectionData()

        if(connData?.token) this.token = connData.token

        Logger.debug('Request:', endpoint, data, options, this.token)

        if(!this.token) {
            const loginRes = await this.requestToken(user)
            if(loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
        }

        const { method = 'POST' } = options
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` }

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
                const loginRes = await this.requestToken(user)
                if(loginRes.status !== 'success') return { status: 'error', message: 'Login failed' }
                this.token = loginRes.token
                return await this._request(endpoint, data, options)
            }

            if(result?.status !== 'success') return result

            return result
        } catch (error) {
            Logger.error('Error during request:', error.message)
            return { status: 'error', message: 'Error during request' }
        }

    }

    async search(user, model, domain) {
        return await this._request(user, 'ws/search', { model, domain })

    }

    async searchRead(user, model, domain, fields, options={}) {
        return await this._request(user, 'ws/search_read', { model, domain, fields, options })
    }

    async searchCount(user, model, domain) {
        return await this._request(user, 'ws/search_count', { model, domain })
    }

    async create(user, model, values) {
        return await this._request(user, 'ws/create', { model, values })
    }

    async update(user, model, id, values) {
        return await this._request(user, 'ws/update', { model, id, values })
    }

    async delete(user, model, id) {
        return await this._request(user, 'ws/delete', { model, id })
    }

    async call(user, model, id, method, args) {
        return await this._request(user, 'ws/call', { model, id, method, args })
    }
}
