
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class ReceptionsRPCClient extends WebServiceRPC {

    async searchReadReceptions(options) {
        return await this._request('receptions/list', options)
    }

}

export const receptionsClient = new ReceptionsRPCClient('erp')