const socket = io();


// ========================================
// DOM ELEMENTS
// ========================================

const connectionStatus =
    document.querySelector("#connection-status");

const usernameInput =
    document.querySelector("#username");

const roomCodeInput =
    document.querySelector("#room-code");

const joinButton =
    document.querySelector("#join-button");

const lobby =
    document.querySelector("#lobby");

const roomSection =
    document.querySelector("#room");

const lobbyMessage =
    document.querySelector("#lobby-message");

const roomDisplay =
    document.querySelector("#room-display");

const playerList =
    document.querySelector("#player-list");

const readyButton =
    document.querySelector("#ready-button");

const readyMessage =
    document.querySelector("#ready-message");


// ========================================
// SOCKET CONNECTION
// ========================================

socket.on("connect", () => {

    console.log(
        "Connected to server:",
        socket.id
    );

    connectionStatus.textContent =
        "🟢 Connected to server";

});


// ========================================
// JOIN ROOM
// ========================================

joinButton.addEventListener("click", () => {

    const username =
        usernameInput.value.trim();

    const room =
        roomCodeInput.value
            .trim()
            .toUpperCase();


    // Make sure fields aren't empty
    if (!username || !room) {

        lobbyMessage.textContent =
            "Please enter a username and room code.";

        return;
    }


    // Send join request to server
    socket.emit("join-room", {
        username,
        room
    });

});


// ========================================
// ROOM UPDATE
// ========================================

socket.on("room-update", ({ players }) => {

    // Hide lobby
    lobby.hidden = true;

    // Show room
    roomSection.hidden = false;


    // Display room code
    roomDisplay.textContent =
        roomCodeInput.value
            .trim()
            .toUpperCase();


    // Clear existing players
    playerList.innerHTML = "";


    // Display every player
    players.forEach((player) => {

        const li =
            document.createElement("li");


        li.textContent =
            `${player.username} ${
                player.ready
                    ? "✅ Ready"
                    : "⏳ Not Ready"
            }`;


        playerList.appendChild(li);

    });

});


// ========================================
// READY BUTTON
// ========================================

readyButton.addEventListener("click", () => {

    // Tell server we're ready
    socket.emit("player-ready");


    // Prevent multiple clicks
    readyButton.disabled = true;

    readyButton.textContent =
        "Ready!";


    readyMessage.textContent =
        "Waiting for the other players...";

});


// ========================================
// DRAFT STARTED
// ========================================

socket.on("start-draft", ({ round }) => {

    console.log(
        "Draft started! Round:",
        round
    );


    readyMessage.textContent =
        `🎴 Draft started! Round ${round}`;

});