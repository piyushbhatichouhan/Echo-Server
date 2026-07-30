import api from "./api";

export const getCloudFiles = async () => {
  const response = await api.get("/cloud/files");

  return response.data.data;
};

export const uploadCloudFile = async (folder, file, relativePath) => {
  const form = new FormData();

  form.append("file", file);

  form.append("folder", folder || "");

  form.append("relativePath", relativePath || file.name);
  console.log({
    folder,
    relativePath,
  });
  const response = await api.post("/cloud/files", form);

  return response.data.data;
};

export const deleteCloudFile = async (fileId) => {
  const response = await api.delete(`/cloud/files/${fileId}`);

  return response.data;
};

export const deleteCloudFolder = async (folderPath) => {
  const response = await api.delete("/cloud/folder", {
    data: {
      path: folderPath,
    },
  });

  return response.data.data;
};

export const renameCloudFile = async (fileId, newName) => {
  console.log("=== CLOUD API ===");
  console.log({ fileId, newName });

  try {
    console.log("Before PUT");

    const response = await api.put(`/cloud/files/${fileId}/rename`, {
      name: newName,
    });

    console.log("After PUT");
    console.log(response);

    return response.data.data;
  } catch (err) {
    console.error("PUT failed");
    console.error(err);
    throw err;
  }
};

export const createCloudFolder = async (path) => {
  const res = await api.post("/cloud/folders", {
    path,
  });

  return res.data.data;
};

export const createCloudFile = async (path) => {
  const response = await api.post("/cloud/files/create", {
    path,
  });

  return response.data.data;
};
export const downloadCloudFile = async (fileId) => {
  const response = await api.get(`/cloud/files/${fileId}/download`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);

  const a = document.createElement("a");

  a.href = url;

  let filename = "download";

  const disposition = response.headers["content-disposition"];

  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);

    if (match) filename = match[1];
  }

  a.download = filename;

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
};

export const getCloudFileContent = async (fileId) => {
  const response = await api.get(`/cloud/files/${fileId}/content`);

  return response.data.data.content;
};

export const saveCloudFileContent = async (fileId, content) => {
  const response = await api.put(`/cloud/files/${fileId}/content`, {
    content,
  });

  return response.data;
};

export const getCloudStats = async () => {
  const response = await api.get("/cloud/stats");

  return response.data.data;
};

export const getFileBlob = async (fileId) => {
  const response = await api.get(`cloud/files/${fileId}/download`, {
    responseType: "blob",
  });

  return {
    blob: response.data,
    filename:
      response.headers["content-disposition"]?.match(
        /filename="?([^"]+)"?/,
      )?.[1] || "download",
  };
};
