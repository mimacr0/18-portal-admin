odoo.define('portal_reception.reception_main', function (require) {
    'use strict';

    const ajax = require('web.ajax');
    const core = require('web.core');
    const publicWidget = require('web.public.widget');
    const _t = core._t;
    const ListFetchMixin = require('portal_admin_theme.list_fetch_mixin');
    const ListAdvancedSearchMixin = require('portal_admin_theme.list_advanced_search_mixin');

    publicWidget.registry.PortalReceptionList = publicWidget.Widget.extend(ListFetchMixin, ListAdvancedSearchMixin, {
        selector: '.o_portal_wrap',
        events: {
            'click #page-reception-list-filter-all': '_onFilterAll',
            'click #page-reception-list-filter-pending': '_onFilterPending',
            'click #page-reception-list-filter-done': '_onFilterDone',
            'click #reception-list-pagination-next': '_onClickNextPage',
            'click #reception-list-pagination-previous': '_onClickPreviousPage',
            'click .reception-list-pagination-button': '_onClickPage',
            'keyup #page-stock-products-list-search': '_onSearch',
            'click #page-reception-list-advanced-search-toggle': '_onToggleAdvancedSearch',
            'click #page-reception-list-advanced-search-add-line-btn': '_onAddAdvancedSearchLine',
            'click #page-reception-list-advanced-search-apply-btn': '_onApplyAdvancedSearch',
            'click #page-reception-list-advanced-search-reset-btn': '_onResetAdvancedSearch',
            'click #page-list-reception-tools-action-import': '_onOpenImportModal',
            'click #page-list-reception-batch-action-delete': '_onBatchDelete',
            'click #clear-selection': '_onClearSelection',
        },

        init: function () {
            this._super.apply(this, arguments);
            this._currentPage = 1;
            this._sortField = 'name';
            this._sortOrder = 'asc';
            this._searchQuery = '';
            this._quickFilter = 'all';
            this._advancedSearchDomain = [];
            this._advancedSearchMatchType = 'all';
        },

        // Lazy load
        willStart: function () {
            const promises = [this._super.apply(this, arguments)];

            if ($('#reception-page-list-items').length) {
                promises.push(this._fetchListData());
            }

            return Promise.all(promises);
        },

        start: function () {
            return this._super.apply(this, arguments);
        },

        //----------------------------------------------------------------------
        // Private
        //----------------------------------------------------------------------

        /**
         * Fetch and reload list data
         *
         * @private
         * @returns {Promise}
         */
        _fetchListData: function () {
            $('#reception-page-list-items').addClass('busy');
            const data = {
                page: this._currentPage,
                search: this._searchQuery,
                sort: this._sortField,
                order: this._sortOrder,
                domain: this._advancedSearchDomain,
                match_type: this._advancedSearchMatchType,
                quick_filter: this._quickFilter,
            };

            return this._rpc({
                route: '/account/reception/list/reload',
                params: data,
            }).then(response => {
                if (response.status === 'success') {
                    $('#reception-page-list-items').html(response.list);
                    $('#reception-list-pagination-container').html(response.pager);
                }
            }).finally(() => {
                $('#reception-page-list-items').removeClass('busy');
            });
        },

        //----------------------------------------------------------------------
        // Handlers
        //----------------------------------------------------------------------

        _onFilterAll: function (ev) {
            ev.preventDefault();
            this._quickFilter = 'all';
            this._resetTabButtons();
            $(ev.currentTarget).addClass('active');
            this._fetchListData();
        },

        _onFilterPending: function (ev) {
            ev.preventDefault();
            this._quickFilter = 'pending';
            this._resetTabButtons();
            $(ev.currentTarget).addClass('active');
            this._fetchListData();
        },

        _onFilterDone: function (ev) {
            ev.preventDefault();
            this._quickFilter = 'done';
            this._resetTabButtons();
            $(ev.currentTarget).addClass('active');
            this._fetchListData();
        },

        _resetTabButtons: function() {
            $('.tab-button').removeClass('active');
            $('.tab-button').removeClass('border-cyan-500');
            $('.tab-button').removeClass('text-cyan-600');
            $('.tab-button').addClass('border-transparent');
            $('.tab-button').addClass('text-gray-500');
        },

        _onSearch: function(ev) {
            if (ev.keyCode === 13 || !$(ev.currentTarget).val()) {
                this._searchQuery = $(ev.currentTarget).val().trim();
                this._currentPage = 1;
                this._fetchListData();
            }
        },

        _onClickNextPage: function(ev) {
            ev.preventDefault();
            this._currentPage += 1;
            this._fetchListData();
        },

        _onClickPreviousPage: function(ev) {
            ev.preventDefault();
            if (this._currentPage > 1) {
                this._currentPage -= 1;
                this._fetchListData();
            }
        },

        _onClickPage: function(ev) {
            ev.preventDefault();
            this._currentPage = parseInt($(ev.currentTarget).data('page'));
            this._fetchListData();
        },

        _onBatchDelete: function (ev) {
            ev.preventDefault();
            // Get selected ids
            const selectedIds = [];
            $('.packages-list-checkbox:checked').each(function() {
                selectedIds.push($(this).data('package-id'));
            });

            if (selectedIds.length === 0) {
                return;
            }

            if (confirm(_t('Are you sure you want to delete these items?'))) {
                this._rpc({
                    route: '/account/reception/batch/delete',
                    params: {
                        ids: selectedIds,
                    },
                }).then(response => {
                    if (response.status === 'success') {
                        this._fetchListData();
                    }
                });
            }
        },

        _onClearSelection: function (ev) {
            ev.preventDefault();
            // Uncheck all checkboxes
            $('#page-reception-list-select-all-checkbox').prop('checked', false);
            $('.packages-list-checkbox').prop('checked', false);
            $('#bulk-actions-toolbar').addClass('hidden');
        },

        _onOpenImportModal: function (ev) {
            ev.preventDefault();
            $('#file-upload-modal').removeClass('hidden');
        }
    });
});