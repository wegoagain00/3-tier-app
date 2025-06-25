// API base URL - change this based on your backend URL
const API_BASE_URL = "http://localhost:3001";

// DOM elements
const longUrlInput = document.getElementById("longUrl");
const shortenBtn = document.getElementById("shortenBtn");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const result = document.getElementById("result");
const shortUrlInput = document.getElementById("shortUrl");
const copyBtn = document.getElementById("copyBtn");
const originalUrl = document.getElementById("originalUrl");
const shortCode = document.getElementById("shortCode");
const recentList = document.getElementById("recentList");

// Recent links storage (in memory for this demo)
let recentLinks = [];

// Event listeners
shortenBtn.addEventListener("click", shortenUrl);
copyBtn.addEventListener("click", copyToClipboard);
longUrlInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    shortenUrl();
  }
});

// Load recent links on page load
window.addEventListener("load", loadRecentLinks);

async function shortenUrl() {
  const url = longUrlInput.value.trim();

  if (!url) {
    showError("Please enter a URL");
    return;
  }

  if (!isValidUrl(url)) {
    showError("Please enter a valid URL (include http:// or https://)");
    return;
  }

  showLoading();
  hideError();
  hideResult();

  try {
    const response = await fetch(`${API_BASE_URL}/api/shorten`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to shorten URL");
    }

    displayResult(data);
    addToRecentLinks(data);
    longUrlInput.value = "";
  } catch (err) {
    showError("Error: " + err.message);
  } finally {
    hideLoading();
  }
}

function displayResult(data) {
  const fullShortUrl = `${API_BASE_URL}/${data.shortCode}`;

  shortUrlInput.value = fullShortUrl;
  originalUrl.textContent = data.originalUrl;
  shortCode.textContent = data.shortCode;

  showResult();
}

function copyToClipboard() {
  shortUrlInput.select();
  shortUrlInput.setSelectionRange(0, 99999); // For mobile devices

  try {
    document.execCommand("copy");

    // Visual feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.style.background = "#28a745";

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.background = "";
    }, 2000);
  } catch (err) {
    console.error("Failed to copy: ", err);
    showError("Failed to copy to clipboard");
  }
}

function addToRecentLinks(linkData) {
  const fullShortUrl = `${API_BASE_URL}/${linkData.shortCode}`;

  // Add to beginning of array
  recentLinks.unshift({
    shortUrl: fullShortUrl,
    shortCode: linkData.shortCode,
    originalUrl: linkData.originalUrl,
    createdAt: new Date().toLocaleString(),
  });

  // Keep only last 5 links
  if (recentLinks.length > 5) {
    recentLinks = recentLinks.slice(0, 5);
  }

  updateRecentLinksDisplay();
}

function updateRecentLinksDisplay() {
  if (recentLinks.length === 0) {
    recentList.innerHTML =
      '<p class="no-links">No recent links yet. Create your first shortened URL above!</p>';
    return;
  }

  const linksHtml = recentLinks
    .map(
      (link) => `
        <div class="recent-item">
            <a href="${link.shortUrl}" target="_blank" class="short-link">${link.shortUrl}</a>
            <div class="original-link">${link.originalUrl}</div>
        </div>
    `
    )
    .join("");

  recentList.innerHTML = linksHtml;
}

async function loadRecentLinks() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recent`);
    if (response.ok) {
      const data = await response.json();
      recentLinks = data.map((item) => ({
        shortUrl: `${API_BASE_URL}/${item.shortCode}`,
        shortCode: item.shortCode,
        originalUrl: item.originalUrl,
        createdAt: new Date(item.createdAt).toLocaleString(),
      }));
      updateRecentLinksDisplay();
    }
  } catch (err) {
    console.log("Could not load recent links:", err.message);
    // This is not critical, so we don't show an error to the user
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function showLoading() {
  loading.classList.remove("hidden");
  shortenBtn.disabled = true;
}

function hideLoading() {
  loading.classList.add("hidden");
  shortenBtn.disabled = false;
}

function showError(message) {
  error.textContent = message;
  error.classList.remove("hidden");
}

function hideError() {
  error.classList.add("hidden");
}

function showResult() {
  result.classList.remove("hidden");
}

function hideResult() {
  result.classList.add("hidden");
}
