export async function readDroppedEntries(dataTransfer) {
  const result = [];

  const getEntryFile = (entry) =>
    new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });

  const readAllDirectoryEntries = (directoryEntry) =>
    new Promise((resolve, reject) => {
      const reader = directoryEntry.createReader();
      const entries = [];

      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }

          entries.push(...batch);
          readBatch();
        }, reject);
      };

      readBatch();
    });

  const walk = async (entry, parentPath = "") => {
    if (entry.isFile) {
      const file = await getEntryFile(entry);

      result.push({
        file,
        relativePath: `${parentPath}${file.name}`,
      });

      return;
    }

    if (entry.isDirectory) {
      const directoryPath = `${parentPath}${entry.name}/`;

      const children = await readAllDirectoryEntries(entry);

      for (const child of children) {
        await walk(child, directoryPath);
      }
    }
  };

  const items = Array.from(dataTransfer.items);

  // Determine whether a folder was dropped.
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);

  const hasFolder = entries.some((entry) => entry.isDirectory);

  // --------------------------------------------------
  // Normal file drop
  // --------------------------------------------------

  if (!hasFolder) {
    return Array.from(dataTransfer.files).map((file) => ({
      file,
      relativePath: file.name,
    }));
  }

  // --------------------------------------------------
  // Folder / mixed drop
  // --------------------------------------------------

  for (const entry of entries) {
    await walk(entry);
  }

  return result;
}
