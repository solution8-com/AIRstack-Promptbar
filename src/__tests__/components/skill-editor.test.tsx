import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ChangeEvent, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { SkillEditor } from "../../components/prompts/skill-editor";

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

// Mock Monaco editor
vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: () => null,
}));

// Mock lucide-react icons
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

// Mock shadcn/ui components
type ButtonProps = HTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonProps) => {
    return (
      <button
        type="button"
        {...props}
        onClick={() => {
          if (props.onClick) {
            props.onClick();
          }
        }}
      >
        {children}
      </button>
    );
  },
}));

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, ...props }: InputProps) => {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e)}
        {...props}
      />
    );
  },
}));

type DialogProps = {
  open?: boolean;
  children?: ReactNode;
};

type DialogSectionProps = {
  children?: ReactNode;
};

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: DialogProps) => {
    if (open) {
      return <div>{children}</div>;
    }
    return null;
  },
  DialogContent: ({ children }: DialogSectionProps) => <div>{children}</div>,
  DialogHeader: ({ children }: DialogSectionProps) => <div>{children}</div>,
  DialogTitle: ({ children }: DialogSectionProps) => <div>{children}</div>,
  DialogDescription: ({ children }: DialogSectionProps) => <div>{children}</div>,
  DialogFooter: ({ children }: DialogSectionProps) => <div>{children}</div>,
}));

describe("SkillEditor", () => {
  it("should render without errors", () => {
    const onChange = vi.fn();
    render(<SkillEditor value="" onChange={onChange} />);
    
    // Check that the component renders
    expect(screen.getByText("Skill Files")).toBeInTheDocument();
    expect(screen.queryByText("Drop folder here")).not.toBeInTheDocument();
  });

  // Note: Full drag-and-drop testing requires complex mocking of the File System Access API
  // which is beyond the scope of a simple unit test. The core drag-and-drop logic
  // is tested through integration tests or manual testing.
  
  // Verify observable drag/drop behavior instead of internal DOM attributes.
  it("should show and hide drag overlay during drag events", () => {
    const onChange = vi.fn();
    const { container } = render(<SkillEditor value="" onChange={onChange} />);

    const dropZone = container.firstChild as HTMLElement;
    fireEvent.dragEnter(dropZone);
    expect(screen.getByText("Drop folder here")).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    expect(screen.queryByText("Drop folder here")).not.toBeInTheDocument();
  });
});
