/* global oAuth2 */
/* eslint no-undef: "error" */

let action = false;

// Utility functions
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const showElement = (id) => {
  $(`#${id}`).style.display = 'block';
};

const setInnerHTML = (id, html) => {
  $(`#${id}`).innerHTML = html;
};

const setText = (id, text) => {
  $(`#${id}`).textContent = text;
};

const getStorageData = (keys) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
};

const setStorageData = (data) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
};

// Event Listeners
$('#authenticate').addEventListener('click', () => {
  if (action) {
    oAuth2.begin();
  }
});

// Set URLs
$('#welcome_URL').href = chrome.runtime.getURL('welcome.html');
$('#hook_URL').href = chrome.runtime.getURL('welcome.html');

async function updateStats() {
  try {
    const { stats } = await getStorageData('stats');
    if (stats && stats.solved !== undefined) {
      setText('p_solved', stats.solved);
      setText('p_solved_easy', stats.easy);
      setText('p_solved_medium', stats.medium);
      setText('p_solved_hard', stats.hard);
      console.log('Stats updated:', stats); // Added this line for debugging
    } else {
      console.log('No stats found or stats object is incomplete');
    }
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Main function
async function init() {
  try {
    const { leethub_token } = await getStorageData('leethub_token');
    
    if (!leethub_token) {
      action = true;
      showElement('auth_mode');
      return;
    }

    const response = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${leethub_token}` }
    });

    if (response.status === 200) {
      const { mode_type } = await getStorageData('mode_type');
      
      if (mode_type === 'commit') {
        showElement('commit_mode');
        updateStats(); // Call this function to update stats

        const { stats, leethub_hook } = await getStorageData(['stats', 'leethub_hook']);
        
        if (stats && stats.solved) {
          setText('p_solved', stats.solved);
          setText('p_solved_easy', stats.easy);
          setText('p_solved_medium', stats.medium);
          setText('p_solved_hard', stats.hard);
        }
        
        if (leethub_hook) {
          setInnerHTML('repo_url', `<a target="blank" style="color: cadetblue !important; font-size:0.8em;" href="https://github.com/${leethub_hook}">${leethub_hook}</a>`);
        }
      } else {
        showElement('hook_mode');
      }
    } else if (response.status === 401) {
      // bad oAuth
      await setStorageData({ leethub_token: null });
      console.log('BAD oAuth!!! Redirecting back to oAuth process');
      action = true;
      showElement('auth_mode');
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    showElement('auth_mode');
  }
}

// Initialize
init();