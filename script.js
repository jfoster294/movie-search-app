const STORAGE_KEY = "cinemaLibraryMovies";
const SCAN_KEY = "cinemaLibraryLastScan";

const supportedExtensions = [".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"];

let movies = loadMovies();
let selectedMovieId = movies[0]?.id || null;
let activeQuality = "all";

const addFolderButton = document.getElementById("addFolderButton");
const heroAddFolderButton = document.getElementById("heroAddFolderButton");
const exportLibraryButton = document.getElementById("exportLibraryButton");
const clearLibraryButton = document.getElementById("clearLibraryButton");
const folderInput = document.getElementById("folderInput");

const searchInput = document.getElementById("searchInput");
const qualityFilter = document.getElementById("qualityFilter");
const sortSelect = document.getElementById("sortSelect");
const filterChips = document.querySelectorAll(".filter-chip");

const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const heroPoster = document.getElementById("heroPoster");
const statusText = document.getElementById("statusText");

const movieCount = document.getElementById("movieCount");
const storageTotal = document.getElementById("storageTotal");
const folderCount = document.getElementById("folderCount");
const duplicateCount = document.getElementById("duplicateCount");

const sourceList = document.getElementById("sourceList");
const resultCount = document.getElementById("resultCount");
const lastScanText = document.getElementById("lastScanText");
const emptyState = document.getElementById("emptyState");
const movieGrid = document.getElementById("movieGrid");

const movieModal = document.getElementById("movieModal");
const closeModalButton = document.getElementById("closeModalButton");
const modalPoster = document.getElementById("modalPoster");
const modalPosterQuality = document.getElementById("modalPosterQuality");
const modalPosterTitle = document.getElementById("modalPosterTitle");
const modalTitle = document.getElementById("modalTitle");
const modalQuality = document.getElementById("modalQuality");
const modalType = document.getElementById("modalType");
const modalSize = document.getElementById("modalSize");
const modalFileName = document.getElementById("modalFileName");
const modalSource = document.getElementById("modalSource");
const modalPath = document.getElementById("modalPath");
const modalScannedAt = document.getElementById("modalScannedAt");
const modalDuplicateWarning = document.getElementById("modalDuplicateWarning");

const toast = document.getElementById("toast");

renderApp();

addFolderButton.addEventListener("click", startFolderScan);
heroAddFolderButton.addEventListener("click", startFolderScan);
exportLibraryButton.addEventListener("click", exportLibrary);
clearLibraryButton.addEventListener("click", clearLibrary);

folderInput.addEventListener("change", handleFallbackFolderScan);

searchInput.addEventListener("input", renderMovies);
sortSelect.addEventListener("change", renderMovies);

qualityFilter.addEventListener("change", () => {
  activeQuality = qualityFilter.value;
  updateFilterChips();
  renderMovies();
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeQuality = chip.dataset.quality;
    qualityFilter.value = activeQuality;
    updateFilterChips();
    renderMovies();
  });
});

closeModalButton.addEventListener("click", closeMovieModal);

movieModal.addEventListener("click", (event) => {
  if (event.target === movieModal) {
    closeMovieModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMovieModal();
  }
});

async function startFolderScan() {
  showToast("Choose a movie folder from your PC or external drive.");

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

    await scanDirectoryHandle(
      directoryHandle,
      scannedMovies,
      directoryHandle.name,
      directoryHandle.name
    );

    saveScannedMovies(scannedMovies);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      showToast("Folder scan could not be completed.");
    }
  }
}

async function scanDirectoryHandle(directoryHandle, scannedMovies, sourceName, currentPath) {
  for await (const entry of directoryHandle.values()) {
    const nextPath = `${currentPath}/${entry.name}`;

    if (entry.kind === "file") {
      const file = await entry.getFile();

      if (isMovieFile(file.name)) {
        const movie = await createMovieFromFile(file, nextPath, sourceName);
        scannedMovies.push(movie);
      }
    }

    if (entry.kind === "directory") {
      await scanDirectoryHandle(entry, scannedMovies, sourceName, nextPath);
    }
  }
}

async function handleFallbackFolderScan(event) {
  const files = Array.from(event.target.files);
  const movieFiles = files.filter((file) => isMovieFile(file.name));
  const scannedMovies = [];

  for (const file of movieFiles) {
    const path = file.webkitRelativePath || file.name;
    const sourceName = path.split("/")[0] || "Selected Folder";
    const movie = await createMovieFromFile(file, path, sourceName);

    scannedMovies.push(movie);
  }

  saveScannedMovies(scannedMovies);

  folderInput.value = "";
}

