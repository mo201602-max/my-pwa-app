/* アプリ固有の処理は基本的にこのファイルへ追加します。 */
const APP_VERSION = "1.0.0";
const STORAGE_KEY = "my-pwa-template-counter-v1";

const $ = (id) => document.getElementById(id);
let deferredInstallPrompt = null;
let waitingWorker = null;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function readCount() {
  const value = Number(localStorage.getItem(STORAGE_KEY) || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
function renderCount() {
  $("countValue").textContent = readCount().toLocaleString("ja-JP");
}
$("countButton").addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, String(readCount() + 1));
  renderCount();
});
$("resetButton").addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, "0");
  renderCount();
  showToast("カウントをリセットしました");
});

function updateNetworkStatus() {
  const online = navigator.onLine;
  $("networkStatus").textContent = online ? "オンライン" : "オフライン";
  $("networkStatus").classList.toggle("offline", !online);
  $("connectionText").textContent = online ? "オンライン" : "オフライン";
}
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);

function updateDisplayMode() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  $("displayText").textContent = standalone ? "アプリとして起動中" : "ブラウザで表示中";
}
window.matchMedia("(display-mode: standalone)").addEventListener?.("change", updateDisplayMode);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("installButton").hidden = false;
});
$("installButton").addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    showToast("Chromeメニューからインストールしてください");
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("installButton").hidden = true;
});
window.addEventListener("appinstalled", () => {
  $("installButton").hidden = true;
  showToast("ホーム画面への追加が完了しました");
});

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    $("swText").textContent = "非対応";
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    $("swText").textContent = "登録済み";
    if (registration.waiting) showUpdateNotice(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateNotice(worker);
        }
      });
    });
    // 起動中も更新を確認する
    registration.update().catch(() => {});
  } catch (error) {
    $("swText").textContent = "登録失敗";
    console.error("Service Worker registration failed:", error);
  }
}
function showUpdateNotice(worker) {
  waitingWorker = worker;
  $("updateNotice").hidden = false;
}
$("updateButton").addEventListener("click", () => {
  if (waitingWorker) waitingWorker.postMessage({ type: "SKIP_WAITING" });
});
$("dismissUpdate").addEventListener("click", () => {
  $("updateNotice").hidden = true;
});
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  // 新しいService Workerが制御を開始したら一度だけ再読み込み
  if (!window.__reloadedForUpdate) {
    window.__reloadedForUpdate = true;
    window.location.reload();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  $("appVersion").textContent = `Ver.${APP_VERSION}`;
  renderCount();
  updateNetworkStatus();
  updateDisplayMode();
  registerServiceWorker();
});
