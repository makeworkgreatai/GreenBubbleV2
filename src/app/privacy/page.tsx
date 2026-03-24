export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-black mb-4">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 2026</p>

      <div className="space-y-4 text-sm text-gray-700">
        <section>
          <h2 className="font-bold text-base mb-1">What We Collect</h2>
          <p>Green Bubbles collects the following information for election day operations:</p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>Display names and PINs for user authentication</li>
            <li>Phone numbers for SMS-based status updates</li>
            <li>IP addresses and device information for login security</li>
            <li>Status update activity and timestamps</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">How We Use It</h2>
          <p>All data is used solely for tracking polling location statuses on election day. We do not sell, share, or distribute any personal information to third parties.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">SMS Messaging</h2>
          <p>Phone numbers are used to receive and respond to SMS status updates via Twilio. Users initiate communication by texting the service number. Standard messaging rates may apply. Users can stop texting at any time.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">Data Retention</h2>
          <p>Data is retained for the duration of the election cycle and may be archived for audit purposes as required by the Board of Elections.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">Contact</h2>
          <p>For questions about this policy, contact the Cuyahoga County Board of Elections.</p>
        </section>
      </div>

      <div className="mt-8">
        <a href="/" className="text-sm font-bold text-emerald-600 hover:underline">Back to Green Bubbles</a>
      </div>
    </main>
  );
}
