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

function showNotification(title, options) {
  if ("Notification" in window && Notification.permission === "granted") {
    navigator.serviceWorker.ready.then(function(registration) {
      if (registration) {
        registration.showNotification(title, options);
      }
      
    });
  }
}

function saveFavorite(showId) {
  let favorites = JSON.parse(localStorage.getItem('favoriteShows') || '[]');
  if (!favorites.includes(showId)) {
    favorites.push(showId);
    localStorage.setItem('favoriteShows', JSON.stringify(favorites));
    showNotification("Added to favorites", {
      body: "The series has been successfully added to your favorites.",
      icon: "icons/android-chrome-192x192.png",
      tag: "favorite-added"
    });
    return true;
  }
  return false;
}

function removeFavorite(showId) {
  let favorites = JSON.parse(localStorage.getItem('favoriteShows') || '[]');
  favorites = favorites.filter(id => id !== showId);
  localStorage.setItem('favoriteShows', JSON.stringify(favorites));
  showNotification("Removed from favorites", {
    body: "The series has been removed from your favorites.",
    icon: "icons/android-chrome-192x192.png",
    tag: "favorite-removed"
  });
}

function isFavorite(showId) {
  const favorites = JSON.parse(localStorage.getItem('favoriteShows') || '[]');
  return favorites.includes(showId);
}

function saveComment(showId, comment) {
  const comments = JSON.parse(localStorage.getItem('showComments') || '{}');
  if (!comments[showId]) {
    comments[showId] = [];
  }
  
  const newComment = {
    id: Date.now(),
    text: comment,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  comments[showId].push(newComment);
  localStorage.setItem('showComments', JSON.stringify(comments));
  
  showNotification("Comment saved", {
    body: "Your comment has been added successfully.",
    icon: "icons/android-chrome-192x192.png",
    tag: "comment-saved"
  });
  
  return newComment;
}

function getComments(showId) {
  const comments = JSON.parse(localStorage.getItem('showComments') || '{}');
  return comments[showId] || [];
}

function deleteComment(showId, commentId) {
  const comments = JSON.parse(localStorage.getItem('showComments') || '{}');
  if (comments[showId]) {
    comments[showId] = comments[showId].filter(comment => comment.id !== commentId);
    localStorage.setItem('showComments', JSON.stringify(comments));
  }
}

function shareShow(showData) {
  if (navigator.share) {
    navigator.share({
      title: showData.name,
      text: `Check out this interesting series: ${showData.name}`,
      url: window.location.href
    }).catch(err => {
      console.log('Error sharing:', err);
      copyToClipboard();
    });
  } 
  else {
    copyToClipboard();
  }
}

function copyToClipboard() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    showNotification("Link copied", {
      body: "Link to the series copied to clipboard",
      icon: "icons/android-chrome-192x192.png",
      tag: "link-copied"
    });
  }).catch(() => {
    const textArea = document.createElement("textarea");
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    showNotification("Enlace copiado", {
      body: "Enlace a la serie copiado al portapapeles",
      icon: "icons/android-chrome-192x192.png",
      tag: "link-copied"
  });
  });
}

function displayComments(showId) {
  const comments = getComments(showId);
  const commentDisplay = document.getElementById("commentDisplay");
  
  if (comments.length === 0) {
    commentDisplay.innerHTML = `
      <div class="alert alert-info mt-3">
        <i class="bi bi-info-circle"></i> There are no comments yet.
      </div>
    `;
    return;
  }
  
  let commentsHtml = '<div class="mt-4"><h5><i class="bi bi-chat-dots"></i> Comments:</h5>';
  
  comments.forEach(comment => {
    commentsHtml += `
      <div class="comment-item mt-3" data-comment-id="${comment.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <p class="mb-2">${comment.text}</p>
            <small class="text-muted">
              <i class="bi bi-clock"></i> ${comment.date}
            </small>
          </div>
          <button class="btn btn-outline-danger btn-sm ms-2" onclick="removeComment(${showId}, ${comment.id})">
            <i class="bi bi-trash"></i>Delete comment
          </button>
        </div>
      </div>
    `;
  });
  
  commentsHtml += '</div>';
  commentDisplay.innerHTML = commentsHtml;
}

window.removeComment = function(showId, commentId) {
  if (confirm('Are you sure you want to delete this comment?')) {
    deleteComment(showId, commentId);
    displayComments(showId);
    
    showNotification("Comment deleted", {
      body: "Comment successfully deleted",
      icon: "icons/android-chrome-192x192.png",
      tag: "comment-deleted"
    });
  }
};

