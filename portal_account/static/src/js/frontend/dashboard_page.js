import { reloadReceptionsCountKpis } from './kpis/receptions_count';
import { reloadExpeditionsCountKpis } from './kpis/expeditions_count';
import { reloadReceptionsChartKpis } from './kpis/receptions_chart';
import { reloadExpeditionsChartKpis } from './kpis/expeditions_chart';


const reloadDashboardPage = async () => {
    await reloadReceptionsCountKpis();
    await reloadExpeditionsCountKpis();
    await reloadReceptionsChartKpis();
    await reloadExpeditionsChartKpis();
}

document.addEventListener('DOMContentLoaded', () => {
    reloadDashboardPage();
});
