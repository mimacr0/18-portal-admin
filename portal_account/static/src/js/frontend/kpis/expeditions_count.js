import { rpc } from "@web/core/network/rpc";

export const reloadExpeditionsCountKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/expeditions/count');
    if(res?.status != 'success') return;

    sysToolsUdateNumber('#dashboard-total-expeditions-value', res.count);
}
