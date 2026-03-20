/**
 * leads.js — Supabase-backed leads data layer
 */

const LeadStore = (() => {
    let supabase = null;
    let leads = [];

    const LEAD_FIELDS = [
        'company_name', 'contact_name', 'address', 'city', 'zip',
        'latitude', 'longitude', 'phone', 'email', 'sales_rep',
        'lead_source', 'status', 'notes'
    ];

    const LEAD_FIELD_MAP = {
        company_name:  ['company name', 'company_name', 'company', 'business name', 'business_name'],
        contact_name:  ['contact name', 'contact_name', 'contact', 'name', 'full name', 'full_name'],
        address:       ['address', 'street', 'location street', 'location_street'],
        city:          ['city', 'location city', 'location_city'],
        zip:           ['zip', 'zip code', 'postal code', 'location zip'],
        latitude:      ['latitude', 'lat'],
        longitude:     ['longitude', 'lng', 'lon', 'long'],
        phone:         ['phone', 'phones', 'phone number', 'telephone'],
        email:         ['email', 'email address', 'e-mail'],
        sales_rep:     ['sales rep', 'sales_rep', 'rep', 'assigned to', 'salesperson'],
        lead_source:   ['lead source', 'lead_source', 'source'],
        status:        ['status', 'lead status'],
        notes:         ['notes', 'comments', 'description']
    };

    function init() {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    function matchField(header) {
        const h = header.toLowerCase().trim().replace(/\s+/g, ' ');
        for (const [field, aliases] of Object.entries(LEAD_FIELD_MAP)) {
            if (aliases.includes(h)) return field;
        }
        const hu = h.replace(/\s+/g, '_');
        for (const [field, aliases] of Object.entries(LEAD_FIELD_MAP)) {
            if (aliases.includes(hu)) return field;
        }
        return null;
    }

    function enrichLead(row) {
        row.display_name = row.company_name || row.contact_name || 'Unknown Lead';
        row.full_address = [row.address, row.city, row.zip].filter(Boolean).join(', ');
        if (row.latitude) row.latitude = parseFloat(row.latitude) || null;
        if (row.longitude) row.longitude = parseFloat(row.longitude) || null;
        row._type = 'lead';
        return row;
    }

    async function load() {
        init();
        const PAGE = 1000;
        let allRows = [];
        let from = 0;

        while (true) {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('company_name', { ascending: true })
                .range(from, from + PAGE - 1);

            if (error) {
                // Table might not exist yet — that's OK
                console.warn('Leads load:', error.message);
                leads = [];
                return leads;
            }

            allRows = allRows.concat(data || []);
            if (!data || data.length < PAGE) break;
            from += PAGE;
        }

        leads = allRows.map(enrichLead);
        return leads;
    }

    function getAll() { return leads; }
    function getById(id) { return leads.find(l => l.id === id); }
    function getMapped() { return leads.filter(l => l.latitude && l.longitude); }

    function getUniqueValues(field) {
        const vals = new Set();
        leads.forEach(l => {
            if (l[field] && String(l[field]).trim()) vals.add(String(l[field]).trim());
        });
        return [...vals].sort();
    }

    function search(query) {
        if (!query) return leads;
        const q = query.toLowerCase();
        return leads.filter(l =>
            (l.display_name && l.display_name.toLowerCase().includes(q)) ||
            (l.contact_name && l.contact_name.toLowerCase().includes(q)) ||
            (l.company_name && l.company_name.toLowerCase().includes(q)) ||
            (l.full_address && l.full_address.toLowerCase().includes(q)) ||
            (l.phone && l.phone.toLowerCase().includes(q)) ||
            (l.email && l.email.toLowerCase().includes(q))
        );
    }

    async function add(lead) {
        const row = {};
        LEAD_FIELDS.forEach(f => { if (lead[f] !== undefined) row[f] = lead[f]; });
        if (!row.status) row.status = 'New';

        const { data, error } = await supabase.from('leads').insert([row]).select();
        if (error) { alert('Failed to add lead: ' + error.message); return null; }

        const added = enrichLead(data[0]);
        leads.push(added);
        return added;
    }

    async function update(id, updates) {
        const row = {};
        LEAD_FIELDS.forEach(f => { if (updates[f] !== undefined) row[f] = updates[f]; });

        const { data, error } = await supabase.from('leads').update(row).eq('id', id).select();
        if (error) { alert('Failed to update lead: ' + error.message); return null; }

        const updated = enrichLead(data[0]);
        const idx = leads.findIndex(l => l.id === id);
        if (idx !== -1) leads[idx] = updated;
        return updated;
    }

    async function remove(id) {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) { alert('Failed to delete lead: ' + error.message); return; }
        leads = leads.filter(l => l.id !== id);
    }

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
                        if (row.company_name || row.contact_name) {
                            if (!row.status) row.status = 'New';
                            rows.push(row);
                        }
                    });

                    try {
                        if (progressCallback) progressCallback('Clearing old leads...');
                        await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');

                        const BATCH = 500;
                        let inserted = 0;
                        for (let i = 0; i < rows.length; i += BATCH) {
                            const batch = rows.slice(i, i + BATCH);
                            if (progressCallback) progressCallback(`Uploading ${inserted + batch.length} of ${rows.length} leads...`);
                            const { error } = await supabase.from('leads').insert(batch);
                            if (error) {
                                reject(new Error(`Lead batch insert failed at row ${i}: ${error.message}`));
                                return;
                            }
                            inserted += batch.length;
                        }

                        await load();
                        resolve({ imported: inserted, total: results.data.length, mapped: getMapped().length });
                    } catch (err) {
                        reject(err);
                    }
                },
                error(err) { reject(err); }
            });
        });
    }

    async function clearAll() {
        await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        leads = [];
    }

    return {
        load, getAll, getById, getMapped, getUniqueValues,
        search, add, update, remove, importCSV, clearAll
    };
})();
