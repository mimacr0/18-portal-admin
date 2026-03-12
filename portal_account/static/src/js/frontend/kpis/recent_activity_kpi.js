import { rpc } from "@web/core/network/rpc";


export const reloadRecentActivityKpis = async () => {
    const res = await rpc('/account/dashboard/kpis/recent_activity');
    if(res?.status !== 'success') return;

    const container = document.getElementById('dashboard-page-recent-activity-container');
    if (!container) return;

    container.innerHTML = res.html;
}


export const initRecentActivityKpis = async () => {
    const container = document.getElementById('dashboard-page-recent-activity-container');
    if (!container) return;

    reloadRecentActivityKpis();
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('portal.system.user.recent_activity', () => {
        reloadRecentActivityKpis();
    });
});
