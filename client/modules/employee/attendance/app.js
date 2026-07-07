'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Attendance — app.js  (fully self-contained, no external dependencies)
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  /* ── state ── */
  var todayRecord    = null;
  var isOnBreak      = false;
  var elapsedTimer   = null;
  var calYear        = new Date().getFullYear();
  var calMonth       = new Date().getMonth() + 1;
  var monthRecords   = [];
  var socket         = null;

  /* ── helpers ── */
  function tok() {
    return localStorage.getItem('token') ||
           localStorage.getItem('jmkc_token') ||
           sessionStorage.getItem('token') || '';
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('user') || localStorage.getItem('jmkc_user') || '{}'); }
    catch(e) { return {}; }
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var t = tok();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    return fetch(path, Object.assign({ headers: headers }, opts))
      .then(function(r) {
        return r.json().then(function(j) {
          if (!r.ok) throw new Error(j.message || 'Request failed (' + r.status + ')');
          return j;
        });
      });
  }

  function el(id) { return document.getElementById(id); }

  function showToast(msg, type) {
    type = type || 'success';
    var colors = { success: '#05CD99', error: '#EE5D50', info: '#3965FF' };
    var div = document.createElement('div');
    div.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;' +
      'background:#fff;border-left:4px solid ' + (colors[type] || colors.info) + ';' +
      'border-radius:12px;padding:14px 22px;font-size:14px;font-weight:600;' +
      'color:#2b3674;box-shadow:0 8px 32px rgba(112,144,176,0.25);min-width:220px;';
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(function() { if (div.parentNode) div.parentNode.removeChild(div); }, 4000);
  }

  function fmtTime(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  function fmtDuration(minutes) {
    if (!minutes && minutes !== 0) return '—';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return h ? h + 'h ' + m + 'm' : m + 'm';
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function fmtDateShort(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function formatDecimalHours(dec) {
    if (dec === undefined || dec === null) return '—';
    if (dec === 0) return '0h 0m 0s';
    var h = Math.floor(dec);
    var remMins = (dec - h) * 60;
    var m = Math.floor(remMins);
    var s = Math.round((remMins - m) * 60);
    if (s === 60) { m++; s = 0; }
    if (m === 60) { h++; m = 0; }
    var res = h + 'h ';
    if (m > 0 || s > 0) res += m + 'm ';
    if (s > 0) res += s + 's';
    return res.trim();
  }

  /* ── CLOCK REMOVED to avoid user confusion ── */

  function renderDateHeaders() {
    var now = new Date();
    var dateEl = el('punchDate'), dayEl = el('punchDay');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (dayEl) dayEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'long' });
  }

  /* ── ELAPSED TIMER ── */
  function startElapsed(punchInAt) {
    clearInterval(elapsedTimer);
    elapsedTimer = setInterval(function() {
      var diff = Math.floor((Date.now() - new Date(punchInAt).getTime()) / 1000);
      if (diff < 0) diff = 0;
      var h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
      var str = [h, m, s].map(function(n) { return String(n).padStart(2, '0'); }).join(':');
      var eEl = el('punchElapsed');
      if (eEl) eEl.textContent = str;
      var pct = Math.min(diff / 32400, 1);
      var ring = el('punchRing');
      if (ring) ring.style.strokeDashoffset = 326.7 - pct * 326.7;
    }, 1000);
  }

  function stopElapsed() {
    clearInterval(elapsedTimer);
    var eEl = el('punchElapsed');
    if (eEl) eEl.textContent = '00:00:00';
    var ring = el('punchRing');
    if (ring) ring.style.strokeDashoffset = 326.7;
  }

  /* ── RENDER PUNCH STATE ── */
  function renderPunchState() {
    var btnIn = el('btnPunchIn'), btnOut = el('btnPunchOut'), btnBreak = el('btnBreak');
    var statusEl = el('punchStatus'), inEl = el('punchInTime'), outEl = el('punchOutTime');
    var summaryEl = el('todaySummary'), noteWrap = el('workNoteWrap');

    if (!todayRecord || !todayRecord.punchInAt) {
      if (statusEl) { statusEl.textContent = 'Not Punched In'; statusEl.style.color = '#a3aed1'; }
      if (inEl) inEl.textContent = '—';
      if (outEl) outEl.textContent = '—';
      if (btnIn) btnIn.disabled = false;
      if (btnOut) btnOut.disabled = true;
      if (btnBreak) btnBreak.style.display = 'none';
      if (summaryEl) summaryEl.style.display = 'none';
      if (noteWrap) noteWrap.style.display = 'none';
      stopElapsed();
      return;
    }

    if (inEl) inEl.textContent = fmtTime(todayRecord.punchInAt);

    if (todayRecord.punchOutAt) {
      // Completed day
      if (outEl) outEl.textContent = fmtTime(todayRecord.punchOutAt);
      if (statusEl) { statusEl.textContent = '✅ Day Complete'; statusEl.style.color = '#05CD99'; }
      if (btnIn) btnIn.disabled = true;
      if (btnOut) btnOut.disabled = true;
      if (btnBreak) btnBreak.style.display = 'none';
      stopElapsed();

      var totalMins = Math.round((todayRecord.effectiveHours || todayRecord.totalHours || 0) * 60);
      var breakMins = Math.round((todayRecord.breakHours || 0) * 60);
      
      var eEl = el('punchElapsed');
      if (eEl) {
        var h = Math.floor(totalMins / 60), m = totalMins % 60;
        eEl.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00';
      }

      if (summaryEl) {
        summaryEl.style.display = '';
        el('tsHours').textContent = fmtDuration(totalMins);
        el('tsBreak').textContent = fmtDuration(breakMins);
        el('tsStatus').textContent = todayRecord.status || 'Present';
      }
      var ring = el('punchRing');
      if (ring) ring.style.strokeDashoffset = 326.7 - Math.min(totalMins / 540, 1) * 326.7;

    } else {
      // Still working
      if (outEl) outEl.textContent = 'Active';
      if (statusEl) { statusEl.textContent = isOnBreak ? '☕ On Break' : '🟢 Working'; statusEl.style.color = '#05CD99'; }
      if (btnIn) btnIn.disabled = true;
      if (btnOut) btnOut.disabled = false;
      if (btnBreak) btnBreak.style.display = '';
      if (noteWrap) noteWrap.style.display = '';
      if (!isOnBreak) startElapsed(todayRecord.punchInAt);
      else stopElapsed();
    }
  }

  /* ── LOAD TODAY ── */
  function loadToday() {
    api('/api/attendance/today')
      .then(function(res) {
        todayRecord = res.data || null;
        if (todayRecord && todayRecord.breaks) {
          var openBreak = todayRecord.breaks.filter(function(b) { return b.startAt && !b.endAt; })[0];
          if (openBreak) {
            isOnBreak = true;
            var bBtn = el('btnBreak');
            if (bBtn) bBtn.textContent = '▶ End Break';
          }
        }
        renderPunchState();
      })
      .catch(function() { renderPunchState(); });
  }

  /* ── PUNCH IN ── */
  el('btnPunchIn') && el('btnPunchIn').addEventListener('click', function() {
    var btn = el('btnPunchIn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'Punching in…';
    var note = (el('workNote') ? el('workNote').value.trim() : '');
    api('/api/attendance/punch-in', {
      method: 'POST',
      body: JSON.stringify({ note: note, location: {} })
    })
    .then(function(res) {
      todayRecord = res.data || null;
      renderPunchState();
      showToast('✅ Punched in successfully!', 'success');
      loadStats();
    })
    .catch(function(err) {
      showToast(err.message || 'Punch in failed', 'error');
      btn.disabled = false;
    })
    .finally(function() {
      btn.textContent = 'Punch In';
    });
  });

  /* ── PUNCH OUT ── */
  el('btnPunchOut') && el('btnPunchOut').addEventListener('click', function() {
    var btn = el('btnPunchOut');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'Punching out…';
    var note = (el('workNote') ? el('workNote').value.trim() : '');
    api('/api/attendance/punch-out', {
      method: 'POST',
      body: JSON.stringify({ note: note, location: {} })
    })
    .then(function(res) {
      todayRecord = res.data || null;
      isOnBreak = false;
      renderPunchState();
      showToast('👋 Punched out successfully!', 'success');
      loadStats();
      loadHistory('all', 30);
      buildCalendar(calYear, calMonth);
    })
    .catch(function(err) {
      showToast(err.message || 'Punch out failed', 'error');
      btn.disabled = false;
    })
    .finally(function() {
      btn.textContent = 'Punch Out';
    });
  });

  /* ── BREAK ── */
  el('btnBreak') && el('btnBreak').addEventListener('click', function() {
    var btn = el('btnBreak');
    if (!isOnBreak) {
      isOnBreak = true;
      btn.textContent = '▶ End Break';
      el('punchStatus').textContent = '☕ On Break';
      stopElapsed();
      api('/api/attendance/break/start', { method: 'POST' }).catch(function(e) { console.error(e); });
    } else {
      isOnBreak = false;
      btn.textContent = '☕ Start Break';
      el('punchStatus').textContent = '🟢 Working';
      if (todayRecord && todayRecord.punchInAt) startElapsed(todayRecord.punchInAt);
      api('/api/attendance/break/end', { method: 'POST' })
        .then(function(res) { todayRecord = res.data || todayRecord; })
        .catch(function(e) { console.error(e); });
    }
  });

  /* ── STATS ── */
  function loadStats() {
    var now = new Date();
    api('/api/attendance/stats?year=' + now.getFullYear() + '&month=' + (now.getMonth() + 1))
      .then(function(res) {
        var s = res.data || {};
        if (el('kpiPresent')) el('kpiPresent').textContent = s.presentDays !== undefined ? s.presentDays : '—';
        if (el('kpiAbsent'))  el('kpiAbsent').textContent  = s.absentDays  !== undefined ? s.absentDays  : '—';
        if (el('kpiLate'))    el('kpiLate').textContent    = s.lateDays    !== undefined ? s.lateDays    : '—';
        if (el('kpiHours'))   el('kpiHours').textContent   = (s.totalHours !== undefined && s.totalHours !== null) ? formatDecimalHours(s.totalHours) : '—';
        var rate = s.attendancePercentage;
        if (el('kpiRate'))    el('kpiRate').textContent    = rate !== undefined ? Math.round(rate) + '%' : '—';
      })
      .catch(function() {});
  }

  /* ── HISTORY ── */
  window.filterHistory = function(filter) {
    window.location.href = '/employee/attendance?view=history&filter=' + filter;
  };

  function loadHistory(filter, days) {
    filter = filter || 'all';
    days   = days   || 30;
    var tbody = el('attTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px"><i class="fa fa-spinner fa-spin" style="color:#3965FF"></i></td></tr>';

    api('/api/attendance/history?days=' + days)
      .then(function(res) {
        var records = res.data || [];
        if (filter === 'present') records = records.filter(function(r) { return ['present','wfh'].indexOf((r.status||'').toLowerCase()) > -1; });
        if (filter === 'absent')  records = records.filter(function(r) { return (r.status||'').toLowerCase() === 'absent'; });
        if (filter === 'late')    records = records.filter(function(r) { return (r.status||'').toLowerCase() === 'late' || r.isLateArrival; });
        renderHistory(records);
      })
      .catch(function() {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#EE5D50">Could not load records. Check your connection.</td></tr>';
      });
  }

  function renderHistory(records) {
    var tbody = el('attTableBody');
    if (!tbody) return;
    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#a3aed1">No records found.</td></tr>';
      return;
    }
    tbody.innerHTML = records.map(function(r) {
      var status = r.status || 'present';
      var badgeCls = 'bg-g';
      if (status.toLowerCase().indexOf('absent') > -1) badgeCls = 'bg-r';
      if (status.toLowerCase().indexOf('late') > -1 || status.toLowerCase().indexOf('half') > -1) badgeCls = 'bg-o';
      var punchIn  = fmtTime(r.punchInAt  || r.checkInAt  || r.punchIn);
      var punchOut = fmtTime(r.punchOutAt || r.checkOutAt || r.punchOut);
      var hours    = r.effectiveHours ? formatDecimalHours(r.effectiveHours)
                   : r.totalHours    ? formatDecimalHours(r.totalHours) : '—';
      return '<tr>' +
        '<td>' + fmtDateShort(r.date || r.createdAt) + '</td>' +
        '<td><span class="badge ' + badgeCls + '">' + cap(status) + '</span></td>' +
        '<td>' + punchIn + '</td>' +
        '<td>' + punchOut + '</td>' +
        '<td>' + hours + '</td>' +
        '</tr>';
    }).join('');
  }



  /* ── CALENDAR ── */
  function buildCalendar(year, month) {
    var label = el('calMonthLabel');
    if (label) label.textContent = new Date(year, month - 1, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    api('/api/attendance/history?year=' + year + '&month=' + month + '&size=100')
      .then(function(res) {
        monthRecords = res.data || [];
        renderCalendar(year, month);
      })
      .catch(function() {
        monthRecords = [];
        renderCalendar(year, month);
      });
  }

  function renderCalendar(year, month) {
    var grid = el('calendarGrid');
    if (!grid) return;
    var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    grid.innerHTML = DAYS.map(function(d) { return '<div class="cal-dh">' + d + '</div>'; }).join('');

    var firstDay = new Date(year, month - 1, 1).getDay();
    var daysInMonth = new Date(year, month, 0).getDate();
    var today = new Date();
    var isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    for (var i = 0; i < firstDay; i++) {
      var empty = document.createElement('div');
      empty.className = 'cal-cell empty';
      grid.appendChild(empty);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      (function(day) {
        var dow = new Date(year, month - 1, day).getDay();
        var isWeekend = dow === 0 || dow === 6;
        var isToday = isCurrentMonth && day === today.getDate();

        var rec = null;
        for (var k = 0; k < monthRecords.length; k++) {
          var rd = new Date(monthRecords[k].date || monthRecords[k].createdAt);
          if (rd.getDate() === day && rd.getMonth() === month - 1 && rd.getFullYear() === year) {
            rec = monthRecords[k]; break;
          }
        }

        var cls = 'cal-cell';
        if (isWeekend && !rec) cls += ' holiday';
        if (rec) {
          var s = (rec.status || 'present').toLowerCase().replace(/\s/g, '');
          if (s === 'present' || s === 'wfh') cls += ' present';
          else if (s === 'absent') cls += ' absent';
          else if (s === 'late' || s === 'halfday') cls += ' late';
          else if (s === 'holiday') cls += ' holiday';
        }

        var cell = document.createElement('div');
        cell.className = cls;
        if (isToday) cell.style.cssText = 'border:2px solid #3965FF;font-weight:800;';
        cell.innerHTML = '<span>' + day + '</span>';

        if (rec) {
          cell.style.cursor = 'pointer';
          cell.title = cap(rec.status || 'present') + ' — ' + fmtTime(rec.punchInAt || rec.checkInAt) + ' to ' + fmtTime(rec.punchOutAt || rec.checkOutAt);
          cell.addEventListener('click', function() { showDayModal(new Date(year, month - 1, day), rec); });
        } else {
          cell.title = isWeekend ? 'Weekend' : (isToday ? 'Today' : 'No record');
        }

        grid.appendChild(cell);
      })(d);
    }
  }

  function showDayModal(date, rec) {
    var titleEl = el('dayModalTitle'), contentEl = el('dayModalContent'), modal = el('dayModal');
    if (!titleEl || !modal) return;
    titleEl.textContent = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var status = rec.status || 'present';
    var badgeCls = 'bg-g';
    if (status.toLowerCase().indexOf('absent') > -1) badgeCls = 'bg-r';
    if (status.toLowerCase().indexOf('late') > -1 || status.toLowerCase().indexOf('half') > -1) badgeCls = 'bg-o';
    var totalMins = Math.round((rec.effectiveHours || rec.totalHours || 0) * 60);
    var breakMins = Math.round((rec.breakHours || 0) * 60);
    contentEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:#a3aed1">Status</span><span class="badge ' + badgeCls + '">' + cap(status) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#a3aed1">Punch In</span><b style="color:#2b3674">' + fmtTime(rec.punchInAt || rec.checkInAt) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#a3aed1">Punch Out</span><b style="color:#2b3674">' + fmtTime(rec.punchOutAt || rec.checkOutAt) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#a3aed1">Working Hours</span><b style="color:#2b3674">' + fmtDuration(totalMins) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:#a3aed1">Break Time</span><b style="color:#2b3674">' + fmtDuration(breakMins) + '</b></div>' +
      (rec.note ? '<div style="background:#f4f7fe;border-radius:10px;padding:12px;margin-top:4px"><div style="font-size:11px;font-weight:600;color:#a3aed1;text-transform:uppercase;margin-bottom:6px">Note</div><div style="color:#2b3674;font-size:13px">' + rec.note + '</div></div>' : '') +
      '</div>';
    modal.style.display = 'flex';
  }

  /* ── FILTER CHANGE ── */
  function applyHistoryFilter() {
    var filter = el('historyFilter') ? el('historyFilter').value : 'all';
    var days   = el('historyDateFilter') ? Number(el('historyDateFilter').value) : 30;
    loadHistory(filter, days);
  }

  el('historyFilter')     && el('historyFilter').addEventListener('change', applyHistoryFilter);
  el('historyDateFilter') && el('historyDateFilter').addEventListener('change', applyHistoryFilter);

  /* ── KPI CARD CLICK (filter history) ── */
  ['kpiPresent','kpiAbsent','kpiLate'].forEach(function(id, i) {
    var vals = ['present','absent','late'];
    var kpiEl = el(id);
    if (!kpiEl) return;
    var card = kpiEl.closest('.kpi-c');
    if (!card) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', function() {
      var sel = el('historyFilter');
      if (sel) { sel.value = vals[i]; }
      loadHistory(vals[i], 30);
      var historyCard = el('attTableBody');
      if (historyCard) historyCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  /* ── CALENDAR NAV ── */
  el('calPrev') && el('calPrev').addEventListener('click', function() {
    calMonth--; if (calMonth < 1) { calMonth = 12; calYear--; }
    buildCalendar(calYear, calMonth);
  });
  el('calNext') && el('calNext').addEventListener('click', function() {
    calMonth++; if (calMonth > 12) { calMonth = 1; calYear++; }
    buildCalendar(calYear, calMonth);
  });

  /* ── MODAL CLOSE ── */
  var modal = el('dayModal');
  if (modal) modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.style.display = 'none';
  });

  /* ── SOCKET ── */
  if (typeof io !== 'undefined') {
    try {
      socket = io({ auth: { token: tok() } });
      var user = getUser();
      if (user._id) socket.emit('join_user_room', user._id);
    } catch(e) {}
  }

  // UI View Logic
  var urlParams = new URLSearchParams(window.location.search);
  var view = urlParams.get('view');
  var initFilter = urlParams.get('filter') || 'all';

  if (view === 'history') {
    // Hide dashboard elements
    var kpiStrip = document.querySelector('.kpi-strip');
    var punchCard = document.querySelector('.punch-card');
    var calendarBox = document.getElementById('calendarGrid')?.parentElement;
    
    if (kpiStrip) kpiStrip.style.display = 'none';
    if (punchCard) punchCard.style.display = 'none';
    if (calendarBox) calendarBox.style.display = 'none';
    
    var attSubtitle = document.getElementById('attSubtitle');
    if (attSubtitle) {
      attSubtitle.innerHTML = '<a href="/employee/attendance" style="display:inline-block;padding:8px 16px;background:#3965FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;"><i class="fa fa-arrow-left"></i> Back to Dashboard</a>';
    }
    
    // Change main grid to single column
    var mainGrid = document.querySelector('.main-grid');
    if (mainGrid) mainGrid.style.gridTemplateColumns = '1fr';
    
    var sel = el('historyFilter');
    if (sel) sel.value = initFilter;
    
    loadHistory(initFilter, 30);
  } else {
    // Dashboard view
    renderDateHeaders();
    loadToday();
    loadStats();
    loadHistory('all', 30);
    buildCalendar(calYear, calMonth);
    initSocket();
  }
});