async function createMovieFromFile(file, path, sourceName) {
  const title = cleanMovieTitle(file.name);
  const extension = getExtension(file.name);
  const quality = detectQuality(file.name);
  const poster = await createVideoThumbnail(file);

  return {
    id: createId(),
    title,
    fileName: file.name,
    path,
    sourceName,
    extension,
    quality,
    sizeBytes: file.size,
    poster,
    scannedAt: new Date().toISOString()
  };
}

function saveScannedMovies(scannedMovies) {
  if (scannedMovies.length === 0) {
    showToast("No supported movie files found.");
    return;
  }

  const exactDuplicateKeys = new Set(movies.map((movie) => getExactDuplicateKey(movie)));
  const newMovies = [];
  let skippedDuplicates = 0;

  scannedMovies.forEach((movie) => {
    const duplicateKey = getExactDuplicateKey(movie);

    if (exactDuplicateKeys.has(duplicateKey)) {
      skippedDuplicates += 1;
      return;
    }

    exactDuplicateKeys.add(duplicateKey);
    newMovies.push(movie);
  });

  if (newMovies.length === 0) {
    showToast(`No new movies added. Skipped ${skippedDuplicates} duplicate file(s).`);
    return;
  }

  movies = [...movies, ...newMovies];
  selectedMovieId = newMovies[0].id;

  localStorage.setItem(SCAN_KEY, new Date().toISOString());
  saveMoviesToStorage();

  renderApp();

  if (skippedDuplicates > 0) {
    showToast(`Added ${newMovies.length} movie(s). Skipped ${skippedDuplicates} duplicate file(s).`);
  } else {
    showToast(`Added ${newMovies.length} movie(s) to your library.`);
  }
}

function renderApp() {
  renderStats();
  renderSources();
  renderHero();
  updateFilterChips();
  renderMovies();
}

function renderStats() {
  const totalBytes = movies.reduce((sum, movie) => sum + Number(movie.sizeBytes || 0), 0);
  const sources = getSources();
  const duplicateIds = getDuplicateMovieIds();
  const savedLastScan = localStorage.getItem(SCAN_KEY);

  movieCount.textContent = movies.length;
  storageTotal.textContent = formatBytes(totalBytes);
  folderCount.textContent = sources.length;
  duplicateCount.textContent = duplicateIds.size;
  lastScanText.textContent = `Last scan: ${savedLastScan ? formatDate(savedLastScan) : "Never"}`;

  if (movies.length === 0) {
    statusText.textContent = "No folders added yet.";
  } else {
    statusText.textContent = `${movies.length} movie file(s) saved locally.`;
  }
}

function renderSources() {
  const sources = getSources();

  sourceList.innerHTML = "";

  if (sources.length === 0) {
    sourceList.innerHTML = `<span>No folders added yet.</span>`;
    return;
  }

  sources.forEach((source) => {
    const sourceMovies = movies.filter((movie) => getSourceName(movie) === source);
    const totalBytes = sourceMovies.reduce((sum, movie) => sum + Number(movie.sizeBytes || 0), 0);

    const pill = document.createElement("span");
    pill.className = "source-pill";
    pill.textContent = `${source} • ${sourceMovies.length} • ${formatBytes(totalBytes)}`;

    sourceList.appendChild(pill);
  });
}

function renderHero() {
  const selectedMovie = getSelectedMovie();

  if (!selectedMovie) {
    heroTitle.textContent = "Your movies, one clean library.";
    heroDescription.textContent =
      "Add folders from your Windows PC or external HDDs. Cinema Library saves a local catalog, combines everything into one grid, and keeps your actual videos on your own drives.";

    heroPoster.innerHTML = `
      <span>LOCAL</span>
      <strong>Movie Catalog</strong>
    `;

    return;
  }

  heroTitle.textContent = selectedMovie.title || selectedMovie.fileName;
  heroDescription.textContent =
    `${selectedMovie.quality} • ${selectedMovie.extension} • ${formatBytes(selectedMovie.sizeBytes)} • ${getSourceName(selectedMovie)}`;

  heroPoster.innerHTML = `
    ${selectedMovie.poster ? `<img src="${selectedMovie.poster}" alt="${escapeHTML(selectedMovie.title)} thumbnail" />` : ""}
    <span>${escapeHTML(selectedMovie.quality)}</span>
    <strong>${escapeHTML(getPosterTitle(selectedMovie.title || selectedMovie.fileName, 42))}</strong>
  `;
}

