"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  File,
  FilePlus,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  AlertCircle,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseSkillFiles,
  serializeSkillFiles,
  getLanguageFromFilename,
  validateFilename,
  suggestFilename,
  DEFAULT_SKILL_FILE,
  type SkillFile,
} from "@/lib/skill-files";

// ---------------------------------------------------------------------------
// Drag-and-drop constants
// ---------------------------------------------------------------------------

/** Maximum number of files allowed in a dropped folder (pre-flight guard). */
const DROP_MAX_FILES = 100;

/** Maximum total size (bytes) of all files in a dropped folder (5 MB). */
const DROP_MAX_BYTES = 5 * 1024 * 1024;

/** File extensions accepted from a dropped folder. */
const ALLOWED_DROP_EXTENSIONS = new Set([
  ".md",
  ".yml",
  ".yaml",
  ".py",
  ".ts",
  ".tsx",
  ".json",
  ".js",
  ".jsx",
  ".mjs",
  ".go",
  ".html",
  ".css",
  ".txt",
  ".csv",
  ".sh",
  ".bat",
  ".ini",
  ".env",
  ".toml",
  ".xml",
  ".rs",
  ".mojo",
]);

// ---------------------------------------------------------------------------
// Drag-and-drop helpers
// ---------------------------------------------------------------------------

/** Return the lowercased file extension including the dot, or "" if none. */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === 0) return "";
  return filename.slice(dot).toLowerCase();
}

interface CollectedFile {
  file: File;
  /** Full path relative to the DataTransferItem root (includes root folder name). */
  relativePath: string;
}

type DropProcessingErrorCode = "LIMIT_EXCEEDED" | "NO_VALID_FILES";

class DropProcessingError extends Error {
  constructor(public readonly code: DropProcessingErrorCode) {
    super(code);
    this.name = "DropProcessingError";
  }
}

function isRootSkillFile(filename: string): boolean {
  return (
    !filename.includes("/") &&
    filename.toLowerCase() === DEFAULT_SKILL_FILE.toLowerCase()
  );
}

/**
 * Process dropped items (files or folders) and return skill files.
 * @param items - DataTransferItem array from drop event
 * @returns Promise resolving to processed skill files
 * @throws Error if processing fails (handled by caller)
 */
export async function processDroppedItems(items: DataTransferItemList): Promise<SkillFile[]> {
  // Collect all valid files from dropped items
  const collected: CollectedFile[] = [];
  const counters = { files: 0, bytes: 0 };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "file") continue;
    
    const entry = item.webkitGetAsEntry?.();
    if (!entry) continue;

    try {
      await collectEntries(entry, collected, counters);
    } catch (err) {
      if (err instanceof DropProcessingError) {
        throw err;
      }
      throw err;
    }
  }

  // Check if we have any valid files
  if (collected.length === 0) {
    throw new DropProcessingError("NO_VALID_FILES");
  }

  // Filter by allowed extensions.
  const validFiles = collected.filter(({ file }) => {
    const ext = getExtension(file.name);
    // For dotfiles like ".env" getExtension returns ""; fall back to
    // checking the whole filename (lowercased) against the allowed set.
    return ext !== "" ? ALLOWED_DROP_EXTENSIONS.has(ext) : ALLOWED_DROP_EXTENSIONS.has(file.name.toLowerCase());
  });

  if (validFiles.length === 0) {
    throw new DropProcessingError("NO_VALID_FILES");
  }

  // Read contents in parallel.
  const skillFiles: SkillFile[] = await Promise.all(
    validFiles.map(async ({ file, relativePath }) => {
      // Determine filename - for single files, use the filename directly
      // For folder items, strip only the root folder name and preserve nesting
      let filename = file.name;

      if (relativePath.startsWith("/")) {
        const pathParts = relativePath.split("/").filter((part) => part !== "");
        const withoutRoot = pathParts.slice(1).join("/");
        filename = withoutRoot || pathParts[0] || file.name;
      }

      // Map SKILL.md (if present) → DEFAULT_SKILL_FILE constant.
      const normalizedFilename =
        isRootSkillFile(filename)
          ? DEFAULT_SKILL_FILE
          : filename;

      const content = await file.text();
      return { filename: normalizedFilename, content };
    })
  );

  // Ensure SKILL.md is always present (add empty one if not dropped).
  const hasSkillMd = skillFiles.some(
    (f) => f.filename === DEFAULT_SKILL_FILE
  );
  if (!hasSkillMd) {
    skillFiles.unshift({ filename: DEFAULT_SKILL_FILE, content: "" });
  }

  return skillFiles;
}

