
import { BaseAction } from './base.js'

export class ToolAction extends BaseAction {
    constructor(data, index, ctx) {
        super(data, index, 'tools', ctx)
    }
}