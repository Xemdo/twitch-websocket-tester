const client_id = '4ofh8m0706jqpholgk00u3xvb4spct';

var access_token;
var url_scopes;

var socket;
var session_id;
var user_id;

window.addEventListener('load', () => {
    autofillProduction();

    // Default scopes
    updateAuthUrl([ 'channel:moderate', 'moderation:read', 'moderator:manage:shield_mode' ]);
    document.getElementById('scopes').value = 'channel:moderate\nmoderation:read\nmoderator:manage:shield_mode';

    // Check for authorization
    const urlParams = new URLSearchParams(window.location.search);
    if (document.location.hash != '') {
        document.getElementById('connect').style.visibility = 'visible';
        
        let r = document.location.hash.match(/.*access_token=(.[^&]+).*scope=(.[^&]+).*/);
        access_token = r[1];
        url_scopes = r[2];
    }
});

function updateAuthUrl(customScopes) {
    if (customScopes != undefined) {
        document.getElementById('authorize').href = getAuthUrl(customScopes);
        return;
    }

    const textarea = document.getElementById('scopes').value;

    var scopes = [];
    textarea.split(/\r?\n/).forEach((scope) => {
        if (scope.trim() != '') {
            scopes.push(scope.trim());
        }
    });

    document.getElementById('authorize').href = getAuthUrl(scopes);
}

function getAuthUrl(scopes) {
    // https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=4ofh8m0706jqpholgk00u3xvb4spct&redirect_uri=http%3A%2F%2Flocalhost%3A8080&scope=channel%3Amanage%3Apolls
    let url =
        'https://id.twitch.tv/oauth2/authorize' +
        '?response_type=token' +
        '&client_id=' + client_id +
        '&redirect_uri=http%3A%2F%2Flocalhost%3A9090' +
        '&scope=';
    
    scopes.forEach((scope) => {
        url += encodeURIComponent(scope) + '+';
    });

    url = url.substring(0, url.length - 1);

    return url;
}

function connectWebsocket() {
    if (socket != undefined) {
        console.log("Socket already opened");
        return;
    }

    let websocketUrl = document.getElementById('websocket-url').value;

    socket = new WebSocket(websocketUrl);

    socket.addEventListener('open', (event) => {
        writeLog('Connected to ' + websocketUrl);

        getUserID();

        document.getElementById("btnConnect").disabled = true;
        document.getElementById("btnClose").disabled = false;
    });

    socket.addEventListener('error', (event) => {
        writeLog('ERROR: See console');
        console.log("Websocket error: ", event);
    });

    socket.addEventListener('close', (event) => {
        socket = undefined;
        session_id = undefined;
        writeLog('Websocket closed; wasClean[' + event.wasClean + ']; code[' + event.code + ']; Reason: ' + event.reason)

        document.getElementById("btnConnect").disabled = false;
        document.getElementById("btnClose").disabled = true;
    });

    socket.addEventListener('message', (event) => {
        if (event.data.includes(`"message_type":"session_keepalive"`)) {
            writeLog(event.data, true)
        } else {
            writeLog(event.data, false)
        }

        data = JSON.parse(event.data);

        if (data.metadata.message_type == 'session_welcome') {
            session_id = data.payload.session.id;
        }
    });
}

function disconnectWebsocket() {
    console.log("Socket already closed");
    if (socket == undefined) {
        return;
    }

    socket.close();
    socket = undefined;
    session_id = undefined;
    writeLog('Socket manually closed');
}

function getUserID() {
    fetch('https://id.twitch.tv/oauth2/validate', {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "OAuth " + access_token
        }
    })
    .then(async (response) => {
        data = await response.json();
        user_id = data.user_id;
    });
}

async function subscribe() {
    data = JSON.parse(document.getElementById("subscriptions").value);
    if (data.transport == undefined) {
        data.transport = {}
    }
    data.transport.method = 'websocket';
    data.transport.session_id = session_id;

    let subscriptionUrl = document.getElementById('subscription-url').value;

    const response = await fetch(subscriptionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + access_token,
            'Client-Id': client_id,
        },
        body: JSON.stringify(data)
    });

    console.log(await response.json());

    if (response.status >= 200 && response.status <= 299) {
        writeLog('Subscribed to ' + data.type + ' v' + data.version);
    } else {
        writeLog('Unable to subscribe to ' + data.type + ' v' + data.version + '. Err: ' + response.status);
    }
}

function sendSpamText() {
    socket.send("Hi its Xemdo (Marc)! I'm testing this for the Twitch CLI, so if it logs this please ignore!");
}

function timestamp() {
    return new Date(Date.now()).toISOString();
}

function writeLog(msg, keepalive) {
    let log = document.getElementById('log');

    let msgNode = document.createElement('span');
    let brNode = document.createElement('br');
    if (keepalive) {
        msgNode.classList.add('keepalive');
        msgNode.style.display = (document.getElementById('chkHideKeepalive').checked ? 'none' : 'inline');

        brNode.classList.add('keepalive');
        brNode.style.display = (document.getElementById('chkHideKeepalive').checked ? 'none' : 'inline');
    }
    msgNode.innerText = '[' + timestamp() + '] ' + msg;

    log.appendChild(msgNode);
    log.appendChild(brNode);
}

function clearLog() {
    let log = document.getElementById('log');
    log.innerHTML = '';
}

function toggleHideKeepalive() {
    if (document.getElementById('chkHideKeepalive').checked) {
        document.querySelectorAll('.keepalive').forEach(e => {
            e.style.display = 'none';
        });
    } else {
        document.querySelectorAll('.keepalive').forEach(e => {
            e.style.display = 'inline';
        });
    }
}

function autofillCLI() {
    document.getElementById('websocket-url').value = 'ws://localhost:8080/ws';
    document.getElementById('subscription-url').value = 'http://localhost:8080/eventsub/subscriptions';
}

function autofillProduction() {
    document.getElementById('websocket-url').value = 'wss://eventsub-beta.wss.twitch.tv/ws';
    document.getElementById('subscription-url').value = 'https://api.twitch.tv/helix/eventsub/subscriptions';
}

function premadeSub(subscriptionType) {
    let subscription = document.getElementById('subscriptions');

    switch (subscriptionType) {
        case 'channel.update':
            subscription.value =
`{
    "type": "channel.update",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'channel.ban':
            subscription.value =
`{
    "type": "channel.ban",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'channel.unban':
            subscription.value =
`{
    "type": "channel.unban",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'channel.moderator.add':
            subscription.value =
`{
    "type": "channel.moderator.add",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'channel.moderator.remove':
            subscription.value =
`{
    "type": "channel.moderator.remove",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'channel.shield_mode.begin':
            subscription.value =
`{
    "type": "channel.shield_mode.begin",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}",
        "moderator_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'channel.shield_mode.end':
            subscription.value =
`{
    "type": "channel.shield_mode.end",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}",
        "moderator_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'stream.online':
            subscription.value =
`{
    "type": "stream.online",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'stream.offline':
            subscription.value =
`{
    "type": "stream.offline",
    "version": "1",
    "condition": {
        "broadcaster_user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
        case 'user.update':
            subscription.value =
`{
    "type": "user.update",
    "version": "1",
    "condition": {
        "user_id": "${user_id}"
    },
    "transport": {
        "method": "websocket",
        "session_id": "${session_id}"
    }
}`
            break;
    }
}