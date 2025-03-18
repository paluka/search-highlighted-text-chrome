// Default search engines
const DEFAULT_SEARCH_ENGINES = [
  {
    name: "Perplexity AI",
    url: "https://www.perplexity.ai/search?q=%s",
    enabled: true,
    promptForInput: false,
  },
  {
    name: "Google",
    url: "https://www.google.com/search?q=%s",
    enabled: true,
    promptForInput: false,
  },
  {
    name: "Bing",
    url: "https://www.bing.com/search?q=%s",
    enabled: false,
    promptForInput: false,
  },
  {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=%s",
    enabled: false,
    promptForInput: false,
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com/?q=%s",
    enabled: true,
    promptForInput: true,
  },
];

// Initialize context menus when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Get the saved search engines or use the defaults
  chrome.storage.sync.get("searchEngines", (data) => {
    const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;
    createContextMenus(searchEngines);
  });
});

// Handle clicks on the extension icon in the toolbar
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Update context menu when settings change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.searchEngines) {
    const searchEngines = changes.searchEngines.newValue;

    // Remove all existing context menu items and recreate them
    chrome.contextMenus.removeAll(() => {
      createContextMenus(searchEngines);
    });
  }
});

// Create all context menu items
function createContextMenus(searchEngines) {
  // First, create the parent "Search in..." menu
  chrome.contextMenus.create({
    id: "searchHighlightedTextParent",
    title: "Search in...",
    contexts: ["selection"],
  });

  // Create menu items for each enabled search engine
  // The order in the context menu will match the order in the searchEngines array
  searchEngines.forEach((engine) => {
    if (engine.enabled) {
      // Create it as a child of the "Search in..." menu
      chrome.contextMenus.create({
        id: `searchHighlightedText_${engine.name}`,
        parentId: "searchHighlightedTextParent",
        title: engine.name,
        contexts: ["selection"],
      });
    }
  });
}

// Handle the context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Extract the menu item type and engine name
  let engineName = "";

  if (info.menuItemId.startsWith("searchHighlightedText_")) {
    engineName = info.menuItemId.replace("searchHighlightedText_", "");
  } else {
    return; // Not one of our menu items
  }

  // Get the selected text
  const selectedText = info.selectionText || "";

  chrome.storage.sync.get("searchEngines", (data) => {
    const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;

    // Find the search engine by name
    const searchEngine = searchEngines.find(
      (engine) => engine.name === engineName
    );

    if (searchEngine) {
      if (searchEngine.promptForInput) {
        // Create a popup to get additional input from the user
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: showInputPopup,
          args: [selectedText, searchEngine.name, false],
        });
      } else {
        // Just use the selected text directly
        performSearch(selectedText, "", searchEngine.url);
      }
    }
  });
});

