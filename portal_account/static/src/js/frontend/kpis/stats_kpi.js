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
            const t = response.translations || {};
            
            // Update KPI cards
            updateReceptionsKpiCard(response.receptions, t);
            updateKpiCard('expeditions', response.expeditions, t);
            updateKpiCard('quotes', response.quotes, t);
            updateKpiCard('sales', response.sales, t);
            updateProductsKpiCard(response.products, t);
            // updateKpiCard('stock', response.stock, t); // Stock card is hidden
            
            // Update chart totals (if they exist)
            updateChartTotal('receptions', response.receptions);
            updateChartTotal('expeditions', response.expeditions);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Show error state for standard KPIs
        ['expeditions', 'quotes', 'sales'].forEach(kpi => {
            const totalEl = document.getElementById(`dashboard-kpi-${kpi}-total`);
            const changeEl = document.getElementById(`dashboard-kpi-${kpi}-change`);
            if (totalEl) totalEl.textContent = '-';
            if (changeEl) {
                changeEl.innerHTML = '<span class="text-gray-400">Error</span>';
            }
        });
        // Show error state for receptions KPI
        ['receptions-arrived', 'receptions-pending', 'receptions-total'].forEach(id => {
            const el = document.getElementById(`dashboard-kpi-${id}`);
            if (el) el.textContent = '-';
        });
        // Show error state for products KPI
        ['products-total', 'products-new', 'products-in-stock', 'products-out-stock'].forEach(id => {
            const el = document.getElementById(`dashboard-kpi-${id}`);
            if (el) el.textContent = '-';
        });
    }
};

/**
 * Update a single KPI card with data
 */
function updateKpiCard(kpiName, data, t = {}) {
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
    const sinceText = t.since_last_month || 'since last month';
    
    changeEl.className = `text-xs ${colorClass}`;
    changeEl.innerHTML = `<i class="fas ${icon} mr-1"></i>${changeValue}% ${sinceText}`;
}

/**
 * Update Receptions KPI card with extended data
 */
function updateReceptionsKpiCard(data, t = {}) {
    // Arrived this month
    const arrivedEl = document.getElementById('dashboard-kpi-receptions-arrived');
    if (arrivedEl) arrivedEl.textContent = formatNumber(data.arrived);
    
    // Change percentage for arrived
    const changeEl = document.getElementById('dashboard-kpi-receptions-change');
    if (changeEl) {
        const isPositive = data.change >= 0;
        const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
        const changeValue = Math.abs(data.change);
        changeEl.className = `text-xs ${colorClass}`;
        changeEl.innerHTML = `<i class="fas ${icon} mr-1"></i>${changeValue}%`;
    }
    
    // Pending
    const pendingEl = document.getElementById('dashboard-kpi-receptions-pending');
    if (pendingEl) pendingEl.textContent = formatNumber(data.pending);
    
    // Total historical
    const totalEl = document.getElementById('dashboard-kpi-receptions-total');
    if (totalEl) totalEl.textContent = formatNumber(data.total);
}

/**
 * Update Products KPI card with extended data
 */
function updateProductsKpiCard(data, t = {}) {
    // Total products
    const totalEl = document.getElementById('dashboard-kpi-products-total');
    if (totalEl) totalEl.textContent = formatNumber(data.total);
    
    // New products this month
    const newEl = document.getElementById('dashboard-kpi-products-new');
    if (newEl) newEl.textContent = formatNumber(data.new);
    
    // Change percentage for new products
    const changeEl = document.getElementById('dashboard-kpi-products-change');
    if (changeEl) {
        const isPositive = data.change >= 0;
        const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
        const changeValue = Math.abs(data.change);
        changeEl.className = `text-xs ${colorClass}`;
        changeEl.innerHTML = `<i class="fas ${icon} mr-1"></i>${changeValue}%`;
    }
    
    // Products in stock
    const inStockEl = document.getElementById('dashboard-kpi-products-in-stock');
    if (inStockEl) inStockEl.textContent = formatNumber(data.in_stock);
    
    // Products out of stock
    const outStockEl = document.getElementById('dashboard-kpi-products-out-stock');
    if (outStockEl) outStockEl.textContent = formatNumber(data.out_stock);
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

