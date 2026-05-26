const scanButton = document.getElementById("scanButton");
const clearButton = document.getElementById("clearButton");
const searchInput = document.getElementById("searchInput");
const qualityFilter = document.getElementById("qualityFilter");

const movieGrid = document.getElementById("movieGrid");
const statusText = document.getElementById("statusText");

const movieCount = document.getElementById("movieCount");
const totalSize = document.getElementById("totalSize");
const fourKCount = document.getElementById("fourKCount");
const hdCount = document.getElementById("hdCount");

const STORAGE_KEY = "cinemaLibraryMovies";

const videoExtensions = [
  "mp4",
  "mkv",
  "mov",
  "avi",
  "wmv",
  "m4v",
  "webm"
];

let movies = loadSavedMovies();

renderLibrary();

scanButton.addEventListener("click", scanMovieFolder);
clearButton.addEventListener("click", clearLibrary);
searchInput.addEventListener("input", renderLibrary);
qualityFilter.addEventListener("change", renderLibrary);

async function scanMovieFolder() {
  if (!window.showDirectoryPicker) {
    statusText.textContent =
      "Folder scanning works best in Chrome or Edge on desktop.";
    return;
  }

  try {
    statusText.textContent = "Choose your movie folder...";

    const directoryHandle = await window.showDirectoryPicker();
    const scannedMovies = [];

    await scanDirectory(directoryHandle, scannedMovies, directoryHandle.name);

    movies = scannedMovies.sort((a, b) => a.title.localeCompare(b.title));

    saveMovies();
    renderLibrary();

    statusText.textContent =
      movies.length > 0
        ? `Found ${movies.length} movie file${movies.length === 1 ? "" : "s"}.`
        : "No movie files found in that folder.";
  } catch (error) {
    if (error.name === "AbortError") {
      statusText.textContent = "Folder scan cancelled.";
    } else {
      statusText.textContent = "Something went wrong while scanning.";
      console.error(error);
    }
  }
}

async function scanDirectory(directoryHandle, movieList, currentPath) {
  for await (const entry of directoryHandle.values()) {
    const entryPath = `${currentPath}/${entry.name}`;

    if (entry.kind === "directory") {
      await scanDirectory(entry, movieList, entryPath);
    }

    if (entry.kind === "file" && isVideoFile(entry.name)) {
      const file = await entry.getFile();

      movieList.push({
        id: crypto.randomUUID(),
        title: cleanMovieTitle(entry.name),
        fileName: entry.name,
        extension: getExtension(entry.name).toUpperCase(),
        size: file.size,
        sizeLabel: formatBytes(file.size),
        quality: guessQuality(entry.name),
        path: entryPath
      });
    }
  }
}

function isVideoFile(fileName) {
  const extension = getExtension(fileName);
  return videoExtensions.includes(extension);
}

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function cleanMovieTitle(fileName) {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

  return nameWithoutExtension
    .replace(/[._-]/g, " ")
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|hdr|bluray|brrip|webrip|web dl|x264|x265|h264|h265)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessQuality(fileName) {
  const lowerName = fileName.toLowerCase();

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

  return "SD";
}

function renderLibrary() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedQuality = qualityFilter.value;

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchTerm);
    const matchesQuality =
      selectedQuality === "all" || movie.quality === selectedQuality;

    return matchesSearch && matchesQuality;
  });

  updateStats();

  if (movies.length === 0) {
    movieGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-poster">🎬</div>
        <h3>No movies scanned yet</h3>
        <p>Click “Scan Movie Folder” and choose the folder where your movie files are stored.</p>
      </div>
    `;
    statusText.textContent = "Scan a folder to begin.";
    return;
  }

  if (filteredMovies.length === 0) {
    movieGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-poster">🔍</div>
        <h3>No matches found</h3>
        <p>Try a different search or quality filter.</p>
      </div>
    `;
    statusText.textContent = "No movies match your current search.";
    return;
  }

  movieGrid.innerHTML = filteredMovies
    .map((movie) => createMovieCard(movie))
    .join("");

  statusText.textContent = `Showing ${filteredMovies.length} of ${movies.length} movies.`;
}

function createMovieCard(movie) {
  return `
    <article class="movie-card">
      <div class="poster">
        <div class="poster-title">${escapeHTML(movie.title)}</div>
      </div>

      <div class="movie-info">
        <h3>${escapeHTML(movie.title)}</h3>

        <div class="movie-meta">
          <span class="badge">${movie.quality}</span>
          <span class="badge">${movie.extension}</span>
          <span class="badge">${movie.sizeLabel}</span>
        </div>

        <p class="path">${escapeHTML(movie.path)}</p>
      </div>
    </article>
  `;
}

function updateStats() {
  movieCount.textContent = movies.length;

  const totalBytes = movies.reduce((sum, movie) => sum + movie.size, 0);
  totalSize.textContent = formatBytes(totalBytes);

  fourKCount.textContent = movies.filter((movie) => movie.quality === "4K").length;

  hdCount.textContent = movies.filter((movie) => {
    return movie.quality === "1080p" || movie.quality === "720p";
  }).length;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 GB";

  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, index);

  return `${size.toFixed(1)} ${units[index]}`;
}

function saveMovies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function loadSavedMovies() {
  const savedMovies = localStorage.getItem(STORAGE_KEY);

  if (!savedMovies) {
    return [];
  }

  try {
    return JSON.parse(savedMovies);
  } catch {
    return [];
  }
}

function clearLibrary() {
  localStorage.removeItem(STORAGE_KEY);
  movies = [];
  searchInput.value = "";
  qualityFilter.value = "all";
  renderLibrary();
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
