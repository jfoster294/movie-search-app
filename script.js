const STORAGE_KEY = "cinemaLibraryMovies";
const ACTIVITY_KEY = "cinemaLibraryActivity";

const driveCapacities = {
  "NAS Drive 1": 8192,
  "NAS Drive 2": 8192,
  "External SSD": 2048,
  "Archive Drive": 20480
};

const sampleMovies = [
  {
    title: "Interstellar",
    year: 2014,
    genre: "Sci-Fi, Adventure, Drama",
    runtime: "2h 49m",
    suggestedSize: 82
  },
  {
    title: "Dune: Part Two",
    year: 2024,
    genre: "Sci-Fi, Adventure",
    runtime: "2h 46m",
    suggestedSize: 78
  },
  {
    title: "The Dark Knight",
    year: 2008,
    genre: "Action, Crime, Drama",
    runtime: "2h 32m",
    suggestedSize: 64
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    genre: "Sci-Fi, Thriller",
    runtime: "2h 44m",
    suggestedSize: 76
  },
  {
    title: "The Matrix",
    year: 1999,
    genre: "Sci-Fi, Action",
    runtime: "2h 16m",
    suggestedSize: 48
  },
  {
    title: "Oppenheimer",
    year: 2023,
    genre: "Biography, Drama, History",
    runtime: "3h 0m",
    suggestedSize: 88
  },
  {
    title: "John Wick Chapter 4",
    year: 2023,
    genre: "Action, Thriller",
    runtime: "2h 49m",
    suggestedSize: 70
  },
  {
    title: "Top Gun Maverick",
    year: 2022,
    genre: "Action, Drama",
    runtime: "2h 10m",
    suggestedSize: 58
  },
  {
    title: "Jurassic Park",
    year: 1993,
    genre: "Adventure, Sci-Fi",
    runtime: "2h 7m",
    suggestedSize: 42
  },
  {
    title: "Back to the Future",
    year: 1985,
    genre: "Adventure, Comedy, Sci-Fi",
    runtime: "1h 56m",
    suggestedSize: 36
  }
];

const starterMovies = [
  createMovie("Interstellar", 2014, "Sci-Fi, Adventure, Drama", "2h 49m", "4K", 82, "NAS Drive 1", "Watched", true),
  createMovie("Dune: Part Two", 2024, "Sci-Fi, Adventure", "2h 46m", "4K", 78, "NAS Drive 1", "Watching", false),
  createMovie("The Dark Knight", 2008, "Action, Crime, Drama", "2h 32m", "4K", 64, "NAS Drive 2", "Watched", true),
  createMovie("Blade Runner 2049", 2017, "Sci-Fi, Thriller", "2h 44m", "4K", 76, "Archive Drive", "Not Watched", false),
  createMovie("The Matrix", 1999, "Sci-Fi, Action", "2h 16m", "1080p", 32, "External SSD", "Watched", true),
  createMovie("Oppenheimer", 2023, "Biography, Drama, History", "3h 0m", "4K", 88, "NAS Drive 2", "Not Watched", false)
];

const sampleMovieSelect = document.getElementById("sampleMovieSelect");
const movieForm = document.getElementById("movieForm");
const movieTitleInput = document.getElementById("movieTitleInput");
const movieYearInput = document.getElementById("movieYearInput");
const movieGenreInput = document.getElementById("movieGenreInput");
const movieRuntimeInput = document.getElementById("movieRuntimeInput");
const movieQualitySelect = document.getElementById("movieQualitySelect");
const movieSizeInput = document.getElementById("movieSizeInput");
const movieDriveSelect = document.getElementById("movieDriveSelect");
const movieStatusSelect = document.getElementById("movieStatusSelect");
const movieFavoriteInput = document.getElementById("movieFavoriteInput");
const movieNotesInput = document.getElementById("movieNotesInput");
const formMessage = document.getElementById("formMessage");

const globalSearchInput = document.getElementById("globalSearchInput");
const driveFilter = document.getElementById("driveFilter");
const qualityFilter = document.getElementById("qualityFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");
const clearFiltersButton = document.getElementById("clearFiltersButton");
const resetDemoButton = document.getElementById("resetDemoButton");

const totalMoviesStat = document.getElementById("totalMoviesStat");
const totalStorageStat = document.getElementById("totalStorageStat");
const highQualityStat = document.getElementById("highQualityStat");
const watchedStat = document.getElementById("watchedStat");
const sidebarStorageUsed = document.getElementById("sidebarStorageUsed");
const sidebarStorageBar = document.getElementById("sidebarStorageBar");
const sidebarStoragePercent = document.getElementById("sidebarStoragePercent");

