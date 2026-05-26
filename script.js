const STORAGE_KEY = "cinemaLibraryMovies";
const SCAN_KEY = "cinemaLibraryLastScan";

const supportedExtensions = [".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"];

let movies = loadMovies();

const scanFolderButton = document.getElementById("scanFolderButton");
const heroScanButton = document.getElementById("heroScanButton");
const emptyScanButton = document.getElementById("emptyScanButton");
const clearLibraryButton = document.getElementById("clearLibraryButton");
const exportLibraryButton = document.getElementById("exportLibraryButton");

const folderInput = document.getElementById("folderInput");

const movieCount = document.getElementById("movieCount");
const totalStorage = document.getElementById("totalStorage");
const highestQuality = document.getElementById("highestQuality");
const lastScan = document.getElementById("lastScan");

const searchInput = document.getElementById("searchInput");
const qualityFilter = document.getElementById("qualityFilter");
const sortSelect = document.getElementById("sortSelect");
const resultCount = document.getElementById("resultCount");

const emptyState = document.getElementById("emptyState");
const movieGrid = document.getElementById("movieGrid");

const movieModal = document.getElementById("movieModal");
const closeModalButton = document.getElementById("closeModalButton");

const modalTitle = document.getElementById("modalTitle");
const modalQuality = document.getElementById("modalQuality");
const modalSize = document.getElementById("modalSize");
const modalType = document.getElementById("modalType");
const modalModified = document.getElementById("modalModified");
const modalFileName = document.getElementById("modalFileName");
const modalPath = document.getElementById("modalPath");

const toast = document.getElementById("toast");

renderApp();

scanFolderButton.addEventListener("click", startScan);
heroScanButton.addEventListener("click", startScan);
emptyScanButton.addEventListener("click", startScan);

folderInput.addEventListener("change", handleFallbackFolderScan);

clearLibraryButton.addEventListener("click", () => {
  const confirmed = confirm("Clear your saved movie library?");

  if (!confirmed) {
    return;
  }

  movies = [];
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SCAN_KEY);

  renderApp();
  showToast("Library cleared.");
});

exportLibraryButton.addEventListener("click", exportLibrary);

searchInput.addEventListener("input", renderMovies);
qualityFilter.addEventListener("change", renderMovies);
sortSelect.addEventListener("change", renderMovies);

closeModalButton.addEventListener("click", () => {
  movieModal.classList.add("hidden");
});

movieModal.addEventListener("click", (event) => {
  if (event.target === movieModal) {
    movieModal.classList.add("hidden");
  }
});

async function startScan() {
  if ("showDirectoryPicker" in window) {
    await scanWithDirectoryPicker();
  } else {
    folderInput.click();
  }
}

async function scanWithDirectoryPicker() {
  try {
    const directoryHandle = await window.showDirectoryPicker();
    const scannedMovies = [];

    await scanDirectoryHandle(directoryHandle, scannedMovies, directoryHandle.name);

    saveScannedMovies(scannedMovies);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      showToast("Folder scan could not be completed.");
    }
  }
}

async function scanDirectoryHandle(directoryHandle, scannedMovies, basePath) {
  for await (const entry of directoryHandle.values()) {
    const currentPath = `${basePath}/${entry.name}`;

    if (entry.kind === "file") {
      const file = await entry.getFile();

      if (isMovieFile(file.name)) {
        scannedMovies.push(createMovieFromFile(file, currentPath, basePath));
      }
    }

    if (entry.kind === "directory") {
      await scanDirectoryHandle(entry, scannedMovies, currentPath);
    }
  }
}

function handleFallbackFolderScan(event) {
  const files = Array.from(event.target.files);
  const scannedMovies = files
    .filter((file) => isMovieFile(file.name))
    .map((file) => {
      const path = file.webkitRelativePath || file.name;
      const folderName = path.split("/")[0] || "Selected Folder";

      return createMovieFromFile(file, path, folderName);
    });

  saveScannedMovies(scannedMovies);

  folderInput.value = "";
}

function saveScannedMovies(scannedMovies) {
  if (scannedMovies.length === 0) {
    showToast("No supported movie files were found.");
    return;
  }

  movies = scannedMovies;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  localStorage.setItem(SCAN_KEY, new Date().toISOString());

  renderApp();

  showToast(`${scannedMovies.length} movie file(s) scanned.`);
}

