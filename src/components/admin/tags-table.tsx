"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  _count: {
    prompts: number;
  };
}

interface TagsTableProps {
  tags: Tag[];
}

export function TagsTable({ tags }: TagsTableProps) {
  const router = useRouter();
  const t = useTranslations("admin.tags");
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<"name" | "slug" | "color" | "prompts">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState({ name: "", slug: "", color: "#6366f1" });

  const openCreateDialog = () => {
    setFormData({ name: "", slug: "", color: "#6366f1" });
    setIsCreating(true);
  };

  const openEditDialog = (tag: Tag) => {
    setFormData({
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
    });
    setEditTag(tag);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = editTag ? `/api/admin/tags/${editTag.id}` : "/api/admin/tags";
      const method = editTag ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(editTag ? t("updated") : t("created"));
      router.refresh();
      setEditTag(null);
      setIsCreating(false);
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tags/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success(t("deleted"));
      router.refresh();
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const sortedTags = useMemo(() => {
    const list = [...tags];
    list.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      if (sortField === "prompts") {
        aValue = a._count.prompts;
        bValue = b._count.prompts;
      } else {
        aValue = (a[sortField] as string).toLowerCase();
        bValue = (b[sortField] as string).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [sortDirection, sortField, tags]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? sortedTags.map((t) => t.id) : []);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(t("deleteConfirmTitle"))) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          fetch(`/api/admin/tags/${id}`, {
            method: "DELETE",
          }).then((res) => {
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(t("deleteConfirmTitle"))) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          fetch(`/api/admin/tags/${id}`, {
            method: "DELETE",
          }).then((res) => {
            if (!res.ok) throw new Error(`Failed to delete ${id}`);
            return id;
          })
        )
      );

      const succeeded = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      const failed = results.filter((r) => r.status === "rejected").length;

      setSelectedIds((prev) => prev.filter((id) => !succeeded.includes(id)));

      if (failed > 0) {
        toast.error(t("bulkDeletePartialFail", { failed, succeeded: succeeded.length }));
      } else {
        toast.success(t("deleted"));
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </Button>
          )}
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  aria-label="select all tags"
                  checked={selectedIds.length > 0 && selectedIds.length === sortedTags.length}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                  className="h-4 w-4"
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>{t("name")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("slug")}>{t("slug")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("color")}>{t("color")}</TableHead>
              <TableHead className="text-center cursor-pointer" onClick={() => toggleSort("prompts")}>{t("prompts")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t("noTags")}
                </TableCell>
              </TableRow>
            ) : (
              sortedTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`select ${tag.name}`}
                      checked={selectedIds.includes(tag.id)}
                      onChange={() => toggleSelect(tag.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium"
                      style={{ backgroundColor: tag.color + "20", color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tag.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-muted-foreground">{tag.color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{tag._count.prompts}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(tag.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editTag} onOpenChange={() => { setIsCreating(false); setEditTag(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTag ? t("editTitle") : t("createTitle")}</DialogTitle>
            <DialogDescription>{editTag ? t("editDescription") : t("createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">{t("slug")}</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">{t("color")}</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditTag(null); }}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.name || !formData.slug}>
              {editTag ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
