const STORAGE_KEY = "realCinemaLibraryScan";
const SETTINGS_KEY = "realCinemaLibrarySettings";

const supportedExtensions = ["mp4", "mkv", "mov", "avi", "m4v", "webm", "wmv"];

const folderInput = document.getElementById("folderInput");
const chooseFolderButton = document.getElementById("chooseFolderButton");
const clearLibraryButton = document.getElementById("clearLibraryButton");
const driveLabelInput = document.getElementById("driveLabelInput");
const driveCapacityInput = document.getElementById("driveCapacityInput");
const scanStatus = document.getElementById("scanStatus");

const globalSearchInput = document.getElementById("globalSearchInput");
const exportButton = document.getElementById("exportButton");

const qualityFilter = document.getElementById("qualityFilter");
const extensionFilter = document.getElementById("extensionFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
const clearFiltersButton = document.getElementById("clearFiltersButton");

const totalMoviesStat = document.getElementById("totalMoviesStat");
const totalStorageStat = document.getElementById("totalStorageStat");
const highQualityStat = document.getElementById("highQualityStat");
const lastScanStat = document.getElementById("lastScanStat");

const sidebarStorageUsed = document.getElementById("sidebarStorageUsed");
const sidebarStorageBar = document.getElementById("sidebarStorageBar");
const sidebarStoragePercent = document.getElementById("sidebarStoragePercent");

const driveStateGrid = document.getElementById("driveStateGrid");
const movieGrid = document.getElementById("movieGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");

const detailModal = document.getElementById("detailModal");
const modalContent = document.getElementById("modalContent");
const closeModalButton = document.getElementById("closeModalButton");
const toast = document.getElementById("toast");

let scannedMovies = loadScannedMovies();
let settings = loadSettings();

driveLabelInput.value = settings.driveLabel || "";
driveCapacityInput.value = settings.driveCapacityTB || "";

renderApp();

chooseFolderButton.addEventListener("click", function () {
  folderInput.click();
});

folderInput.addEventListener("change", function () {
  const files = Array.from(folderInput.files);

  if (files.length === 0) {
    showToast("No folder selected.");
    return;
  }

  scanFiles(files);
  folderInput.value = "";
});

clearLibraryButton.addEventListener("click", function () {
  const confirmClear = confirm("Clear the saved scan? This only clears the browser dashboard. It does not delete any files.");

  if (!confirmClear) {
    return;
  }

  scannedMovies = [];
  settings.lastScan = "";
  saveScannedMovies();
  saveSettings();

  renderApp();
  showToast("Saved scan cleared.");
});

driveLabelInput.addEventListener("input", saveCurrentSettings);
driveCapacityInput.addEventListener("input", saveCurrentSettings);

globalSearchInput.addEventListener("input", renderMovies);
qualityFilter.addEventListener("change", renderMovies);
extensionFilter.addEventListener("change", renderMovies);
statusFilter.addEventListener("change", renderMovies);
sortFilter.addEventListener("change", renderMovies);

clearFiltersButton.addEventListener("click", function () {
  globalSearchInput.value = "";
  qualityFilter.value = "All";
  extensionFilter.value = "All";
  statusFilter.value = "All";
  sortFilter.value = "Largest";
  renderMovies();
});

exportButton.addEventListener("click", exportCSV);

movieGrid.addEventListener("click", function (event) {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const movieId = button.dataset.id;
  const action = button.dataset.action;

  const movie = scannedMovies.find(function (item) {
    return item.id === movieId;
  });

  if (!movie) {
    return;
  }

  if (action === "details") {
    openDetails(movie);
  }

  if (action === "favorite") {
    movie.favorite = !movie.favorite;
    saveScannedMovies();
    renderApp();
    showToast(movie.favorite ? "Marked as favorite." : "Removed favorite.");
  }

  if (action === "watched") {
    movie.status = movie.status === "Watched" ? "Not Watched" : "Watched";
    saveScannedMovies();
    renderApp();
    showToast(`Status updated: ${movie.status}`);
  }
});

closeModalButton.addEventListener("click", closeModal);

detailModal.addEventListener("click", function (event) {
  if (event.target === detailModal) {
    closeModal();
  }
});

function scanFiles(files) {
  const driveLabel = driveLabelInput.value.trim() || getDefaultDriveLabel(files);
  const existingByPath = new Map();

  scannedMovies.forEach(function (movie) {
    existingByPath.set(movie.relativePath, movie);
  });

  const movieFiles = files
    .filter(isSupportedMovieFile)
    .map(function (file) {
      const relativePath = file.webkitRelativePath || file.name;
      const previousMovie = existingByPath.get(relativePath);

      const fileName = file.name;
      const extension = getFileExtension(fileName);
      const quality = guessQuality(fileName);
      const year = guessYear(fileName);
      const title = cleanMovieTitle(fileName);

      return {
        id: previousMovie ? previousMovie.id : createId(relativePath, file.size),
        title,
        fileName,
        extension,
        quality,
        year,
        fileSizeBytes: file.size,
        fileSizeGB: bytesToGB(file.size),
        relativePath,
        folderName: getTopFolder(relativePath),
        driveLabel,
        lastModified: file.lastModified,
        lastModifiedText: new Date(file.lastModified).toLocaleDateString(),
        status: previousMovie ? previousMovie.status : "Not Watched",
        favorite: previousMovie ? previousMovie.favorite : false,
        notes: previousMovie ? previousMovie.notes : "",
        scannedAt: new Date().toISOString()
      };
    });

  scannedMovies = movieFiles;

  settings.driveLabel = driveLabel;
  settings.driveCapacityTB = driveCapacityInput.value;
  settings.lastScan = new Date().toISOString();

  driveLabelInput.value = driveLabel;

  saveScannedMovies();
  saveSettings();
  populateFilters();
  renderApp();

  if (movieFiles.length === 0) {
    showToast("No supported movie files found.");
  } else {
    showToast(`${movieFiles.length} real movie files scanned.`);
  }
}

function isSupportedMovieFile(file) {
  const extension = getFileExtension(file.name);
  return supportedExtensions.includes(extension);
}

function getFileExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function guessQuality(fileName) {
  const name = fileName.toLowerCase();

  if (name.includes("4320p") || name.includes("8k")) {
    return "8K";
  }

  if (name.includes("2160p") || name.includes("4k") || name.includes("uhd")) {
    return "4K";
  }

  if (name.includes("1080p") || name.includes("fhd")) {
    return "1080p";
  }

  if (name.includes("720p")) {
    return "720p";
  }

  if (name.includes("480p")) {
    return "480p";
  }

  return "Unknown";
}

function guessYear(fileName) {
  const match = fileName.match(/\b(19[0-9]{2}|20[0-9]{2})\b/);
  return match ? match[0] : "";
}

function cleanMovieTitle(fileName) {
  let title = fileName.replace(/\.[^/.]+$/, "");

  title = title.replace(/\[[^\]]*\]/g, " ");
  title = title.replace(/\([^\)]*\)/g, " ");
  title = title.replace(/[._-]/g, " ");

  const removeWords = [
    "4320p", "2160p", "1080p", "720p", "480p", "8k", "4k", "uhd",
    "bluray", "blu ray", "brrip", "webrip", "web dl", "web",
    "x264", "x265", "h264", "h265", "hevc", "aac", "dts", "truehd",
    "atmos", "hdr", "dv", "remux", "extended", "proper", "repack"
  ];

  removeWords.forEach(function (word) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    title = title.replace(regex, " ");
  });

  title = title.replace(/\b(19[0-9]{2}|20[0-9]{2})\b/g, " ");
  title = title.replace(/\s+/g, " ").trim();

  if (!title) {
    return fileName.replace(/\.[^/.]+$/, "");
  }

  return title
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function getDefaultDriveLabel(files) {
  const firstFile = files[0];

  if (!firstFile || !firstFile.webkitRelativePath) {
    return "Selected Movie Folder";
  }

  return firstFile.webkitRelativePath.split("/")[0] || "Selected Movie Folder";
}

