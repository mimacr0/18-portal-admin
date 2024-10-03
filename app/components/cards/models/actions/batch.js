
import { BaseAction } from './base.js'

export class BatchAction extends BaseAction {
    constructor(data, index, ctx) {
        super(data, index, 'batch', ctx)
    }
}