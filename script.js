const STORAGE_KEY = "cinemaLibraryMovies";
const SCAN_KEY = "cinemaLibraryLastScan";

const supportedExtensions = [".mp4", ".mkv", ".mov", ".avi", ".webm", ".m4v"];

let movies = loadMovies();
let selectedMovieId = movies[0]?.id || null;

const scanFolderButton = document.getElementById("scanFolderButton");
const heroScanButton = document.getElementById("heroScanButton");
const emptyScanButton = document.getElementById("emptyScanButton");
const clearLibraryButton = document.getElementById("clearLibraryButton");
const exportLibraryButton = document.getElementById("exportLibraryButton");
const folderInput = document.getElementById("folderInput");

const searchInput = document.getElementById("searchInput");
const qualityFilter = document.getElementById("qualityFilter");
const sortSelect = document.getElementById("sortSelect");

const movieCount = document.getElementById("movieCount");
const totalStorage = document.getElementById("totalStorage");
const highestQuality = document.getElementById("highestQuality");
const statusMovieCount = document.getElementById("statusMovieCount");
const statusStorage = document.getElementById("statusStorage");
const statusQuality = document.getElementById("statusQuality");
const serverStatus = document.getElementById("serverStatus");

const heroPoster = document.getElementById("heroPoster");
const heroQuality = document.getElementById("heroQuality");
const heroPosterTitle = document.getElementById("heroPosterTitle");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const heroDetailsButton = document.getElementById("heroDetailsButton");

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
const detailsFolder = document.getElementById("detailsFolder");
const detailsPath = document.getElementById("detailsPath");
const openModalButton = document.getElementById("openModalButton");

const movieModal = document.getElementById("movieModal");
const closeModalButton = document.getElementById("closeModalButton");
const modalTitle = document.getElementById("modalTitle");
const modalQuality = document.getElementById("modalQuality");
const modalSize = document.getElementById("modalSize");
const modalType = document.getElementById("modalType");
const modalFolder = document.getElementById("modalFolder");
const modalFileName = document.getElementById("modalFileName");
const modalPath = document.getElementById("modalPath");

const toast = document.getElementById("toast");

renderApp();

scanFolderButton.addEventListener("click", startScan);
heroScanButton.addEventListener("click", startScan);
emptyScanButton.addEventListener("click", startScan);

folderInput.addEventListener("change", handleFallbackFolderScan);

clearLibraryButton.addEventListener("click", () => {
  const confirmed = confirm("Clear your saved Cinema Library scan?");

  if (!confirmed) {
    return;
  }

  movies = [];
  selectedMovieId = null;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SCAN_KEY);

  renderApp();
  showToast("Library cleared.");
});

exportLibraryButton.addEventListener("click", exportLibrary);

searchInput.addEventListener("input", renderMovies);
qualityFilter.addEventListener("change", renderMovies);
sortSelect.addEventListener("change", renderMovies);

heroDetailsButton.addEventListener("click", openSelectedMovieModal);
openModalButton.addEventListener("click", openSelectedMovieModal);

closeModalButton.addEventListener("click", () => {
  movieModal.classList.add("hidden");
});

movieModal.addEventListener("click", (event) => {
  if (event.target === movieModal) {
    movieModal.classList.add("hidden");
  }
});

async function startScan() {
  showToast("Scanning movie folder...");

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

    await saveScannedMovies(scannedMovies);
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
        const movie = await createMovieFromFile(file, currentPath, basePath);
        scannedMovies.push(movie);
      }
    }

    if (entry.kind === "directory") {
      await scanDirectoryHandle(entry, scannedMovies, currentPath);
    }
  }
}

async function handleFallbackFolderScan(event) {
  const files = Array.from(event.target.files);

  const movieFiles = files.filter((file) => isMovieFile(file.name));
  const scannedMovies = [];

  for (const file of movieFiles) {
    const path = file.webkitRelativePath || file.name;
    const folderName = path.split("/")[0] || "Selected Folder";
    const movie = await createMovieFromFile(file, path, folderName);

    scannedMovies.push(movie);
  }

  await saveScannedMovies(scannedMovies);

  folderInput.value = "";
}

