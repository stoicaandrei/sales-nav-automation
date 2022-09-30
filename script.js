// ==UserScript==
// @name            Linked open profiles
// @description     LinkedIn search highlight open profiles with: hide reccomendations popup, fix left filter width
// @version         1.3
// @namespace       https://www.linkedin.com

// @match           https://www.linkedin.com/sales/search/people*

// @require         http://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require         https://gist.github.com/raw/2625891/waitForKeyElements.js

// ==/UserScript==

console.log("[INFO] Script started");
console.log(window.location.href);

//--------------------------------------------
// Get JSON data
//--------------------------------------------
var dataJSON;
var openProfiles = [];

(function (open) {
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener(
      "readystatechange",
      function () {
        if (
          4 == this.readyState &&
          this.responseURL.startsWith(
            "https://www.linkedin.com/sales-api/salesApiLeadSearch"
          )
        ) {
          this.response.arrayBuffer().then(function (value) {
            const data = new TextDecoder("utf-8").decode(value);
            dataJSON = JSON.parse(data);
            openProfiles = dataJSON.elements
              .filter((value) => value.openLink)
              .map((item) => item.fullName);
          });
        }
      },
      false
    );
    open.apply(this, arguments);
  };
})(XMLHttpRequest.prototype.open);

//--------------------------------------------
// Filter profiles on scroll
//--------------------------------------------
var onNewResults = displayAllProfiles;
waitForKeyElements("#search-results-container", onNewResults);

function hidePerson(person) {
  const container = person.closest(".artdeco-list__item");
  container.classList.add("hidden");
}
function displayPerson(person) {
  const container = person.closest(".artdeco-list__item");
  container.classList.remove("hidden");
}
function isOpenProfile(person) {
  const name = person.innerHTML.trim();
  return openProfiles.includes(name);
}

function displayAllProfiles() {
  const persons = document.querySelectorAll('[data-anonymize="person-name"]');
  persons.forEach((person) => {
    displayPerson(person);
  });
}

function displayOpenProfiles() {
  displayAllProfiles();
  const persons = document.querySelectorAll('[data-anonymize="person-name"]');
  persons.forEach((person) => {
    if (!isOpenProfile(person)) hidePerson(person);
  });
}

function displayClosedProfiles() {
  displayAllProfiles();
  const persons = document.querySelectorAll('[data-anonymize="person-name"]');
  persons.forEach((person) => {
    if (isOpenProfile(person)) hidePerson(person);
  });
}

function toggleDisplay(mode) {
  switch (mode) {
    case "open":
      displayOpenProfiles();
      onNewResults = displayOpenProfiles;
      document.querySelector("#display-all-btn").disabled = false;
      document.querySelector("#display-open-btn").disabled = true;
      document.querySelector("#display-closed-btn").disabled = false;
      break;
    case "closed":
      displayClosedProfiles();
      onNewResults = displayClosedProfiles;
      document.querySelector("#display-all-btn").disabled = false;
      document.querySelector("#display-open-btn").disabled = false;
      document.querySelector("#display-closed-btn").disabled = true;
      break;
    default:
      displayAllProfiles();
      onNewResults = displayAllProfiles;
      document.querySelector("#display-all-btn").disabled = true;
      document.querySelector("#display-open-btn").disabled = false;
      document.querySelector("#display-closed-btn").disabled = false;
      break;
  }
}

//--------------------------------------------
// Generate UI
//--------------------------------------------
waitForKeyElements("#global-typeahead-search-input", createButtons);

var messagesSent = 0;
var connectionsSent = 0;
function createButtons(jNode) {
  const columnsContainer = document.querySelector(
    ".container-plain-no-border-radius"
  );
  const buttonsContainer = document.createElement("div");
  columnsContainer.appendChild(buttonsContainer);

  const uiHTML = `
  <button id="display-all-btn" disabled>Display All</button>
  <button id="display-open-btn">Display Open Profile</button>
  <button id="display-closed-btn">Display Closed Profile</button>
  <br><br>
  <button id="message-all-btn">Message All</button>
  <span id="message-counter">Messages: 0</span>
  <br>
  <button id="connect-all-btn">Connect All</button>
  <span id="connection-counter">Connections: 0</span>
  `;
  buttonsContainer.insertAdjacentHTML("beforeEnd", uiHTML);

  document.querySelector("#display-all-btn").onclick = () =>
    toggleDisplay("all");
  document.querySelector("#display-open-btn").onclick = () =>
    toggleDisplay("open");
  document.querySelector("#display-closed-btn").onclick = () =>
    toggleDisplay("closed");
  document.querySelector("#message-all-btn").onclick = sendMessages;
  document.querySelector("#connect-all-btn").onclick = sendConnects;
}

