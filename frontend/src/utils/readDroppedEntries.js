export async function readDroppedEntries(items) {
  const files = [];

  async function walk(entry, currentPath = "") {
    if (entry.isFile) {
      await new Promise((resolve) => {
        entry.file((file) => {
          files.push({
            file,
            relativePath: currentPath + file.name,
          });

          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();

      const entries = await new Promise((resolve) => {
        reader.readEntries(resolve);
      });

      for (const child of entries) {
        await walk(child, currentPath + entry.name + "/");
      }
    }
  }

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();

    if (entry) {
      await walk(entry);
    }
  }

  return files;
}
