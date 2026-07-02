export default function Privacy() {
  return (
    <div className="info-page">
      <div className="info-page-content">
        <h1>Privacy Policy</h1>
        <p className="info-updated">Last updated: 29 July 2026</p>

        <h2>Overview</h2>
        <p>
          Charity Register is a search and filtering tool for UK charity data sourced from the
          Charity Commission for England and Wales. We are committed to protecting your privacy.
        </p>

        <h2>Data We Store</h2>
        <ul>
          <li><strong>Charity data</strong> — Publicly available records from the UK Charity Commission, stored in our database for search purposes.</li>
          <li><strong>Favorites</strong> — Your starred charities are stored server-side. No personal information is collected with favorites.</li>
          <li><strong>MCP API keys</strong> — If you generate an MCP key, it is stored with a creation timestamp and last-used timestamp. No name or email is required.</li>
        </ul>

        <h2>Data We Do NOT Collect</h2>
        <ul>
          <li>No accounts or login required</li>
          <li>No cookies or tracking pixels</li>
          <li>No analytics or third-party trackers</li>
          <li>No personal information (name, email, IP address is not stored)</li>
        </ul>

        <h2>Charity Data Source</h2>
        <p>
          All charity information shown is publicly available from the
          <a href="https://register-of-charities.charitycommission.gov.uk/" target="_blank" rel="noopener"> Charity Commission for England and Wales</a>.
          We do not modify or verify the accuracy of this data — it is presented as provided by the Commission.
        </p>

        <h2>MCP API Keys</h2>
        <p>
          API keys generated on our <a href="#/mcp">MCP page</a> are random tokens with no associated personal information.
          Keys can be revoked at any time from the same page. Key usage is rate-limited to 60 requests per minute.
        </p>

        <h2>Data Retention</h2>
        <ul>
          <li><strong>Charity data</strong> — Retained indefinitely as it is public record.</li>
          <li><strong>Favorites</strong> — Retained until you clear them or the database is reset.</li>
          <li><strong>API keys</strong> — Retained until revoked. Revoked keys are permanently disabled.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Open an issue on the project repository.
        </p>

        <a href="#/" className="btn-secondary info-back-link">← Back to Charity Register</a>
      </div>
    </div>
  )
}
