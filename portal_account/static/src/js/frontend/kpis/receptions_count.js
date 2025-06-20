import { rpc } from "@web/core/network/rpc";

export const reloadReceptionsCountKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/receptions/count');
    if(res?.status != 'success') return;

    sysToolsUdateNumber('#dashboard-total-receptions-value', res.count);
}
