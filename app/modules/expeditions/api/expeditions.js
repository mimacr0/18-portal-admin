
import { WebServiceRPC } from '../../../controllers/rpc/erp.js'


class ExpeditionsRPCClient extends WebServiceRPC {

    async searchReadExpeditions(options) {
        return await this._request('expeditions/list', options)
    }

    async getExpeditionsData(options) {
        return await this._request('expeditions/shipping/data', options)
    }

    async getExpeditionsShippingData(options) {
        return await this._request('expeditions/shipping/address/data', options)
    }

    async getExpeditionsZipCodeData(options) {
        return await this._request('expeditions/zip/find', options)
    }

    async getExpeditionsZipData(options) {
        return await this._request('expeditions/zip/data', options)
    }

    async expeditionsRegisterShippingAddress(options) {
        return await this._request('expeditions/shipping/create', options)
    }

    async expeditionsShippingCreate(options) {
        return await this._request('expeditions/expedition/create', options)
    }

}

export const expeditionsClient = new ExpeditionsRPCClient('erp')