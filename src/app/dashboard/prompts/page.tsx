"use client";

import { useState } from "react";
import { Edit, Trash2, MoreVertical, Plus } from "lucide-react";

interface Prompt {
  id: string;
  name: string;
  kind: string;
  version: number;
  isActive: boolean;
  updatedAt: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([
    {
      id: "1",
      name: "Product Copy Generator",
      kind: "product_copy",
      version: 2,
      isActive: true,
      updatedAt: "2 days ago",
    },
    {
      id: "2",
      name: "Image Prompt Creator",
      kind: "image_prompt",
      version: 1,
      isActive: true,
      updatedAt: "1 week ago",
    },
    {
      id: "3",
      name: "SEO Title Generator",
      kind: "seo_title",
      version: 3,
      isActive: true,
      updatedAt: "3 days ago",
    },
    {
      id: "4",
      name: "Legacy Copy Template",
      kind: "product_copy",
      version: 1,
      isActive: false,
      updatedAt: "2 weeks ago",
    },
  ]);

  const kindColors: Record<string, { bg: string; text: string }> = {
    product_copy: { bg: "#F0EBE0", text: "#8FAF8A" },
    image_prompt: { bg: "#F5EFE0", text: "#A07848" },
    seo_title: { bg: "#F0EBE0", text: "#8FAF8A" },
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="font-section-heading text-section-heading text-text-primary">
            AI Prompts
          </h1>
          <p className="font-ui-label text-ui-label text-text-muted mt-xs">
            Manage generation templates and AI instructions
          </p>
        </div>
        <button className="inline-flex items-center gap-xs px-lg h-11 rounded-full bg-primary text-on-primary font-ui-label text-ui-label font-medium shadow-sm hover:opacity-90 transition-all">
          <Plus size={16} />
          New Prompt
        </button>
      </div>

      <main>
        <div className="space-y-3">
          {prompts.map((prompt) => {
            const color = kindColors[prompt.kind] || { bg: "#F0EBE0", text: "#8FAF8A" };
            return (
              <div
                key={prompt.id}
                className="rounded-2xl p-6 flex items-start justify-between transition-all hover:shadow-sm"
                style={{
                  backgroundColor: "#FDFAF4",
                  border: "1px solid #DDD4C0",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className="font-semibold"
                      style={{
                        color: "#2D2A25",
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {prompt.name}
                    </h3>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                      }}
                    >
                      {prompt.kind.replace(/_/g, " ")}
                    </span>
                    {!prompt.isActive && (
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: "#F5EFE0",
                          color: "#7A7167",
                        }}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{
                      color: "#7A7167",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span>v{prompt.version}</span>
                    <span>•</span>
                    <span>Updated {prompt.updatedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "transparent",
                      color: "#8FAF8A",
                      border: "1px solid #8FAF8A",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.75rem",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    style={{
                      padding: "8px",
                      backgroundColor: "transparent",
                      color: "#7A7167",
                      border: "1px solid #DDD4C0",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Banner */}
        <div
          className="mt-12 rounded-2xl p-6"
          style={{
            backgroundColor: "#F5EFE0",
            borderLeft: "4px solid #8FAF8A",
          }}
        >
          <h3
            className="font-semibold mb-2"
            style={{
              color: "#2D2A25",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            About Prompts
          </h3>
          <p
            className="text-sm"
            style={{
              color: "#7A7167",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Prompts are the AI instructions used to generate product copy, images, and SEO metadata. You can customize them to match your brand voice and style. Each prompt has versions, allowing you to iterate and improve generation quality over time.
          </p>
        </div>
      </main>
    </div>
  );
}
