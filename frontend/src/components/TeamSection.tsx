// ====================== TEAMSECTION.TSX ======================
// Create a new file: src/components/TeamSection.tsx (or paste inside App.tsx if you prefer)

import React from 'react';

const teamMembers = [
  {
    id: 1,
    name: "Shrimanyu Vankudre",
    role: " Lead Developer & Data Scientist",
    image: "https://cdn.discordapp.com/attachments/748807092143390731/1488257432227414166/WhatsApp_Image_2025-09-17_at_01.29.18_31ef0b46.jpg?ex=69e1dffe&is=69e08e7e&hm=135865c923d40bc6d7d43d5f53f90ab3bd72e742538ede4711d79b15055016a2",
    gradient: "from-cyan-400 to-blue-500",
  },
  {
    id: 2,
    name: "Sujay Vanjari",
    role: "Backend Developer",
    image: "https://picsum.photos/id/1005/400/400",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    id: 3,
    name: "Prathmesh ",
    role: "Backend Developer",
    image: "https://picsum.photos/id/201/400/400",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    id: 4,
    name: "Yugandhar Patil",
    role: "Frontend & UX Designer",
    image: "https://picsum.photos/id/29/400/400",
    gradient: "from-amber-400 to-orange-500",
  },
];

const TeamSection: React.FC = () => {
  return (
    <div className="pt-20 border-t border-border">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-3 bg-card px-8 py-3 rounded-3xl text-sm font-medium text-accent">
          👥 OUR TEAM
        </div>
        <h2 className="header-gradient text-5xl font-bold tracking-tighter mt-6">
          Meet the Visionaries
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mt-4 text-lg">
          Building the future of digital trust — one authentic face at a time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="team-card glass rounded-3xl p-6 text-center"
          >
            <div className="mx-auto w-44 h-44 rounded-3xl overflow-hidden mb-6 ring-4 ring-offset-4 ring-offset-background ring-border">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-2xl font-semibold">{member.name}</h3>
            <p className="text-accent font-medium mt-1">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSection;