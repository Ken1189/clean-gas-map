/**
 * popup.js — Format customer data for map popups
 * Mapped to Clean Gas Full Report fields
 */

const PopupBuilder = (() => {

    function fmtDate(val) {
        if (!val) return '—';
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return val;
            return d.toLocaleDateString('en-KY', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return val; }
    }

    function row(label, value) {
        if (!value && value !== 0) return '';
        return `<div class="popup-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
    }

    /** Status badge */
    function statusBadge(status) {
        if (!status) return '';
        const colors = {
            'Automatic': '#4caf50',
            'Monitored': '#2196f3',
            'Will Call': '#ff9800',
            'Suspended': '#f44336',
            'Unknown': '#999'
        };
        const color = colors[status] || '#999';
        return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:#fff;background:${color};">${esc(status)}</span>`;
    }

    /** Build full popup HTML for a customer */
    function build(customer) {
        const c = customer;
        let html = `<div class="customer-popup">`;

        // Header with name and account
        html += `<h4>${esc(c.customer_name || 'Unknown')}`;
        if (c.account) html += ` <span style="font-size:12px;color:#888;font-weight:400;">#${esc(c.account)}</span>`;
        html += `</h4>`;

        // Status badges
        const badges = [];
        if (c.delivery_status) badges.push(statusBadge(c.delivery_status));
        if (c.secondary_delivery_status && c.secondary_delivery_status !== c.delivery_status) {
            badges.push(statusBadge(c.secondary_delivery_status));
        }
        if (!c.is_active) badges.push(statusBadge('Inactive'));
        if (badges.length) {
            html += `<div style="margin-bottom:8px;">${badges.join(' ')}</div>`;
        }

        // Customer Type
        if (c.customer_type) {
            html += `<div style="font-size:12px;color:#666;margin-bottom:6px;">${esc(c.customer_type)}</div>`;
        }

        // Location
        const locRows =
            row('Address', esc(c.full_address || c.address)) +
            row('Zone', esc(c.zone)) +
            row('Phone', esc(c.phones)) +
            (c.phone_descriptions ? row('', `<span style="font-size:11px;color:#aaa;">${esc(c.phone_descriptions)}</span>`) : '');
        if (locRows) {
            html += `<div class="popup-section">
                <div class="popup-section-title">Location</div>
                ${locRows}
            </div>`;
        }

        // Tank / Equipment
        const tankRows =
            row('Tank Size (actual)', esc(c.actual_tank_sizes)) +
            row('LP Tank Size', esc(c.lp_tank_sizes)) +
            row('Company Owned', esc(c.company_owned_tanks)) +
            row('Serial #', esc(c.serial_number)) +
            row('Pricing', esc(c.pricing_descriptions));
        if (tankRows) {
            html += `<div class="popup-section">
                <div class="popup-section-title">Tank / Equipment</div>
                ${tankRows}
            </div>`;
        }

        // Meter info
        const meterRows =
            row('Meter Serial', esc(c.meter_serial_numbers)) +
            row('Meter Type', esc(c.meter_types)) +
            row('Last Gas Check', fmtDate(c.last_gas_check_dates)) +
            row('Meter Installed', fmtDate(c.meter_install_dates));
        if (meterRows && (c.meter_serial_numbers || c.meter_types)) {
            html += `<div class="popup-section">
                <div class="popup-section-title">Metering</div>
                ${meterRows}
            </div>`;
        }

        // Delivery
        const delRows =
            row('Last Delivery', fmtDate(c.last_delivery_date)) +
            row('Appliance S/N', esc(c.appliance_serials));
        if (delRows) {
            html += `<div class="popup-section">
                <div class="popup-section-title">Delivery</div>
                ${delRows}
            </div>`;
        }

        // Recurring charges
        if (c.recurrent_charge_desc || c.recurrent_charge_amt) {
            const recurRows =
                row('Charge', esc(c.recurrent_charge_desc)) +
                row('Amount', c.recurrent_charge_amt ? '$' + esc(c.recurrent_charge_amt) : null) +
                row('Due', fmtDate(c.recurrent_due_dates)) +
                row('Every', c.months_between ? esc(c.months_between) + ' months' : null);
            html += `<div class="popup-section">
                <div class="popup-section-title">Recurring Charges</div>
                ${recurRows}
            </div>`;
        }

        // Driver instructions
        if (c.driver_instructions && c.driver_instructions.trim()) {
            html += `<div class="popup-section">
                <div class="popup-section-title">Driver Instructions</div>
                <div style="font-size:12px;color:#d84315;background:#fff3e0;padding:6px 8px;border-radius:4px;white-space:pre-wrap;">${esc(c.driver_instructions)}</div>
            </div>`;
        }

        // Action buttons
        html += `<div class="popup-actions">
            <button class="popup-btn-edit" onclick="App.editCustomer('${c.id}')">Edit</button>`;
        if (c.latitude && c.longitude) {
            html += `<button class="popup-btn-directions" onclick="App.getDirections(${c.latitude},${c.longitude})">Directions</button>`;
        }
        html += `</div>`;

        html += `</div>`;
        return html;
    }

    /** Compact hover tooltip */
    function buildTooltip(customer) {
        const c = customer;
        let text = `<strong>${esc(c.customer_name)}</strong>`;
        if (c.account) text += ` <span style="color:#aaa;">#${esc(c.account)}</span>`;
        if (c.customer_type) text += `<br>${esc(c.customer_type)}`;
        if (c.actual_tank_sizes) text += `<br>Tank: ${esc(c.actual_tank_sizes)} gal`;
        if (c.zone) text += `<br>${esc(c.zone)}`;
        if (c.delivery_status) text += `<br>${esc(c.delivery_status)}`;
        return text;
    }

    function esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    return { build, buildTooltip };
})();
