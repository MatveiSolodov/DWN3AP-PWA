if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("sw.js")
      .then(function (registration) {
        console.log("El registro del service worker fue exitoso ", registration);
      })
      .catch(function (err) {
        console.log("El registro del service worker falló: ", err);
      });
  });
}

function updateConnectionStatus() {
  const statusIndicator = document.getElementById('connectionStatus');
  if (navigator.onLine) {
    statusIndicator.className = 'connection-status online';
    statusIndicator.innerHTML = '<i class="bi bi-wifi"></i> Online';
  } else {
    statusIndicator.className = 'connection-status offline';
    statusIndicator.innerHTML = '<i class="bi bi-wifi-off"></i> Offline';
  }
}

function requestNotificationPermission() {
  if ("Notification" in window && "serviceWorker" in navigator) {
    if (Notification.permission === "default") {
      Notification.requestPermission().then(function (permission) {
        if (permission === "granted") {
          showNotification("¡Bienvenido!", {
            body: "Thanks for allowing notifications! We'll keep you updated on new shows.",
            icon: "icons/android-chrome-192x192.png",
            tag: "welcome"
          });
        }
      });
    }
  }
}

function showNotification(title, options) {
  if (Notification.permission === "granted") {
    navigator.serviceWorker.ready.then(function(registration) {
      if (registration) {
        registration.showNotification(title, options);
      }
    });
  }
}

