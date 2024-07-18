// Utility functions
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const getOption = () => $('#type').value;
const getRepositoryName = () => $('#name').value.trim();

const showError = (message) => {
  $('#success').style.display = 'none';
  $('#error').textContent = message;
  $('#error').style.display = 'block';
};

const showSuccess = (message) => {
  $('#error').style.display = 'none';
  $('#success').innerHTML = message;
  $('#success').style.display = 'block';
};

const setStorageData = (data) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
};

const getStorageData = (keys) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
};

// GitHub API functions
const createRepo = async (token, name) => {
  const url = 'https://api.github.com/user/repos';
  const data = {
    name,
    private: true,
    auto_init: true,
    description: 'Collection of LeetCode questions to ace the coding interview! - Created using [LeetHub](https://github.com/QasimWani/LeetHub)',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    await setStorageData({ mode_type: 'commit', leethub_hook: result.full_name });
    showSuccess(`Successfully created <a target="blank" href="${result.html_url}">${name}</a>. Start <a href="http://leetcode.com">LeetCoding</a>!`);
    $('#unlink').style.display = 'block';
    $('#hook_mode').style.display = 'none';
    $('#commit_mode').style.display = 'inherit';
  } catch (error) {
    showError(`Error creating ${name}: ${error.message}`);
  }
};

const linkRepo = async (token, name) => {
  const url = `https://api.github.com/repos/${name}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    await setStorageData({ mode_type: 'commit', leethub_hook: result.full_name, repo: result.html_url });
    showSuccess(`Successfully linked <a target="blank" href="${result.html_url}">${name}</a> to LeetHub. Start <a href="http://leetcode.com">LeetCoding</a> now!`);
    $('#unlink').style.display = 'block';
    $('#hook_mode').style.display = 'none';
    $('#commit_mode').style.display = 'inherit';

    const { stats } = await getStorageData('stats');
    if (stats && stats.solved) {
      $('#p_solved').textContent = stats.solved;
      $('#p_solved_easy').textContent = stats.easy;
      $('#p_solved_medium').textContent = stats.medium;
      $('#p_solved_hard').textContent = stats.hard;
    }
  } catch (error) {
    showError(`Error linking ${name}: ${error.message}`);
  }
};

const unlinkRepo = async () => {
  await setStorageData({ mode_type: 'hook', leethub_hook: null });
  $('#hook_mode').style.display = 'inherit';
  $('#commit_mode').style.display = 'none';
  showSuccess('Successfully unlinked your current git repo. Please create/link a new hook.');
  $('#unlink').style.display = 'none';
};

// Event listeners
$('#type').addEventListener('change', function() {
  $('#hook_button').disabled = !this.value;
});

$('#hook_button').addEventListener('click', async () => {
  const option = getOption();
  const repoName = getRepositoryName();

  if (!option) {
    showError('No option selected - Pick an option from dropdown menu below that best suits you!');
  } else if (!repoName) {
    showError('No repository name added - Enter the name of your repository!');
    $('#name').focus();
  } else {
    showSuccess('Attempting to create Hook... Please wait.');

    try {
      const { leethub_token } = await getStorageData('leethub_token');
      if (!leethub_token) {
        throw new Error('Authorization error - Grant LeetHub access to your GitHub account to continue (launch extension to proceed)');
      }

      if (option === 'new') {
        await createRepo(leethub_token, repoName);
      } else {
        const { leethub_username } = await getStorageData('leethub_username');
        if (!leethub_username) {
          throw new Error('Improper Authorization error - Grant LeetHub access to your GitHub account to continue (launch extension to proceed)');
        }
        await linkRepo(leethub_token, `${leethub_username}/${repoName}`);
      }
    } catch (error) {
      showError(error.message);
    }
  }
});

$('#unlink').addEventListener('click', unlinkRepo);

// Initialize
(async () => {
  const { mode_type } = await getStorageData('mode_type');

  if (mode_type === 'commit') {
    try {
      const { leethub_token, leethub_hook } = await getStorageData(['leethub_token', 'leethub_hook']);
      if (!leethub_token) {
        throw new Error('Authorization error - Grant LeetHub access to your GitHub account to continue (click LeetHub extension on the top right to proceed)');
      }
      if (!leethub_hook) {
        throw new Error('Improper Authorization error - Grant LeetHub access to your GitHub account to continue (click LeetHub extension on the top right to proceed)');
      }
      await linkRepo(leethub_token, leethub_hook);
    } catch (error) {
      showError(error.message);
      $('#hook_mode').style.display = 'inherit';
      $('#commit_mode').style.display = 'none';
    }
  } else {
    $('#hook_mode').style.display = 'inherit';
    $('#commit_mode').style.display = 'none';
  }
})();