
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class ExpeditionsRPCClient extends WebServiceRPC {

    async searchReadExpeditions(user, options) {
        return await this._request(user, 'expeditions/list', options)
    }

}

export const expeditionsClient = new ExpeditionsRPCClient('erp')