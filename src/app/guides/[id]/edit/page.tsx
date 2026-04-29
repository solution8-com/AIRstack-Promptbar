import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GuideEditForm } from "@/components/guides/guide-edit-form";

interface EditGuidePageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Guide",
  description: "Edit your guide",
};

export default async function EditGuidePage({ params }: EditGuidePageProps) {
  const { id: guideId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const guide = await db.prompt.findUnique({
    where: { id: guideId, type: "GUIDE" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      contributors: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  if (!guide) {
    notFound();
  }

  const isAuthor = guide.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    redirect(`/guides/${guideId}`);
  }

  const [categories, tags] = await Promise.all([
    db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
      },
    }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const initialData = {
    title: guide.title,
    description: guide.description || "",
    content: guide.content,
    categoryId: guide.categoryId || undefined,
    tagIds: guide.tags.map((t) => t.tagId),
    contributors: guide.contributors,
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Edit Guide</h1>
      <GuideEditForm
        guideId={guideId}
        initialData={initialData}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
