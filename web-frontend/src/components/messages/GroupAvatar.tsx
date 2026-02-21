interface GroupAvatarProps {
  seeds: string[];
}

export default function GroupAvatar({ seeds }: GroupAvatarProps) {
  const avatarSeeds = seeds.length > 0 ? seeds.slice(0, 4) : ["Groupe"];

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
      {avatarSeeds.map((seed, index) => (
        <div key={`${seed}-${index}`} className="overflow-hidden border-[0.5px] border-white/20">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`}
            alt="member"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
