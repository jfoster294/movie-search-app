const STORAGE_KEY = "cinemaLibraryMovies";
const SCAN_KEY = "cinemaLibraryLastScan";

const supportedExtensions = [".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"];

let movies = loadMovies();
let selectedMovieId = movies[0]?.id || null;
let activeQuality = "all";

const addFolderButton = document.getElementById("addFolderButton");
const exportLibraryButton = document.getElementById("exportLibraryButton");
const clearLibraryButton = document.getElementById("clearLibraryButton");
const folderInput = document.getElementById("folderInput");

const searchInput = document.getElementById("searchInput");
const qualityFilter = document.getElementById("qualityFilter");
const sortSelect = document.getElementById("sortSelect");

const navItems = document.querySelectorAll(".nav-item");

const navAllCount = document.getElementById("navAllCount");
const nav4kCount = document.getElementById("nav4kCount");
const nav1080Count = document.getElementById("nav1080Count");
const nav720Count = document.getElementById("nav720Count");
const navSdCount = document.getElementById("navSdCount");
const navUnknownCount = document.getElementById("navUnknownCount");

const sourceCount = document.getElementById("sourceCount");
const sourceList = document.getElementById("sourceList");
const storageTotal = document.getElementById("storageTotal");
const duplicateCount = document.getElementById("duplicateCount");

const movieCount = document.getElementById("movieCount");
const movieStorage = document.getElementById("movieStorage");
const folderCount = document.getElementById("folderCount");
const lastScan = document.getElementById("lastScan");
const statusText = document.getElementById("statusText");

const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const movieGrid = document.getElementById("movieGrid");

const detailsEmpty = document.getElementById("detailsEmpty");
const detailsContent = document.getElementById("detailsContent");
const detailsPoster = document.getElementById("detailsPoster");
const detailsQualityBadge = document.getElementById("detailsQualityBadge");
const detailsPosterTitle = document.getElementById("detailsPosterTitle");
const detailsTitle = document.getElementById("detailsTitle");
const detailsQuality = document.getElementById("detailsQuality");
const detailsType = document.getElementById("detailsType");
const detailsSize = document.getElementById("detailsSize");
const detailsFileName = document.getElementById("detailsFileName");
const detailsSource = document.getElementById("detailsSource");
const detailsPath = document.getElementById("detailsPath");
const detailsScannedAt = document.getElementById("detailsScannedAt");
const detailsDuplicateWarning = document.getElementById("detailsDuplicateWarning");

const toast = document.getElementById("toast");

renderApp();

addFolderButton.addEventListener("click", startFolderScan);
exportLibraryButton.addEventListener("click", exportLibrary);
clearLibraryButton.addEventListener("click", clearLibrary);

folderInput.addEventListener("change", handleFallbackFolderScan);

searchInput.addEventListener("input", renderMovies);
qualityFilter.addEventListener("change", () => {
  activeQuality = qualityFilter.value;
  updateActiveNav();
  renderMovies();
});

sortSelect.addEventListener("change", renderMovies);

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    activeQuality = item.dataset.quality;
    qualityFilter.value = activeQuality;
    updateActiveNav();
    renderMovies();
  });
});

async function startFolderScan() {
  showToast("Choose a movie folder from your PC or drive.");

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

    await scanDirectoryHandle(directoryHandle, scannedMovies, directoryHandle.name, directoryHandle.name);

    saveScannedMovies(scannedMovies);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      showToast("Folder scan could not be completed.");
    }
  }
}

