// ดึง Elements เริ่มต้น
const authPanel = document.getElementById("admin-auth-panel");
const mainArea = document.getElementById("admin-main-area");
const passcodeField = document.getElementById("admin-passcode");
const authBtn = document.getElementById("auth-btn");
const authStatus = document.getElementById("auth-status");

// ตัวแปรเก็บรหัสผ่านชั่วคราวใน Memory (ไม่มีการบันทึกใน sessionStorage)
let currentPasscode = "";

// แม่แบบโครงสร้าง HTML ของระบบ Admin
const ADMIN_PANEL_TEMPLATE = `
  <main id="admin-main-panel" class="admin-card">
    <h2 class="admin-title">🛡️ ระบบผู้ดูแลระบบ (Admin Sync)</h2>
    <p class="admin-hint">
      กรอกข้อมูลพัสดุเพื่อสั่งให้เซิร์ฟเวอร์ดึงข้อมูลจาก KEX และบันทึกลง Google Sheets<br />
      <strong>รูปแบบ:</strong> เบอร์โทรศัพท์,เลขพัสดุ (บรรทัดละ 1 รายการ)
    </p>

    <div class="form-group">
      <textarea
        id="admin-input"
        class="admin-textarea"
        placeholder="0651416942,KEX61738021691&#10;0984846342,KEX61738023108"
      ></textarea>
    </div>

    <button id="admin-sync-btn" class="admin-btn" type="button">
      เริ่มดึงข้อมูลพัสดุเข้าระบบ
    </button>

    <div id="admin-status" class="admin-status"></div>
  </main>
`;

// ตรวจสอบรหัสผ่านโดยการถามเซิร์ฟเวอร์หลังบ้าน (Backend)
authBtn.addEventListener("click", async () => {
  const inputVal = passcodeField.value.trim();

  if (inputVal.length === 0) {
    showAuthStatus("กรุณากรอกรหัสผ่านก่อนเข้าใช้งาน", "error");
    return;
  }

  authBtn.disabled = true;
  showAuthStatus("กำลังตรวจสอบรหัสผ่าน...", "success");

  try {
    // ยิงไปเช็คที่ Endpoint ตรวจสอบรหัสผ่านของหลังบ้าน
    const response = await fetch(
      "https://kalpa-tracking-backend.onrender.com/api/verify-passcode",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: inputVal }),
      },
    );

    const data = await response.json();

    if (response.ok) {
      // ถ้ารหัสผ่านถูกต้อง (200 OK)
      currentPasscode = inputVal; // จำรหัสผ่านไว้ใช้ตอนกดส่งพัสดุ
      renderAdminPanel();
    } else {
      // ถ้ารหัสผ่านผิด (401 Unauthorized)
      showAuthStatus(
        data.message || "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    }
  } catch (err) {
    showAuthStatus(
      "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อตรวจสอบรหัสผ่านได้",
      "error",
    );
  } finally {
    authBtn.disabled = false;
  }
});

function renderAdminPanel() {
  authPanel.style.display = "none";
  mainArea.innerHTML = ADMIN_PANEL_TEMPLATE;
  initializeAdminFunctions();
}

function showAuthStatus(msg, type) {
  authStatus.innerText = msg;
  authStatus.className = `admin-status status-${type}`;
}

// 2. ฟังก์ชันประมวลผลและส่งข้อมูลพัสดุไปยังเซิร์ฟเวอร์หลังบ้าน
function initializeAdminFunctions() {
  const syncBtn = document.getElementById("admin-sync-btn");
  const adminInput = document.getElementById("admin-input");
  const adminStatus = document.getElementById("admin-status");

  syncBtn.addEventListener("click", async () => {
    const rawText = adminInput.value.trim();

    if (!rawText) {
      showStatus("กรุณากรอกข้อมูลพัสดุอย่างน้อย 1 รายการ", "error");
      return;
    }

    const deliveryData = [];
    const lines = rawText.split("\n");

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const parts = line.split(",");
      if (parts.length < 2) {
        showStatus(
          `ข้อมูลในบรรทัด "${line}" ไม่ถูกต้อง (ต้องประกอบด้วยเบอร์โทรและเลขพัสดุ คั่นด้วยเครื่องหมายจุลภาค ',')`,
          "error",
        );
        return;
      }

      deliveryData.push({
        mobile: parts[0].trim(),
        trackingId: parts[1].trim(),
      });
    }

    syncBtn.disabled = true;
    showStatus("กำลังส่งข้อมูลไปยังเซิร์ฟเวอร์...", "success");

    try {
      const response = await fetch(
        "https://kalpa-tracking-backend.onrender.com/api/run-scraper",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-passcode": currentPasscode, // แนบรหัสผ่านที่เราพิสูจน์แล้วส่งไปทำงานจริง
          },
          body: JSON.stringify({ deliveryData }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        showStatus(
          `เริ่มระบบดึงข้อมูลสำเร็จ! ${data.message || ""} คุณสามารถปิดหน้านี้ได้ทันที ระบบหลังบ้านจะทำงานต่อไปจนเสร็จ`,
          "success",
        );
        adminInput.value = "";
      } else {
        if (response.status === 401) {
          showStatus(
            "เกิดข้อผิดพลาด: รหัสผ่านเข้าใช้งานไม่ถูกต้องหรือหมดอายุ",
            "error",
          );
          currentPasscode = "";
          setTimeout(() => location.reload(), 3000);
        } else {
          showStatus(
            `เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${data.message || "ไม่สามารถเริ่มขั้นตอนได้"}`,
            "error",
          );
        }
      }
    } catch (err) {
      showStatus(
        "ไม่สามารถเชื่อมต่อไปยังเซิร์ฟเวอร์ Node.js Backend ได้",
        "error",
      );
    } finally {
      syncBtn.disabled = false;
    }
  });

  function showStatus(msg, type) {
    adminStatus.innerText = msg;
    adminStatus.className = `admin-status status-${type}`;
  }
}
