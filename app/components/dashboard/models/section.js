
export class Section {
    constructor(data, index, page) {
        this.index = index
        this.data = data
        this.page = page
    }
    get num() {
        return this.index + 1
    }
    get class() {
        return this.data?.class || ''
    }
    get status() {
        return this.data?.status || []
    }
}