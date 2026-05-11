"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Package } from "lucide-react";

const publishedProducts = [
  {
    id: "1",
    name: "Professional TENS Machine for Back & Muscle Pain Relief",
    status: "published",
    shopifyUrl: "https://example.myshopify.com/admin/products/123",
  },
  {
    id: "2",
    name: "Portable Heat Therapy Pad for Pain Relief & Relaxation",
    status: "published",
    shopifyUrl: "https://example.myshopify.com/admin/products/124",
  },
];

export default function PublishPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FCF6E8" }}>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Animated Checkmark */}
        <div
          className="mb-12"
          style={{
            animation: "scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "#8FAF8A",
            }}
          >
            <CheckCircle2 size={60} style={{ color: "white" }} />
          </div>
        </div>

        {/* Success Message */}
        <h1
          className="text-4xl font-bold mb-4 text-center"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#2D2A25",
          }}
        >
          All Set!
        </h1>
        <p
          className="text-lg text-center max-w-md mb-12"
          style={{
            color: "#7A7167",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Your products have been successfully generated and published to Shopify.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-16 w-full max-w-2xl">
          {[
            { label: "Products Published", value: "2" },
            { label: "Images Generated", value: "6" },
            { label: "Processing Time", value: "2m 34s" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-6 rounded-2xl text-center"
              style={{
                backgroundColor: "#FDFAF4",
                border: "1px solid #DDD4C0",
              }}
            >
              <div
                className="text-3xl font-bold mb-2"
                style={{ color: "#8FAF8A" }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: "#7A7167",
                  fontSize: "0.875rem",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Published Products List */}
        <div className="w-full max-w-2xl mb-16">
          <h2
            className="text-xl font-bold mb-6"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#2D2A25",
            }}
          >
            Published Products
          </h2>
          <div className="space-y-3">
            {publishedProducts.map((product) => (
              <a
                key={product.id}
                href={product.shopifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg transition-all hover:bg-opacity-75"
                style={{
                  backgroundColor: "#FDFAF4",
                  border: "1px solid #DDD4C0",
                  textDecoration: "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <Package size={20} style={{ color: "#8FAF8A" }} />
                  <div>
                    <p
                      className="font-medium text-sm"
                      style={{ color: "#2D2A25" }}
                    >
                      {product.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "#7A7167" }}
                    >
                      Published • View in Shopify
                    </p>
                  </div>
                </div>
                <ExternalLink size={16} style={{ color: "#A07848" }} />
              </a>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium"
            style={{
              backgroundColor: "#8FAF8A",
              color: "white",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
            }}
          >
            Back to Dashboard
          </Link>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium border"
            style={{
              borderColor: "#8FAF8A",
              color: "#8FAF8A",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
            }}
          >
            Create Another Job
          </Link>
        </div>
      </main>

      <style>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
