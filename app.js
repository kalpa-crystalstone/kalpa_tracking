const APPS_SCRIPT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw_TaHEwkAPaaQz3-WAh7oNABuYF7jtxKDRQK6TLbn2_QMZkUdZvUWLwpqq3cDspIrg/exec";

const form = document.getElementById("lookup-form");
const mobileInput = document.getElementById("mobile-number");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const resultSection = document.getElementById("result-section");
const resultList = document.getElementById("result-list");
const KEX_TRACK_BASE_URL = "https://th.kex-express.com/th/track/?track=";
const emptyState = document.getElementById("empty-state");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
  statusEl.style.color = type === "error" ? "#ff4d4d" : "#ffffff";
}

function clearResults() {
  resultList.innerHTML = "";
  resultSection.style.display = "none"; // Hide results
  emptyState.style.display = "flex"; // Show the truck
}

function normalizeRecords(data) {
  if (Array.isArray(data.trackingItems)) {
    return data.trackingItems.map((item) => ({
      trackingNumber: String(item.trackingNumber || "").trim(),
      timestamp: item.timestamp || "",
    }));
  }

  if (Array.isArray(data.trackingNumbers)) {
    return data.trackingNumbers.map((trackingNumber) => ({
      trackingNumber: String(trackingNumber || "").trim(),
      timestamp: "",
    }));
  }

  return [];
}

function parseTimestamp(timestampValue) {
  if (!timestampValue) return null;
  const date = new Date(timestampValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateGroupKey(timestampValue) {
  const date = parseTimestamp(timestampValue);
  if (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const text = String(timestampValue || "").trim();
  if (!text) return "NO_DATE";

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  if (text.includes(" ")) {
    return text.split(" ")[0];
  }

  return text;
}

function formatDateLabelFromKey(dateKey) {
  if (!dateKey || dateKey === "NO_DATE") return "No date";
  const parsed = new Date(dateKey);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateLabel(timestampValue) {
  const key = getDateGroupKey(timestampValue);
  if (!key || key === "NO_DATE") return "No date";
  const date = parseTimestamp(key);
  if (!date) return key;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupRecordsByDate(records) {
  const groups = new Map();
  records.forEach((record) => {
    const dateKey = getDateGroupKey(record.timestamp);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey).push(record);
  });
  return groups;
}

function renderResults(records) {
  clearResults();
  const grouped = groupRecordsByDate(records);

  grouped.forEach((groupItems, dateKey) => {
    const groupLi = document.createElement("li");
    groupLi.className = "time-group";

    const groupTitle = document.createElement("h3");
    groupTitle.className = "time-group-title";
    groupTitle.textContent = formatDateLabelFromKey(dateKey);
    groupLi.appendChild(groupTitle);

    const groupList = document.createElement("ul");
    groupList.className = "group-list";

    groupItems.forEach((record) => {
      const row = document.createElement("li");
      row.className = "result-item";

      const textWrap = document.createElement("div");
      textWrap.className = "item-text";

      const trackingText = document.createElement("div");
      trackingText.className = "tracking-number";
      trackingText.textContent = record.trackingNumber;

      const kexLink = document.createElement("a");
      kexLink.className = "track-btn";
      kexLink.href = `${KEX_TRACK_BASE_URL}${encodeURIComponent(record.trackingNumber.toUpperCase())}`;
      kexLink.target = "_blank";
      kexLink.rel = "noopener noreferrer";
      kexLink.textContent = "Track on KEX";

      textWrap.appendChild(trackingText);
      row.appendChild(textWrap);
      row.appendChild(kexLink);
      groupList.appendChild(row);
    });

    groupLi.appendChild(groupList);
    resultList.appendChild(groupLi);
  });

  emptyState.style.display = "none"; // Hide the truck
  resultSection.style.display = "block"; // Show the list
}

async function fetchTrackingByMobile(mobileNumber) {
  const url = `${APPS_SCRIPT_WEB_APP_URL}?mobile=${encodeURIComponent(mobileNumber)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResults();

  const mobileNumber = mobileInput.value.trim();
  if (!mobileNumber) {
    setStatus("Please enter a mobile number.", "error");
    return;
  }

  if (
    APPS_SCRIPT_WEB_APP_URL.includes(
      "https://script.google.com/macros/s/AKfycbw_TaHEwkAPaaQz3-WAh7oNABuYF7jtxKDRQK6TLbn2_QMZkUdZvUWLwpqq3cDspIrg/exec",
    )
  ) {
    setStatus(
      "Please configure your Apps Script web app URL in app.js first.",
      "error",
    );
    return;
  }

  submitBtn.disabled = true;
  setStatus("Searching...", "");

  try {
    const data = await fetchTrackingByMobile(mobileNumber);
    if (!data.success) {
      throw new Error(data.message || "Unknown error from server.");
    }

    const records = normalizeRecords(data).filter(
      (item) => item.trackingNumber,
    );
    if (records.length === 0) {
      setStatus("No tracking numbers found for this mobile number.", "error");
      return;
    }

    renderResults(records);
    setStatus(`Found ${records.length} tracking number(s).`, "success");
  } catch (error) {
    setStatus(`Error: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});
