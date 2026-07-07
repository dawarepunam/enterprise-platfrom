require("isomorphic-fetch");
const crypto = require("crypto");
const { URLSearchParams } = require("url");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const { Client } = require("@microsoft/microsoft-graph-client");
const MicrosoftAccount = require("../models/MicrosoftAccount");

const GRAPH_BASE_SCOPE = "https://graph.microsoft.com/.default";
const DEFAULT_CHUNK_SIZE = 327680 * 10;
const DEFAULT_SCOPES = [
  "User.Read",
  "Files.ReadWrite.All",
  "Mail.ReadWrite",
  "Mail.Send",
  "Calendars.ReadWrite",
  "Team.ReadBasic.All",
  "ChannelMessage.Send",
  "OnlineMeetings.ReadWrite",
  "Sites.ReadWrite.All",
  "offline_access",
];

function getMicrosoftConfig() {
  return {
    tenantId: String(process.env.MICROSOFT_TENANT_ID || "").trim(),
    clientId: String(process.env.MICROSOFT_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.MICROSOFT_CLIENT_SECRET || "").trim(),
    redirectUri: String(process.env.MICROSOFT_REDIRECT_URI || "").trim(),
    mailbox: String(process.env.MICROSOFT_USER_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    oneDriveRootFolder: String(process.env.ONEDRIVE_ROOT_FOLDER || "CRM").trim(),
    shareScope: String(process.env.MICROSOFT_SHARE_SCOPE || "organization").trim().toLowerCase(),
    frontendUrl: String(process.env.FRONTEND_URL || "http://localhost:3000").trim(),
  };
}

function hasMicrosoftGraphConfig(config = getMicrosoftConfig()) {
  return Boolean(config.tenantId && config.clientId && config.clientSecret);
}

function hasApplicationMailboxConfig(config = getMicrosoftConfig()) {
  return Boolean(hasMicrosoftGraphConfig(config) && config.mailbox);
}

let cachedAccessToken = {
  value: "",
  expiresAt: 0,
};

function getMsalClient(config = getMicrosoftConfig()) {
  if (!hasMicrosoftGraphConfig(config)) {
    throw new Error("Microsoft Graph configuration is incomplete. Add tenant, client, and secret.");
  }

  return new ConfidentialClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret,
    },
  });
}

async function acquireMicrosoftAccessToken() {
  if (cachedAccessToken.value && cachedAccessToken.expiresAt > Date.now() + 60 * 1000) {
    return cachedAccessToken.value;
  }

  const client = getMsalClient();
  const response = await client.acquireTokenByClientCredential({
    scopes: [GRAPH_BASE_SCOPE],
  });

  if (!response?.accessToken) {
    throw new Error("Unable to acquire Microsoft Graph access token.");
  }

  cachedAccessToken = {
    value: response.accessToken,
    expiresAt: response.expiresOn?.getTime?.() || Date.now() + 45 * 60 * 1000,
  };

  return cachedAccessToken.value;
}

function createGraphClient(token) {
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

async function getGraphClient() {
  const token = await acquireMicrosoftAccessToken();
  return createGraphClient(token);
}

function normalizeRecipients(list = []) {
  return list
    .flat()
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const email = item.trim().toLowerCase();
        return email ? { email, name: item.trim() } : null;
      }

      const email = String(item.email || item.address || "").trim().toLowerCase();
      return email
        ? {
            email,
            name: String(item.name || item.displayName || email).trim(),
          }
        : null;
    })
    .filter((item) => item?.email);
}

function toGraphRecipient(item) {
  return {
    emailAddress: {
      address: item.email,
      name: item.name || item.email,
    },
  };
}

function formatGraphError(error, fallback = "Microsoft Graph request failed") {
  const code = error?.code || error?.statusCode || error?.status || "";
  const message = error?.body?.error?.message || error?.message || fallback;
  return code ? `${message} (${code})` : message;
}