async function scanDirectoryHandle(directoryHandle, scannedMovies, rootFolderName, currentPath) {
  for await (const entry of directoryHandle.values()) {
    const nextPath = `${currentPath}/${entry.name}`;

    if (entry.kind === "file") {
      const file = await entry.getFile();

      if (isMovieFile(file.name)) {
        const movie = await createMovieFromFile(file, nextPath, rootFolderName);
        scannedMovies.push(movie);
      }
    }

    if (entry.kind === "directory") {
      await scanDirectoryHandle(entry, scannedMovies, rootFolderName, nextPath);
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

  const existingKeys = new Set(movies.map((movie) => getExactDuplicateKey(movie)));
  const newMovies = [];
  let skippedDuplicates = 0;

  scannedMovies.forEach((movie) => {
    const duplicateKey = getExactDuplicateKey(movie);

    if (existingKeys.has(duplicateKey)) {
      skippedDuplicates += 1;
      return;
    }

    existingKeys.add(duplicateKey);
    newMovies.push(movie);
  });

  if (newMovies.length === 0) {
    showToast(`No new movies added. Skipped ${skippedDuplicates} duplicate file(s).`);
    return;
  }

  movies = [...movies, ...newMovies];
  selectedMovieId = newMovies[0]?.id || selectedMovieId;

  localStorage.setItem(SCAN_KEY, new Date().toISOString());
  saveMoviesToStorage();

  renderApp();

  if (skippedDuplicates > 0) {
    showToast(`Added ${newMovies.length} movie(s). Skipped ${skippedDuplicates} duplicate file(s).`);
  } else {
    showToast(`Added ${newMovies.length} movie(s) to your library.`);
  }
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
  showToast("Library cleared.");
}

function renderApp() {
  renderStats();
  updateActiveNav();
  renderSourceList();
  renderMovies();
  renderDetails();
}

function renderStats() {
  const totalBytes = movies.reduce((sum, movie) => sum + movie.sizeBytes, 0);
  const qualityCounts = getQualityCounts();
  const sources = getSources();
  const possibleDuplicates = getDuplicateMovieIds();

  navAllCount.textContent = movies.length;
  nav4kCount.textContent = qualityCounts["4K"] || 0;
  nav1080Count.textContent = qualityCounts["1080p"] || 0;
  nav720Count.textContent = qualityCounts["720p"] || 0;
  navSdCount.textContent = qualityCounts.SD || 0;
  navUnknownCount.textContent = qualityCounts.Unknown || 0;

  movieCount.textContent = movies.length;
  movieStorage.textContent = formatBytes(totalBytes);
  folderCount.textContent = sources.length;
  sourceCount.textContent = sources.length;

  storageTotal.textContent = formatBytes(totalBytes);
  duplicateCount.textContent = possibleDuplicates.size;

  const savedLastScan = localStorage.getItem(SCAN_KEY);
  lastScan.textContent = savedLastScan ? formatDate(savedLastScan) : "Never";

  if (movies.length === 0) {
    statusText.textContent = "Add a movie folder to build your library.";
  } else {
    statusText.textContent = `${movies.length} movie file(s) saved from ${sources.length} folder(s). Your catalog will stay saved in this browser unless you clear site data.`;
  }
}

function renderSourceList() {
  const sources = getSources();

  sourceList.innerHTML = "";

  if (sources.length === 0) {
    sourceList.innerHTML = `<p class="muted">No folders added yet.</p>`;
    return;
  }

  sources.forEach((source) => {
    const sourceMovies = movies.filter((movie) => movie.sourceName === source);
    const totalBytes = sourceMovies.reduce((sum, movie) => sum + movie.sizeBytes, 0);

    const sourceItem = document.createElement("div");
    sourceItem.className = "source-item";

    sourceItem.innerHTML = `
      <strong>${escapeHTML(source)}</strong>
      <span>${sourceMovies.length} movie(s) • ${formatBytes(totalBytes)}</span>
    `;

    sourceList.appendChild(sourceItem);
  });
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
        ${movie.sourceName}
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
    renderDetails();
    return;
  }

  emptyState.classList.add("hidden");
  movieGrid.classList.remove("hidden");

  resultCount.textContent = `Showing ${filteredMovies.length} of ${movies.length} movie(s).`;

  if (filteredMovies.length === 0) {
    movieGrid.innerHTML = `
      <section class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>No matching movies found.</h3>
        <p>Try changing the search, quality filter, or sort option.</p>
      </section>
    `;
    selectedMovieId = null;
    renderDetails();
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
        <span class="quality-badge">${escapeHTML(movie.quality)}</span>
        <strong class="poster-title">${escapeHTML(getPosterTitle(movie.title || movie.fileName))}</strong>
      </div>

      <div class="movie-info">
        <h3>${escapeHTML(movie.title || movie.fileName)}</h3>

        <div class="movie-meta">
          <span>${escapeHTML(movie.extension)}</span>
          <span>${formatBytes(movie.sizeBytes)}</span>
          ${isDuplicate ? `<span class="duplicate-chip">Duplicate?</span>` : ""}
        </div>

        <p class="movie-source">${escapeHTML(movie.sourceName || "Unknown Folder")}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      selectedMovieId = movie.id;
      renderMovies();
      renderDetails();
    });

    movieGrid.appendChild(card);
  });

  renderDetails();
}

