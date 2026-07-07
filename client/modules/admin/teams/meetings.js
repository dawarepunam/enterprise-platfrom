(function registerMeetingsShortcut() {
  const workspace = window.TeamsWorkspace;
  if (!workspace) return;

  window.TeamsMeetings = {
    openScheduler() {
      workspace.openTemplate("meetingTemplate");
    },
  };
})();