function renderMovies() {
  let filteredMovies = [...movies];
  const searchTerm = searchInput.value.toLowerCase().trim();
  const sortValue = sortSelect.value;
  const duplicateIds = getDuplicateMovieIds();

  if (activeQuality !== "all") {
    filteredMovies = filteredMovies.filter((movie) => movie.quality === activeQuality);
  }

  if (searchTerm) {
    filteredMovies = filteredMovies.filter((movie) => {
      return `
        ${movie.title}
        ${movie.fileName}
        ${movie.path}
        ${getSourceName(movie)}
        ${movie.quality}
        ${movie.extension}
      `.toLowerCase().includes(searchTerm);
    });
  }

  filteredMovies = sortMovies(filteredMovies, sortValue);

  movieGrid.innerHTML = "";

  if (movies.length === 0) {
    emptyState.classList.remove("hidden");
    movieGrid.classList.add("hidden");
    resultCount.textContent = "No movies scanned yet.";
    return;
  }

  emptyState.classList.add("hidden");
  movieGrid.classList.remove("hidden");

  resultCount.textContent = `Showing ${filteredMovies.length} of ${movies.length} movie(s).`;

  if (filteredMovies.length === 0) {
    movieGrid.innerHTML = `
      <section class="empty-state">
        <div class="empty-card">
          <div class="empty-icon">🔎</div>
          <h3>No matching movies found.</h3>
          <p>Try changing your search, quality filter, or sort option.</p>
        </div>
      </section>
    `;
    return;
  }

  if (!filteredMovies.some((movie) => movie.id === selectedMovieId)) {
    selectedMovieId = filteredMovies[0].id;
  }

  filteredMovies.forEach((movie) => {
    const isDuplicate = duplicateIds.has(movie.id);

    const card = document.createElement("article");
    card.className = "movie-card";

    if (movie.id === selectedMovieId) {
      card.classList.add("active");
    }

    card.innerHTML = `
      <div class="movie-poster">
        ${movie.poster ? `<img src="${movie.poster}" alt="${escapeHTML(movie.title)} thumbnail" />` : ""}
        <span>${escapeHTML(movie.quality)}</span>
        <strong>${escapeHTML(getPosterTitle(movie.title || movie.fileName, 30))}</strong>
      </div>

      <div class="movie-info">
        <h3>${escapeHTML(movie.title || movie.fileName)}</h3>

        <div class="movie-meta">
          <span>${escapeHTML(movie.extension || "Unknown")}</span>
          <span>${formatBytes(movie.sizeBytes)}</span>
          ${isDuplicate ? `<span class="duplicate-chip">Duplicate?</span>` : ""}
        </div>

        <p class="movie-source">${escapeHTML(getSourceName(movie))}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      selectedMovieId = movie.id;
      renderHero();
      renderMovies();
      openMovieModal(movie.id);
    });

    movieGrid.appendChild(card);
  });
}

function openMovieModal(movieId) {
  const movie = movies.find((item) => item.id === movieId);
  const duplicateIds = getDuplicateMovieIds();

  if (!movie) {
    return;
  }

  selectedMovieId = movie.id;

  modalPoster.innerHTML = `
    ${movie.poster ? `<img src="${movie.poster}" alt="${escapeHTML(movie.title)} thumbnail" />` : ""}
    <span id="modalPosterQuality">${escapeHTML(movie.quality)}</span>
    <strong id="modalPosterTitle">${escapeHTML(getPosterTitle(movie.title || movie.fileName, 34))}</strong>
  `;

  modalTitle.textContent = movie.title || movie.fileName;
  modalQuality.textContent = movie.quality || "Unknown";
  modalType.textContent = movie.extension || "Unknown";
  modalSize.textContent = formatBytes(movie.sizeBytes);
  modalFileName.textContent = movie.fileName || "Unknown";
  modalSource.textContent = getSourceName(movie);
  modalPath.textContent = movie.path || "Unknown";
  modalScannedAt.textContent = formatDate(movie.scannedAt);

  if (duplicateIds.has(movie.id)) {
    modalDuplicateWarning.classList.remove("hidden");
  } else {
    modalDuplicateWarning.classList.add("hidden");
  }

  movieModal.classList.remove("hidden");
}

function closeMovieModal() {
  movieModal.classList.add("hidden");
}

function createVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const url = URL.createObjectURL(file);

    let finished = false;

    const finish = (posterData) => {
      if (finished) {
        return;
      }

      finished = true;
      URL.revokeObjectURL(url);
      resolve(posterData || "");
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const timeout = setTimeout(() => {
      finish("");
    }, 5000);

    video.addEventListener("loadedmetadata", () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const midPoint = duration > 2 ? duration / 2 : 0.5;

        video.currentTime = midPoint;
      } catch {
        clearTimeout(timeout);
        finish("");
      }
    });

    video.addEventListener("seeked", () => {
      try {
        clearTimeout(timeout);

        if (!video.videoWidth || !video.videoHeight) {
          finish("");
          return;
        }

        const posterWidth = 420;
        const posterHeight = 630;

        canvas.width = posterWidth;
        canvas.height = posterHeight;

        const context = canvas.getContext("2d");

        const videoRatio = video.videoWidth / video.videoHeight;
        const posterRatio = posterWidth / posterHeight;

        let sourceWidth = video.videoWidth;
        let sourceHeight = video.videoHeight;
        let sourceX = 0;
        let sourceY = 0;

        if (videoRatio > posterRatio) {
          sourceWidth = video.videoHeight * posterRatio;
          sourceX = (video.videoWidth - sourceWidth) / 2;
        } else {
          sourceHeight = video.videoWidth / posterRatio;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }

        context.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          posterWidth,
          posterHeight
        );

        finish(canvas.toDataURL("image/jpeg", 0.56));
      } catch (error) {
        console.warn("Thumbnail failed:", error);
        finish("");
      }
    });

    video.addEventListener("error", () => {
      clearTimeout(timeout);
      finish("");
    });
  });
}

function exportLibrary() {
  if (movies.length === 0) {
    showToast("Add movies before exporting.");
    return;
  }

  const exportData = movies.map((movie) => {
    return {
      title: movie.title,
      fileName: movie.fileName,
      path: movie.path,
      sourceName: getSourceName(movie),
      extension: movie.extension,
      quality: movie.quality,
      sizeBytes: movie.sizeBytes,
      scannedAt: movie.scannedAt
    };
  });

  const data = JSON.stringify(exportData, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cinema-library-export.json";
  link.click();

  URL.revokeObjectURL(url);

  showToast("Library exported.");
}

function clearLibrary() {
  const confirmed = confirm("Clear your saved Cinema Library catalog?");

  if (!confirmed) {
    return;
  }

  movies = [];
  selectedMovieId = null;
  activeQuality = "all";

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SCAN_KEY);

  searchInput.value = "";
  qualityFilter.value = "all";
  sortSelect.value = "newest";

  renderApp();
  closeMovieModal();
  showToast("Library cleared.");
}

function saveMoviesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  } catch {
    const metadataOnly = movies.map((movie) => {
      return {
        ...movie,
        poster: ""
      };
    });

    movies = metadataOnly;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
      showToast("Saved catalog metadata. Thumbnails were too large for browser storage.");
    } catch {
      showToast("Browser storage is full. Export your catalog before clearing space.");
    }
  }
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

function isMovieFile(fileName) {
  const lowerName = fileName.toLowerCase();

  return supportedExtensions.some((extension) => lowerName.endsWith(extension));
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
  const cleaned = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[._-]/g, " ")
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|bluray|brrip|webrip|web dl|web-dl|x264|x265|h264|h265|hevc|aac|dts|truehd|atmos|proper|remux|hdr|dv|dolby|vision)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fileName;
}

function sortMovies(movieList, sortValue) {
  const qualityRank = {
    "4K": 4,
    "1080p": 3,
    "720p": 2,
    SD: 1,
    Unknown: 0
  };

  if (sortValue === "name") {
    return movieList.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortValue === "newest") {
    return movieList.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
  }

  if (sortValue === "largest") {
    return movieList.sort((a, b) => Number(b.sizeBytes || 0) - Number(a.sizeBytes || 0));
  }

  if (sortValue === "quality") {
    return movieList.sort((a, b) => qualityRank[b.quality] - qualityRank[a.quality]);
  }

  if (sortValue === "source") {
    return movieList.sort((a, b) => getSourceName(a).localeCompare(getSourceName(b)));
  }

  return movieList;
}

function getSources() {
  const sources = movies.map((movie) => getSourceName(movie));

  return [...new Set(sources)].sort((a, b) => a.localeCompare(b));
}

function getSelectedMovie() {
  return movies.find((movie) => movie.id === selectedMovieId);
}

function getSourceName(movie) {
  return movie.sourceName || movie.folderName || "Unknown Folder";
}

function getExactDuplicateKey(movie) {
  return `${String(movie.fileName).toLowerCase()}-${movie.sizeBytes}`;
}

function getDuplicateMovieIds() {
  const groups = new Map();
  const duplicateIds = new Set();

  movies.forEach((movie) => {
    const key = normalizeTitle(movie.title || movie.fileName);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(movie);
  });

  groups.forEach((group) => {
    if (group.length > 1) {
      group.forEach((movie) => duplicateIds.add(movie.id));
    }
  });

  return duplicateIds;
}

function normalizeTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|sd|hdr|dv|remux)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function updateFilterChips() {
  filterChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.quality === activeQuality);
  });
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 GB";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index >= 3 ? 2 : 1)} ${units[index]}`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Never";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getPosterTitle(title, maxLength = 32) {
  if (!title) {
    return "Movie";
  }

  return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