/**
 * Recursively collect all File objects from a FileSystemDirectoryEntry.
 * Mutates `result`, `totalFiles`, and `totalBytes` counters and throws a
 * `LIMIT_EXCEEDED` as soon as a limit is breached so we can
 * bail out of the recursion early without reading any file contents.
 */
async function collectEntries(
  entry: FileSystemEntry,
  result: CollectedFile[],
  counters: { files: number; bytes: number }
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject)
    );

    counters.files += 1;
    counters.bytes += file.size;

    if (counters.files > DROP_MAX_FILES || counters.bytes > DROP_MAX_BYTES) {
      throw new DropProcessingError("LIMIT_EXCEEDED");
    }

    result.push({ file, relativePath: entry.fullPath });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();

    // readEntries may return results in batches; keep reading until empty.
    let batch: FileSystemEntry[] = [];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject)
      );
      for (const child of batch) {
        await collectEntries(child, result, counters);
      }
    } while (batch.length > 0);
  }
}

interface SkillEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Tree node type for folder structure
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

// Build a tree structure from flat file paths
function buildFileTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.filename.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isFolder: !isLastPart,
          children: [],
        };
        currentLevel.push(existing);
      }

      if (!isLastPart) {
        currentLevel = existing.children;
      }
    }
  }

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .map((n) => ({ ...n, children: sortNodes(n.children) }))
      .sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  return sortNodes(root);
}

// Recursive tree node component
interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  activeFile: string;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  t: (key: string) => string;
}

