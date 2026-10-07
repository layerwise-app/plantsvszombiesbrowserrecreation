export function preserveSpriteAlpha(data, width, height) {
  // Existing alpha distinguishes black details from transparent backgrounds.
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return data;
  }

  // For legacy opaque sprites, remove only edge-connected black background.
  const visited = new Uint8Array(width * height);
  const queue = [];
  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    const offset = pixel * 4;
    if (visited[pixel] || data[offset] >= 12 || data[offset + 1] >= 12 || data[offset + 2] >= 12) return;
    visited[pixel] = 1;
    queue.push(pixel);
  }
  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }
  for (let i = 0; i < queue.length; i++) {
    const pixel = queue[i];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    data[pixel * 4 + 3] = 0;
    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
  }
  return data;
}
