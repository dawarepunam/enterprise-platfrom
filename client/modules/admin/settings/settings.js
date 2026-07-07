function switchTab(id, btn){
  document.querySelectorAll('.settings-nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.st-section').forEach(s=>s.classList.remove('active'));
  
  if (!btn) btn = document.querySelector(`.settings-nav-item[onclick*="'${id}'"]`);
  if (btn) btn.classList.add('active');
  
  const section = document.getElementById('st-'+id);
  if (section) section.classList.add('active');
}
window.switchTab = switchTab;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab) switchTab(tab);
});