import {
  FileText, FileSpreadsheet, FilePlus, Eye, Download, Trash2,
  ChevronDown, Lock, X, AlertCircle, Shield, Loader2, Pencil
} from "lucide-react";
import { useState, useRef } from "react";
import { useDocuments } from "../../hooks/useDocuments";
import { documentService } from "../../services/documentService";
import { formatBytes, formatDate } from "../../lib/utils";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const AVATAR_PALETTE = [
  "bg-amber-500 text-white",
  "bg-indigo-500 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-500 text-white",
  "bg-sky-600 text-white",
];

function getDocType(fileName) {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "DOCX";
  if (ext === "xls" || ext === "xlsx") return "XLSX";
  return ext.toUpperCase() || "FICHIER";
}

function getFileIcon(type) {
  if (type === "XLSX" || type === "XLS") {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
        <FileSpreadsheet className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${type === "PDF" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
      <FileText className="w-4 h-4" />
    </div>
  );
}

function getAuteur(doc, usersMap) {
  const known = usersMap?.[doc.uploaded_by_id];
  if (known) return known;
  return {
    nom: `Utilisateur #${doc.uploaded_by_id}`,
    initiales: String(doc.uploaded_by_id).padStart(2, "0"),
    avatarBg: AVATAR_PALETTE[(doc.uploaded_by_id || 0) % AVATAR_PALETTE.length],
  };
}

export default function Ongletdocument({ dossierId, usersMap, onMutated }) {
  const { data: documents = [], loading, error, refetch } = useDocuments(dossierId);

  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isConfidentiel, setIsConfidentiel] = useState(false);
  const [description, setDescription] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sortOrder, setSortOrder] = useState("desc");
  const [editing, setEditing] = useState(null);

  const fileInputRef = useRef(null);

  const handleApiError = (err) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail;
    if (status === 413) {
      setUploadError(`Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo).`);
    } else if (status === 400 || detail) {
      setUploadError(detail || "Type de fichier non supporte.");
    } else {
      setUploadError("Erreur lors de l'upload du fichier.");
    }
  };

  // La selection d'un fichier ne declenche PLUS l'upload : le fichier est mis
  // en attente (pendingFiles) et uploade seulement apres validation dans le
  // panneau de confirmation (ou la description et la confidentialite se
  // reglent avant l'envoi).
  const stageFiles = (files) => {
    setUploadError("");
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const oversizedFile = fileList.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      setUploadError(
        `Le fichier "${oversizedFile.name}" depasse la taille maximale autorisee (${MAX_FILE_SIZE_MB} Mo).`
      );
      return;
    }

    setPendingFiles((prev) => [...prev, ...fileList]);
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of pendingFiles) {
        await documentService.upload(dossierId, {
          fichier: file,
          description,
          confidentiel: isConfidentiel,
        });
      }
      setPendingFiles([]);
      setDescription("");
      await refetch();
      onMutated?.();
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      stageFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      stageFiles(e.dataTransfer.files);
    }
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
  });

  const startEdit = (doc) => {
    setEditing({ id: doc.id, description: doc.description || "", confidentiel: doc.confidentiel });
  };

  const updateEditing = (patch) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await documentService.update(editing.id, {
        description: editing.description,
        confidentiel: editing.confidentiel,
      });
      setEditing(null);
      await refetch();
      onMutated?.();
    } catch {
      setActionError("Erreur lors de la mise a jour du document.");
    }
  };

  // L'endpoint fichier exige le header Bearer : on recupere le blob via l'API
  // puis on ouvre l'object URL dans un nouvel onglet. On libere l'URL une fois
  // que l'onglet a charge le blob pour eviter les fuites memoires.
  const openPreview = async (doc) => {
    try {
      const tab = window.open("", "_blank");
      const response = await documentService.download(doc.id);
      const url = URL.createObjectURL(response.data);
      if (tab) {
        tab.onload = () => URL.revokeObjectURL(url);
        tab.location.href = url;
      } else {
        const win = window.open(url, "_blank");
        if (win) win.onload = () => URL.revokeObjectURL(url);
      }
    } catch {
      setActionError("Impossible d'ouvrir l'apercu du fichier.");
    }
  };

  const downloadFile = async (doc) => {
    try {
      const response = await documentService.download(doc.id);
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nom_fichier;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("Impossible de telecharger le fichier.");
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer le document "${doc.nom_fichier}" ?`)) return;
    try {
      await documentService.remove(doc.id);
      await refetch();
      onMutated?.();
    } catch {
      setActionError("Erreur lors de la suppression du document.");
    }
  };

  return (
    <div className="w-full space-y-4 text-foreground font-sans">
      <div className="w-full space-y-4">
        {/* Zone d'Upload */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
              isDragOver
                ? "border-primary bg-primary/5 scale-[0.99]"
                : "border-border bg-secondary/30 hover:bg-secondary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpeg,.jpg,.png,.gif,.webp"
              multiple
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mb-3">
              PDF, DOCX, XLSX, images - taille maximale {MAX_FILE_SIZE_MB} Mo
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors shadow-sm"
            >
              <FilePlus className="w-4 h-4 text-muted-foreground" />
              Sélectionner un fichier
            </button>
          </div>

          {uploadError && (
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                onClick={() => setUploadError("")}
                className="p-1 hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Panneau de confirmation : les fichiers restent en attente tant que
              la description et la confidentialite ne sont pas validees. */}
          {pendingFiles.length > 0 && (
            <div className="bg-secondary/20 border border-primary/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground">
                  {pendingFiles.length} fichier{pendingFiles.length > 1 ? "s" : ""} en attente de confirmation
                </div>
                <button
                  onClick={() => setPendingFiles([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tout annuler
                </button>
              </div>

              <div className="divide-y divide-border max-h-48 overflow-y-auto">
                {pendingFiles.map((file, i) => {
                  const type = getDocType(file.name);
                  return (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-3 py-2">
                      {getFileIcon(type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{file.name}</div>
                        <div className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</div>
                      </div>
                      <button
                        onClick={() => removePendingFile(i)}
                        title="Retirer"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optionnelle)"
                  className="flex-1 h-9 text-xs bg-background border border-border rounded-md px-3 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <label className="flex items-center gap-2 text-xs text-foreground font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isConfidentiel}
                    onChange={(e) => setIsConfidentiel(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <Shield className="w-3.5 h-3.5 text-amber-500 inline" />
                  Marquer comme confidentiel
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FilePlus className="w-4 h-4" />
                  )}
                  {uploading ? "Upload en cours..." : `Confirmer l'ajout (${pendingFiles.length})`}
                </button>
                <button
                  onClick={() => setPendingFiles([])}
                  disabled={uploading}
                  className="px-4 py-2 bg-background border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {actionError && (
          <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError("")}
              className="p-1 hover:opacity-80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Liste des Documents */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/10">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Documents</h2>
              {!loading && (
                <span className="bg-secondary text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </div>
            <button
              onClick={toggleSort}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background border border-border px-2.5 py-1 rounded-md"
            >
              <span>{sortOrder === "desc" ? "Plus récent" : "Plus ancien"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Loader2 size={24} className="text-muted-foreground mb-2 animate-spin" />
              <p className="text-xs font-medium text-muted-foreground">
                Chargement des documents...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle size={24} className="text-destructive mb-2" />
              <p className="text-xs font-medium text-muted-foreground">{error}</p>
              <button
                onClick={refetch}
                className="text-xs font-semibold text-primary hover:underline mt-2 cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <FileText size={24} className="text-muted-foreground mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                Aucun document disponible
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedDocuments.map((doc) => {
                const type = getDocType(doc.nom_fichier);
                const auteur = getAuteur(doc, usersMap);
                const isEditing = editing?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="p-3 flex items-center justify-between gap-3 transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(type)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-xs text-foreground truncate">
                            {doc.nom_fichier}
                          </span>
                          {doc.confidentiel && (
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" title="Document confidentiel" />
                          )}
                        </div>
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 mt-1.5 min-w-0">
                            <input
                              type="text"
                              value={editing.description}
                              onChange={(e) => updateEditing({ description: e.target.value })}
                              placeholder="Description"
                              className="h-8 text-xs bg-background border border-border rounded-md px-2.5 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[280px]"
                            />
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-[11px] text-foreground font-medium cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={editing.confidentiel}
                                  onChange={(e) => updateEditing({ confidentiel: e.target.checked })}
                                  className="w-3.5 h-3.5 rounded border-border text-primary"
                                />
                                Confidentiel
                              </label>
                              <button onClick={saveEdit} className="text-[11px] font-semibold text-primary hover:underline">
                                Enregistrer
                              </button>
                              <button onClick={() => setEditing(null)} className="text-[11px] text-muted-foreground hover:underline">
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-semibold uppercase">{type}</span>
                            <span>•</span>
                            <span>{formatBytes(doc.taille_octets)}</span>
                            {doc.description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[180px]">{doc.description}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${auteur.avatarBg}`}
                        >
                          {auteur.initiales}
                        </div>
                        <span className="text-foreground font-medium text-xs hidden sm:inline">
                          {auteur.nom}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs hidden md:inline">
                        {formatDate(doc.created_at)}
                      </span>

                      <button
                        onClick={() => openPreview(doc)}
                        title="Ouvrir dans un nouvel onglet"
                        className="flex items-center gap-1 text-xs font-medium text-foreground hover:underline px-1.5 py-0.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Aperçu</span>
                      </button>
                      <button
                        onClick={() => (isEditing ? setEditing(null) : startEdit(doc))}
                        title="Modifier la description"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => downloadFile(doc)}
                        title="Télécharger"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        title="Supprimer"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 bg-secondary/10 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Les documents marqués d'un cadenas sont visibles uniquement par les intervenants du dossier.</span>
          </div>
        </div>
      </div>
    </div>
  );
}