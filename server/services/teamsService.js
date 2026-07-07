const crypto = require("crypto");
const User = require("../models/User");
const Team = require("../models/Team");
const Channel = require("../models/Channel");
const {
  getGraphClient,
  getMicrosoftConfig,
  hasMicrosoftGraphConfig,
} = require("./microsoftGraphService");

const DEFAULT_CHANNELS = [
  "General",
  "Development",
  "Design",
  "Testing",
  "Documentation",
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function createMicrosoftTeam(teamName, description) {
  if (!hasMicrosoftGraphConfig()) {
    return {
      provider: "local-fallback",
      microsoftTeamId: `local-team-${crypto.randomUUID()}`,
      teamsWebUrl: "",
      connected: false,
    };
  }

  const client = await getGraphClient();
  const mailNickname = slugify(teamName) || `team-${Date.now()}`;
  const created = await client.api("/teams").post({
    "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
    displayName: teamName,
    description: description || `${teamName} collaboration workspace`,
    mailNickname,
    visibility: "Private",
  });

  return {
    provider: "microsoft-graph",
    microsoftTeamId: created?.id || "",
    groupId: created?.id || "",
    teamsWebUrl: created?.webUrl || "",
    connected: true,
  };
}

async function createMicrosoftChannel(microsoftTeamId, channelName, description = "") {
  if (!hasMicrosoftGraphConfig() || !microsoftTeamId) {
    return {
      provider: "local-fallback",
      microsoftChannelId: `local-channel-${crypto.randomUUID()}`,
      teamsWebUrl: "",
      connected: false,
    };
  }

  const client = await getGraphClient();
  const created = await client.api(`/teams/${microsoftTeamId}/channels`).post({
    displayName: channelName,
    description: description || `${channelName} channel`,
  });

  return {
    provider: "microsoft-graph",
    microsoftChannelId: created?.id || "",
    teamsWebUrl: created?.webUrl || "",
    connected: true,
  };
}

async function addUsersToMicrosoftTeam(microsoftTeamId, userIds = []) {
  if (!hasMicrosoftGraphConfig() || !microsoftTeamId || !userIds.length) {
    return { added: 0, connected: false };
  }

  const users = await User.find({ _id: { $in: userIds }, email: { $ne: null } }).select("name email");
  if (!users.length) {
    return { added: 0, connected: true };
  }

  const client = await getGraphClient();
  let added = 0;
  for (const user of users) {
    try {
      await client.api(`/teams/${microsoftTeamId}/members`).post({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: [],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${user.email}')`,
      });
      added += 1;
    } catch (error) {
      // Ignore duplicates or unavailable users so CRM flow continues.
    }
  }

  return { added, connected: true };
}

async function postMicrosoftChannelMessage(team, channel, messageText) {
  if (!hasMicrosoftGraphConfig() || !team?.collaboration?.microsoftTeamId || !channel?.microsoftChannelId) {
    return { messageId: "", connected: false };
  }

  const client = await getGraphClient();
  const created = await client.api(`/teams/${team.collaboration.microsoftTeamId}/channels/${channel.microsoftChannelId}/messages`).post({
    body: {
      contentType: "html",
      content: `<p>${String(messageText || "").replace(/\n/g, "<br />")}</p>`,
    },
  });

  return {
    messageId: created?.id || "",
    connected: true,
  };
}

async function ensureDefaultChannels(team, createdBy) {
  const existingChannels = await Channel.find({ teamId: team._id }).sort({ createdAt: 1 });
  const byName = new Map(existingChannels.map((channel) => [channel.name.toLowerCase(), channel]));
  const createdChannels = [];

  for (const name of DEFAULT_CHANNELS) {
    if (byName.has(name.toLowerCase())) {
      createdChannels.push(byName.get(name.toLowerCase()));
      continue;
    }

    const microsoftChannel = await createMicrosoftChannel(team.collaboration?.microsoftTeamId, name, `${name} workspace`);
    const channel = await Channel.create({
      teamId: team._id,
      name,
      description: `${name} workspace`,
      microsoftChannelId: microsoftChannel.microsoftChannelId,
      teamsWebUrl: microsoftChannel.teamsWebUrl,
      isDefault: true,
      createdBy: createdBy?._id || null,
    });
    createdChannels.push(channel);
  }

  return createdChannels;
}

async function hydrateTeamMembership(team) {
  return [team.managerId, team.teamLeadId, ...(team.memberIds || [])].filter(Boolean);
}

async function provisionTeamWorkspace(team, createdBy) {
  if (!team.collaboration?.microsoftTeamId) {
    const microsoftTeam = await createMicrosoftTeam(team.name, team.description || team.notes || "");
    team.collaboration = team.collaboration || {};
    team.collaboration.microsoftTeamId = microsoftTeam.microsoftTeamId;
    team.collaboration.groupId = microsoftTeam.groupId || microsoftTeam.microsoftTeamId;
    team.collaboration.teamsWebUrl = microsoftTeam.teamsWebUrl;
    await team.save();
  }

  const memberIds = await hydrateTeamMembership(team);
  await addUsersToMicrosoftTeam(team.collaboration.microsoftTeamId, memberIds);
  const channels = await ensureDefaultChannels(team, createdBy);
  return { team, channels };
}

module.exports = {
  DEFAULT_CHANNELS,
  addUsersToMicrosoftTeam,
  createMicrosoftChannel,
  createMicrosoftTeam,
  ensureDefaultChannels,
  postMicrosoftChannelMessage,
  provisionTeamWorkspace,
};