const storageGrid = document.getElementById("storageGrid");
const movieGrid = document.getElementById("movieGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const activityList = document.getElementById("activityList");

const detailModal = document.getElementById("detailModal");
const modalContent = document.getElementById("modalContent");
const closeModalButton = document.getElementById("closeModalButton");
const toast = document.getElementById("toast");

let movies = loadMovies();
let activity = loadActivity();

populateSampleMovies();
populateFilterOptions();
renderApp();

sampleMovieSelect.addEventListener("change", function () {
  const selectedTitle = sampleMovieSelect.value;
  const selectedMovie = sampleMovies.find(function (movie) {
    return movie.title === selectedTitle;
  });

  if (!selectedMovie) {
    return;
  }

  movieTitleInput.value = selectedMovie.title;
  movieYearInput.value = selectedMovie.year;
  movieGenreInput.value = selectedMovie.genre;
  movieRuntimeInput.value = selectedMovie.runtime;
  movieSizeInput.value = selectedMovie.suggestedSize;
});

movieForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = movieTitleInput.value.trim();
  const year = Number(movieYearInput.value) || "";
  const genre = movieGenreInput.value.trim() || "Uncategorized";
  const runtime = movieRuntimeInput.value.trim() || "Not set";
  const quality = movieQualitySelect.value;
  const fileSize = Number(movieSizeInput.value);
  const drive = movieDriveSelect.value;
  const status = movieStatusSelect.value;
  const favorite = movieFavoriteInput.checked;
  const notes = movieNotesInput.value.trim();

  if (!title) {
    formMessage.textContent = "Please add a movie title.";
    return;
  }

  if (!fileSize || fileSize <= 0) {
    formMessage.textContent = "Please add a file size greater than 0.";
    return;
  }

  const movie = {
    id: Date.now().toString(),
    title,
    year,
    genre,
    runtime,
    quality,
    fileSize,
    drive,
    status,
    favorite,
    notes,
    addedAt: new Date().toISOString()
  };

  movies.unshift(movie);
  saveMovies();

  addActivity(`Added ${movie.title}`, `${movie.quality} • ${movie.drive}`);

  movieForm.reset();
  movieQualitySelect.value = "4K";
  movieDriveSelect.value = "NAS Drive 1";
  movieStatusSelect.value = "Not Watched";

  formMessage.textContent = "Movie added to your cinema library.";
  showToast(`${movie.title} added to library`);

  populateFilterOptions();
  renderApp();
});

globalSearchInput.addEventListener("input", renderMovies);
driveFilter.addEventListener("change", renderMovies);
qualityFilter.addEventListener("change", renderMovies);
statusFilter.addEventListener("change", renderMovies);
sortFilter.addEventListener("change", renderMovies);

clearFiltersButton.addEventListener("click", function () {
  globalSearchInput.value = "";
  driveFilter.value = "All";
  qualityFilter.value = "All";
  statusFilter.value = "All";
  sortFilter.value = "Newest";
  renderMovies();
});

resetDemoButton.addEventListener("click", function () {
  const confirmReset = confirm("Reset the demo library? This will replace your current saved movies.");

  if (!confirmReset) {
    return;
  }

  movies = starterMovies.map(function (movie) {
    return {
      ...movie,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString()
    };
  });

  activity = [
    createActivity("Demo library restored", "Starter cinema collection loaded")
  ];

  saveMovies();
  saveActivity();
  populateFilterOptions();
  renderApp();
  showToast("Demo library restored");
});

movieGrid.addEventListener("click", function (event) {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const movieId = button.dataset.id;
  const action = button.dataset.action;

  if (!movieId || !action) {
    return;
  }

  const movie = movies.find(function (item) {
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
    saveMovies();
    addActivity(movie.favorite ? `Favorited ${movie.title}` : `Removed favorite from ${movie.title}`, movie.quality);
    renderApp();
  }

  if (action === "watched") {
    movie.status = "Watched";
    saveMovies();
    addActivity(`Marked ${movie.title} as watched`, movie.drive);
    renderApp();
  }

  if (action === "remove") {
    const confirmRemove = confirm(`Remove ${movie.title} from your library?`);

    if (!confirmRemove) {
      return;
    }

    movies = movies.filter(function (item) {
      return item.id !== movieId;
    });

    saveMovies();
    addActivity(`Removed ${movie.title}`, "Deleted from library");
    populateFilterOptions();
    renderApp();
    showToast(`${movie.title} removed`);
  }
});

closeModalButton.addEventListener("click", closeModal);

detailModal.addEventListener("click", function (event) {
  if (event.target === detailModal) {
    closeModal();
  }
});

function createMovie(title, year, genre, runtime, quality, fileSize, drive, status, favorite) {
  return {
    id: Date.now().toString() + Math.random().toString(),
    title,
    year,
    genre,
    runtime,
    quality,
    fileSize,
    drive,
    status,
    favorite,
    notes: "",
    addedAt: new Date().toISOString()
  };
}

function loadMovies() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

  if (!saved || saved.length === 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starterMovies));
    return starterMovies;
  }

  return saved;
}

