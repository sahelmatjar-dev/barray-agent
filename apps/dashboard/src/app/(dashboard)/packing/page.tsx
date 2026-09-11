import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { PagePlaceholder } from "@/components/page-placeholder";

export default async function Page() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  return <PagePlaceholder locale={session!.locale} title={dict.nav.packing} />;
}
