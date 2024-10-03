
export class KPI {
    constructor(kpi) {
        this._kpi = kpi
        this._data = kpi.data
    }
    get type() {
        return this._data?.type || ''
    }
    get title() {
        return this._data?.title || ''
    }
    get size() {
        return this._data?.size || ''
    }
    get id() {
        return this._kpi.id
    }
    get ref() {
        return this._kpi.ref
    }
}
