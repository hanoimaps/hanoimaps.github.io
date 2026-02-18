import {
  STREETS_STYLE,
  SATELLITE_HYBRID_STYLE,
  StyleSwitcherControl,
  modifyBaseStyle,
} from "../shared.js";

// --- 1. CONSTANTS ---
const GEOJSON_PATH = "threads.geojson";
const SOURCE_ID = "threads-source";
const POINTS_LAYER_ID = "threads-points";
const LINES_LAYER_ID = "threads-lines";
const LINES_HIT_LAYER_ID = "threads-lines-hit";

let threadsData = null;

// --- MAP INIT ---
const map = new maplibregl.Map({
  container: "map",
  style: STREETS_STYLE,
  center: [105.8542, 21.0285],
  zoom: 12,
  maxBounds: [
    [105.5, 20.7],
    [106.1, 21.5],
  ],
  attributionControl: false,
});

// Use default keyboard controls since we removed the custom ones

// --- MAP LOAD ---
map.on("load", () => {
  modifyBaseStyle(map);

  // Controls
  map.addControl(new maplibregl.NavigationControl(), "top-left");
  map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }),
    "top-left",
  );

  map.addControl(
    new StyleSwitcherControl({
      streets: STREETS_STYLE,
      satellite: SATELLITE_HYBRID_STYLE,
    }),
    "top-left",
  );

  map.addControl(
    new maplibregl.AttributionControl({
      customAttribution:
        '<a href="https://threads.com/@tomeyinhanoi" target="_blank" style="text-decoration: underline">By Tomey</a> | <a href="/info" target="_blank"  style="text-decoration: underline">Sources</a>',
      compact: true,
    }),
    "bottom-left",
  );

  // Fetch Threads Data
  fetch(GEOJSON_PATH)
    .then((res) => res.json())
    .then((data) => {
      threadsData = data;
      setupThreadsLayers();
    });
});

map.on("styledata", () => {
  setTimeout(() => {
    modifyBaseStyle(map);
    setupThreadsLayers(); // Re-apply threads layers layer when style changes
  }, 50);
});

// --- LOGIC ---

