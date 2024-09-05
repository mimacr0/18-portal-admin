
import { Logger } from '../../tools/log.js'
import { ConfigConf } from '../../modules/base/models/config.js'

class ERPConn {
    constructor() {
        this.connected = false
        this.url = ''
        this.token = ''
    }

    async connect() {
        if(this.connected) return { status: 'success', message: 'Already connected' }

        const pconf = await ConfigConf.getByKeys({
            gl: 'pages.global',
            conn: 'api.connections'
        })

        const conn = Object.entries(pconf?.conn).reduce((acc, [key, value]) => {
            if(key == pconf?.gl?.api?.ws) return value;
            return acc;
        }, null)

        if(!conn) return { status: 'error', message: 'Connection not found' }

        if(!conn?.url || !conn?.token) return { status: 'error', message: 'Invalid connection' }

        this.url = conn.url.replace(/\/$/, '')
        this.token = conn.token

        this.connected = true

        return { status: 'success', message: 'Connected' }
    }

    async query(endpoint, data) {
        if(!this.connected) return { status: 'error', message: 'Not connected' }

        try {
            const result = await fetch(`${this.url}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data || {})
            })

            if(!result.ok) return { status: 'error', message: 'Failed to fetch', code: result.status }

            const r = await result.json()

            if(r?.error) {
                Logger.error(r.error)
                return { status: 'error', message: r.error }
            }

            return r.result
        } catch (error) {
            Logger.error(error)
            return { status: 'error', message: error.message }
        }
    }

}

export const erpConn = new ERPConn()