function sanitizeFolderPath(folderPath = "") {
  return String(folderPath || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("/");
}

function sanitizeFileName(fileName = "document.bin") {
  return String(fileName || "document.bin").replace(/[<>:"/\\|?*]+/g, "-").trim() || "document.bin";
}

function toGraphDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid meeting date/time provided.");
  }

  return {
    dateTime: date.toISOString(),
    timeZone: "UTC",
  };
}

function getMicrosoftAuthUrl({ userId = "", projectId = "", redirectPath = "/modules/manager/settings/settings.html" } = {}) {
  const config = getMicrosoftConfig();
  if (!hasMicrosoftGraphConfig(config) || !config.redirectUri) {
    return "";
  }

  const state = Buffer.from(JSON.stringify({ userId, projectId, redirectPath })).toString("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: DEFAULT_SCOPES.join(" "),
    state,
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

async function exchangeAuthorizationCode(code) {
  const config = getMicrosoftConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    scope: DEFAULT_SCOPES.join(" "),
  });

  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error_description || result.error || "Microsoft token exchange failed");
  }
  return result;
}

async function refreshUserAccessToken(account) {
  const config = getMicrosoftConfig();
  if (!account?.refreshToken) {
    throw new Error("Microsoft refresh token not available.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    redirect_uri: config.redirectUri,
    scope: DEFAULT_SCOPES.join(" "),
  });

  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error_description || result.error || "Microsoft token refresh failed");
  }

  account.accessToken = result.access_token || account.accessToken;
  account.refreshToken = result.refresh_token || account.refreshToken;
  account.tokenType = result.token_type || account.tokenType || "Bearer";
  account.scopes = String(result.scope || "").split(" ").filter(Boolean);
  account.tokenExpiry = result.expires_in ? new Date(Date.now() + Number(result.expires_in) * 1000) : account.tokenExpiry;
  account.connected = true;
  await account.save();
  return account.accessToken;
}