function initInstallPrompt() {
  let delayPrompt;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    delayPrompt = e;
    installBtn.style.display = 'block';
  });

  installBtn.addEventListener('click', async () => {
    if (delayPrompt) {
      delayPrompt.prompt();
      const { outcome } = await delayPrompt.userChoice;
      if (outcome === 'accepted') {
        showNotification("App Instalada", {
          body: "Thank you for installing our PWA!",
          icon: "icons/android-chrome-192x192.png"
        });
      }
      delayPrompt = null;
      installBtn.style.display = 'none';
    }
  });
}
function shareShow(showData) {
  if (navigator.share) {
    navigator.share({
      title: showData.name,
      text: `Check out this amazing show: ${showData.name}`,
      url: `${window.location.origin}/show.html?id=${showData.id}`
    });
  } else {
    const shareUrl = `${window.location.origin}/show.html?id=${showData.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showNotification("Enlace copiado", {
        body: "The link has been copied to the clipboard",
        icon: "icons/android-chrome-192x192.png"
      });
    });
  }
}

function saveFavorite(showId) {
  let favorites = JSON.parse(localStorage.getItem('favoriteShows') || '[]');
  if (!favorites.includes(showId)) {
    favorites.push(showId);
    localStorage.setItem('favoriteShows', JSON.stringify(favorites));
    showNotification("Agregado a Favoritos", {
      body: "The show has been added to your favorites",
      icon: "icons/android-chrome-192x192.png"
    });
  }
}

function removeFavorite(showId) {
  let favorites = JSON.parse(localStorage.getItem('favoriteShows') || '[]');
  favorites = favorites.filter(id => id !== showId);
  localStorage.setItem('favoriteShows', JSON.stringify(favorites));
}

function isFavorite(showId) {
  const favorites = JSON.parse(localStorage.getItem('favoriteShows') || '[]');
  return favorites.includes(showId);
}

window.addEventListener("DOMContentLoaded", function () {
  const showsContainer = document.getElementById("showsList");
  const select = document.getElementById("showCount");
  const searchBox = document.getElementById("searchInput");
  const genreWrapper = document.getElementById("genreFilter");
  const crewList = document.getElementById("actors");

  updateConnectionStatus();
  initInstallPrompt();

  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  function shortDescription(html, maxLength) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  let currentGenre = null;
  let allShows = [];

  function renderGenrePills(genres) {
    genreWrapper.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "genre-pill active";
    allBtn.textContent = "All";
    allBtn.addEventListener("click", () => {
      currentGenre = null;
      updateGenreActive("All");
      renderShows(Number(select.value));
    });
    genreWrapper.appendChild(allBtn);

    genres.forEach((genre) => {
      const btn = document.createElement("button");
      btn.className = "genre-pill";
      btn.textContent = genre;
      btn.addEventListener("click", () => {
        currentGenre = genre;
        updateGenreActive(genre);
        renderShows(undefined);
      });
      genreWrapper.appendChild(btn);
    });
  }

  function updateGenreActive(activeText) {
    document.querySelectorAll(".genre-pill").forEach((btn) => {
      btn.classList.toggle("active", btn.textContent === activeText);
    });
  }

  function renderShows(limit = 8, search = "") {
    let showsData = allShows.slice();

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      showsData = showsData.filter((show) =>
        show.name.toLowerCase().includes(query)
      );
    }

    if (currentGenre) {
      const normalizedGenre = currentGenre.trim().toLowerCase();
      showsData = showsData.filter((show) =>
        show.genres.some((g) => g.trim().toLowerCase() === normalizedGenre)
      );
    }

    if (!search.trim()) {
      showsData = shuffleArray(showsData).slice(0, limit);
    }

    let htmlShows = "";

    for (const show of showsData) {
      const summaryShort = shortDescription(show.summary, 60);
      const favoriteIcon = isFavorite(show.id) ? 'bi-heart-fill text-danger' : 'bi-heart';

      htmlShows += `
        <div class="col">            
            <div class="card w-300 h-auto shadow-sm product-card">                
                <div class="overflow-hidden position-relative"
                    style="height: 200px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa;">
                    <img src="${show.image?.medium || "fallback.jpg"}" class="card-img-top" alt="${show.name}">
                    <button class="btn btn-sm btn-light position-absolute top-0 end-0 m-2 favorite-btn" 
                            onclick="toggleFavorite(${show.id}, this)">
                        <i class="bi ${favoriteIcon}"></i>
                    </button>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${show.name}</h5>                    
                    <p class="card-text text-muted small mb-0">Rating: ${show.rating.average || 'N/A'}</p>
                    <a href="https://www.imdb.com/title/${show.externals.imdb}" target="_blank">IMDb</a>
                    <div class="d-flex justify-content-between align-items-center mt-2 mb-2">
                        <span class="fw-bold text-primary">${show.genres.join(", ")}</span>
                        <div class="text-warning">
                            <i class="bi bi-star-fill"></i>
                            <i class="bi bi-star-fill"></i>
                            <i class="bi bi-star-fill"></i>
                            <i class="bi bi-star-fill"></i>
                            <i class="bi bi-star-half"></i>
                        </div>
                    </div>
                    <p class="card-text small text-muted">${summaryShort}</p>
                </div>
                <div class="card-footer bg-white d-flex justify-content-between">
                    <a href="show.html?id=${show.id}" class="btn btn-sm btn-outline-primary">See More</a>
                    <button class="btn btn-sm btn-outline-success share-btn" 
                            onclick="shareShow({id: ${show.id}, name: '${show.name}'})">
                        <i class="bi bi-share"></i> Share
                    </button>
                </div>
            </div>
        </div>
      `;
    }
    showsContainer.innerHTML = htmlShows;
  }

  window.toggleFavorite = function(showId, button) {
    if (isFavorite(showId)) {
      removeFavorite(showId);
      button.innerHTML = '<i class="bi bi-heart"></i>';
    } else {
      saveFavorite(showId);
      button.innerHTML = '<i class="bi bi-heart-fill text-danger"></i>';
    }
  };

  window.shareShow = shareShow;

  fetch("https://api.tvmaze.com/shows")
    .then((response) => response.json())
    .then((showsData) => {
      allShows = showsData;

      const genresList = new Set();
      for (const show of showsData) {
        show.genres.forEach((genre) => {
          genresList.add(genre);
        });
      }
      const genres = Array.from(genresList);

      renderGenrePills(genres);
      renderShows(Number(select.value));
    })
    .catch((error) => {
      console.error('Error fetching shows:', error);
      showsContainer.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-warning">
            <h4>Offline Mode</h4>
            <p>Shows can't be loaded. Please check your internet connection.</p>
          </div>
        </div>
      `;
    });

  let crew = [];

  function renderCrew(limit = 4) {
    let actorsShuffle = shuffleArray(crew.slice());
    let actors = actorsShuffle.slice(0, limit);

    let htmlActors = "";

    for (const actor of actors) {
      htmlActors += `
        <div class="col">            
            <div class="card w-300 h-auto shadow-sm product-card">                
                <div class="overflow-hidden"
                    style="height: 200px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa;">
                    <img src="${actor.image?.medium || 'fallback.jpg'}" class="card-img-top" alt="${actor.name}">
                </div>
                <div class="card-body">
                    <h5 class="card-title">${actor.name}</h5>                    
                    <p class="card-text text-muted small mb-0">Date of Birth: ${actor.birthday || "N/A"}</p>
                    <p class="card-text">${actor.country?.name || "Unknown"}</p>
                </div>
            </div>
        </div>
      `;
    }
    crewList.innerHTML = htmlActors;
  }

  fetch("https://api.tvmaze.com/people")
    .then((response) => response.json())
    .then((peoplesData) => {
      crew = peoplesData;
      renderCrew(8);
    })
    .catch((error) => {
      console.error('Error fetching actors:', error);
    });

  fetch("https://api.tvmaze.com/shows/169?embed=cast")
    .then((response) => response.json())
    .then((bbData) => {
      const banner = document.getElementById("bb-feature");

      const image = bbData.image?.original;
      const title = bbData.name;
      const genres = bbData.genres.join(", ");
      const cast = bbData._embedded?.cast
        ?.slice(0, 4)
        .map((c) => c.person.name)
        .join(", ");

      banner.innerHTML = `
      <div class="row g-0 align-items-stretch min-vh-75">
        <div class="col-md-4 d-none d-md-block">
          <div class="h-100 w-100 banner-image" style="
            background-image: url('${image}');
            background-repeat: no-repeat;
            background-position: center left;
            background-size: auto 100%;
          "></div>
        </div>
        <div class="col-md-8 d-flex flex-column justify-content-center p-5 bg-dark text-light banner-content">
          <h2 class="display-5 fw-bold mb-3">${title}</h2>
          <p><strong>Genres:</strong> ${genres}</p>
          <p><strong>Actors:</strong> ${cast}</p>
          <div id="quoteContainer" class="mt-4">
            <em class="text-muted">Loading quote...</em>
          </div>
          <div class="mt-4 d-flex gap-3">
            <a href="show.html?id=${bbData.id}" class="btn btn-primary">Watch Now</a>
            <button class="btn btn-outline-light" onclick="toggleFavorite(${bbData.id}, this)">
              ${isFavorite(bbData.id) ? 'Remove from' : 'Add to'} Favorite
            </button>
          </div>
        </div>
      </div>
    `;

      fetch("https://api.breakingbadquotes.xyz/v1/quotes")
        .then((res) => res.json())
        .then((quotes) => {
          const quoteBlock = document.getElementById("quoteContainer");
          if (!quotes.length) {
            quoteBlock.innerHTML = `<p class="text-muted">No quotes available.</p>`;
            return;
          }

          const random = quotes[Math.floor(Math.random() * quotes.length)];
          quoteBlock.innerHTML = `
            <blockquote class="blockquote">
                <p class="mb-0">"${random.quote}"</p>
                <p class="mb-0">- ${random.author}</p>                
            </blockquote>
          `;
        })
        .catch((error) => {
          document.getElementById("quoteContainer").innerHTML = 
            `<p class="text-muted">Quotes not available offline.</p>`;
        });
    });

  select.addEventListener("change", () => {
    if (!searchBox.value.trim()) {
      renderShows(Number(select.value));
    }
  });

  searchBox.addEventListener("input", () => {
    renderShows(undefined, searchBox.value);
  });
});
