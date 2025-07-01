import { reloadReceptionsCountKpis } from './kpis/receptions_count';
import { reloadExpeditionsCountKpis } from './kpis/expeditions_count';
import { reloadReceptionsChartKpis } from './kpis/receptions_chart';
import { reloadExpeditionsChartKpis } from './kpis/expeditions_chart';
import { updateAccountCreditKpis } from './kpis/credit_kpi';
import { updateAccountQuickActionssKpis } from './kpis/quick_actions_kpi';
import { initRecentActivityKpis } from './kpis/recent_activity_kpi';

// Export necessary functions for other modules to use
export { reloadReceptionsCountKpis, reloadExpeditionsCountKpis };

const reloadDashboardPage = async () => {
    reloadReceptionsCountKpis();
    reloadExpeditionsCountKpis();
    reloadReceptionsChartKpis();
    reloadExpeditionsChartKpis();
    updateAccountCreditKpis();
    updateAccountQuickActionssKpis();
    initRecentActivityKpis();
}

document.addEventListener('DOMContentLoaded', () => {
    const availableCreditElement = document.querySelector('#dashboard-page-available-credit-value');
    if(!availableCreditElement) return;
    reloadDashboardPage();
});
