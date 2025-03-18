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
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    width: 400px;
    max-width: 90vw;
    font-family: Arial, sans-serif;
  `;

  // Create header
  const header = document.createElement("h3");
  header.textContent = `Search in ${engineName}`;
  header.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #333;
  `;

  // Create selected text display
  const selectedTextDisplay = document.createElement("div");
  selectedTextDisplay.style.cssText = `
    margin-bottom: 15px;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 14px;
    word-break: break-word;
  `;
  selectedTextDisplay.textContent = `Selected text: "${selectedText}"`;

  // Create input field
  const inputLabel = document.createElement("label");
  inputLabel.textContent = "Additional input:";
  inputLabel.style.cssText = `
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    font-weight: bold;
  `;

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.style.cssText = `
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
    margin-bottom: 15px;
  `;
  inputField.placeholder = "Enter additional text...";

  // Create buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  `;

  // Create cancel button
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.style.cssText = `
    padding: 8px 12px;
    background: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  cancelButton.onclick = () => popup.remove();

  // Create search button
  const searchButton = document.createElement("button");
  searchButton.textContent = "Search";
  searchButton.style.cssText = `
    padding: 8px 12px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

  // Add event listener for the search button
  searchButton.onclick = () => {
    const additionalInput = inputField.value.trim();
    popup.remove();

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
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  `;
  overlay.onclick = () => {
    popup.remove();
    overlay.remove();
  };

  document.body.appendChild(overlay);
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
    searchText = `${selectedText} ${additionalInput}`;
  }

  // Create the search URL
  const searchUrl = urlTemplate.replace("%s", encodeURIComponent(searchText));

  // Open the search in a new tab
  chrome.tabs.create({ url: searchUrl });
}
