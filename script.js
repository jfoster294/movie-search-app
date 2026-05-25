const folderInput = document.getElementById("folderInput");
const fileInput = document.getElementById("fileInput");

const scanFolderButton = document.getElementById("scanFolderButton");
const scanFilesButton = document.getElementById("scanFilesButton");
const exportButton = document.getElementById("exportButton");
const clearButton = document.getElementById("clearButton");
const themeButton = document.getElementById("themeButton");

const libraryStatus = document.getElementById("libraryStatus");
const totalMovies = document.getElementById("totalMovies");
const totalSize = document.getElementById("totalSize");
const fourKMovies = document.getElementById("fourKMovies");
const driveCount = document.getElementById("driveCount");

const searchInput = document.getElementById("searchInput");
const qualityFilter = document.getElementById("qualityFilter");
const driveFilter = document.getElementById("driveFilter");
const sortSelect = document.getElementById("sortSelect");

const libraryTitle = document.getElementById("libraryTitle");
const lastScanText = document.getElementById("lastScanText");
const emptyState = document.getElementById("emptyState");
const movieGrid = document.getElementById("movieGrid");

const videoModal = document.getElementById("videoModal");
const videoTitle = document.getElementById("videoTitle");
const videoPlayer = document.getElementById("videoPlayer");
const closeVideoButton = document.getElementById("closeVideoButton");

const STORAGE_KEY = "cinemaLibraryData";
const THEME_KEY = "cinemaLibraryTheme";

const movieExtensions = [
  "mp4",
  "mkv",
  "avi",
  "mov",
  "m4v",
  "wmv",
  "webm",
  "flv",
  "ts",
  "m2ts"
];

let movies = [];
let sessionFileMap = new Map();

loadSavedTheme();
loadSavedLibrary();

scanFolderButton.addEventListener("click", () => {
  folderInput.click();
});

scanFilesButton.addEventListener("click", () => {
  fileInput.click();
});

folderInput.addEventListener("change", (event) => {
  scanFiles(event.target.files);
  folderInput.value = "";
});

fileInput.addEventListener("change", (event) => {
  scanFiles(event.target.files);
  fileInput.value = "";
});

searchInput.addEventListener("input", renderMovies);
qualityFilter.addEventListener("change", renderMovies);
driveFilter.addEventListener("change", renderMovies);
sortSelect.addEventListener("change", renderMovies);

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const theme = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, theme);
});

clearButton.addEventListener("click", () => {
  const confirmClear = confirm("Clear your saved Cinema Library metadata?");

  if (!confirmClear) {
    return;
  }

  movies = [];
  sessionFileMap.clear();
  localStorage.removeItem(STORAGE_KEY);
  updateDashboard();
});

exportButton.addEventListener("click", exportLibrary);

closeVideoButton.addEventListener("click", closeVideo);

videoModal.addEventListener("click", (event) => {
  if (event.target === videoModal) {
    closeVideo();
  }
});

function scanFiles(fileList) {
  const files = Array.from(fileList);

  if (files.length === 0) {
    return;
  }

  libraryStatus.textContent = "Scanning your selected movie files...";

  const movieFiles = files.filter((file) => {
    return isMovieFile(file.name);
  });

  if (movieFiles.length === 0) {
    libraryStatus.textContent = "No supported movie files found in that selection.";
    return;
  }

  const scannedMovies = movieFiles.map((file) => {
    const relativePath = file.webkitRelativePath || file.name;
    const id = createMovieId(file, relativePath);

    sessionFileMap.set(id, file);

    return {
      id: id,
      title: cleanMovieTitle(file.name),
      fileName: file.name,
      extension: getExtension(file.name).toUpperCase(),
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      quality: inferQuality(file.name),
      drive: getDriveLabel(relativePath),
      relativePath: relativePath,
      lastModified: file.lastModified,
      lastModifiedFormatted: formatDate(file.lastModified),
      scannedAt: new Date().toISOString()
    };
  });

  const movieMap = new Map();

  movies.forEach((movie) => {
    movieMap.set(movie.id, movie);
  });

  scannedMovies.forEach((movie) => {
    movieMap.set(movie.id, movie);
  });

  movies = Array.from(movieMap.values());

  saveLibrary();
  updateDashboard();

  libraryStatus.textContent = `Scan complete. Added/updated ${scannedMovies.length} real movie file(s).`;
}

