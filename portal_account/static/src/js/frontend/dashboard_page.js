import { reloadReceptionsCountKpis } from './kpis/receptions_count';
import { reloadExpeditionsCountKpis } from './kpis/expeditions_count';
import { reloadReceptionsChartKpis } from './kpis/receptions_chart';
import { reloadExpeditionsChartKpis } from './kpis/expeditions_chart';
import { reloadAccountCreditKpis } from './kpis/credit_kpi';

const reloadDashboardPage = async () => {
    await reloadReceptionsCountKpis();
    await reloadExpeditionsCountKpis();
    await reloadReceptionsChartKpis();
    await reloadExpeditionsChartKpis();
    await reloadAccountCreditKpis();
}

document.addEventListener('DOMContentLoaded', () => {
    reloadDashboardPage();
});
