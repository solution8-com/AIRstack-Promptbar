import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDroppedItems } from "./skill-editor";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("lucide-react", () => ({
  File: () => null,
  FilePlus: () => null,
  Trash2: () => null,
  X: () => null,
  ChevronRight: () => null,
  ChevronDown: () => null,
  Folder: () => null,
  FolderOpen: () => null,
  AlertCircle: () => null,
  UploadCloud: () => null,
}));

const createMockFile = (name: string, content: string): File => {
  const file = new File([content], name, { type: "text/plain" });
  Object.defineProperty(file, "text", {
    value: async () => content,
  });
  return file;
};

const createMockFileEntry = (
  fullPath: string,
  file: File
): FileSystemFileEntry =>
  ({
    isFile: true,
    isDirectory: false,
    name: file.name,
    fullPath,
    filesystem: {} as FileSystem,
    file: (success: (file: File) => void) => success(file),
  }) as unknown as FileSystemFileEntry;

const createMockDirectoryEntry = (
  fullPath: string,
  entries: FileSystemEntry[]
): FileSystemDirectoryEntry => {
  let consumed = false;
  return {
    isFile: false,
    isDirectory: true,
    name: fullPath.split("/").filter(Boolean).pop() ?? "",
    fullPath,
    filesystem: {} as FileSystem,
    createReader: () =>
      ({
        readEntries: (success: (entries: FileSystemEntry[]) => void) => {
          if (consumed) {
            success([]);
            return;
          }
          consumed = true;
          success(entries);
        },
      }) as FileSystemDirectoryReader,
  } as unknown as FileSystemDirectoryEntry;
};

const createMockItem = (entry: FileSystemEntry): DataTransferItem =>
  ({
    kind: "file",
    webkitGetAsEntry: () => entry,
  }) as unknown as DataTransferItem;

const createMockDataTransferItemList = (
  items: DataTransferItem[]
): DataTransferItemList => {
  const list = {
    length: items.length,
    item: (index: number): DataTransferItem | null => items[index] || null,
    [Symbol.iterator]: () => {
      let index = 0;
      return {
        next() {
          if (index < items.length) {
            return { value: items[index++], done: false };
          }
          return { done: true };
        },
      };
    },
  };

  items.forEach((item, index) => {
    (
      list as unknown as {
        [index: number]: DataTransferItem;
      }
    )[index] = item;
  });

  return list as unknown as DataTransferItemList;
};

describe("processDroppedItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process a single valid file", async () => {
    const file = createMockFile("test.md", "# Test Skill\n\nThis is a test.");
    const item = createMockItem(createMockFileEntry("/test.md", file));
    const items = createMockDataTransferItemList([item]);

    const result = await processDroppedItems(items);

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.filename)).toEqual(["SKILL.md", "test.md"]);
    expect(result.find((f) => f.filename === "test.md")?.content).toBe(
      "# Test Skill\n\nThis is a test."
    );
  });

  it("should process folder drops and preserve nested paths", async () => {
    const skill = createMockFile("skill.md", "# Skill\n\nContent");
    const script = createMockFile("script.py", "print('hello')");
    const config = createMockFile("config.json", '{"key":"value"}');

    const scriptsDir = createMockDirectoryEntry("/testfolder/scripts", [
      createMockFileEntry("/testfolder/scripts/script.py", script),
    ]);

    const rootDir = createMockDirectoryEntry("/testfolder", [
      createMockFileEntry("/testfolder/skill.md", skill),
      scriptsDir,
      createMockFileEntry("/testfolder/config.json", config),
    ]);

    const item = createMockItem(rootDir);
    const items = createMockDataTransferItemList([item]);
    const result = await processDroppedItems(items);
    const filenames = result.map((f) => f.filename);

    expect(filenames).toContain("SKILL.md");
    expect(filenames).toContain("scripts/script.py");
    expect(filenames).toContain("config.json");
    expect(result).toHaveLength(3);
  });

  it("should throw NO_VALID_FILES for invalid file extensions", async () => {
    const file = createMockFile("test.exe", "binary");
    const item = createMockItem(createMockFileEntry("/test.exe", file));
    const items = createMockDataTransferItemList([item]);

    await expect(processDroppedItems(items)).rejects.toMatchObject({
      message: "NO_VALID_FILES",
    });
  });

  it("should throw LIMIT_EXCEEDED when file count exceeds limit", async () => {
    const items = createMockDataTransferItemList(
      Array.from({ length: 101 }, (_, i) => {
        const file = createMockFile(`file${i}.md`, `Content ${i}`);
        return createMockItem(createMockFileEntry(`/file${i}.md`, file));
      })
    );

    await expect(processDroppedItems(items)).rejects.toMatchObject({
      message: "LIMIT_EXCEEDED",
    });
  });

  it("should throw LIMIT_EXCEEDED when total size exceeds limit", async () => {
    const largeFile = createMockFile("large.md", "x".repeat(6 * 1024 * 1024));
    const item = createMockItem(createMockFileEntry("/large.md", largeFile));
    const items = createMockDataTransferItemList([item]);

    await expect(processDroppedItems(items)).rejects.toMatchObject({
      message: "LIMIT_EXCEEDED",
    });
  });

  it("should add SKILL.md automatically when missing", async () => {
    const script = createMockFile("script.js", "console.log('hello');");
    const item = createMockItem(createMockFileEntry("/script.js", script));
    const items = createMockDataTransferItemList([item]);

    const result = await processDroppedItems(items);
    expect(result.map((f) => f.filename)).toEqual(["SKILL.md", "script.js"]);
  });
});
