import { useState, useMemo } from "react";
import { Search, X, Plus, Pencil, Trash2, FileText, BookOpen } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useReferentiel } from "../../hooks/useReferentiel";
import { referentielService } from "../../services/referentielService";
import { ROLES } from "../../lib/constants";

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/Table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/Dialog";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Pagination from "../../components/ui/Pagination";

const PAGE_SIZE = 10;

export default function Parametres() {
  const { user } = useAuth();
  const { typesAffaires, specialites, refetch } = useReferentiel();
  const canWrite = user?.role === ROLES.chef_central || user?.role === ROLES.chef_agence;

  const [activeTab, setActiveTab] = useState("type_affaires");

  const [typesSearch, setTypesSearch] = useState("");
  const [specsSearch, setSpecsSearch] = useState("");
  const [typesPage, setTypesPage] = useState(1);
  const [specsPage, setSpecsPage] = useState(1);

  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ libelle: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const typesFiltered = useMemo(() => {
    if (!typesSearch) return typesAffaires;
    const q = typesSearch.toLowerCase();
    return typesAffaires.filter(
      (t) => t.libelle.toLowerCase().includes(q) || t.code?.toLowerCase().includes(q)
    );
  }, [typesSearch, typesAffaires]);

  const specsFiltered = useMemo(() => {
    if (!specsSearch) return specialites;
    const q = specsSearch.toLowerCase();
    return specialites.filter((s) => s.libelle.toLowerCase().includes(q));
  }, [specsSearch, specialites]);

  const typesTotalPages = Math.max(1, Math.ceil(typesFiltered.length / PAGE_SIZE));
  const specsTotalPages = Math.max(1, Math.ceil(specsFiltered.length / PAGE_SIZE));
  const typesPageData = typesFiltered.slice((typesPage - 1) * PAGE_SIZE, typesPage * PAGE_SIZE);
  const specsPageData = specsFiltered.slice((specsPage - 1) * PAGE_SIZE, specsPage * PAGE_SIZE);

  function openCreate(kind) {
    setDialog({ mode: "create", kind });
    setForm({ libelle: "", description: "" });
    setFormError(null);
  }

  function openEdit(kind, item) {
    setDialog({ mode: "edit", kind, item });
    setForm({ libelle: item.libelle, description: item.description || "" });
    setFormError(null);
  }

  function closeDialog() {
    if (submitting) return;
    setDialog(null);
    setFormError(null);
  }

  async function handleSubmit() {
    if (submitting) return;
    const libelle = form.libelle.trim();
    if (!libelle) { setFormError("Le libelle est requis."); return; }

    setFormError(null);
    setSubmitting(true);
    try {
      const kind = dialog.kind;
      if (dialog.mode === "create") {
        if (kind === "type_affaires") {
          await referentielService.createTypeAffaire(libelle);
        } else {
          await referentielService.createSpecialite({ libelle, description: form.description.trim() || null });
        }
      } else {
        if (kind === "type_affaires") {
          await referentielService.updateTypeAffaire(dialog.item.id, { libelle });
        } else {
          await referentielService.updateSpecialite(dialog.item.id, {
            libelle,
            description: form.description.trim() || null,
          });
        }
      }
      setDialog(null);
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  function openDelete(kind, item) {
    setConfirmDelete({ kind, item });
    setDeleteError(null);
  }

  function closeDelete() {
    if (deleting) return;
    setConfirmDelete(null);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (confirmDelete.kind === "type_affaires") {
        await referentielService.deleteTypeAffaire(confirmDelete.item.id);
      } else {
        await referentielService.deleteSpecialite(confirmDelete.item.id);
      }
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      setDeleteError(err.response?.data?.detail || "Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }

  const isEdit = dialog?.mode === "edit";
  const isSpecialite = dialog?.kind === "specialites";

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-20 bg-background">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-0.5">Paramètres</h1>
            <p className="text-sm text-muted-foreground">Configuration du referentiel du cabinet.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="mb-6">
          <TabsList>
            <TabsTrigger value="type_affaires">Types d'affaire</TabsTrigger>
            <TabsTrigger value="specialites">Spécialités</TabsTrigger>
          </TabsList>

          <TabsContent value="type_affaires">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Rechercher un type d'affaire..."
                  value={typesSearch}
                  onChange={(e) => { setTypesSearch(e.target.value); setTypesPage(1); }}
                  className="pl-9 pr-8"
                />
                {typesSearch && (
                  <button
                    onClick={() => { setTypesSearch(""); setTypesPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {typesFiltered.length} type{typesFiltered.length !== 1 ? "s" : ""}
              </p>
              {canWrite && (
                <Button onClick={() => openCreate("type_affaires")} className="ml-auto">
                  <Plus size={16} />
                  Ajouter
                </Button>
              )}
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Libelle</TableHead>
                    {canWrite && <TableHead className="text-right w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typesPageData.map((ta) => (
                    <TableRow key={ta.id}>
                      <TableCell>
                        <Badge variant="outline">{ta.code || "---"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{ta.libelle}</TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit("type_affaires", ta)}
                              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                              aria-label="Modifier"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => openDelete("type_affaires", ta)}
                              className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                              aria-label="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {typesFiltered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <FileText size={24} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Aucun type d'affaire trouve</p>
                <p className="text-xs text-muted-foreground">Modifiez votre recherche ou ajoutez un nouveau type.</p>
              </div>
            )}

            <Pagination page={typesPage} totalPages={typesTotalPages} onPageChange={setTypesPage} />
          </TabsContent>

          <TabsContent value="specialites">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Rechercher une specialite..."
                  value={specsSearch}
                  onChange={(e) => { setSpecsSearch(e.target.value); setSpecsPage(1); }}
                  className="pl-9 pr-8"
                />
                {specsSearch && (
                  <button
                    onClick={() => { setSpecsSearch(""); setSpecsPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {specsFiltered.length} specialite{specsFiltered.length !== 1 ? "s" : ""}
              </p>
              {canWrite && (
                <Button onClick={() => openCreate("specialites")} className="ml-auto">
                  <Plus size={16} />
                  Ajouter
                </Button>
              )}
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libelle</TableHead>
                    <TableHead>Description</TableHead>
                    {canWrite && <TableHead className="text-right w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specsPageData.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium text-foreground">{sp.libelle}</TableCell>
                      <TableCell className="text-muted-foreground">{sp.description || "---"}</TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit("specialites", sp)}
                              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
                              aria-label="Modifier"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => openDelete("specialites", sp)}
                              className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                              aria-label="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {specsFiltered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <BookOpen size={24} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Aucune specialite trouvee</p>
                <p className="text-xs text-muted-foreground">Modifiez votre recherche ou ajoutez une nouvelle specialite.</p>
              </div>
            )}

            <Pagination page={specsPage} totalPages={specsTotalPages} onPageChange={setSpecsPage} />
          </TabsContent>
        </Tabs>

        <Dialog open={!!dialog} onOpenChange={(v) => { if (!v) closeDialog(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEdit ? "Modifier" : "Ajouter"} {isSpecialite ? "une specialite" : "un type d'affaire"}
              </DialogTitle>
              <DialogDescription>
                {isEdit ? "Modifiez les informations puis enregistrez." : "Enregistrer un nouvel element dans le referentiel."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Libelle</label>
                <Input
                  placeholder={isSpecialite ? "Ex: Droit fiscal" : "Ex: Droit commercial"}
                  value={form.libelle}
                  onChange={(e) => { setForm({ ...form, libelle: e.target.value }); setFormError(null); }}
                />
              </div>
              {isSpecialite && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Description optionnelle de la specialite"
                    value={form.description}
                    onChange={(e) => { setForm({ ...form, description: e.target.value }); setFormError(null); }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Le libelle est enregistre en majuscules et doit etre unique.
              </p>
            </div>
            {formError && (
              <div className="mx-6 mb-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {formError}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.libelle.trim()}>
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) closeDelete(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Voulez-vous vraiment supprimer « {confirmDelete?.item?.libelle} » ?
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <div className="mx-6 mb-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {deleteError}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeDelete} disabled={deleting}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
