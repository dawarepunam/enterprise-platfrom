'use strict';

const token = localStorage.getItem('token');
if (!token) location.href = '/login';

const $ = id => document.getElementById(id);
const api = (url, opts = {}) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers }, ...opts })
    .then(async r => {
      const d = await readJsonResponse(r);
      if (!r.ok) throw new Error(d.message || 'API Error');
      return d;
    });

let allFiles = [];
let currentFolder = '';
let socket;
let isListView = false;

document.addEventListener('DOMContentLoaded', async () => {
  await loadFiles();
  initSocket();
  setupUI();
});

async function readJsonResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  const text = await res.text();
  throw new Error(text.includes('<!DOCTYPE') ? 'Server returned a page instead of JSON. Restart the server and try again.' : text || 'Request failed');
}

function normalizeFile(file = {}) {
  const folder = file.folder || file.category || file.metadata?.folder || 'My Files';
  const name = file.name || file.filename || file.originalName || 'Untitled file';
  return {
    ...file,
    _id: String(file._id || file.id || file.url || name),
    name,
    url: file.url || file.oneDriveShareUrl || file.webUrl || '#',
    size: Number(file.size || file.fileSize || 0),
    createdAt: file.createdAt || file.updatedAt || new Date().toISOString(),
    folder,
    category: folder,
    shared: file.shared || file.isShared || folder === 'Team Shared',
  };
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function fileIcon(ext, mime = '') {
  const type = String(mime || '').toLowerCase();
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return '<i class="fa fa-file-image"></i>';
  if (ext === 'pdf') return '<i class="fa fa-file-pdf"></i>';
  if (['doc', 'docx'].includes(ext)) return '<i class="fa fa-file-word"></i>';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '<i class="fa fa-file-excel"></i>';
  if (['zip', 'rar', '7z'].includes(ext)) return '<i class="fa fa-file-archive"></i>';
  return '<i class="fa fa-file-alt"></i>';
}

async function loadFiles() {
  try {
    const res = await api('/api/files');
    allFiles = (res.data || res.files || []).map(normalizeFile);
    renderFiles();
    renderStats();
  } catch (e) {
    $('fmGrid').innerHTML = '';
    $('fmEmpty').style.display = 'block';
    $('fmEmpty').querySelector('p').textContent = e.message;
  }
}

function renderFiles() {
  const q = ($('fmSearch').value || '').toLowerCase();
  let filtered = allFiles;
  if (currentFolder) filtered = filtered.filter(f => f.folder === currentFolder);
  if (q) filtered = filtered.filter(f => f.name.toLowerCase().includes(q));

  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
  if (!currentFolder) {
    document.querySelector('.tree-item')?.classList.add('active');
    $('fmBreadcrumb').innerHTML = '<span class="bc-item bc-root" onclick="navigateTo(\'\')"><i class="fa fa-home"></i> Home / My Files</span>';
  } else {
    const active = Array.from(document.querySelectorAll('.tree-item')).find(el => el.textContent.trim() === currentFolder);
    if (active) active.classList.add('active');
    $('fmBreadcrumb').innerHTML = `<span class="bc-item bc-root" onclick="navigateTo('')"><i class="fa fa-home"></i> Home</span><span class="separator">/</span><span class="active-crumb">${escapeHtml(currentFolder)}</span>`;
  }

  const grid = $('fmGrid');
  if (!filtered.length) {
    grid.innerHTML = '';
    $('fmEmpty').style.display = 'block';
    $('fmEmpty').querySelector('p').textContent = currentFolder ? 'No files in this folder yet.' : 'Upload files or drag and drop them here.';
    return;
  }
  $('fmEmpty').style.display = 'none';

  grid.innerHTML = filtered.map(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    const size = formatBytes(f.size);
    const date = new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const safeName = escapeHtml(f.name);
    const safeUrl = escapeHtml(f.url);
    return `
      <div class="fm-file-card" ondblclick="previewFile('${f._id}')">
        ${f.shared ? '<div class="ffc-shared">Shared</div>' : ''}
        <div class="ffc-icon">${fileIcon(ext, f.mimeType)}</div>
        <div class="ffc-name" title="${safeName}">${safeName}</div>
        <div class="ffc-folder">${escapeHtml(f.folder)}</div>
        <div class="ffc-meta">${size} &bull; ${date}</div>
        <div class="ffc-actions">
          <button class="ffc-act-btn" onclick="event.stopPropagation(); previewFile('${f._id}')" title="Preview"><i class="fa fa-eye"></i></button>
          <button class="ffc-act-btn" onclick="event.stopPropagation(); window.open('${safeUrl}', '_blank')" title="Open"><i class="fa fa-download"></i></button>
          <button class="ffc-act-btn danger" onclick="event.stopPropagation(); deleteFile('${f._id}')" title="Delete"><i class="fa fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

function renderStats() {
  $('statFiles').textContent = allFiles.length;
  $('statSize').textContent = formatBytes(allFiles.reduce((sum, f) => sum + f.size, 0));
  $('statFolders').textContent = new Set(allFiles.map(f => f.folder).filter(Boolean)).size;
  $('statShared').textContent = allFiles.filter(f => f.shared).length;
}

window.navigateTo = folder => {
  currentFolder = folder;
  renderFiles();
};

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function setupUI() {
  $('fmSearch').addEventListener('input', renderFiles);
  $('btnGridView').addEventListener('click', () => { isListView = false; toggleView(); });
  $('btnListView').addEventListener('click', () => { isListView = true; toggleView(); });
  $('btnUpload').addEventListener('click', () => $('fmFileInput').click());
  $('fmFileInput').addEventListener('change', e => uploadFiles(Array.from(e.target.files)));

  const overlay = $('fmDropOverlay');
  window.addEventListener('dragover', e => { e.preventDefault(); overlay.style.display = 'flex'; });
  window.addEventListener('dragleave', e => { if (!e.relatedTarget) overlay.style.display = 'none'; });
  window.addEventListener('drop', e => {
    e.preventDefault();
    overlay.style.display = 'none';
    if (e.dataTransfer.files.length) uploadFiles(Array.from(e.dataTransfer.files));
  });
}

function toggleView() {
  $('btnGridView').classList.toggle('active', !isListView);
  $('btnListView').classList.toggle('active', isListView);
  $('fmGrid').classList.toggle('list-view', isListView);
}

async function uploadFiles(files) {
  if (!files.length) return;
  const overlay = $('fmDropOverlay');
  const textEl = overlay.querySelector('.fdo-text') || overlay;
  overlay.style.display = 'flex';
  textEl.textContent = `Uploading ${files.length} file(s)...`;

  try {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    fd.append('folder', currentFolder || 'My Files');
    const res = await fetch('/api/files/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await readJsonResponse(res);
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    await loadFiles();
    if (socket) socket.emit('file_uploaded', { count: files.length, folder: currentFolder || 'My Files' });
  } catch (e) {
    alert(e.message);
  } finally {
    overlay.style.display = 'none';
    textEl.textContent = 'Drop files here to upload';
    $('fmFileInput').value = '';
  }
}

window.deleteFile = async id => {
  if (!confirm('Are you sure you want to delete this file?')) return;
  try {
    await api(`/api/files/${id}`, { method: 'DELETE' });
    await loadFiles();
  } catch (e) {
    alert(e.message);
  }
};

window.previewFile = id => {
  const f = allFiles.find(x => x._id === id);
  if (!f) return;
  $('previewModal').style.display = 'flex';
  $('previewTitle').textContent = f.name;
  const ext = f.name.split('.').pop().toLowerCase();
  const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || String(f.mimeType || '').startsWith('image/');
  const safeUrl = escapeHtml(f.url);

  if (isImg) $('previewContent').innerHTML = `<img src="${safeUrl}" alt="Preview"/>`;
  else if (ext === 'pdf') $('previewContent').innerHTML = `<iframe src="${safeUrl}"></iframe>`;
  else $('previewContent').innerHTML = `<div class="pv-no-preview"><div class="pv-icon"><i class="fa fa-file-alt"></i></div><p>No preview available for .${escapeHtml(ext)} files.</p></div>`;

  $('previewInfo').innerHTML = `
    <div class="pi-item"><div class="pi-label">Size</div><div class="pi-val">${formatBytes(f.size)}</div></div>
    <div class="pi-item"><div class="pi-label">Type</div><div class="pi-val">${escapeHtml(ext.toUpperCase())}</div></div>
    <div class="pi-item"><div class="pi-label">Date</div><div class="pi-val">${new Date(f.createdAt).toLocaleDateString()}</div></div>`;
  $('previewActions').innerHTML = `
    <button class="btn-ghost" onclick="closePreview()">Close</button>
    <button class="btn-upload" onclick="window.open('${safeUrl}', '_blank')"><i class="fa fa-download"></i> Download</button>`;
};

window.closePreview = () => $('previewModal').style.display = 'none';
window.showVersions = () => {};

function initSocket() {
  try {
    socket = io({ auth: { token } });
    socket.on('file_uploaded', () => loadFiles());
    socket.on('file_deleted', () => loadFiles());
  } catch {
    socket = null;
  }
}
