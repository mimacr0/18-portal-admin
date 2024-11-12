
import { RPCAPIConnections } from '../../modules/base/models/base.js'
import sysConfig from '../../etc/sys.js'

export class WebServiceRPC {

    async request(action, data={}) {

        const conn = await RPCAPIConnections.getByCID(sysConfig.ERP_AUTH_CLIENT)

        if(!conn) return { status: 'error', message: 'Connection not found' }

        return await conn.request(action, data)

    }

}