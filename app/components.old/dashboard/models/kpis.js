
export class KPI {
    constructor(data) {
        this._data = data
    }
    get class() {
        return this._data?.class || ''
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
    get ref() {
        if(this._data?.ref) throw new Error(`KPI ${this.title} does not have a ref`)
        return this._data?.ref
    }
    get data() {
        return this._data
    }
    formatViewData(kpi) {
        return {
            id: kpi.id,
            type: kpi.type,
            data: kpi.kpi || {}
        }
    }
}

export class stateKPI extends KPI {
    formatViewData(kpi) {
        return {
            id: kpi.id,
            type: kpi.type,
            icon: kpi.kpi?.icon || 'fa fa-question',
            title: kpi.title
        }
    }
}