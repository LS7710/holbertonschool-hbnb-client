document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();

    const loginForm = document.getElementById('login-form');
    const logoutLink = document.getElementById('logout-link');
    const countryFilter = document.getElementById('country-filter');

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                await loginUser(email, password);
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
        });
    }

    // Filter places based on selected country
    if (countryFilter) {
        countryFilter.addEventListener('change', (event) => {
            filterPlaces(event.target.value);
        });
    }

    // Handle place details page
    if (window.location.pathname.includes('place.html')) {
        const placeId = getPlaceIdFromURL();
        checkAuthenticationForPlaceDetails(placeId);
    }

    // Handle review form submission on add_review page
    if (window.location.pathname.includes('add_review.html')) {
        const reviewForm = document.getElementById('review-form');
        const token = checkAuthentication();
        const placeId = getPlaceIdFromURL();

        if (reviewForm) {
            reviewForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const reviewText = document.getElementById('review-text').value;
                await submitReview(token, placeId, reviewText);
            });
        }
    }
});

// Submit a new review to the server
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
        handleResponse(response);
    } catch (error) {
        console.error('Failed to submit review:', error);
        alert('Failed to submit review');
    }
}

// Handle the server response after submitting a review
function handleResponse(response) {
    if (response.ok) {
        alert('Review submitted successfully!');
        document.getElementById('review-form').reset();
        const placeId = getPlaceIdFromURL();
        window.location.href = `place.html?place_id=${placeId}`;
    } else {
        alert('Failed to submit review');
    }
}

// Extract the place ID from the URL
function getPlaceIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('place_id');
}

// Log in a user with provided credentials
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
            document.cookie = `token=${data.access_token}; path=/`;
            window.location.href = 'http://127.0.0.1:5000/';
        } else {
            const errorData = await response.json();
            alert('Login failed: ' + errorData.message);
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred during login');
    }
}

// Retrieve a specific cookie value
function getCookie(name) {
    const cookieArr = document.cookie.split(";");

    for (const cookie of cookieArr) {
        const cookiePair = cookie.split("=");
        if (name.trim() === cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}

// Check if the user is authenticated and update UI accordingly
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

// Fetch and display places from the server
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
        }
    } catch (error) {
        console.error('Error fetching places:', error);
    }
}

// Display the fetched places on the page
function displayPlaces(places) {
    const placesList = document.getElementById('places-list');
    placesList.innerHTML = '';

    places.forEach(place => {
        const placeCard = document.createElement('div');
        placeCard.className = 'place-card';
        placeCard.innerHTML = `
            <img src="static/place1.jpg" class="place-image" alt="Place Image">
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

// Populate the country filter dropdown with unique country names
function populateCountryFilter(places) {
    const countryFilter = document.getElementById('country-filter');
    const countries = [...new Set(places.map(place => place.country_name))];

    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// Filter displayed places based on the selected country
function filterPlaces(selectedCountry) {
    const placeCards = document.querySelectorAll('.place-card');

    placeCards.forEach(card => {
        const location = card.querySelector('p').innerText.split(': ')[1];
        card.style.display = (location.includes(selectedCountry) || selectedCountry === 'All') ? 'block' : 'none';
    });
}

// Log out the user by clearing the token and redirecting
function logoutUser() {
    document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = 'login.html';
}

// Check authentication and fetch place details for the place details page
function checkAuthenticationForPlaceDetails(placeId) {
    const token = getCookie('token');
    const addReviewSection = document.getElementById('add-review');

    if (!token) {
        if (addReviewSection) addReviewSection.style.display = 'none';
        fetchPlaceDetails(null, placeId);
    } else {
        if (addReviewSection) addReviewSection.style.display = 'block';
        fetchPlaceDetails(token, placeId);
    }
}

// Fetch details of a specific place
async function fetchPlaceDetails(token, placeId) {
    try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`http://127.0.0.1:5000/places/${placeId}`, { headers });

        if (response.ok) {
            const place = await response.json();
            displayPlaceDetails(place);
        } else {
            console.error('Failed to fetch place details:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching place details:', error);
    }
}

// Display the details of a specific place
function displayPlaceDetails(place) {
    const placeDetailsSection = document.getElementById('place-details');
    placeDetailsSection.innerHTML = '';

    const nameElement = document.createElement('h2');
    nameElement.textContent = place.name;
    placeDetailsSection.appendChild(nameElement);

    const hostElement = document.createElement('p');
    hostElement.textContent = `Host: ${place.host_name}`;
    placeDetailsSection.appendChild(hostElement);

    const priceElement = document.createElement('p');
    priceElement.textContent = `Price per night: $${place.price_per_night}`;
    placeDetailsSection.appendChild(priceElement);

    const locationElement = document.createElement('p');
    locationElement.textContent = `Location: ${place.city_name}, ${place.country_name}`;
    place
}
// THIS IS USED TO CONNECT TO A DB OR API TO LOAD LOCATIONS FROM SOMEWHERE ELSE
//
// const places = [
//     {
//       image: 'place1.jpg',
//       title: 'Cozy Apartment in the City',
//       description: 'Located in the heart of the city, this cozy apartment offers all the amenities you need.',
//       price: '$120/night',
//     },
//     {
//       image: 'place2.jpg',
//       title: 'Beachfront Villa',
//       description: 'Enjoy a relaxing stay at our beachfront villa with stunning ocean views.',
//       price: '$200/night',
//     },
//     // Add more places as needed
//   ];
  
//   const placesContainer = document.querySelector('.places-container');
  
//   places.forEach(place => {
//     const placeCard = document.createElement('div');
//     placeCard.classList.add('place-card');
  
//     placeCard.innerHTML = `
//       <img src="${place.image}" alt="${place.title}" class="place-image">
//       <div class="place-info">
//         <h3>${place.title}</h3>
//         <p>${place.description}</p>
//         <p><strong>Price:</strong> ${place.price}</p>
//       </div>
//     `;
  
//     placesContainer.appendChild(placeCard);
//   });