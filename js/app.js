/**
 * app.js — Main application: map, markers, search, filters, pin placement
 * Supabase-backed version
 */

const App = (() => {
    const CAYMAN_CENTER = [19.32, -81.24];
    const CAYMAN_ZOOM = 11;

    let map, markerCluster, markers = {};
    let placeMode = null;
    let currentFilters = {};
    let editingCustomerId = null;

    // Color by Customer Type
    const TYPE_COLORS = {
        'Residential- Bulk': '#4caf50', 'Residential- 100lb': '#2196f3',
        'Residential- Meter': '#03a9f4', 'Residential- 20lb Delivery': '#00bcd4',
        'Residential': '#03a9f4', 'Commercial- Bulk': '#ff9800',
        'Commercial- 100lb': '#ef6c00', 'Commercial- Meter': '#e65100',
        'Commercial- 20lb Delivery': '#ff5722', 'Commercial- Forklift': '#9c27b0',
        'Commercial- Projects': '#7b1fa2', 'Commercial': '#ff5722'
    };

    function getMarkerColor(c) {
        if (c.customer_type && TYPE_COLORS[c.customer_type]) return TYPE_COLORS[c.customer_type];
        if (c.customer_type) {
            const ct = c.customer_type.toLowerCase();
            if (ct.includes('forklift')) return '#9c27b0';
            if (ct.includes('commercial')) return '#ff9800';
            if (ct.includes('bulk')) return '#4caf50';
            if (ct.includes('100lb')) return '#2196f3';
        }
        return '#999';
    }

    function createIcon(color, isInactive) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:14px;height:14px;background:${color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);opacity:${isInactive ? '0.5' : '1'};"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10]
        });
    }

    // ===== Init =====
    async function init() {
        // Show loading
        document.getElementById('customerCount').textContent = '(loading...)';

        // Init map
        map = L.map('map', { center: CAYMAN_CENTER, zoom: CAYMAN_ZOOM, minZoom: 8, maxZoom: 19 });

        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
        });
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 19
        });
        streetLayer.addTo(map);
        L.control.layers({ 'Street Map': streetLayer, 'Satellite': satelliteLayer }, null, { position: 'topright' }).addTo(map);

        markerCluster = L.markerClusterGroup({
            maxClusterRadius: 50, spiderfyOnMaxZoom: true,
            showCoverageOnHover: false, chunkedLoading: true,
            chunkInterval: 100, chunkDelay: 10
        });
        map.addLayer(markerCluster);
        map.on('click', onMapClick);

        bindEvents();

        // Load data from Supabase
        try {
            await DataStore.load();
            refreshAll();
            await refreshLastUpload();
        } catch (err) {
            console.error('Init error:', err);
            document.getElementById('customerCount').textContent = '(error loading)';
        }
    }

    // ===== Events =====
    function bindEvents() {
        document.getElementById('btnImport').addEventListener('click', () => document.getElementById('csvFileInput').click());
        document.getElementById('csvFileInput').addEventListener('change', handleCSVImport);
        document.getElementById('btnExport').addEventListener('click', () => DataStore.downloadCSV());
        document.getElementById('btnAddCustomer').addEventListener('click', () => openModal());
        document.getElementById('btnClearData').addEventListener('click', async () => {
            if (confirm('Clear ALL customer data from the database? This cannot be undone.')) {
                await DataStore.clearAll();
                refreshAll();
            }
        });
        document.getElementById('searchInput').addEventListener('input', debounce(onSearch, 300));

        ['filterActive', 'filterCustomerType', 'filterZone', 'filterPricing', 'filterTankSize'].forEach(id => {
            document.getElementById(id).addEventListener('change', onFilterChange);
        });

        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('btnCancelModal').addEventListener('click', closeModal);
        document.getElementById('customerForm').addEventListener('submit', onFormSubmit);
        document.getElementById('btnDeleteCustomer').addEventListener('click', onDeleteCustomer);
        document.getElementById('customerModal').addEventListener('click', (e) => {
            if (e.target.id === 'customerModal') closeModal();
        });
        document.getElementById('placeCancelBtn').addEventListener('click', cancelPlaceMode);
    }

    // ===== CSV Import =====
    async function handleCSVImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const existing = DataStore.getAll().length;
        if (existing > 0 && !confirm(`This will replace the ${existing} customers currently loaded.\n\nProceed with import?`)) {
            e.target.value = '';
            return;
        }

        document.getElementById('customerCount').textContent = '(importing...)';

        try {
            const result = await DataStore.importCSV(file, (msg) => {
                document.getElementById('customerCount').textContent = `(${msg})`;
            });
            alert(
                `Import Complete!\n\n` +
                `Total imported: ${result.imported}\n` +
                `Active locations: ${result.active}\n` +
                `With GPS: ${result.mapped}\n` +
                `Need coordinates: ${result.unmapped}`
            );
            refreshAll();
            await refreshLastUpload();
        } catch (err) {
            alert('Import failed: ' + err.message);
        }
        e.target.value = '';
    }

    // ===== Last Upload =====
    async function refreshLastUpload() {
        const upload = await DataStore.getLastUpload();
        const el = document.getElementById('statLastUpload');
        if (upload) {
            const d = new Date(upload.uploaded_at);
            el.textContent = d.toLocaleDateString('en-KY', { year: 'numeric', month: 'short', day: 'numeric' });
            el.title = `${upload.filename} — ${upload.row_count} rows`;
        } else {
            el.textContent = '—';
        }
    }

    // ===== Refresh =====
    function refreshAll() {
        refreshFilters();
        refreshMarkers();
        refreshStats();
        refreshUnmapped();
        refreshCustomerList();
    }

    function refreshFilters() {
        populateFilter('filterCustomerType', DataStore.getUniqueValues('customer_type'), 'All Types');
        populateFilter('filterZone', DataStore.getUniqueValues('zone'), 'All Zones');
        populateFilter('filterPricing', DataStore.getUniqueValues('pricing_descriptions'), 'All Pricing');
        populateFilter('filterTankSize', DataStore.getUniqueValues('actual_tank_sizes'), 'All Sizes');
    }

    function populateFilter(selectId, values, defaultLabel) {
        const el = document.getElementById(selectId);
        const current = el.value;
        const firstOpt = el.options[0];
        el.innerHTML = '';
        el.appendChild(firstOpt);
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v; opt.textContent = v;
            if (v === current) opt.selected = true;
            el.appendChild(opt);
        });
    }

    function onFilterChange() {
        currentFilters = {
            active: document.getElementById('filterActive').value,
            customer_type: document.getElementById('filterCustomerType').value,
            zone: document.getElementById('filterZone').value,
            pricing: document.getElementById('filterPricing').value,
            tank_size: document.getElementById('filterTankSize').value
        };
        refreshMarkers();
        refreshCustomerList();
        refreshStats();
    }

    function getFilteredCustomers() {
        const query = document.getElementById('searchInput').value;
        let results = query ? DataStore.search(query) : DataStore.getAll();
        return results.filter(c => {
            if (currentFilters.active === 'active' && !c.is_active) return false;
            if (currentFilters.active === 'inactive' && c.is_active) return false;
            if (currentFilters.customer_type && c.customer_type !== currentFilters.customer_type) return false;
            if (currentFilters.zone && c.zone !== currentFilters.zone) return false;
            if (currentFilters.pricing && c.pricing_descriptions !== currentFilters.pricing) return false;
            if (currentFilters.tank_size && c.actual_tank_sizes !== currentFilters.tank_size) return false;
            return true;
        });
    }

    // ===== Markers =====
    function refreshMarkers() {
        markerCluster.clearLayers();
        markers = {};
        const filtered = getFilteredCustomers().filter(c => c.latitude && c.longitude);
        const arr = [];
        filtered.forEach(c => {
            const marker = L.marker([c.latitude, c.longitude], { icon: createIcon(getMarkerColor(c), !c.is_active) });
            marker.bindTooltip(PopupBuilder.buildTooltip(c), { direction: 'top', offset: [0, -10] });
            marker.bindPopup(PopupBuilder.build(c), { maxWidth: 340, closeButton: true });
            markers[c.id] = marker;
            arr.push(marker);
        });
        markerCluster.addLayers(arr);
    }

    function refreshStats() {
        const all = DataStore.getAll();
        const filtered = getFilteredCustomers();
        document.getElementById('statTotal').textContent = all.length;
        document.getElementById('statActive').textContent = DataStore.getActive().length;
        document.getElementById('statMapped').textContent = DataStore.getMapped().length;
        document.getElementById('statUnmapped').textContent = DataStore.getUnmapped().length;
        document.getElementById('statShowing').textContent = filtered.filter(c => c.latitude && c.longitude).length;
    }

    function refreshUnmapped() {
        const unmapped = DataStore.getUnmapped().filter(c => c.is_active);
        const panel = document.getElementById('unmappedPanel');
        const list = document.getElementById('unmappedList');
        if (unmapped.length === 0) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';
        list.innerHTML = '';
        unmapped.slice(0, 50).forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<div class="customer-name">${esc(c.customer_name)}</div>
                <div class="customer-detail">${esc(c.full_address || c.address || 'No address')} | #${esc(c.account)}</div>`;
            li.addEventListener('click', () => enterPlaceMode(c));
            if (placeMode && placeMode.customerId === c.id) li.classList.add('active');
            list.appendChild(li);
        });
        if (unmapped.length > 50) {
            const li = document.createElement('li');
            li.innerHTML = `<div class="customer-detail" style="text-align:center;">...and ${unmapped.length - 50} more</div>`;
            list.appendChild(li);
        }
    }

    function refreshCustomerList() {
        const filtered = getFilteredCustomers();
        const list = document.getElementById('customerList');
        document.getElementById('customerCount').textContent = `(${filtered.length})`;
        list.innerHTML = '';
        filtered.slice(0, 200).forEach(c => {
            const li = document.createElement('li');
            const icon = (c.latitude && c.longitude) ? '&#128205;' : '&#9888;';
            const inactive = c.is_active ? '' : ' style="opacity:0.5"';
            li.innerHTML = `<div class="customer-name"${inactive}>${icon} ${esc(c.customer_name)} <span style="color:#aaa;font-size:11px;">#${esc(c.account)}</span></div>
                <div class="customer-detail">${esc(c.customer_type || '')} | ${esc(c.zone || '')} | ${esc(c.pricing_descriptions || '')}</div>`;
            li.addEventListener('click', () => flyToCustomer(c));
            list.appendChild(li);
        });
        if (filtered.length > 200) {
            const li = document.createElement('li');
            li.innerHTML = `<div class="customer-detail" style="text-align:center;">Showing 200 of ${filtered.length} — use search to narrow down</div>`;
            list.appendChild(li);
        }
    }

    function flyToCustomer(c) {
        if (c.latitude && c.longitude) {
            map.flyTo([c.latitude, c.longitude], 17, { duration: 0.8 });
            const m = markers[c.id];
            if (m) setTimeout(() => m.openPopup(), 900);
        } else { enterPlaceMode(c); }
    }

    function onSearch() { refreshMarkers(); refreshCustomerList(); refreshStats(); }

    // ===== Place Mode =====
    function enterPlaceMode(c) {
        placeMode = { customerId: c.id, customerName: c.customer_name };
        document.getElementById('placeBanner').style.display = 'flex';
        document.getElementById('placeName').textContent = c.customer_name;
        document.getElementById('map').style.cursor = 'crosshair';
        refreshUnmapped();
    }

    function cancelPlaceMode() {
        placeMode = null;
        document.getElementById('placeBanner').style.display = 'none';
        document.getElementById('map').style.cursor = '';
        refreshUnmapped();
    }

    async function onMapClick(e) {
        if (!placeMode) return;
        const { lat, lng } = e.latlng;
        await DataStore.update(placeMode.customerId, {
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lng.toFixed(6))
        });
        cancelPlaceMode();
        refreshAll();
    }

    // ===== Modal =====
    function openModal(customerId) {
        editingCustomerId = customerId || null;
        const form = document.getElementById('customerForm');
        form.reset();
        if (customerId) {
            document.getElementById('modalTitle').textContent = 'Edit Customer';
            document.getElementById('btnDeleteCustomer').style.display = 'block';
            const c = DataStore.getById(customerId);
            if (c) {
                for (const [key, val] of Object.entries(c)) {
                    const input = form.elements[key];
                    if (input && val != null) input.value = val;
                }
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Add Customer';
            document.getElementById('btnDeleteCustomer').style.display = 'none';
        }
        document.getElementById('customerModal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('customerModal').style.display = 'none';
        editingCustomerId = null;
    }

    async function onFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const data = {};
        const fields = [
            'account', 'location_number', 'last_name', 'first_name',
            'address', 'address2', 'city', 'zip', 'zone',
            'customer_type', 'phones', 'phone_descriptions',
            'latitude', 'longitude',
            'actual_tank_sizes', 'lp_tank_sizes', 'serial_number', 'company_owned_tanks',
            'delivery_status', 'last_delivery_date', 'driver_instructions'
        ];
        fields.forEach(f => {
            let val = form.elements[f] ? form.elements[f].value.trim() : '';
            if (f === 'latitude' || f === 'longitude') { val = val ? parseFloat(val) : null; }
            data[f] = val || null;
        });
        data.location_active = 'true';

        if (editingCustomerId) {
            await DataStore.update(editingCustomerId, data);
        } else {
            await DataStore.add(data);
        }
        closeModal();
        refreshAll();
    }

    async function onDeleteCustomer() {
        if (!editingCustomerId) return;
        if (confirm('Delete this customer? This cannot be undone.')) {
            await DataStore.remove(editingCustomerId);
            closeModal();
            refreshAll();
        }
    }

    function editCustomer(id) { map.closePopup(); openModal(id); }
    function getDirections(lat, lng) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }

    function esc(str) {
        if (str == null) return '';
        const d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }
    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }

    document.addEventListener('DOMContentLoaded', init);
    return { editCustomer, getDirections };
})();
