
const initPortalCustomerData = async () => {
    const res = await jsonGet('/dashboard/init/kpi/data/titles')
    if(res?.status != 'success') return
    const data = res.data
    await jsonGet('/dashboard/init/kpi/data/action', data.kpis)
    await jsonGet('/dashboard/init/expeditions/data/action', data.expeditions)
    await jsonGet('/dashboard/init/receptions/data/action', data.receptions)
    await jsonGet('/dashboard/init/stock/data/action', data.stock)
    await jsonGet('/dashboard/init/storage/data/action', data.storage)
    await jsonGet('/dashboard/init/repairs/data/action', data.repairs)
    await jsonGet('/dashboard/init/spareparts/data/action', data.spareparts)
    await jsonGet('/dashboard/init/invoices/data/action', data.invoices)
    window.location.href = '/?loaded=1'
}

initPortalCustomerData()