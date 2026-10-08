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

const results =
    document.querySelector(
        "#results"
    );

const winnerDisplay =
    document.querySelector(
        "#winner-display"
    );

const resultsContainer =
    document.querySelector(
        "#results-container"
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
// LOBBY ERROR
// ========================================

socket.on(
    "lobby-error",
    ({ message }) => {

        lobbyMessage.textContent =
            message;

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

        if (
            !username ||
            !room
        ) {

            lobbyMessage.textContent =
                "Please enter a username and room code.";

            return;

        }

        lobbyMessage.textContent =
            "Joining room...";

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

        lobby.hidden =
            true;

        roomSection.hidden =
            false;

        roomDisplay.textContent =
            roomCodeInput.value
                .trim()
                .toUpperCase();

        playerList.innerHTML =
            "";

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

                playerList.appendChild(
                    li
                );

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

        socket.emit(
            "player-ready"
        );

        readyButton.disabled =
            true;

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
    ({
        round,
        characters
    }) => {

        console.log(
            "Draft started!",
            "Round:",
            round
        );

        readyMessage.textContent =
            "🎴 Draft in progress!";

        roundNumber.textContent =
            round;

        draft.hidden =
            false;

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

    charactersContainer.innerHTML =
        "";

    characters.forEach(
        (character) => {

            const card =
                document.createElement(
                    "article"
                );

            card.classList.add(
                "character-card"
            );

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

        button.disabled =
            true;


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
    ({
        round,
        characters
    }) => {

        console.log(
            `Starting round ${round}`
        );

        roundNumber.textContent =
            round;

        renderCharacters(
            characters
        );

    }
);


// ========================================
// RENDER RESULTS
// ========================================

function renderResults(
    resultsData,
    winners
) {

    resultsContainer.innerHTML =
        "";

    winnerDisplay.innerHTML =
        "";


    // ====================================
    // WINNER
    // ====================================

    if (
        winners.length === 1
    ) {

        winnerDisplay.innerHTML = `
            <div class="winner-banner">
                🏆
                <strong>
                    ${winners[0].username}
                </strong>
                wins the draft!
            </div>
        `;

    } else {

        const winnerNames =
            winners
                .map(
                    (winner) =>
                        winner.username
                )
                .join(" & ");

        winnerDisplay.innerHTML = `
            <div class="winner-banner">
                🤝
                <strong>
                    ${winnerNames}
                </strong>
                tied!
            </div>
        `;

    }


    // ====================================
    // PLAYER RESULTS
    // ====================================

    resultsData.forEach(
        (player) => {

            const resultCard =
                document.createElement(
                    "article"
                );

            resultCard.classList.add(
                "result-card"
            );


            const characterList =
                player.team
                    .map(
                        (character) => `
                            <li>
                                ${character.icon}
                                ${character.name}
                                <span>
                                    ${character.power}
                                </span>
                            </li>
                        `
                    )
                    .join("");


            resultCard.innerHTML = `
                <h3>
                    ${player.username}
                </h3>

                <h4>
                    Team Power:
                    ${player.score}
                </h4>

                <ul>
                    ${characterList}
                </ul>
            `;


            resultsContainer.appendChild(
                resultCard
            );

        }
    );

}


// ========================================
// DRAFT ENDED
// ========================================

socket.on(
    "draft-ended",
    ({
        results: draftResults,
        winners
    }) => {

        console.log(
            "Draft ended!",
            draftResults
        );

        draft.hidden =
            true;

        readyButton.hidden =
            true;

        readyMessage.textContent =
            "Draft complete!";

        results.hidden =
            false;

        renderResults(
            draftResults,
            winners
        );

    }
);