export const apiKey = "yirfoVznNRHBz863QlU2";

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
        "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]],
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
        "text-field": ["coalesce", ["get", "name:vi"], ["get", "name"]],
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
    this._container.className =
      "maplibregl-ctrl maplibregl-ctrl-group map-control-group";

    this._button = document.createElement("button");
    this._button.type = "button";
    this._button.className = "style-switcher-button map-control-icon-button";
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

export function addCompassControl(map, position = "top-left") {
  map.addControl(
    new maplibregl.NavigationControl({
      showZoom: false,
      showCompass: true,
      visualizePitch: true,
    }),
    position
  );
}

export function createSiteNavPanel(activeKey = "maps") {
  const items = [
    { key: "maps", href: "/", label: "Maps" },
    { key: "news", href: "/news/", label: "News" },
    { key: "villas", href: "/villas/", label: "Villas" },
    { key: "tomey", href: "/tomey/", label: "Tomey" },
  ];

  const panel = document.createElement("nav");
  panel.className = "map-menu-expanded";
  panel.setAttribute("aria-label", "Primary");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = items
    .map(
      (item) => `
        <a href="${item.href}" class="${
        item.key === activeKey ? "is-current" : ""
      }" ${item.key === activeKey ? 'aria-current="page"' : ""}>${
        item.label
      }</a>
      `
    )
    .join("");

  return panel;
}

export class ExpandableMenuControl {
  constructor(panel, options = {}) {
    this._panel = panel;
    this._buttonLabel = options.buttonLabel || "Open menu";
    this._buttonActiveLabel = options.buttonActiveLabel || "Close menu";
    this._buttonHTML = options.buttonHTML;
    this._containerClassName = options.containerClassName || "map-menu-control";
    this._buttonClassName =
      options.buttonClassName || "map-menu-toggle map-control-icon-button";
  }

