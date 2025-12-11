/** @odoo-module **/

import { rpc } from "@web/core/network/rpc";

/**
 * Initialize dashboard stats KPIs (Receptions, Expeditions, Products, Stock)
 */
export const initDashboardStatsKpi = async () => {
    // Check if we're on the dashboard page
    const receptionsTotal = document.getElementById('dashboard-kpi-receptions-total');
    if (!receptionsTotal) return;

    try {
        const response = await rpc('/account/dashboard/kpis/stats', {});
        
        if (response?.status === 'success') {
            // Update KPI cards
            updateKpiCard('receptions', response.receptions);
            updateKpiCard('expeditions', response.expeditions);
            updateKpiCard('sales', response.sales);
            updateKpiCard('products', response.products);
            // updateKpiCard('stock', response.stock); // Stock card is hidden
            
            // Update chart totals (if they exist)
            updateChartTotal('receptions', response.receptions);
            updateChartTotal('expeditions', response.expeditions);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Show error state
        ['receptions', 'expeditions', 'sales', 'products'].forEach(kpi => {
            const totalEl = document.getElementById(`dashboard-kpi-${kpi}-total`);
            const changeEl = document.getElementById(`dashboard-kpi-${kpi}-change`);
            if (totalEl) totalEl.textContent = '-';
            if (changeEl) {
                changeEl.innerHTML = '<span class="text-gray-400">Error loading data</span>';
            }
        });
    }
};

/**
 * Update a single KPI card with data
 */
function updateKpiCard(kpiName, data) {
    const totalEl = document.getElementById(`dashboard-kpi-${kpiName}-total`);
    const changeEl = document.getElementById(`dashboard-kpi-${kpiName}-change`);
    
    if (!totalEl || !changeEl) return;
    
    // Update total with animation
    totalEl.textContent = formatNumber(data.total);
    
    // Update change percentage
    const isPositive = data.change >= 0;
    const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const changeValue = Math.abs(data.change);
    
    changeEl.className = `text-xs ${colorClass}`;
    changeEl.innerHTML = `<i class="fas ${icon} mr-1"></i>${changeValue}% since last month`;
}

/**
 * Update chart total display
 */
function updateChartTotal(kpiName, data) {
    const totalEl = document.getElementById(`dashboard-chart-${kpiName}-total`);
    const changeEl = document.getElementById(`dashboard-chart-${kpiName}-change`);
    
    if (!totalEl || !changeEl) return;
    
    // Update total
    totalEl.textContent = formatNumber(data.total);
    
    // Update change percentage
    const isPositive = data.change >= 0;
    const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const changeValue = Math.abs(data.change);
    
    changeEl.className = `text-sm ml-2 ${colorClass}`;
    changeEl.innerHTML = `<i class="fas ${icon} mr-1"></i>${changeValue}%`;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
}

