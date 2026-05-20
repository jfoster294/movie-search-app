const API_KEY = "PASTE_YOUR_OMDB_API_KEY_HERE";

const searchForm = document.getElementById("searchForm");
const movieInput = document.getElementById("movieInput");
const typeSelect = document.getElementById("typeSelect");
const themeSelect = document.getElementById("themeSelect");
const message = document.getElementById("message");

const resultsSection = document.getElementById("resultsSection");
const resultCount = document.getElementById("resultCount");
const moviesGrid = document.getElementById("moviesGrid");

const detailsSection = document.getElementById("detailsSection");
const movieDetails = document.getElementById("movieDetails");
const closeDetailsButton = document.getElementById("closeDetailsButton");

const themeClasses = [
  "theme-cinematic",
  "theme-arcade",
  "theme-noir",
  "theme-premiere",
  "theme-streaming",
  "theme-ticket",
  "theme-cyber"
];

themeSelect.addEventListener("change", function () {
  applyTheme(themeSelect.value);
});

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const searchText = movieInput.value.trim();
  const selectedType = typeSelect.value;

  if (searchText === "") {
    showMessage("Please enter a movie title.");
    return;
  }

  searchMovies(searchText, selectedType);
});

closeDetailsButton.addEventListener("click", function () {
  detailsSection.classList.add("hidden");
  movieDetails.innerHTML = "";
});

function applyTheme(theme) {
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem("selectedMovieTheme", theme);
}

async function searchMovies(searchText, selectedType) {
  if (API_KEY === "PASTE_YOUR_OMDB_API_KEY_HERE") {
    showMessage("Add your OMDb API key in script.js first.");
    return;
  }

  try {
    showMessage("Searching movies...");
    moviesGrid.innerHTML = "";
    movieDetails.innerHTML = "";
    detailsSection.classList.add("hidden");
    resultsSection.classList.add("hidden");

    let url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(searchText)}`;

    if (selectedType !== "") {
      url += `&type=${selectedType}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === "False") {
      showMessage(data.Error || "No movies found.");
      return;
    }

    displayMovies(data.Search);

    localStorage.setItem("lastMovieSearch", searchText);
    localStorage.setItem("lastMovieType", selectedType);

    showMessage("");
  } catch (error) {
    showMessage("Movie data could not be loaded.");
  }
}

function displayMovies(movies) {
  moviesGrid.innerHTML = "";
  resultCount.textContent = `${movies.length} results`;

  movies.forEach(function (movie) {
    const card = document.createElement("article");
    card.className = "movie-card";

    const posterWrap = document.createElement("div");
    posterWrap.className = "poster-wrap";

    if (movie.Poster && movie.Poster !== "N/A") {
      const image = document.createElement("img");
      image.src = movie.Poster;
      image.alt = `${movie.Title} poster`;
      posterWrap.appendChild(image);
    } else {
      const noPoster = document.createElement("p");
      noPoster.className = "no-poster";
      noPoster.textContent = "No poster available";
      posterWrap.appendChild(noPoster);
    }

    const content = document.createElement("div");
    content.className = "movie-card-content";

    const title = document.createElement("h3");
    title.textContent = movie.Title;

    const meta = document.createElement("p");
    meta.className = "movie-meta";
    meta.textContent = `${movie.Year} • ${capitalizeText(movie.Type)}`;

    content.appendChild(title);
    content.appendChild(meta);

    card.appendChild(posterWrap);
    card.appendChild(content);

    card.addEventListener("click", function () {
      getMovieDetails(movie.imdbID);
    });

    moviesGrid.appendChild(card);
  });

  resultsSection.classList.remove("hidden");
}

async function getMovieDetails(imdbID) {
  try {
    showMessage("Loading movie details...");

    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}&plot=full`;

    const response = await fetch(url);
    const movie = await response.json();

    if (movie.Response === "False") {
      showMessage(movie.Error || "Movie details not found.");
      return;
    }

    displayMovieDetails(movie);
    showMessage("");
  } catch (error) {
    showMessage("Movie details could not be loaded.");
  }
}

function displayMovieDetails(movie) {
  movieDetails.innerHTML = "";

  const poster = document.createElement("div");
  poster.className = "details-poster";

  if (movie.Poster && movie.Poster !== "N/A") {
    const image = document.createElement("img");
    image.src = movie.Poster;
    image.alt = `${movie.Title} poster`;
    poster.appendChild(image);
  } else {
    const noPoster = document.createElement("p");
    noPoster.className = "no-poster";
    noPoster.textContent = "No poster available";
    poster.appendChild(noPoster);
  }

  const content = document.createElement("div");
  content.className = "details-content";

  const title = document.createElement("h3");
  title.textContent = movie.Title;

  const meta = document.createElement("p");
  meta.className = "details-meta";
  meta.textContent = `${movie.Year} • ${movie.Rated} • ${movie.Runtime} • ${movie.Genre}`;

  const plot = document.createElement("p");
  plot.className = "plot";
  plot.textContent = movie.Plot;

  const infoGrid = document.createElement("div");
  infoGrid.className = "info-grid";

  addInfoItem(infoGrid, "IMDb Rating", movie.imdbRating);
  addInfoItem(infoGrid, "Director", movie.Director);
  addInfoItem(infoGrid, "Actors", movie.Actors);
  addInfoItem(infoGrid, "Released", movie.Released);
  addInfoItem(infoGrid, "Language", movie.Language);
  addInfoItem(infoGrid, "Awards", movie.Awards);

  content.appendChild(title);
  content.appendChild(meta);
  content.appendChild(plot);
  content.appendChild(infoGrid);

  movieDetails.appendChild(poster);
  movieDetails.appendChild(content);

  detailsSection.classList.remove("hidden");
  detailsSection.scrollIntoView({ behavior: "smooth" });
}

function addInfoItem(container, label, value) {
  const item = document.createElement("div");
  item.className = "info-item";

  const strong = document.createElement("strong");
  strong.textContent = label;

  const text = document.createElement("span");
  text.textContent = value && value !== "N/A" ? value : "Not available";

  item.appendChild(strong);
  item.appendChild(text);

  container.appendChild(item);
}

function capitalizeText(text) {
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showMessage(text) {
  message.textContent = text;
}

const savedTheme = localStorage.getItem("selectedMovieTheme") || "cinematic";
themeSelect.value = savedTheme;
applyTheme(savedTheme);

const lastMovieSearch = localStorage.getItem("lastMovieSearch");
const lastMovieType = localStorage.getItem("lastMovieType") || "";

if (lastMovieSearch) {
  movieInput.value = lastMovieSearch;
  typeSelect.value = lastMovieType;
  searchMovies(lastMovieSearch, lastMovieType);
}
