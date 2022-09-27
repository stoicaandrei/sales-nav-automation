// ==UserScript==
// @name            Linked search highlight open profiles
// @description     LinkedIn search highlight open profiles with: hide reccomendations popup, fix left filter width
// @version         1.3
// @namespace       https://www.linkedin.com

// @match           https://www.linkedin.com/sales/search/people*

// @require         http://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require         https://gist.github.com/raw/2625891/waitForKeyElements.js


// ==/UserScript==

console.log('[INFO] Script started');
console.log(window.location.href);

//--------------------------------------------
// Get JSON data
//--------------------------------------------
var dataJSON;
var openProfiles = [];

(function(open) {
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener("readystatechange", function() {
            if(4 == this.readyState
               && this.responseURL.startsWith("https://www.linkedin.com/sales-api/salesApiLeadSearch")){

                this.response.arrayBuffer().then(function(value) {
                    const data = (new TextDecoder("utf-8")).decode(value);
                    dataJSON=JSON.parse(data);
                    openProfiles = dataJSON.elements.filter(value => value.openLink).map(item => item.fullName);
                })
            }
        }, false);
        open.apply(this, arguments);
    };
})(XMLHttpRequest.prototype.open);



//--------------------------------------------
// Highlight asynchrous on scrool
//--------------------------------------------
waitForKeyElements('#search-results-container', eventScript);

async function eventScript(jNode){
    const persons = document.querySelectorAll('[data-anonymize="person-name"]');

    persons.forEach(person => {
        const name = person.innerHTML.trim();
        const isOpenProfile = openProfiles.includes(name);

        if (isOpenProfile) {
            person.style['color']="white";
            person.style['background']="green";
            person.style['padding']="2px 2px 2px 2px";

            const parent = person.parentElement;
            if (!parent.innerHTML.includes('Open Profile'))
                parent.appendChild(document.createTextNode("Open Profile"))
        }
        else {
            const row = person.closest('.artdeco-list__item');
            row?.remove();
        }
    })
}

//--------------------------------------------
// Buttons
//--------------------------------------------
waitForKeyElements('#global-typeahead-search-input', createButtons);

var messagesSent = 0;
function createButtons(jNode) {
    const searchBar = document.querySelector('.global-typeahead');
    const headerContainer = searchBar.parentElement;

    const button = document.createElement('button');
    button.innerHTML = 'Message All';
    button.onclick = sendMessages;
    headerContainer.appendChild(button);

    const messageCounter = document.createElement('span');
    messageCounter.id = 'message-counter';
    messageCounter.innerHTML = `Sent: ${messagesSent}`;
    headerContainer.appendChild(messageCounter);
}

function updateCounter() {
    const messageCounter = document.querySelector('#message-counter');
    messageCounter.innerHTML = `Sent: ${messagesSent}`;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const openProfileSubject = `Senior Javascript Developer, 4+ years of exp., looking for remote work`
const openProfileMessage = (name) => `Hello ${name},

I saw that you are an experienced IT recruiter.

I’m a senior Javascript developer with 4+ years of exp, currently in between projects, looking for remote work.

If you know of any open positions, I would appreciate your help!

Best regards`;

function closeMessageContainer(messageContainer) {
    const closeMessageContainerButton = messageContainer.querySelector('[data-control-name="overlay.close_overlay"]');
    closeMessageContainerButton.click();
}

async function sendMessages() {
    const persons = document.querySelectorAll('[data-anonymize="person-name"]');

    for (const person of persons) {
        const row = person.closest('.artdeco-list__item');
        const dropdown = row.querySelector('.artdeco-dropdown');

        const dropdownButton = dropdown.querySelector('.artdeco-dropdown__trigger')
        dropdownButton.click();
        await sleep(1000);

        const actions = dropdown.querySelectorAll('li');
        const messageAction = actions[2];
        messageAction.children[0].click();
        await sleep(1000);

        const messageContainer = document.querySelector('#message-overlay');

        const prevMessages = messageContainer.querySelector('ul.list-style-none');
        if (prevMessages.children.length > 1) {
            closeMessageContainer(messageContainer);
            continue;
        }

        const subjectInput = messageContainer.querySelector("input.compose-form__subject-field");
        const messageInput = messageContainer.querySelector("textarea.compose-form__message-field");

        const name = person.innerHTML.trim().split(' ')[0];
        subjectInput.value = openProfileSubject;
        messageInput.value = openProfileMessage(name);

        subjectInput.dispatchEvent(new Event('keyup'));
        messageInput.dispatchEvent(new Event('input'));
        subjectInput.setAttribute("marked", "true");
        await sleep(1000);

        const sendButton = messageContainer.querySelector('.artdeco-button--primary');
        sendButton.click();

        messagesSent ++;
        updateCounter();
        await sleep(1000);

        closeMessageContainer(messageContainer)
        await sleep(1000);
    }
}


//--------------------------------------------
// Hide recommendations
//--------------------------------------------
waitForKeyElements('section.lead-recommendations-carousel-v2__content-dropdown', hideRecomm);

async function hideRecomm(jNode){
    //console.log(jNode);
    jNode.hide();
}


//--------------------------------------------
// Fix left filter width
//--------------------------------------------
waitForKeyElements('div.container-plain', fixLeftFilter);

async function fixLeftFilter(jNode){
    //console.log(jNode);
    jNode[0].style['max-width']="20%";
}


console.log('[INFO] Script finished');