// Function to show a popup for additional input
function showInputPopup(selectedText, engineName, isMainItem) {
  // Remove any existing popup
  const existingPopup = document.getElementById("search-extension-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup container
  const popup = document.createElement("div");
  popup.id = "search-extension-popup";
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #f8f9fa;
    border: none;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    width: 420px;
    max-width: 90vw;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #37474f;
    transition: all 0.2s ease;
  `;

  // Create header
  const header = document.createElement("h3");
  header.textContent = `Search in ${engineName}`;
  header.style.cssText = `
    margin: 0 0 18px 0;
    font-size: 20px;
    font-weight: 600;
    color: #37474f;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 12px;
  `;

  // Create selected text display
  const selectedTextDisplay = document.createElement("div");
  selectedTextDisplay.style.cssText = `
    margin-bottom: 18px;
    padding: 12px;
    background: rgba(33, 150, 243, 0.08);
    border-left: 4px solid #2196f3;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.5;
    word-break: break-word;
  `;
  selectedTextDisplay.textContent = `Selected text: "${selectedText}"`;

  // Create input field
  const inputLabel = document.createElement("label");
  inputLabel.textContent = "Additional input:";
  inputLabel.style.cssText = `
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #455a64;
  `;

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.style.cssText = `
    width: 100%;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    box-sizing: border-box;
    margin-bottom: 20px;
    background-color: #ffffff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    outline: none;
    color: #37474F;
  `;
  inputField.placeholder = "Enter additional text...";

  // Add focus effect
  inputField.addEventListener("focus", () => {
    inputField.style.borderColor = "#2196f3";
    inputField.style.boxShadow = "0 0 0 3px rgba(33, 150, 243, 0.2)";
  });

  inputField.addEventListener("blur", () => {
    inputField.style.borderColor = "#e0e0e0";
    inputField.style.boxShadow = "none";
  });

  // Create buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 4px;
  `;

  // Create cancel button
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.style.cssText = `
    padding: 10px 16px;
    background: transparent;
    color: #546e7a;
    border: 1px solid #cfd8dc;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  `;
  cancelButton.onmouseover = () => {
    cancelButton.style.backgroundColor = "#eceff1";
  };
  cancelButton.onmouseout = () => {
    cancelButton.style.backgroundColor = "transparent";
  };
  cancelButton.onclick = () => {
    popup.remove();
    overlay.remove();
  };

  // Create search button
  const searchButton = document.createElement("button");
  searchButton.textContent = "Search";
  searchButton.style.cssText = `
    padding: 10px 20px;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 2px 5px rgba(33, 150, 243, 0.3);
  `;
  searchButton.onmouseover = () => {
    searchButton.style.backgroundColor = "#1976d2";
    searchButton.style.boxShadow = "0 4px 8px rgba(33, 150, 243, 0.4)";
  };
  searchButton.onmouseout = () => {
    searchButton.style.backgroundColor = "#2196f3";
    searchButton.style.boxShadow = "0 2px 5px rgba(33, 150, 243, 0.3)";
  };

  // Add event listener for the search button
  searchButton.onclick = () => {
    const additionalInput = inputField.value.trim();
    popup.remove();
    overlay.remove();

    // Send a message to the background script to open the search
    chrome.runtime.sendMessage({
      action: "performSearch",
      selectedText: selectedText,
      additionalInput: additionalInput,
      engineName: engineName,
    });
  };

  // Add event listener for Enter key
  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchButton.click();
    }
  });

  // Assemble the popup
  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(searchButton);

  popup.appendChild(header);
  popup.appendChild(selectedTextDisplay);
  popup.appendChild(inputLabel);
  popup.appendChild(inputField);
  popup.appendChild(buttonsContainer);

  // Add popup to the page
  document.body.appendChild(popup);

  // Focus the input field
  inputField.focus();

  // Create an overlay behind the popup
  const overlay = document.createElement("div");
  overlay.id = "search-extension-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    z-index: 9999;
    transition: opacity 0.2s ease;
  `;
  overlay.onclick = () => {
    popup.remove();
    overlay.remove();
  };

  document.body.appendChild(overlay);

  // Add slight animation effect
  setTimeout(() => {
    popup.style.transform = "translate(-50%, -52%)";
  }, 10);
  setTimeout(() => {
    popup.style.transform = "translate(-50%, -50%)";
  }, 200);
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "performSearch") {
    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;
      const searchEngine = searchEngines.find(
        (engine) => engine.name === message.engineName
      );

      if (searchEngine) {
        performSearch(
          message.selectedText,
          message.additionalInput,
          searchEngine.url
        );
      }
    });
  }
});

// Function to perform the search
function performSearch(selectedText, additionalInput, urlTemplate) {
  let searchText = selectedText;

  // If there's additional input, combine it with the selected text
  if (additionalInput) {
    searchText = `${additionalInput}: "${selectedText}"`;
  }

  // Create the search URL
  const searchUrl = urlTemplate.replace("%s", encodeURIComponent(searchText));

  // Open the search in a new tab
  chrome.tabs.create({ url: searchUrl });
}