function isMovieFile(fileName) {
  const extension = getExtension(fileName);
  return movieExtensions.includes(extension);
}

function getExtension(fileName) {
  const pieces = fileName.toLowerCase().split(".");
  return pieces.length > 1 ? pieces.pop() : "";
}

function createMovieId(file, relativePath) {
  return `${relativePath}-${file.size}-${file.lastModified}`;
}

function getDriveLabel(relativePath) {
  if (!relativePath || !relativePath.includes("/")) {
    return "Selected Files";
  }

  return relativePath.split("/")[0] || "Unknown Folder";
}

function cleanMovieTitle(fileName) {
  const extension = getExtension(fileName);
  let title = fileName;

  if (extension) {
    title = title.slice(0, -(extension.length + 1));
  }

  title = title
    .replace(/[._-]+/g, " ")
    .replace(/\b(2160p|1080p|720p|480p|4320p|8k|4k|uhd|hdr|dv|dolby|bluray|blu ray|web dl|webrip|brrip|x264|x265|h264|h265|hevc|aac|dts|truehd|atmos)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return title || fileName;
}

function inferQuality(fileName) {
  const lowerName = fileName.toLowerCase();

  if (
    lowerName.includes("4320p") ||
    lowerName.includes("8k")
  ) {
    return "8K";
  }

  if (
    lowerName.includes("2160p") ||
    lowerName.includes("4k") ||
    lowerName.includes("uhd")
  ) {
    return "4K";
  }

  if (lowerName.includes("1080p")) {
    return "1080p";
  }

  if (lowerName.includes("720p")) {
    return "720p";
  }

  if (
    lowerName.includes("480p") ||
    lowerName.includes("dvd") ||
    lowerName.includes("sd")
  ) {
    return "SD";
  }

  return "Unknown";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) {
    return "0 GB";
  }

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeUnitIndex = Math.min(unitIndex, units.length - 1);
  const value = bytes / Math.pow(1024, safeUnitIndex);

  return `${value.toFixed(value >= 100 ? 0 : 2)} ${units[safeUnitIndex]}`;
}

