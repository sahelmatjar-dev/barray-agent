import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { AssistantChat } from "@/components/assistant-chat";

export default async function AssistantPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.assistant}</h1>
      <AssistantChat locale={session!.locale} />
    </div>
  );
}
