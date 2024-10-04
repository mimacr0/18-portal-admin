
import { ToolAction } from './tools.js'

export class ToolLinkAction extends ToolAction {
    get js() {
        return false
    }
    get html() {
        return 'link'
    }
    get new() {
        if(typeof this.data?.new == 'undefined') return true
        return this.data.new ? true : false
    }
}