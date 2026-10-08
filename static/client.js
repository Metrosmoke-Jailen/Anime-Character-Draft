// ========================================
// SOCKET CONNECTION
// ========================================

const socket = io();


// ========================================
// DOM ELEMENTS
// ========================================

const connectionStatus =
    document.querySelector(
        "#connection-status"
    );

const usernameInput =
    document.querySelector(
        "#username"
    );

const roomCodeInput =
    document.querySelector(
        "#room-code"
    );

const joinButton =
    document.querySelector(
        "#join-button"
    );

const lobby =
    document.querySelector(
        "#lobby"
    );

const roomSection =
    document.querySelector(
        "#room"
    );

const lobbyMessage =
    document.querySelector(
        "#lobby-message"
    );

const roomDisplay =
    document.querySelector(
        "#room-display"
    );

const playerList =
    document.querySelector(
        "#player-list"
    );

const readyButton =
    document.querySelector(
        "#ready-button"
    );

const readyMessage =
    document.querySelector(
        "#ready-message"
    );

const draft =
    document.querySelector(
        "#draft"
    );

const roundNumber =
    document.querySelector(
        "#round-number"
    );

const charactersContainer =
    document.querySelector(
        "#characters"
    );


// ========================================
// SOCKET CONNECTED
// ========================================

socket.on(
    "connect",
    () => {

        console.log(
            "Connected to server:",
            socket.id
        );


        connectionStatus.textContent =
            "🟢 Connected to server";

    }
);


// ========================================
// JOIN ROOM
// ========================================

joinButton.addEventListener(
    "click",
    () => {

        const username =
            usernameInput.value.trim();

        const room =
            roomCodeInput.value
                .trim()
                .toUpperCase();


        // Validate inputs
        if (
            !username ||
            !room
        ) {

            lobbyMessage.textContent =
                "Please enter a username and room code.";

            return;

        }


        // Send event to server
        socket.emit(
            "join-room",
            {
                username,
                room
            }
        );

    }
);


// ========================================
// ROOM UPDATE
// ========================================

socket.on(
    "room-update",
    ({ players }) => {

        // Hide lobby
        lobby.hidden = true;


        // Show room
        roomSection.hidden = false;


        // Display room code
        roomDisplay.textContent =
            roomCodeInput.value
                .trim()
                .toUpperCase();


        // Clear current player list
        playerList.innerHTML = "";


        // Render players
        players.forEach(
            (player) => {

                const li =
                    document.createElement(
                        "li"
                    );


                li.textContent =
                    `${player.username} ${
                        player.ready
                            ? "✅ Ready"
                            : "⏳ Not Ready"
                    }`;


                playerList.appendChild(li);

            }
        );

    }
);


// ========================================
// READY BUTTON
// ========================================

readyButton.addEventListener(
    "click",
    () => {

        // Tell server player is ready
        socket.emit(
            "player-ready"
        );


        // Prevent duplicate clicks
        readyButton.disabled = true;


        readyButton.textContent =
            "Ready!";


        readyMessage.textContent =
            "Waiting for the other players...";

    }
);


// ========================================
// START DRAFT
// ========================================

socket.on(
    "start-draft",
    ({ round, characters }) => {

        console.log(
            "Draft started!",
            "Round:",
            round
        );


        readyMessage.textContent =
            "🎴 Draft in progress!";


        roundNumber.textContent =
            round;


        // Show draft section
        draft.hidden = false;


        // Display characters
        renderCharacters(
            characters
        );

    }
);


// ========================================
// RENDER CHARACTER CARDS
// ========================================

function renderCharacters(
    characters
) {

    // Clear previous cards
    charactersContainer.innerHTML = "";


    characters.forEach(
        (character) => {

            const card =
                document.createElement(
                    "article"
                );


            card.classList.add(
                "character-card"
            );


            // Store character ID
            card.dataset.characterId =
                character.id;


            card.innerHTML = `
                <div class="character-icon">
                    ${character.icon}
                </div>

                <h3>
                    ${character.name}
                </h3>

                <p>
                    ${character.anime}
                </p>

                <p>
                    Power: ${character.power}
                </p>

                <button>
                    Select
                </button>
            `;


            const button =
                card.querySelector(
                    "button"
                );


            // Select character
            button.addEventListener(
                "click",
                () => {

                    socket.emit(
                        "pick-character",
                        {
                            characterId:
                                character.id
                        }
                    );

                }
            );


            charactersContainer.appendChild(
                card
            );

        }
    );

}


// ========================================
// DRAFT UPDATE
// ========================================

socket.on(
    "draft-update",
    ({
        characterId,
        playerId,
        username
    }) => {

        // Find selected character card
        const card =
            document.querySelector(
                `[data-character-id="${characterId}"]`
            );


        if (!card) {
            return;
        }


        const button =
            card.querySelector(
                "button"
            );


        if (!button) {
            return;
        }


        // Prevent selecting again
        button.disabled = true;


        // Determine whether
        // current player made the pick
        if (
            playerId === socket.id
        ) {

            button.textContent =
                "🔒 You Picked This";


            card.classList.add(
                "picked-by-you"
            );

        } else {

            button.textContent =
                `🔒 Picked by ${username}`;


            card.classList.add(
                "picked-by-other"
            );

        }

    }
);


// ========================================
// NEXT ROUND
// ========================================

socket.on(
    "next-round",
    ({ round, characters }) => {

        console.log(
            `Starting round ${round}`
        );


        // Update round number
        roundNumber.textContent =
            round;


        // Render new characters
        renderCharacters(
            characters
        );

    }
);