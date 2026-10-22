const HINTS = false;

// The map provider needs a key. You do NOT have it yet.
// Everything else in this app can be built and tested without it.
const MAP_API_KEY = "";

// The lost pet records live right here. No server needed.
const LOST_PETS = [
    { id: 1, name: "Biscuit", species: "Dog", space: "Outdoor", color: "golden retriever",   lastSeen: "Slipped the leash near Maple Park" },
    { id: 2, name: "Mochi",   species: "Cat", space: "Indoor",  color: "grey and cream",      lastSeen: "Last seen on the fire escape on Ash Street" },
    { id: 3, name: "Bandit",  species: "Dog", space: "Outdoor", color: "black with a white chest", lastSeen: "Roams the alley behind the bakery" },
    { id: 4, name: "Pepper",  species: "Cat", space: "Indoor",  color: "tuxedo",              lastSeen: "Bolted during the thunderstorm on Elm Court" },
    { id: 5, name: "Sunny",   species: "Dog", space: "Outdoor", color: "corgi",               lastSeen: "Hangs around the community garden on 5th" },
    { id: 6, name: "Willow",  species: "Cat", space: "Indoor",  color: "calico",              lastSeen: "Slipped out when the movers left" },
    { id: 7, name: "Quackers", species: "Duck", space: "Outdoor", color: "white with an orange bill", lastSeen: "Paddling where he shouldn't: the fountain on 3rd" }
];

// Two keyless photo APIs, one per API species. The duck does not need one:
// not everything needs an API; some data ships with the app.
const PHOTO_SOURCES = {
    Dog: "https://dog.ceo/api/breedz/image/random/3",
    Cat: "https://api.thecatapi.com/v1/images/search?limit=3"
};

// Quackers' photo ships with the app. (random-d.uk serves images with no
// API key and no fetch; the <img> tag does the work.)
const BUILT_IN_PHOTOS = {
    Duck: "https://random-d.uk/api/267.jpg"
};

// Records render immediately. Photos arrive later, or never.
const allPets = LOST_PETS.map(pet => ({
    ...pet,
    photo: BUILT_IN_PHOTOS[pet.species] || null
}));

const spaceFilter = document.getElementById("space-filter");
const reportButton = document.getElementById("report-button");
const themeToggle = document.getElementById("theme-toggle");

document.addEventListener("DOMContentLoaded", () => {
    console.log("%c🐾 Homeward - you found the console.", "color: #e07a3f; font-size: 14px; font-weight: bold;");
    if (HINTS) console.log("Hint: One tab shows you why images are missing. Start in the Network tab.");

    // Load theme from local storage
    const theme = localStorage.getItem("theme") || "light";
    document.body.className = theme;

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.body.className === "light" ? "dark" : "light";
        document.body.className = currentTheme;
        localStorage.setItem("theme", currentTheme);
        console.log("Theme switched to", currentTheme);
        if (HINTS) console.log("Hint: You can also edit this directly in Application > Local Storage.");
    });

    spaceFilter.addEventListener("change", () => {
        const value = spaceFilter.value;            // "all" | "indoor" | "outdoor"
        const filtered = value === "all" ? allPets : allPets.filter(pet => pet.space === value);
        console.log(`Filtering by "${value}": ${filtered.length} match(es).`);
        renderPets(filtered);
    });

    reportButton.addEventListener("click", () => {
        reportSighting();
    });

    renderPets(allPets);

    loadPhotos()
        .then(() => renderPets(currentSelection()))
        .catch(error => {
            console.error("Couldn't load some pet photos. Error:", error);
            if (HINTS) console.log("Hint: Compare the fetch URL to the real dog.ceo endpoint.");
        });
});

function currentSelection() {
    const value = spaceFilter.value;
    return value === "all" ? allPets : allPets.filter(pet => pet.space === value);
}

// Fetch a handful of photos for each species. A failure here costs photos only.
async function loadPhotos() {
    const dogs = await fetchSpeciesPhotos("Dog");
    const cats = await fetchSpeciesPhotos("Cat");

    const bySpecies = { Dog: dogs, Cat: cats };

    for (const pet of allPets) {
        if (BUILT_IN_PHOTOS[pet.species]) continue;
        const pool = bySpecies[pet.species] || [];
        pet.photo = pool[(pet.id - 1) % (pool.length || 1)] || null;
    }
}

async function fetchSpeciesPhotos(species) {
    const response = await fetch(PHOTO_SOURCES[species]);
    if (!response.ok) {
        throw new Error("HTTP " + response.status + " for " + response.url);
    }
    const data = await response.json();

    // dog.ceo returns { message: [...] }; The Cat API returns [...]
    if (species === "Dog") return data.message;
    return data.map(item => item.url);
}

function renderPets(pets) {
    const container = document.getElementById("lost-pets-container");
    container.innerHTML = "";

    if (pets.length === 0) {
        container.innerHTML = "<p class='empty-state'>No pets match that. Weird.</p>";
        return;
    }

    pets.forEach(pet => {
        const card = document.createElement("div");
        card.className = "pet-card";
        const photo = pet.photo
            ? `<img src="${pet.photo}" alt="A photo of ${pet.name}">`
            : `<div class="photo-missing">no photo</div>`;
        card.innerHTML = `
            ${photo}
            <h3>${pet.name}</h3>
            <p class="muted">${pet.species} · ${pet.color}</p>
            <p>${pet.lastSeen}</p>
            <button class="map-btn" data-id="${pet.id}">Show on map</button>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll(".map-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            showOnMap(Number(btn.dataset.id));
        });
    });
}

function showOnMap(petId) {
    const panel = document.getElementById("map-panel");
    const slot = document.getElementById("map-slot");
    panel.hidden = false;

    if (!MAP_API_KEY) {
        // This is the dead zone. Build the panel, then leave a clear placeholder.
        slot.innerHTML = "<p class='map-placeholder'>Map needs the location service key (see the workshop email).</p>";
        return;
    }

    slot.innerHTML = "<p>Pin for pet #" + petId + " loading...</p>";
    // geocoder call would go here once you have the key
}

function reportSighting() {
    throw new Error("This function is broken! Fix me in script.js, then reload.");
}
