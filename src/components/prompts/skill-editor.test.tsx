import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDroppedItems } from "./skill-editor";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      dropFolderHere: "Drop folder here",
      dropProcessing: "Processing drop...",
      dropErrorTooLarge: "Too many files or too large",
      dropErrorNoValidFiles: "No valid files found",
      dropErrorGeneric: "Error processing drop",
      skillFiles: "Skill Files",
      addFile: "Add File",
      deleteFile: "Delete File",
      addNewFile: "Add New File",
      addNewFileDescription: "Create a new file",
      deleteFileConfirm: "Delete file?",
      deleteFileDescription: "Are you sure you want to delete {filename}?",
      validationFilenameEmpty: "Filename cannot be empty",
      validationFilenameInvalidChars: "Filename contains invalid characters",
      validationPathStartEndSlash: "Filename cannot start or end with slash",
      validationPathConsecutiveSlashes: "Filename cannot contain consecutive slashes",
      validationPathContainsDotDot: "Filename cannot contain '..'",
      validationFilenameReserved: "Filename is reserved",
      validationFilenameDuplicate: "Filename already exists",
      validationPathTooLong: "Filename too long",
      cancel: "Cancel",
      close: "Close",
      delete: "Delete",
    };
    return translations[key] || key;
  },
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

// Interface for collected files (matches the one in skill-editor.tsx)
interface CollectedFile {
  file: File;
  /** Full path relative to the DataTransferItem root (includes root folder name). */
  relativePath: string;
}

