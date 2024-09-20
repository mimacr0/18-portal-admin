
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class StockRPCClient extends WebServiceRPC {

    async searchReadStock(options) {
        return await this._request('stock/list', options)
    }

}

export const stockClient = new StockRPCClient('erp')