async function saveScannedMovies(scannedMovies) {
  if (scannedMovies.length === 0) {
    showToast("No supported movie files found.");
    return;
  }

  movies = scannedMovies;
  selectedMovieId = movies[0]?.id || null;

  localStorage.setItem(SCAN_KEY, new Date().toISOString());
  saveMoviesToStorage();

  renderApp();
  showToast(`${scannedMovies.length} movie file(s) scanned.`);
}

async function createMovieFromFile(file, path, folderName) {
  const title = cleanMovieTitle(file.name);
  const extension = getExtension(file.name);
  const quality = detectQuality(file.name);
  const poster = await createVideoThumbnail(file);

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${file.name}-${Date.now()}-${Math.random()}`,
    title,
    fileName: file.name,
    path,
    folderName,
    extension,
    quality,
    sizeBytes: file.size,
    poster,
    scannedAt: new Date().toISOString()
  };
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
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|bluray|brrip|webrip|web dl|x264|x265|h264|h265|hevc|aac|dts|proper|remux)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fileName;
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
    }, 4500);

    video.addEventListener("loadedmetadata", () => {
      const seekTime = Math.min(2, Math.max(0.1, video.duration / 5 || 0.1));
      video.currentTime = seekTime;
    });

    video.addEventListener("seeked", () => {
      try {
        clearTimeout(timeout);

        const posterWidth = 360;
        const posterHeight = 540;

        canvas.width = posterWidth;
        canvas.height = posterHeight;

        const context = canvas.getContext("2d");

        const videoRatio = video.videoWidth / video.videoHeight;
        const posterRatio = posterWidth / posterHeight;

        let drawWidth = video.videoWidth;
        let drawHeight = video.videoHeight;
        let sourceX = 0;
        let sourceY = 0;

        if (videoRatio > posterRatio) {
          drawWidth = video.videoHeight * posterRatio;
          sourceX = (video.videoWidth - drawWidth) / 2;
        } else {
          drawHeight = video.videoWidth / posterRatio;
          sourceY = (video.videoHeight - drawHeight) / 2;
        }

        context.drawImage(
          video,
          sourceX,
          sourceY,
          drawWidth,
          drawHeight,
          0,
          0,
          posterWidth,
          posterHeight
        );

        const posterData = canvas.toDataURL("image/jpeg", 0.62);
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

function renderApp() {
  renderStats();
  renderMovies();
  renderDetails();
  renderHero();
}

function renderStats() {
  const totalBytes = movies.reduce((sum, movie) => sum + movie.sizeBytes, 0);
  const bestQuality = getHighestQuality();

  movieCount.textContent = movies.length;
  totalStorage.textContent = formatBytes(totalBytes);
  highestQuality.textContent = bestQuality;

  statusMovieCount.textContent = movies.length;
  statusStorage.textContent = formatBytes(totalBytes);
  statusQuality.textContent = bestQuality;

  serverStatus.textContent = movies.length > 0
    ? "All systems online"
    : "No folder scanned";
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
    filteredMovies = filteredMovies.filter((movie) => movie.quality === selectedQuality);
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
      <section class="empty-state">
        <div class="empty-icon">🔎</div>
        <h3>No matching movies found.</h3>
        <p>Try clearing the search or changing your quality filter.</p>
      </section>
    `;
    return;
  }

  if (!filteredMovies.some((movie) => movie.id === selectedMovieId)) {
    selectedMovieId = filteredMovies[0].id;
  }

  filteredMovies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";

    if (movie.id === selectedMovieId) {
      card.classList.add("active");
    }

    card.innerHTML = `
      <div class="movie-poster ${movie.poster ? "" : "fallback-poster"}">
        ${movie.poster ? `<img src="${movie.poster}" alt="${escapeHTML(movie.title)} thumbnail" />` : ""}
        <span class="quality-badge">${escapeHTML(movie.quality)}</span>
        <strong class="poster-title">${escapeHTML(getPosterTitle(movie.title || movie.fileName))}</strong>
      </div>

      <div class="movie-info">
        <h3>${escapeHTML(movie.title || movie.fileName)}</h3>

        <div class="movie-tags">
          <span>${escapeHTML(movie.extension)}</span>
          <span>${formatBytes(movie.sizeBytes)}</span>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      selectedMovieId = movie.id;
      renderMovies();
      renderDetails();
      renderHero();
    });

    movieGrid.appendChild(card);
  });
}

function renderDetails() {
  const selectedMovie = getSelectedMovie();

  if (!selectedMovie) {
    detailsEmpty.classList.remove("hidden");
    detailsContent.classList.add("hidden");
    return;
  }

  detailsEmpty.classList.add("hidden");
  detailsContent.classList.remove("hidden");

  renderPoster(detailsPoster, selectedMovie);

  detailsQualityBadge.textContent = selectedMovie.quality;
  detailsPosterTitle.textContent = getPosterTitle(selectedMovie.title);
  detailsTitle.textContent = selectedMovie.title || selectedMovie.fileName;
  detailsQuality.textContent = selectedMovie.quality;
  detailsType.textContent = selectedMovie.extension;
  detailsSize.textContent = formatBytes(selectedMovie.sizeBytes);
  detailsFileName.textContent = selectedMovie.fileName;
  detailsFolder.textContent = selectedMovie.folderName;
  detailsPath.textContent = selectedMovie.path;
}

function renderHero() {
  const selectedMovie = getSelectedMovie();

  if (!selectedMovie) {
    heroPoster.className = "hero-poster fallback-poster";
    heroPoster.innerHTML = `
      <span id="heroQuality">LOCAL</span>
      <strong id="heroPosterTitle">SCAN YOUR MOVIE FOLDER</strong>
    `;

    heroTitle.textContent = "Build your local cinema library.";
    heroDescription.textContent =
      "Scan a folder from your computer or drive. Cinema Library will detect your real movie files, estimate quality, calculate storage, and create retro-styled thumbnails when possible.";

    return;
  }

  renderPoster(heroPoster, selectedMovie);

  heroTitle.textContent = selectedMovie.title || selectedMovie.fileName;
  heroDescription.textContent =
    `${selectedMovie.quality} • ${selectedMovie.extension} • ${formatBytes(selectedMovie.sizeBytes)} • ${selectedMovie.folderName}`;
}

function renderPoster(container, movie) {
  container.className = container.className.includes("hero-poster")
    ? `hero-poster ${movie.poster ? "" : "fallback-poster"}`
    : `details-poster ${movie.poster ? "" : "fallback-poster"}`;

  container.innerHTML = `
    ${movie.poster ? `<img src="${movie.poster}" alt="${escapeHTML(movie.title)} thumbnail" />` : ""}
    <span>${escapeHTML(movie.quality)}</span>
    <strong>${escapeHTML(getPosterTitle(movie.title || movie.fileName))}</strong>
  `;
}

function openSelectedMovieModal() {
  const selectedMovie = getSelectedMovie();

  if (!selectedMovie) {
    showToast("Select a movie first.");
    return;
  }

  modalTitle.textContent = selectedMovie.title || selectedMovie.fileName;
  modalQuality.textContent = selectedMovie.quality;
  modalSize.textContent = formatBytes(selectedMovie.sizeBytes);
  modalType.textContent = selectedMovie.extension;
  modalFolder.textContent = selectedMovie.folderName;
  modalFileName.textContent = selectedMovie.fileName;
  modalPath.textContent = selectedMovie.path;

  movieModal.classList.remove("hidden");
}

function getSelectedMovie() {
  return movies.find((movie) => movie.id === selectedMovieId);
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
    return movieList.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
  }

  if (sortValue === "largest") {
    return movieList.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  if (sortValue === "quality") {
    return movieList.sort((a, b) => qualityRank[b.quality] - qualityRank[a.quality]);
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

function exportLibrary() {
  if (movies.length === 0) {
    showToast("Scan movies before exporting.");
    return;
  }

  const exportData = movies.map((movie) => {
    return {
      title: movie.title,
      fileName: movie.fileName,
      path: movie.path,
      folderName: movie.folderName,
      extension: movie.extension,
      quality: movie.quality,
      sizeBytes: movie.sizeBytes
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
    const smallerMovies = movies.map((movie) => {
      return {
        ...movie,
        poster: ""
      };
    });

    movies = smallerMovies;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));

    showToast("Saved metadata only. Thumbnails were too large for browser storage.");
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

function formatBytes(bytes) {
  if (!bytes) {
    return "0 GB";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index >= 3 ? 2 : 1)} ${units[index]}`;
}

function getPosterTitle(title) {
  if (!title) {
    return "Movie";
  }

  return title.length > 28 ? `${title.slice(0, 28)}...` : title;
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
