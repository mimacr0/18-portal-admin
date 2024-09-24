
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class SyncRPCClient extends WebServiceRPC {

    async getUsersList(options) {
        return await this._request('users/list', options)
    }

}

export const syncClient = new SyncRPCClient('erp')
