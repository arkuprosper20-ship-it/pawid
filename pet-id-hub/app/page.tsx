import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold mb-4">
        Every pet, one QR code away from home.
      </h1>
      <p className="text-gray-600 max-w-xl mx-auto mb-8">
        Create a free digital ID for your pet, print a QR tag for their collar,
        and instantly alert your community if they ever go missing.
      </p>
      <div className="flex gap-3 justify-center mb-16">
        <Link href="/login" className="btn-primary">
          Get started free
        </Link>
        <Link href="/community" className="btn-secondary">
          See the community feed
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 text-left">
        <div className="card">
          <div className="text-2xl mb-2">🪪</div>
          <h3 className="font-semibold mb-1">Digital pet ID</h3>
          <p className="text-sm text-gray-600">
            Name, breed, medical notes, and emergency contact — all in one
            scannable profile.
          </p>
        </div>
        <div className="card">
          <div className="text-2xl mb-2">📍</div>
          <h3 className="font-semibold mb-1">Lost mode</h3>
          <p className="text-sm text-gray-600">
            Flip one switch to alert finders and your local community the
            moment a pet goes missing.
          </p>
        </div>
        <div className="card">
          <div className="text-2xl mb-2">🐕</div>
          <h3 className="font-semibold mb-1">Community hub</h3>
          <p className="text-sm text-gray-600">
            Share updates, earn badges, and help reunite lost pets faster.
          </p>
        </div>
      </div>
    </div>
  );
}
