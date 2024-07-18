// Constants
const LANGUAGES = {
  Python: '.py', Python3: '.py', 'C++': '.cpp', C: '.c', Java: '.java', 'C#': '.cs',
  JavaScript: '.js', Javascript: '.js', Ruby: '.rb', Swift: '.swift', Go: '.go',
  Kotlin: '.kt', Scala: '.scala', Rust: '.rs', PHP: '.php', TypeScript: '.ts',
  MySQL: '.sql', 'MS SQL Server': '.sql', Oracle: '.sql'
};

const COMMIT_MESSAGES = {
  readme: 'Create README - LeetHub',
  notes: 'Attach NOTES - LeetHub'
};

// Global variables
let difficulty = '';
let uploadState = { uploading: false };

// Utility functions
const log = (message, ...args) => console.log(`LeetHub: ${message}`, ...args);
const error = (message, ...args) => console.error(`LeetHub Error: ${message}`, ...args);

const checkElem = (elem) => elem && elem.length > 0;

const convertToSlug = (string) => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;';
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(p, (c) => b.charAt(a.indexOf(c)))
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

function isExtensionContextValid() {
  return !chrome.runtime.lastError && chrome.runtime.id;
}

const addLeadingZeros = (title) => {
  const maxTitlePrefixLength = 4;
  const len = title.split('-')[0].length;
  return len < maxTitlePrefixLength ? '0'.repeat(4 - len) + title : title;
};


// Main functions
const findLanguage = () => {
  const languageElement = document.querySelector('.flex.items-center.gap-2.pb-2.text-sm.font-medium.text-text-tertiary');
  const languageText = languageElement ? languageElement.textContent.split('Code')[1].trim() : '';
  const language = LANGUAGES[languageText];
  log('Detected language:', languageText, 'File extension:', language);
  return language || null;
};

const upload = (token, hook, code, directory, filename, sha, msg, cb = undefined) => {
  const URL = `https://api.github.com/repos/${hook}/contents/${directory}/${filename}`;
  const data = JSON.stringify({ message: msg, content: code, sha });

  log('Uploading file:', filename);

  fetch(URL, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: data
  })
    .then(response => response.json())
    .then(result => {
      const updatedSha = result.content.sha;
      chrome.storage.local.get('stats', ({ stats = {} }) => {
        if (!stats.sha) stats.sha = {};
        stats.sha[directory + filename] = updatedSha;
        chrome.storage.local.set({ stats }, () => {
          log(`Successfully committed ${filename} to github`);
          if (cb) cb();
        });
      });
    })
    .catch(err => error('Upload failed:', err));
};

const uploadGit = (code, problemName, fileName, msg, action, prepend = true, cb = undefined, _diff = undefined) => {
  if (_diff) {
    difficulty = _diff.trim();
    log('Setting difficulty in uploadGit:', difficulty);
  }

  chrome.storage.local.get(['leethub_token', 'mode_type', 'leethub_hook'], (data) => {
    const { leethub_token, mode_type, leethub_hook } = data;
    if (leethub_token && mode_type === 'commit' && leethub_hook) {
      chrome.storage.local.get('stats', ({ stats }) => {
        const filePath = problemName + fileName;
        const sha = stats && stats.sha && stats.sha[filePath];
        if (action === 'upload') {
          upload(leethub_token, leethub_hook, code, problemName, fileName, sha, msg, difficulty, cb);
        }
      });
    }
  });
};

const findCode = (uploadGit, problemName, fileName, msg, action, cb = undefined) => {
  log('Finding code');
  const codeElement = document.querySelector('.px-4.py-3 code');
  const code = codeElement ? codeElement.textContent.trim() : '';
  log('Code:', code);
  if (code) {
    setTimeout(() => {
      uploadGit(
        btoa(unescape(encodeURIComponent(code))),
        problemName,
        fileName,
        msg,
        action,
        true,
        cb
      );
    }, 2000);
  }
};