describe("processDroppedItems", () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      dropErrorTooLarge: "Too many files or too large",
      dropErrorNoValidFiles: "No valid files found",
      dropErrorGeneric: "Error processing drop",
    };
    return translations[key] || key;
  };

  // Helper to create a mock File
  const createMockFile = (name: string, content: string): File => {
    const file = new File([content], name, { type: "text/plain" });
    // Mock the text() method that returns a promise resolving to the content
    (file as unknown as { text: () => Promise<string> }).text = async () => content;
    return file;
  };

  // Helper to create a mock DataTransferItem
  const createMockItem = (file: File) => {
    const entry = {
      isFile: true,
      isDirectory: false,
      fullPath: `/${file.name}`,
      file: (success: (file: File) => void, error: (error: Error) => void) => {
        success(file);
      },
    };

    return {
      kind: "file" as const,
      webkitGetAsEntry: () => entry,
    } as unknown as DataTransferItem;
  };

  // Helper to create a mock DataTransferItemList
  const createMockDataTransferItemList = (items: DataTransferItem[]): DataTransferItemList => {
    const list = {
      length: items.length,
      item: (index: number): DataTransferItem | null => {
        return items[index] || null;
      },
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

    // Add indexed access
    items.forEach((item, index) => {
      (list as unknown as {[index: number]: DataTransferItem})[index] = item;
    });

    return list as unknown as DataTransferItemList;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process a single valid file", async () => {
    const file = createMockFile("test.md", "# Test Skill\n\nThis is a test.");
    const item = createMockItem(file);
    const items = createMockDataTransferItemList([item]);

    const result = await processDroppedItems(items, mockT);

    // Should have the file plus auto-added SKILL.md
    expect(result).toHaveLength(2);
    
    // Check that the original file is present
    const testFile = result.find(f => f.filename === "test.md");
    expect(testFile).toBeDefined();
    expect(testFile?.content).toBe("# Test Skill\n\nThis is a test.");
    
    // Check that SKILL.md was added automatically
    const skillFile = result.find(f => f.filename === "SKILL.md");
    expect(skillFile).toBeDefined();
    expect(skillFile?.content).toBe("");
  });

  it("should process a folder with multiple valid files", async () => {
    // Create mock files
    const file1 = createMockFile("skill.md", "# Skill\n\nContent");
    const file2 = createMockFile("script.py", "print('hello')");
    const file3 = createMockFile("config.json", '{"key": "value"}');
    
    // Instead of mocking the complex FileSystemEntry hierarchy,
    // we'll mock the collectEntries function directly to simulate 
    // what would happen when processing a folder with 3 files
    const originalCollectEntries = (processDroppedItems as any).__collectEntries;
    
    // Mock collectEntries to simulate processing a directory with 3 files
    (processDroppedItems as any).__collectEntries = async (
      entry: FileSystemEntry,
      result: CollectedFile[],
      counters: { files: number; bytes: number }
    ) => {
      // Simulate finding 3 files in the directory by adding them to result
      result.push({ file: file1, relativePath: "/testfolder/skill.md" });
      result.push({ file: file2, relativePath: "/testfolder/script.py" });
      result.push({ file: file3, relativePath: "/testfolder/config.json" });
    };
    
    try {
      // Create a mock item that represents a directory
      // We only need to mock what's actually accessed in the code
      const dirEntry = {
        isFile: false,
        isDirectory: true,
        fullPath: "/testfolder",
        createReader: () => ({
          // We'll mock this to return batches, but since we're mocking collectEntries,
          // the actual implementation won't be called. We still need to provide it
          // to avoid errors in the type checking.
          readEntries: () => Promise.resolve([] as FileSystemEntry[])
        })
      }) as unknown as FileSystemEntry;
      
      const item = {
        kind: "file",
        webkitGetAsEntry: () => dirEntry,
      } as unknown as DataTransferItem;
      
      const items = createMockDataTransferItemList([item]);
      
      const result = await processDroppedItems(items, mockT);
      
      // Should have 3 files plus an auto-added SKILL.md
      expect(result).toHaveLength(4);
      
      // Check that all original files are present
      const filenames = result.map(f => f.filename);
      expect(filenames).toContain("skill.md");
      expect(filenames).toContain("script.py");
      expect(filenames).toContain("config.json");
      
      // Check that SKILL.md was added automatically
      expect(filenames).toContain("SKILL.md");
      
      // Check contents
      const skillFile = result.find(f => f.filename === "skill.md");
      expect(skillFile?.content).toBe("# Skill\n\nContent");
      
      const scriptFile = result.find(f => f.filename === "script.py");
      expect(scriptFile?.content).toBe("print('hello')");
      
      const configFile = result.find(f => f.filename === "config.json");
      expect(configFile?.content).toBe('{"key": "value"}');
    } finally {
      // Restore the original function
      (processDroppedItems as any).__collectEntries = originalCollectEntries;
    }
  });

  it("should throw error for invalid file extensions", async () => {
    const file = createMockFile("test.exe", "binary content");
    const item = createMockItem(file);
    const items = createMockDataTransferItemList([item]);

    await expect(processDroppedItems(items, mockT)).rejects.toThrow("No valid files found");
  });

  it("should throw error when file count exceeds limit", async () => {
    // Create 101 files to exceed DROP_MAX_FILES (100)
    const files = Array.from({ length: 101 }, (_, i) => 
      createMockFile(`file${i}.md`, `Content ${i}`)
    );
    
    const items = files.map(createMockItem);
    const dataTransferList = createMockDataTransferItemList(items);

    await expect(processDroppedItems(dataTransferList, mockT)).rejects.toThrow("Too many files or too large");
  });

  it("should throw error when total size exceeds limit", async () => {
    // Create a file larger than 5MB (DROP_MAX_BYTES)
    const largeContent = "x".repeat(6 * 1024 * 1024); // 6MB
    const file = createMockFile("large.md", largeContent);
    const item = createMockItem(file);
    const items = createMockDataTransferItemList([item]);

    await expect(processDroppedItems(items, mockT)).rejects.toThrow("Too many files or too large");
  });

  it("should automatically add SKILL.md when not present", async () => {
    const file = createMockFile("script.js", "console.log('hello');");
    const item = createMockItem(file);
    const items = createMockDataTransferItemList([item]);

    const result = await processDroppedItems(items, mockT);

    expect(result).toHaveLength(2);
    const filenames = result.map(f => f.filename);
    expect(filenames).toContain("script.js");
    expect(filenames).toContain("SKILL.md");
    
    // Check that SKILL.md has empty content
    const skillFile = result.find(f => f.filename === "SKILL.md");
    expect(skillFile?.content).toBe("");
  });
});