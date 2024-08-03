document.addEventListener('DOMContentLoaded', () => {
  // Check if the user is authenticated and update UI accordingly
  checkAuthentication();

  const loginForm = document.getElementById('login-form');
  const logoutLink = document.getElementById('logout-link');

  // Handle login form submission
  if (loginForm) {
      loginForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;

          try {
              await loginUser(email, password);
              checkAuthentication(); // Update UI after login
          } catch (error) {
              console.error('Error during login:', error);
              alert('Login failed: ' + error.message);
          }
      });
  }

  // Handle logout link click
  if (logoutLink) {
      logoutLink.addEventListener('click', (event) => {
          event.preventDefault();
          logoutUser();
          checkAuthentication(); // Update UI after logout
      });
  }

  // Handle country filter change
  const countryFilter = document.getElementById('country-filter');
  if (countryFilter) {
      countryFilter.addEventListener('change', (event) => {
          filterPlaces(event.target.value);
      });
  }

  // Check if on place details page and fetch details if necessary
  if (window.location.pathname.includes('place.html')) {
      const placeId = getPlaceIdFromURL();
      checkAuthenticationForPlaceDetails(placeId);
  }

  // Handle review form submission if on add review page
  if (window.location.pathname.includes('add_review.html')) {
      const reviewForm = document.getElementById('review-form');
      const token = checkAuthentication();
      const placeId = getPlaceIdFromURL();

      if (reviewForm) {
          reviewForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              const reviewText = document.getElementById('review-text').value;
              try {
                  await submitReview(token, placeId, reviewText);
              } catch (error) {
                  console.error('Error during review submission:', error);
                  alert('Failed to submit review');
              }
          });
      }
  }
});

/**
* Submits a review to the server.
* @param {string} token - The user's authentication token.
* @param {string} placeId - The ID of the place being reviewed.
* @param {string} reviewText - The text of the review.
*/
async function submitReview(token, placeId, reviewText) {
  try {
      const response = await fetch(`http://127.0.0.1:5000/api/reviews`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ place_id: placeId, text: reviewText })
      });
      handleReviewSubmissionResponse(response);
  } catch (error) {
      console.error('Error during review submission:', error);
      alert('Failed to submit review');
  }
}

/**
* Handles the response from the server after submitting a review.
* @param {Response} response - The response from the server.
*/
function handleReviewSubmissionResponse(response) {
  if (response.ok) {
      alert('Review submitted successfully!');
      document.getElementById('review-form').reset();
      // Redirect to place details page
      const placeId = getPlaceIdFromURL();
      window.location.href = `place.html?place_id=${placeId}`;
  } else {
      alert('Failed to submit review');
  }
}

/**
* Retrieves the place ID from the URL parameters.
* @returns {string} - The place ID.
*/
function getPlaceIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('place_id');
}

/**
* Logs in the user by sending their credentials to the server.
* @param {string} email - The user's email address.
* @param {string} password - The user's password.
*/
async function loginUser(email, password) {
  try {
      const response = await fetch('http://127.0.0.1:5000/login', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
      });

      if (response.ok) {
          const data = await response.json();
          // Secure the token with HttpOnly and Secure flags if possible
          document.cookie = `token=${data.access_token}; path=/; Secure; HttpOnly;`;
          window.location.href = '/';
      } else {
          const errorData = await response.json();
          alert('Login failed: ' + errorData.message);
      }
  } catch (error) {
      console.error('Error during login:', error);
      alert('Login failed');
  }
}

/**
* Retrieves a cookie value by name.
* @param {string} name - The name of the cookie.
* @returns {string|null} - The cookie value, or null if not found.
*/
function getCookie(name) {
  const cookieArr = document.cookie.split(";");
  for (let cookie of cookieArr) {
      const [key, value] = cookie.split("=");
      if (key.trim() === name) {
          return decodeURIComponent(value);
      }
  }
  return null;
}

/**
* Checks if the user is authenticated and updates the UI accordingly.
* @returns {string|null} - The user's authentication token, or null if not authenticated.
*/
function checkAuthentication() {
  const token = getCookie('token');
  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');

  if (!token) {
      if (loginLink) loginLink.style.display = 'block';
      if (logoutLink) logoutLink.style.display = 'none';
  } else {
      if (loginLink) loginLink.style.display = 'none';
      if (logoutLink) logoutLink.style.display = 'block';
      fetchPlaces(token);
  }
  return token;
}

/**
* Fetches and displays the list of places available.
* @param {string} token - The user's authentication token.
*/
async function fetchPlaces(token) {
  try {
      const response = await fetch('http://127.0.0.1:5000/places', {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });

      if (response.ok) {
          const places = await response.json();
          displayPlaces(places);
          populateCountryFilter(places);
      } else {
          console.error('Failed to fetch places:', response.statusText);
          alert('Failed to fetch places');
      }
  } catch (error) {
      console.error('Error fetching places:', error);
      alert('An error occurred while fetching places. Please try again later.');
  }
}

/**
* Displays a list of places on the page.
* @param {Array} places - The list of places to display.
*/
function displayPlaces(places) {
  const placesList = document.getElementById('places-list');
  placesList.innerHTML = '';

  if (places.length === 0) {
      placesList.innerHTML = '<p>No places found.</p>';
      return;
  }

  places.forEach(place => {
      const placeCard = document.createElement('div');
      placeCard.className = 'place-card';

      placeCard.innerHTML = `
          <img src="${place.image_url || 'static/image/images.jpeg'}" class="place-image" alt="Place Image">
          <h3>${place.description}</h3>
          <p>Price per night: $${place.price_per_night}</p>
          <p>Location: ${place.city_name}, ${place.country_name}</p>
          <button class="details-button" data-id="${place.id}">View Details</button>
      `;

      placeCard.querySelector('.details-button').addEventListener('click', () => {
          window.location.href = `place.html?place_id=${place.id}`;
      });

      placesList.appendChild(placeCard);
  });
}

/**
* Populates the country filter dropdown based on available places.
* @param {Array} places - The list of places.
*/
function populateCountryFilter(places) {
  const countryFilter = document.getElementById('country-filter');
  countryFilter.innerHTML = ''; // Clear previous options

  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All';
  countryFilter.appendChild(allOption);

  const countries = [...new Set(places.map(place => place.country_name))];
  countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      countryFilter.appendChild(option);
  });
}

/**
* Filters the displayed places based on the selected country.
* @param {string} selectedCountry - The selected country to filter by.
*/
function filterPlaces(selectedCountry) {
  const placeCards = document.querySelectorAll('.place-card');

  placeCards.forEach(card => {
      const location = card.querySelector('p:nth-of-type(2)').innerText.split(': ')[1];
      card.style.display = location.includes(selectedCountry) || selectedCountry === 'All' ? 'block' : 'none';
  });
}

/**
* Logs out the user and redirects to the login page.
*/
function logoutUser() {
  // Clear the token cookie
}