function getTopFolder(path) {
  return path.includes("/") ? path.split("/")[0] : "Selected Folder";
}

function bytesToGB(bytes) {
  return bytes / (1024 * 1024 * 1024);
}

function formatStorage(gb) {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }

  if (gb < 1) {
    return `${Math.max(gb * 1024, 0).toFixed(0)} MB`;
  }

  return `${gb.toFixed(2)} GB`;
}

function createId(path, size) {
  return `${path}-${size}`.replace(/[^a-zA-Z0-9]/g, "");
}

function loadScannedMovies() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveScannedMovies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scannedMovies));
}

function loadSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
    driveLabel: "",
    driveCapacityTB: "",
    lastScan: ""
  };
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveCurrentSettings() {
  settings.driveLabel = driveLabelInput.value.trim();
  settings.driveCapacityTB = driveCapacityInput.value;
  saveSettings();
  renderStats();
  renderDriveState();
}

function renderApp() {
  populateFilters();
  renderStats();
  renderDriveState();
  renderMovies();
  renderScanStatus();
}

function populateFilters() {
  populateSelect(qualityFilter, ["All", ...getUniqueValues("quality")]);
  populateSelect(extensionFilter, ["All", ...getUniqueValues("extension")]);
}

function populateSelect(selectElement, options) {
  const currentValue = selectElement.value;

  selectElement.innerHTML = "";

  options.forEach(function (value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  if (options.includes(currentValue)) {
    selectElement.value = currentValue;
  }
}

function getUniqueValues(key) {
  const values = new Set();

  scannedMovies.forEach(function (movie) {
    if (movie[key]) {
      values.add(movie[key]);
    }
  });

  return Array.from(values).sort();
}

function renderStats() {
  const totalMovies = scannedMovies.length;
  const totalSize = getTotalSize();
  const highQuality = scannedMovies.filter(function (movie) {
    return movie.quality === "4K" || movie.quality === "8K";
  }).length;

  totalMoviesStat.textContent = totalMovies;
  totalStorageStat.textContent = formatStorage(totalSize);
  highQualityStat.textContent = highQuality;
  lastScanStat.textContent = settings.lastScan ? formatShortDate(settings.lastScan) : "Never";

  sidebarStorageUsed.textContent = formatStorage(totalSize);

  const capacityTB = Number(driveCapacityInput.value) || 0;
  const capacityGB = capacityTB * 1024;

  if (capacityGB > 0) {
    const percentUsed = Math.min((totalSize / capacityGB) * 100, 100);
    sidebarStorageBar.style.width = `${percentUsed}%`;
    sidebarStoragePercent.textContent = `${percentUsed.toFixed(1)}% of ${capacityTB} TB capacity`;
  } else {
    sidebarStorageBar.style.width = "0%";
    sidebarStoragePercent.textContent = "Add drive capacity to show percentage.";
  }
}

function renderDriveState() {
  const totalSize = getTotalSize();
  const capacityTB = Number(driveCapacityInput.value) || 0;
  const capacityGB = capacityTB * 1024;
  const percentUsed = capacityGB > 0 ? Math.min((totalSize / capacityGB) * 100, 100) : 0;
  const freeSpace = capacityGB > 0 ? Math.max(capacityGB - totalSize, 0) : 0;
  const driveLabel = driveLabelInput.value.trim() || settings.driveLabel || "No drive label yet";

  driveStateGrid.innerHTML = "";

  const card = document.createElement("article");
  card.className = "drive-card";

  card.innerHTML = `
    <div class="drive-top">
      <div>
        <h3>${escapeHTML(driveLabel)}</h3>
        <span>${scannedMovies.length} movie files scanned</span>
      </div>
      <span>${capacityGB > 0 ? percentUsed.toFixed(1) + "%" : "Capacity optional"}</span>
    </div>

    <strong>
      ${formatStorage(totalSize)}
      ${capacityGB > 0 ? " / " + formatStorage(capacityGB) : " scanned"}
    </strong>

    <div class="progress-bar">
      <span style="width: ${percentUsed}%"></span>
    </div>

    <small>
      ${capacityGB > 0 ? formatStorage(freeSpace) + " estimated free after scanned files" : "Enter capacity to show estimated usage percentage."}
    </small>
  `;

  driveStateGrid.appendChild(card);
}

function renderMovies() {
  const searchTerm = globalSearchInput.value.trim().toLowerCase();
  const selectedQuality = qualityFilter.value;
  const selectedExtension = extensionFilter.value;
  const selectedStatus = statusFilter.value;
  const selectedSort = sortFilter.value;

  let filteredMovies = scannedMovies.filter(function (movie) {
    const matchesSearch =
      movie.title.toLowerCase().includes(searchTerm) ||
      movie.fileName.toLowerCase().includes(searchTerm) ||
      movie.relativePath.toLowerCase().includes(searchTerm) ||
      movie.driveLabel.toLowerCase().includes(searchTerm);

    const matchesQuality = selectedQuality === "All" || movie.quality === selectedQuality;
    const matchesExtension = selectedExtension === "All" || movie.extension === selectedExtension;
    const matchesStatus = selectedStatus === "All" || movie.status === selectedStatus;

    return matchesSearch && matchesQuality && matchesExtension && matchesStatus;
  });

  if (selectedSort === "Title") {
    filteredMovies.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
  }

  if (selectedSort === "Largest") {
    filteredMovies.sort(function (a, b) {
      return b.fileSizeGB - a.fileSizeGB;
    });
  }

  if (selectedSort === "Newest") {
    filteredMovies.sort(function (a, b) {
      return b.lastModified - a.lastModified;
    });
  }

  if (selectedSort === "Quality") {
    const qualityRank = {
      "8K": 5,
      "4K": 4,
      "1080p": 3,
      "720p": 2,
      "480p": 1,
      "Unknown": 0
    };

    filteredMovies.sort(function (a, b) {
      return (qualityRank[b.quality] || 0) - (qualityRank[a.quality] || 0);
    });
  }

  movieGrid.innerHTML = "";
  resultCount.textContent = `${filteredMovies.length} files showing`;

  if (filteredMovies.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filteredMovies.forEach(function (movie) {
    const statusClass = movie.status.replaceAll(" ", "-");

    const card = document.createElement("article");
    card.className = "movie-card";

    card.innerHTML = `
      <div class="poster">
        <div class="poster-title">${escapeHTML(movie.title)}</div>
        <span class="quality-badge">${escapeHTML(movie.quality)}</span>
      </div>

      <div class="movie-body">
        <span class="status-badge status-${statusClass}">${escapeHTML(movie.status)}</span>
        <span class="extension-badge">.${escapeHTML(movie.extension)}</span>

        <h3>
          ${escapeHTML(movie.title)}
          ${movie.favorite ? '<span class="favorite">★</span>' : ""}
        </h3>

        <p class="movie-meta">
          ${movie.year || "Year unknown"} • Last modified ${escapeHTML(movie.lastModifiedText)}
        </p>

        <div class="movie-details">
          <div class="movie-detail-row">
            <span>File Size</span>
            <strong>${formatStorage(movie.fileSizeGB)}</strong>
          </div>

          <div class="movie-detail-row">
            <span>Drive</span>
            <strong>${escapeHTML(movie.driveLabel)}</strong>
          </div>
        </div>

        <div class="movie-actions">
          <button class="movie-action" data-action="details" data-id="${movie.id}" type="button">Details</button>
          <button class="movie-action" data-action="favorite" data-id="${movie.id}" type="button">${movie.favorite ? "Unfavorite" : "Favorite"}</button>
          <button class="movie-action" data-action="watched" data-id="${movie.id}" type="button">${movie.status === "Watched" ? "Unwatch" : "Watched"}</button>
        </div>
      </div>
    `;

    movieGrid.appendChild(card);
  });
}

function renderScanStatus() {
  if (scannedMovies.length === 0) {
    scanStatus.textContent = "No folder scanned yet. Choose a folder to begin.";
    return;
  }

  scanStatus.textContent =
    `${scannedMovies.length} real movie files loaded from your last scan. ` +
    `Total scanned size: ${formatStorage(getTotalSize())}. ` +
    `Last scan: ${settings.lastScan ? new Date(settings.lastScan).toLocaleString() : "Unknown"}.`;
}

function openDetails(movie) {
  modalContent.innerHTML = `
    <div class="modal-layout">
      <div class="modal-poster">
        <div class="poster-title">${escapeHTML(movie.title)}</div>
      </div>

      <div class="modal-content">
        <h2>${escapeHTML(movie.title)}</h2>

        <p>
          This record is based on a real file selected from your folder scan.
        </p>

        <div class="modal-list">
          <div><span>File Name</span><strong>${escapeHTML(movie.fileName)}</strong></div>
          <div><span>Title Guess</span><strong>${escapeHTML(movie.title)}</strong></div>
          <div><span>Year Guess</span><strong>${movie.year || "Unknown"}</strong></div>
          <div><span>Quality Guess</span><strong>${escapeHTML(movie.quality)}</strong></div>
          <div><span>File Type</span><strong>.${escapeHTML(movie.extension)}</strong></div>
          <div><span>File Size</span><strong>${formatStorage(movie.fileSizeGB)}</strong></div>
          <div><span>Drive Label</span><strong>${escapeHTML(movie.driveLabel)}</strong></div>
          <div><span>Folder</span><strong>${escapeHTML(movie.folderName)}</strong></div>
          <div><span>Relative Path</span><strong>${escapeHTML(movie.relativePath)}</strong></div>
          <div><span>Last Modified</span><strong>${escapeHTML(movie.lastModifiedText)}</strong></div>
        </div>

        <form class="modal-form" data-id="${movie.id}">
          <label for="modalStatusSelect">Watch Status</label>
          <select id="modalStatusSelect">
            <option value="Not Watched" ${movie.status === "Not Watched" ? "selected" : ""}>Not Watched</option>
            <option value="Watching" ${movie.status === "Watching" ? "selected" : ""}>Watching</option>
            <option value="Watched" ${movie.status === "Watched" ? "selected" : ""}>Watched</option>
          </select>

          <label for="modalNotesInput">Notes</label>
          <textarea id="modalNotesInput" placeholder="Example: Remastered version, best copy, replace later, etc.">${escapeHTML(movie.notes || "")}</textarea>

          <button class="primary-button" type="submit">Save Details</button>
        </form>
      </div>
    </div>
  `;

  const modalForm = modalContent.querySelector(".modal-form");

  modalForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const targetMovie = scannedMovies.find(function (item) {
      return item.id === movie.id;
    });

    if (!targetMovie) {
      return;
    }

    targetMovie.status = document.getElementById("modalStatusSelect").value;
    targetMovie.notes = document.getElementById("modalNotesInput").value.trim();

    saveScannedMovies();
    closeModal();
    renderApp();
    showToast("Movie details saved.");
  });

  detailModal.classList.remove("hidden");
}

function closeModal() {
  detailModal.classList.add("hidden");
}

function getTotalSize() {
  return scannedMovies.reduce(function (total, movie) {
    return total + Number(movie.fileSizeGB);
  }, 0);
}

function formatShortDate(dateString) {
  return new Date(dateString).toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
}

function exportCSV() {
  if (scannedMovies.length === 0) {
    showToast("No scanned movies to export.");
    return;
  }

  const headers = [
    "Title",
    "File Name",
    "Extension",
    "Quality",
    "Year",
    "File Size GB",
    "Drive Label",
    "Relative Path",
    "Status",
    "Favorite",
    "Last Modified",
    "Notes"
  ];

  const rows = scannedMovies.map(function (movie) {
    return [
      movie.title,
      movie.fileName,
      movie.extension,
      movie.quality,
      movie.year,
      movie.fileSizeGB.toFixed(2),
      movie.driveLabel,
      movie.relativePath,
      movie.status,
      movie.favorite ? "Yes" : "No",
      movie.lastModifiedText,
      movie.notes || ""
    ];
  });

  const csvContent = [headers, ...rows]
    .map(function (row) {
      return row
        .map(function (cell) {
          return `"${String(cell).replaceAll('"', '""')}"`;
        })
        .join(",");
    })
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cinema-library-scan.csv";
  link.click();

  URL.revokeObjectURL(url);
  showToast("CSV exported.");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(function () {
    toast.classList.add("hidden");
  }, 2500);
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
