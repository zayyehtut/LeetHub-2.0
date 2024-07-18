// Helper function to get the current tab
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function handleMessage(request, sender, sendResponse) {
  if (request && request.closeWebPage === true) {
    if (request.isSuccess === true) {
      // Set username
      await chrome.storage.local.set({ leethub_username: request.username });

      // Set token
      await chrome.storage.local.set({ leethub_token: request.token });

      // Close pipe
      await chrome.storage.local.set({ pipe_leethub: false });
      console.log('Closed pipe.');

      // Close the current tab
      let currentTab = await getCurrentTab();
      await chrome.tabs.remove(currentTab.id);

      // Go to onboarding for UX
      const urlOnboarding = chrome.runtime.getURL('welcome.html');
      await chrome.tabs.create({ url: urlOnboarding, active: true });
    } else {
      // Show error message
      await chrome.tabs.sendMessage(sender.tab.id, {
        type: 'SHOW_ERROR',
        message: 'Something went wrong while trying to authenticate your profile!',
      });

      // Close the current tab
      let currentTab = await getCurrentTab();
      await chrome.tabs.remove(currentTab.id);
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Indicates that we will respond asynchronously
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateStats") {
    chrome.runtime.sendMessage({ action: "updateStats" });
  }
});
