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

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const searchEngineNameInput = document.getElementById("search-engine-name");
  const searchEngineUrlInput = document.getElementById("search-engine-url");
  const searchEngineEnabledCheckbox = document.getElementById(
    "search-engine-enabled"
  );
  const searchEnginePromptInputCheckbox = document.getElementById(
    "search-engine-prompt-input"
  );
  const addButton = document.getElementById("add-button");
  const updateButton = document.getElementById("update-button");
  const cancelButton = document.getElementById("cancel-button");
  const successMessage = document.getElementById("success-message");
  const presetButtons = document.querySelectorAll(".preset-button");
  const enginesList = document.getElementById("engines-list");

  let editingIndex = -1; // Track which engine is being edited

  // Load saved search engines
  function loadSearchEngines() {
    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;
      renderSearchEnginesList(searchEngines);
    });
  }

  // Render the search engines list in the table
  function renderSearchEnginesList(searchEngines) {
    enginesList.innerHTML = "";

    searchEngines.forEach((engine, index) => {
      const row = document.createElement("tr");

      // Enabled toggle
      const enabledCell = document.createElement("td");
      const enabledCheckbox = document.createElement("input");
      enabledCheckbox.type = "checkbox";
      enabledCheckbox.checked = engine.enabled;
      enabledCheckbox.addEventListener("change", () => {
        toggleEngineProperty(index, "enabled", enabledCheckbox.checked);
      });
      enabledCell.appendChild(enabledCheckbox);

      // Name cell
      const nameCell = document.createElement("td");
      nameCell.textContent = engine.name;

      // URL cell
      const urlCell = document.createElement("td");
      urlCell.textContent = engine.url;

      // Prompt for input toggle
      const promptInputCell = document.createElement("td");
      const promptInputCheckbox = document.createElement("input");
      promptInputCheckbox.type = "checkbox";
      promptInputCheckbox.checked = engine.promptForInput;
      promptInputCheckbox.addEventListener("change", () => {
        toggleEngineProperty(
          index,
          "promptForInput",
          promptInputCheckbox.checked
        );
      });
      promptInputCell.appendChild(promptInputCheckbox);

      // Actions cell
      const actionsCell = document.createElement("td");
      actionsCell.className = "action-buttons";

      // Edit button
      const editButton = document.createElement("button");
      editButton.textContent = "Edit";
      editButton.className = "edit-button";
      editButton.addEventListener("click", () => {
        setEditMode(index, engine);
      });

      // Delete button
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete-button";
      deleteButton.addEventListener("click", () => {
        deleteSearchEngine(index);
      });

      // Move up button
      const moveUpButton = document.createElement("button");
      moveUpButton.textContent = "\u25B2";
      moveUpButton.className = "move-button";
      moveUpButton.title = "Move up";
      moveUpButton.disabled = index === 0;
      moveUpButton.addEventListener("click", () => {
        moveSearchEngine(index, index - 1);
      });

      // Move down button
      const moveDownButton = document.createElement("button");
      moveDownButton.textContent = "\u25BC";
      moveDownButton.className = "move-button";
      moveDownButton.title = "Move down";
      moveDownButton.disabled = index === searchEngines.length - 1;
      moveDownButton.addEventListener("click", () => {
        moveSearchEngine(index, index + 1);
      });

      actionsCell.appendChild(editButton);
      actionsCell.appendChild(deleteButton);
      actionsCell.appendChild(moveUpButton);
      actionsCell.appendChild(moveDownButton);

      // Add cells to row
      row.appendChild(enabledCell);
      row.appendChild(nameCell);
      row.appendChild(urlCell);
      row.appendChild(promptInputCell);
      row.appendChild(actionsCell);

      // Add row to table
      enginesList.appendChild(row);
    });
  }

  // Move a search engine up or down in the list
  function moveSearchEngine(fromIndex, toIndex) {
    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;

      // Make sure indices are valid
      if (toIndex < 0 || toIndex >= searchEngines.length) {
        return;
      }

      // Reorder the array
      const [movedEngine] = searchEngines.splice(fromIndex, 1);
      searchEngines.splice(toIndex, 0, movedEngine);

      chrome.storage.sync.set({ searchEngines }, () => {
        loadSearchEngines();
        showSuccessMessage();
      });
    });
  }

  // Toggle a search engine property
  function toggleEngineProperty(index, property, value) {
    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;
      searchEngines[index][property] = value;

      chrome.storage.sync.set({ searchEngines }, () => {
        showSuccessMessage();
      });
    });
  }

  // Set the form to edit mode
  function setEditMode(index, engine) {
    editingIndex = index;
    searchEngineNameInput.value = engine.name;
    searchEngineUrlInput.value = engine.url;
    searchEngineEnabledCheckbox.checked = engine.enabled;
    searchEnginePromptInputCheckbox.checked = engine.promptForInput;

    addButton.style.display = "none";
    updateButton.style.display = "inline-block";
    cancelButton.style.display = "inline-block";
  }

  // Clear the form and exit edit mode
  function clearForm() {
    editingIndex = -1;
    searchEngineNameInput.value = "";
    searchEngineUrlInput.value = "";
    searchEngineEnabledCheckbox.checked = true;
    searchEnginePromptInputCheckbox.checked = false;

    addButton.style.display = "inline-block";
    updateButton.style.display = "none";
    cancelButton.style.display = "none";
  }

  // Add a new search engine
  function addSearchEngine() {
    const name = searchEngineNameInput.value.trim();
    const url = searchEngineUrlInput.value.trim();
    const enabled = searchEngineEnabledCheckbox.checked;
    const promptForInput = searchEnginePromptInputCheckbox.checked;

    // Validate inputs
    if (!name) {
      alert("Please enter a search engine name");
      return;
    }

    if (!url) {
      alert("Please enter a search engine URL");
      return;
    }

    // Ensure URL contains %s placeholder
    const formattedUrl = url.includes("%s")
      ? url
      : `${url}${url.includes("?") ? "&" : "?"}q=%s`;

    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;

      // Check if the name already exists
      if (searchEngines.some((engine) => engine.name === name)) {
        alert(`A search engine named "${name}" already exists.`);
        return;
      }

      // Add the new search engine
      searchEngines.push({
        name: name,
        url: formattedUrl,
        enabled: enabled,
        promptForInput: promptForInput,
      });

      chrome.storage.sync.set({ searchEngines }, () => {
        loadSearchEngines();
        clearForm();
        showSuccessMessage();
      });
    });
  }

  // Update an existing search engine
  function updateSearchEngine() {
    const name = searchEngineNameInput.value.trim();
    const url = searchEngineUrlInput.value.trim();
    const enabled = searchEngineEnabledCheckbox.checked;
    const promptForInput = searchEnginePromptInputCheckbox.checked;

    // Validate inputs
    if (!name) {
      alert("Please enter a search engine name");
      return;
    }

    if (!url) {
      alert("Please enter a search engine URL");
      return;
    }

    // Ensure URL contains %s placeholder
    const formattedUrl = url.includes("%s")
      ? url
      : `${url}${url.includes("?") ? "&" : "?"}q=%s`;

    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;

      // Check if the name already exists (excluding the current engine)
      const nameExists = searchEngines.some(
        (engine, index) => index !== editingIndex && engine.name === name
      );

      if (nameExists) {
        alert(`A search engine named "${name}" already exists.`);
        return;
      }

      // Update the search engine
      searchEngines[editingIndex] = {
        name: name,
        url: formattedUrl,
        enabled: enabled,
        promptForInput: promptForInput,
      };

      chrome.storage.sync.set({ searchEngines }, () => {
        loadSearchEngines();
        clearForm();
        showSuccessMessage();
      });
    });
  }

  // Delete a search engine
  function deleteSearchEngine(index) {
    if (confirm("Are you sure you want to delete this search engine?")) {
      chrome.storage.sync.get("searchEngines", (data) => {
        const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;
        searchEngines.splice(index, 1);

        chrome.storage.sync.set({ searchEngines }, () => {
          loadSearchEngines();
          showSuccessMessage();
        });
      });
    }
  }

  // Handle preset button clicks
  function handlePresetClick(event) {
    const name = event.target.getAttribute("data-name");
    const url = event.target.getAttribute("data-url");
    const promptForInput = event.target.getAttribute("data-prompt") === "true";

    // Check if this preset already exists
    chrome.storage.sync.get("searchEngines", (data) => {
      const searchEngines = data.searchEngines || DEFAULT_SEARCH_ENGINES;

      if (searchEngines.some((engine) => engine.name === name)) {
        alert(`A search engine named "${name}" already exists.`);
        return;
      }

      // Add the preset
      searchEngines.push({
        name: name,
        url: url,
        enabled: true,
        promptForInput: promptForInput,
      });

      chrome.storage.sync.set({ searchEngines }, () => {
        loadSearchEngines();
        showSuccessMessage();
      });
    });
  }

  // Show the success message briefly
  function showSuccessMessage() {
    successMessage.style.display = "block";
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 2000);
  }

  // Initialize the page
  function initialize() {
    // First load, ensure we have the default search engines in storage
    chrome.storage.sync.get("searchEngines", (data) => {
      if (!data.searchEngines) {
        chrome.storage.sync.set(
          { searchEngines: DEFAULT_SEARCH_ENGINES },
          () => {
            loadSearchEngines();
          }
        );
      } else {
        loadSearchEngines();
      }
    });
  }

  // Add event listeners
  addButton.addEventListener("click", addSearchEngine);
  updateButton.addEventListener("click", updateSearchEngine);
  cancelButton.addEventListener("click", clearForm);

  // Add event listeners to preset buttons
  presetButtons.forEach((button) => {
    button.addEventListener("click", handlePresetClick);
  });

  // Initialize the page
  initialize();
});