function setupThreadsLayers() {
  if (!threadsData) return;

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: "geojson", data: threadsData });
  }

  // 1. Lines Layer (Hit Area - Invisible)
  if (!map.getLayer(LINES_HIT_LAYER_ID)) {
    map.addLayer({
      id: LINES_HIT_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      filter: ["==", "$type", "LineString"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#000000",
        "line-width": 20, // Wide hit area
        "line-opacity": 0,
      },
    });
  }

  // 2. Lines Layer (Visible)
  if (!map.getLayer(LINES_LAYER_ID)) {
    map.addLayer({
      id: LINES_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      filter: ["==", "$type", "LineString"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#FF5722",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 16, 6],
        "line-opacity": 0.8,
      },
    });
  }

  // 3. Points Layer
  if (!map.getLayer(POINTS_LAYER_ID)) {
    map.addLayer({
      id: POINTS_LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-color": "#FF5722",
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          4,
          16,
          8,
          20,
          12,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  setupInteractions();
}

function setupInteractions() {
  // --- Lines Interaction ---
  map.on("mouseenter", LINES_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", LINES_HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", LINES_HIT_LAYER_ID, (e) => {
    if (e.features.length > 0) {
      showPopup(e.features[0], e.lngLat);
    }
  });

  // --- Points Interaction ---
  map.on("mouseenter", POINTS_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", POINTS_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("click", POINTS_LAYER_ID, (e) => {
    if (e.features.length > 0) {
      // Use Point coordinates to center popup perfectly if desired
      const geom = e.features[0].geometry;
      const coords =
        geom.type === "Point" ? geom.coordinates.slice() : e.lngLat;

      showPopup(e.features[0], coords);
    }
  });
}

function showPopup(feature, lngLat) {
  if (window.currentPopup) window.currentPopup.remove();

  const props = feature.properties;

  // Safe parsing of JSON strings (MapLibre sometimes returns stringified properties)
  let allMediaUrls = props.all_media_urls;
  if (typeof allMediaUrls === "string") {
    try {
      allMediaUrls = JSON.parse(allMediaUrls);
    } catch (e) {}
  }

  const dateObject = props.timestamp ? new Date(props.timestamp) : new Date();
  const d = String(dateObject.getDate()).padStart(2, "0");
  const m = String(dateObject.getMonth() + 1).padStart(2, "0");
  const y = dateObject.getFullYear();
  const dateString = `${d}/${m}/${y}`;
  const username = "tomeyinhanoi";
  const avatarUrl = "ava.jpg";
  // Construct Content using threads.css classes
  let contentHtml = `
    <div class="thread-popup-container">
      <div class="thread-left-col">
        <div class="thread-avatar">
          <img src="${avatarUrl}" alt="${username}" onerror="this.src='https://ui-avatars.com/api/?name=T&background=random'">
        </div>
      </div>
      <div class="thread-right-col">
        <div class="thread-header">
          <a href="${props.permalink || "#"}" target="_blank" class="thread-username">@${username}</a>
          <span class="thread-date">${dateString}</span>
        </div>
        <div class="thread-content">${props.text || ""}</div>
  `;

  // Media Section (Carousel)
  if (
    (allMediaUrls && Array.isArray(allMediaUrls) && allMediaUrls.length > 0) ||
    props.media_url
  ) {
    const mediaList =
      allMediaUrls && allMediaUrls.length > 0
        ? allMediaUrls
        : [props.media_url];

    contentHtml += `
      <div class="thread-media-container">
        <div class="thread-carousel-wrapper">
          ${mediaList
            .map(
              (url) => `
            <div class="thread-carousel-slide">
              <img src="${url}" class="thread-media-img" loading="lazy">
            </div>
          `,
            )
            .join("")}
        </div>
        ${
          mediaList.length > 1
            ? `
          <button class="carousel-nav-btn prev" style="display: none;" onclick="moveCarousel(this, -1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button class="carousel-nav-btn next" onclick="moveCarousel(this, 1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        `
            : ""
        }
      </div>
    `;
  }

  // Footer / Permalink
  if (props.permalink) {
    contentHtml += `
      <div class="thread-footer">
        <a href="${props.permalink}" target="_blank" class="thread-action-link">Xem trên Threads &rarr;</a>
      </div>
    `;
  }

  contentHtml += `
      </div>
    </div>
  `;

  window.currentPopup = new maplibregl.Popup({
    maxWidth: "340px",
    closeButton: false,
    anchor: "bottom",
    offset: [0, -10],
  })
    .setLngLat(lngLat)
    .setHTML(contentHtml)
    .addTo(map);

  map.flyTo({
    center: lngLat,
    duration: 600,
    essential: true,
    padding: { top: 450, bottom: 50, left: 50, right: 50 },
  });

  // Setup scroll listener for carousel buttons
  setTimeout(() => {
    const wrapper = document.querySelector(".thread-carousel-wrapper");
    if (wrapper) {
      wrapper.addEventListener("scroll", () => updateCarouselButtons(wrapper));
    }
  }, 100);
}

// Global Carousel Navigation Logic
window.moveCarousel = (btn, direction) => {
  const container = btn.parentElement.querySelector(".thread-carousel-wrapper");
  if (container) {
    const slideWidth = container.offsetWidth;
    container.scrollBy({
      left: direction * slideWidth,
      behavior: "smooth",
    });
  }
};

function updateCarouselButtons(container) {
  const prevBtn = container.parentElement.querySelector(
    ".carousel-nav-btn.prev",
  );
  const nextBtn = container.parentElement.querySelector(
    ".carousel-nav-btn.next",
  );

  if (!prevBtn || !nextBtn) return;

  const scrollLeft = container.scrollLeft;
  const maxScroll = container.scrollWidth - container.offsetWidth;

  prevBtn.style.display = scrollLeft <= 5 ? "none" : "flex";
  nextBtn.style.display = scrollLeft >= maxScroll - 5 ? "none" : "flex";
}
