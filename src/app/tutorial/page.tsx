import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TutorialPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface-container-lowest">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary">
            <ChevronLeft size={16} />
            Back
          </Link>
          <h1 className="font-section-heading text-xl">Tutorial Videos</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <h2 className="font-section-heading text-2xl mb-2">How Alivio Studio Works</h2>
          <p className="text-text-muted mb-6">
            Watch these videos to learn how to generate professional products with AI
          </p>
        </div>

        <div className="space-y-8">
          {/* Shopify Connection Video */}
          <div className="card">
            <h3 className="font-section-heading text-lg mb-2">How to Connect Your Shopify Account</h3>
            <p className="text-sm text-text-muted mb-4">
              Step-by-step guide to create a custom app in Shopify and get your API access token. This is the first step to using Alivio Studio.
            </p>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/0kntu2KsyGI"
                title="Shopify API Setup | Create Custom App & Get Access Token"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              Source: <a href="https://www.youtube.com/watch?v=0kntu2KsyGI" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                YouTube: Shopify API Setup | Create Custom App & Get Access Token (2025)
              </a>
            </p>
          </div>

          {/* Step by Step Guide */}
          <div className="card">
            <h3 className="font-section-heading text-lg mb-4">Quick Steps</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary min-w-6">1.</span>
                <span><strong>Connect Shopify:</strong> Create a custom app in Shopify and paste the API token</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary min-w-6">2.</span>
                <span><strong>Upload CSV:</strong> Prepare a spreadsheet with product names and supplier links</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary min-w-6">3.</span>
                <span><strong>Generate:</strong> Click "Generate all" — wait 5-10 minutes per product</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary min-w-6">4.</span>
                <span><strong>Review:</strong> See the AI-generated copy, images, and SEO metadata</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary min-w-6">5.</span>
                <span><strong>Push:</strong> Click "Push to Shopify" to create draft products</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary min-w-6">6.</span>
                <span><strong>Publish:</strong> Review in Shopify and publish to your store</span>
              </li>
            </ol>
          </div>

          {/* Help Resources */}
          <div className="card bg-surface-container">
            <h3 className="font-section-heading text-lg mb-3">Need Help?</h3>
            <div className="space-y-2 text-sm">
              <p>
                📖 <strong>Full Setup Guide:</strong> Check the ONBOARDING.md file in the project repo
              </p>
              <p>
                ⚙️ <strong>Settings:</strong> Go to Dashboard → Settings to add your own API keys
              </p>
              <p>
                💬 <strong>Support:</strong> Contact your account manager or support team
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
