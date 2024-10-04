
import { BaseAction } from './base.js'

export class ListAction extends BaseAction {
    constructor(data, index, ctx) {
        super(data, index, 'list', ctx)
    }
    get label() {
        return this.card.page.translate(this.data.label)
    }
}