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
waitForKeyElements(
  '[data-anonymize="person-name"]',
  generateHideButtons,
  false
);
waitForKeyElements('[data-anonymize="person-name"]', onNewResults, false);

function getPersonContainer(person) {
  return person.closest(".artdeco-list__item");
}
function hidePerson(person) {
  const container = getPersonContainer(person);
  container.classList.add("hidden");
  person.classList.add("hidden");
}
function displayPerson(person) {
  const container = getPersonContainer(person);
  container.classList.remove("hidden");
  person.classList.remove("hidden");
}
function getPersonName(person) {
  return person.innerHTML.trim();
}
function getPersonFirstName(person) {
  const names = getPersonName(person).split(" ");
  return names.filter((name) => name.length > 1)[0];
}
function isOpenProfile(person) {
  const name = getPersonName(person);
  return openProfiles.includes(name);
}
function getAllPersons() {
  return document.querySelectorAll('[data-anonymize="person-name"]');
}
function getVisiblePersons() {
  return document.querySelectorAll(
    '[data-anonymize="person-name"]:not(.hidden)'
  );
}

function displayAllProfiles() {
  const persons = getAllPersons();
  persons.forEach((person) => {
    displayPerson(person);
  });
}

function displayOpenProfiles() {
  displayAllProfiles();
  const persons = getAllPersons();
  persons.forEach((person) => {
    if (!isOpenProfile(person)) hidePerson(person);
  });
}

function displayClosedProfiles() {
  displayAllProfiles();
  const persons = getAllPersons();
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
// Generate individual hide buttons
//--------------------------------------------
waitForKeyElements("#search-results-container", generateHideButtons);
function generateHideButtons() {
  const persons = getAllPersons();
  console.log(persons);
  persons.forEach((person) => {
    const container = getPersonContainer(person);
    const buttonsList = container.querySelector(".list-style-none");

    if (buttonsList.querySelector(".hide-person-btn")) return;

    const hideHTML = `
      <li>
        <button class="hide-person-btn">Hide</button>
      </li>
    `;
    buttonsList.insertAdjacentHTML("beforeEnd", hideHTML);
    buttonsList.querySelector(".hide-person-btn").onclick = () =>
      hidePerson(person);
  });
}

//--------------------------------------------
// Generate UI
//--------------------------------------------
waitForKeyElements("#global-typeahead-search-input", createUI);

var messagesSent = 0;
var connectionsSent = 0;
function createUI(jNode) {
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

function updateMessagesSent(value) {
  messagesSent = value;
  const messageCounter = document.querySelector("#message-counter");
  messageCounter.innerHTML = `Messages: ${messagesSent}`;
}

function updateConnectionsSent(value) {
  connectionsSent = value;
  const connectCounter = document.querySelector("#connection-counter");
  connectCounter.innerHTML = `Connections: ${connectionsSent}`;
}

function getDropdown(person) {
  const row = person.closest(".artdeco-list__item");
  return row.querySelector(".artdeco-dropdown");
}
function displayDropdown(person) {
  const dropdown = getDropdown(person);
  const dropdownButton = dropdown.querySelector(".artdeco-dropdown__trigger");
  dropdownButton.click();
  return true;
}
function getDropdownButtons(person) {
  const dropdown = getDropdown(person);
  return dropdown.querySelectorAll("li");
}
function pressMessageButton(person) {
  const buttons = getDropdownButtons(person);
  const messageButton = buttons[2] || buttons[1];
  messageButton.children[0].click();
  return true;
}
function pressConnectButton(person) {
  const buttons = getDropdownButtons(person);
  const connectButton = buttons[0];
  if (connectButton.innerText !== "Connect") return false;
  connectButton.children[0].click();
  return true;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const openProfileSubject = `Senior Javascript Developer, 4+ years of exp., looking for remote work`;
const openProfileMessage = (name) => `Hello ${name},

I saw that you are an experienced IT recruiter.

I’m a senior Javascript developer with 4+ years of exp, currently in between projects, looking for remote work.

If you know of any open positions, I would appreciate your help!

Best regards`;

async function sendMessages() {
  const persons = getVisiblePersons();

  for (const person of persons) {
    displayDropdown(person);
    await sleep(500);

    pressMessageButton(person);
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

    const firstName = getPersonFirstName(person);
    subjectInput.value = openProfileSubject;
    messageInput.value = openProfileMessage(firstName);

    subjectInput.dispatchEvent(new Event("keyup"));
    messageInput.dispatchEvent(new Event("input"));
    subjectInput.setAttribute("marked", "true");
    await sleep(500);

    const sendButton = messageContainer.querySelector(
      ".artdeco-button--primary"
    );
    sendButton.click();

    updateMessagesSent(messagesSent + 1);
    await sleep(500);

    const closeMessageContainerButton = messageContainer.querySelector(
      '[data-control-name="overlay.close_overlay"]'
    );
    closeMessageContainerButton.click();
    await sleep(500);
  }
}

const connectMessage = (name) => `Hello ${name},

I saw that you are an experienced IT recruiter. I would appreciate the possibility of networking with you!

Best regards

Andrei Stoica`;

async function sendConnects() {
  const persons = getVisiblePersons();

  for (const person of persons) {
    displayDropdown(person);
    await sleep(500);

    if (!pressConnectButton(person)) continue;
    await sleep(500);

    const invitationModal = document.querySelector(".artdeco-modal");

    const connectInput = invitationModal.querySelector(
      "textarea#connect-cta-form__invitation"
    );

    const firstName = getPersonFirstName(person);
    connectInput.value = connectMessage(firstName);

    const sendButton = invitationModal.querySelector(".connect-cta-form__send");
    sendButton.click();

    updateConnectionsSent(connectionsSent + 1);
    await sleep(500);

    const closeModalButton = invitationModal.querySelector(
      ".artdeco-modal__dismiss"
    );
    closeModalButton.click();
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
