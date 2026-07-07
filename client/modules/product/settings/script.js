window.init_settings = function() {
    // Load from local storage
    const view = localStorage.getItem('pm_setting_view') || '/product-manager/queue';
    const notifyEmail = localStorage.getItem('pm_setting_notify_email') !== 'false';
    const notifyPush = localStorage.getItem('pm_setting_notify_push') !== 'false';
    const notifySlack = localStorage.getItem('pm_setting_notify_slack') === 'true';
    const theme = localStorage.getItem('pm_setting_theme') || 'system';

    const elView = document.getElementById('setting-default-view');
    const elEmail = document.getElementById('setting-notify-email');
    const elPush = document.getElementById('setting-notify-push');
    const elSlack = document.getElementById('setting-notify-slack');
    const elTheme = document.getElementById('setting-theme');

    if(elView) elView.value = view;
    if(elEmail) elEmail.checked = notifyEmail;
    if(elPush) elPush.checked = notifyPush;
    if(elSlack) elSlack.checked = notifySlack;
    if(elTheme) elTheme.value = theme;
};

window.action_save_settings = function(e) {
    e.preventDefault();
    
    const elView = document.getElementById('setting-default-view');
    const elEmail = document.getElementById('setting-notify-email');
    const elPush = document.getElementById('setting-notify-push');
    const elSlack = document.getElementById('setting-notify-slack');
    const elTheme = document.getElementById('setting-theme');

    localStorage.setItem('pm_setting_view', elView.value);
    localStorage.setItem('pm_setting_notify_email', elEmail.checked);
    localStorage.setItem('pm_setting_notify_push', elPush.checked);
    localStorage.setItem('pm_setting_notify_slack', elSlack.checked);
    localStorage.setItem('pm_setting_theme', elTheme.value);

    window.UI.toast('Preferences saved successfully', 'success');
};