function updateCounters() {
  const messageCounter = document.querySelector("#message-counter");
  messageCounter.innerHTML = `Messages: ${messagesSent}`;

  const connectCounter = document.querySelector("#connection-counter");
  connectCounter.innerHTML = `Connections: ${connectionsSent}`;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const openProfileSubject = `Senior Javascript Developer, 4+ years of exp., looking for remote work`;
const openProfileMessage = (name) => `Hello ${name},

I saw that you are an experienced IT recruiter.

I’m a senior Javascript developer with 4+ years of exp, currently in between projects, looking for remote work.

If you know of any open positions, I would appreciate your help!

Best regards`;

function closeMessageContainer(messageContainer) {
  const closeMessageContainerButton = messageContainer.querySelector(
    '[data-control-name="overlay.close_overlay"]'
  );
  closeMessageContainerButton.click();
}

async function sendMessages() {
  const persons = document.querySelectorAll('[data-anonymize="person-name"]');

  for (const person of persons) {
    const row = person.closest(".artdeco-list__item");
    const dropdown = row.querySelector(".artdeco-dropdown");

    const dropdownButton = dropdown.querySelector(".artdeco-dropdown__trigger");
    dropdownButton.click();
    await sleep(500);

    const actions = dropdown.querySelectorAll("li");
    const messageAction = actions[2] || actions[1];
    messageAction.children[0].click();
    await sleep(500);

    const messageContainer = document.querySelector("#message-overlay");

    const prevMessages = messageContainer.querySelector("ul.list-style-none");
    if (prevMessages.children.length > 1) {
      closeMessageContainer(messageContainer);
      continue;
    }

    const subjectInput = messageContainer.querySelector(
      "input.compose-form__subject-field"
    );
    const messageInput = messageContainer.querySelector(
      "textarea.compose-form__message-field"
    );

    const name = person.innerHTML.trim().split(" ")[0];
    subjectInput.value = openProfileSubject;
    messageInput.value = openProfileMessage(name);

    subjectInput.dispatchEvent(new Event("keyup"));
    messageInput.dispatchEvent(new Event("input"));
    subjectInput.setAttribute("marked", "true");
    await sleep(500);

    const sendButton = messageContainer.querySelector(
      ".artdeco-button--primary"
    );
    sendButton.click();

    messagesSent++;
    updateCounters();
    await sleep(500);

    closeMessageContainer(messageContainer);
    await sleep(500);
  }
}

const connectMessage = (name) => `Hello ${name},

I saw that you are an experienced IT recruiter. I would appreciate the possibility of networking with you!

Best regards

Andrei Stoica`;

function closeInvitationModal(inivitationModal) {
  const closeModalButton = inivitationModal.querySelector(
    ".artdeco-modal__dismiss"
  );
  closeModalButton.click();
}

async function sendConnects() {
  const persons = document.querySelectorAll('[data-anonymize="person-name"]');

  for (const person of persons) {
    const row = person.closest(".artdeco-list__item");
    const dropdown = row.querySelector(".artdeco-dropdown");

    const dropdownButton = dropdown.querySelector(".artdeco-dropdown__trigger");
    dropdownButton.click();
    await sleep(500);

    const actions = dropdown.querySelectorAll("li");
    const connectAction = actions[0];
    if (connectAction.innerText !== "Connect") continue;

    connectAction.children[0].click();
    await sleep(500);

    const invitationModal = document.querySelector(".artdeco-modal");

    const connectInput = invitationModal.querySelector(
      "textarea#connect-cta-form__invitation"
    );

    const name = person.innerHTML.trim().split(" ")[0];
    connectInput.value = connectMessage(name);

    const sendButton = invitationModal.querySelector(".connect-cta-form__send");
    sendButton.click();

    connectionsSent++;
    updateCounters();
    await sleep(500);

    closeInvitationModal(invitationModal);
    await sleep(500);
  }
}

//--------------------------------------------
// Hide recommendations
//--------------------------------------------
waitForKeyElements(
  "section.lead-recommendations-carousel-v2__content-dropdown",
  hideRecomm
);

async function hideRecomm(jNode) {
  //console.log(jNode);
  jNode.hide();
}

//--------------------------------------------
// Fix left filter width
//--------------------------------------------
waitForKeyElements("div.container-plain", fixLeftFilter);

async function fixLeftFilter(jNode) {
  //console.log(jNode);
  jNode[0].style["max-width"] = "20%";
}

console.log("[INFO] Script finished");