const getNotesIfAny = () => {
  if (document.URL.startsWith('https://leetcode.com/explore/')) return '';

  let notes = '';
  const notesElement = document.querySelector('.notewrap__eHkN .CodeMirror-code');
  if (notesElement) {
    notes = Array.from(notesElement.childNodes)
      .map(node => node.textContent.trim())
      .filter(text => text)
      .join('\n');
  }
  return notes.trim();
};

const getProblemNameSlug = () => {
  log('Getting problem name slug');
  let questionTitle = 'unknown-problem';

  try {
    const titleElement = document.querySelector('.text-title-large') || document.querySelector('[data-cy="question-title"]');
    if (titleElement) {
      questionTitle = titleElement.textContent.trim();
      log('Found question title:', questionTitle);
    } else {
      log('Could not find title element');
    }
  } catch (error) {
    error('Error in getProblemNameSlug:', error);
  }

  const slug = addLeadingZeros(convertToSlug(questionTitle));
  log('Generated slug:', slug);
  return slug;
};

const parseQuestion = () => {
  log('Parsing question');
  const titleElement = document.querySelector('.text-title-large a');
  const title = titleElement ? titleElement.textContent.trim() : 'unknown-problem';
  const url = titleElement ? titleElement.href : window.location.href;
  const descriptionElement = document.querySelector('.elfjS');
  const description = descriptionElement ? descriptionElement.innerHTML.trim() : '';

  const difficultyElement = document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');
  let difficulty = 'Unknown';
  if (difficultyElement) {
    if (difficultyElement.classList.contains('text-difficulty-easy')) difficulty = 'Easy';
    else if (difficultyElement.classList.contains('text-difficulty-medium')) difficulty = 'Medium';
    else if (difficultyElement.classList.contains('text-difficulty-hard')) difficulty = 'Hard';
  }
  log('Detected difficulty:', difficulty);


  return `<h2><a href="${url}">${title}</a></h2><h3>${difficulty}</h3><hr>${description}`;
};

const parseStats = () => {
  log('Parsing stats');
  const timeElement = document.querySelector('.mt-2.flex.items-center.gap-1 span:first-child');
  const time = timeElement ? timeElement.textContent.trim() + ' ms' : '';
  const timePercentageElement = document.querySelector('.mt-2.flex.items-center.gap-1 span:nth-child(5)');
  const timePercentage = timePercentageElement ? timePercentageElement.textContent.trim() : '';

  const memoryElement = document.querySelectorAll('.mt-2.flex.items-center.gap-1')[1]?.querySelector('span:first-child');
  const memory = memoryElement ? memoryElement.textContent.trim() + ' MB' : '';
  const memoryPercentageElement = document.querySelectorAll('.mt-2.flex.items-center.gap-1')[1]?.querySelector('span:nth-child(5)');
  const memoryPercentage = memoryPercentageElement ? memoryPercentageElement.textContent.trim() : '';

  return `Time: ${time} (${timePercentage}), Space: ${memory} (${memoryPercentage}) - LeetHub`;
};


const updateStats = (callback) => {
  chrome.storage.local.get('stats', ({ stats = {} }) => {
    if (!stats.solved) {
      stats = { solved: 0, easy: 0, medium: 0, hard: 0, sha: {} };
    }
    
    stats.solved += 1;
    
    // Determine difficulty
    const difficultyElement = document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');
    if (difficultyElement) {
      if (difficultyElement.classList.contains('text-difficulty-easy')) stats.easy += 1;
      else if (difficultyElement.classList.contains('text-difficulty-medium')) stats.medium += 1;
      else if (difficultyElement.classList.contains('text-difficulty-hard')) stats.hard += 1;
    }
    
    chrome.storage.local.set({ stats }, () => {
      log('Stats updated:', stats);
      if (callback) callback();
    });
  });
};


