export const apiKey = "JOtQQjkj3YJ9dZzJKMJs";

export const STREETS_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`;
export const SATELLITE_HYBRID_STYLE = {
  version: 8,
  metadata: {
    "maplibregl:arbitrary-bottom-layer-id": "aerial-layer",
  },
  sources: {
    "esri-world-imagery": {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    "maptiler-streets": {
      type: "vector",
      url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${apiKey}`,
    },
  },
  glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${apiKey}`,
  center: [105.8542, 21.0285],
  zoom: 12,
  layers: [
    {
      id: "aerial-layer",
      type: "raster",
      source: "esri-world-imagery",
      minzoom: 0,
      maxzoom: 24,
    },
    {
      id: "road_label",
      type: "symbol",
      source: "maptiler-streets",
      "source-layer": "transportation_name",
      minzoom: 12,
      layout: {
        "text-field": "{name}",
        "text-font": ["Roboto Regular", "Arial Unicode MS Regular"],
        "text-size": {
          base: 1.2,
          stops: [
            [12, 10],
            [15, 12],
            [18, 14],
          ],
        },
        "text-transform": "uppercase",
        "text-rotation-alignment": "map",
        "symbol-placement": "line",
        "symbol-spacing": 350,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#d9d9d9",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.2,
      },
    },
    {
      id: "place_label",
      type: "symbol",
      source: "maptiler-streets",
      "source-layer": "place",
      layout: {
        "text-field": "{name}",
        "text-font": ["Roboto Regular", "Arial Unicode MS Regular"],
        "text-size": 14,
        "text-variable-anchor": ["bottom"],
        "text-radial-offset": 0.5,
        "text-justify": "auto",
        "symbol-sort-key": ["get", "rank"],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#FFFFFF",
        "text-halo-color": "rgba(0, 0, 0, 0.8)",
        "text-halo-width": 1.5,
      },
    },
  ],
};

export class StyleSwitcherControl {
  constructor(styles) {
    this._streets = styles.streets;
    this._satellite = styles.satellite;
    this._isSatellite = false;
  }

  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this._button = document.createElement("button");
    this._button.type = "button";
    this._button.className = "style-switcher-button";
    this._button.onclick = () => this.toggleStyle();
    this._button.innerHTML = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="style-switcher-icon"
      >
        <title>Toggle Map Style</title>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    `;
    this._container.appendChild(this._button);

    this.updateButton();
    return this._container;
  }

  updateButton() {
    if (this._isSatellite) {
      this._button.classList.add("is-satellite");
      this._button.title = "Switch to Streets";
    } else {
      this._button.classList.remove("is-satellite");
      this._button.title = "Switch to Satellite";
    }
  }

  toggleStyle() {
    if (window.currentPopup) {
      window.currentPopup.remove();
      window.currentPopup = null;
    }

    this._isSatellite = !this._isSatellite;
    this.updateButton();

    const newStyleUrl = this._isSatellite ? this._satellite : this._streets;

    this._map.setStyle(newStyleUrl);
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

export function modifyBaseStyle(map) {
  // console.log(
  //   "All layer ids: ",
  //   map.getStyle().layers.map((layer) => layer.id)
  // );
  const layersToRecolor = ["Grass", "Meadow", "Forest", "Wood", "Scrub"];
  const layersToHide = [
    "Residential",
    "Industrial",
    "Other border",
    "Disputed border",
  ];
  const pathsToRecolor = ["Path", "Path minor"];

  const applyProperty = (layerIds, type, key, value) => {
    layerIds.forEach((id) => {
      if (map.getLayer(id)) {
        if (type === "paint") map.setPaintProperty(id, key, value);
        if (type === "layout") map.setLayoutProperty(id, key, value);
      }
    });
  };

  applyProperty(layersToRecolor, "paint", "fill-color", "#A1E8A1");
  applyProperty(layersToHide, "layout", "visibility", "none");
  applyProperty(pathsToRecolor, "paint", "line-color", "#efeeef");

  if (map.getLayer("Building") || map.getLayer("Building 3D")) {
    map.setLayerZoomRange("Building", 14, 24);
    map.setLayerZoomRange("Building 3D", 14, 24);
  }
}
