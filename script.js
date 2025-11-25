// ----------------------------------
// Utility: Fetch JSON with fallback
// ----------------------------------
async function safeFetch(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// ----------------------------------
// Load logs from a public log API
// (This API works like kappa.lol)
// ----------------------------------
async function loadLogs(channel, username) {
    const url = username
        ? `https://logs.ivr.fi/v2/twitch/user/${channel}/${username}?limit=300`
        : `https://logs.ivr.fi/v2/twitch/channel/${channel}?limit=300`;

    return safeFetch(url);
}

// ----------------------------------
// Load emotes from 7TV, BTTV, FFZ
// ----------------------------------
async function loadEmotes(channel) {
    const [seventv, bttv, ffz] = await Promise.all([
        safeFetch(`https://7tv.io/v3/users/twitch/${channel}`),
        safeFetch(`https://api.betterttv.net/3/cached/users/twitch/${channel}`),
        safeFetch(`https://api.frankerfacez.com/v1/room/${channel}`)
    ]);

    const emotes = {};

    // 7TV
    if (seventv && seventv.emote_set && seventv.emote_set.emotes) {
        seventv.emote_set.emotes.forEach(e => {
            emotes[e.name] = `https://cdn.7tv.app/emote/${e.id}/3x.webp`;
        });
    }

    // BTTV
    if (bttv && bttv.channelEmotes) {
        bttv.channelEmotes.forEach(e => {
            emotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/3x`;
        });
    }
    if (bttv && bttv.sharedEmotes) {
        bttv.sharedEmotes.forEach(e => {
            emotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/3x`;
        });
    }

    // FFZ
    if (ffz && ffz.sets) {
        Object.values(ffz.sets).forEach(set => {
            set.emoticons.forEach(e => {
                emotes[e.name] = e.urls["4"] || e.urls["2"];
            });
        });
    }

    return emotes;
}

// ----------------------------------
// Render emotes inside messages
// ----------------------------------
function renderEmotes(text, emoteMap) {
    let result = text;

    for (const [name, url] of Object.entries(emoteMap)) {
        const regex = new RegExp(`\\b${name}\\b`, "g");
        result = result.replace(regex, `<img class="emote" src="${url}" />`);
    }

    return result;
}

// ----------------------------------
// Render badges
// ----------------------------------
function renderBadges(badges) {
    if (!badges) return "";

    return badges.map(b => `
        <img class="badge" src="${b.url}" title="${b.name}" />
    `).join("");
}

// ----------------------------------
// Render chat logs to the page
// ----------------------------------
function renderChat(logs, emotes) {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";

    logs.forEach(msg => {
        const text = renderEmotes(msg.message, emotes);
        const badgeHTML = renderBadges(msg.badges);

        chat.innerHTML += `
            <div class="chat-message">
                <div class="chat-user">
                    ${badgeHTML}
                    <span class="username">${msg.username}:</span>
                </div>
                <div class="message-text">${text}</div>
            </div>
        `;
    });
}

// ----------------------------------
// Main Button
// ----------------------------------
document.getElementById("loadLogs").addEventListener("click", async () => {
    const channel = document.getElementById("channel").value.toLowerCase();
    const username = document.getElementById("username").value.toLowerCase();

    if (!channel) return alert("Enter a channel");

    const logs = await loadLogs(channel, username);
    const emotes = await loadEmotes(channel);

    if (!logs) {
        return alert("No logs found for that channel/user.");
    }

    renderChat(logs, emotes);
});
