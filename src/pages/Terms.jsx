export default function Terms() {
  return (
    <div className="info-page">
      <div className="info-page-content">
        <h1>Terms & Conditions</h1>
        <p className="info-updated">Last updated: 29 July 2026</p>

        <h2>Acceptance of Terms</h2>
        <p>
          By accessing Charity Register, you agree to these terms. If you do not agree, please do not use the service.
        </p>

        <h2>Service Description</h2>
        <p>
          Charity Register provides a searchable interface to UK charity data published by the
          Charity Commission for England and Wales. The service includes filtering, favorites,
          CSV export, and an MCP endpoint for AI agent integration.
        </p>

        <h2>Data Accuracy</h2>
        <p>
          Charity data is sourced from the Charity Commission and is presented without modification.
          We do not guarantee the accuracy, completeness, or timeliness of the data. Always verify
          charity information directly with the
          <a href="https://register-of-charities.charitycommission.gov.uk/" target="_blank" rel="noopener"> Charity Commission</a>
          before making decisions based on it.
        </p>

        <h2>Acceptable Use</h2>
        <ul>
          <li>Do not attempt to overload, crash, or disrupt the service</li>
          <li>Respect the rate limit of 60 requests/minute for MCP API keys</li>
          <li>Do not use scraped data for commercial purposes without complying with the Charity Commission's own data licensing terms</li>
          <li>Do not share your MCP API key publicly — revoke and regenerate if compromised</li>
        </ul>

        <h2>MCP API Access</h2>
        <p>
          MCP API keys are provided free of charge. We reserve the right to revoke any key that
          violates these terms or is used for abuse. Rate limits may change without notice.
        </p>

        <h2>CSV Export</h2>
        <p>
          Exported CSV files contain publicly available charity data. You are responsible for
          complying with the Charity Commission's data reuse terms when using exported data.
        </p>

        <h2>No Warranty</h2>
        <p>
          The service is provided "as is" without warranty of any kind. We are not liable for
          any damages arising from the use or inability to use the service.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may be updated at any time. Continued use after changes constitutes acceptance.
        </p>

        <a href="#/" className="btn-secondary info-back-link">← Back to Charity Register</a>
      </div>
    </div>
  )
}
