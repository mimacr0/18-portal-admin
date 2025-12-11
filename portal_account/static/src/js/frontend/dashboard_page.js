import { reloadReceptionsCountKpis } from './kpis/receptions_count';
import { reloadExpeditionsCountKpis } from './kpis/expeditions_count';
import { reloadReceptionsChartKpis } from './kpis/receptions_chart';
import { reloadExpeditionsChartKpis } from './kpis/expeditions_chart';
import { updateAccountCreditKpis } from './kpis/credit_kpi';
import { updateAccountQuickActionssKpis } from './kpis/quick_actions_kpi';
import { initRecentActivityKpis } from './kpis/recent_activity_kpi';
import { initDashboardStatsKpi } from './kpis/stats_kpi';

// Export necessary functions for other modules to use
export { reloadReceptionsCountKpis, reloadExpeditionsCountKpis };

// Current selected period
let currentPeriod = '7d';

const reloadChartsWithPeriod = async (period) => {
    currentPeriod = period;
    await Promise.all([
        reloadReceptionsChartKpis(period),
        reloadExpeditionsChartKpis(period)
    ]);
};

const reloadDashboardPage = async () => {
    reloadReceptionsCountKpis();
    reloadExpeditionsCountKpis();
    reloadChartsWithPeriod(currentPeriod);
    updateAccountCreditKpis();
    updateAccountQuickActionssKpis();
    initRecentActivityKpis();
    initDashboardStatsKpi();
};

const initPeriodSelector = () => {
    const periodButtons = document.querySelectorAll('.dashboard-period-btn');
    
    periodButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const period = e.currentTarget.dataset.period;
            
            // Update button styles
            periodButtons.forEach(b => {
                b.classList.remove('bg-primary-theme', 'text-white');
                b.classList.add('text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            });
            e.currentTarget.classList.add('bg-primary-theme', 'text-white');
            e.currentTarget.classList.remove('text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            
            // Reload charts with new period
            await reloadChartsWithPeriod(period);
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const availableCreditElement = document.querySelector('#dashboard-page-available-credit-value');
    if(!availableCreditElement) return;
    
    initPeriodSelector();
    reloadDashboardPage();
});
