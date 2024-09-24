
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class DashboardRPCClient extends WebServiceRPC {

    async readDashboardsData(options) {
        return await this._request('dashboard/data', options)
    }

}

export const dashboardClient = new DashboardRPCClient('erp')