function formatDate(timeStamp) {
  if (!timeStamp) {
    return "Unknown";
  }

  return new Date(timeStamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function updateDashboard() {
  const totalBytes = movies.reduce((sum, movie) => sum + movie.size, 0);
  const fourKCount = movies.filter((movie) => movie.quality === "4K" || movie.quality === "8K").length;
  const drives = [...new Set(movies.map((movie) => movie.drive))];

  totalMovies.textContent = movies.length;
  totalSize.textContent = formatBytes(totalBytes);
  fourKMovies.textContent = fourKCount;
  driveCount.textContent = drives.length;

  libraryTitle.textContent = movies.length === 1 ? "1 movie loaded" : `${movies.length} movies loaded`;

  if (movies.length === 0) {
    lastScanText.textContent = "Last scan: never";
    libraryStatus.textContent = "No library scanned yet.";
  } else {
    const newestScan = movies
      .map((movie) => new Date(movie.scannedAt).getTime())
      .sort((a, b) => b - a)[0];

    lastScanText.textContent = `Last scan: ${new Date(newestScan).toLocaleString()}`;
  }

  updateDriveFilter(drives);
  renderMovies();
}

function updateDriveFilter(drives) {
  const currentValue = driveFilter.value;

  driveFilter.innerHTML = `<option value="all">All Drives</option>`;

  drives.sort().forEach((drive) => {
    const option = document.createElement("option");
    option.value = drive;
    option.textContent = drive;
    driveFilter.appendChild(option);
  });

  if (drives.includes(currentValue)) {
    driveFilter.value = currentValue;
  }
}

function getFilteredMovies() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedQuality = qualityFilter.value;
  const selectedDrive = driveFilter.value;

  let filteredMovies = movies.filter((movie) => {
    const searchableText = `
      ${movie.title}
      ${movie.fileName}
      ${movie.extension}
      ${movie.quality}
      ${movie.drive}
      ${movie.relativePath}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);
    const matchesQuality = selectedQuality === "all" || movie.quality === selectedQuality;
    const matchesDrive = selectedDrive === "all" || movie.drive === selectedDrive;

    return matchesSearch && matchesQuality && matchesDrive;
  });

  filteredMovies = sortMovies(filteredMovies);

  return filteredMovies;
}

function sortMovies(movieList) {
  const sortedMovies = [...movieList];

  const qualityRank = {
    "8K": 6,
    "4K": 5,
    "1080p": 4,
    "720p": 3,
    "SD": 2,
    "Unknown": 1
  };

  if (sortSelect.value === "nameAsc") {
    sortedMovies.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortSelect.value === "nameDesc") {
    sortedMovies.sort((a, b) => b.title.localeCompare(a.title));
  }

  if (sortSelect.value === "sizeDesc") {
    sortedMovies.sort((a, b) => b.size - a.size);
  }

  if (sortSelect.value === "sizeAsc") {
    sortedMovies.sort((a, b) => a.size - b.size);
  }

  if (sortSelect.value === "quality") {
    sortedMovies.sort((a, b) => {
      return (qualityRank[b.quality] || 0) - (qualityRank[a.quality] || 0);
    });
  }

  if (sortSelect.value === "newest") {
    sortedMovies.sort((a, b) => b.lastModified - a.lastModified);
  }

  return sortedMovies;
}

function renderMovies() {
  const filteredMovies = getFilteredMovies();

  movieGrid.innerHTML = "";

  if (movies.length === 0) {
    emptyState.style.display = "block";
    movieGrid.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  movieGrid.style.display = "grid";

  if (filteredMovies.length === 0) {
    movieGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h2>No movies match your filters.</h2>
        <p>Try searching a different title, quality, drive, or file type.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredMovies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";

    const canPlay = sessionFileMap.has(movie.id);

    card.innerHTML = `
      <div class="poster">
        <span class="quality-pill">${movie.quality}</span>
        <span class="poster-letter">${getPosterLetter(movie.title)}</span>
      </div>

      <div class="movie-content">
        <h3 class="movie-title">${escapeHTML(movie.title)}</h3>

        <div class="movie-meta">
          <div class="meta-row">
            <span>Size</span>
            <small>${movie.sizeFormatted}</small>
          </div>

          <div class="meta-row">
            <span>Type</span>
            <small>${movie.extension}</small>
          </div>

          <div class="meta-row">
            <span>Drive</span>
            <small>${escapeHTML(movie.drive)}</small>
          </div>

          <div class="meta-row">
            <span>Modified</span>
            <small>${movie.lastModifiedFormatted}</small>
          </div>
        </div>

        <p class="path-text">${escapeHTML(movie.relativePath)}</p>

        <button class="play-button" type="button" ${canPlay ? "" : "disabled"}>
          ${canPlay ? "Play Preview" : "Rescan to Play"}
        </button>
      </div>
    `;

    const playButton = card.querySelector(".play-button");

    playButton.addEventListener("click", () => {
      playMovie(movie);
    });

    fragment.appendChild(card);
  });

  movieGrid.appendChild(fragment);
}

function getPosterLetter(title) {
  return title.trim().charAt(0).toUpperCase() || "C";
}

function playMovie(movie) {
  const file = sessionFileMap.get(movie.id);

  if (!file) {
    alert("For browser security, you need to rescan this file before playback.");
    return;
  }

  const videoURL = URL.createObjectURL(file);

  videoTitle.textContent = movie.title;
  videoPlayer.src = videoURL;
  videoModal.classList.remove("hidden");
  videoPlayer.play();
}

function closeVideo() {
  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  videoPlayer.load();
  videoModal.classList.add("hidden");
}

function saveLibrary() {
  const saveData = {
    movies: movies,
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
}

function loadSavedLibrary() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    updateDashboard();
    return;
  }

  try {
    const parsedData = JSON.parse(savedData);
    movies = parsedData.movies || [];
    updateDashboard();

    if (movies.length > 0) {
      libraryStatus.textContent = "Saved library metadata loaded. Rescan folders to enable playback.";
    }
  } catch (error) {
    console.error("Could not load saved library:", error);
    movies = [];
    updateDashboard();
  }
}

function exportLibrary() {
  if (movies.length === 0) {
    alert("Scan a movie folder before exporting.");
    return;
  }

  const exportData = {
    app: "Cinema Library",
    exportedAt: new Date().toISOString(),
    totalMovies: movies.length,
    totalSize: formatBytes(movies.reduce((sum, movie) => sum + movie.size, 0)),
    movies: movies
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cinema-library-export.json";
  link.click();

  URL.revokeObjectURL(url);
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "light") {
    document.body.classList.add("light");
  }
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
