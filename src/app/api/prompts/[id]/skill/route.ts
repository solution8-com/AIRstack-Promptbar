import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseSkillFiles } from "@/lib/skill-files";
import JSZip from "jszip";

/**
 * Extracts the prompt ID from a URL parameter
 * Supports formats: "abc123", "abc123_some-slug"
 */
function parseIdParam(idParam: string): string {
  let param = idParam;
   
  // Remove .skill extension if present
  if (param.endsWith(".skill")) {
    param = param.slice(0, -".skill".length);
  }

  // If the param contains an underscore, extract the ID (everything before first underscore)
  const underscoreIndex = param.indexOf("_");
  if (underscoreIndex !== -1) {
    param = param.substring(0, underscoreIndex);
  }

  return param;
}

// MIME types mapping for common file extensions
const mimeTypes: Record<string, string> = {
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

const UTF8_MIME_TYPES = new Set([
  "application/javascript",
  "application/json",
  "application/xml",
  "image/svg+xml",
]);

function withUtf8Charset(contentType: string): string {
  if (contentType.startsWith("text/") || UTF8_MIME_TYPES.has(contentType)) {
    return `${contentType}; charset=utf-8`;
  }
  return contentType;
}

function sanitizeFilenameForHeader(filename: string): string {
  const sanitized = filename
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[\\/]/g, "-")
    .replace(/;/g, "")
    .trim();

  return sanitized || "download";
}

function buildAttachmentContentDisposition(filename: string): string {
  const sanitized = sanitizeFilenameForHeader(filename);
  const quotedFilename = sanitized.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `attachment; filename="${quotedFilename}"; filename*=UTF-8''${encodeURIComponent(sanitized)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const id = parseIdParam(idParam);

  // Fetch the skill
  const prompt = await db.prompt.findFirst({
    where: { id, deletedAt: null, isPrivate: false, type: "SKILL" },
    select: { 
      id: true,
      slug: true,
      title: true, 
      description: true, 
      content: true,
    },
  });

  if (!prompt) {
    return new Response("Skill not found", { status: 404 });
  }

  // Parse the skill files
  const files = parseSkillFiles(prompt.content);

    // If exactly one file, serve it directly with appropriate Content-Type
  if (files.length === 1) {
    const file = files[0];
    const ext = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
    const contentType = withUtf8Charset(mimeTypes[ext] || "application/octet-stream");
    
    return new Response(file.content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": buildAttachmentContentDisposition(file.filename),
      },
    });
  }

  // Create a zip file for multiple files
  const zip = new JSZip();

  // Add each file to the zip
  for (const file of files) {
    zip.file(file.filename, file.content);
  }

  // Generate the zip content as blob for Response compatibility
  const zipContent = await zip.generateAsync({ 
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  // Generate filename
  const slug = prompt.slug || prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${slug}.skill`;

  return new Response(zipContent, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": buildAttachmentContentDisposition(filename),
    },
  });
}