  onAdd(map) {
    this._map = map;
    this._expanded = false;

    this._container = document.createElement("div");
    this._container.className = `maplibregl-ctrl ${this._containerClassName}`;

    this._toggleButton = document.createElement("button");
    this._toggleButton.type = "button";
    this._toggleButton.className = this._buttonClassName;
    this._toggleButton.setAttribute("aria-label", this._buttonLabel);
    this._toggleButton.setAttribute("aria-expanded", "false");
    this._toggleButton.innerHTML =
      this._buttonHTML ||
      `
      <span class="map-menu-toggle-lines" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;

    if (typeof this._panel === "string") {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = this._panel.trim();
      this._panel = wrapper.firstElementChild;
    }

    this._toggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });

    if (this._panel) {
      this._panel.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      this._panel.setAttribute("aria-hidden", "true");
      this._panel.classList.remove("active");
      this._container.append(this._toggleButton, this._panel);
    } else {
      this._container.append(this._toggleButton);
    }

    return this._container;
  }

  toggle(forceExpanded) {
    this._expanded =
      typeof forceExpanded === "boolean" ? forceExpanded : !this._expanded;
    this._container.classList.toggle("is-expanded", this._expanded);
    this._toggleButton.setAttribute("aria-expanded", String(this._expanded));
    this._toggleButton.setAttribute(
      "aria-label",
      this._expanded ? this._buttonActiveLabel : this._buttonLabel
    );
    if (this._panel) {
      this._panel.setAttribute("aria-hidden", String(!this._expanded));
      this._panel.classList.toggle("active", this._expanded);
    }
  }

  close() {
    if (this._expanded) this.toggle(false);
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

  localizeLabels(map, "vi");
}

/**
 * Localizes map labels to a specific language if available in the vector tiles.
 * @param {maplibregl.Map} map
 * @param {string} lang - ISO language code (e.g., 'vi', 'en')
 */
export function localizeLabels(map, lang = "vi") {
  const style = map.getStyle();
  if (!style || !style.layers) return;

  style.layers.forEach((layer) => {
    if (layer.type === "symbol") {
      const textField = map.getLayoutProperty(layer.id, "text-field");
      if (textField) {
        // If it's a simple string token like "{name}"
        if (typeof textField === "string" && textField.includes("{name}")) {
          const localized = textField.replace("{name}", `{name:${lang}}`);
          map.setLayoutProperty(layer.id, "text-field", localized);
        }
        // If it's already an expression that uses "name", wrap it to prefer lang
        else if (JSON.stringify(textField).includes('"name"')) {
          // Don't wrap if we already wrapped it in a previous call
          if (!JSON.stringify(textField).includes(`"name:${lang}"`)) {
            map.setLayoutProperty(layer.id, "text-field", [
              "coalesce",
              ["get", `name:${lang}`],
              ["get", "name:latin"],
              ["get", "name"],
              textField,
            ]);
          }
        }
      }
    }
  });
}

export function setupMapKeyboardShortcuts(options = {}) {
  const {
    map,
    layerSelect,
    opacitySlider,
    styleSwitcher,
    enableStyleToggle = false,
    enableYearSwitch = false,
    enableOpacity = false,
    enableStreetToggle = false,
    enablePan = false,
    enableZoom = false,
  } = options;

  map?.keyboard?.disable();

  document.addEventListener("keydown", (event) => {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "TEXTAREA" ||
        (activeEl.tagName === "INPUT" && activeEl.type === "text"))
    ) {
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      return;
    }
    const panAmount = 100;

    switch (event.key) {
      case "0": {
        if (enableStyleToggle && styleSwitcher) {
          styleSwitcher.toggleStyle();
        }
        break;
      }

      case "ArrowLeft": {
        if (!enableYearSwitch || !layerSelect) break;
        event.preventDefault();
        const select = layerSelect;
        if (select.selectedIndex > 0) {
          select.selectedIndex -= 1;
        } else {
          select.selectedIndex = select.options.length - 1;
        }
        break;
      }

      case "ArrowRight": {
        if (!enableYearSwitch || !layerSelect) break;
        event.preventDefault();
        const select = layerSelect;
        if (select.selectedIndex < select.options.length - 1) {
          select.selectedIndex += 1;
        } else {
          select.selectedIndex = 0;
        }
        break;
      }

      case "Enter": {
        if (!enableYearSwitch || !layerSelect) break;
        event.preventDefault();
        layerSelect.dispatchEvent(new Event("change"));
        break;
      }

      case "ArrowUp": {
        if (!enableOpacity || !opacitySlider) break;
        event.preventDefault();
        const slider = opacitySlider;
        let value = parseFloat(slider.value);
        value = Math.min(1.0, value + parseFloat(slider.step));
        slider.value = value.toFixed(1);
        slider.dispatchEvent(new Event("input"));
        break;
      }

      case "ArrowDown": {
        if (!enableOpacity || !opacitySlider) break;
        event.preventDefault();
        const slider = opacitySlider;
        let value = parseFloat(slider.value);
        value = Math.max(0.0, value - parseFloat(slider.step));
        slider.value = value.toFixed(1);
        slider.dispatchEvent(new Event("input"));
        break;
      }

      case "+":
      case "=": {
        if (!enableZoom || !map) break;
        event.preventDefault();
        map.zoomIn();
        break;
      }

      case "-": {
        if (!enableZoom || !map) break;
        event.preventDefault();
        map.zoomOut();
        break;
      }

      // case "i":
      // case "I":
      // case "w":
      // case "W": {
      //   if (!enablePan || !map) break;
      //   event.preventDefault();
      //   map.panBy([0, -panAmount], { duration: 100 }); // Pan Up
      //   break;
      // }

      // case "k":
      // case "K":
      // case "s":
      // case "S": {
      //   if (!enablePan || !map) break;
      //   event.preventDefault();
      //   map.panBy([0, panAmount], { duration: 100 }); // Pan Down
      //   break;
      // }

      // case "a":
      // case "A":
      // case "j":
      // case "J": {
      //   if (!enablePan || !map) break;
      //   event.preventDefault();
      //   map.panBy([-panAmount, 0], { duration: 100 }); // Pan Left
      //   break;
      // }

      // case "l":
      // case "L":
      // case "d":
      // case "D": {
      //   if (!enablePan || !map) break;
      //   event.preventDefault();
      //   map.panBy([panAmount, 0], { duration: 100 }); // Pan Right
      //   break;
      // }

      // case "p":
      // case "P": {
      //   if (!enableStreetToggle) break;
      //   const streetBtn = document.getElementById("street-view-btn");
      //   if (streetBtn) {
      //     streetBtn.click();
      //   }
      //   break;
      // }
    }
  });
}

export function setupKeyboardControls(
  map,
  layerSelect,
  opacitySlider,
  styleSwitcher
) {
  setupMapKeyboardShortcuts({
    map,
    layerSelect,
    opacitySlider,
    styleSwitcher,
    enableStyleToggle: true,
    enableYearSwitch: true,
    enableOpacity: true,
    enableStreetToggle: true,
    enablePan: true,
    enableZoom: true,
  });
}

export function setupStyleSwitcherHotkey(styleSwitcher) {
  setupMapKeyboardShortcuts({
    styleSwitcher,
    enableStyleToggle: true,
  });
}
