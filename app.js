const APPS_SCRIPT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbz-qHgo-GxD5gwcn86ChO0h0BM1bEAXfCj4dqtUyK0iSgRKuvoorVcetQyJOenDFeqT/exec";
const KEX_TRACK_BASE_URL = "https://th.kex-express.com/th/track/?track=";

const form = document.getElementById("lookup-form");
const mobileInput = document.getElementById("mobile-number");
const submitBtn = document.getElementById("submit-btn");
const resultSection = document.getElementById("result-section");
const resultList = document.getElementById("result-list");

const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");

// Add this helper function at the top or bottom of app.js
function showToast(message) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById("error-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "error-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function setStatus(message, type = "") {
  loadingState.classList.remove("is-visible");
  document.body.classList.remove("no-scroll");

  if (emptyState) emptyState.style.display = "none";
  if (errorState) errorState.style.display = "none";

  if (type === "loading") {
    loadingState.classList.add("is-visible");
    document.body.classList.add("no-scroll");
  }

  if (type === "error") {
    showToast(message);

    if (emptyState) emptyState.style.display = "flex";
  }

  if (type === "success") {
    // Handled by renderResults
  }
}

function clearResults() {
  resultList.innerHTML = "";
  resultSection.style.display = "none";

  emptyState.style.display = "flex";

  // Hide the top counter
  const totalCountLabel = document.getElementById("total-count-label");
  if (totalCountLabel) totalCountLabel.style.display = "none";
}

function normalizeRecords(data) {
  if (Array.isArray(data.trackingItems)) {
    return data.trackingItems.map((item) => ({
      trackingNumber: String(item.trackingNumber || "").trim(),
      timestamp: item.timestamp || "",
      kexLink: item.kexLink || "#",
    }));
  }

  if (Array.isArray(data.trackingNumbers)) {
    return data.trackingNumbers.map((trackingNumber) => ({
      trackingNumber: String(trackingNumber || "").trim(),
      timestamp: "",
      kexLink: item.kexLink || "#",
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
  if (!dateKey || dateKey === "NO_DATE") return "ไม่ระบุวันที่";

  const parsed = new Date(dateKey);
  if (Number.isNaN(parsed.getTime())) return dateKey;

  // Use 'th-TH' for Thai language
  return parsed.toLocaleDateString("th-TH", {
    day: "2-digit", // Forces "02" instead of "2"
    month: "long", // "พฤษภาคม"
    year: "numeric", // "2569" (Buddhist Era) or "2026" (Christian Era)
  });
}

function formatDateLabel(timestampValue) {
  const key = getDateGroupKey(timestampValue);
  if (!key || key === "NO_DATE") return "ไม่ระบุวันที่";
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

  // 1. Get the total count and update the top label
  const totalCountLabel = document.getElementById("total-count-label");
  if (records.length > 0) {
    totalCountLabel.textContent = `(ทั้งหมด ${records.length} รายการ)`;
    totalCountLabel.style.display = "inline-block"; // Show it
  } else {
    totalCountLabel.style.display = "none"; // Hide if no results
  }

  const grouped = groupRecordsByDate(records);
  const dateKeys = Array.from(grouped.keys());

  grouped.forEach((groupItems, dateKey) => {
    const isLatestDate = dateKey === dateKeys[0];
    const groupLi = document.createElement("li");
    groupLi.className = "time-group";

    const dateLabel = formatDateLabelFromKey(dateKey);
    const itemCount = groupItems.length;

    groupLi.innerHTML = `
      <div class="time-group-header">
        <h3 class="time-group-title">${dateLabel} <span>(${itemCount} รายการ)</span></h3>
      </div>
      <ul class="group-list"></ul>
    `;

    const groupList = groupLi.querySelector(".group-list");

    groupItems.forEach((record) => {
      const row = document.createElement("li");
      row.className = "result-item";

      // Keep your bold logic for the latest date
      const fontWeight = isLatestDate
        ? "font-weight: 700;"
        : "font-weight: 400;";

      console.log("record: ", record);

      row.innerHTML = `
        <div class="item-content">
          <div class="tracking-info">
            <img src="assets/box-black.svg" class="item-icon" alt="parcel">
            <span class="tracking-number" style="${fontWeight}">${record.trackingNumber.toUpperCase()}</span>
          </div>
          <a href="${record.kexLink}" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="track-btn">
             <img src="assets/delivery-truck.svg" alt="" class="btn-icon">
             <span>เช็กพัสดุ</span>
          </a>
        </div>
      `;
      groupList.appendChild(row);
    });

    resultList.appendChild(groupLi);
  });

  emptyState.style.display = "none";
  resultSection.style.display = "block";
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
    throw new Error(`ระบบเกิดข้อผิดพลาด ${response.status}`);
  }

  const data = response.json();
  console.log("response: ", data);

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResults();

  const mobileNumber = mobileInput.value.trim();

  // 1. Check if the input is empty
  if (!mobileNumber) {
    setStatus("กรุณากรอกเบอร์โทรศัพท์", "error");
    return;
  }

  // 2. Validate Thai Mobile Format (10 digits starting with 06, 08, or 09)
  const thaiMobileRegex = /^0[689]\d{8}$/;
  if (!thaiMobileRegex.test(mobileNumber)) {
    setStatus("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ตัวอย่าง: 0812345678)", "error");
    return; // Stop execution immediately (does not load data)
  }

  // 3. Proceed to fetch data if format is correct
  submitBtn.disabled = true;
  setStatus("กำลังค้นหา...", "loading");

  try {
    const data = await fetchTrackingByMobile(mobileNumber);
    if (!data.success) {
      throw new Error(data.message || "ระบบเกิดข้อผิดพลาด");
    }

    const records = normalizeRecords(data).filter(
      (item) => item.trackingNumber,
    );
    if (records.length === 0) {
      setStatus("ไม่พบข้อมูล", "error");
      return;
    }

    renderResults(records);
    setStatus(`พบข้อมูลทั้งหมด ${records.length} รายการ`, "success");
  } catch (error) {
    setStatus(`เกิดข้อผิดพลาด: ${error.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});