function TreeNodeItem({
  node,
  depth,
  activeFile,
  expandedFolders,
  onToggleFolder,
  onOpenFile,
  onDeleteFile,
  t,
}: TreeNodeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = activeFile === node.path;
  const paddingLeft = depth * 12;

  if (node.isFolder) {
    return (
      <div>
        <div
          className={cn(
            "group flex items-center gap-1 py-1 rounded-md cursor-pointer text-sm transition-colors hover:bg-muted"
          )}
          style={{ paddingLeft: `${paddingLeft + 4}px` }}
          onClick={() => onToggleFolder(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
        </div>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
                onDeleteFile={onDeleteFile}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <div
      className={cn(
        "group flex items-center gap-1 py-1 rounded-md cursor-pointer text-sm transition-colors",
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
      )}
      style={{ paddingLeft: `${paddingLeft + 4}px` }}
      onClick={() => onOpenFile(node.path)}
    >
      <span className="w-3 shrink-0" /> {/* Spacer for alignment */}
      <File className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
      {node.path !== DEFAULT_SKILL_FILE && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFile(node.path);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity mr-1"
          title={t("deleteFile")}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      )}
    </div>
  );
}

export function SkillEditor({ value, onChange, className }: SkillEditorProps) {
  const t = useTranslations("prompts");
  const tCommon = useTranslations("common");
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Parse files from the serialized content
  const [files, setFiles] = useState<SkillFile[]>(() => parseSkillFiles(value));
  const [activeFile, setActiveFile] = useState<string>(DEFAULT_SKILL_FILE);
  const [openTabs, setOpenTabs] = useState<string[]>([DEFAULT_SKILL_FILE]);

  // Dialog states
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [filenameError, setFilenameError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Expanded folders state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);
  // Track nested drag events so dragLeave doesn't fire on child elements
  const dragCounterRef = useRef(0);
  const lastEmittedValueRef = useRef(value);

  // Build tree structure from files
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  // Toggle folder expansion
  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  // Get the active file's content and language
  const activeFileData = useMemo(
    () => files.find((f) => f.filename === activeFile),
    [files, activeFile]
  );
  const activeLanguage = useMemo(
    () => getLanguageFromFilename(activeFile),
    [activeFile]
  );

  // Debounced onChange to parent
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedOnChange = useCallback(
    (newFiles: SkillFile[]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        const serialized = serializeSkillFiles(newFiles);
        lastEmittedValueRef.current = serialized;
        onChange(serialized);
      }, 300);
    },
    [onChange]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Serialize and propagate changes to parent (debounced)
  const updateFiles = useCallback(
    (newFiles: SkillFile[]) => {
      setFiles(newFiles);
      debouncedOnChange(newFiles);
    },
    [debouncedOnChange]
  );

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (newContent: string | undefined) => {
      const content = newContent || "";
      const newFiles = files.map((f) =>
        f.filename === activeFile ? { ...f, content } : f
      );
      updateFiles(newFiles);
    },
    [files, activeFile, updateFiles]
  );

  // Open a file in a tab
  const openFile = useCallback((filename: string) => {
    setActiveFile(filename);
    setOpenTabs((prev) =>
      prev.includes(filename) ? prev : [...prev, filename]
    );
  }, []);

  // Close a tab
  const closeTab = useCallback(
    (filename: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (filename === DEFAULT_SKILL_FILE) return; // Can't close SKILL.md

      setOpenTabs((prev) => {
        const newTabs = prev.filter((f) => f !== filename);
        if (activeFile === filename) {
          setActiveFile(newTabs[newTabs.length - 1] || DEFAULT_SKILL_FILE);
        }
        return newTabs;
      });
    },
    [activeFile]
  );

  // Add a new file
  const handleAddFile = useCallback(() => {
    const suggestion = suggestFilename(files.map((f) => f.filename));
    setNewFilename(suggestion);
    setFilenameError(null);
    setShowNewFileDialog(true);
  }, [files]);

  const confirmAddFile = useCallback(() => {
    const errorCode = validateFilename(
      newFilename,
      files.map((f) => f.filename)
    );
    if (errorCode) {
      // Translate error code
      setFilenameError(t(`validation.${errorCode}`));
      return;
    }

    const trimmed = newFilename.trim();
    const newFiles = [...files, { filename: trimmed, content: "" }];
    updateFiles(newFiles);
    openFile(trimmed);
    setShowNewFileDialog(false);
    setNewFilename("");
  }, [newFilename, files, updateFiles, openFile, t]);

  // Delete a file
  const handleDeleteFile = useCallback((filename: string) => {
    if (filename === DEFAULT_SKILL_FILE) return;
    setFileToDelete(filename);
  }, []);

  const confirmDeleteFile = useCallback(() => {
    if (!fileToDelete || fileToDelete === DEFAULT_SKILL_FILE) return;

    const newFiles = files.filter((f) => f.filename !== fileToDelete);
    updateFiles(newFiles);
    closeTab(fileToDelete);
    setFileToDelete(null);
  }, [fileToDelete, files, updateFiles, closeTab]);

  // Re-parse only on external value changes.
  useEffect(() => {
    if (value === lastEmittedValueRef.current) {
      return;
    }

    const parsed = parseSkillFiles(value);
    const parsedFilenames = new Set(parsed.map((file) => file.filename));

    setFiles(parsed);
    setActiveFile((current) =>
      parsedFilenames.has(current) ? current : DEFAULT_SKILL_FILE
    );
    setOpenTabs((currentTabs) => {
      const nextTabs = currentTabs.filter((tab) => parsedFilenames.has(tab));
      return nextTabs.length > 0 ? nextTabs : [DEFAULT_SKILL_FILE];
    });
    lastEmittedValueRef.current = value;
  }, [value]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragOver(false);
        setDropError(null);

        const items = e.dataTransfer.items;
        if (items.length === 0) return;

        // Process dropped items (files or folders)
        setIsProcessingDrop(true);
        try {
          const skillFiles = await processDroppedItems(items);
          
          // Replace all existing files.
          updateFiles(skillFiles);
          // Reset tab state to SKILL.md.
          setActiveFile(DEFAULT_SKILL_FILE);
          setOpenTabs([DEFAULT_SKILL_FILE]);
          // Expand top-level folders automatically (if we have folder structure)
          const topLevelFolders = new Set(
            skillFiles
              .map((f) => {
                const parts = f.filename.split("/");
                return parts.length > 1 ? parts[0] : null;
              })
              .filter((p): p is string => p !== null)
          );
          setExpandedFolders(topLevelFolders);
        } catch (err) {
          if (err instanceof DropProcessingError) {
            if (err.code === "LIMIT_EXCEEDED") {
              setDropError(t("dropErrorTooLarge"));
            } else if (err.code === "NO_VALID_FILES") {
              setDropError(t("dropErrorNoValidFiles"));
            }
          } else {
            setDropError(t("dropErrorGeneric"));
          }
        } finally {
          setIsProcessingDrop(false);
        }
      },
      [t, updateFiles]
    );

  return (
    <div
      className={cn(
        "flex border rounded-lg overflow-hidden bg-background relative",
        className
      )}
      style={{ height: "500px" }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 border-2 border-dashed border-primary rounded-lg pointer-events-none"
        >
          <UploadCloud className="h-10 w-10 text-primary" />
          <p className="text-sm font-medium text-primary">{t("dropFolderHere")}</p>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessingDrop && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 rounded-lg pointer-events-none"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("dropProcessing")}</p>
        </div>
      )}

      {/* Drop error overlay */}
      {dropError && (
        <div
          role="alert"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/95 rounded-lg p-6"
        >
          <AlertCircle className="h-10 w-10 text-destructive shrink-0" aria-hidden="true" />
          <p className="text-center text-sm font-medium text-destructive max-w-xs">
            {dropError}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDropError(null)}
          >
            {tCommon("close")}
          </Button>
        </div>
      )}

      {/* Sidebar - File Tree */}
      <div
        className={cn(
          "w-56 border-r bg-muted/30 flex flex-col transition-colors",
          isDragOver && "bg-primary/5"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-primary" />
            <span>{t("skillFiles")}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleAddFile}
            title={t("addFile")}
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {fileTree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onOpenFile={openFile}
              onDeleteFile={handleDeleteFile}
              t={t}
            />
          ))}
        </div>

        {/* Sidebar Footer - File Count */}
        <div className="px-3 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
          <div>{files.length} {files.length === 1 ? t("file") : t("files")}</div>
          <div className="mt-0.5 text-[10px] opacity-60 leading-tight">{t("dropHint")}</div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="flex items-center border-b bg-muted/30 overflow-x-auto">
          {openTabs.map((filename) => (
            <div
              key={filename}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 border-r cursor-pointer text-xs font-mono transition-colors whitespace-nowrap",
                activeFile === filename
                  ? "bg-background border-b-2 border-b-primary -mb-px"
                  : "bg-muted/50 hover:bg-muted"
              )}
              onClick={() => setActiveFile(filename)}
            >
              <File className="h-4 w-4 text-muted-foreground" />
              <span className="max-w-[120px] truncate">{filename}</span>
              {filename !== DEFAULT_SKILL_FILE && (
                <button
                  onClick={(e) => closeTab(filename, e)}
                  className="ml-1 p-0.5 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={activeLanguage}
            value={activeFileData?.content || ""}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              wrappingIndent: "indent",
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 8, bottom: 8 },
              renderLineHighlight: "line",
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addNewFile")}</DialogTitle>
            <DialogDescription>{t("addNewFileDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFilename}
              onChange={(e) => {
                setNewFilename(e.target.value);
                setFilenameError(null);
              }}
              placeholder="filename.ext"
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  confirmAddFile();
                }
              }}
              autoFocus
            />
            {filenameError && (
              <p className="text-sm text-destructive mt-2">{filenameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFileDialog(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirmAddFile}>{t("addFile")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteFileConfirm")}</DialogTitle>
            <DialogDescription>
              {t("deleteFileDescription", { filename: fileToDelete || "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToDelete(null)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFile}>
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
