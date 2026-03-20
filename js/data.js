/**
 * data.js — Supabase-backed data layer for Clean Gas Customer Map
 */

const DataStore = (() => {
    let supabase = null;
    let customers = [];      // Local cache
    let cacheLoaded = false;

    // CSV header -> internal field mapping
    const FIELD_MAP = {
        account:              ['account'],
        location_number:      ['location number', 'location_number'],
        address:              ['location street', 'location_street', 'address'],
        address2:             ['location street 2', 'location_street_2'],
        city:                 ['location city', 'location_city', 'city'],
        state:                ['location state', 'location_state', 'state'],
        zip:                  ['location zip', 'location_zip', 'zip'],
        zone_code:            ['zone code', 'zone_code'],
        zone:                 ['zone description', 'zone_description', 'zone'],
        driver_instructions:  ['driver instructions', 'driver_instructions'],
        last_name:            ['last name', 'last_name', 'lastname'],
        first_name:           ['first name', 'first_name', 'firstname'],
        location_active:      ['location active', 'location_active', 'active'],
        latitude:             ['latitude', 'lat'],
        longitude:            ['longitude', 'lng', 'lon', 'long'],
        customer_type_code:   ['customer type code', 'customer_type_code'],
        customer_type:        ['customer type', 'customer_type'],
        phones:               ['location phones', 'location_phones', 'phone', 'phones'],
        phone_descriptions:   ['location phone descriptions', 'location_phone_descriptions'],
        actual_tank_sizes:    ['actual tank sizes', 'actual_tank_sizes'],
        pricing_descriptions: ['pricing descriptions', 'pricing_descriptions'],
        factor:               ['factor'],
        serial_number:        ['serial number', 'serial_number'],
        lp_tank_sizes:        ['lp tank sizes', 'lp_tank_sizes'],
        company_owned_tanks:  ['company owned tanks', 'company_owned_tanks'],
        meter_serial_numbers: ['meter serial numbers', 'meter_serial_numbers'],
        meter_types:          ['meter types', 'meter_types'],
        last_gas_check_dates: ['last gas check dates', 'last_gas_check_dates'],
        meter_install_dates:  ['meter install dates', 'meter_install_dates'],
        recurrent_charge_desc:['recurrent charge descriptions', 'recurrent_charge_descriptions'],
        recurrent_charge_amt: ['recurrent charge amounts', 'recurrent_charge_amounts'],
        recurrent_due_dates:  ['recurrent due dates', 'recurrent_due_dates'],
        recurrent_expire_dates:['recurrent expire dates', 'recurrent_expire_dates'],
        months_between:       ['months between charges', 'months_between_charges'],
        recurrent_notes:      ['recurrent notes', 'recurrent_notes'],
        appliance_serials:    ['appliance serial numbers', 'appliance_serial_numbers'],
        last_delivery_date:   ['last delivery date', 'last_delivery_date'],
        delivery_status:      ['delivery status', 'delivery_status'],
        secondary_delivery_status: ['secondary delivery status', 'secondary_delivery_status']
    };

    // DB columns (all text except lat/lng)
    const DB_FIELDS = Object.keys(FIELD_MAP);

    function init() {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    function matchField(header) {
        const h = header.toLowerCase().trim().replace(/\s+/g, ' ');
        for (const [field, aliases] of Object.entries(FIELD_MAP)) {
            if (aliases.includes(h)) return field;
        }
        const hu = h.replace(/\s+/g, '_');
        for (const [field, aliases] of Object.entries(FIELD_MAP)) {
            if (aliases.includes(hu)) return field;
        }
        return null;
    }

    function buildName(row) {
        const first = (row.first_name || '').trim();
        const last = (row.last_name || '').trim();
        if (first && last) return `${last}, ${first}`;
        return last || first || 'Unknown';
    }

    function buildAddress(row) {
        return [row.address, row.address2, row.city, row.zip].filter(Boolean).join(', ');
    }

    function enrichRow(row) {
        row.customer_name = buildName(row);
        row.full_address = buildAddress(row);
        row.is_active = (row.location_active || '').toLowerCase() === 'true';
        if (row.latitude) row.latitude = parseFloat(row.latitude) || null;
        if (row.longitude) row.longitude = parseFloat(row.longitude) || null;
        return row;
    }

    // ===== Load all from Supabase =====
    async function load() {
        init();
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('account', { ascending: true });

        if (error) {
            console.error('Load error:', error);
            alert('Failed to load data from database: ' + error.message);
            return [];
        }

        customers = (data || []).map(enrichRow);
        cacheLoaded = true;
        return customers;
    }

    function getAll() { return customers; }

    function getById(id) { return customers.find(c => c.id === id); }

    // ===== Add =====
    async function add(customer) {
        customer.customer_name = buildName(customer);
        customer.full_address = buildAddress(customer);
        customer.is_active = true;
        customer.location_active = 'true';

        // Only send DB columns
        const row = {};
        DB_FIELDS.forEach(f => { if (customer[f] !== undefined) row[f] = customer[f]; });

        const { data, error } = await supabase.from('customers').insert([row]).select();
        if (error) { alert('Failed to add: ' + error.message); return null; }

        const added = enrichRow(data[0]);
        customers.push(added);
        return added;
    }

    // ===== Update =====
    async function update(id, updates) {
        const row = {};
        DB_FIELDS.forEach(f => { if (updates[f] !== undefined) row[f] = updates[f]; });

        const { data, error } = await supabase
            .from('customers')
            .update(row)
            .eq('id', id)
            .select();

        if (error) { alert('Failed to update: ' + error.message); return null; }

        const updated = enrichRow(data[0]);
        const idx = customers.findIndex(c => c.id === id);
        if (idx !== -1) customers[idx] = updated;
        return updated;
    }

    // ===== Delete =====
    async function remove(id) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) { alert('Failed to delete: ' + error.message); return; }
        customers = customers.filter(c => c.id !== id);
    }

    // ===== CSV Import =====
    function importCSV(file, progressCallback) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                async complete(results) {
                    if (!results.data || results.data.length === 0) {
                        reject(new Error('No data found in CSV'));
                        return;
                    }

                    const csvHeaders = Object.keys(results.data[0]);
                    const colMap = {};
                    csvHeaders.forEach(h => {
                        const field = matchField(h);
                        if (field) colMap[h] = field;
                    });

                    // Build rows
                    const rows = [];
                    results.data.forEach(csvRow => {
                        const row = {};
                        for (const [csvCol, field] of Object.entries(colMap)) {
                            let val = (csvRow[csvCol] || '').trim();
                            if (field === 'latitude' || field === 'longitude') {
                                val = parseFloat(val);
                                if (isNaN(val)) val = null;
                            }
                            row[field] = val || null;
                        }
                        const name = buildName(row);
                        if (name && name !== 'Unknown') {
                            rows.push(row);
                        }
                    });

                    try {
                        // Clear existing data
                        if (progressCallback) progressCallback('Clearing old data...');
                        await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

                        // Insert in batches of 500
                        const BATCH = 500;
                        let inserted = 0;
                        for (let i = 0; i < rows.length; i += BATCH) {
                            const batch = rows.slice(i, i + BATCH);
                            if (progressCallback) progressCallback(`Uploading ${inserted + batch.length} of ${rows.length}...`);

                            const { error } = await supabase.from('customers').insert(batch);
                            if (error) {
                                reject(new Error(`Batch insert failed at row ${i}: ${error.message}`));
                                return;
                            }
                            inserted += batch.length;
                        }

                        // Log the upload
                        await supabase.from('uploads').insert([{
                            filename: file.name,
                            row_count: inserted,
                            uploaded_by: 'user'
                        }]);

                        // Reload cache
                        await load();

                        resolve({
                            imported: inserted,
                            total: results.data.length,
                            active: customers.filter(c => c.is_active).length,
                            unmapped: getUnmapped().length,
                            mapped: getMapped().length
                        });
                    } catch (err) {
                        reject(err);
                    }
                },
                error(err) { reject(err); }
            });
        });
    }

    // ===== Export =====
    function exportCSV() {
        const fields = DB_FIELDS;
        const header = fields.join(',');
        const rows = customers.map(c => {
            return fields.map(f => {
                let val = c[f] != null ? String(c[f]) : '';
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            }).join(',');
        });
        return header + '\n' + rows.join('\n');
    }

    function downloadCSV() {
        const csv = exportCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clean_gas_customers_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== Last Upload Info =====
    async function getLastUpload() {
        const { data } = await supabase
            .from('uploads')
            .select('*')
            .order('uploaded_at', { ascending: false })
            .limit(1);
        return data && data[0] ? data[0] : null;
    }

    // ===== Queries (client-side from cache) =====
    function getUnmapped() { return customers.filter(c => !c.latitude || !c.longitude); }
    function getMapped() { return customers.filter(c => c.latitude && c.longitude); }
    function getActive() { return customers.filter(c => c.is_active); }

    function getUniqueValues(field) {
        const vals = new Set();
        customers.forEach(c => {
            if (c[field] && String(c[field]).trim()) vals.add(String(c[field]).trim());
        });
        return [...vals].sort();
    }

    function search(query) {
        if (!query) return customers;
        const q = query.toLowerCase();
        return customers.filter(c =>
            (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
            (c.account && c.account.toLowerCase().includes(q)) ||
            (c.full_address && c.full_address.toLowerCase().includes(q)) ||
            (c.phones && c.phones.toLowerCase().includes(q)) ||
            (c.last_name && c.last_name.toLowerCase().includes(q)) ||
            (c.first_name && c.first_name.toLowerCase().includes(q))
        );
    }

    async function clearAll() {
        await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        customers = [];
    }

    return {
        load, getAll, getById, add, update, remove,
        importCSV, exportCSV, downloadCSV, getLastUpload,
        getUnmapped, getMapped, getActive, getUniqueValues,
        search, clearAll
    };
})();
