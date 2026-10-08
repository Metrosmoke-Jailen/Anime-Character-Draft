const socket = io();

const $ = selector =>
    document.querySelector(selector);

const connectionStatus = $("#connection-status");
const usernameInput = $("#username");
const roomCodeInput = $("#room-code");
const joinButton = $("#join-button");

const lobby = $("#lobby");
const lobbyMessage = $("#lobby-message");

const roomSection = $("#room");
const roomDisplay = $("#room-display");
const playerList = $("#player-list");

const readyButton = $("#ready-button");
const readyMessage = $("#ready-message");

const teamSection = $("#team-section");
const myTeam = $("#my-team");
const teamPower = $("#team-power");

const draft = $("#draft");
const roundNumber = $("#round-number");
const draftMessage = $("#draft-message");
const charactersContainer = $("#characters");

const timerValue = $("#timer-value");
const pickNotification = $("#pick-notification");

const results = $("#results");
const winnerDisplay = $("#winner-display");
const resultsContainer = $("#results-container");

let myTeamCharacters = [];
let timerInterval = null;

socket.on("connect", () => {
    connectionStatus.textContent =
        "🟢 Connected to server";
});

socket.on("lobby-error", ({ message }) => {
    lobbyMessage.textContent = message;
});

joinButton.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const room = roomCodeInput.value.trim().toUpperCase();

    if (!username || !room) {
        lobbyMessage.textContent =
            "Please enter a username and room code.";
        return;
    }

    lobbyMessage.textContent = "Joining room...";

    socket.emit("join-room", {
        username,
        room
    });
});

socket.on("room-update", ({ players }) => {
    lobby.hidden = true;
    roomSection.hidden = false;

    roomDisplay.textContent =
        roomCodeInput.value.trim().toUpperCase();

    playerList.innerHTML = "";

    players.forEach(player => {
        const li = document.createElement("li");

        li.textContent =
            `${player.username} ${
                player.ready
                    ? "✅ Ready"
                    : "⏳ Not Ready"
            }`;

        playerList.appendChild(li);
    });
});

readyButton.addEventListener("click", () => {
    socket.emit("player-ready");

    readyButton.disabled = true;
    readyButton.textContent = "Ready!";
    readyMessage.textContent =
        "Waiting for the other players...";
});

socket.on(
    "start-draft",
    ({ round, characters }) => {

        draft.hidden = false;
        draftMessage.textContent =
            "Choose your character!";
        pickNotification.textContent = "";
        roundNumber.textContent = round;

        renderCharacters(characters);
    }
);

function renderCharacters(characters) {
    charactersContainer.innerHTML = "";

    characters.forEach(character => {
        const card =
            document.createElement("article");

        card.className = "character-card";

        card.dataset.characterId =
            character.id;

        card.dataset.power =
            character.power;

        card.innerHTML = `
            <div class="character-icon">
                ${character.icon}
            </div>

            <h3>${character.name}</h3>

            <p>${character.anime}</p>

            <p>Power: ${character.power}</p>

            <button>Select</button>
        `;

        card.querySelector("button")
            .addEventListener("click", () => {

                socket.emit(
                    "pick-character",
                    {
                        characterId:
                            character.id
                    }
                );

            });

        charactersContainer.appendChild(card);
    });
}

socket.on("round-timer", ({ seconds }) => {
    startClientTimer(seconds);
});

function startClientTimer(seconds) {
    clearInterval(timerInterval);

    let remaining = seconds;
    timerValue.textContent = remaining;

    timerInterval = setInterval(() => {
        remaining--;

        timerValue.textContent =
            Math.max(remaining, 0);

        if (remaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

socket.on(
    "draft-update",
    ({
        characterId,
        playerId,
        username,
        automatic
    }) => {

        const card = document.querySelector(
            `[data-character-id="${characterId}"]`
        );

        if (!card) return;

        const button =
            card.querySelector("button");

        if (!button) return;

        button.disabled = true;

        const characterName =
            card.querySelector("h3")
                .textContent;

        if (playerId === socket.id) {

            button.textContent =
                automatic
                    ? "⏰ Auto Pick"
                    : "🔒 You Picked This";

            card.classList.add(
                "picked-by-you"
            );

            myTeamCharacters.push({
                name: characterName,

                icon:
                    card.querySelector(
                        ".character-icon"
                    ).textContent,

                power:
                    Number(
                        card.dataset.power
                    )
            });

            renderMyTeam();

            pickNotification.textContent =
                automatic
                    ? `⏰ Time expired. You received ${characterName}.`
                    : `✅ You picked ${characterName}.`;

        } else {

            button.textContent =
                automatic
                    ? `⏰ ${username} auto-picked`
                    : `🔒 Picked by ${username}`;

            card.classList.add(
                "picked-by-other"
            );

            pickNotification.textContent =
                automatic
                    ? `⏰ ${username} was assigned ${characterName}.`
                    : `⚔️ ${username} picked ${characterName}!`;
        }
    }
);

function renderMyTeam() {
    if (!myTeamCharacters.length) {
        myTeam.innerHTML =
            "<p>No characters drafted yet.</p>";

        teamPower.textContent = "0";
        return;
    }

    myTeam.innerHTML = "";

    const total = myTeamCharacters.reduce(
        (sum, character) =>
            sum + character.power,
        0
    );

    myTeamCharacters.forEach(character => {
        const element =
            document.createElement("div");

        element.className =
            "team-character";

        element.innerHTML = `
            <span>
                ${character.icon}
                ${character.name}
            </span>

            <strong>
                ${character.power}
            </strong>
        `;

        myTeam.appendChild(element);
    });

    teamPower.textContent = total;
}

socket.on(
    "next-round",
    ({ round, characters }) => {

        roundNumber.textContent = round;

        draftMessage.textContent =
            `⚔️ Round ${round}! Choose your character!`;

        pickNotification.textContent = "";

        renderCharacters(characters);
    }
);

socket.on(
    "player-disconnected",
    ({ username }) => {

        pickNotification.textContent =
            `⚠️ ${username} disconnected.`;
    }
);

socket.on(
    "draft-cancelled",
    ({ message }) => {

        clearInterval(timerInterval);

        draft.hidden = true;
        readyButton.hidden = true;

        readyMessage.textContent = message;

        pickNotification.textContent =
            "⚠️ Draft cancelled.";
    }
);

socket.on(
    "draft-ended",
    ({
        results: draftResults,
        winners
    }) => {

        clearInterval(timerInterval);

        draft.hidden = true;
        readyButton.hidden = true;

        readyMessage.textContent =
            "Draft complete!";

        results.hidden = false;

        renderResults(
            draftResults,
            winners
        );
    }
);

function renderResults(
    resultsData,
    winners
) {
    winnerDisplay.innerHTML = "";
    resultsContainer.innerHTML = "";

    if (winners.length === 1) {

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

        const names = winners
            .map(winner => winner.username)
            .join(" & ");

        winnerDisplay.innerHTML = `
            <div class="winner-banner">
                🤝
                <strong>${names}</strong>
                tied!
            </div>
        `;
    }

    resultsData.forEach(player => {

        const card =
            document.createElement("article");

        card.className = "result-card";

        const team = player.team
            .map(character => `
                <li>
                    <span>
                        ${character.icon}
                        ${character.name}
                    </span>

                    <span>
                        ${character.power}
                    </span>
                </li>
            `)
            .join("");

        card.innerHTML = `
            <h3>${player.username}</h3>

            <h4>
                Team Power: ${player.score}
            </h4>

            <ul>
                ${team}
            </ul>
        `;

        resultsContainer.appendChild(card);
    });
}