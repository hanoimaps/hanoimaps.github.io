self.addEventListener("message", async (e) => {
  const url = e.data.url;

  if (!url) {
    self.postMessage({ error: "No URL provided" });
    return;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();

    const geojsonData = JSON.parse(text);

    self.postMessage({ data: geojsonData });
  } catch (error) {
    console.error("Worker Error:", error);
    self.postMessage({ error: error.message });
  }
});
