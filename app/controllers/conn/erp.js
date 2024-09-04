
class ERPConn {
    constructor() {}

    async getExpeditions() {
        const result = await fetch('http://localhost:8239/customer/portal/api/stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getExpeditions'
            })
        })
        return await result.json()
    }

    async getStock() {
        const result = await fetch('http://localhost:8239/customer/portal/api/stock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getExpeditions'
            })
        })
        return await result.json()
    }
}

export const erpConn = new ERPConn()
