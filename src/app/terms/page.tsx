export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-black mb-4">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: March 2026</p>

      <div className="space-y-4 text-sm text-gray-700">
        <section>
          <h2 className="font-bold text-base mb-1">Acceptance</h2>
          <p>By accessing Green Bubbles, you agree to these terms. This application is operated by the Cuyahoga County Board of Elections for election day operations.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">Authorized Use</h2>
          <p>This system is for authorized Board of Elections personnel and designated election workers only. Access credentials (PINs) are issued by administrators and should not be shared outside your assigned role.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">SMS Service (Green Bubbles)</h2>
          <p>By texting the Green Bubbles service number, registered election workers consent to receiving automated SMS responses related to polling location status updates. This is a private, staff-only messaging program; only pre-registered election workers who provide their mobile number to their county coordinator receive messages.</p>
          <p className="mt-2"><strong>Message frequency varies</strong> based on Election Day activity. <strong>Message and data rates may apply.</strong></p>
          <p className="mt-2">Reply <strong>HELP</strong> for help. Reply <strong>STOP</strong> to opt out of messages at any time. For support, contact the Cuyahoga County Board of Elections.</p>
          <p className="mt-2">Carriers are not liable for delayed or undelivered messages.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">Accuracy</h2>
          <p>Users are responsible for the accuracy of status updates they submit. All changes are logged for audit purposes.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">Availability</h2>
          <p>The service is provided as-is. We do not guarantee uninterrupted availability. The system is primarily intended for use during active election periods.</p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-1">Contact</h2>
          <p>For questions about these terms, contact the Cuyahoga County Board of Elections.</p>
        </section>
      </div>

      <div className="mt-8">
        <a href="/" className="text-sm font-bold text-emerald-600 hover:underline">Back to Green Bubbles</a>
      </div>
    </main>
  );
}
