async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Convert username → Twitch ID
async function getTwitchID(username) {
  const data = await fetchJSON(`https://api.ivr.fi/v2/twitch/user?login=${username}`);
  if (!data || !data[0]) return null;
  return data[0].id;
}

// Load logs using the ID (REQUIRED)
async function getLogs(channelID, userID) {
  if (userID) {
    return fetchJSON(`https://logs.ivr.fi/v2/twitch/user/${userID}?channel=${channelID}&limit=500`);
  } else {
    return fetchJSON(`https://logs.ivr.fi/v2/twitch/channel/${channelID}?limit=500`);
  }
}

// Load emotes
async function loadEmotes(channelID) {
  const [seven, bttv, ffz] = await Promise.all([
    fetchJSON(`https://7tv.io/v3/users/twitch/${channelID}`),
    fetchJSON(`https://api.betterttv.net/3/cached/users/twitch/${channelID}`),
    fetchJSON(`https://api.frankerfacez.com/v1/room/id/${channelID}`)
  ]);

  const emotes = {};

  // 7TV
  if (seven?.emote_set?.emotes) {
    for (const e of seven.emote_set.emotes) {
      emotes[e.name] = `https://cdn.7tv.app/emote/${e.id}/3x.webp`;
    }
  }

  // BTTV
  if (bttv) {
    [...bttv.channelEmotes, ...bttv.sharedEmotes].forEach(e => {
      emotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/3x`;
    });
  }

  // FFZ
  if (ffz?.sets) {
    Object.values(ffz.sets).forEach(set => {
      set.emoticons.forEach(e => {
        const url = e.urls["4"] || e.urls["2"] || e.urls["1"];
        emotes[e.name] = (url.startsWith("//") ? "https:" + url : url);
      });
    });
  }

  return emotes;
}

function renderEmotes(text, emotes) {
  const parts = text.split(/(\s+)/);
  return parts.map(word =>
    emotes[word] ? `<img class="emote" src="${emotes[word]}">` : word
  ).join("");
}

function renderChat(logs, emotes) {
  const chat = document.getElementById("chat");
  chat.innerHTML = "";

  logs.forEach(msg => {
    if (!msg.message) return;

    const div = document.createElement("div");
    div.className = "chat-line";

    div.innerHTML = `
      <div class="badges"></div>
      <span class="username">${msg.username}:</span>
      <span class="message">${renderEmotes(msg.message, emotes)}</span>
    `;

    chat.appendChild(div);
  });
}

document.getElementById("load").addEventListener("click", async () => {
  const channel = document.getElementById("channel").value.trim().toLowerCase();
  const user = document.getElementById("user").value.trim().toLowerCase();

  if (!channel) return alert("Enter a channel.");

  const channelID = await getTwitchID(channel);
  if (!channelID) return alert("Channel not found.");

  const userID = user ? await getTwitchID(user) : null;

  const [logs, emotes] = await Promise.all([
    getLogs(channelID, userID),
    loadEmotes(channelID)
  ]);

  if (!logs) return alert("No logs found.");

  renderChat(logs, emotes);
});
