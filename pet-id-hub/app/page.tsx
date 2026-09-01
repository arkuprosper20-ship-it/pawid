import Link from "next/link";

export default function Home() {
  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Pet safety, made human</p>
          <h1>Bring them home<br /><em>faster.</em></h1>
          <p className="hero-lede">
            One scan gives a finder the right details, the right contact, and a
            direct line back to you.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn-primary">Create your pet ID <span aria-hidden="true">↗</span></Link>
            <Link href="/community" className="text-link">Explore the community <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true"><span>🐕</span><span>🐈</span><span>🐾</span></div>
            <p><strong>Made for real-life moments.</strong><br />Free to create, simple to scan.</p>
          </div>
        </div>

        <div className="tag-stage" aria-label="Preview of a PawID pet tag">
          <div className="stage-label">LIVE TAG PREVIEW</div>
          <div className="tag-shadow" />
          <div className="pet-tag">
            <div className="tag-topline"><span className="tag-brand">PawID</span><span className="tag-status">● SAFE &amp; READY</span></div>
            <div className="tag-profile"><div className="pet-avatar">🐶</div><div><span className="tag-kicker">THIS TAG BELONGS TO</span><strong>Milo</strong><span className="tag-detail">Golden retriever · 4 yrs</span></div></div>
            <div className="qr-grid" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
            <div className="tag-footer"><span>Scan to say hello</span><span>pawid / milo</span></div>
          </div>
          <div className="floating-note note-one"><span>01</span><strong>Digital ID</strong><small>Always up to date</small></div>
          <div className="floating-note note-two"><span>02</span><strong>Lost mode</strong><small>One tap to alert</small></div>
        </div>
      </section>

      <section className="feature-strip" aria-label="PawID features">
        <article><span className="feature-number">01</span><div><h2>Ready when needed</h2><p>Medical notes, contacts, and care details in one calm, scannable profile.</p></div></article>
        <article><span className="feature-number">02</span><div><h2>One tap to alert</h2><p>Switch to Lost Mode and let your people know the moment it matters.</p></div></article>
        <article><span className="feature-number">03</span><div><h2>Help travels fast</h2><p>A shared community turns one finder into a whole neighborhood looking.</p></div></article>
      </section>
    </div>
  );
}