function saveMovies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

function loadActivity() {
  const saved = JSON.parse(localStorage.getItem(ACTIVITY_KEY));

  if (!saved || saved.length === 0) {
    const startingActivity = [
      createActivity("Cinema Library opened", "Ready to manage movie storage"),
      createActivity("Starter movies loaded", "Demo collection available")
    ];

    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(startingActivity));
    return startingActivity;
  }

  return saved;
}

function createActivity(message, detail) {
  return {
    id: Date.now().toString() + Math.random().toString(),
    message,
    detail,
    time: new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

function addActivity(message, detail) {
  activity.unshift(createActivity(message, detail));
  activity = activity.slice(0, 6);
  saveActivity();
}

function saveActivity() {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
}

function populateSampleMovies() {
  sampleMovies.forEach(function (movie) {
    const option = document.createElement("option");
    option.value = movie.title;
    option.textContent = `${movie.title} (${movie.year})`;
    sampleMovieSelect.appendChild(option);
  });
}

function populateFilterOptions() {
  populateSelect(driveFilter, ["All", ...Object.keys(driveCapacities)]);
  populateSelect(qualityFilter, ["All", "720p", "1080p", "4K", "8K"]);
  populateSelect(statusFilter, ["All", "Not Watched", "Watching", "Watched"]);
}

function populateSelect(selectElement, options) {
  const currentValue = selectElement.value;
  selectElement.innerHTML = "";

  options.forEach(function (optionValue) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    selectElement.appendChild(option);
  });

  if (options.includes(currentValue)) {
    selectElement.value = currentValue;
  }
}

function renderApp() {
  renderStats();
  renderStorage();
  renderMovies();
  renderActivity();
}

function renderStats() {
  const totalMovies = movies.length;
  const totalStorage = getTotalStorageUsed();
  const totalCapacity = getTotalCapacity();
  const percentUsed = totalCapacity > 0 ? Math.min((totalStorage / totalCapacity) * 100, 100) : 0;
  const highQuality = movies.filter(function (movie) {
    return movie.quality === "4K" || movie.quality === "8K";
  }).length;
  const watched = movies.filter(function (movie) {
    return movie.status === "Watched";
  }).length;

  totalMoviesStat.textContent = totalMovies;
  totalStorageStat.textContent = formatStorage(totalStorage);
  highQualityStat.textContent = highQuality;
  watchedStat.textContent = watched;

  sidebarStorageUsed.textContent = formatStorage(totalStorage);
  sidebarStorageBar.style.width = `${percentUsed}%`;
  sidebarStoragePercent.textContent = `${percentUsed.toFixed(1)}% of total capacity`;
}

function renderStorage() {
  storageGrid.innerHTML = "";

  Object.entries(driveCapacities).forEach(function ([driveName, capacity]) {
    const used = getDriveUsed(driveName);
    const percent = Math.min((used / capacity) * 100, 100);
    const movieCount = movies.filter(function (movie) {
      return movie.drive === driveName;
    }).length;

    const card = document.createElement("article");
    card.className = "drive-card";

    card.innerHTML = `
      <div class="drive-top">
        <div>
          <h3>${escapeHTML(driveName)}</h3>
          <span>${movieCount} movies stored</span>
        </div>
        <span>${percent.toFixed(1)}%</span>
      </div>

      <strong>${formatStorage(used)} / ${formatStorage(capacity)}</strong>

      <div class="progress-bar">
        <span style="width: ${percent}%"></span>
      </div>

      <small>${formatStorage(capacity - used)} free</small>
    `;

    storageGrid.appendChild(card);
  });
}

function renderMovies() {
  const searchTerm = globalSearchInput.value.trim().toLowerCase();
  const selectedDrive = driveFilter.value;
  const selectedQuality = qualityFilter.value;
  const selectedStatus = statusFilter.value;
  const selectedSort = sortFilter.value;

  let filteredMovies = movies.filter(function (movie) {
    const matchesSearch =
      movie.title.toLowerCase().includes(searchTerm) ||
      movie.genre.toLowerCase().includes(searchTerm) ||
      movie.drive.toLowerCase().includes(searchTerm);

    const matchesDrive = selectedDrive === "All" || movie.drive === selectedDrive;
    const matchesQuality = selectedQuality === "All" || movie.quality === selectedQuality;
    const matchesStatus = selectedStatus === "All" || movie.status === selectedStatus;

    return matchesSearch && matchesDrive && matchesQuality && matchesStatus;
  });

  if (selectedSort === "Title") {
    filteredMovies.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
  }

  if (selectedSort === "Size") {
    filteredMovies.sort(function (a, b) {
      return b.fileSize - a.fileSize;
    });
  }

  if (selectedSort === "Newest") {
    filteredMovies.sort(function (a, b) {
      return new Date(b.addedAt) - new Date(a.addedAt);
    });
  }

  movieGrid.innerHTML = "";
  resultCount.textContent = `${filteredMovies.length} movies showing`;

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

        <h3>
          ${escapeHTML(movie.title)}
          ${movie.favorite ? '<span class="favorite">★</span>' : ""}
        </h3>

        <p class="movie-meta">
          ${movie.year || "Year not set"} • ${escapeHTML(movie.runtime)}<br />
          ${escapeHTML(movie.genre)}
        </p>

        <div class="movie-details">
          <div class="movie-detail-row">
            <span>Storage</span>
            <strong>${escapeHTML(movie.drive)}</strong>
          </div>

          <div class="movie-detail-row">
            <span>File Size</span>
            <strong>${formatStorage(movie.fileSize)}</strong>
          </div>
        </div>

        <div class="movie-actions">
          <button class="movie-action" data-action="details" data-id="${movie.id}" type="button">Details</button>
          <button class="movie-action" data-action="favorite" data-id="${movie.id}" type="button">${movie.favorite ? "Unfavorite" : "Favorite"}</button>
          <button class="movie-action" data-action="watched" data-id="${movie.id}" type="button">Watched</button>
          <button class="danger-action" data-action="remove" data-id="${movie.id}" type="button">Remove</button>
        </div>
      </div>
    `;

    movieGrid.appendChild(card);
  });
}

function renderActivity() {
  activityList.innerHTML = "";

  if (activity.length === 0) {
    activityList.innerHTML = `<p class="section-note">No activity yet.</p>`;
    return;
  }

  activity.forEach(function (item) {
    const row = document.createElement("div");
    row.className = "activity-item";

    row.innerHTML = `
      <div>
        <strong>${escapeHTML(item.message)}</strong>
        <p>${escapeHTML(item.detail)}</p>
      </div>
      <span>${escapeHTML(item.time)}</span>
    `;

    activityList.appendChild(row);
  });
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
          ${movie.year || "Year not set"} • ${escapeHTML(movie.runtime)} • ${escapeHTML(movie.genre)}
        </p>

        <div class="modal-list">
          <div><span>Quality</span><strong>${escapeHTML(movie.quality)}</strong></div>
          <div><span>File Size</span><strong>${formatStorage(movie.fileSize)}</strong></div>
          <div><span>Storage Drive</span><strong>${escapeHTML(movie.drive)}</strong></div>
          <div><span>Watch Status</span><strong>${escapeHTML(movie.status)}</strong></div>
          <div><span>Favorite</span><strong>${movie.favorite ? "Yes" : "No"}</strong></div>
          <div><span>Added</span><strong>${new Date(movie.addedAt).toLocaleDateString()}</strong></div>
        </div>

        <p>
          <strong>Notes:</strong><br />
          ${movie.notes ? escapeHTML(movie.notes) : "No notes added."}
        </p>
      </div>
    </div>
  `;

  detailModal.classList.remove("hidden");
}

function closeModal() {
  detailModal.classList.add("hidden");
}

function getDriveUsed(driveName) {
  return movies
    .filter(function (movie) {
      return movie.drive === driveName;
    })
    .reduce(function (total, movie) {
      return total + Number(movie.fileSize);
    }, 0);
}

function getTotalStorageUsed() {
  return movies.reduce(function (total, movie) {
    return total + Number(movie.fileSize);
  }, 0);
}

function getTotalCapacity() {
  return Object.values(driveCapacities).reduce(function (total, capacity) {
    return total + capacity;
  }, 0);
}

function formatStorage(gb) {
  if (gb >= 1024) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }

  return `${Math.round(gb)} GB`;
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