async function upsertMicrosoftAccount(userId, tokenResult) {
  const graphClient = createGraphClient(tokenResult.access_token);
  const profile = await graphClient.api("/me").get();

  const account = await MicrosoftAccount.findOneAndUpdate(
    { userId },
    {
      userId,
      microsoftUserId: profile.id || "",
      email: String(profile.mail || profile.userPrincipalName || "").toLowerCase(),
      connected: true,
      accessToken: tokenResult.access_token || "",
      refreshToken: tokenResult.refresh_token || "",
      scopes: String(tokenResult.scope || "").split(" ").filter(Boolean),
      tokenType: tokenResult.token_type || "Bearer",
      tokenExpiry: tokenResult.expires_in ? new Date(Date.now() + Number(tokenResult.expires_in) * 1000) : null,
      metadata: {
        displayName: profile.displayName || "",
        jobTitle: profile.jobTitle || "",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return account;
}

async function getDelegatedGraphClient(userId) {
  const account = await MicrosoftAccount.findOne({ userId });
  if (!account?.connected) {
    return null;
  }

  let token = account.accessToken;
  if (!token || (account.tokenExpiry && new Date(account.tokenExpiry).getTime() <= Date.now() + 60 * 1000)) {
    token = await refreshUserAccessToken(account);
  }

  return createGraphClient(token);
}

async function getInboxMessages({ userId, top = 20 }) {
  const delegated = await getDelegatedGraphClient(userId);
  if (delegated) {
    const response = await delegated
      .api("/me/mailFolders/inbox/messages")
      .top(top)
      .orderby("receivedDateTime desc")
      .select("id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,isRead,webLink")
      .get();
    return response.value || [];
  }

  const config = getMicrosoftConfig();
  if (!hasApplicationMailboxConfig(config)) {
    return [];
  }

  const client = await getGraphClient();
  const response = await client
    .api(`/users/${config.mailbox}/mailFolders/inbox/messages`)
    .top(top)
    .orderby("receivedDateTime desc")
    .select("id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,isRead,webLink")
    .get();
  return response.value || [];
}

async function getMessageById({ userId, messageId }) {
  const delegated = await getDelegatedGraphClient(userId);
  if (delegated) {
    return delegated
      .api(`/me/messages/${messageId}`)
      .select("id,subject,from,toRecipients,ccRecipients,bccRecipients,body,bodyPreview,receivedDateTime,sentDateTime,webLink")
      .get();
  }

  const config = getMicrosoftConfig();
  if (!hasApplicationMailboxConfig(config)) {
    throw new Error("Microsoft mailbox is not configured.");
  }

  const client = await getGraphClient();
  return client
    .api(`/users/${config.mailbox}/messages/${messageId}`)
    .select("id,subject,from,toRecipients,ccRecipients,bccRecipients,body,bodyPreview,receivedDateTime,sentDateTime,webLink")
    .get();
}

async function sendMailViaMicrosoft(payload = {}, userId = null) {
  const recipients = normalizeRecipients(payload.to);
  if (!recipients.length) {
    throw new Error("At least one recipient email is required.");
  }

  const delegated = userId ? await getDelegatedGraphClient(userId) : null;
  const config = getMicrosoftConfig();
  const client = delegated || (hasApplicationMailboxConfig(config) ? await getGraphClient() : null);
  if (!client) {
    throw new Error("Microsoft mail is not configured.");
  }

  const cc = normalizeRecipients(payload.cc).map(toGraphRecipient);
  const bcc = normalizeRecipients(payload.bcc).map(toGraphRecipient);
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const endpoint = delegated ? "/me/sendMail" : `/users/${config.mailbox}/sendMail`;

  try {
    await client.api(endpoint).post({
      message: {
        subject: payload.subject || "Smart Enterprise Update",
        body: {
          contentType: payload.html ? "HTML" : "Text",
          content: payload.html || payload.text || "",
        },
        toRecipients: recipients.map(toGraphRecipient),
        ccRecipients: cc,
        bccRecipients: bcc,
        attachments,
      },
      saveToSentItems: true,
    });

    return {
      delivered: true,
      provider: delegated ? "microsoft-graph-user" : "microsoft-graph",
      mailbox: delegated ? "delegated-user" : config.mailbox,
      transportMessageId: `graph-${Date.now()}`,
    };
  } catch (error) {
    throw new Error(formatGraphError(error, "Microsoft Outlook mail delivery failed"));
  }
}

async function createTeamsMeeting(payload = {}, userId = null) {
  const config = getMicrosoftConfig();
  const delegated = userId ? await getDelegatedGraphClient(userId) : null;
  const client = delegated || (hasApplicationMailboxConfig(config) ? await getGraphClient() : null);
  const attendees = normalizeRecipients(payload.attendees || payload.participants || []);

  if (!client) {
    throw new Error("Microsoft Calendar is not configured.");
  }
  if (!attendees.length) {
    throw new Error("At least one participant email is required to create a Teams meeting.");
  }

  const start = payload.startDateTime || payload.startsAt || new Date();
  const end = payload.endDateTime || payload.endsAt || new Date(Date.now() + 30 * 60 * 1000);

  try {
    const event = await client.api(delegated ? "/me/events" : `/users/${config.mailbox}/events`).post({
      subject: payload.title || "Smart Enterprise Meeting",
      body: {
        contentType: "HTML",
        content: payload.description || payload.notes || "Meeting created from Smart Enterprise.",
      },
      start: toGraphDateTime(start),
      end: toGraphDateTime(end),
      attendees: attendees.map((item) => ({
        ...toGraphRecipient(item),
        type: "required",
      })),
      allowNewTimeProposals: true,
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      transactionId: crypto.randomUUID(),
      location: payload.location
        ? {
            displayName: String(payload.location).trim(),
          }
        : undefined,
      recurrence: payload.recurrence || undefined,
    });

    return {
      provider: delegated ? "microsoft-graph-user" : "microsoft-graph",
      eventId: event.id || "",
      joinUrl: event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || event.webLink || "",
      webLink: event.webLink || "",
      organizer: event.organizer?.emailAddress?.address || config.mailbox,
      raw: event,
    };
  } catch (error) {
    throw new Error(formatGraphError(error, "Microsoft Teams meeting creation failed"));
  }
}

async function listCalendarEvents({ userId, startDate, endDate, top = 30 }) {
  const config = getMicrosoftConfig();
  const delegated = userId ? await getDelegatedGraphClient(userId) : null;
  const client = delegated || (hasApplicationMailboxConfig(config) ? await getGraphClient() : null);
  if (!client) {
    return [];
  }

  const start = new Date(startDate || new Date());
  const end = new Date(endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const endpoint = delegated ? "/me/calendarView" : `/users/${config.mailbox}/calendarView`;
  const response = await client
    .api(endpoint)
    .query({
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      $top: String(top),
      $orderby: "start/dateTime",
    })
    .get();

  return response.value || [];
}

async function uploadBufferToOneDrive({
  buffer,
  fileName,
  folderPath = "",
  mimeType = "application/octet-stream",
}) {
  const config = getMicrosoftConfig();
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("A file buffer is required for OneDrive upload.");
  }
  if (!hasApplicationMailboxConfig(config)) {
    throw new Error("Microsoft OneDrive upload requires mailbox configuration.");
  }

  const client = await getGraphClient();
  const safeFolder = sanitizeFolderPath([config.oneDriveRootFolder, folderPath].filter(Boolean).join("/"));
  const safeFileName = sanitizeFileName(fileName);
  const drivePath = safeFolder ? `${safeFolder}/${safeFileName}` : safeFileName;

  try {
    const session = await client
      .api(`/users/${config.mailbox}/drive/root:/${drivePath}:/createUploadSession`)
      .post({
        item: {
          "@microsoft.graph.conflictBehavior": "replace",
          name: safeFileName,
        },
      });

    if (!session?.uploadUrl) {
      throw new Error("OneDrive upload session could not be created.");
    }

    let start = 0;
    let uploadedItem = null;
    while (start < buffer.length) {
      const end = Math.min(start + DEFAULT_CHUNK_SIZE, buffer.length);
      const chunk = buffer.slice(start, end);
      const response = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end - 1}/${buffer.length}`,
          "Content-Type": mimeType,
        },
        body: chunk,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "OneDrive upload chunk failed.");
      }

      if (response.status !== 202) {
        uploadedItem = await response.json();
      }

      start = end;
    }

    if (!uploadedItem?.id) {
      throw new Error("OneDrive upload completed without returning a file id.");
    }

    let shareLink = "";
    try {
      const linkResponse = await client.api(`/users/${config.mailbox}/drive/items/${uploadedItem.id}/createLink`).post({
        type: "view",
        scope: config.shareScope === "anonymous" ? "anonymous" : "organization",
      });
      shareLink = linkResponse?.link?.webUrl || "";
    } catch (error) {
      shareLink = uploadedItem.webUrl || "";
    }

    return {
      provider: "microsoft-onedrive",
      fileId: uploadedItem.id,
      fileName: uploadedItem.name || safeFileName,
      webUrl: uploadedItem.webUrl || "",
      shareUrl: shareLink || uploadedItem.webUrl || "",
      folderPath: safeFolder,
      size: uploadedItem.size || buffer.length,
      mimeType,
      raw: uploadedItem,
    };
  } catch (error) {
    throw new Error(formatGraphError(error, "OneDrive upload failed"));
  }
}

async function ensureOneDriveFolder(folderPath = "") {
  const config = getMicrosoftConfig();
  if (!hasApplicationMailboxConfig(config)) {
    throw new Error("Microsoft OneDrive folder creation requires mailbox configuration.");
  }

  const client = await getGraphClient();
  const safeFolder = sanitizeFolderPath([config.oneDriveRootFolder, folderPath].filter(Boolean).join("/"));
  if (!safeFolder) {
    throw new Error("A valid OneDrive folder path is required.");
  }

  const segments = safeFolder.split("/").filter(Boolean);
  let currentPath = "";
  let lastItem = null;

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    try {
      lastItem = await client.api(`/users/${config.mailbox}/drive/root:/${currentPath}`).get();
    } catch (error) {
      const parentPath = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
      const parentEndpoint = parentPath
        ? `/users/${config.mailbox}/drive/root:/${parentPath}:/children`
        : `/users/${config.mailbox}/drive/root/children`;

      try {
        lastItem = await client.api(parentEndpoint).post({
          name: segment,
          folder: {},
          "@microsoft.graph.conflictBehavior": "rename",
        });
      } catch (createError) {
        throw new Error(formatGraphError(createError, "Unable to create OneDrive folder"));
      }
    }
  }

  if (!lastItem?.id) {
    throw new Error("OneDrive folder could not be resolved.");
  }

  let shareUrl = lastItem.webUrl || "";
  try {
    const linkResponse = await client.api(`/users/${config.mailbox}/drive/items/${lastItem.id}/createLink`).post({
      type: "view",
      scope: config.shareScope === "anonymous" ? "anonymous" : "organization",
    });
    shareUrl = linkResponse?.link?.webUrl || shareUrl;
  } catch (error) {
    shareUrl = lastItem.webUrl || shareUrl;
  }

  return {
    provider: "microsoft-onedrive",
    folderId: lastItem.id,
    folderPath: safeFolder,
    webUrl: lastItem.webUrl || "",
    shareUrl,
    raw: lastItem,
  };
}

async function listOneDriveFiles(folderPath = "") {
  const config = getMicrosoftConfig();
  if (!hasApplicationMailboxConfig(config)) {
    return [];
  }

  const client = await getGraphClient();
  const safeFolder = sanitizeFolderPath([config.oneDriveRootFolder, folderPath].filter(Boolean).join("/"));
  if (!safeFolder) {
    return [];
  }

  try {
    const response = await client.api(`/users/${config.mailbox}/drive/root:/${safeFolder}:/children`).get();
    return response.value || [];
  } catch (error) {
    return [];
  }
}

async function getMicrosoftConnectionStatus(userId = null) {
  const config = getMicrosoftConfig();
  const base = {
    configured: hasMicrosoftGraphConfig(config),
    mailbox: config.mailbox,
    oneDriveRootFolder: config.oneDriveRootFolder,
    loginUrl: getMicrosoftAuthUrl({ userId }),
  };

  const account = userId ? await MicrosoftAccount.findOne({ userId }).lean() : null;
  if (account?.connected) {
    return {
      ...base,
      connected: true,
      delegated: true,
      email: account.email,
      tokenExpiry: account.tokenExpiry,
      scopes: account.scopes || [],
    };
  }

  if (!base.configured) {
    return {
      ...base,
      connected: false,
      reason: "Missing Microsoft Graph configuration.",
    };
  }

  if (!hasApplicationMailboxConfig(config)) {
    return {
      ...base,
      connected: false,
      reason: "Mailbox email is not configured for app-level Microsoft access.",
    };
  }

  try {
    const client = await getGraphClient();
    const user = await client.api(`/users/${config.mailbox}`).get();
    return {
      ...base,
      connected: true,
      delegated: false,
      displayName: user.displayName || "",
      userPrincipalName: user.userPrincipalName || config.mailbox,
    };
  } catch (error) {
    return {
      ...base,
      connected: false,
      reason: formatGraphError(error, "Unable to connect to Microsoft Graph"),
    };
  }
}

module.exports = {
  DEFAULT_SCOPES,
  acquireMicrosoftAccessToken,
  createTeamsMeeting,
  exchangeAuthorizationCode,
  getDelegatedGraphClient,
  getGraphClient,
  getInboxMessages,
  getMessageById,
  getMicrosoftAuthUrl,
  getMicrosoftConfig,
  getMicrosoftConnectionStatus,
  hasApplicationMailboxConfig,
  hasMicrosoftGraphConfig,
  listCalendarEvents,
  listOneDriveFiles,
  refreshUserAccessToken,
  sendMailViaMicrosoft,
  ensureOneDriveFolder,
  toGraphDateTime,
  upsertMicrosoftAccount,
  uploadBufferToOneDrive,
};