function renderDetails() {
  const selectedMovie = getSelectedMovie();
  const duplicateIds = getDuplicateMovieIds();

  if (!selectedMovie) {
    detailsEmpty.classList.remove("hidden");
    detailsContent.classList.add("hidden");
    return;
  }

  detailsEmpty.classList.add("hidden");
  detailsContent.classList.remove("hidden");

  renderPoster(detailsPoster, selectedMovie);

  detailsQualityBadge.textContent = selectedMovie.quality;
  detailsPosterTitle.textContent = getPosterTitle(selectedMovie.title || selectedMovie.fileName);
  detailsTitle.textContent = selectedMovie.title || selectedMovie.fileName;
  detailsQuality.textContent = selectedMovie.quality;
  detailsType.textContent = selectedMovie.extension;
  detailsSize.textContent = formatBytes(selectedMovie.sizeBytes);
  detailsFileName.textContent = selectedMovie.fileName;
  detailsSource.textContent = selectedMovie.sourceName || "Unknown Folder";
  detailsPath.textContent = selectedMovie.path || "Unknown Path";
  detailsScannedAt.textContent = formatDate(selectedMovie.scannedAt);

  if (duplicateIds.has(selectedMovie.id)) {
    detailsDuplicateWarning.classList.remove("hidden");
  } else {
    detailsDuplicateWarning.classList.add("hidden");
  }
}

function renderPoster(container, movie) {
  container.innerHTML = `
    ${movie.poster ? `<img src="${movie.poster}" alt="${escapeHTML(movie.title)} thumbnail" />` : ""}
    <span>${escapeHTML(movie.quality)}</span>
    <strong>${escapeHTML(getPosterTitle(movie.title || movie.fileName))}</strong>
  `;
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
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const middleTime = duration > 2 ? duration / 2 : 0.5;

      video.currentTime = middleTime;
    });

    video.addEventListener("seeked", () => {
      try {
        clearTimeout(timeout);

        if (!video.videoWidth || !video.videoHeight) {
          finish("");
          return;
        }

        const posterWidth = 360;
        const posterHeight = 540;

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

        const posterData = canvas.toDataURL("image/jpeg", 0.56);

        finish(posterData);
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
      sourceName: movie.sourceName,
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

function saveMoviesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
  } catch (error) {
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

function getSelectedMovie() {
  return movies.find((movie) => movie.id === selectedMovieId);
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
    return movieList.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  if (sortValue === "quality") {
    return movieList.sort((a, b) => qualityRank[b.quality] - qualityRank[a.quality]);
  }

  if (sortValue === "source") {
    return movieList.sort((a, b) => {
      return (a.sourceName || "").localeCompare(b.sourceName || "");
    });
  }

  return movieList;
}

function getQualityCounts() {
  return movies.reduce((counts, movie) => {
    counts[movie.quality] = (counts[movie.quality] || 0) + 1;
    return counts;
  }, {});
}

function getSources() {
  const sources = movies.map((movie) => movie.sourceName || "Unknown Folder");

  return [...new Set(sources)].sort((a, b) => a.localeCompare(b));
}

function getExactDuplicateKey(movie) {
  return `${String(movie.fileName).toLowerCase()}-${movie.sizeBytes}`;
}

function getDuplicateMovieIds() {
  const titleGroups = new Map();
  const duplicateIds = new Set();

  movies.forEach((movie) => {
    const titleKey = normalizeTitle(movie.title || movie.fileName);

    if (!titleGroups.has(titleKey)) {
      titleGroups.set(titleKey, []);
    }

    titleGroups.get(titleKey).push(movie);
  });

  titleGroups.forEach((group) => {
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

function updateActiveNav() {
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.quality === activeQuality);
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

function getPosterTitle(title) {
  if (!title) {
    return "Movie";
  }

  return title.length > 32 ? `${title.slice(0, 32)}...` : title;
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
