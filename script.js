let sevenTV = {};
let ffz = {};
let twitchEmotes = {}; // Twitch per-message emotes
let badgesCache = {};  // Chatterino-style badge system

async function loadLogs() {
    const channel = document.getElementById("channel").value.trim().toLowerCase();
    if (!channel) return;

    const logBox = document.getElementById("logs");
    logBox.innerHTML = "<p>Loading…</p>";

    // Load Emotes First
    await loadEmotes(channel);
    await loadBadges(channel);

    try {
        const res = await fetch(`https://recent-messages.robotty.de/api/v2/recent-messages/${channel}`);
        if (!res.ok) throw new Error("Channel has no logs or API unavailable.");

        const data = await res.json();

        logBox.innerHTML = "";

        data.messages.forEach(msg => {
            const el = document.createElement("div");
            el.classList.add("message");

            // Convert emotes in message
            const htmlMsg = renderMessage(msg);

            el.innerHTML = `
                ${renderBadges(msg.username)}
                <span class="username" style="color:${msg.color || '#fff'}">
                    ${msg.username}
                </span>:
                <span>${htmlMsg}</span>
            `;

            logBox.appendChild(el);
        });

    } catch (err) {
        logBox.innerHTML = `<p>Error: ${err.message}</p>`;
    }
}

/* ---------------------------------------------------
    LOAD 7TV + FFZ EMOTES
--------------------------------------------------- */

async function loadEmotes(channel) {
    // 7TV Global
    const sevenGlobal = await fetch("https://7tv.io/v3/emote-sets/global").then(r => r.json());
    sevenTV = {};
    sevenGlobal.emotes.forEach(e => {
        sevenTV[e.name.toLowerCase()] = `https://cdn.7tv.app/emote/${e.id}/1x.webp`;
    });

    // 7TV Channel
    try {
        const sevenUser = await fetch(`https://7tv.io/v3/users/twitch/${channel}`).then(r => r.json());
        if (sevenUser.emote_set && sevenUser.emote_set.emotes) {
            sevenUser.emote_set.emotes.forEach(e => {
                sevenTV[e.name.toLowerCase()] = `https://cdn.7tv.app/emote/${e.id}/1x.webp`;
            });
        }
    } catch {}

    // FFZ Global
    const ffzGlobal = await fetch("https://api.frankerfacez.com/v1/set/global").then(r => r.json());
    ffz = {};
    for (const set of Object.values(ffzGlobal.sets)) {
        set.emoticons.forEach(e => {
            ffz[e.name.toLowerCase()] = e.urls["1"] ? `https:${e.urls["1"]}` : null;
        });
    }

    // FFZ Channel
    try {
        const ffzChannel = await fetch(`https://api.frankerfacez.com/v1/room/${channel}`).then(r => r.json());
        for (const set of Object.values(ffzChannel.sets)) {
            set.emoticons.forEach(e => {
                ffz[e.name.toLowerCase()] = e.urls["1"] ? `https:${e.urls["1"]}` : null;
            });
        }
    } catch {}
}

/* ---------------------------------------------------
    LOAD CHATTERINO-STYLE BADGES
--------------------------------------------------- */

async function loadBadges(channel) {
    badgesCache = {};

    try {
        const sevenUser = await fetch(`https://7tv.io/v3/users/twitch/${channel}`).then(r => r.json());
        if (sevenUser.badges) {
            sevenUser.badges.forEach(b => {
                badgesCache[b.user_id] = b.badge ? b.badge.urls["1x"] : null;
            });
        }
    } catch {}

    // FFZ user badges
    try {
        const ffzRoom = await fetch(`https://api.frankerfacez.com/v1/room/${channel}`).then(r => r.json());
        if (ffzRoom.room && ffzRoom.room.moderator_badge) {
            badgesCache["mod"] = `https:${ffzRoom.room.moderator_badge}`;
        }
    } catch {}
}

/* ---------------------------------------------------
    EMOTE + BADGE RENDERING
--------------------------------------------------- */

function renderMessage(msg) {
    if (!msg.message || typeof msg.message !== "string") {
        return ""; // ignore system messages with no text
    }

    let text = msg.message;

    const parts = text.split(" ").map(word => {
        const lower = word.toLowerCase();

        if (sevenTV[lower]) {
            return `<img class="emote" src="${sevenTV[lower]}" class="emote">`;
        }

        if (ffz[lower]) {
            return `<img class="emote" src="${ffz[lower]}" class="emote">`;
        }

        return word;
    });

    return parts.join(" ");
}

