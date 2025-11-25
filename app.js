async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function loadLogs(channel, user) {
  let url;
  if (user) {
    url = `https://logs.ivr.fi/v2/twitch/user/${channel}/${user}?limit=500`;
  } else {
    url = `https://logs.ivr.fi/v2/twitch/channel/${channel}?limit=500`;
  }
  return safeFetch(url);
}

async function loadEmotes(channel) {
  const [seven, bttv, ffz] = await Promise.all([
    safeFetch(`https://7tv.io/v3/users/twitch/${channel}`),
    safeFetch(`https://api.betterttv.net/3/cached/users/twitch/${channel}`),
    safeFetch(`https://api.frankerfacez.com/v1/room/${channel}`)
  ]);

  const emoteMap = {};

  // 7TV
  if (seven && seven.emote_set && seven.emote_set.emotes) {
    for (const e of seven.emote_set.emotes) {
      emoteMap[e.name] = `https://cdn.7tv.app/emote/${e.id}/3x.webp`;
    }
  }

  // BTTV
  if (bttv) {
    (bttv.channelEmotes || []).forEach(e => {
      emoteMap[e.code] = `https://cdn.betterttv.net/emote/${e.id}/3x`;
    });
    (bttv.sharedEmotes || []).forEach(e => {
      emoteMap[e.code] = `https://cdn.betterttv.net/emote/${e.id}/3x`;
    });
  }

  // FFZ
  if (ffz && ffz.sets) {
    for (const set of Object.values(ffz.sets)) {
      set.emoticons.forEach(e => {
        const url = e.urls["4"] || e.urls["2"] || e.urls["1"];
        if (url) emoteMap[e.name] = (url.startsWith("//") ? "https:" + url : url);
      });
    }
  }

  return emoteMap;
}

function renderEmotes(text, emoteMap) {
  if (!text) return "";
  const words = text.split(/(\s+)/);
  return words.map(w => {
    const emoteUrl = emoteMap[w];
    if (emoteUrl) {
      return `<img class="emote" src="${emoteUrl}" />`;
    }
    return escapeHtml(w);
  }).join("");
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderBadges(badges) {
  if (!badges) return "";
  return badges.map(b => {
    return `<img src="${b.url}" title="${b.name}" class="badge" />`;
  }).join("");
}

function renderChat(logs, emoteMap) {
  const chat = document.getElementById("chat");
  chat.innerHTML = "";

  (logs.data || logs).forEach(msg => {
    const line = document.createElement("div");
    line.classList.add("chat-line");

    const badgeDiv = document.createElement("div");
    badgeDiv.classList.add("badges");
    badgeDiv.innerHTML = renderBadges(msg.badges || []);

    const userSpan = document.createElement("span");
    userSpan.classList.add("username");
    userSpan.textContent = msg.username;

    const messageSpan = document.createElement("span");
    messageSpan.classList.add("message");
    messageSpan.innerHTML = renderEmotes(msg.message, emoteMap);

    line.appendChild(badgeDiv);
    line.appendChild(userSpan);
    line.appendChild(messageSpan);

    chat.appendChild(line);
  });
}

document.getElementById("load").addEventListener("click", async () => {
  const channel = document.getElementById("channel").value.trim().toLowerCase();
  const user = document.getElementById("user").value.trim().toLowerCase();

  if (!channel) {
    alert("Enter a channel name");
    return;
  }

  const [logs, emoteMap] = await Promise.all([
    loadLogs(channel, user),
    loadEmotes(channel)
  ]);

  if (!logs) {
    alert("Could not fetch logs");
    return;
  }

  renderChat(logs, emoteMap);
});
