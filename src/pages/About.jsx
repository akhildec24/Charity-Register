export default function About() {
  const fields = [
    'literature', 'literary', 'book', 'books', 'reading',
    'writer', 'writers', 'writing', 'poetry', 'poet',
    'library', 'libraries', 'publishing', 'publisher',
    'storytelling', 'spoken word', 'creative writing',
  ]

  return (
    <div className="info-page">
      <div className="info-page-content">
        <h1>About</h1>

        <h2>The Scale</h2>
        <p>
          There are over <strong>160,000+</strong> registered charities in the UK.
          The Charity Commission for England and Wales maintains the official register,
          which is publicly available at
          <a href="https://register-of-charities.charitycommission.gov.uk/en/" target="_blank" rel="noopener"> register-of-charities.charitycommission.gov.uk</a>.
        </p>

        <h2>What This App Covers</h2>
        <p>
          This is not the full register. We only include charities whose work relates to
          literature, reading, and writing. The dataset is filtered using keywords
          associated with these fields:
        </p>
        <div className="about-keywords">
          {fields.map(f => (
            <span key={f} className="about-keyword">{f}</span>
          ))}
        </div>

        <h2>Important Caveats</h2>
        <ul>
          <li><strong>Overlap</strong> — Many charities work across multiple areas. A charity tagged "reading" may also do "creative writing". Expect overlap in categories.</li>
          <li><strong>Not verified</strong> — We do not verify or validate the charity data. It is presented as provided by the Charity Commission. Always check the official register for authoritative information.</li>
          <li><strong>Not exhaustive</strong> — Charities may be missed if their activities don't contain the keywords above. The full register has many more charities.</li>
          <li><strong>For the full list</strong> — Visit the
            <a href="https://register-of-charities.charitycommission.gov.uk/en/" target="_blank" rel="noopener"> Charity Commission register</a>
            for all 160,000+ charities.
          </li>
        </ul>

        <h2>Data Source</h2>
        <p>
          All charity data comes from the
          <a href="https://register-of-charities.charitycommission.gov.uk/en/" target="_blank" rel="noopener"> Charity Commission for England and Wales</a>.
          We do not modify the data — we filter it, index it for search, and present it.
        </p>

        <a href="#/" className="btn-secondary info-back-link">← Back to Charity Register</a>
      </div>
    </div>
  )
}
