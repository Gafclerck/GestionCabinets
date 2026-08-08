import {
  ArrowLeft, ChevronRight, User, Home, FileText,
  CheckCircle, MessageSquare, Clock, Repeat,
  Upload, ChevronDown, Lock, FileSpreadsheet, FilePlus, Eye,
  X, AlertCircle, Shield, Maximize2, Download
} from "lucide-react";
import { useState, useRef } from "react";

export default function Ongletdocument() {
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const [documents, setDocuments] = useState([
    {
      id: 1,
      nom: "Pièce identité client.pdf",
      type: "PDF",
      taille: "185 Ko",
      auteur: "Mariama Diallo",
      initiales: "MD",
      date: "14 janv. 2026",
      timestamp: new Date("2026-01-14T09:15:00").getTime(),
      verrou: true,
      url: "#"
    },
    {
      id: 2,
      nom: "Contrat prestation services.docx",
      type: "DOCX",
      taille: "85 Ko",
      auteur: "Aïssatou Ba",
      initiales: "AB",
      date: "15 janv. 2026",
      timestamp: new Date("2026-01-15T14:30:00").getTime(),
      verrou: false,
      url: "#"
    },
    {
      id: 3,
      nom: "Assignation en référé.pdf",
      type: "PDF",
      taille: "249 Ko",
      auteur: "Aïssatou Ba",
      initiales: "AB",
      date: "16 janv. 2026",
      timestamp: new Date("2026-01-16T10:00:00").getTime(),
      verrou: false,
      url: "#"
    },
  ]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfidentiel, setIsConfidentiel] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(documents[1]); // Sélectionne par défaut le contrat DOCX
  const [sortOrder, setSortOrder] = useState("asc");

  const fileInputRef = useRef(null);

  const getDocType = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "pdf") return "PDF";
    if (ext === "doc" || ext === "docx") return "DOCX";
    if (ext === "xls" || ext === "xlsx") return "XLSX";
    return ext.toUpperCase();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Ko";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i];
  };

  const processFiles = (files) => {
    setUploadError("");
    const fileList = Array.from(files);

    const oversizedFile = fileList.find(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      setUploadError(
        `Le fichier "${oversizedFile.name}" dépasse la taille maximale autorisée (${MAX_FILE_SIZE_MB} Mo).`
      );
      return;
    }

    const newDocs = fileList.map((file, index) => {
      const type = getDocType(file.name);
      const taille = formatFileSize(file.size);
      const now = new Date();
      const options = { day: "numeric", month: "short", year: "numeric" };
      const dateFormatted = now.toLocaleDateString("fr-FR", options);
      const fileBlobUrl = URL.createObjectURL(file);

      return {
        id: Date.now() + index,
        nom: file.name,
        type: type,
        taille: taille,
        auteur: "Utilisateur",
        initiales: "UT",
        date: dateFormatted,
        timestamp: now.getTime(),
        verrou: isConfidentiel,
        url: fileBlobUrl
      };
    });

    setDocuments((prev) => [...newDocs, ...prev]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
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
      processFiles(e.dataTransfer.files);
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => (prev === "desc" ? "asc" : "desc"));
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    return sortOrder === "desc" 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp;
  });

  const getFileIcon = (type) => {
    if (type === "PDF") {
      return (
        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (type === "DOCX" || type === "DOC") {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (type === "XLSX" || type === "XLS") {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 text-foreground font-sans">
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        
        {/* Colonne Gauche: Zone Upload + Liste des Documents */}
        <div className={`w-full space-y-4 transition-all ${selectedDocForPreview ? "lg:w-7/12" : "w-full"}`}>
          
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
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mb-3">
                PDF, DOCX, XLSX — taille maximale {MAX_FILE_SIZE_MB} Mo
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

            <div className="flex items-center justify-between pt-1 px-1">
              <label className="flex items-center gap-2 text-xs text-foreground font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isConfidentiel}
                  onChange={(e) => setIsConfidentiel(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <Shield className="w-3.5 h-3.5 text-amber-500 inline" />
                Marquer le(s) nouveau(x) fichier(s) comme confidentiel(s)
              </label>
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
          </div>

          {/* Liste des Documents */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Documents
                </h2>
                <span className="bg-secondary text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              </div>
              <button
                onClick={toggleSort}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background border border-border px-2.5 py-1 rounded-md"
              >
                <span>{sortOrder === "desc" ? "Plus récent" : "Plus ancien"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
              </button>
            </div>

            {sortedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <FileText size={24} className="text-muted-foreground mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  Aucun document disponible
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedDocuments.map((doc) => {
                  const isSelected = selectedDocForPreview?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocForPreview(doc)}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected 
                          ? "bg-secondary/80 border-l-4 border-l-primary" 
                          : "hover:bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(doc.type)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-xs text-foreground truncate">
                              {doc.nom}
                            </span>
                            {doc.verrou && (
                              <Lock className="w-3 h-3 text-amber-500 shrink-0" title="Document confidentiel" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-semibold uppercase">{doc.type}</span>
                            <span>•</span>
                            <span>{doc.taille}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[9px]">
                            {doc.initiales}
                          </div>
                          <span className="text-foreground font-medium text-xs hidden sm:inline">
                            {doc.auteur}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs hidden md:inline">{doc.date}</span>
                        
                        {/* Bouton Aperçu activé pour tous les documents */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocForPreview(doc);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-foreground hover:underline px-1.5 py-0.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Aperçu</span>
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

        {/* Colonne Droite: Aperçu Inline */}
        {selectedDocForPreview && (
          <div className="w-full lg:w-5/12 bg-card rounded-xl border border-border flex flex-col h-[600px] sticky top-4 shadow-sm">
            <div className="p-3 border-b border-border flex items-center justify-between bg-secondary/10">
              <div className="flex items-center gap-2.5 min-w-0">
                {getFileIcon(selectedDocForPreview.type)}
                <div className="min-w-0">
                  <h3 className="font-semibold text-xs text-foreground truncate">
                    {selectedDocForPreview.nom}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDocForPreview.type} • {selectedDocForPreview.taille}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Zone Visuelle de l'Aperçu */}
            <div className="flex-1 bg-secondary/20 p-4 overflow-y-auto flex flex-col items-center">
              <div className="w-full max-w-md bg-background border border-border rounded-sm shadow-sm p-6 min-h-[420px] flex flex-col justify-between text-xs space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                      {selectedDocForPreview.type} Preview
                    </span>
                    <span className="text-[10px] text-muted-foreground">{selectedDocForPreview.nom}</span>
                  </div>
                  
                  <div className="h-3 bg-secondary rounded w-3/4"></div>
                  <div className="h-2 bg-secondary/60 rounded w-full"></div>
                  <div className="h-2 bg-secondary/60 rounded w-5/6"></div>
                  <div className="h-2 bg-secondary/60 rounded w-4/6 mb-6"></div>

                  <div className="space-y-2 pt-4">
                    <div className="h-2 bg-secondary/60 rounded w-full"></div>
                    <div className="h-2 bg-secondary/60 rounded w-full"></div>
                    <div className="h-2 bg-secondary/60 rounded w-2/3"></div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-muted-foreground pt-8">
                  Page 1
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border bg-card flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">
                Déposé par {selectedDocForPreview.auteur} • {selectedDocForPreview.date}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 bg-background border border-border rounded text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <Maximize2 className="w-3 h-3" />
                  Plein écran
                </button>
                <button 
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 bg-background border border-border rounded text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <Download className="w-3 h-3" />
                  Télécharger
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}