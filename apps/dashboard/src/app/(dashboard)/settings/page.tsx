import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listSystemSettings } from "@barray/database";
import { SettingEditor } from "@/components/setting-editor";

export default async function SettingsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const settings = await listSystemSettings();
  const canEdit = session!.roles.includes("OWNER");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.settings}</h1>
      <p className="text-sm text-slate-400">
        {session!.email} — roles: {session!.roles.join(", ")}
      </p>

      <div className="space-y-4">
        {settings.map((s) => (
          <div key={s.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-1 font-medium">{s.key}</div>
            {s.description && <p className="mb-2 text-xs text-slate-400">{s.description}</p>}
            <SettingEditor settingKey={s.key} value={s.value} canEdit={canEdit} />
          </div>
        ))}
      </div>
    </div>
  );
}
