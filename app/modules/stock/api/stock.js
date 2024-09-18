
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class StockRPCClient extends WebServiceRPC {

    async searchReadStock(user, options) {
        return await this._request(user, 'stock/list', options)
    }

}

export const stockClient = new StockRPCClient('erp')