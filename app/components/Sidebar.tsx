import { useData } from "@/app/providers/DataProvider";
import Link from "next/link";

export default function Sidebar() {
  const { conversations } = useData();

  return (
    <div className="fixed w-64 h-dvh p-2">
      <div className="bg-gray-1/80 rounded-lg border border-gray-2 backdrop-blur-sm h-full p-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">
            <p className="text-gray-10 text-sm">Conversations</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {conversations.map((conversation) => (
            <Link
              href={`/${conversation.id}`}
              key={conversation.id}
              className="flex flex-row gap-2"
            >
              <p className="text-gray-10 text-sm">{conversation.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
