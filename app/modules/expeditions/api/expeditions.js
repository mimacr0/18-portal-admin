
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class ExpeditionsRPCClient extends WebServiceRPC {

    async searchReadExpeditions(options) {
        return await this._request('expeditions/list', options)
    }

}

export const expeditionsClient = new ExpeditionsRPCClient('erp')