(function() {
    const BASE = window.location.origin;

    function tok() { return localStorage.getItem('token') || localStorage.getItem('jmkc_token'); }

    function api(p, o = {}) { return fetch(BASE + '/api' + p, { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, ...o }).then(r => r.ok ? r.json() : Promise.reject()); }
    let dragId = null,
        allTasks = [];
    const pBadge = { critical: 'danger', high: 'danger', medium: 'warning', low: 'success' };

    function ns(s) { return (s || '').toLowerCase().replace(/\s+/g, '-'); }

    function renderBoard(tasks) {
        allTasks = tasks;
        const cols = { pending: [], inProg: [], review: [], done: [] };
        const sm = { 'pending': 'pending', 'todo': 'pending', 'in-progress': 'inProg', 'review': 'review', 'done': 'done' };
        tasks.forEach(t => { const k = sm[ns(t.status)] || 'pending';
            cols[k].push(t); });
        const map = { pending: ['kbTodo', 'kbcTodo'], inProg: ['kbProg', 'kbcProg'], review: ['kbRev', 'kbcRev'], done: ['kbDone', 'kbcDone'] };
        Object.entries(cols).forEach(([k, ts]) => {
            const [bodyId, cntId] = map[k];
            const el = document.getElementById(bodyId);
            const ct = document.getElementById(cntId);
            if (ct) ct.textContent = ts.length;
            if (!el) return;
            const pf = document.getElementById('kbPriorityFilter') ? .value || '';
            const filtered = pf ? ts.filter(t => ns(t.priority) === pf) : ts;
            el.innerHTML = filtered.map(t => {
                const p = ns(t.priority || 'normal');
                const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
                const isOver = t.dueDate && new Date(t.dueDate) < new Date() && ns(t.status) !== 'done';
                return '<div class="kb-card" draggable="true" id="kbc_' + t._id + '" data-id="' + t._id + '" data-status="' + ns(t.status) + '" ondragstart="ds(event,\'' + t._id + '\')" ondragend="de(event)" onclick="window.location=\'/employee/task-detail?id=' + t._id + '\'"><div class="kb-card-title">' + ((t.title || t.name || 'Task')) + '</div><div class="kb-card-footer"><span class="badge badge-' + (pBadge[p] || 'muted') + '" style="font-size:0.65rem">' + (t.priority || 'Normal') + '</span><span class="kb-card-due' + (isOver ? ' overdue' : '') + '">' + (due ? '📅 ' + due : '') + '</span></div></div>';
            }).join('') || '<div style="text-align:center;padding:1.5rem;color:var(--clr-text-muted);font-size:0.8rem">Drop here</div>';
        });
    }
    window.ds = function(e, id) { dragId = id;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move'; };
    window.de = function(e) { e.target.classList.remove('dragging');
        document.querySelectorAll('.kb-body').forEach(c => c.classList.remove('drag-over')); };
    window.drop = async function(e, status) {
        e.preventDefault();
        document.querySelectorAll('.kb-body').forEach(c => c.classList.remove('drag-over'));
        if (!dragId) return;
        const t = allTasks.find(x => x._id === dragId);
        const old = t ? .status;
        if (t) { t.status = status;
            renderBoard(allTasks); }
        try { await api('/tasks/' + dragId, { method: 'PATCH', body: JSON.stringify({ status }) }); } catch { if (t) { t.status = old;
                renderBoard(allTasks); } }
        dragId = null;
    };
    document.querySelectorAll('.kb-body').forEach(c => { c.addEventListener('dragover', e => { e.preventDefault();
            c.classList.add('drag-over'); });
        c.addEventListener('dragleave', () => c.classList.remove('drag-over')); });
    async function load() {
        const pf = document.getElementById('kbProjectFilter') ? .value || '';
        try {
            const res = await api('/tasks?assignedToMe=true&limit=100' + (pf ? '&project=' + pf : ''));
            renderBoard(res.data || res || []);
        } catch { document.querySelectorAll('.kb-body').forEach(el => el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--clr-danger);font-size:0.8rem">Could not load tasks</div>'); }
    }
    async function loadProjects() {
        try { const res = await api('/projects/employee'); const projs = res.data || res || []; const sel = document.getElementById('kbProjectFilter');
            projs.forEach(p => { const o = document.createElement('option');
                o.value = p._id;
                o.textContent = p.projectName || p.name || p.title;
                sel.appendChild(o); });
            sel.addEventListener('change', load); } catch {}
    }
    document.addEventListener('DOMContentLoaded', () => { loadProjects();
        load();
        document.getElementById('kbPriorityFilter') ? .addEventListener('change', () => renderBoard(allTasks)); });
})();