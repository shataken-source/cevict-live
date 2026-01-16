import { redirect } from 'next/navigation';

export default function LegacyPetreunionAdminLoginPage() {
  redirect('/admin/login?next=/admin');
}
