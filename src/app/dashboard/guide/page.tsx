"use client";

import { CheckCircle2, ExternalLink, Book } from "lucide-react";

export default function GuidePage() {
  const steps = [
    {
      number: 1,
      title: "Connect Your Shopify Store",
      description: "Link your Shopify account to Alivio Plus to start generating products",
      status: "completed",
      details: [
        "Go to your Shopify Admin",
        "Navigate to Apps → App and sales channel settings",
        "Find and authorize Alivio Plus",
      ],
    },
    {
      number: 2,
      title: "Prepare Your Product Data",
      description: "Gather supplier URLs for the products you want to generate",
      status: "in-progress",
      details: [
        "Find product URLs on Alibaba, AliExpress, Amazon, or 1688",
        "Create a CSV file with product information",
        "Include primary keywords for SEO optimization",
      ],
    },
    {
      number: 3,
      title: "Upload and Generate",
      description: "Upload your CSV file and let Alivio create product listings",
      status: "pending",
      details: [
        "Upload your CSV file via Dashboard",
        "Review and configure generation settings",
        "AI will generate product copy, images, and SEO tags",
      ],
    },
    {
      number: 4,
      title: "Review and Publish",
      description: "Review generated content and push to Shopify",
      status: "pending",
      details: [
        "Edit product copy and images as needed",
        "Verify SEO metadata",
        "Publish drafts to your Shopify store",
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "#F0EBE0", text: "#8FAF8A", icon: "#8FAF8A" };
      case "in-progress":
        return { bg: "#F5EFE0", text: "#A07848", icon: "#A07848" };
      default:
        return { bg: "#F0EBE0", text: "#DDD4C0", icon: "#DDD4C0" };
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="font-section-heading text-section-heading text-text-primary flex items-center gap-sm">
          <Book size={28} />
          Getting Started Guide
        </h1>
        <p className="font-ui-label text-ui-label text-text-muted mt-xs">
          Follow these steps to start generating products with Alivio Plus
        </p>
      </div>

      <main className="max-w-4xl">
        <div className="space-y-8">
          {steps.map((step) => {
            const color = getStatusColor(step.status);
            return (
              <div
                key={step.number}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: "#FDFAF4",
                  border: "1px solid #DDD4C0",
                }}
              >
                {/* Header */}
                <div
                  className="p-6 flex items-start gap-4"
                  style={{
                    backgroundColor: color.bg,
                    borderBottom: "1px solid #DDD4C0",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      backgroundColor: color.icon === "#DDD4C0" ? "#DDD4C0" : "white",
                      color: color.icon,
                    }}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className="font-bold text-lg"
                      style={{
                        color: "#2D2A25",
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm mt-1"
                      style={{
                        color: "#7A7167",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                    style={{
                      backgroundColor: "white",
                      color: color.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {step.status === "completed" ? "✓ Completed" : step.status}
                  </span>
                </div>

                {/* Details */}
                <div className="p-6">
                  <ul className="space-y-3">
                    {step.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.9rem",
                          color: "#2D2A25",
                        }}
                      >
                        <span
                          className="text-sm font-semibold mt-0.5 flex-shrink-0"
                          style={{ color: color.text }}
                        >
                          ✓
                        </span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resources */}
        <div className="mt-12">
          <h2
            className="text-xl font-bold mb-6"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2D2A25",
            }}
          >
            Resources
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "CSV Template",
                description: "Download our sample CSV template to format your data correctly",
                icon: "📄",
              },
              {
                title: "Video Tutorial",
                description: "Watch a step-by-step walkthrough of the entire process",
                icon: "🎥",
              },
              {
                title: "Troubleshooting",
                description: "Get help with common issues and questions",
                icon: "🆘",
              },
              {
                title: "Best Practices",
                description: "Learn tips for getting the best product results",
                icon: "⭐",
              },
            ].map((resource, idx) => (
              <a
                key={idx}
                href="#"
                className="rounded-2xl p-6 transition-all hover:shadow-sm group"
                style={{
                  backgroundColor: "#FDFAF4",
                  border: "1px solid #DDD4C0",
                  textDecoration: "none",
                }}
              >
                <div className="text-3xl mb-3">{resource.icon}</div>
                <h3
                  className="font-semibold mb-2"
                  style={{
                    color: "#2D2A25",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {resource.title}
                </h3>
                <p
                  className="text-sm flex items-center gap-2"
                  style={{
                    color: "#7A7167",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {resource.description}
                  <ExternalLink
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