window.toggleFavorite = function(showId, button) {
  if (isFavorite(showId)) {
    removeFavorite(showId);
    button.innerHTML = '<i class="bi bi-heart"></i> Add to favorites';
    button.className = 'btn btn-outline-danger';
  } else {
    if (saveFavorite(showId)) {
      button.innerHTML = '<i class="bi bi-heart-fill"></i> Delete from favorites';
      button.className = 'btn btn-danger';
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const id = new URLSearchParams(window.location.search).get("id");
  const showContainer = document.getElementById("showDetailed");

  updateConnectionStatus();
  
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  if (!id) {
    showContainer.innerHTML = `
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-md-8 text-center">
            <div class="alert alert-warning">
              <h4><i class="bi bi-exclamation-triangle"></i> Error</h4>
              <p>Serial ID not found in URL</p>
              <a href="index.html" class="btn btn-primary">
                <i class="bi bi-arrow-left"></i> Return to the home page
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  showContainer.innerHTML = `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-6 text-center">
          <div class="loading-spinner mx-auto mb-3"></div>
          <p class="text-muted">Loading information about the series...</p>
        </div>
      </div>
    </div>
  `;

  if (!document.getElementById('connectionStatus')) {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connectionStatus';
    statusDiv.className = 'connection-status online';
    statusDiv.innerHTML = '<i class="bi bi-wifi"></i> Online';
    document.body.appendChild(statusDiv);
  }

  fetch(`https://api.tvmaze.com/shows/${id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((showData) => {
      const isFav = isFavorite(parseInt(id));
      const favoriteButtonText = isFav ? 
        '<i class="bi bi-heart-fill"></i> Delete from favorites' : 
        '<i class="bi bi-heart"></i> Add to favorites';
      const favoriteButtonClass = isFav ? 'btn btn-danger' : 'btn btn-outline-danger';

      const htmlShowDetailed = `
        <div class="container py-5">
          <div class="row">
            <div class="col-md-6 mb-4">
              <div class="card border-0 shadow-sm">
                <div class="text-center p-4 position-relative"
                    style="background-color: #f8f9fa; height: 400px; display: flex; align-items: center; justify-content: center;">
                    <img src="${showData.image?.medium || 'icons/android-chrome-512x512.png'}" 
                         class="img-fluid"
                         style="max-height: 350px; object-fit: contain;" 
                         alt="${showData.name}"
                         onerror="this.src='icons/android-chrome-512x512.png'">
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <h1 class="fw-bold mb-3">
                <i class="bi bi-tv text-primary"></i> 
                ${showData.name}
              </h1>
              
              <div class="mb-3">
                <span class="badge bg-primary me-2">
                  <i class="bi bi-tag"></i> ${showData.type || 'N/A'}
                </span>
                <span class="badge bg-success me-2">
                  <i class="bi bi-broadcast"></i> ${showData.status || 'N/A'}
                </span>
                ${showData.rating?.average ? 
                  `<span class="badge bg-warning text-dark">
                    <i class="bi bi-star-fill"></i> ${showData.rating.average}/10
                  </span>` : ''
                }
              </div>

              <div class="mb-3">
                <h6 class="text-muted mb-2">
                  <i class="bi bi-calendar3"></i> Show information:
                </h6>
                <p class="mb-1">
                  <strong>📽️ Premiere:</strong> ${showData.premiered || 'N/A'}
                </p>
                <p class="mb-1">
                  <strong>💿 Status:</strong> ${showData.status || 'N/A'}
                </p>
                <p class="mb-1">
                  <strong>🎞️ Genres:</strong> ${showData.genres?.join(', ') || 'N/A'}
                </p>
                <p class="mb-1">
                  <strong>📺 Channel:</strong> ${showData.network?.name || showData.webChannel?.name || 'N/A'}
                </p>
                ${showData.externals?.imdb ? 
                  `<p class="mb-1">
                    <strong>IMDb:</strong> 
                    <a href="https://www.imdb.com/title/${showData.externals.imdb}" 
                       target="_blank" rel="noopener">
                      Watch on IMDb <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                  </p>` : ''
                }
              </div>

              <div class="mb-4">
                <h6 class="text-muted mb-2">
                  <i class="bi bi-file-text"></i> Description:
                </h6>
                <div class="show-summary">
                  ${showData.summary || '<p class="text-muted">Description not available</p>'}
                </div>
              </div>

              <div class="mb-4 d-flex flex-wrap gap-2">
                <button id="favoriteBtn" class="${favoriteButtonClass}" 
                        onclick="toggleFavorite(${showData.id}, this)">
                  ${favoriteButtonText}
                </button>
                <button class="btn btn-outline-primary" 
                        onclick="shareShow({id: ${showData.id}, name: '${showData.name.replace(/'/g, '\\\'')}'})">
                  <i class="bi bi-share"></i> Share
                </button>
                <button id="commentBtn" class="btn btn-outline-success">
                  <i class="bi bi-chat-dots"></i> Leave a comment
                </button>
                <a href="index.html" class="btn btn-secondary">
                  <i class="bi bi-arrow-left"></i> Back
                </a>
              </div>

              <div id="commentFormContainer" class="mb-4"></div>
              <div id="commentDisplay"></div>
            </div>
          </div>
        </div>
      `;

      showContainer.innerHTML = htmlShowDetailed;

      displayComments(parseInt(id));

      const commentBtn = document.getElementById("commentBtn");
      const commentFormContainer = document.getElementById("commentFormContainer");

      commentBtn.addEventListener("click", () => {
        if (commentFormContainer.innerHTML.trim()) {
          commentFormContainer.innerHTML = "";
          commentBtn.innerHTML = '<i class="bi bi-chat-dots"></i> Leave a comment';
          return;
        }

        commentBtn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel';
        
        const formHtml = `
          <div class="comment-form">
            <h6 class="mb-3">
              <i class="bi bi-pencil"></i> New comment:
            </h6>
            <div class="form-floating mb-3">
              <textarea class="form-control" 
                        id="commentTextarea" 
                        placeholder="Share your opinion about the series..."
                        style="height: 120px;"
                        maxlength="500"></textarea>
              <label for="commentTextarea">
                <i class="bi bi-chat-text"></i> Your comment
              </label>
              <div class="form-text">
                <span id="charCount">0</span>/500 characters
              </div>
            </div>
            <div class="d-flex gap-2">
              <button type="button" id="submitComment" class="btn btn-success">
                <i class="bi bi-send"></i> Send
              </button>
              <button type="button" id="cancelComment" class="btn btn-secondary">
                <i class="bi bi-x"></i> Cancel
              </button>
            </div>
          </div>
        `;

        commentFormContainer.innerHTML = formHtml;

        const textarea = document.getElementById("commentTextarea");
        const charCount = document.getElementById("charCount");
        
        textarea.addEventListener("input", () => {
          const count = textarea.value.length;
          charCount.textContent = count;
          charCount.style.color = count > 450 ? '#dc3545' : '#6c757d';
        });

        textarea.focus();

        document.getElementById("submitComment").addEventListener("click", () => {
          const commentText = textarea.value.trim();

          if (!commentText) {
            textarea.classList.add("is-invalid");
            if (!document.querySelector(".invalid-feedback")) {
              const feedback = document.createElement("div");
              feedback.className = "invalid-feedback";
              feedback.textContent = "The comment cannot be empty";
              textarea.parentNode.appendChild(feedback);
            }
            return;
          }

          if (commentText.length > 500) {
            textarea.classList.add("is-invalid");
            return;
          }

          const savedComment = saveComment(parseInt(id), commentText);
          
          commentFormContainer.innerHTML = "";
          commentBtn.innerHTML = '<i class="bi bi-chat-dots"></i> Leave a comment';
          
          displayComments(parseInt(id));

          setTimeout(() => {
            const newComment = document.querySelector(`[data-comment-id="${savedComment.id}"]`);
            if (newComment) {
              newComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
              newComment.style.animation = 'highlight 2s ease-in-out';
            }
          }, 100);
        });

        document.getElementById("cancelComment").addEventListener("click", () => {
          commentFormContainer.innerHTML = "";
          commentBtn.innerHTML = '<i class="bi bi-chat-dots"></i> Leave a comment';
        });
      });

    })
    .catch((error) => {
      console.error('Error fetching show details:', error);
      
      showContainer.innerHTML = `
        <div class="container py-5">
          <div class="row justify-content-center">
            <div class="col-md-8">
              <div class="alert alert-danger text-center">
                <h4><i class="bi bi-exclamation-triangle"></i>Loading error</h4>
                <p class="mb-3">
                  ${navigator.onLine ? 
                    'Series information could not be loaded. A series with this ID may not exist.' : 
                    'There is no internet connection. Data is not available offline.'
                  }
                </p>
                <div class="d-flex justify-content-center gap-2">
                  <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> Repeat
                  </button>
                  <a href="index.html" class="btn btn-secondary">
                    <i class="bi bi-arrow-left"></i> Return to the home page
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
});

window.shareShow = shareShow;