const observeSubmission = (callback) => {
  log('Observing submission');
  const targetNode = document.body;
  const config = { childList: true, subtree: true };

  let observationTimeout;

  const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const resultElement = document.querySelector('[data-e2e-locator="submission-result"]');
        
        if (resultElement) {
          log('Submission result found:', resultElement.textContent);
          
          if (resultElement.textContent.trim() === 'Accepted') {
            log('Submission accepted');
            observer.disconnect();
            clearTimeout(observationTimeout);
            // Update stats here
            updateStats(() => {
              // Call the callback after updating stats
              callback();
            });
            break;
          }
        }
      }
    }
  });

  observer.observe(targetNode, config);

  observationTimeout = setTimeout(() => {
    log('Observation timed out after 30 seconds');
    observer.disconnect();
  }, 30000);
};

const handleSubmission = () => {
  if (!isExtensionContextValid()) {
    console.error('Extension context is invalid. Aborting handleSubmission.');
    return;
  }

  log('Handling submission');
  const problemName = getProblemNameSlug();
  const language = findLanguage();
  
  log('Problem Name:', problemName);
  log('Language:', language);


  if (language !== null) {
    chrome.storage.local.get('stats', (s) => {
      if (!isExtensionContextValid()) {
        console.error('Extension context became invalid during storage operation. Aborting.');
        return;
      }
      const { stats } = s;
      const filePath = problemName + problemName + language;
      let sha = null;
      if (stats && stats.sha && stats.sha[filePath]) {
        sha = stats.sha[filePath];
      }

      if (sha === null) {
        const probStatement = parseQuestion();
        log('Uploading README');
        uploadGit(
          btoa(unescape(encodeURIComponent(probStatement))),
          problemName,
          'README.md',
          COMMIT_MESSAGES.readme,
          'upload',
          true,
          null
        );
      }
    });


    const notes = getNotesIfAny();
    if (notes.length > 0) {
      log('Uploading Notes');
      uploadGit(
        btoa(unescape(encodeURIComponent(notes))),
        problemName,
        'NOTES.md',
        COMMIT_MESSAGES.notes,
        'upload',
        true,
          null      );
    }

    log('Finding and uploading code');
    const probStats = parseStats();
    findCode(
      uploadGit,
      problemName,
      problemName + language,
      probStats,
      'upload',
      () => {
        uploadState.uploading = false;
        log('Upload completed');

        // Update stats again after upload is complete
        updateStats(() => {
          log('Final stats update after upload');
          // Notify popup to update
          chrome.runtime.sendMessage({ action: "updateStats" });
        });
      },
      
    );
  } else {
    log('Language not detected');
  }
};

// Event Listeners
document.addEventListener('click', (event) => {
  if (!isExtensionContextValid()) {
    console.error('Extension context is invalid. Not adding click listener.');
    return;
  }
  if (event.target.closest('[data-e2e-locator="console-submit-button"]')) {
    log('Submit button clicked');
    observeSubmission(handleSubmission);
  }
});

// Initialization
const init = () => {
  chrome.storage.local.get('isSync', (data) => {
    const keys = ['leethub_token', 'leethub_username', 'pipe_leethub', 'stats', 'leethub_hook', 'mode_type'];
    if (!data || !data.isSync) {
      keys.forEach((key) => {
        chrome.storage.sync.get(key, (data) => {
          chrome.storage.local.set({ [key]: data[key] });
        });
      });
      chrome.storage.local.set({ isSync: true }, () => {
        log('LeetHub Synced to local values');
      });
    } else {
      log('LeetHub Local storage already synced!');
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .leethub_progress {
      pointer-events: none;
      width: 2.0em;
      height: 2.0em;
      border: 0.4em solid transparent;
      border-color: #eee;
      border-top-color: #3E67EC;
      border-radius: 50%;
      animation: loadingspin 1s linear infinite;
    }
    @keyframes loadingspin { 100% { transform: rotate(360deg) } }
  `;
  document.head.append(style);
};

init();