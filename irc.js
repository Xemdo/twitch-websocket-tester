const client_id = '4ofh8m0706jqpholgk00u3xvb4spct';
const scopes = 'chat:read chat:edit';
const redirectURI = 'https://xemdo.github.io/twitch-websocket-tester/irc.html';
const websocketUrl = 'wss://irc-ws.chat.twitch.tv:443';

var access_token;
var socket;
var user_id;
var username;

window.addEventListener('load', () => {
    linkAuthUrl();

    document.getElementById('btnClose').disabled = true;

    // Check for authorization
    const urlParams = new URLSearchParams(window.location.search);
    if (document.location.hash != '') {
        document.getElementById('connect').style.visibility = 'visible';
        
        let r = document.location.hash.match(/.*access_token=(.[^&]+).*scope=(.[^&]+).*/);
        access_token = r[1];
    }
});

function linkAuthUrl() {
    let url =
        'https://id.twitch.tv/oauth2/authorize' +
        '?response_type=token' +
        '&client_id=' + client_id +
        '&redirect_uri=' + encodeURIComponent(redirectURI) +
        '&scope=' + encodeURIComponent(scopes);

        document.getElementById('authorize').href = url;
}

function connectWebsocket() {
    socket = new WebSocket(websocketUrl);

    socket.addEventListener('open', (event) => {
        writeLog('Connected to ' + websocketUrl);

        document.getElementById("btnConnect").disabled = true;
        document.getElementById("btnClose").disabled = false;

        getUserID();

        if (document.getElementById('chkSendReq').checked) {
            sendMessage('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
        }

        if (document.getElementById('chkSendPassNick').checked) {
            sendMessage('PASS oauth:' + access_token);
            sendMessage('NICK ' + username);
        }
    });

    socket.addEventListener('close', (event) => {
        socket = undefined;
        writeLog('Websocket closed; wasClean[' + event.wasClean + ']; code[' + event.code + ']; Reason: ' + event.reason);

        document.getElementById("btnConnect").disabled = false;
        document.getElementById("btnClose").disabled = true;
    });

    socket.addEventListener('message', (event) => {
        data = event.data;
        if (document.getElementById("chkNewlinePlaintext").checked) {
            data = data.replaceAll("\r", "\\r").replaceAll("\n", "\\n");
        }

        writeLog(data, "RECEIVE")

        //data = JSON.parse(event.data);
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

function sendPayload() {
    var lines = document.getElementById("payload").value.split('\n');
    for (var i = 0; i < lines.length; i++) {
        sendMessage(lines[i]);
        writeLog(lines[i], "SEND");
    }

    document.getElementById("payload") = '';
}

function sendMessage(message) {
    socket.send(message);
}

function timestamp() {
    return new Date(Date.now()).toISOString();
}

function writeLog(msg, direction) {
    let log = document.getElementById('log');

    let msgNode = document.createElement('span');
    let brNode = document.createElement('br');

    if (direction == undefined) {
        msgNode.innerText = '[' + timestamp() + '] ' + msg;
    } else {
        msgNode.innerText = '[' + timestamp() + ' // ' + direction + '] ' + msg;
    }
    

    log.appendChild(msgNode);
    log.appendChild(brNode);
}

function clearLog() {
    let log = document.getElementById('log');
    log.innerHTML = '';
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
        username = data.login;
    });
}