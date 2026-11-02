import api from "./api";

// ---------- Files ----------

export const getProjectFiles = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/files`);
  return res.data.data;
};

export const uploadProjectFile = async (
  projectId,
  file,
  relativePath = file.name,
) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("relativePath", relativePath);

  const res = await api.post(`/projects/${projectId}/files`, formData);

  return res.data.data;
};

export const createProjectFile = async (projectId, path) => {
  const res = await api.post(`/projects/${projectId}/files/create`, {
    path,
  });

  return res.data.data;
};

export const getProjectFileContent = async (fileId) => {
  const res = await api.get(`/files/${fileId}/content`);
  return res.data.data;
};

export const saveProjectFileContent = async (fileId, content) => {
  const res = await api.put(`/files/${fileId}/content`, {
    content,
  });

  return res.data.data;
};

export const downloadProjectFile = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(response.data);

  const a = document.createElement("a");
  a.href = url;

  const disposition = response.headers["content-disposition"];

  let filename = "download";

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

export const getProjectFileBlob = async (fileId) => {
  const response = await api.get(`/files/${fileId}/download`, {
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

export const deleteProjectFile = async (fileId) => {
  const res = await api.delete(`/files/${fileId}`);
  return res.data;
};

export const renameProjectPath = async (projectId, oldPath, newPath, type) => {
  const res = await api.put(`/projects/${projectId}/rename`, {
    oldPath,
    newPath,
    type,
  });

  return res.data;
};

// ---------- Folders ----------

export const createProjectFolder = async (projectId, path) => {
  const res = await api.post(`/projects/${projectId}/folders`, {
    path,
  });

  return res.data.data;
};

export const deleteProjectPath = async (projectId, path, type, permanent = false) => {
  const res = await api.delete(`/projects/${projectId}/path${permanent ? "?permanent=true" : ""}`, {
    data: {
      path,
      type,
      permanent,
    },
  });

  return res.data;
};

export const renameProjectFolder = async (projectId, relativePath, newName) => {
  const res = await api.put(`/projects/${projectId}/rename`, {
    relativePath,
    newName,
  });

  return res.data.data;
};

export const copyPath = async (projectId, relativePath, type) => {
  const res = await api.post("/files/copy", {
    projectId,
    relativePath,
    type,
  });

  return res.data;
};

export const cutPath = async (projectId, relativePath, type) => {
  const res = await api.post("/files/cut", {
    projectId,
    relativePath,
    type,
  });

  return res.data;
};

export const pastePath = async (projectId, clipboard, destination) => {
  const res = await api.post("/files/paste", {
    projectId,
    clipboard,
    destination,
  });

  return res.data;
};

export const deleteProjectPaths = async (projectId, items, permanent = false) => {
  const response = await api.delete(`/projects/${projectId}/paths/bulk${permanent ? "?permanent=true" : ""}`, {
    data: {
      items,
      permanent,
    },
  });

  return response.data;
};

export const downloadProjectPaths = async (projectId, items) => {
  const response = await api.post(
    `/projects/${projectId}/paths/bulk/download`,
    {
      items,
    },
    {
      responseType: "blob",
    },
  );

  const url = URL.createObjectURL(response.data);

  const a = document.createElement("a");

  a.href = url;
  a.download = "project-files.zip";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

export const getProjectStats = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/stats`);
  return res.data.data;
};

export const extractProjectArchive = async (projectId, relativePath, destination) => {
  const res = await api.post(`/projects/${projectId}/files/extract`, {
    relativePath,
    destination,
  });
  return res.data;
};

export const getProjectTrash = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/trash`);
  return res.data.data;
};

export const restoreProjectTrash = async (projectId, fileId) => {
  const res = await api.post(`/projects/${projectId}/trash/restore`, { fileId });
  return res.data;
};

export const emptyProjectTrash = async (projectId) => {
  const res = await api.delete(`/projects/${projectId}/trash/empty`);
  return res.data;
};

export const compressProjectPaths = async (projectId, items, zipName, destination) => {
  const res = await api.post(`/projects/${projectId}/files/compress`, {
    items,
    zipName,
    destination,
  });
  return res.data;
};

export const searchProjectFiles = async (projectId, query) => {
  const res = await api.get(`/projects/${projectId}/files/search?q=${encodeURIComponent(query)}`);
  return res.data.data;
};

export const exportProjectToCloud = async (projectId, items, destination) => {
  const res = await api.post(`/projects/${projectId}/files/export-to-cloud`, {
    items,
    destination,
  });
  return res.data;
};

export const importCloudToProject = async (projectId, items, destination) => {
  const res = await api.post(`/projects/${projectId}/files/import-from-cloud`, {
    items,
    destination,
  });
  return res.data;
};
