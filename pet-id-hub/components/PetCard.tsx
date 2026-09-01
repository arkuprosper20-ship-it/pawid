import Link from "next/link";
import { Pet } from "@/types";
import { BadgeList } from "./BadgeList";

export default function PetCard({
  pet,
  badges = [],
}: {
  pet: Pet;
  badges?: string[];
}) {
  return (
    <Link href={`/dashboard/pets/${pet.id}`} className="card block hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
          {pet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            "🐾"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{pet.name}</h3>
            {pet.status === "lost" && (
              <span className="badge-pill bg-alert-500 text-white">LOST</span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">
            {pet.species} {pet.breed ? `• ${pet.breed}` : ""}
          </p>
          <div className="mt-1">
            <BadgeList badges={badges} />
          </div>
        </div>
      </div>
    </Link>
  );
}