function createMovieFromFile(file, path, folderName) {
  const title = cleanMovieTitle(file.name);
  const extension = getExtension(file.name);
  const quality = detectQuality(file.name);
  const scannedAt = new Date().toISOString();

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${file.name}-${Date.now()}-${Math.random()}`,
    title,
    fileName: file.name,
    path,
    folderName,
    extension,
    quality,
    sizeBytes: file.size,
    lastModified: file.lastModified,
    scannedAt
  };
}

function isMovieFile(fileName) {
  const lowerName = fileName.toLowerCase();

  return supportedExtensions.some((extension) => {
    return lowerName.endsWith(extension);
  });
}

function getExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "Unknown";
}

function detectQuality(fileName) {
  const lowerName = fileName.toLowerCase();

  if (
    lowerName.includes("2160") ||
    lowerName.includes("4k") ||
    lowerName.includes("uhd")
  ) {
    return "4K";
  }

  if (lowerName.includes("1080")) {
    return "1080p";
  }

  if (lowerName.includes("720")) {
    return "720p";
  }

  if (
    lowerName.includes("480") ||
    lowerName.includes("dvd") ||
    lowerName.includes("sd")
  ) {
    return "SD";
  }

  return "Unknown";
}

function cleanMovieTitle(fileName) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");

  return withoutExtension
    .replace(/[._-]/g, " ")
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|bluray|brrip|webrip|web dl|x264|x265|h264|h265|hevc|aac|dts)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderApp() {
  renderStats();
  renderMovies();
}

function renderStats() {
  const totalBytes = movies.reduce((sum, movie) => sum + movie.sizeBytes, 0);
  const bestQuality = getHighestQuality();
  const savedScanDate = localStorage.getItem(SCAN_KEY);

  movieCount.textContent = movies.length;
  totalStorage.textContent = formatBytes(totalBytes);
  highestQuality.textContent = bestQuality;
  lastScan.textContent = savedScanDate ? formatDate(savedScanDate) : "Never";
}

function renderMovies() {
  let filteredMovies = [...movies];

  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedQuality = qualityFilter.value;
  const sortValue = sortSelect.value;

  if (searchTerm) {
    filteredMovies = filteredMovies.filter((movie) => {
      return `
        ${movie.title}
        ${movie.fileName}
        ${movie.path}
        ${movie.folderName}
        ${movie.quality}
        ${movie.extension}
      `.toLowerCase().includes(searchTerm);
    });
  }

  if (selectedQuality !== "all") {
    filteredMovies = filteredMovies.filter((movie) => {
      return movie.quality === selectedQuality;
    });
  }

  filteredMovies = sortMovies(filteredMovies, sortValue);

  movieGrid.innerHTML = "";

  if (movies.length === 0) {
    emptyState.classList.remove("hidden");
    movieGrid.classList.add("hidden");
    resultCount.textContent = "No movies scanned yet";
    return;
  }

  emptyState.classList.add("hidden");
  movieGrid.classList.remove("hidden");

  resultCount.textContent = `Showing ${filteredMovies.length} of ${movies.length} movies`;

  if (filteredMovies.length === 0) {
    movieGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>No matching movies found.</h3>
        <p>Try clearing the search or changing your quality filter.</p>
      </div>
    `;
    return;
  }

  filteredMovies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";

    card.innerHTML = `
      <div class="movie-poster">
        <div class="movie-poster-icon">🎞️</div>
        <span class="quality-badge">${movie.quality}</span>
      </div>

      <div class="movie-content">
        <h3>${escapeHTML(movie.title || movie.fileName)}</h3>

        <div class="movie-meta">
          <span>${movie.extension}</span>
          <span>${formatBytes(movie.sizeBytes)}</span>
          <span>${escapeHTML(movie.folderName)}</span>
        </div>

        <p class="movie-path">${escapeHTML(shortenPath(movie.path))}</p>

        <button class="details-button" data-id="${movie.id}" type="button">
          View Details
        </button>
      </div>
    `;

    card.querySelector(".details-button").addEventListener("click", () => {
      openMovieDetails(movie.id);
    });

    movieGrid.appendChild(card);
  });
}

function sortMovies(movieList, sortValue) {
  const qualityRank = {
    "4K": 4,
    "1080p": 3,
    "720p": 2,
    "SD": 1,
    "Unknown": 0
  };

  if (sortValue === "name") {
    return movieList.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortValue === "newest") {
    return movieList.sort((a, b) => {
      return new Date(b.scannedAt) - new Date(a.scannedAt);
    });
  }

  if (sortValue === "largest") {
    return movieList.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  if (sortValue === "quality") {
    return movieList.sort((a, b) => {
      return qualityRank[b.quality] - qualityRank[a.quality];
    });
  }

  return movieList;
}

function getHighestQuality() {
  const qualityRank = {
    "4K": 4,
    "1080p": 3,
    "720p": 2,
    "SD": 1,
    "Unknown": 0
  };

  if (movies.length === 0) {
    return "None";
  }

  const best = movies.reduce((top, movie) => {
    return qualityRank[movie.quality] > qualityRank[top.quality] ? movie : top;
  }, movies[0]);

  return best.quality;
}

function openMovieDetails(id) {
  const movie = movies.find((item) => item.id === id);

  if (!movie) {
    return;
  }

  modalTitle.textContent = movie.title || movie.fileName;
  modalQuality.textContent = movie.quality;
  modalSize.textContent = formatBytes(movie.sizeBytes);
  modalType.textContent = movie.extension;
  modalModified.textContent = movie.lastModified
    ? new Date(movie.lastModified).toLocaleDateString()
    : "Unknown";
  modalFileName.textContent = movie.fileName;
  modalPath.textContent = movie.path;

  movieModal.classList.remove("hidden");
}

function exportLibrary() {
  if (movies.length === 0) {
    showToast("Scan movies before exporting.");
    return;
  }

  const data = JSON.stringify(movies, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cinema-library-export.json";
  link.click();

  URL.revokeObjectURL(url);

  showToast("Library exported.");
}

function loadMovies() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 GB";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index >= 3 ? 2 : 1)} ${units[index]}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function shortenPath(path) {
  if (path.length <= 58) {
    return path;
  }

  return `...${path.slice(-58)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
