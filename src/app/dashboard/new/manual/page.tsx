"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ManualEntryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    productName: "",
    productType: "",
    primaryKeyword: "",
    alibabaUrl: "",
    aliexpressUrl: "",
    amazonUrl: "",
    url1688: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.productName && formData.productType && formData.primaryKeyword) {
      const productData = [formData];
      sessionStorage.setItem("csvData", JSON.stringify(productData));
      router.push("/dashboard/new/configure");
    } else {
      alert("Please fill in all required fields");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FCF6E8" }}>
      {/* Header */}
      <header
        className="border-b"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#DDD4C0",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm"
            style={{ color: "#7A7167" }}
          >
            <ChevronLeft size={16} />
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#2D2A25",
          }}
        >
          Step 1 — Add Your Products
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Link
            href="/dashboard/new"
            style={{
              color: "#8FAF8A",
              padding: "10px 24px",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontFamily: "'DM Sans', sans-serif",
              border: "1.5px solid #8FAF8A",
            }}
          >
            CSV Upload
          </Link>
          <button
            style={{
              backgroundColor: "#8FAF8A",
              color: "white",
              padding: "10px 24px",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Manual Entry
          </button>
        </div>

        {/* Form */}
        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Product Identity */}
          <fieldset>
            <legend
              className="text-sm font-medium mb-4"
              style={{
                color: "#2D2A25",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Product Identity
            </legend>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{
                    color: "#2D2A25",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Product Name *
                </label>
                <input
                  type="text"
                  name="productName"
                  placeholder="e.g. TENS Pain Relief Device"
                  value={formData.productName}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1.5px solid #DDD4C0",
                    borderRadius: "12px",
                    backgroundColor: "#FDFAF4",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.9rem",
                    color: "#2D2A25",
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{
                    color: "#2D2A25",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Product Type *
                </label>
                <select
                  name="productType"
                  value={formData.productType}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1.5px solid #DDD4C0",
                    borderRadius: "12px",
                    backgroundColor: "#FDFAF4",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.9rem",
                    color: "#2D2A25",
                  }}
                >
                  <option value="">Select type...</option>
                  <option value="TENS Machine">TENS Machine</option>
                  <option value="Heat Pack">Heat Pack</option>
                  <option value="Massage Gun">Massage Gun</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{
                    color: "#2D2A25",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Primary Keyword *
                </label>
                <input
                  type="text"
                  name="primaryKeyword"
                  placeholder="e.g. tens machine for back pain"
                  value={formData.primaryKeyword}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1.5px solid #DDD4C0",
                    borderRadius: "12px",
                    backgroundColor: "#FDFAF4",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.9rem",
                    color: "#2D2A25",
                  }}
                />
              </div>
            </div>
          </fieldset>

          {/* Source Links */}
          <fieldset>
            <legend
              className="text-sm font-medium mb-4"
              style={{
                color: "#2D2A25",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Source Links (at least one required)
            </legend>
            <div className="space-y-4">
              {[
                { label: "Alibaba URL", name: "alibabaUrl", placeholder: "https://..." },
                { label: "AliExpress URL", name: "aliexpressUrl", placeholder: "https://..." },
                { label: "Amazon URL", name: "amazonUrl", placeholder: "https://..." },
                { label: "1688 URL", name: "url1688", placeholder: "https://..." },
              ].map((field) => (
                <div key={field.label}>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{
                      color: "#2D2A25",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    type="url"
                    name={field.name}
                    placeholder={field.placeholder}
                    value={formData[field.name as keyof typeof formData]}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1.5px solid #DDD4C0",
                      borderRadius: "12px",
                      backgroundColor: "#FDFAF4",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.9rem",
                      color: "#2D2A25",
                    }}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          {/* Footer */}
          <div className="flex gap-4 pt-8 border-t" style={{ borderColor: "#DDD4C0" }}>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  productName: "",
                  productType: "",
                  primaryKeyword: "",
                  alibabaUrl: "",
                  aliexpressUrl: "",
                  amazonUrl: "",
                  url1688: "",
                });
              }}
              style={{
                color: "#7A7167",
                padding: "10px 24px",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontFamily: "'DM Sans', sans-serif",
                border: "1px solid #DDD4C0",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              Clear Form
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: "#8FAF8A",
                color: "white",
                padding: "10px 24px",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontFamily: "'DM Sans', sans-serif",
                border: "none",
                cursor: "pointer",
              }}
            >
              Continue to Configure →
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
