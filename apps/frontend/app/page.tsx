"use client";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-custom-primary-200 relative overflow-hidden">
      {/* Large Claude SVG Background */}
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/3 opacity-50 pointer-events-none z-0">
        <Image
          src="public/assets/claude.svg"
          alt="Claude Background"
          width={800}
          height={800}
          className="w-auto h-auto max-w-none"
        /> 
      </div>

      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-custom-primary-300 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-custom-primary-500">Contekst</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth"
                className="px-4 py-2 text-sm font-medium text-custom-primary-500 bg-white border border-custom-primary-300 rounded-lg hover:bg-custom-primary-200 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-white bg-custom-primary-500 rounded-lg hover:bg-custom-primary-600 transition-colors duration-200"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-custom-primary-500 mb-6">
            Contekst
          </h1>
          <p className="text-xl text-custom-primary-400 mb-8 max-w-3xl mx-auto">
            A unified memory layer for seamless context continuity across AI application
          </p>

          {/* Download Button */}
          <div className="mb-12">
            <a
              href="/contekst_extension.zip"
              className="inline-flex items-center gap-3 px-8 py-4 bg-custom-primary-500 text-white text-lg font-semibold rounded-2xl hover:bg-custom-primary-600 transition-all duration-200 hover:-translate-y-1 shadow-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Extension
            </a>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-custom-primary-300 mb-16 relative z-10">
          <h2 className="text-3xl font-bold text-custom-primary-500 mb-8 text-center">
            How to Install the Extension
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-custom-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-custom-primary-500 mb-3">Download & Extract</h3>
              <p className="text-custom-primary-400">
                Download the extension file and extract it to a folder on your computer.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-custom-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-custom-primary-500 mb-3">Enable Developer Mode</h3>
              <p className="text-custom-primary-400">
                Open Chrome, go to Extensions, and toggle on "Developer mode" in the top right.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-custom-primary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-custom-primary-500 mb-3">Load Extension</h3>
              <p className="text-custom-primary-400">
                Click "Load unpacked" and select the folder where you extracted the extension.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Instructions */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-custom-primary-300 relative z-10">
          <h3 className="text-2xl font-bold text-custom-primary-500 mb-6">
            Detailed Installation Steps
          </h3>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-custom-primary-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-custom-primary-500 mb-2">Download the Extension</h4>
                <p className="text-custom-primary-400">
                  Click the download button above to get the Contekst extension file. Save it to a location you can easily find.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-custom-primary-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-custom-primary-500 mb-2">Extract the Files</h4>
                <p className="text-custom-primary-400">
                  Extract the downloaded ZIP file to a new folder. Remember this location as you'll need it in the next steps.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-custom-primary-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-custom-primary-500 mb-2">Open Chrome Extensions</h4>
                <p className="text-custom-primary-400 mb-2">
                  In Google Chrome, type <code className="bg-custom-primary-200 px-2 py-1 rounded text-sm">chrome://extensions/</code> in the address bar and press Enter.
                </p>
                <p className="text-custom-primary-400">
                  Alternatively, click the three dots menu → More tools → Extensions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-custom-primary-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold text-custom-primary-500 mb-2">Enable Developer Mode</h4>
                <p className="text-custom-primary-400">
                  In the top right corner of the Extensions page, you'll see a toggle switch labeled "Developer mode". Turn it ON.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-custom-primary-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div>
                <h4 className="font-semibold text-custom-primary-500 mb-2">Load the Extension</h4>
                <p className="text-custom-primary-400">
                  Click the "Load unpacked" button that appears. Navigate to and select the folder where you extracted the Contekst extension files.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-custom-primary-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                6
              </div>
              <div>
                <h4 className="font-semibold text-custom-primary-500 mb-2">You're All Set!</h4>
                <p className="text-custom-primary-400">
                  The Contekst extension should now appear in your extensions list. You can pin it to your toolbar for easy access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-custom-primary-300 text-center">
            <div className="w-16 h-16 bg-custom-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-custom-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-custom-primary-500 mb-3">On-Chain Acces Control</h3>
            <p className="text-custom-primary-400">
              Decide which memories your AI assistants can access and use in conversations.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg border border-custom-primary-300 text-center">
            <div className="w-16 h-16 bg-custom-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-custom-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-custom-primary-500 mb-3">Privacy First</h3>
            <p className="text-custom-primary-400">
              Your data stays private. Control what information is shared between AI platforms.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg border border-custom-primary-300 text-center">
            <div className="w-16 h-16 bg-custom-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-custom-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-custom-primary-500 mb-3">Easy Management</h3>
            <p className="text-custom-primary-400">
              Simple dashboard to view, organize, and manage all your AI interactions.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-custom-primary-500 rounded-3xl p-12 text-center text-white relative z-10">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-custom-primary-200 mb-8">
            Download Contekst today and take control of your AI memory.
          </p>
          <a
            href="/contekst_extension.zip"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-custom-primary-500 text-lg font-semibold rounded-2xl hover:bg-custom-primary-100 transition-all duration-200 hover:-translate-y-1 shadow-lg"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Now
          </a>
        </div>
      </div>
    </div>
  );
}